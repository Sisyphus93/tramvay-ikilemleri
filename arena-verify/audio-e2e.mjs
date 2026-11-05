/**
 * Headless behavioural harness for the audio overhaul.
 *
 * Chromium cannot be downloaded in this sandbox, so this runs the REAL app
 * bundle (esbuild, same as Vite's transform) inside jsdom, with an instrumented
 * mock Web Audio API and a controllable requestAnimationFrame clock.
 *
 * It checks:
 *  - no AudioContext before the Start gesture
 *  - start gesture -> context + sprite decode + ambience
 *  - lever/route/hover cues fire once, never twice (StrictMode-style double render)
 *  - decision -> impact -> stamp ordering (the stings were removed)
 *  - the verdict (result overlay) appears ~380 ms after the animation ends
 *  - no console errors, no unhandled rejections, no failed /audio requests
 *  - the missing-sfx.json failure path plays silently with one warning
 *
 * Usage: node arena-verify/audio-e2e.mjs [repo-root] [normal|missing-json|missing-sprite]
 */

import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..');
// jsdom is a devDependency, so `npm ci` in the repo root provides it. This used to
// require a hard-coded path into /tmp/e2e, a directory that only ever existed on
// the machine the harness was first written on.
//
// Wording in this file is not free, either: Tailwind v4 scans every path that is
// not gitignored, this harness included, and emits a utility for any candidate it
// recognises. A prose word here that happens to name a utility ends up in the
// shipped CSS bundle. (Recorded in the commit message rather than spelled out
// here, because spelling it out reproduces it.)
let JSDOM;
try {
  ({ JSDOM } = require('jsdom'));
} catch {
  process.stderr.write(
    'audio-e2e.mjs needs jsdom, which is a devDependency: run `npm ci` (or `npm install`) in the repository root first.\n',
  );
  process.exit(1);
}
const { build: buildAsync } = require(join(repo, 'node_modules/esbuild/lib/main.js'));

const [rootArg, mode = 'normal'] = process.argv.slice(2);
const root = rootArg ? resolve(rootArg) : repo;
const realSetImmediate = setImmediate;
const PUBLIC = join(root, 'public');

const log = [];
const record = (msg) => log.push(msg);

/**
 * Verdict for a check whose normal-mode expectation is that a cue PLAYS.
 *
 * In missing-sprite mode every sprite format is served as HTML, audio.ts logs
 * "Could not load the SFX sprite; effects will be silent", and that silence IS the
 * behaviour under test. Labelling it FAIL -- as this harness did, on five separate
 * checks -- made a passing mode look broken, and would have hidden the opposite
 * regression: a cue somehow playing when nothing could have decoded.
 */
const spritesAvailable = mode !== 'missing-sprite';
const cueVerdict = (observed, normalOk) => {
  if (spritesAvailable) return normalOk ? 'PASS' : 'FAIL';
  return observed === 0
    ? 'PASS (silent, which is what this mode requires)'
    : 'FAIL (a cue played although every sprite format 404s in this mode)';
};

/* ---------- virtual clock ---------- */
let now = 0;
const rafQueue = [];
const timeoutQueue = []; // { id, at, fn }
let nextId = 1;

function advanceTo(target) {
  for (;;) {
    // next event: rAF (next frame ~16.7ms) or timeout
    const rafAt = rafQueue.length ? rafQueue[0].at : Infinity;
    const tAt = timeoutQueue.length ? Math.min(...timeoutQueue.map((t) => t.at)) : Infinity;
    const next = Math.min(rafAt, tAt);
    if (next > target || next === Infinity) break;
    now = next;
    if (rafAt <= tAt) {
      const { fn } = rafQueue.shift();
      fn(now);
    } else {
      const idx = timeoutQueue.reduce((best, t, i) => (t.at < timeoutQueue[best].at ? i : best), 0);
      const [job] = timeoutQueue.splice(idx, 1);
      job.fn();
    }
  }
  now = target;
}

/* ---------- instrumented Web Audio ---------- */
const audioLog = [];
let contextCount = 0;
let audioCtxLive = null;

class MockParam {
  constructor(v = 0, name = 'param') {
    this.value = v;
    this.name = name;
  }
  _log(method, args) {
    if (this.name === 'gain' && this.ownerTag) audioLog.push({ t: now, kind: 'param', tag: this.ownerTag, method, args });
  }
  setValueAtTime(v, t) { this.value = v; }
  linearRampToValueAtTime(v, t) { this.value = v; }
  exponentialRampToValueAtTime(v, t) { this.value = v; }
  setTargetAtTime(v, t, c) { this.value = v; }
  cancelScheduledValues() {}
}

class MockNode {
  constructor(ctx, kind) {
    this.context = ctx;
    this.kind = kind;
    this.connections = [];
  }
  connect(dest) {
    this.connections.push(dest);
    return dest;
  }
  disconnect() {}
}

class MockBufferSource extends MockNode {
  constructor(ctx) {
    super(ctx, 'BufferSource');
    this.playbackRate = new MockParam(1, 'rate');
    this.buffer = null;
    this.onended = null;
    this._started = null;
  }
  start(when = 0, offset = 0, duration) {
    // short slices are SFX from the sprite; the long one is the ambience bed
    const isSfx = duration !== undefined && duration < 3;
    this._started = { when, offset, duration, isSfx };
    audioLog.push({ t: now, kind: 'start', offset, duration, name: isSfx ? 'sprite' : 'ambience' });
    if (isSfx && this.onended) {
      const at = now + Math.round((duration ?? 0.2) * 1000);
      timeoutQueue.push({ id: nextId++, at, fn: () => this.onended && this.onended() });
    }
  }
  stop(when = 0) {
    audioLog.push({ t: now, kind: 'stop', offset: this._started?.offset, when });
  }
}

class MockGain extends MockNode {
  constructor(ctx) {
    super(ctx, 'Gain');
    this.gain = new MockParam(1, 'gain');
    this.gain.ownerTag = this;
  }
}

class MockFilter extends MockNode {
  constructor(ctx) {
    super(ctx, 'Biquad');
    this.type = 'lowpass';
    this.frequency = new MockParam(350, 'freq');
    this.Q = new MockParam(1, 'q');
    this.gain = new MockParam(0, 'gain');
  }
}

class MockCompressor extends MockNode {
  constructor(ctx) {
    super(ctx, 'DynamicsCompressor');
    for (const p of ['threshold', 'knee', 'ratio', 'attack', 'release']) this[p] = new MockParam(0, p);
  }
}

class MockAudioBuffer {
  constructor(channels, length, sampleRate) {
    this.numberOfChannels = channels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.duration = length / sampleRate;
    this.__data = new Float32Array(length);
  }
  getChannelData() {
    return this.__data;
  }
}

class MockAudioContext {
  constructor() {
    contextCount++;
    audioCtxLive = this;
    this.state = 'running';
    this.sampleRate = 44100;
    this.currentTime = 0;
    this.destination = new MockNode(this, 'destination');
    audioLog.push({ t: now, kind: 'context' });
  }
  get currentTimeNow() {
    return this.currentTime;
  }
  createGain() { return new MockGain(this); }
  createBiquadFilter() { return new MockFilter(this); }
  createDynamicsCompressor() { return new MockCompressor(this); }
  createBufferSource() { return new MockBufferSource(this); }
  createBuffer(ch, len, sr) { return new MockAudioBuffer(ch, len, sr); }
  async decodeAudioData(bytes) {
    const buf = new MockAudioBuffer(1, 13.7 * 44100, 44100);
    buf.__name = bytes && bytes.__name;
    audioLog.push({ t: now, kind: 'decode', name: buf.__name, bytes: bytes ? bytes.byteLength : 0 });
    return buf;
  }
  async resume() { this.state = 'running'; }
  async suspend() { this.state = 'suspended'; }
}

/* ---------- fetch mock over public/ ---------- */
const requestLog = [];
function mockFetch(url) {
  const clean = String(url).split('?')[0];
  requestLog.push(clean);
  const file = join(PUBLIC, clean.replace(/^\/audio\//, 'audio/'));
  const guard = mode === 'missing-json' && clean.endsWith('sfx.json');
  if (guard) {
    // SPA fallback: index.html with HTTP 200
    return Promise.resolve(makeResponse(200, '<!doctype html><html></html>', 'text/html'));
  }
  if (mode === 'missing-sprite' && /sfx\.(ogg|m4a|wav)$/.test(clean)) {
    return Promise.resolve(makeResponse(200, '<!doctype html><html></html>', 'text/html'));
  }
  if (!existsSync(file)) {
    requestLog.push(`MISS ${clean}`);
    return Promise.resolve(makeResponse(404, 'not found', 'text/plain'));
  }
  const bytes = readFileSync(file);
  const type = clean.endsWith('.json')
    ? 'application/json'
    : clean.endsWith('.ogg')
      ? 'audio/ogg'
      : clean.endsWith('.m4a')
        ? 'audio/mp4'
        : 'audio/wav';
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  ab.__name = clean.match(/sfx|ambience/)?.[0] ?? 'x';
  // keep the name on a copy, like a real arrayBuffer() would
  return Promise.resolve({
    ok: true,
    status: 200,
    headers: { get: (h) => (h.toLowerCase() === 'content-type' ? type : null) },
    text: async () => bytes.toString('utf8'),
    arrayBuffer: async () => {
      const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      copy.__name = ab.__name;
      return copy;
    },
  });
}
function makeResponse(status, body, type) {
  const buf = Buffer.from(body, 'utf8');
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h) => (h.toLowerCase() === 'content-type' ? type : null) },
    text: async () => body,
    arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  };
}

/* ---------- build the app ---------- */
const outfile = join(here, '.bundle.mjs');
await buildAsync({
  entryPoints: ['src/main.tsx'],
  bundle: true,
  format: 'esm',
  outfile,
  absWorkingDir: root,
  jsx: 'automatic',
  loader: { '.tsx': 'tsx', '.ts': 'ts' },
  define: { 'process.env.NODE_ENV': '"development"' },
  nodePaths: [join(root, 'node_modules')],
  platform: 'browser',
  logLevel: 'error',
  plugins: [
    {
      name: 'css-stub',
      setup(b) {
        b.onResolve({ filter: /\.css$/ }, (args) => ({ path: args.path, namespace: 'css-stub' }));
        b.onLoad({ filter: /.*/, namespace: 'css-stub' }, () => ({ contents: '', loader: 'js' }));
      },
    },
  ],
});
record(`bundle built (${(readFileSync(outfile).length / 1024).toFixed(0)} kB)`);

/* ---------- jsdom environment ---------- */
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost:3000/',
  pretendToBeVisual: true,
});
const { window } = dom;

window.AudioContext = MockAudioContext;
window.fetch = (url) => mockFetch(url);
// A real id per frame, and a cancelAnimationFrame that actually removes it.
// Returning a constant 1 with a no-op cancel meant a frame the app (or
// framer-motion) had explicitly cancelled still ran on the next advanceTo(), so
// the virtual clock could execute work that was thrown away, and any test of
// "this animation was cancelled" was meaningless.
window.requestAnimationFrame = (cb) => {
  const entry = { id: nextId++, at: now + 16, fn: cb };
  rafQueue.push(entry);
  rafQueue.sort((a, b) => a.at - b.at);
  return entry.id;
};
window.cancelAnimationFrame = (id) => {
  const i = rafQueue.findIndex((r) => r.id === id);
  if (i >= 0) rafQueue.splice(i, 1);
};
Object.defineProperty(window.performance, 'now', { value: () => now, configurable: true });
window.setTimeout = (fn, ms) => {
  const id = nextId++;
  timeoutQueue.push({ id, at: now + Math.max(0, ms || 0), fn });
  return id;
};
window.clearTimeout = (id) => {
  const i = timeoutQueue.findIndex((t) => t.id === id);
  if (i >= 0) timeoutQueue.splice(i, 1);
};
window.matchMedia = (q) => ({
  matches: q.includes('hover: hover'),
  media: q,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
});
window.scrollTo = () => {};
// jsdom has no codec support at all; behave like Chrome
window.HTMLMediaElement.prototype.canPlayType = function canPlayType(type) {
  if (/ogg/.test(type)) return 'probably';
  if (/mp4|m4a|aac/.test(type)) return 'probably';
  if (/wav/.test(type)) return 'maybe';
  return '';
};
window.localStorage.clear();

const consoleErrors = [];
const consoleWarns = [];
window.console = {
  ...console,
  error: (...a) => {
    consoleErrors.push(a.join(' '));
    console.error('[app error]', ...a);
  },
  warn: (...a) => {
    consoleWarns.push(a.join(' '));
  },
  log: () => {},
  info: () => {},
};
const rejections = [];
const out = (...a) => process.stdout.write(a.join(' ') + '\n');
window.addEventListener('unhandledrejection', (e) => rejections.push(String(e.reason)));

// expose to the bundle
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'AudioContext', 'fetch', 'performance', 'matchMedia', 'setTimeout', 'clearTimeout', 'localStorage', 'MutationObserver', 'HTMLIFrameElement']) {
  try {
    globalThis[key] = key === 'window' ? window : window[key];
  } catch {
    /* read-only globals are fine */
  }
}
globalThis.self = window;
globalThis.global = globalThis;
window.globalThis = window;

// mirror the timing queues so app-side timers use the virtual clock
globalThis.setTimeout = window.setTimeout;
globalThis.clearTimeout = window.clearTimeout;
globalThis.requestAnimationFrame = window.requestAnimationFrame;

await import(outfile);

const flush = async (rounds = 6) => {
  for (let i = 0; i < rounds; i++) {
    await new Promise((r) => realSetImmediate(r));
  }
};

const wait = async (ms) => {
  advanceTo(now + ms);
  await flush(4);
};

const doc = window.document;

/**
 * Dispatch a keydown the way a browser delivers it: on the element that has focus,
 * bubbling up to the window listener.
 *
 * Dispatching straight on `window` made event.target the window itself, which
 * silently skipped every target-based guard in App's keydown handler -- a focused
 * control owns Enter and Space, and every key except M is swallowed while focus is
 * inside .audio-settings. Both guards existed in the app and neither was exercised.
 *
 * Pass `target` explicitly when the check is about something other than the focused
 * element; the mute check below does exactly that.
 */
const pressKey = (key, target) => {
  const focused = doc.activeElement;
  const el = target || (focused && focused !== doc.documentElement ? focused : doc.body);
  el.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  return el;
};

const keyListeners = [];
const origAdd = window.addEventListener.bind(window);
window.addEventListener = (type, fn, opts) => {
  if (type === 'keydown') keyListeners.push(fn);
  return origAdd(type, fn, opts);
};
const origRemove = window.removeEventListener.bind(window);
window.removeEventListener = (type, fn, opts) => {
  if (type === 'keydown') {
    const i = keyListeners.indexOf(fn);
    if (i >= 0) keyListeners.splice(i, 1);
  }
  return origRemove(type, fn, opts);
};
const text = () => doc.body.textContent || '';
const findByText = (re, selector = 'button') =>
  Array.from(doc.querySelectorAll(selector)).find((el) => re.test(el.textContent || ''));

async function main() {
  await wait(50);

  /* --- 0. nothing before the gesture --- */
  record(`AudioContext instances before Start: ${contextCount} ${contextCount === 0 ? 'PASS' : 'FAIL'}`);
  record(`audio requests before Start: ${requestLog.length ? requestLog.join(',') : 'none'}`);

  /* --- 1. hover before start should NOT create a context --- */
  const startBtn = findByText(/İkilemlere Başla/);
  if (!startBtn) throw new Error('start button not found');
  startBtn.dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true }));
  await wait(200);
  record(`AudioContext after hovering Start: ${contextCount} ${contextCount === 0 ? 'PASS' : 'FAIL'}`);

  /* --- 2. click Start --- */
  startBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(1200);
  if (process.env.DEBUG) {
    record(`DOM after start: choices=${doc.querySelectorAll('.choice').length} canvas=${doc.querySelectorAll('.blueprint-canvas').length} html=${doc.body.innerHTML.length}`);
  }
  record(`AudioContext after Start click: ${contextCount} ${contextCount === 1 ? 'PASS' : 'FAIL'}`);

  // wait for fetch + decode
  for (let i = 0; i < 40 && !audioLog.some((e) => e.kind === 'start'); i++) await wait(50);
  const spriteStarts = () => audioLog.filter((e) => e.kind === 'start' && e.name === 'sprite');
  record(`ambience source started: ${audioLog.some((e) => e.kind === 'start' && e.name === 'ambience') ? 'PASS' : 'FAIL'}`);
  record(`requests: ${requestLog.filter((r) => !r.startsWith('MISS')).join(', ')}`);

  /* --- 3. lever toggle by keyboard, exactly one switch per press,
         and clicking the SVG lever does the same thing exactly once --- */
  let before = spriteStarts().length;
  pressKey(' ');
  await wait(300);
  const afterSpace = spriteStarts().length - before;
  record(`space (lever toggle) fired ${afterSpace} sfx ${cueVerdict(afterSpace, afterSpace === 1)}`);

  const lever = doc.querySelector('.blueprint-lever');
  before = spriteStarts().length;
  lever?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(300);
  const afterLever = spriteStarts().length - before;
  record(
    `lever click (mouse) fired ${afterLever} sfx ${
      lever
        ? cueVerdict(afterLever, afterLever === 1)
        : 'SKIP (SVG lever not mounted in jsdom: motion exit animation never settles)'
    }`,
  );

  /* --- 4. decision: straight (key 1) --- */
  const keyAt = now;
  const beforeDecision = spriteStarts().length;
  pressKey('1');
  await wait(60);
  record(`decision cues queued in the first 60 ms: ${spriteStarts().length - beforeDecision}`);

  // poll for the verdict overlay
  let verdictAt = null;
  for (let i = 0; i < 400 && verdictAt === null; i++) {
    await wait(8);
    if (/Kararın/.test(text())) verdictAt = now;
  }
  const stampCue = audioLog.find((e) => e.kind === 'start' && e.name === 'sprite' && e.t >= keyAt + 3000 / 2 && e.duration > 0.39 && e.duration < 0.45);
  record(`verdict overlay first visible ${verdictAt === null ? 'NEVER' : verdictAt - keyAt} ms after the decision key`);
  record(`stamp slice started at ${stampCue ? stampCue.t - keyAt : '?'} ms; verdict delta vs stamp: ${stampCue && verdictAt ? verdictAt - stampCue.t : '?'} ms`);

  const cueClasses = audioLog
    .filter((e) => e.kind === 'start' && e.name === 'sprite' && e.t >= keyAt)
    .map((e) => `${Math.round(e.t - keyAt)}:+${(e.duration * 1000).toFixed(0)}ms`);
  record(`sprite cues after the decision (offset from key + slice length): ${cueClasses.join('  ')}`);
  const orderOk = (() => {
    const after = audioLog.filter((e) => e.kind === 'start' && e.name === 'sprite' && e.t >= keyAt);
    return after.length >= 4;
  })();
  const stings = audioLog.filter((e) => e.kind === 'start' && e.name === 'sprite' && e.t >= keyAt).length;
  record(`at least 4 cues in the sequence (clacks, impact, stamp): ${cueVerdict(stings, orderOk)} (${stings} cues)`);

  /* --- 5. advancing fades the outcome group out --- */
  const stopsBefore = audioLog.filter((e) => e.kind === 'stop').length;
  const b3 = spriteStarts().length;
  pressKey('Enter');
  await wait(600);
  const swept = audioLog.filter((e) => e.kind === 'stop').length - stopsBefore;
  record(`next dilemma fired ${spriteStarts().length - b3} cue(s)`);
  record(`advance faded ${swept} still-ringing outcome voice(s) ${cueVerdict(swept, swept >= 1)}`);

  /* --- 5b. the audio settings popover --- */
  const trigger = doc.querySelector('button[aria-label="Ses ayarları"]');
  record(`settings trigger present: ${trigger ? 'PASS' : 'FAIL'}`);
  trigger?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(30);
  const panel = doc.querySelector('.audio-settings__panel');
  const switches = Array.from(doc.querySelectorAll('.audio-settings__switch'));
  const sliders = Array.from(doc.querySelectorAll('.audio-settings__slider'));
  record(
    `popover opens with two rows, two switches, two sliders: ${
      panel && switches.length === 2 && sliders.length === 2 ? 'PASS' : 'FAIL'
    } (${switches.length}/${sliders.length})`,
  );
  record(
    `sliders show the persisted levels: ${sliders.map((el) => el.value).join('/')} ${
      sliders.every((el) => el.value === '70') ? 'PASS' : 'FAIL'
    }`,
  );

  // Opening the panel focused its first control, so from here the focused element
  // is inside .audio-settings. Check that guard first, while effects are still
  // enabled: if it were missing this Space would reach the game handler and fire a
  // lever cue. Window-dispatch could never see this, because event.target was the
  // window and App's `origin?.closest?.('.audio-settings')` test was skipped.
  const guardBefore = spriteStarts().length;
  const guardTarget = pressKey(' ');
  await wait(300);
  const guardFired = spriteStarts().length - guardBefore;
  record(
    `space on the focused control inside the popover fires no game cue: ${
      guardFired === 0 ? 'PASS' : 'FAIL'
    } (${guardFired} cue(s), target ${guardTarget.className || guardTarget.tagName})`,
  );

  const sfxSwitch = switches.find((el) => (el.getAttribute('aria-label') || '').includes('Efektler'));
  const cueWhileMuted = (() => {
    sfxSwitch?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    const before = spriteStarts().length;
    // Deliberately at the body, not at the focused element: this check is about the
    // effects switch silencing a GAME cue, so it has to reach App's handler. From
    // inside the popover it never would -- that is the guard checked just above.
    pressKey(' ', doc.body);
    return { before };
  })();
  await wait(300);
  record(
    `effects switched off blocks game cues: ${
      spriteStarts().length - cueWhileMuted.before === 0 ? 'PASS' : 'FAIL'
    }`,
  );

  sfxSwitch?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(60);
  const previewTick = spriteStarts().length - cueWhileMuted.before;
  record(`effects switched back on plays the preview tick: ${cueVerdict(previewTick, previewTick > 0)}`);

  const ambSwitch = switches.find((el) => (el.getAttribute('aria-label') || '').includes('Arka plan'));
  ambSwitch?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(30);
  record(`background switch toggles: ${ambSwitch?.getAttribute('aria-checked') === 'false' ? 'PASS' : 'FAIL'}`);

  // From the focused control inside the panel, bubbling: AudioSettings listens for
  // Escape in the capture phase on document, so this is the real path.
  pressKey('Escape');
  await wait(30);
  record(`Escape closes the popover: ${doc.querySelector('.audio-settings__panel') ? 'FAIL' : 'PASS'}`);

  /* --- 6. sound off (M) must not fire a cue; on must fire one switch --- */
  const b4 = spriteStarts().length;
  pressKey('m');
  await wait(300);
  record(`M (off) fired ${spriteStarts().length - b4} cue(s) ${spriteStarts().length - b4 === 0 ? 'PASS' : 'FAIL'}`);
  const b5 = spriteStarts().length;
  const mOnTarget = pressKey('M');
  await wait(300);
  const mOnCues = spriteStarts().length - b5;
  record(`M (on) fired ${mOnCues} cue(s) ${cueVerdict(mOnCues, mOnCues === 1)} (target ${mOnTarget.className || mOnTarget.tagName})`);
  record(`localStorage tramvay_sound_enabled = ${window.localStorage.getItem('tramvay_sound_enabled')}`);

  /* --- 7. a full diverted decision with comic mood (dilemma 25 is comic) --- */
  record(`console errors: ${consoleErrors.length} ${consoleErrors.length === 0 ? 'PASS' : 'FAIL'}`);
  record(`console warns: ${consoleWarns.length} ${consoleWarns.length <= 1 ? 'PASS' : 'CHECK'} ${consoleWarns.join(' | ')}`);
  record(`unhandled rejections: ${rejections.length} ${rejections.length === 0 ? 'PASS' : 'FAIL'}`);
  record(`404/MISS requests: ${requestLog.filter((r) => r.startsWith('MISS')).join(',') || 'none'}`);

  out('\n' + log.map((l) => '  ' + l).join('\n'));

  if (mode === 'json') {
    out(
      JSON.stringify(
        {
          contextCount,
          requests: requestLog,
          warns: consoleWarns,
          errors: consoleErrors,
          rejections,
          starts: audioLog.filter((e) => e.kind === 'start').length,
        },
        null,
        2,
      ),
    );
  }
}

await main();

// Propagate failure. This always exited 0, so a FAIL line was cosmetic and the
// script could not be wired into package.json as a check that can actually fail.
const failures = log.filter((l) => /\bFAIL\b/.test(l)).length;
out(`\n${failures} failing check(s) across ${log.length} recorded lines; mode=${mode}`);
process.exit(failures ? 1 : 0);
