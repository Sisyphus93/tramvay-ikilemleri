/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Numerical verification of the packaged audio assets (we cannot listen, so we
 * measure). Checks the SHIPPED files: public/audio/sfx.json + sfx.wav +
 * ambience.wav (and that every raw source file exists).
 *
 *   node scripts/verify-audio.mjs
 *
 * Exit code 0 = all checks pass.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'audio');
const RAW_DIR = path.join(ROOT, 'audio-src', 'raw');

/* ---------------- WAV reader (16-bit PCM mono expected) ---------------- */

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
    if (id === 'fmt ') {
      fmt = {
        audioFormat: b.readUInt16LE(pos + 8),
        channels: b.readUInt16LE(pos + 10),
        sampleRate: b.readUInt32LE(pos + 12),
        bits: b.readUInt16LE(pos + 22),
      };
    }
    if (id === 'data') dataChunk = { offset: pos + 8, size };
    pos += 8 + size + (size % 2);
  }
  if (!fmt || !dataChunk) throw new Error('bad WAV chunks: ' + filePath);
  const bps = fmt.bits / 8;
  const frames = Math.floor(dataChunk.size / (bps * fmt.channels));
  const out = new Float64Array(frames);
  for (let i = 0; i < frames; i++) {
    let acc = 0;
    for (let c = 0; c < fmt.channels; c++) {
      const o = dataChunk.offset + (i * fmt.channels + c) * bps;
      acc += fmt.bits === 16 ? b.readInt16LE(o) / 32768 : b.readFloatLE(o);
    }
    out[i] = acc / fmt.channels;
  }
  return { data: out, sampleRate: fmt.sampleRate };
}

/* ---------------- FFT (radix-2, iterative) ---------------- */

function fft(re, im) {
  const n = re.length;
  if (n & (n - 1)) throw new Error('fft: length must be a power of two');
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

/** Hann-windowed magnitude spectrum, zero-padded to at least minN. */
function spectrum(slice, sampleRate, minN = 16384) {
  let n = 1;
  while (n < Math.max(slice.length, minN)) n <<= 1;
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < slice.length; i++) {
    re[i] = slice[i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (slice.length - 1)));
  }
  fft(re, im);
  const half = n >> 1;
  const mag = new Float64Array(half);
  for (let i = 0; i < half; i++) mag[i] = Math.hypot(re[i], im[i]);
  const binHz = sampleRate / n;
  return { mag, binHz };
}

/* ---------------- metrics ---------------- */

const db = (x) => 20 * Math.log10(Math.max(x, 1e-12));

function peakOf(x) {
  let p = 0;
  for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i]));
  return p;
}

function rmsOf(x) {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * x[i];
  return Math.sqrt(s / x.length);
}

function dcOf(x) {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i];
  return s / x.length;
}

/** Time (ms) until the 1 ms sliding-max envelope first reaches the global max. */
function attackMs(slice, sampleRate) {
  const w = Math.max(1, Math.round(0.001 * sampleRate));
  const envLen = slice.length;
  const env = new Float64Array(envLen);
  let maxEnv = 0;
  for (let i = 0; i < envLen; i++) {
    let m = 0;
    const from = Math.max(0, i - w + 1);
    for (let j = from; j <= i; j++) m = Math.max(m, Math.abs(slice[j]));
    env[i] = m;
    if (m > maxEnv) maxEnv = m;
  }
  for (let i = 0; i < envLen; i++) {
    if (env[i] >= maxEnv * 0.98) return (i / sampleRate) * 1000;
  }
  return Infinity;
}

function centroidHz(slice, sampleRate) {
  const { mag, binHz } = spectrum(slice, sampleRate, 8192);
  let num = 0;
  let den = 0;
  for (let i = 2; i < mag.length; i++) {
    num += i * binHz * mag[i];
    den += mag[i];
  }
  return den > 0 ? num / den : 0;
}

function lowEnergyFraction(slice, sampleRate, cutoffHz) {
  const { mag, binHz } = spectrum(slice, sampleRate, 8192);
  let low = 0;
  let total = 0;
  const kCut = Math.min(mag.length, Math.ceil(cutoffHz / binHz));
  for (let i = 1; i < mag.length; i++) {
    const e = mag[i] * mag[i];
    total += e;
    if (i < kCut) low += e;
  }
  return total > 0 ? low / total : 0;
}

/** Normalized zero-lag cross-correlation over the shared length. */
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
  return sab / Math.sqrt(sa * sb || 1e-12);
}

/* ---------------- checks ---------------- */

const REQUIRED = [
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

const TRANSIENTS = ['press', 'hover', 'switch', 'clack', 'lever_clack', 'stamp'];
const HOT_SOUNDS = (n) => n.startsWith('stamp_') || n.startsWith('impact_');
const VARIANT_GROUPS = [
  ['hover_1', 'hover_2', 'hover_3'],
  ['switch_1', 'switch_2'],
  ['paper_1', 'paper_2', 'paper_3'],
  ['lever_clack_1', 'lever_clack_2'],
  ['clack_1', 'clack_2', 'clack_3'],
  ['impact_muffled_1', 'impact_muffled_2'],
  ['stamp_1', 'stamp_2'],
];

const failures = [];
const fail = (name, msg) => failures.push(`${name}: ${msg}`);

function main() {
  const manifestPath = path.join(OUT_DIR, 'sfx.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('FATAL: public/audio/sfx.json missing — run npm run audio:build');
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const sfx = readWav(path.join(OUT_DIR, 'sfx.wav'));
  const amb = readWav(path.join(OUT_DIR, 'ambience.wav'));
  const SRf = sfx.sampleRate;
  const fileDurMs = (sfx.data.length / SRf) * 1000;

  console.log(`sfx.wav: ${SRf} Hz, ${fileDurMs.toFixed(0)} ms, ${Object.keys(manifest.sprite).length} slices`);
  console.log(`ambience.wav: ${amb.sampleRate} Hz, ${(amb.data.length / amb.sampleRate).toFixed(2)} s`);
  console.log('');

  /* structure */
  for (const name of REQUIRED) {
    if (!manifest.sprite[name]) fail(name, 'missing from sfx.json sprite');
  }
  for (const [name, [startMs, durMs]] of Object.entries(manifest.sprite)) {
    if (startMs < 0 || startMs + durMs > fileDurMs + 0.51) {
      fail(name, `slice [${startMs}, +${durMs}] out of file bounds (${fileDurMs.toFixed(0)} ms)`);
    }
  }
  for (const name of [...REQUIRED, 'ambience']) {
    const raw = path.join(RAW_DIR, name + '.wav');
    if (!fs.existsSync(raw)) fail(name, 'raw source file missing in audio-src/raw/');
  }

  const sliceOf = (name) => {
    const [startMs, durMs] = manifest.sprite[name];
    const s = Math.round((startMs / 1000) * SRf);
    const e = Math.min(sfx.data.length, s + Math.round((durMs / 1000) * SRf));
    return sfx.data.subarray(s, e);
  };

  /* per-sound table */
  const rows = [];
  for (const name of REQUIRED) {
    if (!manifest.sprite[name]) continue;
    const slice = sliceOf(name);
    const p = peakOf(slice);
    const r = rmsOf(slice);
    const dc = dcOf(slice);
    const targetDb = HOT_SOUNDS(name) ? -3 : -6;
    const isTransient = TRANSIENTS.some((t) => name.startsWith(t));
    const atk = isTransient ? attackMs(slice, SRf) : NaN;
    const cen = centroidHz(slice, SRf);
    const row = { name, p, r, dc, atk, cen };
    rows.push(row);

    /* peaks & clipping */
    if (p >= Math.pow(10, -1 / 20)) fail(name, `peak ${db(p).toFixed(1)} dBFS ≥ -1 dBFS (clipping risk)`);
    if (Math.abs(db(p) - targetDb) > 0.6) fail(name, `peak ${db(p).toFixed(1)} dBFS, expected ≈ ${targetDb} dBFS`);
    /* silence & DC */
    if (db(r) < -45) fail(name, `RMS ${db(r).toFixed(1)} dBFS too quiet (< -45)`);
    if (Math.abs(dc) > 0.005) fail(name, `DC offset ${dc.toFixed(4)} too large`);
    /* transient attack */
    if (isTransient && atk > 10) fail(name, `attack-to-peak ${atk.toFixed(1)} ms > 10 ms`);
    /* character: weighty sounds */
    if ((name.startsWith('stamp_') || name.startsWith('impact_')) && cen >= 800) {
      fail(name, `spectral centroid ${cen.toFixed(0)} Hz ≥ 800 Hz (not weighty)`);
    }
    /* character: airy sounds */
    if ((name === 'air_brake' || name.startsWith('paper_')) && cen <= 2000) {
      fail(name, `spectral centroid ${cen.toFixed(0)} Hz ≤ 2000 Hz (not airy)`);
    }
    /* character: low sounds */
    if (name === 'drone' || name === 'sting_dread') {
      const frac = lowEnergyFraction(slice, SRf, 500);
      row.low500 = frac;
      if (frac < 0.55) fail(name, `only ${(frac * 100).toFixed(0)}% of energy below 500 Hz (< 55%)`);
    }
  }

  /* bell: inharmonic modal ratios + fundamental persistence */
  {
    const slice = sliceOf('bell');
    const { mag, binHz } = spectrum(slice, SRf, 32768);
    let gMax = 0;
    for (let i = 1; i < mag.length; i++) gMax = Math.max(gMax, mag[i]);
    // find fundamental near 880 Hz
    let f0 = 0;
    let f0mag = 0;
    for (let f = 820; f <= 940; f += binHz) {
      const i = Math.round(f / binHz);
      if (mag[i] > f0mag) {
        f0mag = mag[i];
        f0 = f;
      }
    }
    if (f0 === 0) fail('bell', 'no fundamental found near 880 Hz');
    const ratios = [1, 2.0, 2.76, 5.4, 8.9];
    for (const r of ratios) {
      const fc = f0 * r;
      if (fc > SRf / 2 * 0.95) continue;
      let pMax = 0;
      for (let f = fc * 0.96; f <= fc * 1.04; f += binHz) {
        pMax = Math.max(pMax, mag[Math.round(f / binHz)] || 0);
      }
      const rel = db(pMax / gMax);
      if (rel < -40) fail('bell', `partial ${r}× (${fc.toFixed(0)} Hz) at ${rel.toFixed(1)} dB — missing`);
      rows.push({ name: `bell:partial_${r}x`, note: `${fc.toFixed(0)} Hz @ ${rel.toFixed(1)} dB` });
    }
    // fundamental after 600 ms, relative to overall spectral max
    const s600 = Math.round(0.6 * SRf);
    const late = slice.subarray(s600);
    const lateSpec = spectrum(late, SRf, 32768);
    let lMax = 0;
    for (let f = f0 * 0.985; f <= f0 * 1.015; f += lateSpec.binHz) {
      lMax = Math.max(lMax, lateSpec.mag[Math.round(f / lateSpec.binHz)] || 0);
    }
    const relLate = db(lMax / gMax);
    rows.push({ name: 'bell:f0@600ms', note: `${relLate.toFixed(1)} dB (need > -40)` });
    if (relLate <= -40) fail('bell', `fundamental after 600 ms at ${relLate.toFixed(1)} dB ≤ -40 dB`);
  }

  /* variants must differ */
  for (const group of VARIANT_GROUPS) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const c = correlation(sliceOf(group[i]), sliceOf(group[j]));
        rows.push({ name: `corr ${group[i]}↔${group[j]}`, note: c.toFixed(3) });
        // |corr| — an inverted copy sounds identical, so polarity does not count
        if (Math.abs(c) >= 0.9) fail(group[i], `|correlation| ${Math.abs(c).toFixed(3)} with ${group[j]} ≥ 0.9 (variants identical)`);
      }
    }
  }

  /* ambience: seamless loop + loudness */
  {
    const x = amb.data;
    const SRa = amb.sampleRate;
    let stepSum = 0;
    for (let i = 1; i < x.length; i++) stepSum += Math.abs(x[i] - x[i - 1]);
    const avgStep = stepSum / (x.length - 1);
    const seam = Math.abs(x[x.length - 1] - x[0]);
    rows.push({ name: 'ambience:seam', note: `${seam.toExponential(2)} vs avg step ${avgStep.toExponential(2)}` });
    if (seam > avgStep) fail('ambience', `loop seam discontinuity ${seam.toExponential(2)} > avg step ${avgStep.toExponential(2)}`);
    // smoothness around the wrap: the first and last 50 ms must not contain the
    // seam discontinuity (crackle ticks elsewhere are legitimate content)
    const w = Math.round(0.05 * SRa);
    let edgeStepSum = 0;
    let edgeN = 0;
    for (let i = x.length - w; i < x.length - 1; i++) { edgeStepSum += Math.abs(x[i + 1] - x[i]); edgeN++; }
    for (let i = 0; i < w; i++) { edgeStepSum += Math.abs(x[i + 1] - x[i]); edgeN++; }
    const edgeAvgStep = edgeStepSum / edgeN;
    rows.push({ name: 'ambience:edge50ms', note: `avg step ${edgeAvgStep.toExponential(2)} vs file ${avgStep.toExponential(2)}` });
    if (edgeAvgStep > avgStep * 8) fail('ambience', `edge 50 ms roughness ${edgeAvgStep.toExponential(2)} far above file average`);
    const loud = db(rmsOf(x));
    rows.push({ name: 'ambience:loudness', note: `${loud.toFixed(1)} dB (target -26 ±2), peak ${db(peakOf(x)).toFixed(1)} dBFS` });
    if (Math.abs(loud + 26) > 2) fail('ambience', `loudness ${loud.toFixed(1)} dB outside -26 ±2 LU`);
    if (db(peakOf(x)) > -3) fail('ambience', `true peak ${db(peakOf(x)).toFixed(1)} dBFS > -3 dBFS`);
  }

  /* sprite size */
  const sfxBytes = fs.statSync(path.join(OUT_DIR, 'sfx.wav')).size;
  rows.push({ name: 'sprite size', note: `${(sfxBytes / 1048576).toFixed(2)} MB (limit ~1.5 MB)` });
  if (sfxBytes > 1.55 * 1048576) fail('sfx.wav', `sprite ${(sfxBytes / 1048576).toFixed(2)} MB > 1.5 MB`);

  /* report */
  console.log('name                      dur ms   peak dB   RMS dB   DC        attack ms  centroid Hz  note');
  for (const row of rows) {
    if (row.note !== undefined && row.p === undefined) {
      console.log(row.name.padEnd(26) + '—'.padStart(8) + '—'.padStart(10) + '—'.padStart(9) + '—'.padStart(10) + '—'.padStart(11) + '—'.padStart(13) + '  ' + row.note);
      continue;
    }
    const [startMs, durMs] = manifest.sprite[row.name];
    console.log(
      row.name.padEnd(26) +
        String(durMs).padStart(7) +
        db(row.p).toFixed(1).padStart(10) +
        db(row.r).toFixed(1).padStart(9) +
        row.dc.toFixed(4).padStart(10) +
        (Number.isNaN(row.atk) ? '—' : row.atk.toFixed(1)).padStart(11) +
        row.cen.toFixed(0).padStart(12) +
        (row.low500 !== undefined ? `  low500=${(row.low500 * 100).toFixed(0)}%` : ''),
    );
  }
  console.log('');
  if (failures.length) {
    console.error(`FAIL — ${failures.length} problem(s):`);
    for (const f of failures) console.error('  ✗ ' + f);
    process.exit(1);
  }
  console.log(`PASS — all ${REQUIRED.length} SFX + ambience verified (${rows.length} measurements).`);
}

main();
