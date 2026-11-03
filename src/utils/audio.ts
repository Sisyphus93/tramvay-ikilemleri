/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Warm Paper Style Sound Synthesizer (Section 12 of Educational Animation Guide)
// Pure Web Audio API: 3 layers
// 1. Ambient Soft Music Bed (warm, soft chords changing slowly, sparse three-note bell motif)
// 2. Ducking control (automatically lowered by half during action / effects)
// 3. Precise, organic sound cues (pencil scratch, paper swish, tiny click, rising sweep, low thump, chord swell)

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

// Music Bed state
let musicNodes: {
  masterGain: GainNode | null;
  oscillators: OscillatorNode[];
  filter: BiquadFilterNode | null;
  intervalId: number | null;
} = {
  masterGain: null,
  oscillators: [],
  filter: null,
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
    audioCtx.resume();
  }
  return audioCtx;
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
// 1. AMBIENT MUSIC BED (Section 12: Layer 2)
// "Warm, soft chords changing slowly; a sparse three-note bell motif; optional low drone. Fades in over 2.4s"
// ==========================================

// Chord progression: Fmaj7 -> Dm9 -> Bbmaj7 -> C9sus4 (Warm Paper peaceful palette)
const CHORD_PROGRESSIONS = [
  [174.61, 220.0, 261.63, 329.63], // F3, A3, C4, E4 (Fmaj7)
  [146.83, 220.0, 261.63, 293.66], // D3, A3, C4, D4 (Dm7)
  [116.54, 174.61, 233.08, 293.66], // Bb2, F3, Bb3, D4 (Bb)
  [130.81, 196.0, 261.63, 293.66],  // C3, G3, C4, D4 (Csus)
];

let currentChordIndex = 0;

export const startMusicBed = () => {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  // If already playing, do nothing
  if (musicNodes.masterGain) return;

  try {
    const now = ctx.currentTime;

    // Master music bed gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    // Smooth fade in over 2.4s (as prescribed in Guide Section 12)
    masterGain.gain.linearRampToValueAtTime(0.045, now + 2.4);

    // Warm Lowpass Filter (muffles high harsh frequencies to give paper-like warmth)
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(380, now); // Warm mellow pad

    filter.connect(masterGain);
    masterGain.connect(ctx.destination);

    musicNodes.masterGain = masterGain;
    musicNodes.filter = filter;

    const playChord = (chordFrequencies: number[]) => {
      if (!musicNodes.masterGain || !audioCtx) return;

      // Stop previous oscillators smoothly
      musicNodes.oscillators.forEach((osc) => {
        try {
          osc.stop(audioCtx!.currentTime + 0.8);
        } catch {
          // Ignore
        }
      });
      musicNodes.oscillators = [];

      const chordTime = audioCtx.currentTime;

      chordFrequencies.forEach((freq) => {
        const osc = audioCtx!.createOscillator();
        const oscGain = audioCtx!.createGain();

        // Sine + gentle Triangle for warmth
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, chordTime);

        // Slow attack and breath envelope
        oscGain.gain.setValueAtTime(0, chordTime);
        oscGain.gain.linearRampToValueAtTime(0.25, chordTime + 1.2);
        oscGain.gain.exponentialRampToValueAtTime(0.18, chordTime + 4.5);

        osc.connect(oscGain);
        oscGain.connect(filter);

        osc.start(chordTime);
        musicNodes.oscillators.push(osc);
      });
    };

    // Play initial chord
    playChord(CHORD_PROGRESSIONS[currentChordIndex]);

    // Slowly cycle chords every 5.5 seconds
    musicNodes.intervalId = window.setInterval(() => {
      if (!soundEnabled || !musicNodes.masterGain) return;
      currentChordIndex = (currentChordIndex + 1) % CHORD_PROGRESSIONS.length;
      playChord(CHORD_PROGRESSIONS[currentChordIndex]);
    }, 5500);
  } catch {
    // Ignore audio context errors
  }
};

export const stopMusicBed = () => {
  if (musicNodes.intervalId) {
    clearInterval(musicNodes.intervalId);
    musicNodes.intervalId = null;
  }

  if (musicNodes.masterGain && audioCtx) {
    const now = audioCtx.currentTime;
    try {
      // Fade out over 2 seconds
      musicNodes.masterGain.gain.linearRampToValueAtTime(0.001, now + 1.8);
      setTimeout(() => {
        musicNodes.oscillators.forEach((osc) => {
          try {
            osc.stop();
          } catch {
            // Ignore
          }
        });
        musicNodes.oscillators = [];
        musicNodes.masterGain = null;
        musicNodes.filter = null;
      }, 2000);
    } catch {
      musicNodes.masterGain = null;
    }
  }
};

// Duck music bed by ~50% during action / dialogue (Section 12: "Ducked by roughly half")
export const duckMusicBed = (duck: boolean) => {
  if (!musicNodes.masterGain || !audioCtx) return;
  const now = audioCtx.currentTime;
  try {
    const targetGain = duck ? 0.02 : 0.045;
    musicNodes.masterGain.gain.cancelScheduledValues(now);
    musicNodes.masterGain.gain.linearRampToValueAtTime(targetGain, now + 0.35);
  } catch {
    // Ignore
  }
};

// ==========================================
// 2. TIMED CUES & EFFECTS (Section 12)
// ==========================================

// Sonic Signature: Sparse Three-Note Bell Motif
export const playSonicSignatureMotif = () => {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [659.25, 783.99, 987.77]; // E5, G5, B5

  notes.forEach((freq, idx) => {
    const t = now + idx * 0.18;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.14, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.56);
  });
};

// Paper Swish: Soft low-passed noise burst (~0.5s) for scene transitions
export const playPaperSwish = () => {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = 0.48;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    const p = i / bufferSize;
    const env = Math.sin(p * Math.PI);
    data[i] = (Math.random() * 2 - 1) * env * 0.5;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(650, now);
  filter.frequency.linearRampToValueAtTime(1200, now + duration * 0.5);
  filter.frequency.linearRampToValueAtTime(450, now + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.005, now + duration);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start(now);
};

// Pencil Scratch: Low-passed noise with gentle 11Hz flutter (drawing lines)
export const playPencilScratch = () => {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = 0.24;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    const t = i / ctx.sampleRate;
    const flutter = 0.5 + 0.5 * Math.sin(2 * Math.PI * 11 * t);
    data[i] = (Math.random() * 2 - 1) * flutter * 0.35;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1400, now);
  filter.Q.setValueAtTime(1.5, now);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.11, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start(now);
};

// Tiny Click: 1.5 kHz click of 70ms for switch lever
export const playTinyClick = () => {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(1500, now);
  osc.frequency.exponentialRampToValueAtTime(550, now + 0.05);

  gain.gain.setValueAtTime(0.16, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.075);
};

// Soft Tick: Short sine blip of ~90ms at 880, 1100, 1320 Hz
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
  gain.gain.linearRampToValueAtTime(0.11, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.092);
};

// Rising Sweep: Sine gliding 420 to 940 Hz over 1.2s (trolley accelerating)
export const playRisingSweep = () => {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  duckMusicBed(true);

  const now = ctx.currentTime;
  const duration = 1.15;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(420, now);
  osc.frequency.exponentialRampToValueAtTime(940, now + duration);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.095, now + 0.15);
  gain.gain.linearRampToValueAtTime(0.095, now + duration * 0.85);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.05);
};

// Low Thump / Muted Thud: 95 Hz sine with fast decay of ~0.3s (never harsh buzzers)
export const playLowThump = () => {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = 0.28;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(95, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + duration);

  gain.gain.setValueAtTime(0.24, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.02);

  // Restore music bed volume after impact
  setTimeout(() => {
    duckMusicBed(false);
  }, 400);
};

// Chord Swell: Four-note chord for payoff / summary
export const playChordSwell = () => {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const freqs = [349.23, 440.0, 523.25, 659.25]; // F4, A4, C5, E5
  const duration = 2.4;

  freqs.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + idx * 0.04);

    gain.gain.setValueAtTime(0, now + idx * 0.04);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + idx * 0.04);
    osc.stop(now + duration);
  });
};
