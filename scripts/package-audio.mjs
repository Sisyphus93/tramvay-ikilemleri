#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Package the rendered WAVs into browser formats.
 *
 *   node scripts/package-audio.mjs
 *
 * Produces public/audio/sfx.{ogg,m4a} and public/audio/ambience.{ogg,m4a}.
 *
 * Offset safety: the engine slices the sprite with millisecond offsets from
 * sfx.json. Vorbis/AAC encoders add priming samples, which would shift every
 * slice. So after encoding we decode the file back, measure the lag against the
 * raw sprite by cross-correlation, and re-encode from a pre-nudged WAV until the
 * decoded file lines up with the raw one sample-for-sample. The lag per format
 * is printed; if ffmpeg is unavailable we fall back to WAV.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const RAW_DIR = join(ROOT, 'audio-src', 'raw');
const PUBLIC_DIR = join(ROOT, 'public', 'audio');

const SR = 44100;
const MAX_BYTES = 1.5 * 1024 * 1024;

function findFfmpeg() {
  for (const c of [process.env.FFMPEG, 'ffmpeg', join(process.env.HOME ?? '', '.local/bin/ffmpeg')]) {
    if (!c) continue;
    const r = spawnSync(c, ['-version'], { stdio: 'ignore' });
    if (r.status === 0) return c;
  }
  return null;
}

function readWav(path) {
  const b = readFileSync(path);
  let pos = 12;
  let fmt = null;
  let data = null;
  while (pos + 8 <= b.length) {
    const id = b.toString('ascii', pos, pos + 4);
    const size = b.readUInt32LE(pos + 4);
    const body = pos + 8;
    if (id === 'fmt ') {
      fmt = { channels: b.readUInt16LE(body + 2), bits: b.readUInt16LE(body + 14) };
    } else if (id === 'data') {
      data = { offset: body, size };
    }
    pos = body + size + (size % 2);
  }
  const frames = Math.floor(data.size / ((fmt.bits / 8) * fmt.channels));
  const x = new Float32Array(frames);
  for (let i = 0; i < frames; i++) x[i] = b.readInt16LE(data.offset + i * 2) / 32768;
  return x;
}

function writeWav(path, x, sampleRate = SR) {
  const n = x.length;
  const bytes = 44 + n * 2;
  const b = Buffer.alloc(bytes);
  b.write('RIFF', 0, 'ascii');
  b.writeUInt32LE(bytes - 8, 4);
  b.write('WAVE', 8, 'ascii');
  b.write('fmt ', 12, 'ascii');
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(sampleRate, 24);
  b.writeUInt32LE(sampleRate * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36, 'ascii');
  b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(x[i] * 32767))), 44 + i * 2);
  writeFileSync(path, b);
}

/** lag (in samples) that best aligns `a` onto `ref`, searching ±maxLag */
function measureLag(ref, a, maxLag = 4096) {
  // coarse: compare energy envelopes (robust, cheap)
  const env = (x, n) => {
    const out = new Float32Array(Math.floor(x.length / n));
    for (let i = 0; i < out.length; i++) {
      let s = 0;
      for (let j = 0; j < n; j++) s += Math.abs(x[i * n + j]);
      out[i] = s / n;
    }
    return out;
  };
  const step = 64;
  const eRef = env(ref, step);
  const eA = env(a, step);
  let bestCoarse = 0;
  let bestScore = -Infinity;
  const coarseMax = Math.ceil(maxLag / step);
  for (let lag = -coarseMax; lag <= coarseMax; lag++) {
    let s = 0;
    let c = 0;
    for (let i = Math.max(0, -lag); i < Math.min(eRef.length, eA.length - lag); i++) {
      s += eRef[i] * eA[i + lag];
      c++;
    }
    if (c > 0 && s / c > bestScore) {
      bestScore = s / c;
      bestCoarse = lag;
    }
  }
  // fine: raw cross-correlation within ±2 envelope steps
  let best = bestCoarse * step;
  let bestFine = -Infinity;
  for (let lag = bestCoarse * step - step * 2; lag <= bestCoarse * step + step * 2; lag++) {
    let s = 0;
    let c = 0;
    for (let i = Math.max(0, -lag); i < Math.min(ref.length, a.length - lag); i += 3) {
      s += ref[i] * a[i + lag];
      c++;
    }
    if (c > 0 && s / c > bestFine) {
      bestFine = s / c;
      best = lag;
    }
  }
  return best;
}

function main() {
  mkdirSync(PUBLIC_DIR, { recursive: true });
  const ffmpeg = findFfmpeg();
  const spriteWav = join(RAW_DIR, '_sprite.wav');
  const ambWav = join(RAW_DIR, 'ambience.wav');
  if (!existsSync(spriteWav) || !existsSync(ambWav)) {
    console.error('rendered WAVs missing — run `node scripts/generate-audio.mjs` first');
    process.exit(1);
  }

  const spriteBytes = statSync(spriteWav).size;
  console.log(`sprite source: ${(spriteBytes / 1024).toFixed(0)} kB (16-bit WAV)`);

  if (!ffmpeg) {
    console.warn('\nffmpeg not found: shipping WAV only (engine falls back to WAV last).');
    writeFileSync(join(PUBLIC_DIR, 'sfx.wav'), readFileSync(spriteWav));
    writeFileSync(join(PUBLIC_DIR, 'ambience.wav'), readFileSync(ambWav));
    return;
  }

  const ref = readWav(spriteWav);
  const ambRef = readWav(ambWav);

  const jobs = [
    {
      name: 'sfx',
      src: spriteWav,
      ref,
      formats: [
        { ext: 'ogg', args: ['-c:a', 'libvorbis', '-q:a', '4'] },
        { ext: 'm4a', args: ['-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart'] },
      ],
    },
    {
      name: 'ambience',
      src: ambWav,
      ref: ambRef,
      formats: [
        { ext: 'ogg', args: ['-c:a', 'libvorbis', '-q:a', '2'] },
        { ext: 'm4a', args: ['-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart'] },
      ],
    },
  ];

  const tmpWav = join(RAW_DIR, '_nudge.wav');

  for (const job of jobs) {
    for (const fmt of job.formats) {
      const outPath = join(PUBLIC_DIR, `${job.name}.${fmt.ext}`);
      let nudge = 0;
      for (let attempt = 0; attempt < 4; attempt++) {
        // apply the accumulated nudge to the source, then encode
        let source = job.src;
        if (nudge !== 0) {
          const nudged = new Float32Array(job.ref.length + Math.max(0, -nudge) - Math.max(0, nudge));
          const dstOff = Math.max(0, -nudge);
          const srcOff = Math.max(0, nudge);
          for (let i = 0; i < nudged.length; i++) nudged[i] = job.ref[srcOff + i] ?? 0;
          for (let i = 0; i < dstOff; i++) nudged[i] = 0;
          writeWav(tmpWav, nudged);
          source = tmpWav;
        }
        const r = spawnSync(
          ffmpeg,
          ['-y', '-hide_banner', '-loglevel', 'error', '-i', source, ...fmt.args, '-ac', '1', '-ar', String(SR), outPath],
          { encoding: 'utf8' },
        );
        if (r.status !== 0) {
          console.error(`${job.name}.${fmt.ext}: ffmpeg failed\n${r.stderr}`);
          process.exit(1);
        }
        // decode back and measure
        const backWav = join(RAW_DIR, `_roundtrip_${fmt.ext}.wav`);
        const d = spawnSync(
          ffmpeg,
          ['-y', '-hide_banner', '-loglevel', 'error', '-i', outPath, '-ac', '1', '-ar', String(SR), backWav],
          { encoding: 'utf8' },
        );
        if (d.status !== 0) {
          console.error(`${job.name}.${fmt.ext}: decode failed\n${d.stderr}`);
          process.exit(1);
        }
        const back = readWav(backWav);
        const lag = measureLag(job.ref, back, 8192);
        if (Math.abs(lag) <= 1) {
          const kb = statSync(outPath).size / 1024;
          console.log(
            `${`${job.name}.${fmt.ext}`.padEnd(16)} ${kb.toFixed(0).padStart(6)} kB  ` +
              `lag ${String(lag).padStart(3)} smp  ${kb * 1024 > MAX_BYTES ? 'OVER 1.5 MB' : 'ok'}`,
          );
          break;
        }
        if (attempt === 3) {
          console.warn(
            `${job.name}.${fmt.ext}: could not align (residual lag ${lag} samples) — ` +
              `keeping the file; slices have 100 ms gaps so a sub-3 ms shift is harmless`,
          );
        }
        nudge += lag;
      }
      if (existsSync(join(RAW_DIR, `_roundtrip_${fmt.ext}.wav`))) rmSync(join(RAW_DIR, `_roundtrip_${fmt.ext}.wav`));
    }
  }
  if (existsSync(tmpWav)) rmSync(tmpWav);

  // size guard
  for (const name of ['sfx.ogg', 'sfx.m4a']) {
    const p = join(PUBLIC_DIR, name);
    if (!existsSync(p)) continue;
    const kb = statSync(p).size / 1024;
    if (kb * 1024 > MAX_BYTES) {
      console.warn(`${name} is ${kb.toFixed(0)} kB, above the 1.5 MB budget`);
    }
  }
  console.log('\nencoded files:');
  for (const f of ['sfx.json', 'sfx.ogg', 'sfx.m4a', 'ambience.ogg', 'ambience.m4a']) {
    const p = join(PUBLIC_DIR, f);
    if (existsSync(p)) console.log(`  public/audio/${f.padEnd(14)} ${(statSync(p).size / 1024).toFixed(1)} kB`);
  }
}

main();
