/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Premium hybrid sound engine.
// Pure Web Audio API — no audio files.
// Layers:
// 1. A warm, slowly evolving chord bed with a gentle filter LFO.
// 2. A shared master bus: soft compression + a short convolution reverb for space.
// 3. Refined cues: hover, lever, decision whoosh, reveal chime, transitions,
//    tram sweep, impact, pencil, paper, ticks, chord swell and summary payoff.

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

interface AudioBus {
  input: GainNode;
  reverb: ConvolverNode;
  wet: GainNode;
  compressor: DynamicsCompressorNode;
}

let bus: AudioBus | null = null;
let busCtx: AudioContext | null = null;

interface MusicNodes {
  masterGain: GainNode | null;
  filter: BiquadFilterNode | null;
  oscillators: OscillatorNode[];
  lfo: OscillatorNode | null;
  lfoGain: GainNode | null;
  intervalId: number | null;
}

const musicNodes: MusicNodes = {
  masterGain: null,
  filter: null,
  oscillators: [],
  lfo: null,
  lfoGain: null,
  intervalId: null,
};

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
}

function createImpulse(ctx: AudioContext, duration = 2.1, decay = 2.7): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * duration);
  const impulse = ctx.createBuffer(2, length, rate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      const t = i / length;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
    }
  }
  return impulse;
}

function getBus(ctx: AudioContext): AudioBus {
  if (bus && busCtx === ctx) return bus;

  const input = ctx.createGain();
  input.gain.value = 0.88;

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.knee.value = 24;
  compressor.ratio.value = 3.5;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.28;

  const reverb = ctx.createConvolver();
  reverb.buffer = createImpulse(ctx);

  const wet = ctx.createGain();
  wet.gain.value = 0.22;

  input.connect(compressor);
  compressor.connect(ctx.destination);
  reverb.connect(wet);
  wet.connect(compressor);

  bus = { input, reverb, wet, compressor };
  busCtx = ctx;
  return bus;
}

/** Route a cue through the mastered bus, with an optional reverb send. */
function connectOutput(node: AudioNode, reverbSend = 0.12): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const b = getBus(ctx);
  node.connect(b.input);
  if (reverbSend > 0) {
    const send = ctx.createGain();
    send.gain.value = reverbSend;
    node.connect(send);
    send.connect(b.reverb);
  }
}

function createNoiseBuffer(
  ctx: AudioContext,
  duration: number,
  shape: (p: number, t: number) => number,
): AudioBuffer {
  const size = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < size; i++) {
    const p = i / size;
    const t = i / ctx.sampleRate;
    data[i] = (Math.random() * 2 - 1) * shape(p, t);
  }
  return buffer;
}

export const setSoundEnabled = (enabled: boolean) => {
  soundEnabled = enabled;
  try {
    localStorage.setItem('tramvay_sound_enabled', enabled ? 'true' : 'false');
  } catch {
    // Ignore
  }

  if (!enabled) {
    stopMusicBed();
  } else {
    startMusicBed();
  }
};

export const getSoundEnabled = (): boolean => {
  if (typeof window === 'undefined') return true;
  try {
    const saved = localStorage.getItem('tramvay_sound_enabled');
    if (saved !== null) {
      soundEnabled = saved === 'true';
    }
  } catch {
    // Ignore
  }
  return soundEnabled;
};

// ==========================================
// 1. AMBIENT MUSIC BED
// ==========================================

// Fmaj7 -> Dm9 -> Bbmaj7 -> C9sus4, voiced low and warm.
const CHORD_PROGRESSIONS = [
  [174.61, 220.0, 261.63, 329.63, 349.23],
  [146.83, 220.0, 261.63, 293.66, 329.63],
  [116.54, 174.61, 233.08, 293.66, 349.23],
  [130.81, 196.0, 261.63, 293.66, 392.0],
];

let currentChordIndex = 0;

export const startMusicBed = () => {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  if (musicNodes.masterGain) return;

  try {
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.052, now + 2.4);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, now);
    filter.Q.value = 0.6;

    // Very slow filter breathing keeps the pad from feeling static.
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.055;
    lfoGain.gain.value = 85;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start(now);

    filter.connect(masterGain);
    connectOutput(masterGain, 0.28);

    musicNodes.masterGain = masterGain;
    musicNodes.filter = filter;
    musicNodes.lfo = lfo;
    musicNodes.lfoGain = lfoGain;

    const playChord = (frequencies: number[]) => {
      if (!musicNodes.masterGain || !audioCtx) return;

      const stopAt = audioCtx.currentTime + 0.9;
      musicNodes.oscillators.forEach((osc) => {
        try {
          osc.stop(stopAt);
        } catch {
          // Ignore
        }
      });
      musicNodes.oscillators = [];

      const chordTime = audioCtx.currentTime;
      frequencies.forEach((freq, idx) => {
        const osc = audioCtx!.createOscillator();
        const oscGain = audioCtx!.createGain();

        osc.type = idx === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, chordTime);
        osc.detune.value = (idx - 2) * 2.5;

        oscGain.gain.setValueAtTime(0, chordTime);
        oscGain.gain.linearRampToValueAtTime(0.19, chordTime + 1.25);
        oscGain.gain.exponentialRampToValueAtTime(0.13, chordTime + 4.8);

        osc.connect(oscGain);
        oscGain.connect(filter);
        osc.start(chordTime);
        musicNodes.oscillators.push(osc);
      });
    };

    playChord(CHORD_PROGRESSIONS[currentChordIndex]);

    musicNodes.intervalId = window.setInterval(() => {
      if (!soundEnabled || !musicNodes.masterGain) return;
      currentChordIndex = (currentChordIndex + 1) % CHORD_PROGRESSIONS.length;
      playChord(CHORD_PROGRESSIONS[currentChordIndex]);
    }, 5800);
  } catch {
    // Ignore audio context errors.
  }
};

export const stopMusicBed = () => {
  if (musicNodes.intervalId) {
    clearInterval(musicNodes.intervalId);
    musicNodes.intervalId = null;
  }

  // Detach state immediately so a quick off→on toggle can restart the bed.
  const masterGain = musicNodes.masterGain;
  const filter = musicNodes.filter;
  const lfo = musicNodes.lfo;
  const lfoGain = musicNodes.lfoGain;
  const oscillators = [...musicNodes.oscillators];

  musicNodes.masterGain = null;
  musicNodes.filter = null;
  musicNodes.lfo = null;
  musicNodes.lfoGain = null;
  musicNodes.oscillators = [];

  if (!masterGain || !audioCtx) return;

  const now = audioCtx.currentTime;
  try {
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.linearRampToValueAtTime(0.001, now + 1.6);
    setTimeout(() => {
      oscillators.forEach((osc) => {
        try {
          osc.stop();
        } catch {
          // Ignore
        }
      });
      try {
        lfo?.stop();
        lfo?.disconnect();
        lfoGain?.disconnect();
        filter?.disconnect();
        masterGain.disconnect();
      } catch {
        // Ignore
      }
    }, 1750);
  } catch {
    try {
      masterGain.disconnect();
    } catch {
      // Ignore
    }
  }
};

/** Duck the bed during action, then restore it. */
export const duckMusicBed = (duck: boolean) => {
  if (!musicNodes.masterGain || !audioCtx) return;
  const now = audioCtx.currentTime;
  try {
    const targetGain = duck ? 0.022 : 0.052;
    musicNodes.masterGain.gain.cancelScheduledValues(now);
    musicNodes.masterGain.gain.linearRampToValueAtTime(targetGain, now + 0.32);
  } catch {
    // Ignore
  }
};

// ==========================================
// 2. REFINED CUES
// ==========================================

/** A tiny, almost subliminal hover blip. */
export const playHoverTick = () => {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(1720, now);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.022, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

  osc.connect(gain);
  connectOutput(gain, 0.08);
  osc.start(now);
  osc.stop(now + 0.05);
};

/** Crisp brass-and-wood lever snap: noise transient + metallic ping. */
export const playLeverSnap = () => {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, 0.07, (p) => Math.pow(1 - p, 2) * 0.6);
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.setValueAtTime(1250, now);
  noiseFilter.Q.value = 1.1;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.075, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  connectOutput(noiseGain, 0.12);
  noise.start(now);

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(1180, now);
  osc.frequency.exponentialRampToValueAtTime(420, now + 0.09);
  gain.gain.setValueAtTime(0.11, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc.connect(gain);
  connectOutput(gain, 0.22);
  osc.start(now);
  osc.stop(now + 0.13);
};

/** Legacy alias kept for existing call sites. */
export const playTinyClick = () => {
  playLeverSnap();
};

/** Airy whoosh when a decision is locked in. */
export const playDecisionWhoosh = () => {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  duckMusicBed(true);
  const now = ctx.currentTime;
  const duration = 0.42;

  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, duration, (p) => Math.sin(p * Math.PI) * 0.42);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(380, now);
  filter.frequency.exponentialRampToValueAtTime(1750, now + duration * 0.7);
  filter.Q.value = 0.8;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.085, now + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  noise.connect(filter);
  filter.connect(gain);
  connectOutput(gain, 0.26);
  noise.start(now);

  const tone = ctx.createOscillator();
  const toneGain = ctx.createGain();
  tone.type = 'sine';
  tone.frequency.setValueAtTime(180, now);
  tone.frequency.exponentialRampToValueAtTime(92, now + duration);
  toneGain.gain.setValueAtTime(0.055, now);
  toneGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  tone.connect(toneGain);
  connectOutput(toneGain, 0.18);
  tone.start(now);
  tone.stop(now + duration + 0.02);

  setTimeout(() => duckMusicBed(false), 700);
};

/** Brass-like three-note reveal chime with a long, soft tail. */
export const playRevealChime = (intensity = 1) => {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

  notes.forEach((freq, idx) => {
    const t = now + idx * 0.11;
    const osc = ctx.createOscillator();
    const shimmer = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    shimmer.type = 'triangle';
    shimmer.frequency.setValueAtTime(freq * 2, t);
    shimmer.detune.value = 4;

    const shimmerGain = ctx.createGain();
    shimmerGain.gain.value = 0.18;

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.075 * intensity, t + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.95);

    osc.connect(gain);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(gain);
    connectOutput(gain, 0.45);

    osc.start(t);
    shimmer.start(t);
    osc.stop(t + 0.98);
    shimmer.stop(t + 0.98);
  });
};

/** Paper swish with a soft high shimmer — the signature scene transition. */
export const playPaperSwish = () => {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = 0.52;
  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, duration, (p) => Math.sin(p * Math.PI) * 0.5);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(520, now);
  filter.frequency.linearRampToValueAtTime(1450, now + duration * 0.5);
  filter.frequency.linearRampToValueAtTime(420, now + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.11, now);
  gain.gain.exponentialRampToValueAtTime(0.004, now + duration);

  noise.connect(filter);
  filter.connect(gain);
  connectOutput(gain, 0.2);
  noise.start(now);
};

export const playPremiumTransition = () => {
  playPaperSwish();
  playRevealChime(0.42);
};

/** Pencil scratch: low-passed noise with a gentle flutter. */
export const playPencilScratch = () => {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = 0.24;
  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, duration, (_p, t) => {
    const flutter = 0.5 + 0.5 * Math.sin(2 * Math.PI * 11 * t);
    return flutter * 0.35;
  });

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1400, now);
  filter.Q.value = 1.5;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.09, now);
  gain.gain.exponentialRampToValueAtTime(0.008, now + duration);

  noise.connect(filter);
  filter.connect(gain);
  connectOutput(gain, 0.12);
  noise.start(now);
};

/** Short sine blip for small UI toggles. */
export const playSoftTick = (step = 0) => {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const frequencies = [880, 1100, 1320];
  const freq = frequencies[step % frequencies.length];
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.075, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

  osc.connect(gain);
  connectOutput(gain, 0.18);
  osc.start(now);
  osc.stop(now + 0.115);
};

/** Sonic signature: sparse three-note bell motif. */
export const playSonicSignatureMotif = () => {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  duckMusicBed(true);
  const now = ctx.currentTime;
  const notes = [659.25, 783.99, 987.77]; // E5, G5, B5

  notes.forEach((freq, idx) => {
    const t = now + idx * 0.18;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.11, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

    osc.connect(gain);
    connectOutput(gain, 0.42);
    osc.start(t);
    osc.stop(t + 0.72);
  });

  setTimeout(() => duckMusicBed(false), 1100);
};

/** Tram acceleration: rising sine glide plus a breath of filtered noise. */
export const playRisingSweep = () => {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  duckMusicBed(true);
  const now = ctx.currentTime;
  const duration = 1.18;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(380, now);
  osc.frequency.exponentialRampToValueAtTime(960, now + duration);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.082, now + 0.16);
  gain.gain.linearRampToValueAtTime(0.082, now + duration * 0.82);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain);
  connectOutput(gain, 0.16);
  osc.start(now);
  osc.stop(now + duration + 0.04);

  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, duration, (p) => Math.sin(p * Math.PI) * 0.22);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(600, now);
  filter.frequency.linearRampToValueAtTime(2200, now + duration);
  filter.Q.value = 0.7;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.035, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  noise.connect(filter);
  filter.connect(noiseGain);
  connectOutput(noiseGain, 0.12);
  noise.start(now);

  setTimeout(() => duckMusicBed(false), 1450);
};

/** Muted low impact with a soft body and reverb tail. */
export const playLowThump = () => {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = 0.34;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(96, now);
  osc.frequency.exponentialRampToValueAtTime(38, now + duration);
  gain.gain.setValueAtTime(0.23, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain);
  connectOutput(gain, 0.26);
  osc.start(now);
  osc.stop(now + duration + 0.02);

  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, 0.12, (p) => Math.pow(1 - p, 3) * 0.3);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(220, now);
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.06, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  noise.connect(filter);
  filter.connect(noiseGain);
  connectOutput(noiseGain, 0.18);
  noise.start(now);

  setTimeout(() => duckMusicBed(false), 460);
};

/** Five-voice chord for payoff / summary. */
export const playChordSwell = () => {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const freqs = [174.61, 261.63, 349.23, 440.0, 523.25, 659.25];
  const duration = 2.7;

  freqs.forEach((freq, idx) => {
    const t = now + idx * 0.045;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = idx < 2 ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    osc.detune.value = (idx - 2.5) * 1.8;

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.055, t + 0.45);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    connectOutput(gain, 0.5);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  });
};

export const playSummaryReveal = () => {
  if (!soundEnabled) return;
  duckMusicBed(true);
  playChordSwell();
  playRevealChime(0.8);
  setTimeout(() => duckMusicBed(false), 2600);
};
