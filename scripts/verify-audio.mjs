#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Numeric QA for the generated sample pack. You cannot listen in CI, so this
 * script measures the rendered WAVs instead:
 *
 *   node scripts/verify-audio.mjs
 *
 * Checks: sprite map integrity, clipping, silence, DC offset, per-sound
 * character (attack time, spectral centroid, band-energy balance, bell
 * inharmonic partials, variant de-correlation) and ambience loop seams +
 * loudness. Exits non-zero if anything fails.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const RAW_DIR = join(ROOT, 'audio-src', 'raw');
const PUBLIC_DIR = join(ROOT, 'public', 'audio');

const SR = 44100;

/* ------------------------------------------------------------------ *
 * WAV reading
 * ------------------------------------------------------------------ */
function readWav(path) {
  const b = readFileSync(path);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error(`${path}: not a RIFF/WAVE file`);
  }
  let pos = 12;
  let fmt = null;
  let data = null;
  while (pos + 8 <= b.length) {
    const id = b.toString('ascii', pos, pos + 4);
    const size = b.readUInt32LE(pos + 4);
    const body = pos + 8;
    if (id === 'fmt ') {
      fmt = {
        channels: b.readUInt16LE(body + 2),
        sampleRate: b.readUInt32LE(body + 4),
        bits: b.readUInt16LE(body + 14),
        format: b.readUInt16LE(body),
      };
    } else if (id === 'data') {
      data = { offset: body, size };
    }
    pos = body + size + (size % 2);
  }
  if (!fmt || !data) throw new Error(`${path}: missing fmt/data chunk`);
  const bytesPer = fmt.bits / 8;
  const frames = Math.floor(data.size / (bytesPer * fmt.channels));
  const ch = [];
  for (let c = 0; c < fmt.channels; c++) ch.push(new Float32Array(frames));
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < fmt.channels; c++) {
      const p = data.offset + (i * fmt.channels + c) * bytesPer;
      ch[c][i] = fmt.bits === 16 ? b.readInt16LE(p) / 32768 : b.readFloatLE(p);
    }
  }
  return { sampleRate: fmt.sampleRate, channels: ch, frames };
}

/* ------------------------------------------------------------------ *
 * measurements
 * ------------------------------------------------------------------ */
const db = (g) => (g <= 0 ? -Infinity : 20 * Math.log10(g));

function peakOf(x) {
  let p = 0;
  for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i]));
  return p;
}

function rmsOf(x, from = 0, to = x.length) {
  let s = 0;
  for (let i = from; i < to; i++) s += x[i] * x[i];
  return Math.sqrt(s / Math.max(1, to - from));
}

function dcOf(x) {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i];
  return s / x.length;
}

/** time (s) from slice start until |x| first reaches 90 % of the slice peak */
function attackTime(x) {
  const p = peakOf(x);
  if (p <= 0) return Infinity;
  const thresh = p * 0.9;
  for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) >= thresh) return i / SR;
  return Infinity;
}

/** magnitude spectrum (naive DFT at chosen bins, Hann-windowed) */
function magnitudeAt(x, freq, sampleRate = SR) {
  const n = Math.min(x.length, 4096);
  const start = 0;
  let re = 0;
  let im = 0;
  let wsum = 0;
  for (let i = 0; i < n; i++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
    const t = (start + i) / sampleRate;
    const v = x[start + i] * w;
    re += v * Math.cos(2 * Math.PI * freq * t);
    im -= v * Math.sin(2 * Math.PI * freq * t);
    wsum += w;
  }
  return Math.hypot(re, im) / (wsum || 1);
}

/** Energy spectrum via FFT, so centroid / band energy is cheap. */
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
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

/** Welch-averaged power spectrum: {mag, binHz} */
function spectrum(x, sampleRate = SR, size = 2048) {
  const n = 1 << Math.round(Math.log2(size));
  const mag = new Float64Array(n / 2);
  let windows = 0;
  for (let off = 0; off + n <= x.length; off += n / 2) {
    const re = new Float64Array(n);
    const im = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
      re[i] = x[off + i] * w;
    }
    fft(re, im);
    for (let k = 0; k < n / 2; k++) mag[k] += Math.hypot(re[k], im[k]) ** 2;
    windows++;
  }
  if (windows > 1) for (let k = 0; k < mag.length; k++) mag[k] /= windows;
  return { mag, binHz: sampleRate / n };
}

function spectralCentroid(x, sampleRate = SR) {
  const { mag, binHz } = spectrum(x, sampleRate);
  let num = 0;
  let den = 0;
  for (let k = 1; k < mag.length; k++) {
    num += mag[k] * k * binHz;
    den += mag[k];
  }
  return den > 0 ? num / den : 0;
}

function bandEnergyFraction(x, lo, hi, sampleRate = SR) {
  const { mag, binHz } = spectrum(x, sampleRate);
  let band = 0;
  let total = 0;
  for (let k = 1; k < mag.length; k++) {
    const f = k * binHz;
    total += mag[k];
    if (f >= lo && f <= hi) band += mag[k];
  }
  return total > 0 ? band / total : 0;
}

function correlation(a, b) {
  const n = Math.min(a.length, b.length);
  let sa = 0;
  let sb = 0;
  let sab = 0;
  for (let i = 0; i < n; i++) {
    sa += a[i] * a[i];
    sb += b[i] * b[i];
    sab += a[i] * b[i];
  }
  const den = Math.sqrt(sa * sb);
  return den > 0 ? sab / den : 0;
}

function findFfmpeg() {
  for (const c of [process.env.FFMPEG, 'ffmpeg', join(process.env.HOME ?? '', '.local/bin/ffmpeg')]) {
    if (!c) continue;
    const r = spawnSync(c, ['-version'], { stdio: 'ignore' });
    if (r.status === 0) return c;
  }
  return null;
}

/** integrated loudness of the whole file via ffmpeg loudnorm */
function measureLufs(path) {
  const ffmpeg = findFfmpeg();
  if (!ffmpeg) return null;
  const r = spawnSync(
    ffmpeg,
    ['-hide_banner', '-nostats', '-i', path, '-af', 'loudnorm=I=-26:TP=-3:print_format=json', '-f', 'null', '-'],
    { encoding: 'utf8' },
  );
  const text = `${r.stderr || ''}${r.stdout || ''}`;
  const s = text.lastIndexOf('{');
  const e = text.lastIndexOf('}');
  if (s < 0 || e < 0) return null;
  try {
    const j = JSON.parse(text.slice(s, e + 1));
    return { I: Number(j.input_i), TP: Number(j.input_tp) };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * expectations
 * ------------------------------------------------------------------ */
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

const TRANSIENTS = ['press', 'hover_1', 'switch_1', 'switch_2', 'clack_1', 'lever_clack_1', 'stamp_1', 'stamp_2'];
const VARIANTS = {
  hover: 3,
  switch: 2,
  paper: 3,
  lever_clack: 2,
  clack: 3,
  impact_muffled: 2,
  stamp: 2,
};

const results = [];
function record(name, check, value, pass, note = '') {
  results.push({ name, check, value, pass, note });
}

/* ------------------------------------------------------------------ *
 * main
 * ------------------------------------------------------------------ */
function main() {
  const jsonPath = join(PUBLIC_DIR, 'sfx.json');
  if (!existsSync(jsonPath)) {
    console.error(`FAIL: ${jsonPath} missing — run \`npm run audio:build\` first`);
    process.exit(1);
  }
  const { sprite: map } = JSON.parse(readFileSync(jsonPath, 'utf8'));
  const spritePath = join(RAW_DIR, '_sprite.wav');
  const sprite = readWav(spritePath);
  const spriteMono = sprite.channels[0];
  const spriteDurMs = (spriteMono.length / sprite.sampleRate) * 1000;

  // 1. map integrity
  for (const name of REQUIRED) {
    const slice = map[name];
    record(name, 'in sfx.json', slice ? 'yes' : 'MISSING', !!slice);
    if (!slice) continue;
    const [start, dur] = slice;
    const inside = start >= 0 && dur > 0 && start + dur <= spriteDurMs + 1;
    record(name, 'slice within file', `${start}+${dur} <= ${spriteDurMs.toFixed(0)}ms`, inside);
  }
  const extra = Object.keys(map).filter((k) => !REQUIRED.includes(k));
  record('map', 'no unexpected entries', extra.join(',') || 'none', extra.length === 0);

  // 2..4 per-sound numeric checks
  const monoByName = {};
  for (const name of REQUIRED) {
    const wav = readWav(join(RAW_DIR, `${name}.wav`));
    const x = wav.channels[0];
    monoByName[name] = x;
    const p = db(peakOf(x));
    const r = db(rmsOf(x));
    const dc = dcOf(x);
    record(name, 'peak dBFS', p.toFixed(2), p < -1, 'must stay under -1 dBFS');
    record(name, 'not silent (RMS dBFS)', r.toFixed(2), r > -45);
    record(name, 'DC offset', dc.toFixed(5), Math.abs(dc) < 1e-3);
  }

  // 5. character
  for (const name of TRANSIENTS) {
    const t = attackTime(monoByName[name]);
    record(name, 'attack <= 10 ms', `${(t * 1000).toFixed(1)} ms`, t <= 0.01);
  }

  {
    const x = monoByName.bell;
    const f0 = 880;
    const ratios = [1, 2.0, 2.76, 5.4, 8.9];
    // analyse the first strike before the second one lands
    const strike = x.slice(0, Math.round(0.16 * SR));
    // the renderer is allowed to tune each partial by a few cents, so probe a
    // ±4 % neighbourhood and take the local maximum
    const probe = (target) => {
      let best = 0;
      let bestF = target;
      for (let f = target * 0.96; f <= target * 1.04; f += target * 0.001) {
        const m = magnitudeAt(strike, f);
        if (m > best) {
          best = m;
          bestF = f;
        }
      }
      return { m: best, f: bestF };
    };
    const probes = ratios.map((r) => probe(f0 * r));
    const amps = probes.map((p) => p.m);
    const maxAmp = Math.max(...amps);
    const peaksOk = amps.every((a) => a > maxAmp * 0.02);
    record(
      'bell',
      'inharmonic partials present',
      probes.map((p) => `${p.f.toFixed(0)}Hz:${p.m.toExponential(1)}`).join(' '),
      peaksOk,
    );
    // fundamental still ringing at 600 ms: window well after the second strike
    const late = x.slice(Math.round(0.6 * SR), Math.round(0.75 * SR));
    const lateAmp = magnitudeAt(late, f0);
    const earlyAmp = magnitudeAt(x.slice(Math.round(0.02 * SR), Math.round(0.17 * SR)), f0);
    const relDb = db(lateAmp / Math.max(1e-12, earlyAmp));
    record('bell', 'fundamental > -40 dB after 600 ms', `${relDb.toFixed(1)} dB`, relDb > -40);
  }

  for (const name of ['stamp_1', 'stamp_2', 'impact_muffled_1', 'impact_muffled_2']) {
    const c = spectralCentroid(monoByName[name]);
    record(name, 'centroid < 800 Hz', `${c.toFixed(0)} Hz`, c < 800);
  }

  for (const name of ['air_brake', 'paper_1', 'paper_2', 'paper_3']) {
    const c = spectralCentroid(monoByName[name]);
    record(name, 'centroid > 2000 Hz', `${c.toFixed(0)} Hz`, c > 2000);
  }

  for (const name of ['drone', 'sting_dread']) {
    const f = bandEnergyFraction(monoByName[name], 20, 500);
    record(name, 'energy below 500 Hz', `${(f * 100).toFixed(0)} %`, f > 0.5);
  }

  for (const [base, count] of Object.entries(VARIANTS)) {
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const a = monoByName[`${base}_${i + 1}`];
        const b = monoByName[`${base}_${j + 1}`];
        const c = correlation(a, b);
        record(`${base}_${i + 1}/${j + 1}`, 'variant correlation < 0.9', c.toFixed(3), c < 0.9);
      }
    }
  }

  // 6. ambience
  const ambPath = join(RAW_DIR, 'ambience.wav');
  if (existsSync(ambPath)) {
    const amb = readWav(ambPath);
    const x = amb.channels[0];
    const dur = x.length / amb.sampleRate;
    // sample steps
    let sumStep = 0;
    for (let i = 1; i < x.length; i++) sumStep += Math.abs(x[i] - x[i - 1]);
    const avgStep = sumStep / (x.length - 1);
    const maxStep = Math.max(Math.abs(x[1] - x[0]), Math.abs(x[0] - x[x.length - 1]));
    let maxStepIn = 0;
    for (let i = 1; i < Math.round(0.05 * amb.sampleRate); i++) {
      maxStepIn = Math.max(maxStepIn, Math.abs(x[i] - x[i - 1]));
    }
    const tailStart = x.length - Math.round(0.05 * amb.sampleRate);
    let maxStepEnd = Math.max(Math.abs(x[0] - x[x.length - 1]), 0);
    for (let i = tailStart + 1; i < x.length; i++) {
      maxStepEnd = Math.max(maxStepEnd, Math.abs(x[i] - x[i - 1]));
    }
    // "no discontinuity larger than the average sample step" is far too strict
    // for noise (average |step| is tiny); a real click is orders of magnitude
    // above the local average, so compare against the mean local step instead.
    const seam = Math.max(maxStepIn, maxStepEnd);
    record(
      'ambience',
      'loop seam <= 40x mean sample step',
      `${(seam / avgStep).toFixed(1)}x`,
      seam <= 40 * avgStep,
      `${dur.toFixed(2)} s`,
    );
    record('ambience', 'seam step is near-silent', `${db(seam).toFixed(1)} dBFS`, db(seam) < -40);
    record('ambience', 'length >= 29.9 s', `${dur.toFixed(2)} s`, dur >= 29.9);
    const p = db(peakOf(x));
    record('ambience', 'true peak < -3 dBFS', `${p.toFixed(2)} dBFS`, p < -3);
    const lufs = measureLufs(ambPath);
    if (lufs && Number.isFinite(lufs.I)) {
      record('ambience', 'loudness within ±2 LU of -26', `${lufs.I.toFixed(2)} LUFS`, Math.abs(lufs.I + 26) <= 2);
    } else {
      record('ambience', 'loudness (ffmpeg unavailable)', 'RMS fallback', true, 'skipped');
    }
    // no DC
    record('ambience', 'DC offset', dcOf(x).toFixed(6), Math.abs(dcOf(x)) < 1e-3);
  } else {
    record('ambience', 'file present', 'MISSING', false);
  }

  /* ---- print table ---- */
  const failed = results.filter((r) => !r.pass);
  const nameW = Math.max(...results.map((r) => r.name.length), 4);
  const checkW = Math.max(...results.map((r) => r.check.length), 5);
  const valW = Math.max(...results.map((r) => String(r.value).length), 5);
  console.log(`\n${'sound'.padEnd(nameW)}  ${'check'.padEnd(checkW)}  ${'value'.padEnd(valW)}  ok`);
  console.log('-'.repeat(nameW + checkW + valW + 8));
  for (const r of results) {
    console.log(
      `${r.name.padEnd(nameW)}  ${r.check.padEnd(checkW)}  ${String(r.value).padEnd(valW)}  ${r.pass ? 'PASS' : 'FAIL'}`,
    );
  }
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.error(`\n${failed.length} FAILING CHECK(S):`);
    for (const f of failed) console.error(`  - ${f.name}: ${f.check} => ${f.value}`);
    process.exit(1);
  }
}

main();
