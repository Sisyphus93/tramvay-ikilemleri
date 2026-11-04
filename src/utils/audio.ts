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
 * Graph:
 *
 *   sfx ───────────────► master ► limiter ► destination
 *   ambience ► duck ───┘
 *   rumble ────────────┘
 *
 * Everything is defensive: if a file is missing, returns HTML (SPA fallback) or
 * fails to decode, the game plays silently and logs at most one warning per
 * item. No AudioContext is created before a user gesture.
 */

/* ------------------------------------------------------------------ *
 * Timing constants — tune these by ear
 * ------------------------------------------------------------------ */

export const TIMING = {
  /** dead air between the impact and the ink stamp when no mood sting wants it */
  silenceBeat: 0.08,
  /** impact → stamp, in seconds */
  stampAfterImpact: 0.3,
  /** impact → mood sting, in seconds */
  stingAfterImpact: 0.7,
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
  gainHover: 0.18,
  gainLeverClack: 0.9,
  gainBell: 0.5,
  gainAirBrake: 0.55,
  gainSqueal: 0.32,
  gainDrone: 0.22,
  gainImpact: 1,
  gainComicCrash: 0.85,
  gainStamp: 0.95,
  gainSting: 0.45,
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
const AMBIENCE_URLS = ['/audio/ambience.ogg', '/audio/ambience.m4a', '/audio/ambience.wav'];

const SFX_FORMATS = [
  { url: '/audio/sfx.ogg', type: 'audio/ogg; codecs=vorbis' },
  { url: '/audio/sfx.m4a', type: 'audio/mp4; codecs=mp4a.40.2' },
  { url: '/audio/sfx.wav', type: 'audio/wav' },
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
  sting_relief: [13510, 1500],
  sting_dread: [15110, 1500],
  sting_absurd: [16710, 1500],
};

/** Sounds whose pitch must not be randomised (they carry harmony). */
const TONAL = new Set(['bell', 'drone', 'sting_relief', 'sting_dread', 'sting_absurd']);

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
  sfxBus: GainNode;
  ambienceBus: GainNode;
  ambienceDuck: GainNode;
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

interface SfxPayload {
  bytes: ArrayBuffer;
  sprite: SpriteMap | null;
}

let soundEnabled = true;
let volume = 0.7;
const STORAGE_SOUND = 'tramvay_sound_enabled';
const STORAGE_VOLUME = 'tramvay_volume';

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
 * Preferences
 * ------------------------------------------------------------------ */

export const getSoundEnabled = (): boolean => {
  if (typeof window === 'undefined') return soundEnabled;
  try {
    const saved = window.localStorage.getItem(STORAGE_SOUND);
    if (saved !== null) soundEnabled = saved === 'true';
  } catch {
    /* ignore */
  }
  return soundEnabled;
};

export const setSoundEnabled = (enabled: boolean): void => {
  soundEnabled = enabled;
  try {
    window.localStorage.setItem(STORAGE_SOUND, enabled ? 'true' : 'false');
  } catch {
    /* ignore */
  }
  if (!engine) return;
  try {
    const now = engine.ctx.currentTime;
    engine.master.gain.cancelScheduledValues(now);
    engine.master.gain.setTargetAtTime(enabled ? volume : 0, now, 0.08);
    if (!enabled) {
      stopAllCues();
    } else {
      startAmbience();
    }
  } catch {
    /* ignore */
  }
};

export const getVolume = (): number => {
  if (typeof window === 'undefined') return volume;
  try {
    const saved = window.localStorage.getItem(STORAGE_VOLUME);
    if (saved !== null) {
      const parsed = Number(saved);
      if (Number.isFinite(parsed)) volume = Math.min(1, Math.max(0, parsed));
    }
  } catch {
    /* ignore */
  }
  return volume;
};

export const setVolume = (next: number): void => {
  volume = Math.min(1, Math.max(0, Number.isFinite(next) ? next : 0.7));
  try {
    window.localStorage.setItem(STORAGE_VOLUME, String(volume));
  } catch {
    /* ignore */
  }
  if (!engine) return;
  try {
    const now = engine.ctx.currentTime;
    engine.master.gain.cancelScheduledValues(now);
    engine.master.gain.setTargetAtTime(soundEnabled ? volume : 0, now, 0.06);
  } catch {
    /* ignore */
  }
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

    const url = pickSfxUrl();
    if (!url) {
      warnOnce('sfx-format', 'No supported audio format for the SFX sprite; running silently.');
      return null;
    }
    try {
      const res = await fetch(url, { cache: 'force-cache' });
      if (!res.ok) {
        warnOnce('sfx-fetch', `Could not load ${url}; effects will be silent.`);
        return null;
      }
      const type = res.headers.get('content-type') ?? '';
      if (type.includes('text/html')) {
        // SPA fallback served index.html with 200
        warnOnce('sfx-fetch', `Could not load ${url}; effects will be silent.`);
        return null;
      }
      const bytes = await res.arrayBuffer();
      // ambience in the background; it is only needed once playback starts
      void prefetchAmbience();
      return { bytes, sprite };
    } catch {
      warnOnce('sfx-fetch', `Could not load ${url}; effects will be silent.`);
      return null;
    }
  })();
}

let pendingSprite: SpriteMap | null = null;
let pendingAmbience: Promise<ArrayBuffer | null> | null = null;

function pickSfxUrl(): string | null {
  if (!isBrowser()) return null;
  const probe =
    typeof document !== 'undefined'
      ? document.createElement('audio')
      : (null as unknown as HTMLAudioElement);
  for (const format of SFX_FORMATS) {
    if (format.type === 'audio/wav') return format.url; // last resort
    if (!probe) continue;
    const can = probe.canPlayType(format.type);
    if (can === 'probably' || can === 'maybe') return format.url;
  }
  return SFX_FORMATS[SFX_FORMATS.length - 1].url;
}

function prefetchAmbience(): Promise<ArrayBuffer | null> {
  if (pendingAmbience) return pendingAmbience;
  pendingAmbience = (async () => {
    for (const candidate of AMBIENCE_URLS) {
      try {
        const res = await fetch(candidate, { cache: 'force-cache' });
        if (!res.ok) continue;
        const type = res.headers.get('content-type') ?? '';
        if (type.includes('text/html')) continue;
        return await res.arrayBuffer();
      } catch {
        continue;
      }
    }
    warnOnce('ambience-fetch', 'Could not load the ambience loop; continuing without it.');
    return null;
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
  const master = ctx.createGain();
  master.gain.value = soundEnabled ? volume : 0;

  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -3;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.12;
  limiter.connect(ctx.destination);

  master.connect(limiter);

  const sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.9;
  sfxBus.connect(master);

  const ambienceBus = ctx.createGain();
  ambienceBus.gain.value = 0;
  const ambienceDuck = ctx.createGain();
  ambienceDuck.gain.value = 1;
  ambienceBus.connect(ambienceDuck);
  ambienceDuck.connect(master);

  const rumbleBus = ctx.createGain();
  rumbleBus.gain.value = 0;
  rumbleBus.connect(master);

  return {
    ctx,
    master,
    limiter,
    sfxBus,
    ambienceBus,
    ambienceDuck,
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
  if (unlockPromise) return unlockPromise;
  unlockPromise = (async () => {
    if (!isBrowser()) return;
    const ctx = createContext();
    if (!ctx) return;

    getSoundEnabled();
    getVolume();
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
      const decoded = await decode(ctx, payload.bytes, 'sfx-decode');
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

    startAmbience();
    void pendingAmbience?.then(async (ambBytes) => {
      if (!ambBytes || !engine || engine !== created) return;
      const amb = await decode(created.ctx, ambBytes, 'ambience-decode');
      if (amb) {
        created.ambienceBuffer = amb;
        startAmbience();
      }
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
let ambienceTimer: ReturnType<typeof setTimeout> | null = null;

function startAmbience(): void {
  if (!engine || !engine.ambienceBuffer) return;
  if (!soundEnabled) return;
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

/* ------------------------------------------------------------------ *
 * Slice playback
 * ------------------------------------------------------------------ */

interface ActiveVoice {
  source: AudioBufferSourceNode;
  gain: GainNode;
  tag: string;
}

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
  if (!engine || !soundEnabled) return;
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
  if (state.stopped || !engine) return;
  const progress = Math.min(1, 1 - state.interval / TIMING.clackStartInterval);
  playSprite('clack', { gain: 0.25 + progress * 0.45, rate: jitterRate(), tag: 'rumble-clack' });
  state.interval = Math.max(TIMING.clackMinInterval, state.interval * TIMING.clackIntervalFactor);
  state.clackTimer = setTimeout(() => scheduleClacks(state), state.interval * 1000);
}

function startRumble(seconds: number): void {
  if (!engine || !soundEnabled) return;
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

export const playPress = (): void => {
  playSprite('press', { gain: TIMING.gainPress, rate: jitterRate() });
};

export const playSwitch = (): void => {
  playSprite('switch', { gain: TIMING.gainSwitch, rate: jitterRate() });
};

export const playPaper = (): void => {
  playSprite('paper', { gain: TIMING.gainPaper, rate: jitterRate() });
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
  mood?: 'relief' | 'dread' | 'absurd';
  comic?: boolean;
}

/**
 * Impact → stamp → mood sting. Returns the milliseconds from "impact" (which is
 * when the tram animation ends) until the stamp lands, so the UI can reveal the
 * verdict exactly on the ink stamp.
 */
export const playImpact = ({ mood = 'dread', comic = false }: ImpactOptions = {}): number => {
  stopRumble(0.06);
  clearTimers();
  // silence beat: duck almost to zero so the impact lands in a hole
  duckAmbience(TIMING.duckSilence, 0.15);

  const beatMs = Math.round(TIMING.silenceBeat * 1000);
  const stampMs = Math.round(TIMING.stampAfterImpact * 1000);
  const stingMs = Math.round(TIMING.stingAfterImpact * 1000);

  later(() => {
    if (comic) {
      playSprite('crash_comic', { gain: TIMING.gainComicCrash, rate: jitterRate() });
    } else {
      playSprite('impact_muffled', { gain: TIMING.gainImpact, rate: jitterRate() });
    }
    duckAmbience(TIMING.duckDecision * 0.85, 0.25);
  }, beatMs);
  later(() => playSprite('stamp', { gain: TIMING.gainStamp, rate: jitterRate() }), beatMs + stampMs);
  later(() => {
    playSprite(`sting_${mood}`, { gain: TIMING.gainSting });
    restoreAmbience(2.5);
  }, beatMs + stingMs);
  // safety net: never leave the ambience ducked
  later(() => restoreAmbience(2), beatMs + stingMs + 2500);

  return IMPACT_TO_STAMP_MS;
};

/** Stop every scheduled cue, kill voices and restore the bed. */
export const stopAllCues = (): void => {
  clearTimers();
  stopRumble(0.08);
  for (const voice of Array.from(activeVoices)) {
    try {
      voice.source.stop();
    } catch {
      /* ignore */
    }
    activeVoices.delete(voice);
  }
  restoreAmbience(1.2);
};

/* ------------------------------------------------------------------ *
 * Legacy aliases — kept so older call sites keep working
 * ------------------------------------------------------------------ */

/** The stamp and the mood sting replace the old reveal chime. */
export const playRevealChime = (): void => {};

/** The stamp and the mood sting replace the old foil sweep. */
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
  playSprite('sting_relief', { gain: 0.4 });
};
/** Summary payoff: stamp, then a relief sting. */
export const playSummaryReveal = (): void => {
  playSprite('stamp', { gain: 0.9, rate: jitterRate() });
  later(() => playSprite('sting_relief', { gain: 0.4 }), 320);
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
    try {
      if (document.hidden) {
        void engine.ctx.suspend();
      } else if (soundEnabled) {
        void engine.ctx.resume();
      }
    } catch {
      /* ignore */
    }
  });
}
