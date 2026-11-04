#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Engine-level harness for `src/utils/audio.ts` — no browser, no new dependency.
 *
 * The module is bundled with esbuild (already a devDependency) and run against an
 * instrumented mock Web Audio API and a mock localStorage, so the gain graph,
 * the three mute switches, the outcome-group fade and the persistence layer can
 * be measured exactly instead of listened to. It needs nothing from
 * `package.json` and is not wired into an npm script:
 *
 *   node arena-verify/audio-engine.mjs
 *
 * What it proves:
 *  - no AudioContext is created before the first gesture, by any call path
 *  - the default graph reproduces the pre-split mix (0.63 effects, 0.35 bed)
 *  - master / effects / background switches are independent, with no crosstalk
 *  - muting effects mid-approach stops the rumble and blocks new cues
 *  - advancing / restarting / committing fades the outcome group only
 *  - the five preference keys persist, and `tramvay_volume` migrates into both
 *  - the ambience never starts before the game is armed
 */

import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

/* ------------------------------------------------------------------ *
 * mock Web Audio API
 * ------------------------------------------------------------------ */

let contextCount = 0;
const created = {
  sources: [],
  gains: [],
  compressors: [],
  filters: [],
};

class Param {
  constructor(value) {
    this.value = value;
    this.defaultValue = value;
    this.events = [];
  }
  cancelScheduledValues(t) {
    this.events.push({ op: 'cancel', t });
    return this;
  }
  cancelAndHoldAtTime(t) {
    this.events.push({ op: 'hold', t });
    return this;
  }
  setValueAtTime(v, t) {
    this.events.push({ op: 'set', v, t });
    this.value = v;
    return this;
  }
  linearRampToValueAtTime(v, t) {
    this.events.push({ op: 'linear', v, t });
    this.value = v;
    return this;
  }
  exponentialRampToValueAtTime(v, t) {
    this.events.push({ op: 'expo', v, t });
    this.value = v;
    return this;
  }
  setTargetAtTime(v, t, tau) {
    this.events.push({ op: 'target', v, t, tau });
    this.value = v;
    return this;
  }
}

class Node {
  constructor(kind, ctx) {
    this.kind = kind;
    this.ctx = ctx;
    this.outputs = [];
  }
  connect(dest) {
    this.outputs.push(dest);
    return dest;
  }
  disconnect() {
    this.outputs.length = 0;
  }
}

class GainNode extends Node {
  constructor(ctx) {
    super('gain', ctx);
    this.gain = new Param(1);
    created.gains.push(this);
  }
}

class CompressorNode extends Node {
  constructor(ctx) {
    super('compressor', ctx);
    this.threshold = new Param(-24);
    this.knee = new Param(30);
    this.ratio = new Param(12);
    this.attack = new Param(0.003);
    this.release = new Param(0.25);
    created.compressors.push(this);
  }
}

class FilterNode extends Node {
  constructor(ctx) {
    super('filter', ctx);
    this.type = 'lowpass';
    this.frequency = new Param(350);
    this.Q = new Param(1);
    created.filters.push(this);
  }
}

class BufferSource extends Node {
  constructor(ctx) {
    super('source', ctx);
    this.buffer = null;
    this.loop = false;
    this.playbackRate = new Param(1);
    this.onended = null;
    this.startArgs = null;
    this.stoppedAt = null;
    /** every stop() argument: the natural end at creation, plus any fade */
    this.stops = [];
    created.sources.push(this);
  }
  start(when = 0, offset = 0, duration = 0) {
    this.startArgs = { when, offset, duration };
  }
  stop(when = 0) {
    this.stoppedAt = when;
    this.stops.push(when);
  }
}

class MockContext {
  constructor() {
    contextCount++;
    this.sampleRate = 44100;
    this.state = 'running';
    this.currentTime = 0;
    this.destination = new Node('destination', this);
  }
  createGain() {
    return new GainNode(this);
  }
  createDynamicsCompressor() {
    return new CompressorNode(this);
  }
  createBiquadFilter() {
    return new FilterNode(this);
  }
  createBufferSource() {
    return new BufferSource(this);
  }
  createBuffer(channels, length, rate) {
    return {
      numberOfChannels: channels,
      length,
      sampleRate: rate,
      duration: length / rate,
      getChannelData: () => new Float32Array(length),
    };
  }
  async decodeAudioData() {
    // the real sprite is 13.61 s; the engine only needs duration + getChannelData
    const sprite = JSON.parse(readFileSync(join(ROOT, 'public/audio/sfx.json'), 'utf8')).sprite;
    const last = Object.values(sprite).at(-1);
    const duration = (last[0] + last[1] + 100) / 1000;
    return {
      duration,
      numberOfChannels: 1,
      sampleRate: 44100,
      getChannelData: () => new Float32Array(Math.ceil(duration * 44100)),
    };
  }
  async resume() {
    this.state = 'running';
  }
  async suspend() {
    this.state = 'suspended';
  }
}

/* ------------------------------------------------------------------ *
 * mock window / localStorage / fetch
 * ------------------------------------------------------------------ */

const store = new Map();

function installGlobals({ storage = {} } = {}) {
  store.clear();
  for (const [k, v] of Object.entries(storage)) store.set(k, String(v));

  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };

  const sprite = JSON.parse(readFileSync(join(ROOT, 'public/audio/sfx.json'), 'utf8'));
  const fetchStub = async (url) => {
    if (String(url).endsWith('sfx.json')) {
      return {
        ok: true,
        headers: { get: () => 'application/json' },
        text: async () => JSON.stringify(sprite),
        arrayBuffer: async () => new ArrayBuffer(8),
      };
    }
    if (String(url).includes('ambience')) {
      return {
        ok: true,
        headers: { get: () => 'audio/ogg' },
        arrayBuffer: async () => new ArrayBuffer(8),
      };
    }
    return {
      ok: true,
      headers: { get: () => 'audio/ogg' },
      arrayBuffer: async () => new ArrayBuffer(8),
    };
  };

  globalThis.window = {
    AudioContext: MockContext,
    localStorage,
    matchMedia: (query) => ({ matches: query.includes('hover'), media: query }),
    addEventListener() {},
    removeEventListener() {},
    scrollTo() {},
  };
  globalThis.document = {
    createElement: () => ({ canPlayType: () => 'probably' }),
    addEventListener() {},
    removeEventListener() {},
    hidden: false,
  };
  globalThis.fetch = fetchStub;
  globalThis.requestAnimationFrame = (fn) => setTimeout(() => fn(Date.now()), 16);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
}

/* ------------------------------------------------------------------ *
 * assertions
 * ------------------------------------------------------------------ */

const results = [];
function check(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

/** every gain node the engine built, in creation order */
function graph(engine) {
  return engine;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ *
 * the suite
 * ------------------------------------------------------------------ */

async function loadModule(tag) {
  const dir = mkdtempSync(join(tmpdir(), `audio-engine-${tag}-`));
  const outfile = join(dir, 'audio.mjs');
  await build({
    entryPoints: [join(ROOT, 'src/utils/audio.ts')],
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    outfile,
    logLevel: 'error',
  });
  return import(pathToFileURL(outfile).href);
}

async function main() {
  console.log('\n== audio engine: buses, mutes, persistence, outcome group ==\n');

  /* --- 1. nothing may create a context before a gesture --- */
  installGlobals();
  let audio = await loadModule('pre');
  audio.preloadAudio();
  audio.playPress();
  audio.playSwitch();
  audio.playPaper();
  audio.playHoverTick();
  audio.playDecision(true, 1.65);
  audio.playImpact({ comic: false });
  audio.armAmbience();
  audio.setSfxVolume(0.5);
  audio.setSfxEnabled(false);
  audio.setAmbienceEnabled(false);
  audio.setSoundEnabled(true);
  await sleep(30);
  check('no AudioContext before the first gesture', contextCount === 0, `${contextCount} created`);

  /* --- 2. default graph (fresh instance, untouched preferences) --- */
  created.sources.length = 0;
  created.gains.length = 0;
  created.compressors.length = 0;
  created.filters.length = 0;
  installGlobals();
  audio = await loadModule('defaults');
  await audio.unlockAudio();
  check('one AudioContext after unlock', contextCount === 1, `${contextCount} created`);

  const limiter = created.compressors[0];
  const master = created.gains.find((g) => g.outputs.includes(limiter));
  check('limiter feeds the destination, master feeds the limiter', !!limiter && !!master);
  check(
    'default master gain is 1 (the old 0.7 moved to the sliders)',
    near(master.gain.value, 1),
    `${master?.gain.value}`,
  );

  const userGains = created.gains.filter((g) => g.outputs.includes(master));
  check('two user gains feed master (effects + background)', userGains.length === 2, `${userGains.length} found`);
  check(
    'both user gains default to 0.7',
    userGains.every((g) => near(g.gain.value, 0.7)),
    userGains.map((g) => g.gain.value).join(' / '),
  );

  const sfxBus = created.gains.find(
    (g) => near(g.gain.value, 0.9) && g.outputs.some((o) => userGains.includes(o)),
  );
  check('effects bus (0.9) feeds the effects user gain', !!sfxBus);
  const effSfx = (sfxBus?.gain.value ?? 0) * 0.7 * (master?.gain.value ?? 0);
  check('effective effects gain is 0.63, as before the split', near(effSfx, 0.63, 0.0005), effSfx.toFixed(4));

  // the effects user gain is whatever the 0.9 sfx bus feeds; the other one is the bed
  const sfxUserGain = sfxBus?.outputs.find((o) => userGains.includes(o));
  const ambUser = userGains.find((g) => g !== sfxUserGain);
  check('the two user gains are distinct nodes', !!sfxUserGain && !!ambUser && sfxUserGain !== ambUser);

  // decode proof: a cue can only play once the sprite decoded
  const sourcesBefore = created.sources.length;
  audio.setSfxEnabled(true);
  audio.playPaper();
  check(
    'the sprite decodes (a cue produces a voice)',
    created.sources.length > sourcesBefore,
    `${created.sources.length - sourcesBefore} source(s)`,
  );

  /* --- 3. the bed is armed by the game, not by a settings click --- */
  check('ambience does not start before the game is armed', !created.sources.some((s) => s.loop));
  audio.armAmbience();
  await sleep(40);
  check('ambience starts once armed', created.sources.some((s) => s.loop));

  /* --- 4. effects-only mute must not touch the background --- */
  const beforeAmb = ambUser.gain.value;
  audio.setSfxEnabled(false);
  check('effects mute zeroes the effects user gain', near(sfxUserGain.gain.value, 0), `${sfxUserGain.gain.value}`);
  check(
    'effects mute leaves the background gain alone',
    near(ambUser.gain.value, beforeAmb),
    `${ambUser.gain.value}`,
  );

  const cuesBefore = created.sources.filter((s) => s.startArgs && s.startArgs.duration > 0).length;
  audio.playSwitch();
  audio.playPaper();
  const cuesAfter = created.sources.filter((s) => s.startArgs && s.startArgs.duration > 0).length;
  check('effects mute blocks new cues', cuesAfter === cuesBefore, `${cuesBefore} -> ${cuesAfter}`);
  check(
    'the ambience keeps running while effects are muted',
    created.sources.some((s) => s.loop && s.stoppedAt === null),
  );

  audio.setSfxEnabled(true);
  check('effects unmute restores the slider value', near(sfxUserGain.gain.value, 0.7), `${sfxUserGain.gain.value}`);

  /* --- 5. background-only mute --- */
  const beforeSfx = sfxUserGain.gain.value;
  audio.setAmbienceEnabled(false);
  check('background mute zeroes the background gain', near(ambUser.gain.value, 0), `${ambUser.gain.value}`);
  check('background mute leaves the effects gain alone', near(sfxUserGain.gain.value, beforeSfx));
  const ramp = ambUser.gain.events.filter((e) => e.op === 'target').at(-1);
  check(
    'background mute is a smooth ~150 ms ramp, not a jump',
    !!ramp && ramp.tau > 0.03 && ramp.tau < 0.08,
    `tau ${ramp?.tau?.toFixed(3)}`,
  );
  audio.setAmbienceEnabled(true);
  check('background unmute returns to the slider value', near(ambUser.gain.value, 0.7));

  /* --- 6. master mute --- */
  audio.setSoundEnabled(false);
  check('master mute zeroes the master gain', near(master.gain.value, 0), `${master.gain.value}`);
  check(
    'master mute leaves both user gains where they were',
    near(sfxUserGain.gain.value, 0.7) && near(ambUser.gain.value, 0.7),
    `${sfxUserGain.gain.value} / ${ambUser.gain.value}`,
  );
  audio.setSoundEnabled(true);
  check('master unmute restores 1', near(master.gain.value, 1));

  /* --- 7. muting effects mid-approach stops the rumble and the clacks --- */
  const before = created.sources.length;
  audio.playDecision(false, 1.65);
  await sleep(260);
  const rumble = created.sources.slice(before).find((s) => s.loop);
  check('approach starts a looping rumble', !!rumble);
  const clacksBefore = created.sources.length;
  audio.setSfxEnabled(false);
  check('muting effects stops the rumble', rumble?.stoppedAt !== null, `stoppedAt=${rumble?.stoppedAt}`);
  await sleep(320);
  const clacksAfter = created.sources.length;
  check('no clacks are scheduled after the effects mute', clacksAfter === clacksBefore, `${clacksBefore} -> ${clacksAfter}`);
  audio.setSfxEnabled(true);

  /* --- 8. outcome group fade --- */
  audio.stopAllCues();
  const beforeImpact = created.sources.length;
  const stampIn = audio.playImpact({ comic: true });
  check('impact returns 380 ms to the stamp', stampIn === 380, `${stampIn} ms`);
  await sleep(120); // impact fired at +80 ms
  const impactVoice = created.sources.slice(beforeImpact).at(-1);
  await sleep(300); // stamp at +380 ms
  const stampVoice = created.sources.slice(beforeImpact).at(-1);
  check('impact and stamp are distinct voices', impactVoice !== stampVoice);

  audio.playDecision(true, 1.65); // a lever clack that is NOT in the outcome group
  const leverVoice = created.sources.at(-1);
  audio.fadeOutOutcome(0.1);
  await sleep(30);
  check('outcome impact fades out', impactVoice?.stoppedAt !== null, `stoppedAt=${impactVoice?.stoppedAt}`);
  check('outcome stamp fades out', stampVoice?.stoppedAt !== null);
  check('the lever clack is not touched by the outcome fade', leverVoice?.stoppedAt === null);
  check(
    'the outcome fade ramps rather than cutting',
    (impactVoice?.stoppedAt ?? 0) > 0,
    `stop at ${impactVoice?.stoppedAt}`,
  );

  /* --- 8b. restart sweeps the old voices but keeps its own page-turn --- */
  const mark = created.sources.length;
  audio.playDecision(true, 1.65);
  const oldVoices = created.sources.slice(mark).filter((v) => v.startArgs);
  const stopsBeforeSweep = oldVoices.map((v) => v.stops.length);
  audio.stopAllCues();
  audio.playPaper();
  const pageTurn = created.sources.at(-1);
  check(
    'restart sweeps the voices that were playing (cue + rumble)',
    oldVoices.every((v, i) => v.stops.length > stopsBeforeSweep[i]),
    oldVoices.map((v, i) => `${stopsBeforeSweep[i]}->${v.stops.length}`).join(' '),
  );
  check(
    'restart keeps its own page-turn (it used to be stopped instantly)',
    pageTurn?.stops.length === 1 && pageTurn.stops[0] > 0.2,
    `stops ${JSON.stringify(pageTurn?.stops)}`,
  );

  /* --- 9. ambience is never part of the effects group --- */
  const amb = created.sources.find((s) => s.loop && s.stoppedAt === null);
  check('the ambience bed survives the outcome fade', !!amb);

  /* --- 10. persistence + migration --- */
  audio.setSfxVolume(0.42);
  audio.setAmbienceVolume(0.24);
  audio.setSfxEnabled(false);
  audio.setAmbienceEnabled(false);
  audio.setSoundEnabled(false);
  check(
    'all five preference keys are written',
    store.get('tramvay_sound_enabled') === 'false' &&
      store.get('tramvay_sfx_enabled') === 'false' &&
      store.get('tramvay_ambience_enabled') === 'false' &&
      store.get('tramvay_sfx_volume') === '0.42' &&
      store.get('tramvay_ambience_volume') === '0.24',
    [...store.entries()].map(([k, v]) => `${k}=${v}`).join(' '),
  );
  audio.setSfxVolume(-5); // clamped
  check('volumes are clamped to 0..1', audio.getSfxVolume() === 0, `${audio.getSfxVolume()}`);

  installGlobals({ storage: { tramvay_volume: '0.25' } });
  audio = await loadModule('legacy');
  await audio.unlockAudio();
  check(
    'legacy tramvay_volume migrates into both sliders',
    near(audio.getSfxVolume(), 0.25) && near(audio.getAmbienceVolume(), 0.25),
    `${audio.getSfxVolume()} / ${audio.getAmbienceVolume()}`,
  );

  installGlobals({ storage: { tramvay_volume: 'nonsense', tramvay_sfx_volume: '0.33' } });
  audio = await loadModule('invalid');
  await audio.unlockAudio();
  check(
    'invalid stored values fall back to the defaults',
    near(audio.getSfxVolume(), 0.33) && near(audio.getAmbienceVolume(), 0.7),
    `${audio.getSfxVolume()} / ${audio.getAmbienceVolume()}`,
  );
  check('missing keys default to enabled', audio.getSfxEnabled() && audio.getAmbienceEnabled());

  installGlobals({ storage: { tramvay_sfx_enabled: 'false', tramvay_ambience_enabled: 'false' } });
  audio = await loadModule('muted');
  await audio.unlockAudio();
  check('stored switches are honoured on load', !audio.getSfxEnabled() && !audio.getAmbienceEnabled());

  /* --- 11. broken storage never throws --- */
  installGlobals();
  window.localStorage.getItem = () => {
    throw new Error('blocked');
  };
  window.localStorage.setItem = () => {
    throw new Error('blocked');
  };
  audio = await loadModule('broken');
  let threw = false;
  try {
    await audio.unlockAudio();
    audio.setSoundEnabled(false);
    audio.setSfxVolume(0.5);
    audio.setAmbienceEnabled(false);
    audio.getSfxVolume();
    audio.playPress();
  } catch {
    threw = true;
  }
  check('a throwing localStorage never breaks the engine', !threw);

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} engine checks passed`);
  if (failed.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
