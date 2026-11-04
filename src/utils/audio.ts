/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Sample-based audio engine.
 *
 * Sampling only: every cue is a pre-rendered slice of `public/audio/sfx.ogg|m4a|wav`
 * (see `public/audio/README.md`). No oscillators, no synth beeps, no generated
 * tones. The single exception is the tram rumble, which loops a pre-rendered
 * brown-noise bed and sweeps a filter over it at runtime.
 *
 * Graph — one master mute, and a separate user gain per bus so the two
 * controls never fight each other:
 *
 *   sfx bus ──► sfxUserGain ─────────► master ► limiter ► destination
 *   rumble  ──► sfx bus
 *   ambience ► duck ─► ambienceUserGain ─┘
 *
 * Everything is defensive: if a file is missing, returns HTML (SPA fallback) or
 * fails to decode, the game plays silently and logs at most one warning per
 * item. No AudioContext is created before a user gesture.
 */

/* ------------------------------------------------------------------ *
 * Timing constants — tune these by ear
 * ------------------------------------------------------------------ */

export const TIMING = {
  /** dead air between the cut-off rumble and the impact */
  silenceBeat: 0.08,
  /** impact → stamp, in seconds */
  stampAfterImpact: 0.3,
  /** pulled lever: lever_clack → bell */
  bellAfterLever: 0.28,
  /** not pulled: air_brake → brake_squeal */
  squealAfterBrake: 0.15,
  /** ambience fade-in on unlock */
  ambienceFadeIn: 3,
  /** rumble clack interval schedule */
  clackStartInterval: 0.55,
  clackIntervalFactor: 0.86,
  clackMinInterval: 0.16,
  /** rumble lowpass sweep */
  rumbleCutoffStart: 80,
  rumbleCutoffEnd: 380,
  /** relative gains — tune the balance here */
  gainPress: 0.7,
  gainSwitch: 0.6,
  gainPaper: 0.55,
  gainHover: 0.45,
  gainLeverClack: 0.9,
  gainBell: 0.5,
  gainAirBrake: 0.55,
  gainSqueal: 0.32,
  gainDrone: 0.22,
  gainImpact: 1,
  gainComicCrash: 0.85,
  gainStamp: 0.95,
  /** ambience bus level (the buffer itself is mastered to -26 LUFS) */
  ambienceLevel: 0.5,
  /** ducked ambience levels */
  duckDecision: 0.35,
  duckSilence: 0.02,
};

/**
 * ms from the end of the tram animation to the visible result (= the stamp):
 * a short silence beat to clear the air, then the impact, then the stamp.
 * 80 + 300 = 380 ms.
 */
const IMPACT_TO_STAMP_MS = Math.round((TIMING.silenceBeat + TIMING.stampAfterImpact) * 1000);

/* ------------------------------------------------------------------ *
 * Assets
 * ------------------------------------------------------------------ */

const SFX_MAP_URL = '/audio/sfx.json';

interface AudioFormat {
  url: string;
  type: string;
}

/**
 * Candidate order is only a starting preference — `orderFormats` re-ranks it by
 * `canPlayType` and every candidate is tried through fetch *and* decode, so a
 * format that is claimed but undecodable still falls through to the next.
 *
 * The WAV entries are a genuine last resort for a local `npm run audio:build`
 * without ffmpeg, which writes only `sfx.wav` + `ambience.wav`. They are NOT
 * committed, so a deploy never has them: Render's SPA catch-all answers the
 * missing path with index.html and a 200, which `fetchFirstFormat` rejects on
 * the content-type and moves past. Ogg or AAC always wins first in production,
 * so the WAV is never even requested there.
 */
const SFX_FORMATS: readonly AudioFormat[] = [
  { url: '/audio/sfx.ogg', type: 'audio/ogg; codecs=vorbis' },
  { url: '/audio/sfx.m4a', type: 'audio/mp4; codecs=mp4a.40.2' },
  { url: '/audio/sfx.wav', type: 'audio/wav' },
];

const AMBIENCE_FORMATS: readonly AudioFormat[] = [
  { url: '/audio/ambience.ogg', type: 'audio/ogg; codecs=vorbis' },
  { url: '/audio/ambience.m4a', type: 'audio/mp4; codecs=mp4a.40.2' },
  { url: '/audio/ambience.wav', type: 'audio/wav' },
];

type SpriteMap = Record<string, [number, number]>;

/** Fallback slice lengths (ms) if sfx.json cannot be loaded at all. */
const FALLBACK_SLICES: SpriteMap = {
  press: [0, 150],
  hover_1: [250, 50],
  hover_2: [400, 50],
  hover_3: [550, 50],
  switch_1: [700, 120],
  switch_2: [920, 120],
  paper_1: [1140, 433],
  paper_2: [1673, 531],
  paper_3: [2304, 546],
  lever_clack_1: [2950, 500],
  lever_clack_2: [3550, 500],
  bell: [4150, 1200],
  air_brake: [5450, 800],
  brake_squeal: [6350, 600],
  drone: [7050, 2000],
  clack_1: [9150, 120],
  clack_2: [9370, 120],
  clack_3: [9590, 120],
  impact_muffled_1: [9810, 600],
  impact_muffled_2: [10510, 600],
  crash_comic: [11210, 1200],
  stamp_1: [12510, 400],
  stamp_2: [13010, 400],
};

/** Sounds whose pitch must not be randomised (they carry harmony). */
const TONAL = new Set(['bell', 'drone']);

/** Names that exist as `_1.._n` variants. */
const VARIANT_GROUPS: Record<string, number> = {
  hover: 3,
  switch: 2,
  paper: 3,
  lever_clack: 2,
  clack: 3,
  impact_muffled: 2,
  stamp: 2,
};

/* ------------------------------------------------------------------ *
 * State
 * ------------------------------------------------------------------ */

type Ctx = AudioContext;

interface Engine {
  ctx: Ctx;
  master: GainNode;
  limiter: DynamicsCompressorNode;
  /** shared effects bus (every cue, plus the rumble) */
  sfxBus: GainNode;
  /** effects slider — separate from the ambience slider */
  sfxUserGain: GainNode;
  ambienceBus: GainNode;
  /** automation only: ducking. Never mixed with the user slider. */
  ambienceDuck: GainNode;
  /** background slider */
  ambienceUserGain: GainNode;
  rumbleBus: GainNode;
  sfxBuffer: AudioBuffer | null;
  ambienceBuffer: AudioBuffer | null;
  sprite: SpriteMap;
  format: string | null;
}

let engine: Engine | null = null;
let unlockPromise: Promise<void> | null = null;
let preloadPromise: Promise<SfxPayload | null> | null = null;
let preloadStarted = false;

/**
 * Resume the context without ever throwing. `ctx.resume()` returns a promise
 * that can reject (autoplay policy, iOS interruption); a bare `void ctx.resume()`
 * turns that into an unhandled rejection, and no caller can do anything useful
 * with the error anyway.
 */
function resumeContext(): void {
  const ctx = engine?.ctx;
  if (!ctx) return;
  try {
    if (ctx.state === 'running') return;
    ctx.resume()?.catch?.(() => {
      /* ignore */
    });
  } catch {
    /* ignore */
  }
}

/** Counterpart of resumeContext; see the comment there. */
function suspendContext(): void {
  const ctx = engine?.ctx;
  if (!ctx) return;
  try {
    if (ctx.state !== 'running') return;
    ctx.suspend()?.catch?.(() => {
      /* ignore */
    });
  } catch {
    /* ignore */
  }
}

interface SfxPayload {
  bytes: ArrayBuffer;
  /** which candidate these bytes came from, so the decode fallback can skip it */
  format: AudioFormat;
  sprite: SpriteMap | null;
}

const DEFAULT_VOLUME = 0.7;

let soundEnabled = true;
let ambienceEnabled = true;
let sfxEnabled = true;
let ambienceVolume = DEFAULT_VOLUME;
let sfxVolume = DEFAULT_VOLUME;
let prefsLoaded = false;

const STORAGE_SOUND = 'tramvay_sound_enabled';
const STORAGE_AMBIENCE_ENABLED = 'tramvay_ambience_enabled';
const STORAGE_AMBIENCE_VOLUME = 'tramvay_ambience_volume';
const STORAGE_SFX_ENABLED = 'tramvay_sfx_enabled';
const STORAGE_SFX_VOLUME = 'tramvay_sfx_volume';
/** the single pre-split volume; read once as the initial value, then ignored */
const STORAGE_LEGACY_VOLUME = 'tramvay_volume';

/** at most one warning per missing/failed item */
const warned = new Set<string>();
function warnOnce(key: string, message: string): void {
  if (warned.has(key)) return;
  warned.add(key);
  try {
    console.warn(`[audio] ${message}`);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ *
 * Preferences — every read and write is guarded, so a blocked
 * localStorage (private mode, third-party cookie rules) never throws
 * ------------------------------------------------------------------ */

function readItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeItem(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function parseBool(raw: string | null, fallback: boolean): boolean {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return fallback;
}

/** 0..1, or null when the stored value is missing or not a finite number */
function parseVolume(raw: string | null): number | null {
  if (raw === null || raw.trim() === '') return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(1, Math.max(0, parsed));
}

const clampVolume = (value: number): number => {
  if (!Number.isFinite(value)) return DEFAULT_VOLUME;
  return Math.min(1, Math.max(0, value));
};

/**
 * Read every preference once. The old single `tramvay_volume` seeds both new
 * sliders when the new keys are missing; it is never read again afterwards.
 */
function loadPrefs(): void {
  if (prefsLoaded) return;
  prefsLoaded = true;
  if (typeof window === 'undefined') return;
  soundEnabled = parseBool(readItem(STORAGE_SOUND), true);
  ambienceEnabled = parseBool(readItem(STORAGE_AMBIENCE_ENABLED), true);
  sfxEnabled = parseBool(readItem(STORAGE_SFX_ENABLED), true);
  const legacy = parseVolume(readItem(STORAGE_LEGACY_VOLUME));
  ambienceVolume = parseVolume(readItem(STORAGE_AMBIENCE_VOLUME)) ?? legacy ?? DEFAULT_VOLUME;
  sfxVolume = parseVolume(readItem(STORAGE_SFX_VOLUME)) ?? legacy ?? DEFAULT_VOLUME;
}

/** Smoothed gain move (≈`seconds` to settle) so sliders never zipper. */
function rampGain(param: AudioParam, value: number, seconds: number, immediate = false): void {
  try {
    const now = engine ? engine.ctx.currentTime : 0;
    param.cancelScheduledValues(now);
    if (immediate) {
      param.setValueAtTime(value, now);
      return;
    }
    param.setTargetAtTime(value, now, Math.max(0.004, seconds / 3));
  } catch {
    /* ignore */
  }
}

export const getSoundEnabled = (): boolean => {
  loadPrefs();
  return soundEnabled;
};

export const getAmbienceEnabled = (): boolean => {
  loadPrefs();
  return ambienceEnabled;
};

export const getSfxEnabled = (): boolean => {
  loadPrefs();
  return sfxEnabled;
};

export const getAmbienceVolume = (): number => {
  loadPrefs();
  return ambienceVolume;
};

export const getSfxVolume = (): number => {
  loadPrefs();
  return sfxVolume;
};

/** Master mute: everything, ambience included. */
export const setSoundEnabled = (enabled: boolean): void => {
  loadPrefs();
  soundEnabled = enabled;
  writeItem(STORAGE_SOUND, enabled ? 'true' : 'false');
  if (!engine) return;
  // unmuting must be audible even if the context was suspended while hidden
  if (enabled) resumeContext();
  rampGain(engine.master.gain, enabled ? 1 : 0, 0.08);
  if (!enabled) {
    stopAllCues();
  } else if (ambienceEnabled) {
    startAmbience();
  }
};

/**
 * Background on/off. Fades the ambience over ~150 ms and touches nothing on the
 * effects bus. The source keeps running at gain 0 so unmuting is instant.
 */
export const setAmbienceEnabled = (enabled: boolean): void => {
  loadPrefs();
  ambienceEnabled = enabled;
  writeItem(STORAGE_AMBIENCE_ENABLED, enabled ? 'true' : 'false');
  if (!engine) return;
  if (enabled) resumeContext();
  rampGain(engine.ambienceUserGain.gain, enabled ? ambienceVolume : 0, 0.15);
  if (enabled) startAmbience();
};

export const setAmbienceVolume = (next: number): void => {
  loadPrefs();
  ambienceVolume = clampVolume(next);
  writeItem(STORAGE_AMBIENCE_VOLUME, String(ambienceVolume));
  if (!engine) return;
  rampGain(engine.ambienceUserGain.gain, ambienceEnabled ? ambienceVolume : 0, 0.06);
};

/**
 * Effects on/off. Fades out and stops every effect voice (including the
 * approach rumble) and blocks new ones. The ambience is untouched.
 */
export const setSfxEnabled = (enabled: boolean): void => {
  loadPrefs();
  sfxEnabled = enabled;
  writeItem(STORAGE_SFX_ENABLED, enabled ? 'true' : 'false');
  if (!engine) return;
  if (enabled) resumeContext();
  // unmuting is immediate so the confirmation tick is not swallowed by a ramp
  rampGain(engine.sfxUserGain.gain, enabled ? sfxVolume : 0, 0.06, enabled);
  if (!enabled) {
    fadeVoices(0.1, () => true);
    stopRumble(0.1);
  }
};

export const setSfxVolume = (next: number): void => {
  loadPrefs();
  sfxVolume = clampVolume(next);
  writeItem(STORAGE_SFX_VOLUME, String(sfxVolume));
  if (!engine) return;
  rampGain(engine.sfxUserGain.gain, sfxEnabled ? sfxVolume : 0, 0.06);
};

/* ---- legacy single-volume API, kept for older call sites ---- */

export const getVolume = (): number => getSfxVolume();

/** Legacy master volume: sets both sliders. */
export const setVolume = (next: number): void => {
  setAmbienceVolume(next);
  setSfxVolume(next);
};

/* ------------------------------------------------------------------ *
 * Boot
 * ------------------------------------------------------------------ */

const isBrowser = (): boolean => typeof window !== 'undefined';

function createContext(): Ctx | null {
  if (!isBrowser()) return null;
  type WindowWithWebkit = Window & { webkitAudioContext?: typeof AudioContext };
  const Ctor = window.AudioContext ?? (window as WindowWithWebkit).webkitAudioContext;
  if (!Ctor) {
    warnOnce('no-webaudio', 'Web Audio API is not available; running silently.');
    return null;
  }
  try {
    return new Ctor();
  } catch {
    warnOnce('ctx-fail', 'Could not create an AudioContext; running silently.');
    return null;
  }
}

/**
 * Prefetch the sprite and ambience bytes on page load. No AudioContext is
 * created here — that only happens inside a user gesture (`unlockAudio`).
 */
export const preloadAudio = (): void => {
  if (!isBrowser()) return;
  if (!preloadPromise) preloadPromise = fetchSfx();
  // Deliberately not chained to the SFX result. This call used to sit inside
  // fetchSfx after its early returns, so a sprite that failed to load also
  // stopped the ambience bed from ever being fetched.
  void prefetchAmbience();
};

function fetchSfx(): Promise<SfxPayload | null> {
  preloadStarted = true;
  return (async () => {
    let sprite: SpriteMap | null = null;
    // sprite map first: it tells us where the slices are
    try {
      const res = await fetch(SFX_MAP_URL, { cache: 'force-cache' });
      if (res.ok) {
        const text = await res.text();
        if (!text.trimStart().startsWith('<')) {
          const parsed = JSON.parse(text) as { sprite?: SpriteMap };
          if (parsed?.sprite && typeof parsed.sprite === 'object') {
            sprite = parsed.sprite;
            pendingSprite = parsed.sprite;
          }
        } else {
          warnOnce('sfx-json', `Could not load ${SFX_MAP_URL}; using built-in slice map.`);
        }
      } else {
        warnOnce('sfx-json', `Could not load ${SFX_MAP_URL}; using built-in slice map.`);
      }
    } catch {
      warnOnce('sfx-json', `Could not load ${SFX_MAP_URL}; using built-in slice map.`);
    }

    const fetched = await fetchFirstFormat(SFX_FORMATS);
    if (!fetched) {
      warnOnce('sfx-fetch', 'Could not load the SFX sprite; effects will be silent.');
      return null;
    }
    return { bytes: fetched.bytes, format: fetched.format, sprite };
  })();
}

let pendingSprite: SpriteMap | null = null;

interface FetchedAudio {
  format: AudioFormat;
  bytes: ArrayBuffer;
}

let pendingAmbience: Promise<FetchedAudio | null> | null = null;

/**
 * Candidates in the order this browser should try them: whatever `canPlayType`
 * claims first, everything else after. Nothing is dropped — canPlayType is
 * conservative, and one extra fetch is cheaper than running silently.
 */
function orderFormats(formats: readonly AudioFormat[]): AudioFormat[] {
  if (!isBrowser() || typeof document === 'undefined') return [...formats];
  const probe = document.createElement('audio');
  const supported: AudioFormat[] = [];
  const rest: AudioFormat[] = [];
  for (const format of formats) {
    let can = '';
    try {
      can = probe.canPlayType(format.type);
    } catch {
      can = '';
    }
    if (can === 'probably' || can === 'maybe') supported.push(format);
    else rest.push(format);
  }
  return [...supported, ...rest];
}

/**
 * Fetch the first candidate that answers with real audio bytes. A 200 whose
 * content-type is text/html is the SPA catch-all serving index.html for a path
 * that does not exist, so it counts as a miss and we move on to the next format.
 */
async function fetchFirstFormat(formats: readonly AudioFormat[]): Promise<FetchedAudio | null> {
  for (const format of orderFormats(formats)) {
    try {
      const res = await fetch(format.url, { cache: 'force-cache' });
      if (!res.ok) continue;
      const type = res.headers.get('content-type') ?? '';
      if (type.includes('text/html')) continue;
      return { format, bytes: await res.arrayBuffer() };
    } catch {
      /* try the next format */
    }
  }
  return null;
}

/**
 * Decode `first`, and if the decoder refuses it, fetch and decode the remaining
 * candidates in turn. Choosing a URL with canPlayType is not enough on its own:
 * a browser can claim a format and then fail to decode the actual file, and the
 * old code gave up there instead of trying the other format it also ships.
 *
 * Only callable once a context exists, i.e. from inside unlockAudio.
 */
async function decodeWithFallback(
  ctx: Ctx,
  formats: readonly AudioFormat[],
  first: FetchedAudio,
  key: string
): Promise<AudioBuffer | null> {
  const decoded = await decode(ctx, first.bytes, key);
  if (decoded) return decoded;
  for (const format of orderFormats(formats)) {
    if (format.url === first.format.url) continue;
    try {
      const res = await fetch(format.url, { cache: 'force-cache' });
      if (!res.ok) continue;
      const type = res.headers.get('content-type') ?? '';
      if (type.includes('text/html')) continue;
      const buffer = await decode(ctx, await res.arrayBuffer(), key);
      if (buffer) return buffer;
    } catch {
      /* try the next format */
    }
  }
  return null;
}

function prefetchAmbience(): Promise<FetchedAudio | null> {
  if (pendingAmbience) return pendingAmbience;
  pendingAmbience = (async () => {
    const fetched = await fetchFirstFormat(AMBIENCE_FORMATS);
    if (!fetched) {
      warnOnce('ambience-fetch', 'Could not load the ambience loop; continuing without it.');
    }
    return fetched;
  })();
  return pendingAmbience;
}

async function decode(ctx: Ctx, bytes: ArrayBuffer, key: string): Promise<AudioBuffer | null> {
  try {
    return await ctx.decodeAudioData(bytes.slice(0));
  } catch {
    warnOnce(key, 'An audio file failed to decode; that part will be silent.');
    return null;
  }
}

function buildGraph(ctx: Ctx): Engine {
  // master is now a pure mute (1 or 0); the two user sliders carry the level
  const master = ctx.createGain();
  master.gain.value = soundEnabled ? 1 : 0;

  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -3;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.12;
  limiter.connect(ctx.destination);

  master.connect(limiter);

  // effects: sfxBus -> sfxUserGain -> master
  const sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.9;
  const sfxUserGain = ctx.createGain();
  sfxUserGain.gain.value = sfxEnabled ? sfxVolume : 0;
  sfxBus.connect(sfxUserGain);
  sfxUserGain.connect(master);

  // background: ambienceBus -> duck -> ambienceUserGain -> master
  const ambienceBus = ctx.createGain();
  ambienceBus.gain.value = 0;
  const ambienceDuck = ctx.createGain();
  ambienceDuck.gain.value = 1;
  const ambienceUserGain = ctx.createGain();
  ambienceUserGain.gain.value = ambienceEnabled ? ambienceVolume : 0;
  ambienceBus.connect(ambienceDuck);
  ambienceDuck.connect(ambienceUserGain);
  ambienceUserGain.connect(master);

  // the rumble is an effect: it rides the effects bus (and its mute)
  const rumbleBus = ctx.createGain();
  rumbleBus.gain.value = 1;
  rumbleBus.connect(sfxBus);

  return {
    ctx,
    master,
    limiter,
    sfxBus,
    sfxUserGain,
    ambienceBus,
    ambienceDuck,
    ambienceUserGain,
    rumbleBus,
    sfxBuffer: null,
    ambienceBuffer: null,
    sprite: { ...FALLBACK_SLICES },
    format: null,
  };
}

/**
 * Called synchronously inside the Start gesture. Creates the context, resumes
 * it, and starts decoding. Resolves when the SFX sprite is ready; the ambience
 * keeps loading/starting in the background.
 */
export const unlockAudio = (): Promise<void> => {
  if (unlockPromise) {
    // A later gesture is a fresh chance to resume. The context may have been
    // suspended by a hidden tab while the player was muted, and returning the
    // cached promise without touching the state left it suspended for good.
    resumeContext();
    return unlockPromise;
  }
  unlockPromise = (async () => {
    if (!isBrowser()) return;
    const ctx = createContext();
    if (!ctx) return;

    loadPrefs();
    const created = buildGraph(ctx);
    engine = created;

    // gesture-safe resume
    try {
      if (ctx.state === 'suspended') await ctx.resume();
    } catch {
      /* ignore */
    }

    bindVisibility();

    // the preload may never have been started (e.g. unlock called from a key)
    if (!preloadStarted) preloadAudio();
    let payload: SfxPayload | null = null;
    try {
      payload = await (preloadPromise ?? Promise.resolve(null));
    } catch {
      payload = null;
    }

    if (payload?.bytes) {
      const decoded = await decodeWithFallback(
        ctx,
        SFX_FORMATS,
        { format: payload.format, bytes: payload.bytes },
        'sfx-decode'
      );
      if (decoded) created.sfxBuffer = decoded;
    }
    const sprite = payload?.sprite ?? pendingSprite;
    if (sprite) created.sprite = sprite;

    // probe the sprite: some decoders return a zero-length buffer for a
    // truncated file, and every play would then start out of range.
    try {
      if (payload?.bytes && (!created.sfxBuffer || created.sfxBuffer.duration < 0.5)) {
        created.sfxBuffer = null;
        warnOnce('sfx-empty', 'The SFX sprite decoded to an unusable buffer; effects will be silent.');
      }
    } catch {
      created.sfxBuffer = null;
    }

    if (created.sfxBuffer) flushQueuedPress();

    startAmbience();
    // prefetchAmbience() rather than the pendingAmbience variable: if the
    // preload never ran, the bed used to have nothing to wait for and so never
    // loaded at all.
    void prefetchAmbience()
      .then(async (fetched) => {
        if (!fetched || !engine || engine !== created) return;
        const amb = await decodeWithFallback(created.ctx, AMBIENCE_FORMATS, fetched, 'ambience-decode');
        if (amb) {
          created.ambienceBuffer = amb;
          startAmbience();
        }
      })
      .catch(() => {
        /* never throw at the game */
      });
  })().catch(() => {
    /* never throw at the game */
  });
  return unlockPromise;
};

/* ------------------------------------------------------------------ *
 * Ambience
 * ------------------------------------------------------------------ */

let ambienceSource: AudioBufferSourceNode | null = null;
/** the bed only runs once the game has started (never on the landing page) */
let ambienceArmed = false;

/** How long disarmAmbience takes to fade the bed out. A hard cut clicks. */
const AMBIENCE_FADE_OUT = 0.25;

function startAmbience(): void {
  if (!engine || !engine.ambienceBuffer) return;
  if (!soundEnabled || !ambienceEnabled || !ambienceArmed) return;
  const { ctx, ambienceBus, ambienceBuffer } = engine;
  try {
    if (ambienceSource) {
      const now = ctx.currentTime;
      ambienceBus.gain.cancelScheduledValues(now);
      ambienceBus.gain.setTargetAtTime(TIMING.ambienceLevel, now, 0.4);
      return;
    }
    const src = ctx.createBufferSource();
    src.buffer = ambienceBuffer;
    src.loop = true;
    src.connect(ambienceBus);
    src.start();
    ambienceSource = src;
    const now = ctx.currentTime;
    ambienceBus.gain.cancelScheduledValues(now);
    ambienceBus.gain.setValueAtTime(0.0001, now);
    ambienceBus.gain.linearRampToValueAtTime(TIMING.ambienceLevel, now + TIMING.ambienceFadeIn);
  } catch {
    warnOnce('ambience-start', 'Could not start the ambience loop.');
  }
}

function duckAmbience(target: number, seconds: number): void {
  if (!engine) return;
  try {
    const now = engine.ctx.currentTime;
    engine.ambienceDuck.gain.cancelScheduledValues(now);
    engine.ambienceDuck.gain.setTargetAtTime(target, now, Math.max(0.01, seconds / 3));
  } catch {
    /* ignore */
  }
}

function restoreAmbience(seconds = 2): void {
  duckAmbience(1, seconds);
}

/** Arm the ambience bed. Called inside the Start gesture. */
export const armAmbience = (): void => {
  ambienceArmed = true;
  startAmbience();
};

/**
 * Disarm the bed and stop it. Called on restart.
 *
 * Nothing enforced the "never on the landing page" comment above: the source
 * was started and never stopped, and ambienceArmed was never cleared, so the
 * bed kept looping on the title screen after a restart — and stopAllCues() ends
 * by restoring it to full level.
 */
export const disarmAmbience = (): void => {
  ambienceArmed = false;
  const src = ambienceSource;
  ambienceSource = null;
  if (!engine || !src) return;
  const { ctx, ambienceBus } = engine;
  try {
    const now = ctx.currentTime;
    ambienceBus.gain.cancelScheduledValues(now);
    ambienceBus.gain.setValueAtTime(Math.max(0.0001, ambienceBus.gain.value), now);
    ambienceBus.gain.linearRampToValueAtTime(0.0001, now + AMBIENCE_FADE_OUT);
    src.stop(now + AMBIENCE_FADE_OUT);
  } catch {
    try {
      src.stop();
    } catch {
      /* ignore */
    }
  }
};

/* ------------------------------------------------------------------ *
 * Slice playback
 * ------------------------------------------------------------------ */

interface ActiveVoice {
  source: AudioBufferSourceNode;
  gain: GainNode;
  tag: string;
}

/** The outcome group: impact/crash + the ink stamp. Nothing else is tagged. */
const OUTCOME_IMPACT = 'outcome-impact';
const OUTCOME_STAMP = 'outcome-stamp';
const OUTCOME_TAGS: ReadonlySet<string> = new Set([OUTCOME_IMPACT, OUTCOME_STAMP]);

const activeVoices = new Set<ActiveVoice>();
const lastVariant = new Map<string, string>();
let timers: ReturnType<typeof setTimeout>[] = [];

function later(fn: () => void, ms: number): void {
  const id = setTimeout(() => {
    timers = timers.filter((t) => t !== id);
    try {
      fn();
    } catch {
      /* ignore */
    }
  }, ms);
  timers.push(id);
}

function clearTimers(): void {
  for (const id of timers) clearTimeout(id);
  timers = [];
}

function resolveName(name: string): string {
  const count = VARIANT_GROUPS[name];
  if (!count || count < 2) return name;
  const before = lastVariant.get(name);
  const options: string[] = [];
  for (let i = 1; i <= count; i++) options.push(`${name}_${i}`);
  const filtered = options.filter((o) => o !== before);
  const pool = filtered.length ? filtered : options;
  const pick = pool[Math.floor(Math.random() * pool.length)] ?? options[0];
  lastVariant.set(name, pick);
  return pick;
}

function playSprite(
  name: string,
  { gain = 1, rate = 1, tag = name, when = 0 }: { gain?: number; rate?: number; tag?: string; when?: number } = {},
): void {
  if (!engine || !soundEnabled || !sfxEnabled) return;
  const { ctx, sfxBuffer, sprite, sfxBus } = engine;
  if (!sfxBuffer || !sfxBuffer.getChannelData) return;

  const sliceName = resolveName(name);
  const slice = sprite[sliceName] ?? sprite[name];
  if (!slice) {
    warnOnce(`slice-${name}`, `No sprite slice named "${sliceName}".`);
    return;
  }

  const actualRate = TONAL.has(name) ? 1 : rate;
  const start = Math.max(0, slice[0] / 1000);
  const dur = Math.max(0.01, slice[1] / 1000);
  const offset = Math.min(start, Math.max(0, sfxBuffer.duration - 0.02));
  const playDur = Math.min(dur, Math.max(0.01, sfxBuffer.duration - offset - 0.005));

  try {
    const source = ctx.createBufferSource();
    source.buffer = sfxBuffer;
    source.playbackRate.value = actualRate;

    const g = ctx.createGain();
    const t0 = ctx.currentTime + Math.max(0, when);
    const fade = 0.006;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.003);
    g.gain.setValueAtTime(gain, t0 + Math.max(0.004, playDur - fade));
    g.gain.linearRampToValueAtTime(0.0001, t0 + playDur);

    source.connect(g);
    g.connect(sfxBus);
    source.start(t0, offset, playDur + 0.02);
    source.stop(t0 + playDur + 0.02);

    const voice: ActiveVoice = { source, gain: g, tag };
    activeVoices.add(voice);
    source.onended = () => {
      activeVoices.delete(voice);
      try {
        g.disconnect();
        source.disconnect();
      } catch {
        /* ignore */
      }
    };
  } catch {
    warnOnce('play-fail', 'A sound could not be played.');
  }
}

/** ±4 % playback-rate jitter, never applied to tonal material. */
const jitterRate = (): number => 0.96 + Math.random() * 0.08;

/**
 * Fade the matching voices out over `seconds` and stop them. The ambience is
 * not a voice, so it can never be caught by this.
 */
function fadeVoices(seconds: number, which: (tag: string) => boolean): void {
  if (!engine) return;
  const fade = Math.max(0.02, seconds);
  for (const voice of Array.from(activeVoices)) {
    if (!which(voice.tag)) continue;
    activeVoices.delete(voice);
    try {
      const now = engine.ctx.currentTime;
      const param = voice.gain.gain;
      if (typeof param.cancelAndHoldAtTime === 'function') {
        param.cancelAndHoldAtTime(now);
      } else {
        const current = param.value;
        param.cancelScheduledValues(now);
        param.setValueAtTime(Math.max(0.0001, current), now);
      }
      param.linearRampToValueAtTime(0.0001, now + fade);
      voice.source.stop(now + fade + 0.02);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Fade out anything from the outcome group (impact / comic crash / stamp) that
 * is still ringing. Called when the player advances, restarts, or commits a new
 * decision, so a 1.2 s comic crash cannot bleed into the next dilemma.
 */
export const fadeOutOutcome = (seconds = 0.1): void => {
  fadeVoices(seconds, (tag) => OUTCOME_TAGS.has(tag));
};

/* ------------------------------------------------------------------ *
 * Rumble (approach) — looped brown noise + sweeping lowpass
 * ------------------------------------------------------------------ */

interface RumbleState {
  source: AudioBufferSourceNode;
  filter: BiquadFilterNode;
  gain: GainNode;
  clackTimer: ReturnType<typeof setTimeout> | null;
  interval: number;
  stopped: boolean;
}

let rumble: RumbleState | null = null;
const RUMBLE_SECONDS = 2;

const rumbleBufferCache = new WeakMap<Ctx, AudioBuffer>();

function rumbleBuffer(ctx: Ctx): AudioBuffer {
  const cached = rumbleBufferCache.get(ctx);
  if (cached) return cached;
  const length = Math.floor(ctx.sampleRate * RUMBLE_SECONDS);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  // brown noise, loop-shaped: a raised-cosine envelope at both ends so the wrap
  // is inaudible, plus a leaky integrator for the low rumble
  let last = 0;
  let dc = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    const fade = Math.min(1, Math.min(i, length - i) / (ctx.sampleRate * 0.03));
    data[i] = last * 3.2 * fade;
    dc += data[i];
  }
  dc /= length;
  for (let i = 0; i < length; i++) data[i] -= dc;
  rumbleBufferCache.set(ctx, buffer);
  return buffer;
}

function scheduleClacks(state: RumbleState): void {
  if (state.stopped || !engine || !sfxEnabled || !soundEnabled) return;
  const progress = Math.min(1, 1 - state.interval / TIMING.clackStartInterval);
  playSprite('clack', { gain: 0.25 + progress * 0.45, rate: jitterRate(), tag: 'rumble-clack' });
  state.interval = Math.max(TIMING.clackMinInterval, state.interval * TIMING.clackIntervalFactor);
  state.clackTimer = setTimeout(() => scheduleClacks(state), state.interval * 1000);
}

function startRumble(seconds: number): void {
  if (!engine || !soundEnabled || !sfxEnabled) return;
  const { ctx, rumbleBus } = engine;
  const duration = Math.max(0.4, seconds);
  try {
    stopRumble(0.05);
    const source = ctx.createBufferSource();
    source.buffer = rumbleBuffer(ctx);
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.9;

    const gain = ctx.createGain();
    const now = ctx.currentTime;
    filter.frequency.setValueAtTime(TIMING.rumbleCutoffStart, now);
    filter.frequency.exponentialRampToValueAtTime(TIMING.rumbleCutoffEnd, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.5, now + duration * 0.9);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(rumbleBus);
    source.start(now);

    const state: RumbleState = {
      source,
      filter,
      gain,
      clackTimer: null,
      interval: TIMING.clackStartInterval,
      stopped: false,
    };
    rumble = state;
    state.clackTimer = setTimeout(() => scheduleClacks(state), 180);
  } catch {
    warnOnce('rumble', 'Could not start the tram rumble.');
  }
}

function stopRumble(fade = 0.12): void {
  const state = rumble;
  rumble = null;
  if (!state) return;
  state.stopped = true;
  if (state.clackTimer) clearTimeout(state.clackTimer);
  try {
    const now = engine ? engine.ctx.currentTime : 0;
    state.gain.gain.cancelScheduledValues(now);
    state.gain.gain.setTargetAtTime(0, now, Math.max(0.01, fade / 3));
    state.source.stop(now + fade + 0.05);
    state.source.onended = () => {
      try {
        state.source.disconnect();
        state.filter.disconnect();
        state.gain.disconnect();
      } catch {
        /* ignore */
      }
    };
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ *
 * Public cue API
 * ------------------------------------------------------------------ */

/**
 * The Start click usually lands before the sprite has finished decoding (the
 * first tap is what creates the AudioContext). Rather than swallow it, remember
 * it and play it on decode — but only if it is still fresh (≤ 1 s late).
 */
let queuedPressAt: number | null = null;
const PRESS_QUEUE_TTL_MS = 1000;

const nowMs = (): number =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

function firePress(): void {
  playSprite('press', { gain: TIMING.gainPress, rate: jitterRate() });
}

function flushQueuedPress(): void {
  const at = queuedPressAt;
  queuedPressAt = null;
  if (at === null) return;
  if (nowMs() - at > PRESS_QUEUE_TTL_MS) return;
  firePress();
}

export const playPress = (): void => {
  if (!engine || !engine.sfxBuffer) {
    queuedPressAt = nowMs();
    return;
  }
  queuedPressAt = null;
  firePress();
};

export const playSwitch = (): void => {
  playSprite('switch', { gain: TIMING.gainSwitch, rate: jitterRate() });
};

export const playPaper = (): void => {
  playSprite('paper', { gain: TIMING.gainPaper, rate: jitterRate() });
};

/** One quiet tick for the settings preview; no pointer-type gate. */
export const playLevelTick = (): void => {
  playSprite('hover', { gain: TIMING.gainHover, rate: jitterRate() });
};

export const playHoverTick = (): void => {
  if (!isBrowser()) return;
  const fine = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
  if (!fine) return;
  playSprite('hover', { gain: TIMING.gainHover, rate: jitterRate() });
};

/**
 * Decision cue. `approachSec` is the real animation length, so the rumble and
 * the accelerating clacks land exactly on the animation end.
 */
export const playDecision = (pulled: boolean, approachSec: number): void => {
  const seconds = Math.max(0.4, approachSec);
  duckAmbience(TIMING.duckDecision, 0.4);
  if (pulled) {
    playSprite('lever_clack', { gain: TIMING.gainLeverClack, rate: jitterRate() });
    later(() => playSprite('bell', { gain: TIMING.gainBell }), TIMING.bellAfterLever * 1000);
  } else {
    playSprite('air_brake', { gain: TIMING.gainAirBrake, rate: jitterRate() });
    later(() => playSprite('brake_squeal', { gain: TIMING.gainSqueal, rate: jitterRate() }), TIMING.squealAfterBrake * 1000);
    later(() => playSprite('drone', { gain: TIMING.gainDrone }), 120);
  }
  startRumble(seconds);
};

export interface ImpactOptions {
  comic?: boolean;
}

/**
 * Outcome sequence: rumble and clacks cut dead → 80 ms of silence → impact
 * (`crash_comic` on the comic dilemmas) → stamp at +300 ms → ambience eased back
 * to its normal level over ~2 s starting right after the stamp.
 *
 * Returns the milliseconds from "impact" (which is when the tram animation
 * ends) until the stamp lands, so the UI can reveal the verdict exactly on the
 * ink stamp.
 */
export const playImpact = ({ comic = false }: ImpactOptions = {}): number => {
  // cut the approach dead so the silence beat is a real hole
  stopRumble(0.03);
  clearTimers();
  duckAmbience(TIMING.duckSilence, 0.15);

  const beatMs = Math.round(TIMING.silenceBeat * 1000);
  const stampMs = Math.round(TIMING.stampAfterImpact * 1000);

  later(() => {
    if (comic) {
      playSprite('crash_comic', { gain: TIMING.gainComicCrash, rate: jitterRate(), tag: OUTCOME_IMPACT });
    } else {
      playSprite('impact_muffled', { gain: TIMING.gainImpact, rate: jitterRate(), tag: OUTCOME_IMPACT });
    }
    duckAmbience(TIMING.duckDecision * 0.85, 0.25);
  }, beatMs);

  later(() => {
    playSprite('stamp', { gain: TIMING.gainStamp, rate: jitterRate(), tag: OUTCOME_STAMP });
    // the bed comes back to its normal level starting right after the stamp
    restoreAmbience(2);
  }, beatMs + stampMs);

  // safety net: never leave the ambience ducked
  later(() => restoreAmbience(2), beatMs + stampMs + 2500);

  return IMPACT_TO_STAMP_MS;
};

/**
 * Stop every scheduled cue and fade every voice out over ~100 ms (a hard cut
 * clicks), then restore the bed. Cues started after this call are unaffected,
 * which is what lets restart play its page-turn.
 */
export const stopAllCues = (): void => {
  clearTimers();
  stopRumble(0.08);
  fadeVoices(0.1, () => true);
  restoreAmbience(1.2);
};

/* ------------------------------------------------------------------ *
 * Legacy aliases — kept so older call sites keep working
 * ------------------------------------------------------------------ */

/** The stamp replaces the old reveal chime. */
export const playRevealChime = (): void => {};

/** The stamp replaces the old foil sweep. */
export const playFoilSweep = (): void => {};

export const startMusicBed = (): void => {
  startAmbience();
};

export const stopMusicBed = (): void => {
  if (!engine) return;
  try {
    const now = engine.ctx.currentTime;
    engine.ambienceDuck.gain.cancelScheduledValues(now);
    engine.ambienceBus.gain.cancelScheduledValues(now);
    engine.ambienceBus.gain.setTargetAtTime(0.0001, now, 0.4);
  } catch {
    /* ignore */
  }
};

export const duckMusicBed = (duck: boolean): void => {
  duckAmbience(duck ? 0.3 : 1, 0.3);
};

export const playSwitchLight = playSwitch;
export const playLeverSnap = playSwitch;
export const playTinyClick = playSwitch;
export const playSoftTick = (_step = 0): void => {
  playSwitch();
};
export const playPaperSwish = playPaper;
export const playPremiumTransition = playPaper;
export const playPencilScratch = playPaper;
export const playSonicSignatureMotif = (): void => {
  playSprite('bell', { gain: 0.45 });
};
export const playDecisionWhoosh = (): void => {
  playSprite('air_brake', { gain: 0.4 });
};
export const playRisingSweep = (): void => {
  playSprite('drone', { gain: 0.22 });
};
export const playLowThump = (): void => {
  playSprite('impact_muffled', { gain: 0.55, rate: jitterRate() });
};
export const playChordSwell = (): void => {
  playSprite('drone', { gain: 0.4 });
};
/** Summary payoff: the single stamp. */
export const playSummaryReveal = (): void => {
  playSprite('stamp', { gain: 0.9, rate: jitterRate(), tag: OUTCOME_STAMP });
};

/* ------------------------------------------------------------------ *
 * Visibility
 * ------------------------------------------------------------------ */

let visibilityBound = false;

function bindVisibility(): void {
  if (visibilityBound || typeof document === 'undefined') return;
  visibilityBound = true;
  document.addEventListener('visibilitychange', () => {
    if (!engine) return;
    // Resume regardless of mute state. Muting is already a master gain of 0, so
    // resuming cannot make a muted player hear anything; but only resuming when
    // soundEnabled meant a muted player who hid the tab got a context that was
    // suspended and never resumed by anything.
    if (document.hidden) suspendContext();
    else resumeContext();
  });
}
