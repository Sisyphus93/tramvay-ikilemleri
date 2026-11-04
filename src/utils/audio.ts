/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Sample-based foley engine for "Absürt Tramvay İkilemleri".
 *
 * The world is a printed dossier: paper, ink, steel, old Istanbul tram.
 * This engine plays ONLY pre-rendered samples from public/audio/ (a single
 * SFX sprite + a seamless ambience loop), generated procedurally by
 * scripts/generate-audio.mjs. No oscillator tones, no synth bleeps.
 *
 * Hard rules honored here:
 *  - No AudioContext exists before unlockAudio() (called synchronously inside
 *    the first user gesture — "İkilemlere Başla" / Enter / Space).
 *  - The game never crashes because of audio: every public function is
 *    fail-silent, missing/undecodable files (including SPA-fallback HTML
 *    served for absent /audio/* paths) produce at most one console.warn each.
 *  - Mute state persists in `tramvay_sound_enabled` (App.tsx owns the M key;
 *    this module adds no keyboard listeners). Volume persists in
 *    `tramvay_volume` (default 0.7 — this is played on stream).
 *
 * Gain graph:
 *   sfx slices ─────────────► sfxBus ─┐
 *   ambience loop ► ambBus ► duckGain ┴► master ► limiter ► destination
 *
 * The old oscillator engine is preserved (unimported) in ./audio.synth.ts.
 */

export type Mood = 'relief' | 'dread' | 'absurd';

/* =========================================================================
 * Named timing constants (seconds)
 * ========================================================================= */

/** Near-silent beat between the impact hit and the ink stamp. */
export const SILENCE_BEAT_SEC = 0.08;
/** Ink stamp lands this long after the impact hit starts. */
export const STAMP_AFTER_IMPACT_SEC = 0.3;
/** Mood sting starts this long after the stamp. */
export const STING_AFTER_STAMP_SEC = 0.4;
/** Ambience fade-in after unlock. */
export const AMBIENCE_FADEIN_SEC = 3;
/** Ambience restore ramp after the sting begins (spec: 1–3 s). */
export const AMBIENCE_RESTORE_SEC = 2;
/** Ambience duck level while a decision plays out (35 %). */
export const DUCK_DECISION = 0.35;
/** Ambience duck level for the impact silence beat (almost zero). */
export const DUCK_IMPACT = 0.02;

/* =========================================================================
 * Module state
 * ========================================================================= */

interface AudioManifest {
  sampleRate?: number;
  formats?: string[];
  sprite: Record<string, [number, number]>;
}

interface ActiveVoice {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

interface PendingPlay {
  name: string;
  opts: PlayOptions;
  at: number; // performance.now() when queued
}

interface PlayOptions {
  gain?: number;
  /** Absolute AudioContext time; defaults to "now". */
  when?: number;
  rate?: number;
  /** Tonal sounds skip playback-rate jitter. */
  tonal?: boolean;
}

const KEY_ENABLED = 'tramvay_sound_enabled';
const KEY_VOLUME = 'tramvay_volume';
const DEFAULT_VOLUME = 0.7;

const VARIANT_GROUPS: Record<string, string[]> = {
  hover: ['hover_1', 'hover_2', 'hover_3'],
  switch: ['switch_1', 'switch_2'],
  paper: ['paper_1', 'paper_2', 'paper_3'],
  lever_clack: ['lever_clack_1', 'lever_clack_2'],
  clack: ['clack_1', 'clack_2', 'clack_3'],
  impact_muffled: ['impact_muffled_1', 'impact_muffled_2'],
  stamp: ['stamp_1', 'stamp_2'],
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let limiter: DynamicsCompressorNode | null = null;
let sfxBus: GainNode | null = null;
let ambBus: GainNode | null = null;
let duckGain: GainNode | null = null;

let manifest: AudioManifest | null = null;
let spriteBuffer: AudioBuffer | null = null;
let ambBuffer: AudioBuffer | null = null;
let ambSource: AudioBufferSourceNode | null = null;

let manifestPromise: Promise<AudioManifest | null> | null = null;
let bytesPromise: Promise<Record<string, ArrayBuffer | null>> | null = null;
let readyPromise: Promise<void> | null = null;
/** Set when the sprite could not be loaded/decoded — everything stays silent. */
let sfxFailed = false;

const activeVoices = new Set<ActiveVoice>();
const pendingPlays: PendingPlay[] = [];
const lastVariant: Record<string, string> = {};
const warnedKeys = new Set<string>();

let hoverCapable: boolean | null = null;

let soundEnabled = true;
let volume = DEFAULT_VOLUME;

interface RumbleState {
  source: AudioBufferSourceNode;
  filter: BiquadFilterNode;
  gain: GainNode;
}
let rumble: RumbleState | null = null;
let brownBuffer: AudioBuffer | null = null;

/* =========================================================================
 * Small helpers — everything fail-silent
 * ========================================================================= */

function warnOnce(key: string, message: string): void {
  if (warnedKeys.has(key)) return;
  warnedKeys.add(key);
  try {
    console.warn(message);
  } catch {
    // ignore
  }
}

function errText(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function readStoredEnabled(): boolean {
  try {
    const saved = localStorage.getItem(KEY_ENABLED);
    if (saved !== null) return saved === 'true';
  } catch {
    // ignore
  }
  return true;
}

function readStoredVolume(): number {
  try {
    const saved = localStorage.getItem(KEY_VOLUME);
    if (saved !== null) {
      const v = Number.parseFloat(saved);
      if (Number.isFinite(v)) return Math.min(1, Math.max(0, v));
    }
  } catch {
    // ignore
  }
  return DEFAULT_VOLUME;
}

function persist(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function isTonal(sliceName: string): boolean {
  return sliceName === 'bell' || sliceName === 'drone' || sliceName.startsWith('sting_');
}

/** Group base name: "hover_2" → "hover". */
function baseName(sliceName: string): string {
  return sliceName.replace(/_\d+$/, '');
}

/* =========================================================================
 * Loading: manifest + bytes (SPA-fallback safe), decode
 * ========================================================================= */

const MAGIC_CHECKS: Record<string, (b: Uint8Array) => boolean> = {
  wav: (b) => b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x41 && b[10] === 0x56 && b[11] === 0x45, // RIFF....WAVE
  ogg: (b) => b.length >= 4 && b[0] === 0x4f && b[1] === 0x67 && b[2] === 0x67 && b[3] === 0x53, // OggS
  m4a: (b) => b.length >= 8 && b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70, // ....ftyp
};

const MIME_BY_FORMAT: Record<string, string> = {
  ogg: 'audio/ogg; codecs="vorbis"',
  m4a: 'audio/mp4; codecs="mp4a.40.2"',
  wav: 'audio/wav',
};

function pickFormat(formats: string[] | undefined): string {
  const order = formats && formats.length ? formats : ['ogg', 'm4a', 'wav'];
  try {
    if (typeof document !== 'undefined') {
      const probe = document.createElement('audio');
      for (const f of order) {
        const mime = MIME_BY_FORMAT[f];
        if (mime && probe.canPlayType(mime) !== '') return f;
      }
    }
  } catch {
    // ignore
  }
  return 'wav'; // last resort: everything decodes WAV
}

function loadManifest(): Promise<AudioManifest | null> {
  if (!manifestPromise) {
    manifestPromise = (async () => {
      try {
        const res = await fetch('/audio/sfx.json', { cache: 'force-cache' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const parsed = JSON.parse(await res.text()) as AudioManifest;
        if (!parsed || typeof parsed !== 'object' || !parsed.sprite) {
          throw new Error('malformed manifest');
        }
        manifest = parsed;
        return parsed;
      } catch (err) {
        // A missing file may come back as index.html with HTTP 200 (SPA
        // fallback); JSON.parse then throws. Either way: run silently.
        warnOnce('sfx.json', `[audio] /audio/sfx.json unavailable (${errText(err)}) — the game will run silently.`);
        return null;
      }
    })();
  }
  return manifestPromise;
}

async function fetchAudioBytes(file: string, fmt: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(`/audio/${file}.${fmt}`, { cache: 'force-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const bytes = await res.arrayBuffer();
    const check = MAGIC_CHECKS[fmt];
    if (check && !check(new Uint8Array(bytes.slice(0, 12)))) {
      // SPA fallback served HTML (or something else) with HTTP 200.
      throw new Error('not audio data (SPA fallback?)');
    }
    return bytes;
  } catch (err) {
    warnOnce(`${file}.${fmt}`, `[audio] /audio/${file}.${fmt} unavailable (${errText(err)}) — related sounds stay silent.`);
    return null;
  }
}

/** Kick off manifest + byte fetches once (idempotent). */
function ensureBytes(): Promise<Record<string, ArrayBuffer | null>> {
  if (!bytesPromise) {
    bytesPromise = loadManifest().then(async (m) => {
      const fmt = pickFormat(m?.formats);
      const [sfx, amb] = await Promise.all([
        m ? fetchAudioBytes('sfx', fmt) : Promise.resolve(null),
        m ? fetchAudioBytes('ambience', fmt) : Promise.resolve(null),
      ]);
      return { sfx, amb };
    });
  }
  return bytesPromise;
}

/**
 * Prefetch manifest + audio bytes on page load. Creates NO AudioContext
 * (autoplay policy: the context is created inside the first user gesture).
 */
export function preloadAudio(): void {
  try {
    if (typeof window === 'undefined') return;
    soundEnabled = readStoredEnabled();
    volume = readStoredVolume();
    void ensureBytes();
  } catch {
    // ignore
  }
}

/* =========================================================================
 * Graph
 * ========================================================================= */

function buildGraph(c: AudioContext): void {
  master = c.createGain();
  master.gain.value = soundEnabled ? volume : 0;

  limiter = c.createDynamicsCompressor();
  limiter.threshold.value = -3;
  limiter.knee.value = 0;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.15;

  sfxBus = c.createGain();
  sfxBus.gain.value = 1;

  duckGain = c.createGain();
  duckGain.gain.value = 1;

  ambBus = c.createGain();
  ambBus.gain.value = 0.0001;

  sfxBus.connect(master);
  ambBus.connect(duckGain);
  duckGain.connect(master);
  master.connect(limiter);
  limiter.connect(c.destination);
}

function applyMasterGain(smooth: boolean): void {
  if (!ctx || !master) return;
  const t = ctx.currentTime;
  const target = soundEnabled ? volume : 0;
  try {
    master.gain.cancelScheduledValues(t);
    if (smooth) {
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(target, t + 0.2);
    } else {
      master.gain.value = target;
    }
  } catch {
    try {
      master.gain.value = target;
    } catch {
      // ignore
    }
  }
}

function onVisibilityChange(): void {
  try {
    if (!ctx) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      if (ctx.state === 'running') void ctx.suspend().catch(() => undefined);
    } else if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => undefined);
    }
  } catch {
    // ignore
  }
}

/**
 * Create the AudioContext and start decoding. MUST be called synchronously
 * inside a user gesture (the "İkilemlere Başla" click or Enter/Space).
 * Resolves when the SFX sprite is ready; the ambience keeps loading in the
 * background and fades in over ~3 s once decoded. Never rejects.
 */
export function unlockAudio(): Promise<void> {
  try {
    if (typeof window === 'undefined') return Promise.resolve();
    if (!ctx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {
        warnOnce('ctx', '[audio] Web Audio API unavailable — the game will run silently.');
        return Promise.resolve();
      }
      soundEnabled = readStoredEnabled();
      volume = readStoredVolume();
      ctx = new AudioContextClass();
      buildGraph(ctx);
      try {
        document.addEventListener('visibilitychange', onVisibilityChange);
      } catch {
        // ignore
      }
    }
    if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
    if (!readyPromise) readyPromise = initAudio();
    return readyPromise;
  } catch (err) {
    warnOnce('unlock', `[audio] unlock failed (${errText(err)}) — the game will run silently.`);
    return Promise.resolve();
  }
}

async function initAudio(): Promise<void> {
  try {
    const m = await loadManifest();
    const bytes = await ensureBytes();
    if (!ctx || !m || !bytes.sfx) {
      sfxFailed = true;
      pendingPlays.length = 0;
      if (m) void initAmbience(bytes.amb);
      return;
    }
    try {
      // slice(0): decodeAudioData detaches the buffer; keep ours reusable.
      spriteBuffer = await ctx.decodeAudioData(bytes.sfx.slice(0));
    } catch (err) {
      warnOnce('decode-sfx', `[audio] could not decode the SFX sprite (${errText(err)}) — SFX stay silent.`);
      spriteBuffer = null;
      sfxFailed = true;
      pendingPlays.length = 0;
    }
    if (spriteBuffer) flushPending();
    void initAmbience(bytes.amb);
  } catch (err) {
    warnOnce('init', `[audio] init failed (${errText(err)}) — the game will run silently.`);
    sfxFailed = true;
    pendingPlays.length = 0;
  }
}

async function initAmbience(bytes: ArrayBuffer | null): Promise<void> {
  try {
    if (!bytes || !ctx) return;
    try {
      ambBuffer = await ctx.decodeAudioData(bytes.slice(0));
    } catch (err) {
      warnOnce('decode-ambience', `[audio] could not decode the ambience loop (${errText(err)}) — no room tone.`);
      return;
    }
    startAmbience();
  } catch {
    // ignore
  }
}

function startAmbience(): void {
  try {
    if (!ctx || !ambBuffer || !ambBus || ambSource) return;
    const src = ctx.createBufferSource();
    src.buffer = ambBuffer;
    src.loop = true;
    src.connect(ambBus);
    const t = ctx.currentTime;
    ambBus.gain.cancelScheduledValues(t);
    ambBus.gain.setValueAtTime(0.0001, t);
    ambBus.gain.linearRampToValueAtTime(1, t + AMBIENCE_FADEIN_SEC);
    src.start(t);
    ambSource = src;
  } catch {
    // ignore
  }
}

/* =========================================================================
 * Slice playback (variants, jitter, fades, pending queue)
 * ========================================================================= */

function pickVariant(name: string): string {
  const group = VARIANT_GROUPS[name];
  if (!group || !manifest) return name;
  const avail = group.filter((g) => Boolean(manifest && manifest.sprite[g]));
  if (avail.length === 0) return name;
  if (avail.length === 1) {
    lastVariant[name] = avail[0];
    return avail[0];
  }
  let choice = avail[Math.floor(Math.random() * avail.length)];
  if (choice === lastVariant[name]) {
    const others = avail.filter((a) => a !== lastVariant[name]);
    choice = others[Math.floor(Math.random() * others.length)];
  }
  lastVariant[name] = choice;
  return choice;
}

function flushPending(): void {
  if (pendingPlays.length === 0) return;
  const queued = pendingPlays.splice(0, pendingPlays.length);
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  for (const item of queued) {
    if (now - item.at < 1200) playSlice(item.name, item.opts); // drop stale requests
  }
}

function trackVoice(voice: ActiveVoice): void {
  activeVoices.add(voice);
  voice.source.onended = () => {
    activeVoices.delete(voice);
    try {
      voice.source.disconnect();
      voice.gain.disconnect();
    } catch {
      // ignore
    }
  };
}

function stopVoice(voice: ActiveVoice, t: number, fadeSec: number): void {
  try {
    voice.gain.gain.cancelScheduledValues(t);
    voice.gain.gain.setValueAtTime(Math.max(voice.gain.gain.value, 0.0001), t);
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, t + fadeSec);
    voice.source.stop(t + fadeSec + 0.02);
  } catch {
    try {
      voice.source.stop();
    } catch {
      // ignore
    }
  }
}

/**
 * Core sample trigger. Plays one sprite slice through the SFX bus with a
 * micro fade-in/out (click-free) and ±4 % rate jitter for non-tonal sounds.
 * Requests made before the sprite finishes decoding are queued briefly.
 */
function playSlice(name: string, opts: PlayOptions = {}): void {
  try {
    if (!soundEnabled || sfxFailed) return;
    if (!ctx || !spriteBuffer || !manifest || !sfxBus) {
      // Queue only while an unlock is actually in flight.
      if (readyPromise && pendingPlays.length < 12) {
        pendingPlays.push({ name, opts, at: typeof performance !== 'undefined' ? performance.now() : Date.now() });
      }
      return;
    }
    const slice = pickVariant(name);
    const spec = manifest.sprite[slice];
    if (!spec) {
      warnOnce(`slice:${slice}`, `[audio] sample "${slice}" is missing from the sprite — skipped.`);
      return;
    }
    const [startMs, durMs] = spec;
    const t = ctx.currentTime;
    const t0 = Math.max(t + 0.004, opts.when ?? t + 0.004);
    const jitter = opts.tonal || isTonal(slice) ? 1 : 1 + (Math.random() * 0.08 - 0.04);
    const rate = Math.min(2, Math.max(0.5, (opts.rate ?? 1) * jitter));
    const dur = Math.max(0.01, durMs / 1000 / rate);
    const gainLevel = Math.max(0.0001, opts.gain ?? 1);
    const fade = Math.min(0.01, dur / 4);

    const source = ctx.createBufferSource();
    source.buffer = spriteBuffer;
    source.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gainLevel, t0 + Math.min(0.004, fade));
    g.gain.setValueAtTime(gainLevel, t0 + Math.max(0.005, dur - fade));
    g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    source.connect(g);
    g.connect(sfxBus);
    source.start(t0, startMs / 1000, durMs / 1000 + 0.01);
    source.stop(t0 + dur + 0.03); // hard guard: never bleed into the next slice
    trackVoice({ source, gain: g });
  } catch {
    // audio must never crash the game
  }
}

/* =========================================================================
 * Tram rumble — procedural brown noise (the one runtime-synthesized layer)
 * ========================================================================= */

function getBrownNoise(c: AudioContext): AudioBuffer {
  if (brownBuffer) return brownBuffer;
  const len = Math.floor(c.sampleRate * 2);
  const b = c.createBuffer(1, len, c.sampleRate);
  const d = b.getChannelData(0);
  // deterministic xorshift so the rumble texture is stable across sessions
  let seed = 0x2545f491;
  const rnd32 = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return ((seed >>> 0) / 4294967296) * 2 - 1;
  };
  let last = 0;
  let peak = 0;
  for (let i = 0; i < len; i++) {
    last = (last + 0.02 * rnd32()) / 1.02;
    d[i] = last;
    peak = Math.max(peak, Math.abs(last));
  }
  const norm = peak > 0 ? 0.9 / peak : 1;
  let dc = 0;
  const a = 1 - Math.exp((-2 * Math.PI * 8) / c.sampleRate); // DC block
  for (let i = 0; i < len; i++) {
    d[i] *= norm;
    dc += a * (d[i] - dc);
    d[i] -= dc;
  }
  brownBuffer = b;
  return b;
}

function startRumble(approachSec: number): void {
  if (!ctx || !sfxBus) return;
  stopRumble(0.02);
  try {
    const c = ctx;
    const dur = Math.max(0.3, approachSec);
    const src = c.createBufferSource();
    src.buffer = getBrownNoise(c);
    src.loop = true;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.9;
    const g = c.createGain();
    const t = c.currentTime;
    filter.frequency.setValueAtTime(80, t);
    filter.frequency.exponentialRampToValueAtTime(380, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.4, t + Math.min(0.3, dur * 0.25));
    g.gain.exponentialRampToValueAtTime(0.8, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(sfxBus);
    src.start(t);
    rumble = { source: src, filter, gain: g };

    // Rail-joint clacks with a shrinking interval (550 ms × 0.86, floor
    // 160 ms) and rising gain — scaled down for short (reduced-motion) runs.
    let interval = Math.min(0.55, dur * 0.33);
    let at = interval;
    let idx = 0;
    while (at < dur - 0.04 && idx < 12) {
      playSlice('clack', { when: t + at, gain: 0.45 + 0.55 * (at / dur) });
      interval = Math.max(0.16, interval * 0.86);
      at += interval;
      idx += 1;
    }
  } catch {
    // ignore
  }
}

function stopRumble(fadeSec = 0.06): void {
  const r = rumble;
  rumble = null;
  if (!r || !ctx) return;
  try {
    const t = ctx.currentTime;
    r.gain.gain.cancelScheduledValues(t);
    r.gain.gain.setValueAtTime(Math.max(r.gain.gain.value, 0.0001), t);
    r.gain.gain.exponentialRampToValueAtTime(0.0001, t + fadeSec);
    r.source.stop(t + fadeSec + 0.03);
  } catch {
    try {
      r.source.stop();
    } catch {
      // ignore
    }
  }
}

function setDuck(target: number, rampSec: number): void {
  if (!ctx || !duckGain) return;
  try {
    const t = ctx.currentTime;
    duckGain.gain.cancelScheduledValues(t);
    duckGain.gain.setValueAtTime(duckGain.gain.value, t);
    duckGain.gain.linearRampToValueAtTime(target, t + rampSec);
  } catch {
    // ignore
  }
}

/* =========================================================================
 * Public game cues
 * ========================================================================= */

/** Muted press for primary buttons. */
export function playPress(): void {
  playSlice('press', { gain: 0.9 });
}

/** Light mechanical click for toggles (lever staging, sound-on). */
export function playSwitch(): void {
  playSlice('switch', { gain: 0.55 });
}

/** Cardstock transition (next dilemma, restart). */
export function playPaper(): void {
  playSlice('paper', { gain: 0.8 });
}

/** Subliminal hover tick — only on hover-capable pointers, low gain. */
export function playHoverTick(): void {
  try {
    if (!soundEnabled) return;
    if (hoverCapable === null) {
      hoverCapable =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(hover: hover)').matches;
    }
    if (!hoverCapable) return;
    playSlice('hover', { gain: 0.16 });
  } catch {
    // ignore
  }
}

/**
 * Decision committed. Ducks the room, plays the lever/brake gesture, then
 * runs the tram in: procedural brown-noise rumble (lowpass 80→380 Hz) with
 * accelerating rail-joint clacks for `approachSec`.
 */
export function playDecision(pulled: boolean, approachSec: number): void {
  try {
    if (!ctx || !soundEnabled) return;
    // Without a decoded sprite the whole cue (including the procedural
    // rumble) stays silent — a half-working soundscape is worse than none.
    if (!spriteBuffer) return;
    const t = ctx.currentTime;
    setDuck(DUCK_DECISION, 0.25);
    if (pulled) {
      playSlice('lever_clack', { when: t + 0.005, gain: 1.0 });
      playSlice('bell', { when: t + 0.285, gain: 0.6, tonal: true });
    } else {
      playSlice('air_brake', { when: t + 0.005, gain: 0.9 });
      playSlice('brake_squeal', { when: t + 0.155, gain: 0.45 });
      playSlice('drone', { when: t + 0.02, gain: 0.26, tonal: true });
    }
    startRumble(approachSec);
  } catch {
    // ignore
  }
}

/**
 * Tram has hit. Cuts the rumble, drops the room to a silence beat, then:
 * impact → ink stamp (+300 ms) → mood sting (+400 ms) → ambience restored.
 * Returns the number of milliseconds from now until the stamp lands — the
 * caller uses it to reveal the result screen exactly on the stamp.
 */
export function playImpact(options: { mood: Mood; comic?: boolean }): number {
  const msUntilStamp = Math.round((SILENCE_BEAT_SEC + STAMP_AFTER_IMPACT_SEC) * 1000);
  try {
    if (!ctx || !soundEnabled || !spriteBuffer) return msUntilStamp;
    const t = ctx.currentTime;
    stopRumble(0.05);
    const stingAt = SILENCE_BEAT_SEC + STAMP_AFTER_IMPACT_SEC + STING_AFTER_STAMP_SEC;
    if (duckGain) {
      duckGain.gain.cancelScheduledValues(t);
      duckGain.gain.setValueAtTime(duckGain.gain.value, t);
      duckGain.gain.linearRampToValueAtTime(DUCK_IMPACT, t + SILENCE_BEAT_SEC);
      duckGain.gain.setValueAtTime(DUCK_IMPACT, t + stingAt);
      duckGain.gain.linearRampToValueAtTime(1, t + stingAt + AMBIENCE_RESTORE_SEC);
    }
    playSlice(options.comic ? 'crash_comic' : 'impact_muffled', {
      when: t + SILENCE_BEAT_SEC,
      gain: options.comic ? 0.95 : 1.0,
    });
    playSlice('stamp', { when: t + SILENCE_BEAT_SEC + STAMP_AFTER_IMPACT_SEC, gain: 1.0 });
    playSlice(`sting_${options.mood}`, { when: t + stingAt, gain: 0.72, tonal: true });
  } catch {
    // ignore
  }
  return msUntilStamp;
}

/** Stop every queued/in-flight cue (rumble, clacks, stings) and restore the room. */
export function stopAllCues(): void {
  try {
    pendingPlays.length = 0;
    stopRumble(0.08);
    if (ctx) {
      const t = ctx.currentTime;
      for (const voice of Array.from(activeVoices)) stopVoice(voice, t, 0.03);
      activeVoices.clear();
    }
    setDuck(1, 0.3);
  } catch {
    // ignore
  }
}

/* =========================================================================
 * Settings
 * ========================================================================= */

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  persist(KEY_ENABLED, enabled ? 'true' : 'false');
  if (enabled) {
    // Un-muting inside a suspended context should not start sound by itself;
    // the context is resumed by gestures/visibility handling.
    if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
  }
  applyMasterGain(true);
}

export function getSoundEnabled(): boolean {
  soundEnabled = readStoredEnabled();
  return soundEnabled;
}

export function setVolume(v: number): void {
  volume = Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : DEFAULT_VOLUME;
  persist(KEY_VOLUME, String(volume));
  applyMasterGain(true);
}

export function getVolume(): number {
  return volume;
}

/* =========================================================================
 * Legacy aliases (kept for existing call sites; the dossier kit replaces the
 * old oscillator cues)
 * ========================================================================= */

/** Small UI tick → the mechanical switch click. */
export function playSoftTick(_step = 0): void {
  playSwitch();
}

/** Summary screen payoff: the ink stamp, then the warm relief sting. */
export function playSummaryReveal(): void {
  try {
    if (!ctx) return;
    const t = ctx.currentTime;
    playSlice('stamp', { when: t + 0.005, gain: 1.0 });
    playSlice('sting_relief', { when: t + 0.32, gain: 0.7, tonal: true });
  } catch {
    // ignore
  }
}

export function playLeverSnap(): void {
  playSwitch();
}

export function playTinyClick(): void {
  playSwitch();
}

export function playDecisionWhoosh(): void {
  playPaper();
}

export function playPaperSwish(): void {
  playPaper();
}

export function playPremiumTransition(): void {
  playPaper();
}

export function playPencilScratch(): void {
  playPaper();
}

export function playChordSwell(): void {
  playSlice('sting_relief', { gain: 0.7, tonal: true });
}

/** Intentional no-op: the ink stamp + mood sting replace the reveal chime. */
export function playRevealChime(_intensity = 1): void {
  // silence by design
}

/** Intentional no-op: foil shimmer is gone from the dossier world. */
export function playFoilSweep(): void {
  // silence by design
}

/** Intentional no-op: the ambience loop is the sonic identity now. */
export function playSonicSignatureMotif(): void {
  // silence by design
}

/** Intentional no-op: playDecision() drives the approach (rumble + clacks). */
export function playRisingSweep(): void {
  // silence by design
}

/** Intentional no-op: playImpact() drives the hit. */
export function playLowThump(): void {
  // silence by design
}

/** Intentional no-op: the ambience starts in unlockAudio(). */
export function startMusicBed(): void {
  // silence by design
}

/** Intentional no-op: kept for API parity with the old engine. */
export function stopMusicBed(): void {
  // silence by design
}

/** Duck/restore the ambience loop (parity with the old music bed). */
export function duckMusicBed(duck: boolean): void {
  setDuck(duck ? DUCK_DECISION : 1, 0.3);
}
