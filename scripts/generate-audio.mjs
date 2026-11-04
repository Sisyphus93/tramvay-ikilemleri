#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Offline, deterministic foley renderer for "Absürt Tramvay İkilemleri".
 *
 * There is no third-party audio in this project: every sample is synthesised
 * here from noise, damped resonators, additive oscillators and a small
 * Schroeder reverb. The renderer is pure Node (no dependencies) and seeded, so
 * `npm run audio:build` reproduces byte-identical WAVs on any machine.
 *
 * Pipeline:
 *   1. render each SFX voice at 44.1 kHz mono -> audio-src/raw/<name>.wav
 *   2. normalise each voice (peak target), fade in/out, DC-block
 *   3. resample to 32 kHz, concatenate with 100 ms gaps -> public/audio/sfx.wav
 *   4. write public/audio/sfx.json  ({ sprite: { name: [startMs, durMs] } })
 *   5. render 30 s seamless ambience loop -> public/audio/ambience.wav @ -26 LUFS
 *
 * Usage: node scripts/generate-audio.mjs [--only=ambience]
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const RAW_DIR = path.join(ROOT, 'audio-src', 'raw');
const OUT_DIR = path.join(ROOT, 'public', 'audio');

const RAW_SR = 44100;
const SPRITE_SR = 32000;
const SR = RAW_SR;
const GAP_MS = 100;
const AMBIENCE_SECONDS = 30;
const AMBIENCE_LUFS = -26;

/* ------------------------------------------------------------------ */
/* Deterministic RNG                                                   */
/* ------------------------------------------------------------------ */

const hashSeed = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const makeRng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const gaussFrom = (rng) => {
  const u = Math.max(rng(), 1e-9);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

/** ±pct multiplicative jitter around base. */
const v = (rng, base, pct) => base * (1 + (rng() * 2 - 1) * pct);
/** additive jitter in seconds. */
const vd = (rng, base, maxSec) => base + (rng() * 2 - 1) * maxSec;

/* ------------------------------------------------------------------ */
/* Buffers                                                             */
/* ------------------------------------------------------------------ */

const B = (sec) => new Float32Array(Math.max(1, Math.ceil(sec * SR)));

const white = (n, rng) => {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = gaussFrom(rng) * 0.32;
  return out;
};

const brown = (n, rng, leak = 0.02) => {
  const out = new Float32Array(n);
  let y = 0;
  for (let i = 0; i < n; i++) {
    y = (y + leak * gaussFrom(rng)) / (1 + leak);
    out[i] = y;
  }
  return out;
};

const add = (target, source, offsetSec = 0, gain = 1) => {
  const off = Math.round(offsetSec * SR);
  for (let i = 0; i < source.length; i++) {
    const j = i + off;
    if (j < 0) continue;
    if (j >= target.length) break;
    target[j] += source[i] * gain;
  }
  return target;
};

const applyEnv = (x, fn) => {
  for (let i = 0; i < x.length; i++) x[i] *= fn(i / SR, i);
  return x;
};

/* ------------------------------------------------------------------ */
/* Filters (RBJ biquads + one-pole)                                    */
/* ------------------------------------------------------------------ */

function biquad(type, freq, Q = 0.7071, gainDb = 0, sampleRate = SR) {
  const nyq = sampleRate / 2;
  const f = Math.min(Math.max(freq, 10), nyq * 0.98);
  const w0 = (2 * Math.PI * f) / sampleRate;
  const cw = Math.cos(w0);
  const sw = Math.sin(w0);
  const alpha = sw / (2 * Math.max(Q, 0.0001));
  const A = Math.pow(10, gainDb / 40);
  let b0;
  let b1;
  let b2;
  let a0;
  let a1;
  let a2;
  switch (type) {
    case 'lowpass':
      b0 = (1 - cw) / 2;
      b1 = 1 - cw;
      b2 = (1 - cw) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cw;
      a2 = 1 - alpha;
      break;
    case 'highpass':
      b0 = (1 + cw) / 2;
      b1 = -(1 + cw);
      b2 = (1 + cw) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cw;
      a2 = 1 - alpha;
      break;
    case 'bandpass':
      b0 = alpha;
      b1 = 0;
      b2 = -alpha;
      a0 = 1 + alpha;
      a1 = -2 * cw;
      a2 = 1 - alpha;
      break;
    case 'highshelf':
      b0 = A * (A + 1 + (A - 1) * cw + 2 * Math.sqrt(A) * alpha);
      b1 = -2 * A * (A - 1 + (A + 1) * cw);
      b2 = A * (A + 1 + (A - 1) * cw - 2 * Math.sqrt(A) * alpha);
      a0 = A + 1 - (A - 1) * cw + 2 * Math.sqrt(A) * alpha;
      a1 = 2 * (A - 1 - (A + 1) * cw);
      a2 = A + 1 - (A - 1) * cw - 2 * Math.sqrt(A) * alpha;
      break;
    case 'peak':
      b0 = 1 + alpha * A;
      b1 = -2 * cw;
      b2 = 1 - alpha * A;
      a0 = 1 + alpha / A;
      a1 = -2 * cw;
      a2 = 1 - alpha / A;
      break;
    default:
      throw new Error(`unknown filter ${type}`);
  }
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

function applyBiquad(x, c) {
  const y = new Float32Array(x.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const xin = x[i];
    const yv = c.b0 * xin + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    x2 = x1;
    x1 = xin;
    y2 = y1;
    y1 = yv;
    y[i] = yv;
  }
  return y;
}

const lowpass = (x, f, Q) => applyBiquad(x, biquad('lowpass', f, Q));
const highpass = (x, f, Q) => applyBiquad(x, biquad('highpass', f, Q));
const bandpass = (x, f, Q) => applyBiquad(x, biquad('bandpass', f, Q));
const peaking = (x, f, Q, gainDb) => applyBiquad(x, biquad('peak', f, Q, gainDb));

/** Time varying biquad: coefficients refreshed every 32 samples. */
function biquadTV(x, type, freqAt, Q) {
  const y = new Float32Array(x.length);
  let c = biquad(type, freqAt(0), Q);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < x.length; i++) {
    if (i % 32 === 0) c = biquad(type, freqAt(i / SR), Q);
    const xin = x[i];
    const yv = c.b0 * xin + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    x2 = x1;
    x1 = xin;
    y2 = y1;
    y1 = yv;
    y[i] = yv;
  }
  return y;
}

/** One-pole DC / rumble blocker. */
function dcBlock(x, fc = 18) {
  const a = 1 - Math.exp((-2 * Math.PI * fc) / SR);
  const y = new Float32Array(x.length);
  let lp = 0;
  for (let i = 0; i < x.length; i++) {
    lp += a * (x[i] - lp);
    y[i] = x[i] - lp;
  }
  return y;
}

/* ------------------------------------------------------------------ */
/* Generators                                                          */
/* ------------------------------------------------------------------ */

/**
 * Filtered noise burst with a fast attack and exponential decay.
 * Noise is filtered first, then shaped, then saturated lightly: that ordering
 * keeps the transient crisp while the decay reads as a "real" material.
 */
function noiseBurst(rng, dur, opts = {}) {
  const n = Math.max(2, Math.round(dur * SR));
  let x = white(n, rng);
  if (opts.hp) x = highpass(x, opts.hp, opts.hpQ ?? 0.7071);
  if (opts.lp) x = lowpass(x, opts.lp, opts.lpQ ?? 0.7071);
  if (opts.bp) x = bandpass(x, opts.bp, opts.bpQ ?? 1.2);
  if (opts.peak) x = peaking(x, opts.peak, opts.peakQ ?? 1.2, opts.peakDb ?? 6);
  const attack = opts.attack ?? 0.0006;
  const tau = opts.tau ?? dur / 3;
  const flat = opts.flat ?? 0;
  const amp = opts.amp ?? 1;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const a = attack > 0 ? Math.min(1, t / attack) : 1;
    const d = tau > 0 ? Math.exp(-Math.max(0, t - flat) / tau) : 1;
    x[i] *= a * d * amp;
  }
  if (opts.peakNorm !== undefined) {
    const p = peakOf(x);
    if (p > 1e-9) {
      const g = opts.peakNorm / p;
      for (let i = 0; i < n; i++) x[i] *= g;
    }
  }
  return x;
}

/** Damped sine (optionally with a little 2nd harmonic for weight). */
function dampedSine(freq, tau, amp, seconds, opts = {}) {
  const n = Math.max(2, Math.round(seconds * SR));
  const out = new Float32Array(n);
  const phase = opts.phase ?? 0;
  const h2 = opts.h2 ?? 0;
  const attack = opts.attack ?? 0.001;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const e = Math.exp(-t / tau) * Math.min(1, t / attack);
    let s = Math.sin(2 * Math.PI * freq * t + phase);
    if (h2) s += h2 * Math.sin(4 * Math.PI * freq * t + phase * 1.7);
    out[i] = amp * e * s;
  }
  return out;
}

/** Additive modal resonator: inharmonic partials with independent decays. */
function addModal(out, startSec, partials, opts = {}) {
  const start = Math.round(startSec * SR);
  const len = out.length;
  for (const p of partials) {
    const freq = p.freq;
    if (freq >= SR / 2 - 100) continue;
    const w = (2 * Math.PI * freq) / SR;
    const phase = p.phase ?? 0;
    const tau = Math.max(0.004, p.tau);
    const attack = p.attack ?? 0.0008;
    const amp = p.amp;
    for (let i = start; i < len; i++) {
      const t = (i - start) / SR;
      const e = Math.exp(-t / tau) * Math.min(1, t / attack);
      out[i] += amp * e * Math.sin(w * (i - start) + phase);
    }
  }
  if (opts.saturate) softClipRange(out, start, out.length, opts.saturate);
  return out;
}

/** Exponential pitch sweep (sine). */
function addSweep(out, startSec, opts) {
  const start = Math.round(startSec * SR);
  const n = Math.max(2, Math.round((opts.dur ?? 0.3) * SR));
  const f0 = opts.f0;
  const f1 = opts.f1;
  const amp = opts.amp ?? 1;
  const tau = opts.tau ?? opts.dur / 2;
  const attack = opts.attack ?? 0.001;
  let phase = opts.phase ?? 0;
  for (let i = 0; i < n; i++) {
    const u = i / n;
    const f = f0 * Math.pow(f1 / f0, u);
    phase += (2 * Math.PI * f) / SR;
    const t = i / SR;
    const e = Math.exp(-t / tau) * Math.min(1, t / attack);
    const j = start + i;
    if (j >= out.length) break;
    out[j] += amp * e * Math.sin(phase);
  }
  return out;
}

/** Band-limited additive oscillator voice. */
function additiveWave(seconds, freq, kind = 'saw', phase0 = 0, maxH = 28) {
  const n = Math.max(2, Math.round(seconds * SR));
  const out = new Float32Array(n);
  const limit = Math.floor((SR * 0.45) / freq);
  const H = Math.min(limit, maxH);
  for (let h = 1; h <= H; h++) {
    let a;
    if (kind === 'saw') a = 1 / h;
    else if (kind === 'square') a = h % 2 === 1 ? 1 / h : 0;
    else if (kind === 'tri') a = h % 2 === 1 ? 1 / (h * h) : 0;
    else a = 0;
    if (a === 0) continue;
    const w = (2 * Math.PI * freq * h) / SR;
    const ph = phase0 * h;
    for (let i = 0; i < n; i++) out[i] += a * Math.sin(w * i + ph);
  }
  return out;
}

const softClip = (x, drive = 1.6) => {
  const norm = Math.tanh(drive);
  for (let i = 0; i < x.length; i++) x[i] = Math.tanh(x[i] * drive) / norm;
  return x;
};

function softClipRange(x, from, to, drive = 1.4) {
  const norm = Math.tanh(drive);
  for (let i = Math.max(0, from); i < Math.min(x.length, to); i++) {
    x[i] = Math.tanh(x[i] * drive) / norm;
  }
  return x;
}

/* ------------------------------------------------------------------ */
/* Reverb: 6 damped feedback combs + 2 all-passes (Schroeder)           */
/* ------------------------------------------------------------------ */

const reverbSend = (x, opts = {}) => {
  const wetGain = opts.wet ?? 0.22;
  const decay = opts.decay ?? 0.74;
  const damp = opts.damp ?? 0.32;
  const size = opts.size ?? 1;
  const length = x.length + Math.round(0.25 * SR);
  const combs = [1557, 1617, 1491, 1422, 1277, 1356].map((d) =>
    Math.max(2, Math.round(d * size * (SR / 44100)))
  );
  const acc = new Float32Array(length);
  for (const d of combs) {
    const buf = new Float32Array(d);
    let idx = 0;
    let lp = 0;
    for (let i = 0; i < length; i++) {
      const y = buf[idx];
      lp = y * (1 - damp) + lp * damp;
      const xin = i < x.length ? x[i] : 0;
      buf[idx] = xin + lp * decay;
      idx = (idx + 1) % d;
      acc[i] += y / combs.length;
    }
  }
  for (const d of [225, 556]) {
    const buf = new Float32Array(d);
    let idx = 0;
    for (let i = 0; i < length; i++) {
      const bufout = buf[idx];
      const y = -acc[i] + bufout;
      buf[idx] = acc[i] + bufout * 0.5;
      idx = (idx + 1) % d;
      acc[i] = y;
    }
  }
  const preDelay = Math.round((opts.predelay ?? 0.006) * SR);
  const wet = new Float32Array(x.length);
  for (let i = 0; i < wet.length; i++) {
    const j = i - preDelay;
    wet[i] = (j >= 0 ? acc[j] : 0) * wetGain;
  }
  return wet;
};

/* ------------------------------------------------------------------ */
/* Utilities: length, fades, normalisation, resampling, WAV            */
/* ------------------------------------------------------------------ */

function fitLength(x, seconds) {
  const n = Math.round(seconds * SR);
  if (x.length === n) return x;
  const out = new Float32Array(n);
  out.set(x.subarray(0, Math.min(n, x.length)));
  return out;
}

function fadeEdges(x, inSec, outSec) {
  const ni = Math.min(x.length, Math.round(inSec * SR));
  const no = Math.min(x.length, Math.round(outSec * SR));
  for (let i = 0; i < ni; i++) x[i] *= i / ni;
  for (let i = 0; i < no; i++) {
    const j = x.length - 1 - i;
    x[j] *= i / no;
  }
  return x;
}

const peakOf = (x) => {
  let p = 0;
  for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i]));
  return p;
};

function normalizePeak(x, targetDb) {
  const p = peakOf(x);
  if (p <= 1e-9) return x;
  const g = Math.pow(10, targetDb / 20) / p;
  for (let i = 0; i < x.length; i++) x[i] *= g;
  return x;
}

function normalizeRms(x, targetDb) {
  let sum = 0;
  for (let i = 0; i < x.length; i++) sum += x[i] * x[i];
  const rms = Math.sqrt(sum / x.length);
  if (rms <= 1e-9) return x;
  const g = Math.pow(10, targetDb / 20) / rms;
  for (let i = 0; i < x.length; i++) x[i] *= g;
  return x;
}

/** Windowed-sinc resampler with DC-normalised kernel. */
function resample(x, fromSR, toSR, circular = false) {
  if (fromSR === toSR) return x;
  const ratio = toSR / fromSR;
  const outLen = Math.max(1, Math.round(x.length * ratio));
  const out = new Float32Array(outLen);
  const cutoff = Math.min(1, ratio) * 0.94;
  const half = 16;
  for (let i = 0; i < outLen; i++) {
    const t = i / ratio;
    const i0 = Math.floor(t);
    let acc = 0;
    let wsum = 0;
    for (let k = -half + 1; k <= half; k++) {
      const idx = i0 + k;
      const d = t - idx;
      const sArg = Math.PI * d * cutoff;
      const sinc = Math.abs(sArg) < 1e-9 ? 1 : Math.sin(sArg) / sArg;
      const win = d > -half && d < half ? 0.5 + 0.5 * Math.cos((Math.PI * d) / half) : 0;
      const w = sinc * win;
      if (circular) {
        const n = x.length;
        const wrapped = ((idx % n) + n) % n;
        acc += x[wrapped] * w;
      } else if (idx >= 0 && idx < x.length) {
        acc += x[idx] * w;
      }
      wsum += w;
    }
    out[i] = Math.abs(wsum) > 1e-9 ? acc / wsum : 0;
  }
  return out;
}

function encodeWav(samples, sampleRate) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8, 'ascii');
  buf.write('fmt ', 12, 'ascii');
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(n * 2, 40);
  const rng = makeRng(0x5eed1234);
  for (let i = 0; i < n; i++) {
    // TPDF dither at ±0.5 LSB keeps quiet fades from sounding gritty.
    const dither = (rng() - rng()) / 65536;
    let s = samples[i] + dither;
    s = Math.max(-1, Math.min(1, s));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  return buf;
}

/* ------------------------------------------------------------------ */
/* Loudness (ITU-R BS.1770 style, K-weighted, gated)                    */
/* ------------------------------------------------------------------ */

const kWeight = (x, sampleRate) => {
  const shelf = applyBiquad(x, biquad('highshelf', 1500, 0.7071752, 4, sampleRate));
  return applyBiquad(shelf, biquad('highpass', 38, 0.500327, 0, sampleRate));
};

function integratedLoudness(x, sampleRate = SR) {
  const y = kWeight(x, sampleRate);
  const blockLen = Math.round(0.4 * SR);
  const hop = Math.round(0.1 * SR);
  const blocks = [];
  for (let s = 0; s + blockLen <= y.length; s += hop) {
    let sum = 0;
    for (let i = s; i < s + blockLen; i++) sum += y[i] * y[i];
    blocks.push(sum / blockLen);
  }
  if (!blocks.length) return -Infinity;
  const absGated = blocks.filter((z) => -0.691 + 10 * Math.log10(Math.max(z, 1e-12)) > -70);
  if (!absGated.length) return -Infinity;
  const mean1 = absGated.reduce((a, b) => a + b, 0) / absGated.length;
  const relGate = -0.691 + 10 * Math.log10(mean1) - 10;
  const gated = absGated.filter((z) => -0.691 + 10 * Math.log10(Math.max(z, 1e-12)) > relGate);
  const mean2 = (gated.length ? gated : absGated).reduce((a, b) => a + b, 0) / (gated.length || absGated.length);
  return -0.691 + 10 * Math.log10(Math.max(mean2, 1e-12));
}

/** 4x oversampled peak estimate (cubic interpolation between samples). */
function truePeak(x) {
  let peak = 0;
  const n = x.length;
  const at = (i) => (i < 0 || i >= n ? 0 : x[i]);
  for (let i = 0; i < n; i++) {
    peak = Math.max(peak, Math.abs(at(i)));
    for (let k = 1; k < 4; k++) {
      const f = k / 4;
      const p0 = at(i - 1);
      const p1 = at(i);
      const p2 = at(i + 1);
      const p3 = at(i + 2);
      const a = -0.5 * p0 + 1.5 * p1 - 1.5 * p2 + 0.5 * p3;
      const b = p0 - 2.5 * p1 + 2 * p2 - 0.5 * p3;
      const c = -0.5 * p0 + 0.5 * p2;
      const s = ((a * f + b) * f + c) * f + p1;
      peak = Math.max(peak, Math.abs(s));
    }
  }
  return peak;
}

const db = (lin) => 20 * Math.log10(Math.max(lin, 1e-12));

/* ------------------------------------------------------------------ */
/* Sound design                                                        */
/* ------------------------------------------------------------------ */

/** Soft keycap press: muted, felt through a desk, not a beep. */
function press(rng) {
  const out = B(0.15);
  const clickF = v(rng, 1450, 0.05);
  // transient: short band-passed noise click
  add(
    out,
    noiseBurst(rng, 0.012, { bp: clickF, bpQ: 1.05, attack: 0.0004, tau: 0.0034, amp: 0.5, peakNorm: 0.8 }),
    vd(rng, 0.0, 0.0008)
  );
  // body: damped low knock
  add(out, dampedSine(v(rng, 122, 0.04), 0.055, 0.62, 0.15, { h2: 0.25 }), 0.0008);
  // mid "plastik" tick just under the click
  add(out, noiseBurst(rng, 0.02, { bp: v(rng, 620, 0.05), bpQ: 2.4, attack: 0.0005, tau: 0.008, amp: 0.16 }), 0.0012);
  // tail: small room
  add(out, reverbSend(out, { wet: 0.16, size: 0.42, decay: 0.6, damp: 0.5 }), 0.003);
  fitLength(out, 0.15);
  return dcBlock(softClip(fadeEdges(out, 0.0004, 0.02), 1.15));
}

/** Mechanical hover tick: dry, tiny, high. */
function hover(rng, variant) {
  const out = B(0.05);
  const tick = v(rng, 3200, 0.04) + variant * 180;
  add(out, noiseBurst(rng, 0.008, { hp: 950, hpQ: 0.7, lp: 5200, attack: 0.00025, tau: 0.0011, amp: 0.5, peakNorm: 0.55 }), 0);
  // faint damped resonance, different per variant
  add(out, dampedSine(tick, 0.006, 0.4, 0.05, { attack: 0.0003 }), vd(rng, 0.0004, 0.0003));
  add(out, dampedSine(v(rng, 2200, 0.05) + variant * 120, 0.004, 0.24, 0.04, { attack: 0.0002 }), 0.0);
  // almost no tail: it should feel like a switch under glass
  add(out, reverbSend(out, { wet: 0.08, size: 0.25, decay: 0.45, damp: 0.6, predelay: 0.002 }), 0.001);
  fitLength(out, 0.05);
  return dcBlock(softClip(fadeEdges(lowpass(out, 6000, 0.7), 0.0002, 0.008), 1.1));
}

/** Two-stage toggle: "tk-clack" with metal contact resonances. */
function switchClick(rng, variant) {
  const out = B(0.12);
  const first = variant === 1 ? 0.028 : 0.036;
  // The first contact is deliberately the loudest so the attack reads at 0 ms.
  const hits = [
    { t: 0.0, gain: 1.0, f1: v(rng, 900, 0.05), f2: v(rng, 2400, 0.05) },
    { t: first, gain: 0.4, f1: v(rng, 1050, 0.05), f2: v(rng, 2750, 0.05) },
  ];
  for (const h of hits) {
    add(
      out,
      noiseBurst(rng, 0.008, { bp: v(rng, 2600, 0.05), bpQ: 0.9, attack: 0.0003, tau: 0.0018, amp: 0.8 * h.gain }),
      vd(rng, h.t, 0.0009)
    );
    addModal(out, h.t, [
      { freq: h.f1, amp: 0.34 * h.gain, tau: 0.026, phase: rng() * 6.28, attack: 0.0006 },
      { freq: h.f2, amp: 0.18 * h.gain, tau: 0.017, phase: rng() * 6.28, attack: 0.0005 },
    ]);
  }
  // small low body between the clicks
  add(out, dampedSine(v(rng, 150, 0.05), 0.03, 0.2, 0.1, {}), 0.001);
  add(out, reverbSend(out, { wet: 0.12, size: 0.35, decay: 0.55, damp: 0.55 }), 0.002);
  fitLength(out, 0.12);
  return dcBlock(softClip(fadeEdges(out, 0.0002, 0.012), 1.2));
}

/** Cardstock being handled: irregular grain bursts over a dry low-mid body. */
function paper(rng, variant) {
  const dur = variant === 3 ? 0.46 : 0.4;
  const out = B(dur);
  const grainBand = v(rng, 3900, 0.1);
  const grainCount = 80 + Math.floor(rng() * 40);
  for (let g = 0; g < grainCount; g++) {
    const u = Math.pow(rng(), 0.85);
    const t = 0.006 + u * (dur - 0.05);
    const envelope = Math.sin(Math.PI * Math.min(1, t / dur)) ** 0.7; // soft rise + fall
    const amp = (0.1 + rng() * 0.55) * envelope;
    const gd = 0.0015 + rng() * 0.0045;
    add(
      out,
      noiseBurst(rng, gd, {
        bp: v(rng, grainBand, 0.28),
        bpQ: v(rng, 1.5, 0.2),
        attack: 0.00018,
        tau: gd * (0.25 + rng() * 0.2),
        amp,
      }),
      t
    );
  }
  // low-mid body: cardstock thickness, slowly modulated
  const body = lowpass(white(Math.round(dur * SR), rng), v(rng, 1100, 0.12), 0.7);
  const amPhase = rng() * 6.28;
  const amRate = 2.4 + rng() * 1.6;
  applyEnv(body, (t) => {
    const rise = Math.min(1, t / 0.08);
    const fall = Math.min(1, Math.max(0, (dur - t) / 0.14));
    const am = 0.62 + 0.38 * (0.5 + 0.5 * Math.sin(2 * Math.PI * amRate * t + amPhase));
    return rise * fall * am * 0.34;
  });
  add(out, body, 0.004);
  // air: a breath of high shelf over the whole gesture
  const air = noiseBurst(rng, dur, { hp: 5200, attack: 0.06, tau: dur, amp: 0.045 });
  add(out, air, 0.01);
  add(out, reverbSend(out, { wet: 0.13, size: 0.5, decay: 0.62, damp: 0.45 }), 0.004);
  fitLength(out, dur);
  return dcBlock(fadeEdges(out, 0.002, 0.03));
}

/** Heavy mechanical lever: CLACK + delayed low CHUNK with room. */
function leverClack(rng, variant) {
  const out = B(0.5);
  const clackF = variant === 1 ? 1 : 1.07;
  const strike = vd(rng, 0, 0.0015);
  add(out, noiseBurst(rng, 0.02, { bp: v(rng, 2300, 0.06), bpQ: 0.8, attack: 0.00025, tau: 0.0055, amp: 0.95 }), strike);
  addModal(out, strike, [
    { freq: v(rng, 400, 0.04) * clackF, amp: 0.62, tau: v(rng, 0.14, 0.1), phase: rng() * 6.28 },
    { freq: v(rng, 1100, 0.04) * clackF, amp: 0.38, tau: v(rng, 0.1, 0.12), phase: rng() * 6.28 },
    { freq: v(rng, 2700, 0.05) * clackF, amp: 0.2, tau: v(rng, 0.07, 0.15), phase: rng() * 6.28 },
    { freq: v(rng, 3600, 0.05), amp: 0.09, tau: 0.04, phase: rng() * 6.28 },
  ], { saturate: 1.35 });
  // delayed low CHUNK: 90-130 ms later, damped thump + noise
  const chunkAt = vd(rng, 0.11, 0.012);
  add(out, noiseBurst(rng, 0.09, { lp: v(rng, 320, 0.1), attack: 0.002, tau: 0.055, amp: 0.18 }), chunkAt);
  add(out, dampedSine(v(rng, 70, 0.05), 0.075, 0.3, 0.22, { h2: 0.2, attack: 0.003 }), chunkAt + 0.002);
  // room
  add(out, reverbSend(out, { wet: 0.24, size: 0.85, decay: 0.72, damp: 0.42, predelay: 0.012 }), 0.004);
  fitLength(out, 0.5);
  return dcBlock(fadeEdges(out, 0.0004, 0.06));
}

/** Brass tram bell: inharmonic modal stack, two strikes (ding-ding). */
function bell(rng) {
  const out = B(1.2);
  const f0 = 880;
  const ratios = [1, 2.0, 2.76, 5.4, 8.9];
  const baseAmps = [0.8, 0.5, 0.4, 0.22, 0.1];
  const taus = [0.92, 0.62, 0.44, 0.26, 0.16];
  const detune = 1 + (rng() * 2 - 1) * 0.0015;
  // A real strike excites every mode in phase; random phases would smear the
  // attack and let a later beat become the loudest moment of the bell.
  const strikePhases = ratios.map((_, i) => i * 0.03);
  const strikes = [
    { t: 0, gain: 1, partialScale: 1 },
    { t: vd(rng, 0.18, 0.012), gain: 0.72, partialScale: 1.004 },
  ];
  for (const s of strikes) {
    // 2 ms noise strike transient, bright but brief
    add(
      out,
      noiseBurst(rng, 0.012, { hp: 3200, attack: 0.0002, tau: 0.0018, amp: 0.34 * s.gain, peakNorm: 0.45 * s.gain }),
      s.t
    );
    addModal(
      out,
      s.t,
      ratios.map((r, i) => ({
        freq: f0 * r * detune * s.partialScale,
        amp: baseAmps[i] * s.gain * v(rng, 1, 0.1),
        tau: taus[i] * v(rng, 1, 0.12),
        phase: strikePhases[i],
      }))
    );
  }
  // bell body "bloom": a touch of low resonance under the strike
  add(out, dampedSine(440, 0.3, 0.06, 0.8, { attack: 0.004 }), 0.002);
  add(out, reverbSend(out, { wet: 0.18, size: 0.9, decay: 0.6, damp: 0.3, predelay: 0.02 }), 0.008);
  fitLength(out, 1.2);
  return dcBlock(fadeEdges(out, 0.0003, 0.08));
}

/** Air brake release: bright "pssshh" with a rising tilt and long decay. */
function airBrake(rng) {
  const out = B(0.8);
  const raw = white(Math.round(0.8 * SR), rng);
  const tilt = biquadTV(raw, 'highpass', (t) => 800 + 800 * Math.min(1, t / 0.22), 0.85);
  applyEnv(tilt, (t) => {
    const attack = Math.min(1, t / 0.018);
    const hold = t < 0.16 ? 1 : Math.exp(-(t - 0.16) / 0.26);
    const flutter = 0.86 + 0.14 * Math.sin(2 * Math.PI * 11 * t + 0.7);
    return attack * hold * flutter;
  });
  add(out, tilt, 0, 0.9);
  // upper "shimmer" layer that dies faster
  add(out, noiseBurst(rng, 0.55, { hp: 4200, attack: 0.01, tau: 0.1, amp: 0.16 }), 0.005);
  // low puff underneath for body
  const puff = noiseBurst(rng, 0.6, { lp: 700, attack: 0.03, tau: 0.12, amp: 0.2 });
  add(out, puff, 0.004);
  // valve body: mid band so it doesn't read as a thin hiss
  const valve = noiseBurst(rng, 0.64, { bp: 1500, bpQ: 0.65, attack: 0.025, tau: 0.28, amp: 0.5, peakNorm: 0.28 });
  add(out, valve, 0.008);
  // tame the very top: a valve hiss, not a cymbal wash
  const shaped = lowpass(out, 6800, 0.7);
  add(shaped, reverbSend(shaped, { wet: 0.2, size: 0.8, decay: 0.7, damp: 0.35 }), 0.01);
  fitLength(shaped, 0.8);
  return dcBlock(fadeEdges(shaped, 0.001, 0.08));
}

/** Screeching steel brake: clustered high partials with drift + scrape. */
function brakeSqueal(rng) {
  const out = B(0.6);
  const base = v(rng, 2100, 0.03);
  const partials = [0.88, 1.0, 1.19, 1.44].map((m, i) => base * m * (1 + (rng() * 2 - 1) * 0.004));
  const glide = 0.93;
  const n = Math.round(0.6 * SR);
  const drift = Array.from({ length: partials.length }, () => ({
    rate: 2.2 + rng() * 3.5,
    depth: 0.0015 + rng() * 0.003,
    phase: rng() * 6.28,
  }));
  for (let p = 0; p < partials.length; p++) {
    let phase = rng() * 6.28;
    const amp = [0.42, 0.5, 0.3, 0.16][p];
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const u = i / n;
      const f =
        partials[p] *
        Math.pow(glide, u) *
        (1 + drift[p].depth * Math.sin(2 * Math.PI * drift[p].rate * t + drift[p].phase));
      phase += (2 * Math.PI * f) / SR;
      const env = Math.min(1, t / 0.045) * (t < 0.1 ? 1 : Math.exp(-(t - 0.1) / 0.33));
      out[i] += amp * env * Math.sin(phase);
    }
  }
  // scratchy scrape riding on the partials
  const scrape = noiseBurst(rng, 0.6, { bp: v(rng, 2600, 0.08), bpQ: 1.1, attack: 0.03, tau: 0.34, amp: 0.3 });
  applyEnv(scrape, (t) => 0.7 + 0.3 * Math.sin(2 * Math.PI * 26 * t + 1.1) * Math.sin(2 * Math.PI * 7.3 * t));
  add(out, scrape, 0);
  add(out, reverbSend(out, { wet: 0.16, size: 0.7, decay: 0.6, damp: 0.3 }), 0.01);
  fitLength(out, 0.6);
  return dcBlock(softClip(fadeEdges(out, 0.004, 0.09), 1.25));
}

/** Ominous brass drone: detuned saws through a moving lowpass. */
function drone(rng) {
  const out = B(2.0);
  const voices = [
    { f: 55, det: -0.004, amp: 0.5 },
    { f: 82.5, det: 0.006, amp: 0.3 },
    { f: 110, det: -0.007, amp: 0.22 },
    { f: 55, det: 0.009, amp: 0.18 },
  ];
  const mix = new Float32Array(out.length);
  for (const voice of voices) {
    const osc = additiveWave(2.0, voice.f * (1 + voice.det), 'saw', rng() * 6.28, 20);
    add(mix, osc, 0, voice.amp);
  }
  const shaped = biquadTV(mix, 'lowpass', (t) => 300 + 150 * Math.sin(2 * Math.PI * 0.42 * t + 0.6) + 60 * Math.sin(2 * Math.PI * 1.1 * t), 0.9);
  applyEnv(shaped, (t) => {
    const attack = Math.min(1, t / 0.34);
    const release = Math.min(1, Math.max(0, (2.0 - t) / 0.75));
    return attack * release;
  });
  add(out, shaped, 0, 1);
  // sub weight
  add(out, dampedSine(41.2, 1.6, 0.16, 2.0, { attack: 0.3 }), 0);
  add(out, reverbSend(out, { wet: 0.22, size: 1.05, decay: 0.7, damp: 0.4 }), 0.01);
  fitLength(out, 2.0);
  return dcBlock(fadeEdges(out, 0.01, 0.12));
}

/** Short dry clack: single metal resonance, the rail joint under a wheel. */
function clack(rng, variant) {
  const out = B(0.12);
  const f = [1200, 1600, 2000][variant - 1] * v(rng, 1, 0.05);
  add(out, noiseBurst(rng, 0.012, { bp: v(rng, 2800, 0.08), bpQ: 0.9, attack: 0.0002, tau: 0.0022, amp: 0.6 }), vd(rng, 0, 0.0012));
  addModal(out, 0, [
    { freq: f, amp: 0.42, tau: v(rng, 0.03, 0.15), phase: rng() * 6.28 },
    { freq: f * 2.1 * v(rng, 1, 0.04), amp: 0.16, tau: 0.018, phase: rng() * 6.28 },
  ], { saturate: 1.2 });
  add(out, dampedSine(v(rng, 110, 0.05), 0.04, 0.3, 0.12, {}), 0.001);
  add(out, reverbSend(out, { wet: 0.14, size: 0.5, decay: 0.55, damp: 0.4, predelay: 0.004 }), 0.002);
  fitLength(out, 0.12);
  return dcBlock(softClip(fadeEdges(out, 0.0002, 0.02), 1.15));
}

/** Muffled impact: the crash through a wall. */
function impactMuffled(rng, variant) {
  const out = B(0.6);
  // body: filtered noise slam
  add(out, noiseBurst(rng, 0.45, { lp: v(rng, 500, 0.08), lpQ: 0.8, attack: 0.006, tau: 0.14, amp: 0.8 }), 0);
  // sine drop 90 -> 35 Hz
  addSweep(out, 0.004, { f0: v(rng, 92, 0.05), f1: 34, dur: 0.45, amp: 0.7, tau: 0.18, attack: 0.004 });
  // dull metal rattle
  const rattle = [
    { freq: v(rng, 330, 0.05), amp: 0.2, tau: 0.13 },
    { freq: v(rng, 620, 0.05), amp: 0.14, tau: 0.1 },
    { freq: v(rng, 940, 0.06), amp: 0.08, tau: 0.07 },
  ].map((p) => ({ ...p, phase: rng() * 6.28 }));
  const rattleBuf = new Float32Array(out.length);
  addModal(rattleBuf, 0.008 + (variant - 1) * 0.006, rattle);
  add(out, lowpass(rattleBuf, 1100, 0.8), 0, 0.9);
  // through-the-wall tail
  const wet = reverbSend(out, { wet: 0.28, size: 1.1, decay: 0.76, damp: 0.55, predelay: 0.02 });
  add(out, lowpass(wet, 1400, 0.7), 0);
  fitLength(out, 0.6);
  return dcBlock(fadeEdges(lowpass(out, 2600, 0.7), 0.001, 0.09));
}

/** Exaggerated cartoon crash: slam, screech, record scratch. */
function crashComic(rng) {
  const out = B(1.2);
  // slam
  add(out, noiseBurst(rng, 0.35, { lp: 3200, attack: 0.002, tau: 0.09, amp: 0.6 }), 0);
  addSweep(out, 0, { f0: 420, f1: 70, dur: 0.4, amp: 0.5, tau: 0.14, attack: 0.003 });
  // inharmonic metal
  const metal = [320, 745, 1180, 1930, 2740].map((f, i) => ({
    freq: v(rng, f, 0.03),
    amp: [0.26, 0.2, 0.14, 0.1, 0.07][i],
    tau: [0.42, 0.3, 0.22, 0.16, 0.11][i],
    phase: rng() * 6.28,
  }));
  addModal(out, 0.01, metal, { saturate: 1.2 });
  // rising screech 1.5 -> 3.5 kHz with vibrato
  {
    const n = Math.round(0.55 * SR);
    const start = Math.round(0.12 * SR);
    let phase = 0;
    for (let i = 0; i < n; i++) {
      const u = i / n;
      const t = i / SR;
      const f = 1500 * Math.pow(3500 / 1500, u) * (1 + 0.012 * Math.sin(2 * Math.PI * 6.5 * t));
      phase += (2 * Math.PI * f) / SR;
      const env = Math.min(1, t / 0.04) * Math.min(1, Math.max(0, (0.55 - t) / 0.2));
      const j = start + i;
      if (j < out.length) out[j] += 0.17 * env * Math.sin(phase);
    }
  }
  // record scratch: gated noise with rapid filter wobble
  {
    const scratchStart = 0.8;
    const dur = 0.16;
    const n = Math.round(dur * SR);
    const raw = white(n, rng);
    const tv = biquadTV(raw, 'bandpass', (t) => 900 + 700 * Math.sin(2 * Math.PI * 14 * t) + 300 * Math.sin(2 * Math.PI * 31 * t), 2.4);
    applyEnv(tv, (t) => {
      const gate = Math.pow(Math.max(0, Math.sin(2 * Math.PI * 17 * t)), 0.6);
      const fade = Math.min(1, t / 0.01) * Math.min(1, Math.max(0, (dur - t) / 0.05));
      return gate * fade * 0.55;
    });
    add(out, tv, scratchStart);
  }
  add(out, reverbSend(out, { wet: 0.2, size: 0.95, decay: 0.7, damp: 0.45, predelay: 0.012 }), 0.006);
  fitLength(out, 1.2);
  return dcBlock(softClip(fadeEdges(out, 0.0006, 0.12), 1.3));
}

/** The ink stamp: soft rubber transient, heavy low body, woody desk. */
function stamp(rng, variant) {
  const out = B(0.4);
  const impactAt = vd(rng, 0, 0.0012);
  // 1. rubber contact: broadband but soft, and unmistakably the loudest moment
  add(
    out,
    noiseBurst(rng, 0.02, {
      bp: v(rng, 1150, 0.08),
      bpQ: 0.72,
      lp: 5200,
      attack: 0.0003,
      tau: 0.0024,
      amp: 1.0,
      peakNorm: 0.95,
    }),
    impactAt
  );
  // 2. body: 140 -> 55 Hz, fast decay so the weight is front-loaded
  addSweep(out, impactAt + 0.001, {
    f0: v(rng, 140, 0.06) + (variant - 1) * 6,
    f1: v(rng, 55, 0.05),
    dur: 0.22,
    amp: 0.5,
    tau: 0.05,
    attack: 0.0009,
  });
  // 3. woody desk under the rubber pad
  addModal(out, impactAt, [
    { freq: v(rng, 200, 0.07) + (variant - 1) * 12, amp: 0.2, tau: v(rng, 0.045, 0.15), phase: rng() * 6.28 },
    { freq: v(rng, 410, 0.08), amp: 0.07, tau: 0.026, phase: rng() * 6.28 },
  ]);
  // 4. sub thud (felt, not heard)
  add(out, dampedSine(v(rng, 62, 0.05), 0.06, 0.16, 0.28, { attack: 0.002 }), impactAt + 0.003);
  // 5. very short dry room
  add(out, reverbSend(out, { wet: 0.12, size: 0.38, decay: 0.5, damp: 0.6, predelay: 0.004 }), impactAt + 0.004);
  fitLength(out, 0.4);
  return dcBlock(softClip(fadeEdges(lowpass(out, 6500, 0.7), 0.0002, 0.06), 1.2));
}

/* --- musical stings ------------------------------------------------- */

function chordVoice(seconds, freqs, kind, detuneCents, phase0) {
  const out = new Float32Array(Math.round(seconds * SR));
  for (const f of freqs) {
    for (const d of [-detuneCents, detuneCents]) {
      const det = Math.pow(2, d / 1200);
      const osc = additiveWave(seconds, f * det, kind, phase0 + f * 0.001, 22);
      add(out, osc, 0, 1 / (freqs.length * 2));
    }
  }
  return out;
}

/** Warm major resolve: Fmaj7 -> C. */
function stingRelief(rng) {
  const seconds = 1.5;
  const out = B(seconds);
  const fmaj7 = [174.61, 220.0, 261.63, 329.63];
  const cMaj = [130.81, 196.0, 261.63, 329.63];
  const a = chordVoice(seconds, fmaj7, 'tri', 4, rng() * 6.28);
  const b = chordVoice(seconds, cMaj, 'tri', 5, rng() * 6.28);
  const sawwy = chordVoice(seconds, cMaj, 'saw', 7, rng() * 6.28);
  applyEnv(a, (t) => Math.min(1, t / 0.22) * Math.exp(-t / 1.1));
  applyEnv(b, (t) => {
    const start = 0.5;
    if (t < start) return 0;
    const u = t - start;
    return Math.min(1, u / 0.28) * Math.exp(-u / 0.85);
  });
  applyEnv(sawwy, (t) => {
    const start = 0.5;
    if (t < start) return 0;
    const u = t - start;
    return Math.min(1, u / 0.35) * Math.exp(-u / 0.8) * 0.3;
  });
  let mix = new Float32Array(out.length);
  add(mix, a, 0, 0.9);
  add(mix, b, 0, 0.85);
  add(mix, sawwy, 0, 0.5);
  mix = lowpass(mix, 1400, 0.8);
  // breath/attack transient so the sting enters with an edge
  add(mix, noiseBurst(rng, 0.18, { bp: 1200, bpQ: 0.7, attack: 0.03, tau: 0.06, amp: 0.07 }), 0);
  applyEnv(mix, (t) => Math.min(1, Math.max(0, (seconds - t) / 0.45)));
  add(out, mix, 0, 1);
  add(out, reverbSend(mix, { wet: 0.26, size: 1.0, decay: 0.7, damp: 0.35, predelay: 0.02 }), 0);
  fitLength(out, seconds);
  return dcBlock(fadeEdges(out, 0.02, 0.08));
}

/** Dread: low dissonant cluster, creeping attack. */
function stingDread(rng) {
  const seconds = 1.5;
  const out = B(seconds);
  const cluster = [41.2, 55.0, 58.27, 77.78];
  const voice = chordVoice(seconds, cluster, 'saw', 6, rng() * 6.28);
  applyEnv(voice, (t) => {
    const attack = Math.min(1, t / 0.55);
    const release = Math.min(1, Math.max(0, (seconds - t) / 0.5));
    return attack * release;
  });
  let shaped = biquadTV(voice, 'lowpass', (t) => 240 + 90 * Math.sin(2 * Math.PI * 0.33 * t + 0.4), 1.1);
  shaped = lowpass(shaped, 520, 0.8);
  add(out, shaped, 0, 1);
  // sub pressure layer
  add(out, dampedSine(34.5, 1.1, 0.22, seconds, { attack: 0.4 }), 0);
  // distant metallic scrape as the "transient" of the phrase
  add(out, noiseBurst(rng, 0.5, { bp: 900, bpQ: 1.6, attack: 0.12, tau: 0.25, amp: 0.05 }), 0.05);
  add(out, lowpass(reverbSend(out, { wet: 0.2, size: 1.15, decay: 0.76, damp: 0.5 }), 1200, 0.7), 0);
  fitLength(out, seconds);
  return dcBlock(fadeEdges(out, 0.02, 0.12));
}

/** Absurd: three off-kilter muted-brass "bwah" notes. */
function stingAbsurd(rng) {
  const seconds = 1.5;
  const out = B(seconds);
  const notes = [
    { t: 0.02, f: 196.0, dur: 0.34, bend: 0.82 },
    { t: 0.44, f: 233.08, dur: 0.32, bend: 0.78 },
    { t: 0.86, f: 174.61, dur: 0.55, bend: 0.55 },
  ];
  notes.forEach((note, idx) => {
    const n = Math.round(note.dur * SR);
    const start = Math.round(note.t * SR);
    const detune = 1 + (rng() * 2 - 1) * 0.012; // intentionally out of tune
    const voices = [
      { f: note.f * detune, kind: 'saw', amp: 0.5 },
      { f: note.f * detune * 1.0075, kind: 'square', amp: 0.3 },
      { f: note.f * 0.5 * detune, kind: 'square', amp: 0.18 },
    ];
    const buf = new Float32Array(n);
    for (const voice of voices) {
      const osc = additiveWave(note.dur, voice.f, voice.kind, rng() * 6.28, 24);
      add(buf, osc, 0, voice.amp);
    }
    // rubbery pitch fall: read the voice back at a warped rate
    const warped = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const u = i / n;
      const bend = 1 - (1 - note.bend) * Math.pow(u, idx === 2 ? 1.6 : 1.1);
      // simple resample-style pitch bend by reading the buffer at a warped index
      const idxF = Math.min(n - 1, Math.max(0, i * bend));
      const i0 = Math.floor(idxF);
      const frac = idxF - i0;
      const s0 = buf[i0];
      const s1 = buf[Math.min(n - 1, i0 + 1)];
      warped[i] = s0 + (s1 - s0) * frac;
    }
    const swept = biquadTV(warped, 'lowpass', (t) => {
      const u = t / note.dur;
      return 1500 * Math.pow(0.18, u) + 120;
    }, 5.5);
    applyEnv(swept, (t) => {
      const attack = Math.min(1, t / 0.035);
      const release = Math.min(1, Math.max(0, (note.dur - t) / 0.09));
      return attack * release;
    });
    add(out, swept, note.t, 0.85);
    // brass "spit" transient
    add(out, noiseBurst(rng, 0.04, { bp: 1300, bpQ: 1.3, attack: 0.004, tau: 0.012, amp: 0.09 }), note.t);
  });
  add(out, reverbSend(out, { wet: 0.2, size: 0.9, decay: 0.65, damp: 0.4 }), 0.01);
  fitLength(out, seconds);
  return dcBlock(softClip(fadeEdges(out, 0.01, 0.1), 1.35));
}

/* ------------------------------------------------------------------ */
/* SFX table                                                           */
/* ------------------------------------------------------------------ */

const SFX = [
  { name: 'press', dur: 0.15, peakDb: -6, render: (r) => press(r) },
  { name: 'hover_1', dur: 0.05, peakDb: -6, render: (r) => hover(r, 1) },
  { name: 'hover_2', dur: 0.05, peakDb: -6, render: (r) => hover(r, 2) },
  { name: 'hover_3', dur: 0.05, peakDb: -6, render: (r) => hover(r, 3) },
  { name: 'switch_1', dur: 0.12, peakDb: -6, render: (r) => switchClick(r, 1) },
  { name: 'switch_2', dur: 0.12, peakDb: -6, render: (r) => switchClick(r, 2) },
  { name: 'paper_1', dur: 0.4, peakDb: -6, render: (r) => paper(r, 1) },
  { name: 'paper_2', dur: 0.4, peakDb: -6, render: (r) => paper(r, 2) },
  { name: 'paper_3', dur: 0.46, peakDb: -6, render: (r) => paper(r, 3) },
  { name: 'lever_clack_1', dur: 0.5, peakDb: -6, render: (r) => leverClack(r, 1) },
  { name: 'lever_clack_2', dur: 0.5, peakDb: -6, render: (r) => leverClack(r, 2) },
  { name: 'bell', dur: 1.2, peakDb: -6, render: (r) => bell(r) },
  { name: 'air_brake', dur: 0.8, peakDb: -6, render: (r) => airBrake(r) },
  { name: 'brake_squeal', dur: 0.6, peakDb: -6, render: (r) => brakeSqueal(r) },
  { name: 'drone', dur: 2.0, peakDb: -6, render: (r) => drone(r) },
  { name: 'clack_1', dur: 0.12, peakDb: -6, render: (r) => clack(r, 1) },
  { name: 'clack_2', dur: 0.12, peakDb: -6, render: (r) => clack(r, 2) },
  { name: 'clack_3', dur: 0.12, peakDb: -6, render: (r) => clack(r, 3) },
  { name: 'impact_muffled_1', dur: 0.6, peakDb: -3, render: (r) => impactMuffled(r, 1) },
  { name: 'impact_muffled_2', dur: 0.6, peakDb: -3, render: (r) => impactMuffled(r, 2) },
  { name: 'crash_comic', dur: 1.2, peakDb: -6, render: (r) => crashComic(r) },
  { name: 'stamp_1', dur: 0.4, peakDb: -3, render: (r) => stamp(r, 1) },
  { name: 'stamp_2', dur: 0.4, peakDb: -3, render: (r) => stamp(r, 2) },
  { name: 'sting_relief', dur: 1.5, peakDb: -6, render: (r) => stingRelief(r) },
  { name: 'sting_dread', dur: 1.5, peakDb: -6, render: (r) => stingDread(r) },
  { name: 'sting_absurd', dur: 1.5, peakDb: -6, render: (r) => stingAbsurd(r) },
];

/* ------------------------------------------------------------------ */
/* Ambience                                                            */
/* ------------------------------------------------------------------ */

function renderAmbience() {
  const loopSec = AMBIENCE_SECONDS;
  const totalSec = loopSec + 2; // 2 s of extra material for the crossfade
  const n = Math.round(totalSec * SR);
  const rng = makeRng(hashSeed('ambience'));
  const out = new Float32Array(n);

  // 1. tram body hum: low-passed brown noise around 120 Hz
  const hum = brown(n, rng, 0.012);
  const humFiltered = lowpass(hum, 120, 0.7);
  normalizePeak(humFiltered, -12);
  applyEnv(humFiltered, (t) => 0.7 + 0.16 * Math.sin(2 * Math.PI * (1 / 30) * t) + 0.1 * Math.sin(2 * Math.PI * (2 / 30) * t + 1.2));
  add(out, humFiltered, 0, 0.9);

  // 2. faint 50 Hz mains tone + harmonics, slow wobble (periods divide 30 s)
  const tones = [
    { f: 50, amp: 0.16 },
    { f: 100, amp: 0.07 },
    { f: 150, amp: 0.035 },
    { f: 200, amp: 0.018 },
  ];
  for (const tone of tones) {
    const buf = new Float32Array(n);
    const wobbleRate = 1 / (6 + Math.floor(rng() * 3) * 3); // 1/6, 1/9, 1/12 Hz
    const phase0 = rng() * 6.28;
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const wobble = 0.75 + 0.25 * Math.sin(2 * Math.PI * wobbleRate * t + phase0);
      buf[i] = tone.amp * wobble * Math.sin(2 * Math.PI * tone.f * t);
    }
    add(out, buf, 0);
  }

  // 3. sparse vinyl crackle
  const crackleCount = 90;
  for (let c = 0; c < crackleCount; c++) {
    const t = rng() * totalSec;
    const dur = 0.001 + rng() * 0.0022;
    const amp = (0.02 + rng() * 0.05) * (rng() < 0.12 ? 1.8 : 1);
    add(out, noiseBurst(rng, dur, { hp: 900, lp: 7000, attack: 0.0001, tau: dur * 0.4, amp }), t);
  }

  // 4. distant rhythmic clatter (a soft clack pair every 0.9 s, far away)
  const clatterBuffer = new Float32Array(Math.round(0.6 * SR));
  for (let pair = 0; pair < 2; pair++) {
    const at = pair * 0.07;
    add(clatterBuffer, noiseBurst(rng, 0.05, { bp: 700, bpQ: 1.4, attack: 0.003, tau: 0.012, amp: 0.5 }), at);
    addModal(clatterBuffer, at, [
      { freq: 320 + pair * 60, amp: 0.3, tau: 0.03, phase: rng() * 6.28 },
      { freq: 540 + pair * 90, amp: 0.16, tau: 0.02, phase: rng() * 6.28 },
    ]);
  }
  const farClatter = reverbSend(clatterBuffer, { wet: 0.85, size: 1.15, decay: 0.8, damp: 0.62, predelay: 0.05 });
  const distant = lowpass(farClatter, 780, 0.8);
  normalizePeak(distant, -14);
  const beat = 0.9;
  const events = Math.ceil(totalSec / beat);
  for (let e = 0; e < events; e++) {
    // Keep it felt, not heard: the clatter is a distant rhythm under the hum.
    const amp = 0.34 + (e % 4) * 0.07;
    add(out, distant, e * beat, amp);
  }

  // 5. glue: gentle low-pass so nothing above ~9 kHz competes with the SFX
  let glued = lowpass(out, 9000, 0.7);
  glued = dcBlock(glued, 25);

  // 6. seamless loop: crossfade the last 2 s into the first 2 s, then trim
  const xfade = Math.round(2 * SR);
  const loop = new Float32Array(Math.round(loopSec * SR));
  for (let i = 0; i < loop.length; i++) {
    if (i < xfade) {
      const w = i / xfade; // 0 -> 1
      const head = glued[i];
      const tail = glued[i + Math.round(loopSec * SR)];
      // equal-power crossfade
      loop[i] = head * Math.sin((w * Math.PI) / 2) + tail * Math.cos((w * Math.PI) / 2);
    } else {
      loop[i] = glued[i];
    }
  }

  // 8. seam polish: ramp the final millisecond into the loop head so the last
  //    sample equals the first (a 1 ms blend is inaudible in a -26 LUFS bed).
  const seam = Math.round(0.001 * SR);
  const headSample = loop[0];
  for (let i = 0; i < seam; i++) {
    const w = (i + 1) / seam;
    const idx = loop.length - seam + i;
    loop[idx] = loop[idx] * (1 - w) + headSample * w;
  }
  return matchLoudness(loop, AMBIENCE_LUFS);
}

/**
 * Scale a bed to a target integrated loudness while keeping the true peak below
 * -3 dBFS: peaky material gets rounded with a gentle tanh instead of being
 * turned down (a quiet ambience must stay audible).
 */
function matchLoudness(x, targetLufs, sampleRate = SR) {
  for (let iter = 0; iter < 5; iter++) {
    const lufs = integratedLoudness(x, sampleRate);
    if (!Number.isFinite(lufs)) break;
    const g = Math.pow(10, (targetLufs - lufs) / 20);
    for (let i = 0; i < x.length; i++) x[i] *= g;
    if (db(truePeak(x)) < -3.2) break;
    softClip(x, 1.12);
  }
  return x;
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

async function main() {
  const onlyArg = process.argv.find((a) => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.split('=')[1] : null;
  // `--repackage` reuses whatever WAVs are already in audio-src/raw (so a hand
  // recorded replacement only has to be dropped in and packaged).
  const repackage = process.argv.includes('--repackage');
  await mkdir(RAW_DIR, { recursive: true });
  await mkdir(OUT_DIR, { recursive: true });

  const rows = [];

  if (!only || only === 'raw' || only === 'sfx') {
    const rendered = [];
    for (const def of SFX) {
      let x;
      let fromDisk = false;
      if (repackage) {
        try {
          const raw = decodeWav(await readFile(path.join(RAW_DIR, `${def.name}.wav`)));
          x = raw.sampleRate === RAW_SR ? raw.samples : resample(raw.samples, raw.sampleRate, RAW_SR);
          fromDisk = true;
        } catch {
          console.warn(`  (no ${def.name}.wav on disk — rendering it instead)`);
        }
      }
      if (!fromDisk) {
        const rng = makeRng(hashSeed(def.name));
        x = def.render(rng);
      }
      x = fitLength(new Float32Array(x), def.dur);
      x = dcBlock(x, 20);
      normalizePeak(x, def.peakDb);
      rendered.push({ def, x });
      if (!fromDisk) await writeFile(path.join(RAW_DIR, `${def.name}.wav`), encodeWav(x, RAW_SR));
    }

    // Sprite at 32 kHz so each format stays well under 1.5 MB.
    const gapSamples = Math.round((GAP_MS / 1000) * SPRITE_SR);
    const resampled = rendered.map(({ def, x }) => {
      const y = resample(x, RAW_SR, SPRITE_SR);
      // Re-normalise after the sample-rate conversion: the anti-alias filter
      // shaves the very highest transient, so peak targets must be re-applied.
      normalizePeak(y, def.peakDb);
      return { def, y };
    });
    const totalSamples = resampled.reduce((sum, r) => sum + r.y.length, 0) + gapSamples * (resampled.length - 1);
    const sprite = new Float32Array(totalSamples);
    const manifest = {};
    let cursor = 0;
    for (const { def, y } of resampled) {
      const startMs = Math.round((cursor / SPRITE_SR) * 1000);
      sprite.set(y, cursor);
      cursor += y.length;
      const durMs = Math.round((y.length / SPRITE_SR) * 1000);
      manifest[def.name] = [startMs, durMs];
      rows.push({ name: def.name, durMs, peak: db(peakOf(y)), startMs });
      cursor += gapSamples;
    }
    // Safety: hard-limit the sprite so nothing clips after concatenation.
    const spritePeak = peakOf(sprite);
    if (db(spritePeak) > -0.5) normalizePeak(sprite, -0.5);

    await writeFile(path.join(OUT_DIR, 'sfx.wav'), encodeWav(sprite, SPRITE_SR));
    const json = {
      sampleRate: SPRITE_SR,
      gapMs: GAP_MS,
      formats: ['wav'],
      sprite: manifest,
    };
    await writeFile(path.join(OUT_DIR, 'sfx.json'), `${JSON.stringify(json, null, 2)}\n`);
    const spriteBytes = 44 + sprite.length * 2;
    console.log(`\nSFX sprite: ${(spriteBytes / 1024 / 1024).toFixed(2)} MB (${(sprite.length / SPRITE_SR).toFixed(2)} s @ ${SPRITE_SR} Hz)`);
    for (const row of rows) {
      console.log(
        `  ${row.name.padEnd(18)} ${String(row.durMs).padStart(5)} ms  peak ${row.peak.toFixed(1)} dBFS  @${row.startMs} ms`
      );
    }
  }

  if (!only || only === 'raw' || only === 'ambience') {
    let loop;
    if (repackage) {
      const raw = decodeWav(await readFile(path.join(RAW_DIR, 'ambience.wav')));
      const samples = raw.sampleRate === RAW_SR ? raw.samples : resample(raw.samples, raw.sampleRate, RAW_SR);
      const expected = Math.round(AMBIENCE_SECONDS * RAW_SR);
      if (Math.abs(samples.length - expected) > RAW_SR * 0.05) {
        console.warn(`  ambience.wav should be ~${AMBIENCE_SECONDS} s for a seamless loop (got ${(samples.length / RAW_SR).toFixed(2)} s)`);
      }
      loop = fitLength(new Float32Array(samples), AMBIENCE_SECONDS);
    } else {
      loop = renderAmbience();
      await writeFile(path.join(RAW_DIR, 'ambience.wav'), encodeWav(loop, RAW_SR));
    }
    // Circular resampling keeps the loop seam intact at the delivery rate.
    const loopOut = matchLoudness(resample(loop, RAW_SR, SPRITE_SR, true), AMBIENCE_LUFS, SPRITE_SR);
    await writeFile(path.join(OUT_DIR, 'ambience.wav'), encodeWav(loopOut, SPRITE_SR));
    console.log(
      `\nAmbience: ${(loop.length / SR).toFixed(1)} s loop, ${integratedLoudness(loop).toFixed(1)} LUFS, true peak ${db(truePeak(loop)).toFixed(1)} dBFS`
    );
    console.log(
      `  public/audio/ambience.wav ${((44 + loopOut.length * 2) / 1024 / 1024).toFixed(2)} MB @ ${SPRITE_SR} Hz`
    );
  }
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { integratedLoudness, truePeak, peakOf, resample, encodeWav, decodeWav, SR, SPRITE_SR, RAW_SR, SFX };

/* ------------------------------------------------------------------ */
/* WAV reader (used by scripts/verify-audio.mjs and the manifest build) */
/* ------------------------------------------------------------------ */

function decodeWav(buffer) {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('not a RIFF/WAVE file');
  }
  let offset = 12;
  let fmt = null;
  let data = null;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === 'fmt ') {
      fmt = {
        format: buffer.readUInt16LE(body),
        channels: buffer.readUInt16LE(body + 2),
        sampleRate: buffer.readUInt32LE(body + 4),
        bits: buffer.readUInt16LE(body + 14),
      };
    } else if (id === 'data') {
      data = buffer.subarray(body, body + size);
    }
    offset = body + size + (size % 2);
  }
  if (!fmt || !data) throw new Error('missing fmt/data chunk');
  const count = Math.floor(data.length / 2);
  const out = new Float32Array(count);
  for (let i = 0; i < count; i++) out[i] = data.readInt16LE(i * 2) / 32768;
  return { sampleRate: fmt.sampleRate, channels: fmt.channels, bits: fmt.bits, samples: out };
}
