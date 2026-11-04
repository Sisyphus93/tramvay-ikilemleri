/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Shared measurement helpers for the audio build and its verifier.
 *
 * The interesting one is `phoneLevelDb`. A phone speaker reproduces almost
 * nothing below ~350–400 Hz, so full-band RMS says nothing about whether a cue
 * is audible in someone's hand: `press` used to be a 120 Hz thump with a −37 dB
 * full-band-neighbour and was effectively silent on a phone while measuring
 * "fine" on RMS. The phone metric band-limits the slice to what a small speaker
 * can actually reproduce and ignores the silent padding.
 *
 * Pure Node built-ins. No dependencies.
 */

export const SR = 44100;

export const db = (g) => (g <= 0 ? -Infinity : 20 * Math.log10(g));
export const dbToGain = (d) => Math.pow(10, d / 20);

export function peakOf(x) {
  let p = 0;
  for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i]));
  return p;
}

export function rmsOf(x, from = 0, to = x.length) {
  let s = 0;
  for (let i = from; i < to; i++) s += x[i] * x[i];
  return Math.sqrt(s / Math.max(1, to - from));
}

/** RBJ biquad coefficients; Q defaults to 1/√2 (2nd-order Butterworth). */
export function biquadCoeffs(type, f0, sampleRate = SR, q = Math.SQRT1_2) {
  const w0 = (2 * Math.PI * f0) / sampleRate;
  const cos = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * q);
  let b0;
  let b1;
  let b2;
  if (type === 'highpass') {
    b0 = (1 + cos) / 2;
    b1 = -(1 + cos);
    b2 = (1 + cos) / 2;
  } else {
    b0 = (1 - cos) / 2;
    b1 = 1 - cos;
    b2 = (1 - cos) / 2;
  }
  const a0 = 1 + alpha;
  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: (-2 * cos) / a0,
    a2: (1 - alpha) / a0,
  };
}

export function applyBiquad(x, c) {
  const y = new Float32Array(x.length);
  const { b0, b1, b2, a1, a2 } = c;
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const xn = x[i];
    const yn = b0 * xn + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = xn;
    y2 = y1;
    y1 = yn;
    y[i] = yn;
  }
  return y;
}

/** What a phone speaker can reproduce: 2nd-order HP 400 Hz + 2nd-order LP 10 kHz. */
export function phoneWeight(x, sampleRate = SR) {
  const hp = biquadCoeffs('highpass', 400, sampleRate);
  const lp = biquadCoeffs('lowpass', 10000, sampleRate);
  return applyBiquad(applyBiquad(x, hp), lp);
}

/**
 * RMS (dBFS) of the phone-weighted slice over its *active* part — the samples
 * above −40 dB relative to the slice peak, so trailing silence cannot dilute it.
 */
export function phoneLevelDb(x) {
  const p = peakOf(x);
  if (p <= 0) return -Infinity;
  const gate = p * dbToGain(-40);
  const y = phoneWeight(x);
  let sum = 0;
  let n = 0;
  for (let i = 0; i < x.length; i++) {
    if (Math.abs(x[i]) >= gate) {
      sum += y[i] * y[i];
      n++;
    }
  }
  if (n === 0) return -Infinity;
  return db(Math.sqrt(sum / n));
}
