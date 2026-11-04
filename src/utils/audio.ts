/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sample based audio engine.
 *
 * Everything audible here is a pre-rendered foley sample (see
 * `scripts/generate-audio.mjs` and `public/audio/README.md`). The only sound
 * synthesised at runtime is the tram rumble: filtered brown noise whose cutoff
 * and gain rise during the approach, because that has to follow the animation
 * length rather than a fixed sample.
 *
 * Design rules that the rest of the game relies on:
 *  - no AudioContext exists before a real user gesture (`unlockAudio`);
 *  - audio never throws: missing/broken files degrade to silence with a single
 *    warning per item (a static host with an SPA fallback answers HTTP 200 with
 *    index.html, so HTTP status alone proves nothing);
 *  - the `M` key is handled by App.tsx only — this module just persists state.
 */

export type ImpactMood = 'relief' | 'dread' | 'absurd';

export interface ImpactOptions {
  mood?: ImpactMood;
  comic?: boolean;
}

/**
 * Named timing constants. The result screen is scheduled from the *audio*
 * clock, so these values are the single source of truth for the choreography.
 */
export const AUDIO_TIMING = {
  /** Rumble cuts, then this much dead air before the impact lands. */
  silenceBeatSec: 0.08,
  /** Ink stamp lands this long after the impact. */
  stampAfterImpactSec: 0.3,
  /** Verdict sting starts this long after the impact. */
  stingAfterImpactSec: 0.7,
  /** `playImpact` returns the delay until the stamp, in ms. */
  msUntilStamp: 380,
} as const;

const STORAGE_ENABLED = 'tramvay_sound_enabled';
const STORAGE_VOLUME = 'tramvay_volume';
const DEFAULT_VOLUME = 0.7;

// Read via an optional lookup so the module also loads outside Vite (smoke test).
const viteEnv = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env;
const BASE = viteEnv?.BASE_URL ?? '/';
const assetUrl = (file: string): string => `${BASE.replace(/\/$/, '')}/audio/${file}`;

const FORMAT_CANDIDATES: ReadonlyArray<{ ext: string; mime: string }> = [
  { ext: 'm4a', mime: 'audio/mp4; codecs="mp4a.40.2"' },
  { ext: 'ogg', mime: 'audio/ogg; codecs="vorbis"' },
  { ext: 'wav', mime: 'audio/wav' },
];

/** Per-sound gain trims. Samples are peak-normalised, so dense noise needs less. */
const TRIM: Record<string, number> = {
  press: 0.5,
  hover: 0.14,
  switch: 0.45,
  paper: 0.42,
  lever_clack: 0.8,
  bell: 0.5,
  air_brake: 0.35,
  brake_squeal: 0.16,
  drone: 0.3,
  clack: 0.4,
  impact_muffled: 0.85,
  crash_comic: 0.55,
  stamp: 0.95,
  sting_relief: 0.45,
  sting_dread: 0.45,
  sting_absurd: 0.4,
};

/** Tonal sounds keep their pitch; percussive ones get a little variation. */
const TONAL = new Set(['bell', 'drone', 'sting_relief', 'sting_dread', 'sting_absurd']);

/** Groups that ship as `name_1..name_N`. */
const VARIANT_GROUPS = new Set([
  'hover',
  'switch',
  'paper',
  'lever_clack',
  'clack',
  'impact_muffled',
  'stamp',
]);

interface Engine {
  ctx: AudioContext;
  master: GainNode;
  limiter: DynamicsCompressorNode;
  sfxBus: GainNode;
  ambBus: GainNode;
  duck: GainNode;
  ambFade: GainNode;
}

interface Rumble {
  source: AudioBufferSourceNode;
  filter: BiquadFilterNode;
  gain: GainNode;
}

interface SpriteManifest {
  sampleRate?: number;
  formats?: string[];
  sprite: Record<string, [number, number]>;
}

interface ActiveVoice {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

/* ------------------------------------------------------------------ */
/* Module state                                                        */
/* ------------------------------------------------------------------ */

let engine: Engine | null = null;
let spriteBuffer: AudioBuffer | null = null;
let ambienceBuffer: AudioBuffer | null = null;
let spriteTable: Record<string, [number, number]> = {};
let brownBuffer: AudioBuffer | null = null;

let manifestCache: SpriteManifest | null = null;
let spriteBytes: ArrayBuffer | null = null;
let ambienceBytes: ArrayBuffer | null = null;

let preloadPromise: Promise<void> | null = null;
let decodePromise: Promise<void> | null = null;
let spriteFailed = false;

let ambienceNode: AudioBufferSourceNode | null = null;
let rumble: Rumble | null = null;
let activeVoices: ActiveVoice[] = [];
let scheduledTimers: number[] = [];
let lastVariant = new Map<string, number>();
let pendingCues: Array<() => void> = [];

const warned = new Set<string>();

const memoryEnabled = readStoredBool(STORAGE_ENABLED, true);
let soundEnabled = memoryEnabled;
let volume = readStoredVolume();

/* ------------------------------------------------------------------ */
/* Small safe helpers                                                  */
/* ------------------------------------------------------------------ */

function warnOnce(key: string, message: string, error?: unknown): void {
  if (warned.has(key)) return;
  warned.add(key);
  if (error !== undefined) console.warn(`[audio] ${message}`, error);
  else console.warn(`[audio] ${message}`);
}

function readStoredBool(key: string, fallback: boolean): boolean {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw !== 'false';
  } catch {
    return fallback;
  }
}

function readStoredVolume(): number {
  try {
    const raw = window.localStorage.getItem(STORAGE_VOLUME);
    if (raw === null) return DEFAULT_VOLUME;
    const parsed = Number.parseFloat(raw);
    if (!Number.isFinite(parsed)) return DEFAULT_VOLUME;
    return Math.min(1, Math.max(0, parsed));
  } catch {
    return DEFAULT_VOLUME;
  }
}

function persist(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode / quota — the in-memory value still works */
  }
}

function hasHover(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(hover: hover)').matches;
}

function ramp(param: AudioParam, value: number, seconds: number, ctx: AudioContext): void {
  const now = ctx.currentTime;
  const target = Math.max(0.0001, seconds);
  try {
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(value, now + target);
  } catch {
    param.value = value;
  }
}

/* ------------------------------------------------------------------ */
/* Network + decoding                                                  */
/* ------------------------------------------------------------------ */

async function fetchBytes(url: string, key: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) {
      warnOnce(key, `could not load ${url} (HTTP ${res.status})`);
      return null;
    }
    const type = res.headers.get('content-type') ?? '';
    if (type.includes('text/html')) {
      // SPA fallback answered with index.html: treat as missing, not as audio.
      warnOnce(key, `${url} was served as HTML (SPA fallback); skipping`);
      return null;
    }
    return await res.arrayBuffer();
  } catch (err) {
    warnOnce(key, `could not fetch ${url}`, err);
    return null;
  }
}

async function fetchManifest(): Promise<SpriteManifest | null> {
  if (manifestCache) return manifestCache;
  try {
    const res = await fetch(assetUrl('sfx.json'), { cache: 'force-cache' });
    if (!res.ok) {
      warnOnce('manifest', `could not load sfx.json (HTTP ${res.status})`);
      return null;
    }
    const type = res.headers.get('content-type') ?? '';
    if (type.includes('text/html')) {
      warnOnce('manifest', 'sfx.json was served as HTML (SPA fallback); skipping');
      return null;
    }
    const parsed = (await res.json()) as SpriteManifest;
    if (!parsed || typeof parsed !== 'object' || !parsed.sprite || typeof parsed.sprite !== 'object') {
      warnOnce('manifest', 'sfx.json has no sprite map; skipping');
      return null;
    }
    manifestCache = parsed;
    return parsed;
  } catch (err) {
    warnOnce('manifest', 'could not load or parse sfx.json', err);
    return null;
  }
}

function pickSpriteFormat(manifest: SpriteManifest | null): string {
  const available = manifest?.formats ?? ['wav'];
  if (typeof document === 'undefined') return 'wav';
  try {
    const probe = document.createElement('audio');
    for (const candidate of FORMAT_CANDIDATES) {
      if (!available.includes(candidate.ext)) continue;
      if (probe.canPlayType(candidate.mime) !== '') return candidate.ext;
    }
  } catch {
    /* fall through to wav */
  }
  return 'wav';
}

/** Fetch manifest + bytes. Safe (and cheap) to call on page load. */
export function preloadAudio(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (preloadPromise) return preloadPromise;
  preloadPromise = (async () => {
    const manifest = await fetchManifest();
    const format = pickSpriteFormat(manifest);
    const [sprite, ambience] = await Promise.all([
      fetchBytes(assetUrl(`sfx.${format}`), 'sprite'),
      fetchBytes(assetUrl('ambience.wav'), 'ambience'),
    ]);
    spriteBytes = sprite;
    ambienceBytes = ambience;
    spriteFailed = sprite === null;
  })();
  return preloadPromise;
}

function decodeBuffer(ctx: AudioContext, bytes: ArrayBuffer, key: string): Promise<AudioBuffer | null> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (buffer: AudioBuffer | null, err?: unknown) => {
      if (settled) return;
      settled = true;
      if (!buffer) warnOnce(key, `could not decode ${key} (missing file or HTML fallback)`, err);
      resolve(buffer);
    };
    try {
      const maybe = ctx.decodeAudioData(bytes.slice(0), (buffer) => done(buffer), (err) => done(null, err));
      if (maybe && typeof (maybe as Promise<AudioBuffer>).then === 'function') {
        (maybe as Promise<AudioBuffer>).then((buffer) => done(buffer), (err) => done(null, err));
      }
    } catch (err) {
      done(null, err);
    }
  });
}

async function ensureDecoded(ctx: AudioContext): Promise<void> {
  if (decodePromise) return decodePromise;
  decodePromise = (async () => {
    await preloadAudio();
    if (spriteFailed || !spriteBytes) {
      warnOnce('sprite', 'sound sprite unavailable; continuing silently');
      return;
    }
    const manifest = manifestCache;
    spriteTable = manifest?.sprite ?? {};
    spriteBuffer = await decodeBuffer(ctx, spriteBytes, 'sprite');
    if (ambienceBytes) {
      ambienceBuffer = await decodeBuffer(ctx, ambienceBytes, 'ambience');
    } else {
      warnOnce('ambience', 'ambience track unavailable; running without the bed');
    }
  })();
  return decodePromise;
}

/* ------------------------------------------------------------------ */
/* Context + graph                                                     */
/* ------------------------------------------------------------------ */

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (engine) return engine.ctx;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) {
    warnOnce('context', 'Web Audio is not supported in this browser');
    return null;
  }
  try {
    const ctx = new Ctor({ latencyHint: 'interactive' });
    const master = ctx.createGain();
    master.gain.value = 0;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -3;
    limiter.knee.value = 2;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;
    master.connect(limiter);
    limiter.connect(ctx.destination);

    const sfxBus = ctx.createGain();
    sfxBus.gain.value = 1;
    sfxBus.connect(master);

    const ambBus = ctx.createGain();
    ambBus.gain.value = 1;
    ambBus.connect(master);

    const duck = ctx.createGain();
    duck.gain.value = 1;
    duck.connect(ambBus);

    const ambFade = ctx.createGain();
    ambFade.gain.value = 0;
    ambFade.connect(duck);

    engine = { ctx, master, limiter, sfxBus, ambBus, duck, ambFade };
    ramp(master.gain, soundEnabled ? volume : 0, 0.12, ctx);

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange);
    }
    return ctx;
  } catch (err) {
    warnOnce('context', 'could not create an AudioContext', err);
    return null;
  }
}

function onVisibilityChange(): void {
  if (!engine) return;
  const ctx = engine.ctx;
  try {
    if (document.hidden) {
      if (ctx.state === 'running') void ctx.suspend();
    } else if (ctx.state === 'suspended') {
      void ctx.resume();
    }
  } catch (err) {
    warnOnce('visibility', 'could not suspend/resume audio', err);
  }
}

/* ------------------------------------------------------------------ */
/* Ambience bed                                                        */
/* ------------------------------------------------------------------ */

function startAmbience(fadeSec = 3): void {
  const ctx = engine?.ctx;
  if (!ctx || !engine) return;
  if (!ambienceBuffer) return;
  if (!ambienceNode) {
    try {
      const source = ctx.createBufferSource();
      source.buffer = ambienceBuffer;
      source.loop = true;
      source.connect(engine.ambFade);
      source.start();
      ambienceNode = source;
    } catch (err) {
      warnOnce('ambience', 'could not start the ambience bed', err);
      return;
    }
  }
  ramp(engine.ambFade.gain, 1, fadeSec, ctx);
}

function fadeAmbienceOut(seconds = 0.8): void {
  const ctx = engine?.ctx;
  if (!ctx || !engine || !ambienceNode) return;
  ramp(engine.ambFade.gain, 0, seconds, ctx);
  const node = ambienceNode;
  ambienceNode = null;
  const stopAt = ctx.currentTime + seconds + 0.05;
  try {
    node.stop(stopAt);
  } catch {
    /* already stopped */
  }
}

function duckAmbience(level: number, seconds: number): void {
  const ctx = engine?.ctx;
  if (!ctx || !engine) return;
  ramp(engine.duck.gain, level, seconds, ctx);
}

function restoreAmbience(atSec = 0, seconds = 1.6): void {
  const ctx = engine?.ctx;
  if (!ctx || !engine) return;
  const param = engine.duck.gain;
  const start = Math.max(ctx.currentTime, atSec);
  try {
    param.cancelScheduledValues(ctx.currentTime);
    param.setValueAtTime(param.value, ctx.currentTime);
    param.setValueAtTime(param.value, Math.max(ctx.currentTime, start - 0.05));
    param.linearRampToValueAtTime(1, start + seconds);
  } catch {
    param.value = 1;
  }
}

/* ------------------------------------------------------------------ */
/* One-shot playback                                                   */
/* ------------------------------------------------------------------ */

function resolveVoice(base: string): { name: string; rate: number } | null {
  if (!VARIANT_GROUPS.has(base)) return { name: base, rate: 1 };
  const names: string[] = [];
  for (let i = 1; i <= 3; i++) {
    const candidate = `${base}_${i}`;
    if (spriteTable[candidate]) names.push(candidate);
  }
  if (!names.length) return null;
  const previous = lastVariant.get(base) ?? -1;
  let index = Math.floor(Math.random() * names.length);
  if (names.length > 1 && index === previous) index = (index + 1) % names.length;
  lastVariant.set(base, index);
  const rate = TONAL.has(base) ? 1 : 1 + (Math.random() * 2 - 1) * 0.04;
  return { name: names[index], rate };
}

function scheduleStop(seconds: number, fn: () => void): void {
  if (typeof window === 'undefined') return;
  const id = window.setTimeout(() => {
    scheduledTimers = scheduledTimers.filter((t) => t !== id);
    fn();
  }, Math.max(0, seconds * 1000));
  scheduledTimers.push(id);
}

function clearScheduled(): void {
  if (typeof window === 'undefined') return;
  for (const id of scheduledTimers) window.clearTimeout(id);
  scheduledTimers = [];
}

function playSample(
  base: string,
  options: { gain?: number; when?: number; rate?: number } = {}
): AudioBufferSourceNode | null {
  const ctx = engine?.ctx;
  if (!ctx || !spriteBuffer) return null;
  const voice = resolveVoice(base);
  if (!voice) return null;
  const slice = spriteTable[voice.name];
  if (!slice) return null;

  const [startMs, durMs] = slice;
  const start = Math.max(0, startMs) / 1000;
  const duration = Math.max(0.02, durMs / 1000);
  const rate = options.rate ?? voice.rate;
  const gainValue = (options.gain ?? 1) * (TRIM[base] ?? 1);
  const at = Math.max(ctx.currentTime, options.when ?? ctx.currentTime);

  try {
    const source = ctx.createBufferSource();
    source.buffer = spriteBuffer;
    source.playbackRate.value = rate;
    const gain = ctx.createGain();
    // 3 ms in / 8 ms out: kills the slice edges without softening the attack.
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(gainValue, at + 0.003);
    gain.gain.setValueAtTime(gainValue, at + Math.max(0.004, duration - 0.008));
    gain.gain.linearRampToValueAtTime(0, at + duration);
    source.connect(gain);
    gain.connect(engine!.sfxBus);
    source.start(at, start, duration);
    const tracked: ActiveVoice = { source, gain };
    activeVoices.push(tracked);
    source.onended = () => {
      activeVoices = activeVoices.filter((v) => v !== tracked);
      try {
        gain.disconnect();
        source.disconnect();
      } catch {
        /* already detached */
      }
    };
    return source;
  } catch (err) {
    warnOnce(`play:${base}`, `could not play "${base}"`, err);
    return null;
  }
}

function stopVoices(): void {
  for (const voice of activeVoices) {
    try {
      voice.source.stop();
    } catch {
      /* not started yet */
    }
    try {
      voice.gain.disconnect();
      voice.source.disconnect();
    } catch {
      /* already detached */
    }
  }
  activeVoices = [];
}

/* ------------------------------------------------------------------ */
/* Tram rumble (the one procedural cue)                                */
/* ------------------------------------------------------------------ */

function getBrownNoise(ctx: AudioContext): AudioBuffer {
  if (brownBuffer) return brownBuffer;
  const seconds = 2;
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.2;
  }
  // normalise, then crossfade the ends so the loop point is inaudible
  let peak = 0;
  for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(data[i]));
  const g = peak > 0 ? 0.9 / peak : 1;
  const fade = Math.floor(ctx.sampleRate * 0.05);
  for (let i = 0; i < length; i++) data[i] *= g;
  for (let i = 0; i < fade; i++) {
    const w = i / fade;
    const head = data[i];
    const tail = data[length - fade + i];
    data[i] = head * w + tail * (1 - w);
  }
  brownBuffer = buffer;
  return buffer;
}

function startRumble(startAt: number, approachSec: number, heavy: boolean): void {
  const ctx = engine?.ctx;
  if (!ctx || !engine) return;
  stopRumble(0.02);
  const duration = Math.max(0.5, approachSec);
  try {
    const source = ctx.createBufferSource();
    source.buffer = getBrownNoise(ctx);
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.9;
    filter.frequency.setValueAtTime(80, startAt);
    filter.frequency.exponentialRampToValueAtTime(380, startAt + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(heavy ? 0.5 : 0.42, startAt + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(engine.sfxBus);
    source.start(startAt);
    rumble = { source, filter, gain };
  } catch (err) {
    warnOnce('rumble', 'could not start the tram rumble', err);
    return;
  }

  // Rail joints: clacks with a shrinking interval and rising gain.
  let at = startAt + 0.55;
  let interval = 0.55;
  let index = 0;
  while (at < startAt + duration) {
    playSample('clack', { when: at, gain: 0.2 + Math.min(0.35, index * 0.035) });
    interval = Math.max(0.16, interval * 0.86);
    at += interval;
    index++;
  }
}

function stopRumble(fadeSec = 0.04): void {
  const ctx = engine?.ctx;
  if (!ctx || !rumble) return;
  const { source, gain } = rumble;
  rumble = null;
  try {
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + fadeSec);
    source.stop(now + fadeSec + 0.02);
  } catch {
    try {
      source.stop();
    } catch {
      /* already stopped */
    }
  }
}

/* ------------------------------------------------------------------ */
/* Public transport controls                                           */
/* ------------------------------------------------------------------ */

/**
 * Must be called synchronously inside a user gesture. Creates the context,
 * decodes the pack and fades the ambience in; resolves once SFX are ready.
 */
export function unlockAudio(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  const ctx = ensureContext();
  if (!ctx) return Promise.resolve();
  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => warnOnce('resume', 'could not resume the AudioContext'));
  }
  return ensureDecoded(ctx)
    .then(() => {
      startAmbience(3);
      const queue = pendingCues;
      pendingCues = [];
      for (const cue of queue) {
        try {
          cue();
        } catch {
          /* ignore */
        }
      }
    })
    .catch((err) => {
      warnOnce('unlock', 'audio failed to initialise; continuing silently', err);
    });
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  persist(STORAGE_ENABLED, String(enabled));
  if (!engine) return;
  if (enabled) {
    if (engine.ctx.state === 'suspended') void engine.ctx.resume();
    startAmbience(1.2);
  }
  ramp(engine.master.gain, enabled ? volume : 0, 0.18, engine.ctx);
}

export function getSoundEnabled(): boolean {
  return soundEnabled;
}

export function setVolume(next: number): void {
  if (!Number.isFinite(next)) return;
  volume = Math.min(1, Math.max(0, next));
  persist(STORAGE_VOLUME, String(volume));
  if (engine && soundEnabled) ramp(engine.master.gain, volume, 0.15, engine.ctx);
}

export function getVolume(): number {
  return volume;
}

/* ------------------------------------------------------------------ */
/* Cues                                                                */
/* ------------------------------------------------------------------ */

function whenReady(fn: () => void): void {
  if (spriteBuffer) {
    fn();
    return;
  }
  // Start click may beat the decode by a few dozen ms: remember it, don't drop it.
  pendingCues.push(fn);
  if (pendingCues.length > 4) pendingCues.shift();
}

export function playPress(): void {
  whenReady(() => playSample('press', { gain: 1 }));
}

export function playSwitch(): void {
  whenReady(() => playSample('switch', { gain: 1 }));
}

export function playPaper(): void {
  whenReady(() => playSample('paper', { gain: 1 }));
}

export function playHoverTick(): void {
  if (!hasHover()) return;
  whenReady(() => playSample('hover', { gain: 0.7 }));
}

export function playBell(): void {
  whenReady(() => playSample('bell', { gain: 1 }));
}

export function playStamp(): void {
  whenReady(() => playSample('stamp', { gain: 1 }));
}

/**
 * Commit to a route: mechanical lever + bell, or brakes + an ominous drone.
 * `approachSec` is the real animation length, so the rumble peaks exactly when
 * the trolley hits.
 */
export function playDecision(pulled: boolean, approachSec = 1.65): void {
  const ctx = engine?.ctx;
  if (!ctx) {
    // Still unlock-driven: if the context is missing there is nothing to play.
    return;
  }
  whenReady(() => {
    clearScheduled();
    stopRumble(0.02);
    stopVoices();
    duckAmbience(0.35, 0.25);
    const at = ctx.currentTime + 0.02;
    if (pulled) {
      playSample('lever_clack', { when: at, gain: 1 });
      playSample('bell', { when: at + 0.28, gain: 1 });
    } else {
      playSample('air_brake', { when: at, gain: 1 });
      playSample('brake_squeal', { when: at + 0.15, gain: 0.85 });
      playSample('drone', { when: at + 0.05, gain: 1 });
    }
    startRumble(at, Math.max(0.5, approachSec), pulled);
  });
}

/**
 * Impact + stamp + verdict sting, scheduled from the audio clock.
 * Returns the ms until the stamp so the UI can reveal the result on it.
 */
export function playImpact(options: ImpactOptions = {}): number {
  const ctx = engine?.ctx;
  if (!ctx) return AUDIO_TIMING.msUntilStamp;
  const { mood = 'dread', comic = false } = options;
  whenReady(() => {
    clearScheduled();
    stopRumble(0.05);
    duckAmbience(0.04, 0.08);
    const now = ctx.currentTime;
    const impactAt = now + AUDIO_TIMING.silenceBeatSec;
    playSample(comic ? 'crash_comic' : 'impact_muffled', { when: impactAt, gain: 1 });
    const stampAt = impactAt + AUDIO_TIMING.stampAfterImpactSec;
    playSample('stamp', { when: stampAt, gain: 1 });
    const stingAt = impactAt + AUDIO_TIMING.stingAfterImpactSec;
    playSample(`sting_${mood}`, { when: stingAt, gain: 1 });
    restoreAmbience(stingAt + 0.25, 2);
  });
  return AUDIO_TIMING.msUntilStamp;
}

/** Cancel everything in flight, restore the room tone. */
export function stopAllCues(): void {
  try {
    clearScheduled();
    stopRumble(0.08);
    stopVoices();
    pendingCues = [];
    restoreAmbience(0, 0.6);
  } catch (err) {
    warnOnce('stop', 'could not stop all cues', err);
  }
}

/** Summary screen: stamp, then a relief sting. */
export function playSummaryReveal(): void {
  const ctx = engine?.ctx;
  if (!ctx) return;
  whenReady(() => {
    const at = ctx.currentTime + 0.05;
    playSample('stamp', { when: at, gain: 1 });
    playSample('sting_relief', { when: at + 0.45, gain: 1 });
  });
}

/* ------------------------------------------------------------------ */
/* Legacy aliases                                                      */
/*                                                                     */
/* Kept so no component has to change at once. They map onto the sample */
/* vocabulary above; the two that used to duplicate the stamp/sting are */
/* deliberate no-ops.                                                  */
/* ------------------------------------------------------------------ */

export const startMusicBed = (): void => {
  if (engine && spriteBuffer) startAmbience(3);
};

export const stopMusicBed = (): void => {
  fadeAmbienceOut(0.8);
};

export const duckMusicBed = (duck: boolean): void => {
  duckAmbience(duck ? 0.35 : 1, 0.3);
};

export const playLeverSnap = (): void => {
  playSwitch();
};

export const playTinyClick = (): void => {
  playSwitch();
};

export const playDecisionWhoosh = (): void => {
  playSwitch();
};

export const playPaperSwish = (): void => {
  playPaper();
};

export const playPremiumTransition = (): void => {
  playPaper();
};

export const playPencilScratch = (): void => {
  playPaper();
};

export const playSoftTick = (_step?: number): void => {
  playPress();
};

export const playSonicSignatureMotif = (): void => {
  playPress();
};

/** Replaced by the ink stamp + verdict sting. */
export const playRevealChime = (_intensity?: number): void => {};

/** Replaced by the impact layers in `playImpact`. */
export const playFoilSweep = (): void => {};

/** TrolleyCanvas calls this every frame after p >= 0.9; the impact handles it. */
export const playRisingSweep = (): void => {};

/** TrolleyCanvas calls this on impact; `playImpact` owns that moment. */
export const playLowThump = (): void => {};

export const playChordSwell = (): void => {};
