#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Offline, deterministic sample renderer for "Absürt Tramvay İkilemleri".
 *
 * Pure Node built-ins. No dependencies, no network, no third-party material.
 * Every sound is composed from a small DSP toolkit (noise generators, one-pole
 * and biquad filters, modal resonators, envelopes, a Schroeder reverb, soft
 * saturation) so the result has a transient layer, a body layer and a tail.
 *
 *   node scripts/generate-audio.mjs        -> audio-src/raw/*.wav + sprite map
 *   npm run audio:build                    -> also encodes public/audio/*
 *
 * Determinism: one seeded PRNG per variant. Same input => byte-identical WAVs.
 */

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { phoneLevelDb } from './audio-metrics.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const RAW_DIR = join(ROOT, 'audio-src', 'raw');
const PUBLIC_DIR = join(ROOT, 'public', 'audio');

const SR = 44100;
const MASTER_SEED = 0x7c0ffee1;

/* ------------------------------------------------------------------ *
 * 0. small utilities
 * ------------------------------------------------------------------ */

const dbToGain = (db) => Math.pow(10, db / 20);
const gainToDb = (g) => (g <= 0 ? -Infinity : 20 * Math.log10(g));
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const sec = (t) => Math.max(1, Math.round(t * SR));

/** Deterministic PRNG (mulberry32) with the jitter helpers the recipes need. */
class Rng {
  constructor(seed) {
    this.s = seed >>> 0;
  }
  next() {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** uniform in [a, b) */
  range(a, b) {
    return a + (b - a) * this.next();
  }
  /** symmetric jitter: value * (1 ± pct) */
  jitter(value, pct) {
    return value * (1 + this.range(-pct, pct));
  }
  /** symmetric bipolar noise in [-1, 1] */
  bipolar() {
    return this.next() * 2 - 1;
  }
  sign() {
    return this.next() < 0.5 ? -1 : 1;
  }
}

const noiseSeed = (rng) => Math.floor(rng.next() * 0xffffffff) >>> 0;

/* ------------------------------------------------------------------ *
 * 1. DSP toolkit
 * ------------------------------------------------------------------ */

function buf(seconds) {
  return new Float32Array(sec(seconds));
}

/** add src into dst at an offset (seconds), scaled */
function addInto(dst, src, offsetSec = 0, gain = 1) {
  const off = Math.round(offsetSec * SR);
  const n = Math.min(src.length, dst.length - off);
  for (let i = 0; i < n; i++) dst[off + i] += src[i] * gain;
  return dst;
}

/** multiply in place by a time-dependent gain function */
function shape(x, fn) {
  for (let i = 0; i < x.length; i++) x[i] *= fn(i / SR, i);
  return x;
}

/** exponential decay times (in place) */
function expDecay(x, tau, startSec = 0) {
  const s = Math.round(startSec * SR);
  for (let i = s; i < x.length; i++) x[i] *= Math.exp(-(i - s) / SR / tau);
  return x;
}

/** linear attack over `t` seconds, then unity */
function attack(x, t) {
  const n = Math.min(x.length, sec(t));
  for (let i = 0; i < n; i++) x[i] *= i / n;
  return x;
}

function fadeIn(x, t) {
  const n = Math.min(x.length, sec(t));
  for (let i = 0; i < n; i++) x[i] *= i / n;
  return x;
}

function fadeOut(x, t, from = 1) {
  const n = Math.min(x.length, sec(t));
  const s = Math.floor(x.length * from) - n;
  for (let i = 0; i < n; i++) {
    const idx = s + i;
    if (idx < 0 || idx >= x.length) continue;
    x[idx] *= 1 - i / n;
  }
  return x;
}

/** last `t` seconds of the buffer get a raised-cosine fade to zero */
function tailFade(x, t) {
  const n = Math.min(x.length, sec(t));
  const s = x.length - n;
  for (let i = 0; i < n; i++) {
    const p = i / n;
    x[s + i] *= 0.5 + 0.5 * Math.cos(Math.PI * p);
  }
  return x;
}

const tanhSat = (x, drive = 1.6) => {
  const norm = Math.tanh(drive);
  for (let i = 0; i < x.length; i++) x[i] = Math.tanh(x[i] * drive) / norm;
  return x;
};

function whiteNoise(rng, duration) {
  const x = buf(duration);
  for (let i = 0; i < x.length; i++) x[i] = rng.bipolar();
  return x;
}

/** leaky-integrated noise: close to brown noise, DC-blocked */
function brownNoise(rng, duration, leak = 0.012) {
  const x = buf(duration);
  let y = 0;
  for (let i = 0; i < x.length; i++) {
    y += rng.bipolar() * leak;
    y *= 0.9995;
    x[i] = y;
  }
  return biquad(x, 'highpass', 18, 0.707);
}

/* --- one-pole filters --- */
function onePoleLP(x, fc) {
  const a = 1 - Math.exp((-2 * Math.PI * fc) / SR);
  let y = 0;
  for (let i = 0; i < x.length; i++) {
    y += a * (x[i] - y);
    x[i] = y;
  }
  return x;
}

function onePoleHP(x, fc) {
  const a = Math.exp((-2 * Math.PI * fc) / SR);
  let prevX = 0;
  let prevY = 0;
  for (let i = 0; i < x.length; i++) {
    const y = a * (prevY + x[i] - prevX);
    prevX = x[i];
    prevY = y;
    x[i] = y;
  }
  return x;
}

/* --- RBJ biquads (static or swept) --- */
function biquadCoeffs(type, f0, q, gainDb = 0) {
  const w0 = (2 * Math.PI * clamp(f0, 10, SR * 0.48)) / SR;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const alpha = sin / (2 * Math.max(0.0001, q));
  let b0 = 1;
  let b1 = 0;
  let b2 = 0;
  let a0 = 1;
  let a1 = 0;
  let a2 = 0;
  switch (type) {
    case 'lowpass':
      b0 = (1 - cos) / 2;
      b1 = 1 - cos;
      b2 = (1 - cos) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cos;
      a2 = 1 - alpha;
      break;
    case 'highpass':
      b0 = (1 + cos) / 2;
      b1 = -(1 + cos);
      b2 = (1 + cos) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cos;
      a2 = 1 - alpha;
      break;
    case 'bandpass':
      b0 = alpha;
      b1 = 0;
      b2 = -alpha;
      a0 = 1 + alpha;
      a1 = -2 * cos;
      a2 = 1 - alpha;
      break;
    case 'peaking': {
      const A = Math.pow(10, gainDb / 40);
      b0 = 1 + alpha * A;
      b1 = -2 * cos;
      b2 = 1 - alpha * A;
      a0 = 1 + alpha / A;
      a1 = -2 * cos;
      a2 = 1 - alpha / A;
      break;
    }
    default:
      break;
  }
  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: a1 / a0,
    a2: a2 / a0,
  };
}

function biquad(x, type, f0, q = 0.707, gainDb = 0) {
  const c = biquadCoeffs(type, f0, q, gainDb);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const xn = x[i];
    const yn = c.b0 * xn + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    x2 = x1;
    x1 = xn;
    y2 = y1;
    y1 = yn;
    x[i] = yn;
  }
  return x;
}

/** Biquad with a cutoff that moves from f0 to f1 (exponential by default). */
function biquadSweep(x, type, f0, f1, q = 0.707, curve = 'exp') {
  const block = 32;
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  let c = biquadCoeffs(type, f0, q);
  for (let i = 0; i < x.length; i++) {
    if (i % block === 0) {
      const p = i / x.length;
      const f = curve === 'exp' ? f0 * Math.pow(f1 / f0, p) : f0 + (f1 - f0) * p;
      c = biquadCoeffs(type, f, q);
    }
    const xn = x[i];
    const yn = c.b0 * xn + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    x2 = x1;
    x1 = xn;
    y2 = y1;
    y1 = yn;
    x[i] = yn;
  }
  return x;
}

/** Band-limited sawtooth built additively (no aliasing to clean up later). */
function sawAdditive(duration, freq, { maxHarmonicHz = 3500, phase = 0 } = {}) {
  const x = buf(duration);
  const nMax = Math.max(1, Math.floor(maxHarmonicHz / freq));
  for (let h = 1; h <= nMax; h++) {
    const a = 1 / h;
    const f = freq * h;
    if (f >= SR * 0.45) break;
    const w = (2 * Math.PI * f) / SR;
    for (let i = 0; i < x.length; i++) x[i] += a * Math.sin(w * i + phase * h);
  }
  return x;
}

/** Damped sine partial (modal resonator body). */
function modalPartial(dst, { freq, tau, amp = 1, startSec = 0, durSec = null, glide = 0 }) {
  const off = Math.round(startSec * SR);
  const n = Math.min(dst.length - off, Math.floor((durSec ?? tau * 8) * SR));
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const p = i / SR;
    const f = freq * Math.pow(1 + glide, p / Math.max(1e-4, (durSec ?? tau * 8)));
    phase += (2 * Math.PI * f) / SR;
    const env = Math.exp(-p / tau) * (1 - Math.exp(-p / 0.0008));
    dst[off + i] += Math.sin(phase) * amp * env;
  }
  return dst;
}

/** Studio-ish Schroeder reverb; returns a NEW wet buffer of the same length. */
function reverb(x, { room = 0.82, damp = 0.3, mix = 0.3, predelay = 0.006 } = {}) {
  const combDelays = [1557, 1617, 1491, 1422, 1277, 1356];
  const allDelays = [556, 441, 341];
  const fb = 0.7 + 0.28 * room;
  const wet = new Float32Array(x.length);
  const pre = Math.round(predelay * SR);

  let sum = new Float32Array(x.length);
  for (const d of combDelays) {
    const line = new Float32Array(d);
    let idx = 0;
    let lp = 0;
    for (let i = 0; i < x.length; i++) {
      const input = i >= pre ? x[i - pre] : 0;
      const y = line[idx];
      lp = y * (1 - damp) + lp * damp;
      line[idx] = input * 0.25 + lp * fb;
      idx = (idx + 1) % d;
      sum[i] += y;
    }
  }
  for (const d of allDelays) {
    const line = new Float32Array(d);
    let idx = 0;
    const out = new Float32Array(x.length);
    for (let i = 0; i < x.length; i++) {
      const y = line[idx];
      const input = sum[i];
      line[idx] = input + y * 0.5;
      idx = (idx + 1) % d;
      out[i] = y - input;
    }
    sum = out;
  }
  const normGain = 0.16;
  for (let i = 0; i < x.length; i++) wet[i] = sum[i] * normGain;
  // dry + wet, wet normalised against the dry peak by the caller's mix
  const out = new Float32Array(x.length);
  for (let i = 0; i < out.length; i++) out[i] = x[i] * (1 - mix * 0.35) + wet[i] * mix;
  return out;
}

function peak(x) {
  let p = 0;
  for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i]));
  return p;
}

function rms(x) {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * x[i];
  return Math.sqrt(s / x.length);
}

/** Normalise to a peak level, then soft-fade both ends to kill clicks. */
function normalize(x, targetDb, { tail = 0.008 } = {}) {
  const p = peak(x);
  if (p > 0) {
    const g = dbToGain(targetDb) / p;
    for (let i = 0; i < x.length; i++) x[i] *= g;
  }
  // remove DC
  let dc = 0;
  for (let i = 0; i < x.length; i++) dc += x[i];
  dc /= x.length;
  for (let i = 0; i < x.length; i++) x[i] -= dc;
  if (tail > 0) tailFade(x, tail);
  return x;
}

/** Utility: a two-stage "hard-ish" transient = noise click + metal ring. */
function metalResonances(dst, rng, { freqs, taus, amps, startSec = 0, durSec }) {
  for (let k = 0; k < freqs.length; k++) {
    modalPartial(dst, {
      freq: rng.jitter(freqs[k], 0.02),
      tau: rng.jitter(taus[k], 0.05),
      amp: rng.jitter(amps[k], 0.1),
      startSec,
      durSec,
    });
  }
  return dst;
}

function noiseClick(rng, { duration, tau, hp = 800, lp = 12000, bp = null, q = 1 }) {
  const x = whiteNoise(rng, duration);
  if (bp) x.length && biquad(x, 'bandpass', bp, q);
  else {
    onePoleHP(x, hp);
    onePoleLP(x, lp);
  }
  expDecay(x, tau);
  attack(x, 0.0006);
  return x;
}

/* ------------------------------------------------------------------ *
 * 2. recipes
 * ------------------------------------------------------------------ */

const RECIPES = {};

/* --- press: bright mechanical button click (has to survive a phone speaker) --- */
RECIPES.press = (rng) => {
  const out = buf(0.15);

  // 2–4 kHz noise transient: the plastic "tk" a small speaker can reproduce
  const click = whiteNoise(rng, 0.024);
  biquad(click, 'bandpass', rng.jitter(3000, 0.05), 0.85);
  expDecay(click, 0.0055);
  attack(click, 0.0004);
  addInto(out, click, 0, 1.4);

  // a brighter scuff just after it, so it reads as a switch and not as hiss
  const scuff = noiseClick(rng, { duration: 0.014, tau: 0.0014, bp: rng.jitter(4100, 0.06), q: 1.3 });
  addInto(out, scuff, 0.0012, 0.55);

  // short body at 300–800 Hz: the housing of the button, not a bass thump
  const body = buf(0.06);
  let p1 = 0;
  let p2 = 0;
  const f1 = rng.jitter(560, 0.05);
  const f2 = rng.jitter(430, 0.05);
  for (let i = 0; i < body.length; i++) {
    const t = i / SR;
    p1 += (2 * Math.PI * f1) / SR;
    p2 += (2 * Math.PI * f2) / SR;
    const env = Math.min(1, t / 0.0012) * Math.exp(-t / 0.006);
    body[i] = (Math.sin(p1) * 0.7 + Math.sin(p2) * 0.5) * env;
  }
  addInto(out, body, 0.0008, 0.3);

  const tail = reverb(shapedCopy(out), { mix: 0.14, room: 0.28, damp: 0.6 });
  addInto(out, tail, 0, 0.12);
  onePoleLP(out, 9000);
  return normalize(out, -6);
};

function shapedCopy(x) {
  const y = new Float32Array(x.length);
  y.set(x);
  return y;
}

/* --- hover: 2-3 ms highpassed tick + faint resonance --- */
RECIPES.hover = (rng, variant) => {
  const res = [2650, 2280, 3050][variant % 3];
  const out = buf(0.05);
  const tick = whiteNoise(rng, 0.008);
  onePoleHP(tick, 3600);
  expDecay(tick, 0.0012);
  attack(tick, 0.0004);
  addInto(out, tick, 0, 0.7);
  modalPartial(out, {
    freq: rng.jitter(res, 0.05),
    tau: 0.0065,
    amp: 0.28,
    startSec: 0,
    durSec: 0.05,
  });
  onePoleLP(out, 9000);
  return normalize(out, -6);
};

/* --- switch: "tk-clack" of two micro clicks --- */
RECIPES.switch = (rng) => {
  const out = buf(0.12);
  const hits = [0, rng.range(0.025, 0.038)];
  hits.forEach((t, idx) => {
    const c = noiseClick(rng, { duration: 0.02, tau: 0.0011, hp: 1200, lp: 9000 });
    addInto(out, c, t, idx === 0 ? 0.5 : 0.34);
    metalResonances(out, rng, {
      freqs: [rng.jitter(900, 0.05), rng.jitter(2400, 0.05)],
      taus: [0.011, 0.007],
      amps: [idx === 0 ? 0.3 : 0.2, 0.16],
      startSec: t,
      durSec: 0.06,
    });
  });
  onePoleLP(out, 8000);
  return normalize(out, -6);
};

/* --- paper: cardstock handled, grain-modulated band noise --- */
RECIPES.paper = (rng) => {
  const dur = rng.range(0.4, 0.58);
  const out = buf(dur);

  // grain envelope: many tiny irregular bursts
  const grainEnv = new Float32Array(out.length);
  const grains = Math.round(dur * rng.range(45, 75));
  for (let g = 0; g < grains; g++) {
    const t = rng.range(0, dur * 0.94);
    const off = Math.round(t * SR);
    const len = Math.round(rng.range(0.003, 0.028) * SR);
    const amp = Math.pow(rng.next(), 2) * 1.0;
    for (let i = 0; i < len && off + i < grainEnv.length; i++) {
      const p = i / len;
      const a = Math.min(1, i / (0.0008 * SR));
      grainEnv[off + i] += amp * a * Math.exp(-p * 4.2);
    }
  }
  let maxEnv = 0;
  for (let i = 0; i < grainEnv.length; i++) maxEnv = Math.max(maxEnv, grainEnv[i]);
  if (maxEnv > 0) for (let i = 0; i < grainEnv.length; i++) grainEnv[i] /= maxEnv;

  const carrier = whiteNoise(rng, dur);
  const crunch = new Float32Array(out.length);
  for (let i = 0; i < out.length; i++) {
    crunch[i] = carrier[i] * (0.22 + 0.78 * grainEnv[i]);
  }
  // soft attack + uneven texture, then band-limit into 2–6 kHz
  shape(crunch, (t) => Math.sin(Math.PI * Math.min(1, t / dur)) ** 0.55);
  onePoleHP(crunch, 1900);
  onePoleLP(crunch, 6800);
  addInto(out, crunch, 0, 0.9);

  // cardstock body: low-mid noise burst following the same gesture
  const body = whiteNoise(rng, dur);
  onePoleLP(body, 520);
  onePoleHP(body, 120);
  const bodyEnv = new Float32Array(out.length);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    bodyEnv[i] = Math.sin(Math.PI * Math.min(1, t / dur)) * (0.45 + 0.55 * grainEnv[i]);
  }
  for (let i = 0; i < body.length; i++) body[i] *= bodyEnv[i] * 0.5;
  addInto(out, body, 0, 0.42);

  return normalize(out, -6, { tail: 0.012 });
};

/* --- lever_clack: big CLACK then a low CHUNK --- */
RECIPES.lever_clack = (rng) => {
  const out = buf(0.5);
  const trans = noiseClick(rng, { duration: 0.05, tau: 0.0022, hp: 400, lp: 14000 });
  addInto(out, trans, 0, 0.9);
  metalResonances(out, rng, {
    freqs: [420, 1130, 2680],
    taus: [0.11, 0.085, 0.05],
    amps: [0.55, 0.34, 0.2],
    startSec: 0,
    durSec: 0.32,
  });

  const chunkAt = rng.range(0.09, 0.13);
  const chunk = buf(0.26);
  let phase = 0;
  for (let i = 0; i < chunk.length; i++) {
    const p = i / SR;
    const f = 76 * Math.pow(0.72, Math.min(1, p / 0.2));
    phase += (2 * Math.PI * f) / SR;
    chunk[i] = Math.sin(phase) * Math.exp(-p / 0.062);
  }
  const thud = whiteNoise(rng, 0.09);
  onePoleLP(thud, 420);
  expDecay(thud, 0.022);
  attack(thud, 0.001);
  addInto(chunk, thud, 0, 0.55);
  // the CHUNK answers the CLACK: audible, but the transient stays the peak
  attack(chunk, 0.006);
  addInto(out, chunk, chunkAt, 0.42);

  const wet = reverb(shapedCopy(out), { mix: 0.3, room: 0.55, damp: 0.42 });
  addInto(out, wet, 0, 0.3);
  onePoleLP(out, 11000);
  return normalize(out, -6);
};

/* --- bell: modal brass tram bell, ding-ding --- */
RECIPES.bell = (rng) => {
  const out = buf(1.2);
  const f0 = rng.jitter(880, 0.004);
  const ratios = [1, 2.0, 2.76, 5.4, 8.9];
  const taus = [0.35, 0.22, 0.15, 0.075, 0.04];
  const amps = [1, 0.5, 0.34, 0.19, 0.11];

  [0, 0.18].forEach((t, strike) => {
    const g = strike === 0 ? 1 : rng.range(0.6, 0.74);
    for (let k = 0; k < ratios.length; k++) {
      modalPartial(out, {
        freq: f0 * ratios[k] * (1 + rng.range(-0.0015, 0.0015)),
        tau: rng.jitter(taus[k], 0.06),
        amp: rng.jitter(amps[k], 0.1) * g,
        startSec: t,
        durSec: 1.2 - t,
      });
    }
    const strikeNoise = whiteNoise(rng, 0.006);
    biquad(strikeNoise, 'bandpass', 3200, 0.9);
    expDecay(strikeNoise, 0.0012);
    attack(strikeNoise, 0.0003);
    addInto(out, strikeNoise, t, 0.22 * g);
  });

  const wet = reverb(shapedCopy(out), { mix: 0.18, room: 0.45, damp: 0.5 });
  addInto(out, wet, 0, 0.2);
  return normalize(out, -6, { tail: 0.02 });
};

/* --- air_brake: "pssshh" --- */
RECIPES.air_brake = (rng) => {
  const dur = 0.8;
  const out = buf(dur);
  const n = whiteNoise(rng, dur);
  onePoleHP(n, rng.jitter(2300, 0.05));
  // upward tilt at the start
  biquadSweep(n, 'highpass', 900, 2500, 0.7);
  const env = (t) => {
    const a = Math.min(1, t / 0.012);
    const hold = t < 0.09 ? 1 : Math.exp(-(t - 0.09) / 0.24);
    return a * hold;
  };
  shape(n, env);
  addInto(out, n, 0, 0.95);
  // a breath of low-mid air so it isn't pure hiss
  const low = whiteNoise(rng, dur);
  biquad(low, 'bandpass', 700, 0.8);
  shape(low, (t) => Math.min(1, t / 0.02) * Math.exp(-t / 0.18) * 0.3);
  addInto(out, low, 0, 0.2);
  const wet = reverb(shapedCopy(out), { mix: 0.2, room: 0.4, damp: 0.55 });
  addInto(out, wet, 0, 0.14);
  return normalize(out, -6, { tail: 0.02 });
};

/* --- brake_squeal: scratchy metal on metal --- */
RECIPES.brake_squeal = (rng) => {
  const dur = 0.6;
  const out = buf(dur);
  const partials = [rng.range(1820, 1980), rng.range(2260, 2400), rng.range(2740, 2950), rng.range(3100, 3250)];
  const driftSeed = new Rng(noiseSeed(rng));
  const drift = [];
  for (let k = 0; k < 4; k++) {
    const pts = [];
    for (let j = 0; j < 6; j++) pts.push(driftSeed.range(-0.02, 0.02));
    drift.push(pts);
  }
  const sampleDrift = (k, t) => {
    const p = (t / dur) * 5;
    const i = Math.min(4, Math.floor(p));
    const f = p - i;
    return drift[k][i] * (1 - f) + drift[k][i + 1] * f;
  };
  let phase = new Float64Array(4);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const glide = 1 - 0.06 * (t / dur); // slight downward pitch glide
    let s = 0;
    for (let k = 0; k < 4; k++) {
      const f = partials[k] * glide * (1 + sampleDrift(k, t));
      phase[k] += (2 * Math.PI * f) / SR;
      s += Math.sin(phase[k]) * (0.5 - k * 0.09);
    }
    const env = Math.min(1, t / 0.055) * Math.exp(-t / 0.42) * (1 - t / dur > 0 ? 1 : 0);
    // 27 Hz stick-slip amplitude wobble = scratchy
    const wobble = 0.75 + 0.25 * Math.sin(2 * Math.PI * 27 * t + Math.sin(2 * Math.PI * 6.1 * t));
    out[i] = s * env * wobble * 0.5;
  }
  const scratch = whiteNoise(rng, dur);
  biquad(scratch, 'bandpass', 2600, 1.6);
  shape(scratch, (t) => Math.min(1, t / 0.04) * Math.exp(-t / 0.35) * 0.5);
  addInto(out, scratch, 0, 0.5);
  onePoleLP(out, 7500);
  return normalize(out, -6, { tail: 0.02 });
};

/* --- drone: detuned saws under a moving lowpass --- */
RECIPES.drone = (rng) => {
  const dur = 2.0;
  const out = buf(dur);
  const voices = [
    { f: rng.jitter(55, 0.01), det: rng.range(-0.4, 0.4), amp: 1 },
    { f: rng.jitter(82.4, 0.01), det: rng.range(-0.4, 0.4), amp: 0.7 },
    { f: rng.jitter(110, 0.01), det: rng.range(-0.6, 0.6), amp: 0.45 },
    { f: rng.jitter(55, 0.004) * 1.005, det: rng.range(-0.8, 0.8), amp: 0.5 },
  ];
  for (const v of voices) {
    const s = sawAdditive(dur, v.f * (1 + v.det / 100) * 1, { maxHarmonicHz: 1600 });
    addInto(out, s, 0, v.amp / 2);
  }
  biquadSweep(out, 'lowpass', 320, 470, 1.1);
  // slow cutoff movement via a second, gentle pass
  shape(out, (t) => 0.85 + 0.15 * Math.sin((2 * Math.PI * t) / 2.0 - Math.PI / 2));
  shape(out, (t) => Math.min(1, t / 0.45) * (t > dur - 0.55 ? Math.max(0, (dur - t) / 0.55) ** 1.4 : 1));
  onePoleLP(out, 900);
  return normalize(out, -6, { tail: 0.03 });
};

/* --- clack: dry single-resonance rail joint --- */
RECIPES.clack = (rng, variant) => {
  const out = buf(0.12);
  const c = noiseClick(rng, { duration: 0.02, tau: 0.0013, hp: 1600, lp: 13000 });
  addInto(out, c, 0, 0.8);
  const res = [1250, 1680, 1950][variant % 3];
  modalPartial(out, {
    freq: rng.jitter(res, 0.05),
    tau: 0.017,
    amp: 0.5,
    startSec: 0,
    durSec: 0.09,
  });
  modalPartial(out, {
    freq: rng.jitter(res * 1.62, 0.05),
    tau: 0.009,
    amp: 0.22,
    startSec: 0,
    durSec: 0.06,
  });
  onePoleLP(out, 12000);
  return normalize(out, -6);
};

/* --- impact_muffled: crash heard through a wall --- */
RECIPES.impact_muffled = (rng) => {
  const out = buf(0.6);
  const burst = whiteNoise(rng, 0.4);
  onePoleLP(burst, rng.jitter(500, 0.05));
  expDecay(burst, 0.075);
  attack(burst, 0.0015);
  addInto(out, burst, 0, 0.75);

  const sweep = buf(0.45);
  let phase = 0;
  for (let i = 0; i < sweep.length; i++) {
    const p = i / 0.45;
    const f = 90 * Math.pow(35 / 90, p);
    phase += (2 * Math.PI * f) / SR;
    sweep[i] = Math.sin(phase) * Math.exp(-(i / SR) / 0.13) * (1 - Math.exp(-(i / SR) / 0.004));
  }
  addInto(out, sweep, 0.004, 0.65);

  const rattle = buf(0.3);
  metalResonances(rattle, rng, {
    freqs: [170, 265, 380],
    taus: [0.06, 0.045, 0.03],
    amps: [0.3, 0.22, 0.14],
    startSec: 0.01,
    durSec: 0.25,
  });
  onePoleLP(rattle, 720);
  addInto(out, rattle, 0, 0.5);

  // 150–400 Hz chest: a body you feel on headphones, still "through a wall"
  const chest = whiteNoise(rng, 0.2);
  biquad(chest, 'bandpass', rng.jitter(265, 0.06), 1.1);
  expDecay(chest, 0.07);
  attack(chest, 0.002);
  addInto(out, chest, 0, 1);

  // the crack that survives a phone speaker: 1–3 kHz, short and dry
  const crack = whiteNoise(rng, 0.12);
  biquad(crack, 'bandpass', rng.jitter(2100, 0.08), 0.75);
  expDecay(crack, 0.028);
  attack(crack, 0.0009);
  addInto(out, crack, 0, 1.7);

  const wet = reverb(shapedCopy(out), { mix: 0.28, room: 0.5, damp: 0.6 });
  addInto(out, wet, 0, 0.2);
  onePoleLP(out, 5200);
  return normalize(out, -3, { tail: 0.02 });
};

/* --- crash_comic: exaggerated cartoon crash --- */
RECIPES.crash_comic = (rng) => {
  const dur = 1.2;
  const out = buf(dur);

  // 1. big layered hit
  const hit = whiteNoise(rng, 0.35);
  onePoleHP(hit, 300);
  expDecay(hit, 0.05);
  attack(hit, 0.001);
  addInto(out, hit, 0, 0.55);

  const partials = [220, 311, 425, 596, 792, 1078, 1432];
  for (let k = 0; k < partials.length; k++) {
    modalPartial(out, {
      freq: rng.jitter(partials[k], 0.03),
      tau: rng.range(0.06, 0.22),
      amp: 0.2 * Math.pow(0.82, k),
      startSec: rng.range(0, 0.012),
      durSec: 0.6,
    });
  }
  // descending body sweep
  const sweep = buf(0.5);
  let ph = 0;
  for (let i = 0; i < sweep.length; i++) {
    const p = i / 0.5;
    const f = 210 * Math.pow(0.3, p);
    ph += (2 * Math.PI * f) / SR;
    sweep[i] = Math.sin(ph) * Math.exp(-(i / SR) / 0.18) * (1 - Math.exp(-(i / SR) / 0.003));
  }
  addInto(out, sweep, 0, 0.5);

  // 2. rising screech 1.5 -> 3.5 kHz with vibrato, starts ~0.35 s
  const screech = buf(0.55);
  let sp = 0;
  for (let i = 0; i < screech.length; i++) {
    const t = i / SR;
    const p = t / 0.55;
    const f = 1500 * Math.pow(3.5 / 1.5, p) * (1 + 0.012 * Math.sin(2 * Math.PI * 7.5 * t));
    sp += (2 * Math.PI * f) / SR;
    const env = Math.min(1, t / 0.05) * Math.sin(Math.PI * Math.min(1, p * 0.95 + 0.02));
    screech[i] = (Math.sin(sp) + 0.25 * Math.sin(sp * 2)) * env * 0.22;
  }
  addInto(out, screech, 0.3, 1);

  // 3. record scratch: rapid back-and-forth filtered noise, last 150 ms
  const scratch = buf(0.16);
  const sc = whiteNoise(rng, 0.16);
  let idx = 0;
  for (let i = 0; i < scratch.length; i++) {
    const t = i / SR;
    // wobble the read position of a noise loop => pitch-ish gesture
    const rate = 26 + 18 * Math.sin(2 * Math.PI * 9 * t);
    idx += 1 + rate * 0.02;
    const a = sc[Math.floor(idx) % sc.length];
    scratch[i] = a * Math.min(1, t / 0.008) * Math.min(1, (0.16 - t) / 0.02);
  }
  biquadSweep(scratch, 'bandpass', 2400, 900, 2.2);
  addInto(out, scratch, 0.98, 0.75);

  const wet = reverb(shapedCopy(out), { mix: 0.22, room: 0.6, damp: 0.4 });
  addInto(out, wet, 0, 0.22);
  onePoleLP(out, 9500);
  return normalize(out, -3, { tail: 0.02 });
};

/* --- stamp: the hero sound --- */
RECIPES.stamp = (rng) => {
  const out = buf(0.4);

  // soft rubber transient (~3 ms), low-passed so it reads as ink pad, not click
  const trans = whiteNoise(rng, 0.02);
  onePoleLP(trans, rng.jitter(1600, 0.05));
  onePoleHP(trans, 200);
  expDecay(trans, 0.0014);
  attack(trans, 0.0004);
  addInto(out, trans, 0, 0.32);

  // heavy low body: 140 -> 55 Hz sweep, weighty
  const body = buf(0.34);
  let phase = 0;
  const fStart = rng.jitter(142, 0.03);
  for (let i = 0; i < body.length; i++) {
    const t = i / SR;
    const p = Math.min(1, t / 0.11);
    const f = fStart * Math.pow(55 / fStart, p);
    phase += (2 * Math.PI * f) / SR;
    body[i] = Math.sin(phase) * Math.exp(-t / 0.048) * (1 - Math.exp(-t / 0.0018));
  }
  addInto(out, body, 0, 0.62);

  // woody desk resonance
  modalPartial(out, {
    freq: rng.jitter(205, 0.04),
    tau: 0.032,
    amp: 0.22,
    startSec: 0.001,
    durSec: 0.2,
  });

  // dry noise slap at 1–3 kHz: ink pad meeting paper, the part a phone hears
  const slap = whiteNoise(rng, 0.1);
  biquad(slap, 'bandpass', rng.jitter(2000, 0.07), 0.75);
  expDecay(slap, 0.034);
  attack(slap, 0.0008);
  addInto(out, slap, 0, 3.4);

  // very short dry room tail
  const wet = reverb(shapedCopy(out), { mix: 0.16, room: 0.25, damp: 0.75 });
  addInto(out, wet, 0, 0.14);
  onePoleLP(out, 7000);
  return normalize(out, -3, { tail: 0.02 });
};

/* ------------------------------------------------------------------ *
 * 3. ambience (30 s seamless loop)
 * ------------------------------------------------------------------ */

function renderAmbience(rng) {
  const LOOP = 30;
  const XFADE = 2;
  const total = LOOP + XFADE;
  const x = buf(total);

  // brown-noise room hum
  const hum = brownNoise(rng, total, 0.02);
  onePoleLP(hum, 120);
  onePoleHP(hum, 28);
  shape(hum, (t) => 0.8 + 0.2 * Math.sin((2 * Math.PI * t) / 19 + 0.7));
  addInto(x, hum, 0, 1.0);

  // faint 50 Hz mains tone + harmonics, very slow level wobble
  const mains = buf(total);
  for (let i = 0; i < mains.length; i++) {
    const t = i / SR;
    mains[i] =
      Math.sin(2 * Math.PI * 50 * t) * 0.5 +
      Math.sin(2 * Math.PI * 100 * t + 1.1) * 0.22 +
      Math.sin(2 * Math.PI * 150 * t + 2.3) * 0.1 +
      Math.sin(2 * Math.PI * 200.3 * t + 0.4) * 0.05;
  }
  shape(mains, (t) => 0.75 + 0.25 * Math.sin((2 * Math.PI * t) / 7.3 + 1.7));
  addInto(x, mains, 0, 0.05);

  // vinyl crackle: sparse, irregular, very quiet
  const crackle = buf(total);
  const crackleRng = new Rng(noiseSeed(rng));
  let tPos = 0.25;
  while (tPos < total - 0.3) {
    tPos += crackleRng.range(0.03, 1.1);
    if (tPos > total - 0.1) break;
    // keep the loop seams clean
    if (tPos < 0.08 || (tPos > LOOP - 0.08 && tPos < LOOP + 0.08)) continue;
    const c = whiteNoise(crackleRng, 0.006);
    biquad(c, 'bandpass', crackleRng.range(2500, 5200), 2.2);
    expDecay(c, crackleRng.range(0.0004, 0.0012));
    attack(c, 0.0002);
    addInto(crackle, c, tPos, crackleRng.range(0.1, 0.55));
  }
  addInto(x, crackle, 0, 0.06);

  // distant rail clatter: a soft clack pair every ~0.9 s, pushed far back
  const far = buf(total);
  const farRng = new Rng(noiseSeed(rng));
  for (let t = 0.35; t < total - 0.4; t += rng.range(0.86, 0.95)) {
    if (t < 0.09 || (t > LOOP - 0.09 && t < LOOP + 0.09)) continue;
    for (let p = 0; p < 2; p++) {
      const hit = whiteNoise(farRng, 0.02);
      onePoleLP(hit, 900);
      expDecay(hit, 0.006);
      attack(hit, 0.0008);
      addInto(far, hit, t + p * 0.11, p === 0 ? 0.5 : 0.3);
      metalResonances(far, farRng, {
        freqs: [rng.range(380, 460), rng.range(700, 780)],
        taus: [0.02, 0.012],
        amps: [0.18, 0.1],
        startSec: t + p * 0.11,
        durSec: 0.12,
      });
    }
  }
  const farWet = reverb(shapedCopy(far), { mix: 0.95, room: 0.92, damp: 0.75, predelay: 0.02 });
  onePoleLP(farWet, 300);
  onePoleHP(farWet, 60);
  addInto(x, farWet, 0, 0.9);

  // overall very low contrast
  onePoleLP(x, 4200);

  // Seamless loop: the extra 2 s tail is folded into the first 2 s.
  //
  // The tail (x[LOOP .. LOOP+XFADE]) is what naturally follows the loop end, so
  // at playback position 0 we must be hearing the tail's first sample and then
  // cross into the head content. Because x[LOOP-1] -> x[LOOP] is an ordinary
  // adjacent-sample step in the original render, the wrap-around step equals a
  // normal noise step: no click, no DC jump, and the loudness is unchanged.
  const out = new Float32Array(sec(LOOP));
  const fadeN = sec(XFADE);
  for (let i = 0; i < out.length; i++) {
    if (i < fadeN) {
      const f = i / fadeN;
      const a = f * f * (3 - 2 * f); // smoothstep 0 -> 1
      out[i] = x[i] * a + x[sec(LOOP) + i] * (1 - a);
    } else {
      out[i] = x[i];
    }
  }
  // DC block, then make the wrap-around exact.
  //
  // The sample one step before "playhead = 0" is out[n-1]; the sample at 0 is
  // out[0]. For a click-free loop those two must differ by no more than an
  // ordinary noise step. The verifier demands an exact match, so the second
  // half of the final 50 ms is a short smoothstep bridge from the natural
  // signal down onto out[0]. On a bed this quiet that is inaudible, and it also
  // covers any DC/phase residue from the filters above.
  biquad(out, 'highpass', 22, 0.707);
  const bridgeN = sec(0.025);
  const start = out.length - bridgeN;
  const from = out[start];
  const to = out[0];
  for (let i = 1; i <= bridgeN; i++) {
    const p = i / bridgeN;
    const w = p * p * (3 - 2 * p);
    out[start + i - 1] = from + (to - from) * w;
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * 4. WAV writer
 * ------------------------------------------------------------------ */

function writeWav(path, data, sampleRate = SR) {
  const n = data.length;
  const bytes = 44 + n * 2;
  const b = Buffer.alloc(bytes);
  b.write('RIFF', 0, 'ascii');
  b.writeUInt32LE(bytes - 8, 4);
  b.write('WAVE', 8, 'ascii');
  b.write('fmt ', 12, 'ascii');
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); // PCM
  b.writeUInt16LE(1, 22); // mono
  b.writeUInt32LE(sampleRate, 24);
  b.writeUInt32LE(sampleRate * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36, 'ascii');
  b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const s = clamp(Math.round(data[i] * 32767), -32768, 32767);
    b.writeInt16LE(s, 44 + i * 2);
  }
  writeFileSync(path, b);
}

/* ------------------------------------------------------------------ *
 * 5. build
 * ------------------------------------------------------------------ */

/**
 * Phone-weighted loudness targets, in dBFS of the rendered slice.
 *
 * T is the level `lever_clack` had before the phone pass (−22.6 dBFS on this
 * metric) minus 4 dB, so the pack as a whole gets 4 dB quieter against the
 * untouched ambience bed while the cues that were inaudible on a phone
 * (`press`, `stamp_*`, `impact_muffled_*`) come up. The verifier measures the
 * same number and checks these bands.
 *
 * Peaks stay at or below the stated ceiling: −6 dBFS, and −3 dBFS for the
 * stamp/impact group. Nothing is compressed; the trim is a single scale factor.
 */
const PHONE_T = -26.6;
/** quiet ticks: hover + rail clacks */
const PHONE_TICK = -32.6;
/** the drone is a bed, not a cue */
const PHONE_BED = -34.6;

/** name -> number of variants (1 = no suffix in the engine) */
const SOUNDS = [
  { base: 'press', variants: 1, recipe: 'press', peak: -6, phone: PHONE_T },
  { base: 'hover', variants: 3, recipe: 'hover', peak: -6, phone: PHONE_TICK },
  { base: 'switch', variants: 2, recipe: 'switch', peak: -6, phone: PHONE_T },
  { base: 'paper', variants: 3, recipe: 'paper', peak: -6, phone: PHONE_T },
  { base: 'lever_clack', variants: 2, recipe: 'lever_clack', peak: -6, phone: PHONE_T },
  { base: 'bell', variants: 1, recipe: 'bell', peak: -6, phone: PHONE_T },
  { base: 'air_brake', variants: 1, recipe: 'air_brake', peak: -6, phone: PHONE_T },
  { base: 'brake_squeal', variants: 1, recipe: 'brake_squeal', peak: -6, phone: PHONE_T },
  { base: 'drone', variants: 1, recipe: 'drone', peak: -6, phone: PHONE_BED },
  { base: 'clack', variants: 3, recipe: 'clack', peak: -6, phone: PHONE_TICK },
  { base: 'impact_muffled', variants: 2, recipe: 'impact_muffled', peak: -3, phone: PHONE_T },
  { base: 'crash_comic', variants: 1, recipe: 'crash_comic', peak: -3, phone: PHONE_T },
  { base: 'stamp', variants: 2, recipe: 'stamp', peak: -3, phone: PHONE_T },
];

function variantName(base, index, count) {
  return count === 1 ? base : `${base}_${index + 1}`;
}

function findFfmpeg() {
  const candidates = [process.env.FFMPEG, 'ffmpeg', join(process.env.HOME ?? '', '.local/bin/ffmpeg')];
  for (const c of candidates) {
    if (!c) continue;
    try {
      execFileSync(c, ['-version'], { stdio: 'ignore' });
      return c;
    } catch {
      /* try next */
    }
  }
  return null;
}

function measureLufs(ffmpeg, wavPath) {
  const res = spawnSync(
    ffmpeg,
    [
      '-hide_banner',
      '-nostats',
      '-i',
      wavPath,
      '-af',
      'loudnorm=I=-26:TP=-3:print_format=json',
      '-f',
      'null',
      '-',
    ],
    { encoding: 'utf8' },
  );
  return parseLoudnorm(`${res.stderr || ''}${res.stdout || ''}`);
}

function parseLoudnorm(text) {
  const start = text.lastIndexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < 0) return null;
  try {
    const json = JSON.parse(text.slice(start, end + 1));
    return {
      inputI: Number(json.input_i),
      inputTp: Number(json.input_tp),
      inputLra: Number(json.input_lra),
    };
  } catch {
    return null;
  }
}

function main() {
  mkdirSync(RAW_DIR, { recursive: true });
  mkdirSync(PUBLIC_DIR, { recursive: true });

  const rendered = [];
  let vSeed = MASTER_SEED;

  for (const sound of SOUNDS) {
    for (let v = 0; v < sound.variants; v++) {
      const name = variantName(sound.base, v, sound.variants);
      const rng = new Rng((vSeed = (vSeed * 1664525 + 1013904223) >>> 0));
      const recipe = RECIPES[sound.recipe];
      const data = recipe(rng, v);
      // recipes normalise themselves; re-normalise defensively to the spec peak
      normalize(data, sound.peak);
      // then a single per-sound trim so the phone-weighted level hits its target
      const phoneBefore = phoneLevelDb(data);
      const trimDb = sound.phone - phoneBefore;
      const trimGain = dbToGain(trimDb);
      for (let i = 0; i < data.length; i++) data[i] *= trimGain;
      const peakDb = gainToDb(peak(data));
      if (peakDb > sound.peak + 0.01) {
        console.warn(
          `  !! ${name}: peak ${peakDb.toFixed(2)} dBFS exceeds the ${sound.peak} dBFS ceiling`,
        );
      }
      writeWav(join(RAW_DIR, `${name}.wav`), data);
      rendered.push({ name, data, peakDb: sound.peak });
      console.log(
        `rendered ${name.padEnd(18)} ${(data.length / SR).toFixed(2)}s  ` +
          `phone ${phoneLevelDb(data).toFixed(2).padStart(7)} dBFS  ` +
          `peak ${peakDb.toFixed(2).padStart(7)} dBFS`,
      );
    }
  }

  /* ---- sprite ---- */
  const gap = 0.1;
  let totalSamples = 0;
  for (const r of rendered) totalSamples += r.data.length + sec(gap);
  totalSamples += sec(gap);
  const sprite = new Float32Array(totalSamples);
  const map = {};
  let cursor = 0;
  for (const r of rendered) {
    const startMs = Math.round((cursor / SR) * 1000);
    addInto(sprite, r.data, cursor / SR, 1);
    const durMs = Math.round((r.data.length / SR) * 1000);
    map[r.name] = [startMs, durMs];
    cursor += r.data.length + sec(gap);
  }
  writeWav(join(RAW_DIR, '_sprite.wav'), sprite);

  const json = { sprite: map };
  writeFileSync(join(PUBLIC_DIR, 'sfx.json'), JSON.stringify(json, null, 2) + '\n');
  writeFileSync(join(RAW_DIR, '_sprite.json'), JSON.stringify(json, null, 2) + '\n');
  console.log(
    `\nsprite: ${(sprite.length / SR).toFixed(2)}s, ${rendered.length} sounds, ` +
      `${(sprite.length / SR * 2 * 44.1).toFixed(0)} kB as 16-bit WAV`,
  );
  console.log(`wrote ${join(PUBLIC_DIR, 'sfx.json')}`);

  /* ---- ambience ---- */
  const ambRng = new Rng(0x4badcafe);
  const amb = renderAmbience(ambRng);
  const ambPath = join(RAW_DIR, 'ambience.wav');
  const target = -26;
  // DC-block, then hit -26 LUFS with ffmpeg measurement if available
  let dcSum = 0;
  for (let i = 0; i < amb.length; i++) dcSum += amb[i];
  const dcMean = dcSum / amb.length;
  for (let i = 0; i < amb.length; i++) amb[i] -= dcMean;
  const ffmpeg = findFfmpeg();
  if (ffmpeg) {
    writeWav(ambPath, amb);
    const m = measureLufs(ffmpeg, ambPath);
    if (m && Number.isFinite(m.inputI)) {
      const gainDb = target - m.inputI;
      const g = dbToGain(gainDb);
      for (let i = 0; i < amb.length; i++) amb[i] *= g;
      // true peak guard
      const p = peak(amb);
      if (gainToDb(p) > -3) {
        const trim = dbToGain(-3.2) / p;
        for (let i = 0; i < amb.length; i++) amb[i] *= trim;
      }
      console.log(
        `ambience: measured ${m.inputI.toFixed(2)} LUFS (TP ${m.inputTp.toFixed(2)} dBTP), ` +
          `applied ${gainDb.toFixed(2)} dB -> ${target} LUFS`,
      );
    } else {
      console.warn('ambience: loudnorm measurement failed, using RMS estimate');
      normalizeRms(amb, -26);
    }
  } else {
    console.log('ambience: ffmpeg not found, using RMS-based loudness estimate');
    normalizeRms(amb, -26);
  }
  writeWav(ambPath, amb);
  console.log(`rendered ambience.wav ${(amb.length / SR).toFixed(2)}s`);

  if (!existsSync(join(PUBLIC_DIR, 'sfx.json'))) {
    throw new Error('sfx.json missing after build');
  }
}

/** Fallback loudness: -26 LUFS is roughly -26 dBFS RMS for this dense, quiet bed. */
function normalizeRms(x, lufs) {
  const r = rms(x);
  if (r <= 0) return x;
  const g = dbToGain(lufs) / r;
  for (let i = 0; i < x.length; i++) x[i] *= g;
  return x;
}

main();
