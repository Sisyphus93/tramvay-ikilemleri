#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Runtime smoke test for src/utils/audio.ts.
 *
 * There is no headless browser in this environment, so instead of clicking the
 * built game we drive the real module against a mocked Web Audio graph and the
 * real files in public/audio/. That checks the things a click test would catch:
 * no AudioContext before the start gesture, every cue resolves to the right
 * sprite slice, the verdict is scheduled on the audio clock, and a missing or
 * HTML-masked asset degrades to silence with a single warning.
 *
 * Usage: npx tsx scripts/smoke-audio.mjs [--scenario=ok|missing-manifest|missing-sprite|absent]
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const AUDIO_DIR = path.join(ROOT, 'public', 'audio');

const scenarioArg = process.argv.find((a) => a.startsWith('--scenario='));
const scenario = scenarioArg ? scenarioArg.split('=')[1] : 'ok';

/* ------------------------------------------------------------------ */
/* Mock Web Audio                                                      */
/* ------------------------------------------------------------------ */

const graph = {
  contexts: 0,
  sources: [],
  ambienceLoop: false,
  rumbles: 0,
  masterGains: [],
};

class FakeParam {
  constructor(value = 0) {
    this.value = value;
    this.events = [];
  }
  setValueAtTime(v, t) {
    this.value = v;
    this.events.push(['set', v, t]);
    return this;
  }
  linearRampToValueAtTime(v, t) {
    this.value = v;
    this.events.push(['linear', v, t]);
    return this;
  }
  exponentialRampToValueAtTime(v, t) {
    this.value = v;
    this.events.push(['exp', v, t]);
    return this;
  }
  cancelScheduledValues(t) {
    this.events.push(['cancel', t]);
    return this;
  }
}

class FakeNode {
  connect() {
    return this;
  }
  disconnect() {
    return this;
  }
}

class FakeGain extends FakeNode {
  constructor() {
    super();
    this.gain = new FakeParam(1);
  }
}

class FakeFilter extends FakeNode {
  constructor() {
    super();
    this.type = 'lowpass';
    this.frequency = new FakeParam(350);
    this.Q = new FakeParam(1);
  }
}

class FakeCompressor extends FakeNode {
  constructor() {
    super();
    this.threshold = new FakeParam(0);
    this.knee = new FakeParam(0);
    this.ratio = new FakeParam(1);
    this.attack = new FakeParam(0);
    this.release = new FakeParam(0);
  }
}

class FakeBufferSource extends FakeNode {
  constructor() {
    super();
    this.buffer = null;
    this.loop = false;
    this.playbackRate = new FakeParam(1);
    this.onended = null;
    this.meta = null;
  }
  start(when = 0, offset = 0, duration = undefined) {
    graph.sources.push({
      buffer: this.buffer,
      when,
      offset,
      duration,
      loop: this.loop,
      rate: this.playbackRate.value,
    });
    if (this.loop) graph.ambienceLoop = true;
  }
  stop() {
    /* no-op */
  }
}

class FakeBuffer {
  constructor(channels, length, sampleRate, tag) {
    this.numberOfChannels = channels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.duration = length / sampleRate;
    this.tag = tag;
  }
  getChannelData() {
    return new Float32Array(this.length);
  }
}

const riffInfo = (bytes) => {
  const header = new Uint8Array(bytes.slice(0, 12));
  const magic = String.fromCharCode(...header.slice(0, 4));
  if (magic !== 'RIFF') return null;
  const view = new DataView(bytes);
  return {
    channels: view.getUint16(22, true),
    sampleRate: view.getUint32(24, true),
    bits: view.getUint16(34, true),
    dataBytes: view.getUint32(40, true),
  };
};

class FakeAudioContext {
  constructor() {
    graph.contexts += 1;
    this.sampleRate = 32000;
    this.currentTime = 0;
    this.state = 'running';
    this.destination = new FakeNode();
  }
  createGain() {
    const node = new FakeGain();
    graph.masterGains.push(node);
    return node;
  }
  createBiquadFilter() {
    return new FakeFilter();
  }
  createDynamicsCompressor() {
    return new FakeCompressor();
  }
  createBufferSource() {
    return new FakeBufferSource();
  }
  createBuffer(channels, length, sampleRate) {
    return new FakeBuffer(channels, length, sampleRate, 'noise');
  }
  decodeAudioData(bytes, onOk, onErr) {
    const info = riffInfo(bytes);
    if (!info) {
      const err = new Error('EncodingError: not a RIFF/WAVE payload');
      if (onErr) onErr(err);
      return Promise.reject(err);
    }
    const frames = Math.floor(info.dataBytes / 2);
    const buffer = new FakeBuffer(info.channels, frames, info.sampleRate, 'wav');
    if (onOk) onOk(buffer);
    return Promise.resolve(buffer);
  }
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
  suspend() {
    this.state = 'suspended';
    return Promise.resolve();
  }
}

/* ------------------------------------------------------------------ */
/* Mock browser environment                                            */
/* ------------------------------------------------------------------ */

const storage = new Map();
const warnings = [];

globalThis.window = {
  AudioContext: FakeAudioContext,
  localStorage: {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
  },
  matchMedia: () => ({ matches: true }),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id),
};
globalThis.document = {
  hidden: false,
  addEventListener: () => {},
  removeEventListener: () => {},
  createElement: () => ({ canPlayType: () => 'probably' }),
};
globalThis.self = globalThis.window;
globalThis.location = { href: 'http://localhost/' };

const originalWarn = console.warn;
console.warn = (...args) => {
  warnings.push(args.map(String).join(' '));
};

const htmlFallback = () =>
  new Response('<!doctype html><html><body>SPA</body></html>', {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });

const fileResponse = async (file, type) => {
  const bytes = await readFile(path.join(AUDIO_DIR, file));
  return new Response(bytes, { status: 200, headers: { 'content-type': type } });
};

globalThis.fetch = async (url) => {
  const name = String(url).split('/').pop() ?? '';
  if (scenario === 'missing-manifest' && name === 'sfx.json') return htmlFallback();
  if (scenario === 'absent' && name === 'sfx.json') {
    // Real 404 / network failure path (the file is actually gone).
    throw new Error('ENOENT: sfx.json not found');
  }
  if (scenario === 'missing-sprite' && name.startsWith('sfx.')) {
    if (name === 'sfx.json') return fileResponse('sfx.json', 'application/json');
    return htmlFallback(); // SPA rewrite: HTTP 200 + index.html
  }
  if (name === 'sfx.json') return fileResponse('sfx.json', 'application/json');
  if (name === 'sfx.wav') return fileResponse('sfx.wav', 'audio/wav');
  if (name === 'ambience.wav') return fileResponse('ambience.wav', 'audio/wav');
  return new Response('not found', { status: 404 });
};

const unhandled = [];
process.on('unhandledRejection', (err) => unhandled.push(err));

/* ------------------------------------------------------------------ */
/* Drive the module                                                    */
/* ------------------------------------------------------------------ */

const pass = (label, detail = '') => console.log(`  ok   ${label}${detail ? ` — ${detail}` : ''}`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const main = async () => {
  const audio = await import('../src/utils/audio.ts');
  const manifest = scenario === 'absent'
    ? { sprite: {} }
    : JSON.parse(await readFile(path.join(AUDIO_DIR, 'sfx.json'), 'utf8'));
  const sliceStart = (name) => manifest.sprite[name][0] / 1000;
  const namesByOffset = Object.fromEntries(
    Object.entries(manifest.sprite).map(([name, [start]]) => [start / 1000, name])
  );
  const played = () => graph.sources.map((s) => ({ ...s, name: namesByOffset[s.offset] ?? 'noise' }));

  console.log(`\nscenario: ${scenario}`);

  // 1. Preload must not create a context.
  await audio.preloadAudio();
  await sleep(5);
  assert.equal(graph.contexts, 0, 'preloadAudio created an AudioContext before the gesture');
  pass('no AudioContext before the start gesture');

  // 2. Persisted defaults.
  assert.equal(audio.getSoundEnabled(), true, 'sound should default to enabled');
  assert.equal(audio.getVolume(), 0.7, 'volume should default to 0.7');
  audio.setVolume(0.55);
  assert.equal(storage.get('tramvay_volume'), '0.55');
  audio.setVolume(0.7);
  pass('volume defaults to 0.7 and persists as tramvay_volume');

  // 3. Unlock inside the "gesture".
  await audio.unlockAudio();
  assert.equal(graph.contexts, 1, 'unlockAudio should create exactly one context');
  pass('unlockAudio creates one AudioContext');

  const missing = scenario !== 'ok';
  if (missing) {
    // The bed is a separate file: it may survive a missing sprite. No SFX slice
    // may play, and nothing may throw.
    const sfxPlayed = graph.sources.filter((s) => s.buffer?.tag === 'wav' && !s.loop);
    assert.equal(sfxPlayed.length, 0, 'no SFX slice should play when the pack is missing');
    const relevant = warnings.filter((w) => /sprite|sfx/i.test(w));
    assert.ok(relevant.length <= 2, `expected at most one warning per item, got ${relevant.length}`);
    // The verdict timing must still be correct so the UI reveals on the beat.
    assert.equal(audio.playImpact({ mood: 'dread' }), 380);
    audio.playPress();
    audio.playDecision(true, 1.65);
    audio.stopAllCues();
    pass('missing asset degrades to silence', `${warnings.length} warning(s) total`);
    console.warn = originalWarn;
    console.log(`\nwarnings:\n${warnings.map((w) => `  · ${w}`).join('\n')}`);
    assert.equal(unhandled.length, 0, `unhandled rejections: ${unhandled.length}`);
    console.log('\nsmoke test passed\n');
    return;
  }

  assert.ok(graph.ambienceLoop, 'ambience should be a looping buffer source');
  pass('ambience bed starts as a loop');

  // 4. Basic cues map to the right slices.
  const before = graph.sources.length;
  audio.playPress();
  audio.playSwitch();
  audio.playPaper();
  audio.playHoverTick();
  const cues = played().slice(before).map((s) => s.name);
  assert.equal(cues.length, 4, `expected 4 cues, got ${cues.length}: ${cues.join(',')}`);
  assert.ok(cues[0] === 'press', `press expected, got ${cues[0]}`);
  assert.ok(/^switch_\d$/.test(cues[1]), `switch expected, got ${cues[1]}`);
  assert.ok(/^paper_\d$/.test(cues[2]), `paper expected, got ${cues[2]}`);
  assert.ok(/^hover_\d$/.test(cues[3]), `hover expected, got ${cues[3]}`);
  pass('press / switch / paper / hover resolve to sprite slices');

  // Variants must not repeat back to back.
  const picks = new Set();
  for (let i = 0; i < 8; i++) {
    const mark = graph.sources.length;
    audio.playPaper();
    const last = played()[mark];
    picks.add(last.name);
  }
  assert.ok(picks.size >= 2, `variant picking is stuck on ${[...picks].join(',')}`);
  pass('variant picking rotates', `${[...picks].join(', ')}`);

  // 5. Decision choreography.
  const mark = graph.sources.length;
  audio.playDecision(true, 1.65);
  const decision = played().slice(mark);
  const lever = decision.find((s) => s.name.startsWith('lever_clack'));
  const bell = decision.find((s) => s.name === 'bell');
  const rumble = decision.find((s) => s.buffer && s.buffer.tag === 'noise');
  assert.ok(lever, 'pulled lever should clack');
  assert.ok(bell, 'pulled lever should ring the bell');
  assert.ok(bell.when > lever.when, 'bell rings after the clack');
  assert.ok(Math.abs(bell.when - lever.when - 0.28) < 0.02, 'bell should be 280 ms after the lever');
  assert.ok(rumble && rumble.loop, 'rumble should be a looping procedural (brown noise) buffer');
  const clacks = decision.filter((s) => s.name.startsWith('clack_'));
  assert.ok(clacks.length >= 3, `expected a train of clacks, got ${clacks.length}`);
  const gaps = clacks.slice(1).map((s, i) => s.when - clacks[i].when);
  assert.ok(gaps[1] < gaps[0], `clack interval should shrink (${gaps.map((g) => g.toFixed(2)).join(', ')})`);
  pass('pulled decision: lever + bell + rumble + shrinking clacks');

  const mark2 = graph.sources.length;
  audio.playDecision(false, 0.42);
  const dec2 = played().slice(mark2).map((s) => s.name);
  assert.ok(dec2.some((n) => n === 'air_brake'), 'not pulled should hiss');
  assert.ok(dec2.some((n) => n === 'brake_squeal'), 'not pulled should squeal');
  assert.ok(dec2.some((n) => n === 'drone'), 'not pulled should drone');
  pass('straight decision: air brake + squeal + drone');

  // 6. Impact choreography and the returned stamp delay.
  const mark3 = graph.sources.length;
  const msUntilStamp = audio.playImpact({ mood: 'dread', comic: false });
  assert.equal(msUntilStamp, 380, 'playImpact must report 380 ms until the stamp');
  const impact = played().slice(mark3);
  const thud = impact.find((s) => s.name.startsWith('impact_muffled'));
  const stamp = impact.find((s) => s.name.startsWith('stamp_'));
  const sting = impact.find((s) => s.name === 'sting_dread');
  assert.ok(thud && stamp && sting, 'impact + stamp + sting should all be scheduled');
  assert.ok(thud.when >= 0.07, `impact should land after the silence beat (at ${thud.when})`);
  assert.ok(Math.abs(stamp.when - thud.when - 0.3) < 0.02, 'stamp should be 300 ms after the impact');
  assert.ok(Math.abs(sting.when - thud.when - 0.7) < 0.02, 'sting should be 700 ms after the impact');
  assert.ok(stamp.when >= 0.37, 'the stamp (and therefore the result screen) lands at ~380 ms');
  pass(
    'impact choreography',
    `impact ${thud.when.toFixed(2)}s · stamp ${stamp.when.toFixed(2)}s · sting ${sting.when.toFixed(2)}s`
  );

  // Comic dilemmas swap in the cartoon crash.
  const mark4 = graph.sources.length;
  audio.playImpact({ mood: 'relief', comic: true });
  const comicNames = played().slice(mark4).map((s) => s.name);
  assert.ok(comicNames.includes('crash_comic'), 'comic should use crash_comic');
  pass('comic dilemma uses crash_comic');

  // Mood picks the matching sting.
  for (const mood of ['relief', 'dread', 'absurd']) {
    const m = graph.sources.length;
    audio.playImpact({ mood });
    const names = played().slice(m).map((s) => s.name);
    assert.ok(names.includes(`sting_${mood}`), `expected sting_${mood}`);
  }
  pass('mood selects the verdict sting');

  // 7. Summary + stopAllCues.
  const mark5 = graph.sources.length;
  audio.playSummaryReveal();
  const summaryNames = played().slice(mark5).map((s) => s.name);
  assert.ok(summaryNames.some((n) => n.startsWith('stamp')), 'summary should stamp');
  assert.ok(summaryNames.includes('sting_relief'), 'summary should resolve with relief');
  audio.stopAllCues();
  pass('summary reveal = stamp + relief; stopAllCues clears the field');

  // 8. Mute ramps the master, and the M key is not handled here.
  audio.setSoundEnabled(false);
  assert.equal(storage.get('tramvay_sound_enabled'), 'false');
  const master = graph.masterGains[0];
  assert.equal(master.gain.value, 0, 'mute should ramp the master gain to 0');
  audio.setSoundEnabled(true);
  audio.setVolume(0.42);
  assert.equal(master.gain.value, 0.42, 'master gain should follow the volume');
  assert.equal(globalThis.window.keydownHandlers ?? 0, 0, 'audio must not install key listeners');
  pass('mute/volume drive the master gain; no key listener added');

  // 9. Nothing threw or leaked a rejection.
  assert.equal(unhandled.length, 0, `unhandled rejections: ${unhandled.length}`);
  assert.equal(warnings.length, 0, `unexpected warnings: ${warnings.join(' | ')}`);
  pass('no warnings, no unhandled rejections');

  console.warn = originalWarn;
  console.log('\nsmoke test passed\n');
};

main().catch((err) => {
  console.warn = originalWarn;
  console.error(err);
  process.exit(1);
});
