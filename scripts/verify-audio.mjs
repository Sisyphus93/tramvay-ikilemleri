#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Numeric acceptance test for the generated audio package.
 *
 * Nobody can listen to a CI run, so every subjective claim in the sound design
 * is turned into a measurement: slice bounds, headroom, RMS, DC offset, attack
 * time, spectral centroid, modal partials, low-band energy, variant
 * de-correlation and ambience loop continuity. Exit code 1 on any failure.
 *
 * Usage: node scripts/verify-audio.mjs [--verbose]
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT_DIR = path.join(ROOT, 'public', 'audio');

const REQUIRED = [
  'press',
  'hover_1',
  'hover_2',
  'hover_3',
  'switch_1',
  'switch_2',
  'paper_1',
  'paper_2',
  'paper_3',
  'lever_clack_1',
  'lever_clack_2',
  'bell',
  'air_brake',
  'brake_squeal',
  'drone',
  'clack_1',
  'clack_2',
  'clack_3',
  'impact_muffled_1',
  'impact_muffled_2',
  'crash_comic',
  'stamp_1',
  'stamp_2',
  'sting_relief',
  'sting_dread',
  'sting_absurd',
];

const TRANSIENT_NAMES = [
  'press',
  'hover_1',
  'hover_2',
  'hover_3',
  'switch_1',
  'switch_2',
  'clack_1',
  'clack_2',
  'clack_3',
  'lever_clack_1',
  'lever_clack_2',
  'stamp_1',
  'stamp_2',
];

const VARIANT_GROUPS = [
  ['hover_1', 'hover_2', 'hover_3'],
  ['switch_1', 'switch_2'],
  ['paper_1', 'paper_2', 'paper_3'],
  ['lever_clack_1', 'lever_clack_2'],
  ['clack_1', 'clack_2', 'clack_3'],
  ['impact_muffled_1', 'impact_muffled_2'],
  ['stamp_1', 'stamp_2'],
];

const EVENT_263 = 880; // bell fundamental, Hz

/* ------------------------------------------------------------------ */
/* WAV + DSP helpers (independent of the generator)                    */
/* ------------------------------------------------------------------ */

function decodeWav(buffer) {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('not a RIFF/WAVE file (a SPA fallback serving index.html would look like this)');
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
  return { ...fmt, samples: out };
}

const db = (lin) => 20 * Math.log10(Math.max(lin, 1e-12));

const peak = (x) => {
  let p = 0;
  for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i]));
  return p;
};

const rms = (x, from = 0, to = x.length) => {
  let sum = 0;
  const a = Math.max(0, from);
  const b = Math.min(x.length, to);
  if (b <= a) return 0;
  for (let i = a; i < b; i++) sum += x[i] * x[i];
  return Math.sqrt(sum / (b - a));
};

const mean = (x) => {
  let sum = 0;
  for (let i = 0; i < x.length; i++) sum += x[i];
  return sum / x.length;
};

const correlation = (a, b) => {
  const n = Math.min(a.length, b.length);
  const ma = mean(a.subarray(0, n));
  const mb = mean(b.subarray(0, n));
  let num = 0;
  let da = 0;
  let dbv = 0;
  for (let i = 0; i < n; i++) {
    const u = a[i] - ma;
    const v = b[i] - mb;
    num += u * v;
    da += u * u;
    dbv += v * v;
  }
  if (da <= 0 || dbv <= 0) return 0;
  return num / Math.sqrt(da * dbv);
};

/** In-place iterative radix-2 FFT. */
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i];
      re[i] = re[j];
      re[j] = t;
      t = im[i];
      im[i] = im[j];
      im[j] = t;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k];
        const ui = im[i + k];
        const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr;
        im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr;
        im[i + k + len / 2] = ui - vi;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

/** Magnitude spectrum with a Hann window (zero-padded to fftSize). */
function spectrum(x, from, length, fftSize = 16384) {
  const re = new Float32Array(fftSize);
  const im = new Float32Array(fftSize);
  const n = Math.min(length, x.length - from);
  for (let i = 0; i < n; i++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / Math.max(1, n - 1));
    re[i] = x[from + i] * w;
  }
  fft(re, im);
  const mag = new Float32Array(fftSize / 2);
  for (let i = 0; i < fftSize / 2; i++) mag[i] = Math.hypot(re[i], im[i]);
  return mag;
}

/** Magnitude-weighted spectral centroid, in Hz. */
function spectralCentroid(x, sampleRate) {
  const fftSize = 16384;
  const mag = spectrum(x, 0, x.length, fftSize);
  const binHz = sampleRate / fftSize;
  let num = 0;
  let den = 0;
  for (let i = 1; i < mag.length; i++) {
    num += i * binHz * mag[i];
    den += mag[i];
  }
  return den > 0 ? num / den : 0;
}

/** Fraction of spectral power below `hz`. */
function lowBandRatio(x, sampleRate, hz) {
  const fftSize = 16384;
  const mag = spectrum(x, 0, x.length, fftSize);
  const binHz = sampleRate / fftSize;
  let low = 0;
  let total = 0;
  for (let i = 1; i < mag.length; i++) {
    const p = mag[i] * mag[i];
    total += p;
    if (i * binHz < hz) low += p;
  }
  return total > 0 ? low / total : 0;
}

function biquadBand(x, freq, Q, sampleRate) {
  const w0 = (2 * Math.PI * freq) / sampleRate;
  const cw = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * Q);
  const a0 = 1 + alpha;
  const b0 = alpha / a0;
  const a1 = (-2 * cw) / a0;
  const a2 = (1 - alpha) / a0;
  const y = new Float32Array(x.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const xin = x[i];
    const yv = b0 * xin - b0 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = xin;
    y2 = y1;
    y1 = yv;
    y[i] = yv;
  }
  return y;
}

const kWeight = (x, sampleRate) => {
  const shelf = biquadGeneric(x, 'highshelf', 1500, 0.7071752, 4, sampleRate);
  return biquadGeneric(shelf, 'highpass', 38, 0.500327, 0, sampleRate);
};

function biquadGeneric(x, type, freq, Q, gainDb, sampleRate) {
  const w0 = (2 * Math.PI * freq) / sampleRate;
  const cw = Math.cos(w0);
  const sw = Math.sin(w0);
  const alpha = sw / (2 * Q);
  const A = Math.pow(10, gainDb / 40);
  let b0;
  let b1;
  let b2;
  let a0;
  let a1;
  let a2;
  if (type === 'highshelf') {
    b0 = A * (A + 1 + (A - 1) * cw + 2 * Math.sqrt(A) * alpha);
    b1 = -2 * A * (A - 1 + (A + 1) * cw);
    b2 = A * (A + 1 + (A - 1) * cw - 2 * Math.sqrt(A) * alpha);
    a0 = A + 1 - (A - 1) * cw + 2 * Math.sqrt(A) * alpha;
    a1 = 2 * (A - 1 - (A + 1) * cw);
    a2 = A + 1 - (A - 1) * cw - 2 * Math.sqrt(A) * alpha;
  } else {
    b0 = (1 + cw) / 2;
    b1 = -(1 + cw);
    b2 = (1 + cw) / 2;
    a0 = 1 + alpha;
    a1 = -2 * cw;
    a2 = 1 - alpha;
  }
  const y = new Float32Array(x.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const xin = x[i];
    const yv = ((b0 / a0) * xin + (b1 / a0) * x1 + (b2 / a0) * x2 - (a1 / a0) * y1 - (a2 / a0) * y2);
    x2 = x1;
    x1 = xin;
    y2 = y1;
    y1 = yv;
    y[i] = yv;
  }
  return y;
}

function integratedLoudness(x, sampleRate) {
  const y = kWeight(x, sampleRate);
  const blockLen = Math.round(0.4 * sampleRate);
  const hop = Math.round(0.1 * sampleRate);
  const blocks = [];
  for (let s = 0; s + blockLen <= y.length; s += hop) {
    let sum = 0;
    for (let i = s; i < s + blockLen; i++) sum += y[i] * y[i];
    blocks.push(sum / blockLen);
  }
  if (!blocks.length) return -Infinity;
  const abs = blocks.filter((z) => -0.691 + 10 * Math.log10(Math.max(z, 1e-12)) > -70);
  if (!abs.length) return -Infinity;
  const mean1 = abs.reduce((a, b) => a + b, 0) / abs.length;
  const relGate = -0.691 + 10 * Math.log10(mean1) - 10;
  const gated = abs.filter((z) => -0.691 + 10 * Math.log10(Math.max(z, 1e-12)) > relGate);
  const set = gated.length ? gated : abs;
  return -0.691 + 10 * Math.log10(Math.max(set.reduce((a, b) => a + b, 0) / set.length, 1e-12));
}

function truePeak(x) {
  let p = 0;
  const at = (i) => (i < 0 || i >= x.length ? 0 : x[i]);
  for (let i = 0; i < x.length; i++) {
    p = Math.max(p, Math.abs(at(i)));
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
      p = Math.max(p, Math.abs(s));
    }
  }
  return p;
}

/* ------------------------------------------------------------------ */
/* Checks                                                              */
/* ------------------------------------------------------------------ */

const results = [];
function check(group, name, value, ok, detail) {
  results.push({ group, name, value, ok, detail });
}

async function main() {
  const verbose = process.argv.includes('--verbose');

  let manifest;
  try {
    manifest = JSON.parse(await readFile(path.join(OUT_DIR, 'sfx.json'), 'utf8'));
  } catch (err) {
    console.error(`FAIL: cannot read public/audio/sfx.json — ${err.message}`);
    process.exit(1);
  }

  const spriteFile = await readFile(path.join(OUT_DIR, 'sfx.wav'));
  const sprite = decodeWav(spriteFile);
  const sr = sprite.sampleRate;

  /* --- manifest / bounds / headroom / silence / DC ------------------- */
  const spriteMap = manifest.sprite ?? {};
  const missing = REQUIRED.filter((n) => !spriteMap[n]);
  const extra = Object.keys(spriteMap).filter((n) => !REQUIRED.includes(n));
  check('manifest', 'all required names present', missing.length ? missing.join(',') : 'yes', missing.length === 0);
  check('manifest', 'no unknown names', extra.length ? extra.join(',') : 'none', extra.length === 0);
  check('sprite', 'mono 16-bit', `${sprite.channels}ch/${sprite.bits}bit`, sprite.channels === 1 && sprite.bits === 16);
  check('sprite', 'sample rate', `${sr} Hz`, sr === 32000);
  check('sprite', 'file size', `${(spriteFile.length / 1024 / 1024).toFixed(2)} MB`, spriteFile.length < 1.5 * 1024 * 1024);

  const slices = {};
  for (const name of REQUIRED) {
    const entry = spriteMap[name];
    if (!entry) continue;
    const [startMs, durMs] = entry;
    const start = Math.round((startMs / 1000) * sr);
    const count = Math.round((durMs / 1000) * sr);
    const inBounds = start >= 0 && count > 0 && start + count <= sprite.samples.length;
    check('bounds', name, `${startMs}+${durMs}ms`, inBounds);
    if (!inBounds) continue;
    slices[name] = sprite.samples.subarray(start, start + count);
  }

  for (const [name, x] of Object.entries(slices)) {
    const pk = db(peak(x));
    check('headroom', name, `${pk.toFixed(1)} dBFS`, pk < -1);
    const r = db(rms(x));
    check('level', name, `${r.toFixed(1)} dBFS RMS`, r > -45);
    const dc = Math.abs(mean(x));
    check('dc', name, `${dc.toFixed(5)}`, dc < 0.002);
  }

  /* --- transient attack --------------------------------------------- */
  for (const name of TRANSIENT_NAMES) {
    const x = slices[name];
    if (!x) continue;
    let peakIdx = 0;
    let p = 0;
    for (let i = 0; i < x.length; i++) {
      if (Math.abs(x[i]) > p) {
        p = Math.abs(x[i]);
        peakIdx = i;
      }
    }
    const ms = (peakIdx / sr) * 1000;
    check('attack', name, `${ms.toFixed(1)} ms`, ms <= 10);
  }

  /* --- spectral character ------------------------------------------- */
  const centroidOf = (name) => (slices[name] ? spectralCentroid(slices[name], sr) : NaN);

  for (const name of ['stamp_1', 'stamp_2', 'impact_muffled_1', 'impact_muffled_2']) {
    const c = centroidOf(name);
    check('centroid', name, `${c.toFixed(0)} Hz < 800`, c < 800);
  }
  for (const name of ['air_brake', 'paper_1', 'paper_2', 'paper_3']) {
    const c = centroidOf(name);
    check('centroid', name, `${c.toFixed(0)} Hz > 2000`, c > 2000);
  }
  for (const name of ['drone', 'sting_dread']) {
    const ratio = lowBandRatio(slices[name], sr, 500);
    check('low-band', name, `${(ratio * 100).toFixed(1)}% < 500 Hz`, ratio > 0.8);
  }

  /* --- bell: inharmonic partials + fundamental sustain ---------------- */
  const bell = slices.bell;
  if (bell) {
    const mag = spectrum(bell, 0, Math.round(0.25 * sr), 16384);
    const binHz = sr / 16384;
    let maxMag = 0;
    for (let i = 1; i < mag.length; i++) maxMag = Math.max(maxMag, mag[i]);
    const ratios = [1, 2.0, 2.76, 5.4, 8.9];
    let found = 0;
    const foundHz = [];
    for (const r of ratios) {
      const f = EVENT_263 * r;
      const lo = Math.max(1, Math.floor((f * 0.97) / binHz));
      const hi = Math.min(mag.length - 2, Math.ceil((f * 1.03) / binHz));
      let best = 0;
      let bestHz = 0;
      for (let i = lo; i <= hi; i++) {
        if (mag[i] > best) {
          best = mag[i];
          bestHz = i * binHz;
        }
      }
      const rel = db(best / maxMag);
      const isPeak = best > 0 && rel > -30;
      if (isPeak) {
        found++;
        foundHz.push(`${(bestHz / EVENT_263).toFixed(2)}×`);
      } else {
        foundHz.push('—');
      }
      check('bell-partial', `${r.toFixed(2)}× (${f.toFixed(0)} Hz)`, `${rel.toFixed(1)} dB`, isPeak);
    }
    check('bell', 'partials found', `${found}/5 [${foundHz.join(' ')}]`, found === 5);

    const band = biquadBand(bell, EVENT_263, 4, sr);
    const early = rms(band, 0, Math.round(0.06 * sr));
    const late = rms(band, Math.round(0.6 * sr), Math.round(0.75 * sr));
    const sustain = db(late / early);
    check('bell', 'fundamental at +600 ms', `${sustain.toFixed(1)} dB vs attack`, sustain > -40);
  }

  /* --- variants must be genuinely varied ---------------------------- */
  for (const group of VARIANT_GROUPS) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = slices[group[i]];
        const b = slices[group[j]];
        if (!a || !b) continue;
        const c = correlation(a, b);
        check('variants', `${group[i]} vs ${group[j]}`, `r=${c.toFixed(2)}`, Math.abs(c) < 0.9);
      }
    }
  }

  /* --- ambience ------------------------------------------------------ */
  let ambience = null;
  try {
    ambience = decodeWav(await readFile(path.join(OUT_DIR, 'ambience.wav')));
  } catch (err) {
    check('ambience', 'ambience.wav readable', err.message, false);
  }
  if (ambience) {
    const a = ambience.samples;
    check('ambience', 'duration', `${(a.length / ambience.sampleRate).toFixed(2)} s`, Math.abs(a.length / ambience.sampleRate - 30) < 0.05);
    const lufs = integratedLoudness(a, ambience.sampleRate);
    check('ambience', 'integrated loudness', `${lufs.toFixed(1)} LUFS (target -26 ±2)`, Math.abs(lufs + 26) <= 2);
    const tp = db(truePeak(a));
    check('ambience', 'true peak', `${tp.toFixed(1)} dBFS`, tp < -3);
    const dc = Math.abs(mean(a));
    check('ambience', 'DC offset', dc.toFixed(5), dc < 0.002);

    let sumStep = 0;
    for (let i = 1; i < a.length; i++) sumStep += Math.abs(a[i] - a[i - 1]);
    const avgStep = sumStep / (a.length - 1);
    const boundary = Math.abs(a[0] - a[a.length - 1]);
    check(
      'ambience',
      'loop boundary step',
      `${boundary.toFixed(6)} vs avg ${avgStep.toFixed(6)}`,
      boundary <= avgStep
    );
    // 50 ms either side of the seam: no ticks, no gap
    const head = rms(a, 0, Math.round(0.05 * ambience.sampleRate));
    const tail = rms(a, a.length - Math.round(0.05 * ambience.sampleRate), a.length);
    const jump = Math.abs(db(head / tail));
    check('ambience', 'level match at the seam', `${jump.toFixed(1)} dB`, jump < 6);
  }

  /* --- report -------------------------------------------------------- */
  const failures = results.filter((r) => !r.ok);
  const byGroup = new Map();
  for (const r of results) {
    if (!byGroup.has(r.group)) byGroup.set(r.group, []);
    byGroup.get(r.group).push(r);
  }

  if (verbose) {
    for (const [group, items] of byGroup) {
      console.log(`\n[${group}]`);
      for (const item of items) {
        console.log(`  ${item.ok ? 'ok  ' : 'FAIL'} ${item.name.padEnd(34)} ${item.value}`);
      }
    }
  }

  console.log('');
  for (const [group, items] of byGroup) {
    const bad = items.filter((i) => !i.ok);
    console.log(
      `${bad.length === 0 ? 'PASS' : 'FAIL'}  ${group.padEnd(14)} ${items.length - bad.length}/${items.length} checks`
    );
    for (const item of bad) console.log(`        ↳ ${item.name}: ${item.value}`);
  }

  const summary = new Map();
  summary.set('press', `${db(rms(slices.press)).toFixed(0)} dB RMS · centroid ${centroidOf('press').toFixed(0)} Hz`);
  console.log('');
  console.log(`Checks: ${results.length - failures.length}/${results.length} passed`);
  if (failures.length) {
    console.error(`\n${failures.length} FAILED`);
    process.exit(1);
  }
  console.log('All audio checks passed.');
  void summary;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
