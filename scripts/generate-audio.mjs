/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Procedural foley renderer for "Absürt Tramvay İkilemleri".
 *
 * World: a printed dossier — paper, ink, steel, old Istanbul tram.
 * Renders every game sound offline with pure Node (no dependencies),
 * deterministically (seeded RNG), at 44.1 kHz mono 16-bit WAV into
 * audio-src/raw/, then packages:
 *
 *   - public/audio/sfx.json    sprite manifest { sprite: { name: [startMs, durMs] }, formats, ... }
 *   - public/audio/sfx.wav     concatenated sprite (downsampled to 32 kHz if needed for size)
 *   - public/audio/ambience.wav  seamless 28 s loop (crossfaded from a 30 s render)
 *   - ogg/m4a variants when ffmpeg is on PATH (formats list picks them first)
 *
 * Usage:
 *   node scripts/generate-audio.mjs            # generate missing raws + package
 *   node scripts/generate-audio.mjs --force    # regenerate every raw (deterministic)
 *
 * To replace a sound with a better recording: drop a WAV with the same file
 * name into audio-src/raw/ (any sample rate / bit depth / channel count; it is
 * downmixed and resampled) and re-run this script WITHOUT --force.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'audio-src', 'raw');
const OUT_DIR = path.join(ROOT, 'public', 'audio');

const SR = 44100;
const BASE_SEED = 0x72616d76; // "ramv"
const FORCE = process.argv.includes('--force');

/* =========================================================================
 * RNG
 * ========================================================================= */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashName(name) {
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Per-sound RNG so sounds are independent of render order. */
function rngFor(name) {
  return mulberry32((BASE_SEED ^ hashName(name)) >>> 0);
}

const rnd = (rng, min, max) => min + rng() * (max - min);
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];

/* =========================================================================
 * Buffer helpers
 * ========================================================================= */

const buf = (seconds) => new Float64Array(Math.max(1, Math.round(seconds * SR)));

function addAt(dst, src, offsetSec = 0, gain = 1) {
  const off = Math.max(0, Math.round(offsetSec * SR));
  const n = Math.min(dst.length - off, src.length);
  for (let i = 0; i < n; i++) dst[off + i] += src[i] * gain;
}

function scale(data, g) {
  for (let i = 0; i < data.length; i++) data[i] *= g;
  return data;
}

function mul(a, b) {
  const out = new Float64Array(a.length);
  if (typeof b === 'number') {
    for (let i = 0; i < a.length; i++) out[i] = a[i] * b;
  } else {
    for (let i = 0; i < a.length; i++) out[i] = a[i] * b[i];
  }
  return out;
}

function fadeIn(data, sec) {
  const n = Math.min(data.length, Math.round(sec * SR));
  for (let i = 0; i < n; i++) data[i] *= i / n;
  return data;
}

function fadeOut(data, sec) {
  const n = Math.min(data.length, Math.round(sec * SR));
  for (let i = 0; i < n; i++) data[data.length - 1 - i] *= i / n;
  return data;
}

function peak(data) {
  let p = 0;
  for (let i = 0; i < data.length; i++) p = Math.max(p, Math.abs(data[i]));
  return p;
}

function rms(data) {
  let s = 0;
  for (let i = 0; i < data.length; i++) s += data[i] * data[i];
  return Math.sqrt(s / data.length);
}

/** One-pole DC blocker (~10 Hz highpass). */
function dcBlock(data) {
  const out = new Float64Array(data.length);
  const a = 1 - Math.exp((-2 * Math.PI * 10) / SR);
  let dc = 0;
  let x1 = 0;
  for (let i = 0; i < data.length; i++) {
    dc += a * (data[i] - dc);
    out[i] = data[i] - dc;
    x1 = out[i];
  }
  void x1;
  return out;
}

function normalize(data, peakDb) {
  data = dcBlock(data);
  const p = peak(data);
  if (!Number.isFinite(p)) throw new Error('NaN/Inf in rendered audio — recipe bug');
  if (p < 1e-9) throw new Error('silent render — recipe bug');
  const target = Math.pow(10, peakDb / 20);
  return scale(data, target / p);
}

function saturate(data, drive = 1.6) {
  const norm = Math.tanh(drive);
  for (let i = 0; i < data.length; i++) data[i] = Math.tanh(drive * data[i]) / norm;
  return data;
}

function dbToLin(db) {
  return Math.pow(10, db / 20);
}

/* =========================================================================
 * Noise
 * ========================================================================= */

function whiteNoise(n, rng) {
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = rng() * 2 - 1;
  return out;
}

/** Brown (integrated white) noise, DC-blocked. */
function brownNoise(n, rng) {
  const out = new Float64Array(n);
  let last = 0;
  for (let i = 0; i < n; i++) {
    const w = rng() * 2 - 1;
    last = (last + 0.02 * w) / 1.02; // leaky integrator
    out[i] = last;
  }
  // normalize then DC-block
  const p = peak(out) || 1;
  scale(out, 1 / p);
  let dc = 0;
  const a = 1 - Math.exp((-2 * Math.PI * 8) / SR); // 8 Hz DC blocker
  for (let i = 0; i < n; i++) {
    dc += a * (out[i] - dc);
    out[i] -= dc;
  }
  return out;
}

/* =========================================================================
 * Filters (RBJ cookbook biquads + one-poles)
 * ========================================================================= */

function biquadCoefs(type, f0, Q, gainDb = 0) {
  const w0 = (2 * Math.PI * f0) / SR;
  const cosw = Math.cos(w0);
  const sinw = Math.sin(w0);
  const alpha = sinw / (2 * Q);
  const A = Math.pow(10, gainDb / 40);
  let b0, b1, b2, a0, a1, a2;
  switch (type) {
    case 'lowpass':
      b0 = (1 - cosw) / 2; b1 = 1 - cosw; b2 = (1 - cosw) / 2;
      a0 = 1 + alpha; a1 = -2 * cosw; a2 = 1 - alpha;
      break;
    case 'highpass':
      b0 = (1 + cosw) / 2; b1 = -(1 + cosw); b2 = (1 + cosw) / 2;
      a0 = 1 + alpha; a1 = -2 * cosw; a2 = 1 - alpha;
      break;
    case 'bandpass': // constant 0 dB peak gain
      b0 = alpha; b1 = 0; b2 = -alpha;
      a0 = 1 + alpha; a1 = -2 * cosw; a2 = 1 - alpha;
      break;
    case 'peaking':
      b0 = 1 + alpha * A; b1 = -2 * cosw; b2 = 1 - alpha * A;
      a0 = 1 + alpha / A; a1 = -2 * cosw; a2 = 1 - alpha / A;
      break;
    default:
      throw new Error('unknown biquad type ' + type);
  }
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

function applyBiquad(data, c) {
  const out = new Float64Array(data.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < data.length; i++) {
    const x0 = data[i];
    const y0 = c.b0 * x0 + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    out[i] = y0;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0;
  }
  return out;
}

const lp = (data, f0, Q = 0.707) => applyBiquad(data, biquadCoefs('lowpass', f0, Q));
const hp = (data, f0, Q = 0.707) => applyBiquad(data, biquadCoefs('highpass', f0, Q));
const bp = (data, f0, Q = 1.0) => applyBiquad(data, biquadCoefs('bandpass', f0, Q));

/** Per-sample-varying lowpass (one-pole) — for filter sweeps. */
function onePoleLPSweep(data, f0, f1, Qunused) {
  void Qunused;
  const out = new Float64Array(data.length);
  let y = 0;
  const n = data.length;
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0;
    const fc = f0 * Math.pow(f1 / f0, t); // exponential sweep
    const a = 1 - Math.exp((-2 * Math.PI * fc) / SR);
    y += a * (data[i] - y);
    out[i] = y;
  }
  return out;
}

/* =========================================================================
 * Envelopes
 * ========================================================================= */

function envExpDecay(n, tauSec, delaySec = 0) {
  const out = new Float64Array(n);
  const d = Math.round(delaySec * SR);
  for (let i = d; i < n; i++) out[i] = Math.exp(-(i - d) / SR / tauSec);
  return out;
}

/** Trapezoid: linear attack, hold, exponential-ish release. */
function envTrapezoid(n, attackSec, holdSec, releaseSec) {
  const out = new Float64Array(n);
  const a = Math.max(1, Math.round(attackSec * SR));
  const h = Math.round(holdSec * SR);
  const r = Math.max(1, Math.round(releaseSec * SR));
  for (let i = 0; i < n; i++) {
    if (i < a) out[i] = i / a;
    else if (i < a + h) out[i] = 1;
    else {
      const k = Math.min(1, (i - a - h) / r);
      out[i] = Math.pow(1 - k, 2.2);
    }
  }
  return out;
}

/** Smooth random amplitude modulation (random-walk, lowpassed). */
function envRandomWalk(n, rng, rateHz, depth) {
  const out = new Float64Array(n);
  let v = 0;
  const step = rateHz / SR;
  for (let i = 0; i < n; i++) {
    v += (rng() * 2 - 1) * step * 6;
    v = Math.max(-1, Math.min(1, v * 0.9995));
    out[i] = 1 - depth + depth * (0.5 + 0.5 * v);
  }
  return out;
}

/* =========================================================================
 * Oscillators / additive synthesis
 * ========================================================================= */

/**
 * Add a damped sinusoidal partial (inharmonic metals live here).
 * opts: freq, amp, tauSec (exp decay), startSec, detuneCents, chirpTo (optional end freq).
 */
function addPartial(dst, rng, opts) {
  const { freq, amp = 1, tauSec = 0.1, startSec = 0 } = opts;
  const detune = opts.detuneCents !== undefined ? opts.detuneCents : rnd(rng, -6, 6);
  const f = freq * Math.pow(2, detune / 1200);
  const chirpTo = opts.chirpTo || f;
  const start = Math.round(startSec * SR);
  const dur = Math.min(dst.length - start, Math.round(tauSec * 9 * SR));
  let ph = rng() * Math.PI * 2;
  const fadeN = Math.min(Math.round(0.0015 * SR), Math.floor(dur / 4));
  for (let i = 0; i < dur; i++) {
    const t = i / SR;
    const ft = f * Math.pow(chirpTo / f, Math.min(1, i / dur));
    ph += (2 * Math.PI * ft) / SR;
    let env = Math.exp(-t / tauSec);
    if (i < fadeN) env *= i / fadeN; // de-click
    dst[start + i] += Math.sin(ph) * amp * env;
  }
}

/** Exponential sine sweep (random start phase unless given). */
function sweepSine(n, f0, f1, rng, phaseStart) {
  const out = new Float64Array(n);
  let ph = phaseStart === undefined ? rng() * Math.PI * 2 : phaseStart;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const f = f0 * Math.pow(f1 / f0, t);
    ph += (2 * Math.PI * f) / SR;
    out[i] = Math.sin(ph);
  }
  return out;
}

/** Bandlimited-ish periodic voice via additive harmonics. */
function periodicVoice(n, freq, type, rng, { amp = 1, harmonics = 40, detuneCents = 0 } = {}) {
  const out = new Float64Array(n);
  const f = freq * Math.pow(2, detuneCents / 1200);
  const maxH = Math.min(harmonics, Math.floor(SR / 2 / f));
  for (let h = 1; h <= maxH; h++) {
    let a = 0;
    if (type === 'saw') a = amp / h;
    else if (type === 'square') a = h % 2 === 1 ? amp / h : 0;
    else if (type === 'triangle') a = h % 2 === 1 ? (amp / (h * h)) * (h % 4 === 1 ? 1 : -1) : 0;
    else a = h === 1 ? amp : 0; // sine
    if (a === 0) continue;
    const ph = rng() * Math.PI * 2;
    const w = (2 * Math.PI * f * h) / SR;
    for (let i = 0; i < n; i++) out[i] += a * Math.sin(w * i + ph);
  }
  return out;
}

/* =========================================================================
 * Reverb — Schroeder: 4 parallel damped feedback combs → 2 series allpasses
 * ========================================================================= */

function reverb(data, { decay = 0.6, wet = 0.2, predelay = 0.008, damp = 0.35 } = {}) {
  const n = data.length;
  const pd = Math.round(predelay * SR);
  const input = new Float64Array(n + pd);
  input.set(data, pd);

  const combDelays = [1557, 1617, 1491, 1422].map((d) => Math.round((d * SR) / 44100));
  const apDelays = [225, 556].map((d) => Math.round((d * SR) / 44100));

  let wetOut = new Float64Array(input.length + SR); // room for tails

  // parallel combs with one-pole damping in the feedback loop
  const combSum = new Float64Array(wetOut.length);
  for (const d of combDelays) {
    const g = Math.pow(10, (-3 * d) / (decay * SR)); // loop gain for ~RT60=decay
    const bufD = new Float64Array(d);
    let idx = 0;
    let lpState = 0;
    const aD = 1 - damp;
    for (let i = 0; i < wetOut.length; i++) {
      const outS = bufD[idx];
      lpState = outS * aD + lpState * damp;
      bufD[idx] = (i < input.length ? input[i] : 0) + lpState * g;
      idx = (idx + 1) % d;
      combSum[i] += outS;
    }
  }
  scale(combSum, 0.25);

  // series allpasses
  let signal = combSum;
  for (const d of apDelays) {
    const g = 0.5;
    const bufD = new Float64Array(d);
    let idx = 0;
    const out = new Float64Array(signal.length);
    for (let i = 0; i < signal.length; i++) {
      const delayed = bufD[idx];
      const x = signal[i];
      out[i] = delayed - g * x;
      bufD[idx] = x + g * delayed;
      idx = (idx + 1) % d;
    }
    signal = out;
  }
  wetOut = signal;

  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = data[i] * (1 - wet) + wetOut[i] * wet * 1.6;
  }
  return out;
}

/* =========================================================================
 * Grain helper (paper textures)
 * ========================================================================= */

/** Dense irregular noise grains bandpassed — cardstock rustle. */
function grainNoise(n, rng, { centerHz, q = 0.9, grainMs = [2, 7], density = 900, ampRange = [0.15, 1] } = {}) {
  const raw = new Float64Array(n);
  const grains = Math.round((density * n) / SR);
  for (let g = 0; g < grains; g++) {
    const pos = Math.floor(rng() * n);
    const len = Math.max(8, Math.round(rnd(rng, grainMs[0], grainMs[1]) * SR / 1000));
    const amp = rnd(rng, ampRange[0], ampRange[1]);
    for (let i = 0; i < len && pos + i < n; i++) {
      const w = Math.sin((Math.PI * i) / len); // raised-sine grain window
      raw[pos + i] += (rng() * 2 - 1) * w * amp;
    }
  }
  return bp(raw, centerHz, q);
}

/* =========================================================================
 * WAV I/O
 * ========================================================================= */

function writeWav(filePath, data, sampleRate = SR) {
  const n = data.length;
  const bytes = Buffer.alloc(44 + n * 2);
  bytes.write('RIFF', 0);
  bytes.writeUInt32LE(36 + n * 2, 4);
  bytes.write('WAVE', 8);
  bytes.write('fmt ', 12);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20); // PCM
  bytes.writeUInt16LE(1, 22); // mono
  bytes.writeUInt32LE(sampleRate, 24);
  bytes.writeUInt32LE(sampleRate * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36);
  bytes.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, data[i]));
    bytes.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, bytes);
}

function readWav(filePath) {
  const b = fs.readFileSync(filePath);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('not a RIFF/WAVE file: ' + filePath);
  }
  let pos = 12;
  let fmt = null;
  let dataChunk = null;
  while (pos + 8 <= b.length) {
    const id = b.toString('ascii', pos, pos + 4);
    const size = b.readUInt32LE(pos + 4);
    if (id === 'fmt ') fmt = { audioFormat: b.readUInt16LE(pos + 8), channels: b.readUInt16LE(pos + 10), sampleRate: b.readUInt32LE(pos + 12), bits: b.readUInt16LE(pos + 22) };
    if (id === 'data') dataChunk = { offset: pos + 8, size };
    pos += 8 + size + (size % 2);
  }
  if (!fmt || !dataChunk) throw new Error('bad WAV chunks: ' + filePath);
  const bytesPerSample = fmt.bits / 8;
  const frames = Math.floor(dataChunk.size / (bytesPerSample * fmt.channels));
  const out = new Float64Array(frames);
  for (let i = 0; i < frames; i++) {
    let acc = 0;
    for (let c = 0; c < fmt.channels; c++) {
      const o = dataChunk.offset + (i * fmt.channels + c) * bytesPerSample;
      let v = 0;
      if (fmt.audioFormat === 1 && fmt.bits === 16) v = b.readInt16LE(o) / 32768;
      else if (fmt.audioFormat === 1 && fmt.bits === 24) v = ((b[o] | (b[o + 1] << 8) | (b[o + 2] << 16)) << 8 >> 8) / 8388608;
      else if (fmt.audioFormat === 1 && fmt.bits === 8) v = (b[o] - 128) / 128;
      else if (fmt.audioFormat === 1 && fmt.bits === 32) v = b.readInt32LE(o) / 2147483648;
      else if (fmt.audioFormat === 3 && fmt.bits === 32) v = b.readFloatLE(o);
      else if (fmt.audioFormat === 3 && fmt.bits === 64) v = b.readDoubleLE(o);
      else throw new Error('unsupported WAV format ' + fmt.audioFormat + '/' + fmt.bits);
      acc += v;
    }
    out[i] = acc / fmt.channels;
  }
  return { data: out, sampleRate: fmt.sampleRate };
}

/**
 * Windowed-sinc resampler (Blackman window, 64 taps).
 * wrap=true uses periodic boundary conditions — required for the ambience
 * loop, whose beginning must interpolate with its end.
 */
function resample(x, srIn, srOut, wrap = false) {
  if (srIn === srOut) return x;
  const ratio = srOut / srIn;
  const nOut = Math.round(x.length * ratio);
  const out = new Float64Array(nOut);
  const taps = 64;
  const half = taps / 2;
  const cutoff = Math.min(1, ratio) * 0.92; // anti-alias
  const at = (idx) => {
    if (wrap) return x[((idx % x.length) + x.length) % x.length];
    return idx >= 0 && idx < x.length ? x[idx] : 0;
  };
  for (let i = 0; i < nOut; i++) {
    const t = i / ratio; // input position
    const center = Math.floor(t);
    const frac = t - center;
    let acc = 0;
    for (let k = -half + 1; k <= half; k++) {
      const d = k - frac; // distance in input samples
      const xArg = Math.PI * d * cutoff;
      const sinc = Math.abs(xArg) < 1e-9 ? cutoff : (Math.sin(xArg) / xArg) * cutoff;
      const w = 0.42 - 0.5 * Math.cos((2 * Math.PI * (k + half - 1)) / (taps - 1)) + 0.08 * Math.cos((4 * Math.PI * (k + half - 1)) / (taps - 1));
      acc += at(center + k) * sinc * w;
    }
    out[i] = acc;
  }
  return out;
}

/* =========================================================================
 * SOUND RECIPES
 * Every sound = transient layer + body layer + tail layer, with a few ms of
 * seeded random variation per variant.
 * ========================================================================= */

const recipes = {};

/* ---- press: muted UI press, bandpassed click + low body + tiny room ---- */
recipes.press = (rng) => {
  const n = buf(0.15);
  const click = bp(whiteNoise(Math.round(0.005 * SR), rng), rnd(rng, 1425, 1575), 1.1);
  addAt(n, mul(click, envExpDecay(click.length, 0.002)), rnd(rng, 0.0005, 0.0015), 1.0);
  const body = mul(sweepSine(Math.round(0.09 * SR), rnd(rng, 114, 126), 96, rng), envExpDecay(Math.round(0.09 * SR), 0.018));
  addAt(n, body, 0.001, 0.72);
  const tail = mul(whiteNoise(Math.round(0.05 * SR), rng), envExpDecay(Math.round(0.05 * SR), 0.012));
  addAt(n, lp(bp(tail, 700, 0.6), 1800), 0.004, 0.06);
  let out = reverb(n, { decay: 0.28, wet: 0.1, predelay: 0.006 });
  out = lp(out, 3200, 0.7); // muted, not bright
  fadeOut(out, 0.012);
  return normalize(out, -6);
};

/* ---- hover_1..3: dry mechanical micro-tick ---- */
function hoverVariant(rng, resFreq) {
  const n = buf(0.05);
  const tickLen = Math.round(rnd(rng, 0.002, 0.003) * SR);
  const tick = hp(whiteNoise(tickLen, rng), rnd(rng, 1700, 2100), 0.8);
  addAt(n, mul(tick, envExpDecay(tickLen, 0.001)), rnd(rng, 0.0004, 0.001), 0.95);
  addPartial(n, rng, { freq: resFreq * rnd(rng, 0.95, 1.05), amp: 0.34, tauSec: rnd(rng, 0.005, 0.009), startSec: 0.0008 });
  fadeOut(n, 0.006);
  return normalize(n, -6); // dry, quiet (engine plays it at low gain)
}
recipes.hover_1 = (rng) => hoverVariant(rng, 2100);
recipes.hover_2 = (rng) => hoverVariant(rng, 2550);
recipes.hover_3 = (rng) => hoverVariant(rng, 2950);

/* ---- switch_1..2: two micro-clicks "tk-clack" with metal resonances ---- */
function switchVariant(rng, gapMs) {
  const n = buf(0.12);
  const clickAt = (t0, amp, f1, f2) => {
    const cl = Math.round(0.0035 * SR);
    const click = bp(whiteNoise(cl, rng), rnd(rng, 2300, 2700), 0.9);
    addAt(n, mul(click, envExpDecay(cl, 0.0012)), t0, amp);
    addPartial(n, rng, { freq: f1, amp: amp * 0.8, tauSec: 0.016, startSec: t0 + 0.0005 });
    addPartial(n, rng, { freq: f2, amp: amp * 0.5, tauSec: 0.009, startSec: t0 + 0.0005 });
  };
  clickAt(rnd(rng, 0.0004, 0.001), 1.0, rnd(rng, 855, 945), rnd(rng, 2280, 2520));
  clickAt(gapMs / 1000, 0.82, rnd(rng, 855, 945), rnd(rng, 2280, 2520));
  const out = reverb(n, { decay: 0.18, wet: 0.07, predelay: 0.004 });
  fadeOut(out, 0.008);
  return normalize(out, -6);
}
recipes.switch_1 = (rng) => switchVariant(rng, rnd(rng, 26, 32));
recipes.switch_2 = (rng) => switchVariant(rng, rnd(rng, 34, 40));

/* ---- paper_1..3: cardstock rustle, grainy bandpassed noise + low-mid body ---- */
function paperVariant(rng, durSec, centerHz) {
  const n = buf(durSec);
  const grains = grainNoise(n.length, rng, { centerHz, q: rnd(rng, 0.7, 1.1), density: rnd(rng, 700, 1100), grainMs: [2, 7], ampRange: [0.12, 1] });
  const am = envRandomWalk(n.length, rng, rnd(rng, 7, 16), 0.55);
  let body = mul(grains, am);
  // overall soft shape: attack, uneven sustain, release
  const shape = envTrapezoid(n.length, rnd(rng, 0.025, 0.045), durSec * 0.55, durSec * 0.35);
  body = mul(body, shape);
  // low-mid cardstock body (not only hiss)
  const lowBody = mul(
    mul(lp(whiteNoise(n.length, rng), rnd(rng, 380, 520), 0.7), envRandomWalk(n.length, rng, 5, 0.5)),
    shape,
  );
  const out = new Float64Array(n.length);
  addAt(out, body, 0, 0.9);
  addAt(out, lowBody, 0, 0.22);
  let fin = reverb(out, { decay: 0.22, wet: 0.05, predelay: 0.005 });
  fin = mul(fin, envTrapezoid(fin.length, 0.004, durSec, 0.015)); // safety fades
  return normalize(fin, -6);
}
recipes.paper_1 = (rng) => paperVariant(rng, 0.46, rnd(rng, 3300, 3700));
recipes.paper_2 = (rng) => paperVariant(rng, 0.52, rnd(rng, 4100, 4500));
recipes.paper_3 = (rng) => paperVariant(rng, 0.58, rnd(rng, 4900, 5400));

/* ---- lever_clack_1..2: big CLACK + lower CHUNK + short reverb ---- */
function leverClackVariant(rng, chunkDelay) {
  const n = buf(0.5);
  // CLACK: sharp noise transient + three metal resonances
  const trLen = Math.round(0.006 * SR);
  const tr = mul(hp(whiteNoise(trLen, rng), 900, 0.7), envExpDecay(trLen, 0.0016));
  addAt(n, tr, 0.0005, 1.0);
  addPartial(n, rng, { freq: 400 * rnd(rng, 0.96, 1.04), amp: 0.95, tauSec: rnd(rng, 0.035, 0.055), startSec: 0.001 });
  addPartial(n, rng, { freq: 1100 * rnd(rng, 0.96, 1.04), amp: 0.62, tauSec: rnd(rng, 0.024, 0.038), startSec: 0.001 });
  addPartial(n, rng, { freq: 2700 * rnd(rng, 0.95, 1.05), amp: 0.4, tauSec: rnd(rng, 0.014, 0.022), startSec: 0.001 });
  // CHUNK: damped low thump + noise burst, 90–130 ms later
  const chunkLen = Math.round(0.24 * SR);
  const chunkSine = mul(sweepSine(chunkLen, rnd(rng, 68, 74), 48, rng), envExpDecay(chunkLen, 0.045));
  const chunkNoise = mul(lp(whiteNoise(Math.round(0.05 * SR), rng), 320, 0.8), envExpDecay(Math.round(0.05 * SR), 0.012));
  addAt(n, chunkSine, chunkDelay, 0.62);
  addAt(n, chunkNoise, chunkDelay, 0.5);
  let out = saturate(n, 1.35);
  out = reverb(out, { decay: 0.42, wet: 0.17, predelay: 0.012 });
  fadeOut(out, 0.02);
  return normalize(out, -6);
}
recipes.lever_clack_1 = (rng) => leverClackVariant(rng, rnd(rng, 0.09, 0.105));
recipes.lever_clack_2 = (rng) => leverClackVariant(rng, rnd(rng, 0.11, 0.13));

/* ---- bell: modal brass tram bell, ding-ding ---- */
recipes.bell = (rng) => {
  const n = buf(1.2);
  const f0 = rnd(rng, 862, 898);
  const ratios = [1, 2.0, 2.76, 5.4, 8.9];
  const amps = [1, 0.55, 0.42, 0.28, 0.18];
  const taus = [0.19, 0.11, 0.085, 0.055, 0.038]; // higher partials die faster; fundamental sustains past 600 ms
  const strike = (t0, amp) => {
    const trLen = Math.round(0.0025 * SR);
    addAt(n, mul(hp(whiteNoise(trLen, rng), 2800, 0.7), envExpDecay(trLen, 0.0008)), t0, 0.5 * amp);
    ratios.forEach((r, i) => {
      addPartial(n, rng, {
        freq: f0 * r * rnd(rng, 0.998, 1.002),
        amp: amps[i] * amp * rnd(rng, 0.9, 1.1),
        tauSec: taus[i],
        startSec: t0 + 0.0008,
      });
    });
  };
  strike(0.002, 1.0);
  strike(0.182, 0.72); // ding-ding, second softer
  let out = saturate(n, 1.25);
  out = reverb(out, { decay: 0.7, wet: 0.14, predelay: 0.014 });
  fadeOut(out, 0.03);
  return normalize(out, -6);
};

/* ---- air_brake: the "pssshh" ---- */
recipes.air_brake = (rng) => {
  const n = buf(0.8);
  const noise = whiteNoise(n.length, rng);
  // upward tilt: crossfade a lower cutoff into a brighter one over ~180 ms
  const early = hp(noise, 1300, 0.7);
  const late = hp(noise, 2800, 0.7);
  const tiltLen = Math.round(0.18 * SR);
  const hiss = new Float64Array(n.length);
  for (let i = 0; i < n.length; i++) {
    const w = i < tiltLen ? 1 - Math.pow(i / tiltLen, 0.7) : 0;
    hiss[i] = late[i] + (early[i] - late[i]) * w * 0.9;
  }
  const airiness = mul(bp(noise, 5200, 0.6), 0.35);
  const env = envTrapezoid(n.length, rnd(rng, 0.02, 0.035), 0.2, 0.5);
  const flutter = envRandomWalk(n.length, rng, 6, 0.12);
  const out = new Float64Array(n.length);
  addAt(out, mul(mul(hiss, env), flutter), 0, 1.0);
  addAt(out, mul(airiness, env), 0, 0.5);
  let fin = reverb(out, { decay: 0.4, wet: 0.1, predelay: 0.01 });
  fadeIn(fin, 0.003);
  fadeOut(fin, 0.025);
  return normalize(fin, -6);
};

/* ---- brake_squeal: scratchy detuned high partials + noise ---- */
recipes.brake_squeal = (rng) => {
  const n = buf(0.6);
  const base = [1850, 2380, 2900, 3180].map((f) => f * rnd(rng, 0.97, 1.03));
  const voice = new Float64Array(n.length);
  base.forEach((f, i) => {
    const lfoF = rnd(rng, 0.7, 2.1);
    const lfoPh = rng() * Math.PI * 2;
    const amp = [1, 0.8, 0.62, 0.5][i] * rnd(rng, 0.9, 1.1);
    let ph = rng() * Math.PI * 2;
    for (let j = 0; j < n.length; j++) {
      const t = j / SR;
      const glide = 1 - 0.045 * (t / 0.6); // slight downward pitch glide
      const drift = 1 + 0.005 * Math.sin(2 * Math.PI * lfoF * t + lfoPh);
      ph += (2 * Math.PI * f * glide * drift) / SR;
      voice[j] += Math.sin(ph) * amp;
    }
  });
  scale(voice, 0.22);
  const scratch = mul(bp(whiteNoise(n.length, rng), 2600, 1.4), 0.2);
  const env = envTrapezoid(n.length, 0.06, 0.3, 0.2);
  let out = mul(new Float64Array(n.length).map((_, i) => voice[i] + scratch[i]), env);
  out = saturate(out, 1.5);
  out = reverb(out, { decay: 0.45, wet: 0.12, predelay: 0.01 });
  fadeIn(out, 0.004);
  fadeOut(out, 0.02);
  return normalize(out, -6);
};

/* ---- drone: ominous brass bed ---- */
recipes.drone = (rng) => {
  const n = buf(2.0);
  const freqs = [55, 82.5, 110, 55.4]; // last is the detuned twin of 55
  const amps = [1, 0.62, 0.5, 0.8];
  const voice = new Float64Array(n.length);
  freqs.forEach((f, i) => {
    const v = periodicVoice(n.length, f, 'saw', rng, { amp: amps[i], detuneCents: rnd(rng, -8, 8) });
    for (let j = 0; j < n.length; j++) voice[j] += v[j];
  });
  scale(voice, 0.2);
  // slow lowpass movement 320 → 640 → 460 (dark but with a little brass growl)
  let filtered = onePoleLPSweep(voice, 320, 640);
  filtered = onePoleLPSweep(filtered, 640, 460);
  filtered = applyBiquad(filtered, biquadCoefs('lowpass', 520, 1.0));
  const env = envTrapezoid(n.length, 0.42, 0.7, 0.85);
  let out = mul(filtered, env);
  out = saturate(out, 1.8); // brass bite
  out = reverb(out, { decay: 1.1, wet: 0.2, predelay: 0.02 });
  fadeIn(out, 0.01);
  fadeOut(out, 0.05);
  return normalize(out, -6);
};

/* ---- clack_1..3: sharp dry rail-joint clack ---- */
function clackVariant(rng, resFreq) {
  const n = buf(0.12);
  const trLen = Math.round(0.003 * SR);
  addAt(n, mul(hp(whiteNoise(trLen, rng), 1100, 0.7), envExpDecay(trLen, 0.001)), 0.0003, 1.0);
  addPartial(n, rng, { freq: resFreq * rnd(rng, 0.96, 1.04), amp: 0.85, tauSec: rnd(rng, 0.018, 0.026), startSec: 0.0006 });
  addPartial(n, rng, { freq: resFreq * 2.7 * rnd(rng, 0.96, 1.04), amp: 0.2, tauSec: 0.01, startSec: 0.0006 });
  let out = reverb(n, { decay: 0.14, wet: 0.05, predelay: 0.003 });
  fadeOut(out, 0.008);
  return normalize(out, -6);
}
recipes.clack_1 = (rng) => clackVariant(rng, 1250);
recipes.clack_2 = (rng) => clackVariant(rng, 1620);
recipes.clack_3 = (rng) => clackVariant(rng, 1980);

/* ---- impact_muffled_1..2: crash heard through a wall ---- */
function impactVariant(rng) {
  const n = buf(0.6);
  const t0 = rnd(rng, 0.0008, 0.004);
  const burstLen = Math.round(rnd(rng, 0.08, 0.12) * SR);
  addAt(n, mul(lp(whiteNoise(burstLen, rng), rnd(rng, 420, 560), 0.8), envExpDecay(burstLen, rnd(rng, 0.018, 0.028))), t0, 1.0);
  const fStart = rnd(rng, 82, 98);
  const fEnd = rnd(rng, 31, 39);
  const sw = mul(sweepSine(Math.round(0.3 * SR), fStart, fEnd, rng), envExpDecay(Math.round(0.3 * SR), rnd(rng, 0.06, 0.085)));
  addAt(n, sw, t0, 0.95);
  // dull metal rattle
  [1750, 2350, 3050].forEach((f) => {
    addPartial(n, rng, { freq: f * rnd(rng, 0.9, 1.1), amp: rnd(rng, 0.06, 0.12), tauSec: rnd(rng, 0.025, 0.05), startSec: rnd(rng, 0.015, 0.06) });
  });
  const rattleNoise = mul(bp(whiteNoise(Math.round(0.08 * SR), rng), rnd(rng, 2000, 2800), 1.2), envExpDecay(Math.round(0.08 * SR), rnd(rng, 0.014, 0.024)));
  addAt(n, rattleNoise, rnd(rng, 0.02, 0.045), rnd(rng, 0.08, 0.14));
  let out = lp(n, rnd(rng, 820, 950), 0.7); // through the wall
  out = saturate(out, 1.3);
  out = reverb(out, { decay: rnd(rng, 0.55, 0.7), wet: 0.24, predelay: 0.018 });
  fadeOut(out, 0.025);
  return normalize(out, -3);
}
recipes.impact_muffled_1 = (rng) => impactVariant(rng);
recipes.impact_muffled_2 = (rng) => impactVariant(rng);

/* ---- crash_comic: exaggerated cartoon crash + screech + record scratch ---- */
recipes.crash_comic = (rng) => {
  const n = buf(1.2);
  // 1) big layered crash at t=0
  const crashLen = Math.round(0.5 * SR);
  const crashNoise = mul(hp(whiteNoise(Math.round(0.14 * SR), rng), 350, 0.6), envExpDecay(Math.round(0.14 * SR), 0.03));
  addAt(n, crashNoise, 0.001, 0.9);
  const metalRatios = [1, 1.47, 1.83, 2.31, 2.76, 3.14, 3.87, 4.22, 5.1, 6.3];
  metalRatios.forEach((r, i) => {
    addPartial(n, rng, {
      freq: 320 * r * rnd(rng, 0.97, 1.03),
      amp: (0.5 - i * 0.035) * rnd(rng, 0.85, 1.15),
      tauSec: 0.15 - i * 0.011,
      startSec: 0.001,
    });
  });
  addAt(n, mul(sweepSine(Math.round(0.4 * SR), 600, 90, rng), envExpDecay(Math.round(0.4 * SR), 0.1)), 0.001, 0.55);
  // 2) rising screech t=0.15, 1.5k → 3.5k glide with vibrato
  const screechLen = Math.round(0.4 * SR);
  const screech = new Float64Array(screechLen);
  let ph = 0;
  for (let i = 0; i < screechLen; i++) {
    const t = i / SR;
    const f = 1500 * Math.pow(3500 / 1500, t / 0.35) * (1 + 0.03 * Math.sin(2 * Math.PI * 6.3 * t));
    ph += (2 * Math.PI * f) / SR;
    const env = Math.min(1, t / 0.08) * Math.exp(-Math.max(0, t - 0.3) / 0.05);
    screech[i] = (Math.sin(ph) * 0.7 + Math.sin(ph * 2.02) * 0.3) * env;
  }
  addAt(n, screech, 0.15, 0.34);
  // 3) record-scratch gesture at t=0.68 (~150 ms): pitch-wobbled filtered noise
  const scratchDur = 0.15;
  const scratchLen = Math.round(scratchDur * SR);
  const loopSrc = bp(whiteNoise(Math.round(0.04 * SR), rng), 1200, 2.0);
  const scratch = new Float64Array(scratchLen);
  for (let i = 0; i < scratchLen; i++) {
    const t = i / SR;
    const rate = 1 + 1.3 * Math.sin(2 * Math.PI * 13.5 * t) * Math.exp(-t / 0.12); // back-and-forth wobble
    const pos = Math.abs(((t * rate * SR) % loopSrc.length + loopSrc.length) % loopSrc.length);
    const i0 = Math.floor(pos);
    const frac = pos - i0;
    const a = loopSrc[i0 % loopSrc.length];
    const b = loopSrc[(i0 + 1) % loopSrc.length];
    const env = Math.min(1, t / 0.01) * (1 - t / scratchDur);
    scratch[i] = (a + (b - a) * frac) * env;
  }
  addAt(n, scratch, 0.68, 0.5);
  addPartial(n, rng, { freq: 300, amp: 0.12, tauSec: 0.05, startSec: 0.68, chirpTo: 190 });
  let out = lp(n, 9000, 0.7); // not harsh
  out = saturate(out, 1.4);
  out = reverb(out, { decay: 0.6, wet: 0.17, predelay: 0.012 });
  fadeOut(out, 0.03);
  return normalize(out, -6);
};

/* ---- stamp_1..2: THE ink stamp. Weighty rubber thock, no ring. ---- */
function stampVariant(rng, P) {
  const n = buf(0.4);
  // soft-rubber transient (~3 ms, dark)
  const trLen = Math.round(P.trMs * SR);
  const tr = mul(bp(whiteNoise(trLen, rng), rnd(rng, P.trFreq * 0.9, P.trFreq * 1.1), 0.8), envExpDecay(trLen, 0.0011));
  addAt(n, lp(tr, 2600, 0.7), rnd(rng, 0.0006, 0.0018), P.trAmp);
  // heavy low body: sine sweep down
  const bodyLen = Math.round(P.bodyDur * SR);
  const body = mul(sweepSine(bodyLen, P.f0 * rnd(rng, 0.97, 1.03), P.f1, rng), envExpDecay(bodyLen, P.bodyTau * rnd(rng, 0.9, 1.1)));
  addAt(n, body, rnd(rng, 0.001, 0.0035), 0.92);
  // woody desk resonance
  addPartial(n, rng, { freq: P.deskF, amp: 0.5, tauSec: 0.03, startSec: 0.002 });
  addPartial(n, rng, { freq: P.deskF * 1.56, amp: 0.26 * P.ring, tauSec: 0.02, startSec: 0.002 });
  addPartial(n, rng, { freq: P.deskF * 2.2, amp: 0.12 * P.ring, tauSec: 0.012, startSec: 0.002 });
  // paper/ink contact fizz (very short, quiet)
  const fizz = mul(bp(whiteNoise(Math.round(0.02 * SR), rng), 3200, 1.0), envExpDecay(Math.round(0.02 * SR), 0.005));
  addAt(n, fizz, rnd(rng, 0.001, 0.004), P.fizz);
  let out = lp(n, P.lpHz, 0.7);
  out = saturate(out, 1.3);
  out = reverb(out, { decay: 0.22, wet: 0.09, predelay: 0.004 }); // very short dry room
  fadeOut(out, 0.02);
  return normalize(out, -3);
}
// 1: the heavy press, deep sweep, dead desk.
recipes.stamp_1 = (rng) => stampVariant(rng, { trMs: 0.0035, trFreq: 1100, trAmp: 1.15, f0: 140, f1: 54, bodyDur: 0.16, bodyTau: 0.042, deskF: 198, ring: 0.8, fizz: 0.12, lpHz: 2400 });
// 2: a touch lighter and quicker, brighter desk, more ink fizz.
recipes.stamp_2 = (rng) => stampVariant(rng, { trMs: 0.0028, trFreq: 1350, trAmp: 0.95, f0: 126, f1: 63, bodyDur: 0.125, bodyTau: 0.03, deskF: 214, ring: 1.5, fizz: 0.22, lpHz: 2900 });

/* ---- sting_relief: warm Fmaj7 → C resolve ---- */
recipes.sting_relief = (rng) => {
  const n = buf(1.5);
  const chordTone = (freqs, t0, durSec, amp) => {
    const len = Math.round(durSec * SR);
    const seg = new Float64Array(len);
    freqs.forEach((f) => {
      const v1 = periodicVoice(len, f, 'triangle', rng, { amp: 1, detuneCents: rnd(rng, -6, 6) });
      const v2 = periodicVoice(len, f, 'saw', rng, { amp: 0.4, detuneCents: rnd(rng, -9, 9) });
      for (let i = 0; i < len; i++) seg[i] += (v1[i] + v2[i]) * amp;
    });
    const env = envTrapezoid(len, 0.14, durSec * 0.5, durSec * 0.45);
    addAt(n, mul(seg, env), t0, 1);
  };
  chordTone([174.61, 220.0, 261.63, 329.63], 0.0, 0.95, 0.16); // Fmaj7
  chordTone([261.63, 329.63, 392.0, 523.25], 0.62, 0.88, 0.15); // C
  let out = onePoleLPSweep(n, 2100, 1500);
  out = saturate(out, 1.35);
  out = reverb(out, { decay: 1.0, wet: 0.22, predelay: 0.02 });
  fadeIn(out, 0.02);
  fadeOut(out, 0.06);
  return normalize(out, -6);
};

/* ---- sting_dread: low dissonant cluster ---- */
recipes.sting_dread = (rng) => {
  const n = buf(1.5);
  const freqs = [73.42, 77.78, 103.83, 146.83]; // D2, Eb2 (min 2nd), G#2 (tritone), D3
  const amps = [1, 0.85, 0.6, 0.4];
  let voice = new Float64Array(n.length);
  freqs.forEach((f, i) => {
    // slow detune drift per voice
    const len = n.length;
    const v = new Float64Array(len);
    const cents = rnd(rng, -10, 10);
    const driftF = rnd(rng, 0.15, 0.35);
    const driftPh = rng() * Math.PI * 2;
    const harmonics = Math.min(24, Math.floor(SR / 2 / f));
    for (let h = 1; h <= harmonics; h++) {
      let ph = rng() * Math.PI * 2;
      const ampH = (amps[i] / h) * 0.5;
      for (let j = 0; j < len; j++) {
        const t = j / SR;
        const det = 1 + cents / 1200 + 0.002 * Math.sin(2 * Math.PI * driftF * t + driftPh);
        ph += (2 * Math.PI * f * h * det) / SR;
        v[j] += Math.sin(ph) * ampH; // saw-ish via all harmonics
      }
    }
    const acc = new Float64Array(len);
    for (let j = 0; j < len; j++) acc[j] = voice[j] + v[j];
    voice = acc;
  });
  let out = onePoleLPSweep(voice, 240, 360);
  out = onePoleLPSweep(out, 360, 280);
  const env = envTrapezoid(n.length, 0.5, 0.5, 0.42); // creeping attack
  out = mul(out, env);
  out = saturate(out, 1.6);
  out = reverb(out, { decay: 1.3, wet: 0.26, predelay: 0.025 });
  fadeIn(out, 0.02);
  fadeOut(out, 0.06);
  return normalize(out, -6);
};

/* ---- sting_absurd: off-kilter comedic brass "bwah bwah bwaaaah" ---- */
recipes.sting_absurd = (rng) => {
  const n = buf(1.5);
  const notes = [
    { t0: 0.02, f0: 233, f1: 190, dur: 0.3, cents: 14 },  // Bb3 falls
    { t0: 0.4, f0: 196, f1: 158, dur: 0.3, cents: -18 },  // G3 falls
    { t0: 0.78, f0: 174, f1: 96, dur: 0.62, cents: 9 },   // F3 long rubbery bend
  ];
  notes.forEach((note, ni) => {
    const len = Math.round(note.dur * SR);
    const seg = new Float64Array(len);
    // two detuned voices (square + saw), slightly out of tune
    let ph1 = 0, ph2 = 0;
    const f1Base = note.f0 * Math.pow(2, note.cents / 1200);
    const f2Base = note.f0 * Math.pow(2, (note.cents - 22) / 1200);
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      const p = Math.min(1, t / note.dur);
      let bend = Math.pow(note.f1 / note.f0, p);
      if (ni === 2) bend *= 1 + 0.025 * Math.sin(2 * Math.PI * 5.2 * Math.max(0, t - 0.35)); // rubbery wobble
      const fA = f1Base * bend;
      const fB = f2Base * bend;
      ph1 += (2 * Math.PI * fA) / SR;
      ph2 += (2 * Math.PI * fB) / SR;
      const sq = Math.sign(Math.sin(ph1)) * 0.5;
      const saw = 2 * ((ph2 / (2 * Math.PI)) % 1) - 1;
      seg[i] = (sq * 0.6 + saw * 0.4) * 0.3;
    }
    // resonant lowpass sweeping down per note = the "bwah"
    let shaped = onePoleLPSweep(seg, 1500, 420);
    shaped = applyBiquad(shaped, biquadCoefs('peaking', 480, 3.5, 6));
    const env = envTrapezoid(len, 0.022, note.dur * 0.45, note.dur * 0.42);
    addAt(n, mul(shaped, env), note.t0, 1.0);
  });
  let out = saturate(n, 1.5);
  out = reverb(out, { decay: 0.8, wet: 0.18, predelay: 0.015 });
  fadeIn(out, 0.01);
  fadeOut(out, 0.05);
  return normalize(out, -6);
};

/* ---- ambience: 30 s render, crossfaded to a seamless 28 s loop ---- */
function renderAmbience(rng) {
  const DUR = 30;
  const n = buf(DUR);
  // The loop seam is chosen later from a ±100 ms zone around 28 s. Impulsive
  // content (crackle ticks, clatter pairs) is kept away from that whole zone
  // so the wrap-around stays smoother than the file's average sample step.
  const ZLO = Math.round(27.9 * SR) - Math.round(0.075 * SR);
  const ZHI = Math.round(28.1 * SR) + Math.round(0.075 * SR);

  // 1) brown-noise room hum, lowpass ~120 Hz
  const hum = lp(brownNoise(n.length, rng), 120, 0.7);
  addAt(n, mul(hum, envRandomWalk(n.length, rng, 0.07, 0.25)), 0, 0.55);

  // 2) faint mains tone ~50 Hz + harmonics, very slow wobble
  [50, 100, 150].forEach((f, i) => {
    const amp = [0.16, 0.06, 0.03][i];
    const ph = rng() * Math.PI * 2;
    const wobF = rnd(rng, 0.04, 0.11);
    const wobPh = rng() * Math.PI * 2;
    for (let j = 0; j < n.length; j++) {
      const t = j / SR;
      n[j] += Math.sin(2 * Math.PI * f * t + ph) * amp * (0.85 + 0.15 * Math.sin(2 * Math.PI * wobF * t + wobPh));
    }
  });

  // 3) sparse vinyl crackle ticks
  const tickCount = Math.round(rnd(rng, 220, 320)); // ~8/s over 30 s
  for (let k = 0; k < tickCount; k++) {
    const pos = Math.floor(Math.pow(rng(), 0.9) * n.length);
    if (pos > ZLO && pos < ZHI) continue; // keep the seam zone clean
    const len = Math.round(rnd(rng, 0.0003, 0.0016) * SR);
    const amp = Math.pow(rng(), 2.4) * 0.09 + 0.004;
    const tick = hp(whiteNoise(len + 8, rng), rnd(rng, 900, 2200), 0.7);
    for (let i = 0; i < len && pos + i < n.length; i++) {
      n[pos + i] += tick[i] * amp * (1 - i / len);
    }
  }

  // 4) distant rhythmic clatter: soft clack pair every 0.9 s, far away
  const pairLen = Math.round(0.5 * SR);
  const makePair = () => {
    const p = new Float64Array(pairLen);
    const hit = (t0, amp) => {
      const l = Math.round(0.012 * SR);
      const tr = mul(lp(whiteNoise(l, rng), 500, 0.8), envExpDecay(l, 0.004));
      addAt(p, tr, t0, amp);
      addPartial(p, rng, { freq: rnd(rng, 130, 190), amp: amp * 0.7, tauSec: 0.02, startSec: t0 });
    };
    hit(0.01, 1);
    hit(rnd(rng, 0.11, 0.13), 0.8);
    let out = lp(p, 340, 0.7); // heavily lowpassed = distance
    out = reverb(out, { decay: 1.7, wet: 0.72, predelay: 0.045 }); // reverb pushed back
    return out;
  };
  const pair = makePair();
  let tPos = rnd(rng, 0.1, 0.4);
  while (tPos < DUR - 0.8) {
    const posSamples = tPos * SR;
    const nearSeam = posSamples + 0.5 * SR > ZLO && posSamples < ZHI;
    if (!nearSeam) addAt(n, pair, tPos, rnd(rng, 0.05, 0.085));
    tPos += 0.9 + rnd(rng, -0.04, 0.04);
  }

  // master shape: gentle band, soft saturation, overall very low contrast
  let out = lp(n, 7500, 0.7);
  out = hp(out, 24, 0.7);
  out = saturate(out, 1.15);

  // 5) seamless loop: pick the trim point M (~28 s, multiple of 441 samples so
  // the 32 kHz package length is an exact integer) with the calmest waveform,
  // then equal-power crossfade the tail into the head and trim to M.
  let M = 0;
  let bestRough = Infinity;
  for (let mc = Math.ceil((27.9 * SR) / 441) * 441; mc <= Math.floor((28.1 * SR) / 441) * 441; mc += 441) {
    const rough =
      Math.abs(out[mc] - out[mc - 1]) +
      Math.abs(out[mc + 1] - out[mc]) +
      Math.abs(out[mc - 1] - out[mc - 2]);
    if (rough < bestRough) {
      bestRough = rough;
      M = mc;
    }
  }
  const xf = out.length - M; // ≈ 1.9–2.1 s
  const looped = new Float64Array(M);
  for (let i = 0; i < M; i++) {
    if (i < xf) {
      const w = i / xf;
      const u = Math.sqrt(w); // fade in head material
      const v = Math.sqrt(1 - w); // fade out tail material
      looped[i] = out[i] * u + out[i + M] * v;
    } else {
      looped[i] = out[i];
    }
  }

  // loudness: RMS ≈ -26 dBFS, true peak < -3 dBFS
  const targetRms = dbToLin(-26);
  let r = rms(looped);
  scale(looped, targetRms / (r || 1e-9));
  let guard = 0;
  while (peak(looped) > dbToLin(-3.1) && guard < 3) {
    // soft-limit peaks, then restore RMS
    saturate(looped, 1.0 + guard);
    scale(looped, targetRms / (rms(looped) || 1e-9));
    guard++;
  }
  const finalScale = Math.min(1, dbToLin(-3.1) / (peak(looped) || 1e-9));
  scale(looped, finalScale);
  return looped;
}

/* =========================================================================
 * RENDER + PACKAGE
 * ========================================================================= */

const SOUND_ORDER = [
  'press',
  'hover_1', 'hover_2', 'hover_3',
  'switch_1', 'switch_2',
  'paper_1', 'paper_2', 'paper_3',
  'lever_clack_1', 'lever_clack_2',
  'bell',
  'air_brake',
  'brake_squeal',
  'drone',
  'clack_1', 'clack_2', 'clack_3',
  'impact_muffled_1', 'impact_muffled_2',
  'crash_comic',
  'stamp_1', 'stamp_2',
  'sting_relief', 'sting_dread', 'sting_absurd',
];

function ffmpegAvailable() {
  try {
    const r = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return r.status === 0;
  } catch {
    return false;
  }
}

function main() {
  fs.mkdirSync(RAW_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  /* ---- 1. render raws ---- */
  console.log('Rendering raw samples (44.1 kHz mono 16-bit) → audio-src/raw/');
  for (const name of SOUND_ORDER) {
    const file = path.join(RAW_DIR, name + '.wav');
    if (fs.existsSync(file) && !FORCE) {
      console.log(`  = ${name}.wav (exists, kept — use --force to regenerate)`);
      continue;
    }
    const rng = rngFor(name);
    const data = recipes[name](rng);
    writeWav(file, data, SR);
    console.log(`  + ${name}.wav  ${(data.length / SR).toFixed(2)}s  peak ${(20 * Math.log10(peak(data) || 1e-9)).toFixed(1)} dBFS`);
  }
  {
    const file = path.join(RAW_DIR, 'ambience.wav');
    if (fs.existsSync(file) && !FORCE) {
      console.log('  = ambience.wav (exists, kept)');
    } else {
      const data = renderAmbience(rngFor('ambience'));
      writeWav(file, data, SR);
      console.log(`  + ambience.wav  ${(data.length / SR).toFixed(2)}s loop  RMS ${(20 * Math.log10(rms(data))).toFixed(1)} dBFS`);
    }
  }

  /* ---- 2. sprite ---- */
  console.log('Packaging sprite → public/audio/');
  const rawSounds = SOUND_ORDER.map((name) => {
    const { data, sampleRate } = readWav(path.join(RAW_DIR, name + '.wav'));
    // bring user-supplied replacements up to the working rate
    const at441 = sampleRate === SR ? data : resample(data, sampleRate, SR);
    return { name, data: at441 };
  });

  const total441 = rawSounds.reduce((a, s) => a + s.data.length + Math.round(0.1 * SR), 0);
  const sizeAt441 = (total441 * 2) / (1024 * 1024);
  const packSR = sizeAt441 > 1.45 ? 32000 : SR; // keep sprite comfortably under ~1.5 MB

  // Resample EACH sound before normalization: downsampling shaves transient
  // peaks, so normalizing afterwards keeps every slice at its target dBFS.
  const sounds = rawSounds.map(({ name, data }) => {
    const targetDb = name.startsWith('stamp_') || name.startsWith('impact_') ? -3 : -6;
    const packed = packSR === SR ? data : resample(data, SR, packSR);
    return { name, data: normalize(packed, targetDb) };
  });
  console.log(`  sprite: ${(total441 / SR).toFixed(2)}s → ${packSR / 1000} kHz (${((sounds.reduce((a, s) => a + s.data.length, 0) * 2) / 1048576 + 0.05).toFixed(2)} MB)`);

  const GAP = Math.round(0.1 * packSR);
  const totalSamples = sounds.reduce((a, s) => a + s.data.length + GAP, 0);
  const sprite = new Float64Array(totalSamples);
  const spriteMap = {};
  let cursor = 0;
  for (const s of sounds) {
    spriteMap[s.name] = [Math.round((cursor / packSR) * 1000), Math.round((s.data.length / packSR) * 1000)];
    sprite.set(s.data, cursor);
    cursor += s.data.length + GAP;
  }
  writeWav(path.join(OUT_DIR, 'sfx.wav'), sprite, packSR);

  /* ---- 3. ambience ---- */
  const ambRaw = readWav(path.join(RAW_DIR, 'ambience.wav'));
  const amb = ambRaw.sampleRate === SR ? ambRaw.data : resample(ambRaw.data, ambRaw.sampleRate, SR);
  // quiet low-content loop; 32 kHz keeps the repo light. wrap=true: periodic
  // boundaries preserve the seamless loop through the resampler.
  const ambPack = resample(amb, SR, 32000, true);
  writeWav(path.join(OUT_DIR, 'ambience.wav'), ambPack, 32000);
  console.log(`  ambience: ${(amb.length / SR).toFixed(2)}s loop → 32 kHz, RMS ${(20 * Math.log10(rms(ambPack))).toFixed(1)} dBFS, peak ${(20 * Math.log10(peak(ambPack))).toFixed(1)} dBFS`);

  /* ---- 4. optional compressed formats via ffmpeg ---- */
  let formats = ['wav'];
  if (ffmpegAvailable()) {
    const enc = (input, output, args) => {
      const r = spawnSync('ffmpeg', ['-y', '-i', input, ...args, output], { stdio: 'ignore' });
      if (r.status === 0) return true;
      console.warn(`  ! ffmpeg failed for ${output}`);
      return false;
    };
    const okOgg =
      enc(path.join(OUT_DIR, 'sfx.wav'), path.join(OUT_DIR, 'sfx.ogg'), ['-c:a', 'libvorbis', '-q:a', '4']) &&
      enc(path.join(OUT_DIR, 'ambience.wav'), path.join(OUT_DIR, 'ambience.ogg'), ['-c:a', 'libvorbis', '-q:a', '3']);
    const okM4a =
      enc(path.join(OUT_DIR, 'sfx.wav'), path.join(OUT_DIR, 'sfx.m4a'), ['-c:a', 'aac', '-b:a', '112k']) &&
      enc(path.join(OUT_DIR, 'ambience.wav'), path.join(OUT_DIR, 'ambience.m4a'), ['-c:a', 'aac', '-b:a', '96k']);
    formats = [...(okOgg ? ['ogg'] : []), ...(okM4a ? ['m4a'] : []), 'wav'];
  } else {
    console.log('  ffmpeg not found — shipping WAV only (engine format detection uses WAV as last resort).');
  }

  /* ---- 5. manifest ---- */
  const manifest = {
    generatedBy: 'scripts/generate-audio.mjs (procedural, no third-party material)',
    sampleRate: packSR,
    formats,
    sprite: spriteMap,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'sfx.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`  sfx.json: ${Object.keys(spriteMap).length} slices, formats=[${formats.join(',')}]`);
  console.log('Done.');
}

main();
