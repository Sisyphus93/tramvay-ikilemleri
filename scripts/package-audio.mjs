#!/usr/bin/env node
/** Package audio-src/raw WAVs into a compact public/audio sprite. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW_DIR = path.join(ROOT, 'audio-src', 'raw');
const PUBLIC_DIR = path.join(ROOT, 'public', 'audio');
const OUTPUT_RATE = 32_000;
const GAP_SECONDS = 0.1;
const REQUIRED = [
  'press',
  'hover_1', 'hover_2', 'hover_3',
  'switch_1', 'switch_2',
  'paper_1', 'paper_2', 'paper_3',
  'lever_clack_1', 'lever_clack_2',
  'bell', 'air_brake', 'brake_squeal', 'drone',
  'clack_1', 'clack_2', 'clack_3',
  'impact_muffled_1', 'impact_muffled_2',
  'crash_comic',
  'stamp_1', 'stamp_2',
  'sting_relief', 'sting_dread', 'sting_absurd',
];

fs.mkdirSync(PUBLIC_DIR, { recursive: true });

function parseWav(buffer, filePath) {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error(`${filePath} is not a RIFF/WAVE file`);
  }
  let offset = 12;
  let format = null;
  let data = null;
  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const contentOffset = offset + 8;
    if (chunkId === 'fmt ') {
      format = {
        code: buffer.readUInt16LE(contentOffset),
        channels: buffer.readUInt16LE(contentOffset + 2),
        sampleRate: buffer.readUInt32LE(contentOffset + 4),
        blockAlign: buffer.readUInt16LE(contentOffset + 12),
        bitsPerSample: buffer.readUInt16LE(contentOffset + 14),
      };
    } else if (chunkId === 'data') {
      data = buffer.subarray(contentOffset, Math.min(buffer.length, contentOffset + chunkSize));
    }
    offset = contentOffset + chunkSize + (chunkSize % 2);
  }
  if (!format || !data) throw new Error(`${filePath} is missing fmt/data chunks`);
  if (![1, 3].includes(format.code)) throw new Error(`${filePath} must be PCM or IEEE float WAV`);
  if (!Number.isFinite(format.sampleRate) || format.sampleRate < 8_000) throw new Error(`${filePath} has an unsupported sample rate`);
  const bytesPerSample = Math.ceil(format.bitsPerSample / 8);
  if (![1, 2, 3, 4].includes(bytesPerSample)) throw new Error(`${filePath} has an unsupported bit depth`);
  const frameCount = Math.floor(data.length / format.blockAlign);
  const mono = new Float64Array(frameCount);

  const readSample = (sampleOffset) => {
    if (format.code === 3) {
      if (format.bitsPerSample !== 32) throw new Error(`${filePath}: only 32-bit float WAV is supported`);
      return data.readFloatLE(sampleOffset);
    }
    if (format.bitsPerSample === 8) return (data.readUInt8(sampleOffset) - 128) / 128;
    if (format.bitsPerSample === 16) return data.readInt16LE(sampleOffset) / 32768;
    if (format.bitsPerSample === 24) {
      let value = data[sampleOffset] | (data[sampleOffset + 1] << 8) | (data[sampleOffset + 2] << 16);
      if (value & 0x800000) value |= 0xff000000;
      return value / 8_388_608;
    }
    return data.readInt32LE(sampleOffset) / 2_147_483_648;
  };

  for (let frame = 0; frame < frameCount; frame++) {
    let sum = 0;
    for (let channel = 0; channel < format.channels; channel++) {
      sum += readSample(frame * format.blockAlign + channel * bytesPerSample);
    }
    mono[frame] = sum / format.channels;
  }
  return { samples: mono, sampleRate: format.sampleRate };
}

function resampleLinear(input, fromRate, toRate) {
  if (fromRate === toRate) return new Float64Array(input);
  const outputLength = Math.max(1, Math.round(input.length * toRate / fromRate));
  const output = new Float64Array(outputLength);
  const ratio = fromRate / toRate;
  for (let i = 0; i < outputLength; i++) {
    const position = i * ratio;
    const left = Math.min(input.length - 1, Math.floor(position));
    const right = Math.min(input.length - 1, left + 1);
    const fraction = position - left;
    output[i] = input[left] * (1 - fraction) + input[right] * fraction;
  }
  return output;
}

function writePcm16Wav(filePath, samples, sampleRate) {
  const dataBytes = samples.length * 2;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataBytes, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataBytes, 40);
  const pcm = Buffer.alloc(dataBytes);
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    pcm.writeInt16LE(Math.round(sample * 32767), i * 2);
  }
  fs.writeFileSync(filePath, Buffer.concat([header, pcm]));
}

function encodeWithFfmpeg(inputPath, outputPath, codecArgs) {
  const result = spawnSync('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error', '-i', inputPath,
    '-ac', '1', '-ar', String(OUTPUT_RATE), ...codecArgs, outputPath,
  ], { encoding: 'utf8' });
  if (result.error || result.status !== 0) {
    const detail = result.error?.message || result.stderr || `exit ${result.status}`;
    throw new Error(`ffmpeg failed for ${path.basename(outputPath)}: ${detail}`);
  }
}

for (const name of REQUIRED) {
  const filePath = path.join(RAW_DIR, `${name}.wav`);
  if (!fs.existsSync(filePath)) throw new Error(`Required raw sound is missing: ${filePath}`);
}
const ambiencePath = path.join(RAW_DIR, 'ambience.wav');
if (!fs.existsSync(ambiencePath)) throw new Error(`Required raw ambience is missing: ${ambiencePath}`);

const sprite = [];
const soundMap = {};
let frameOffset = 0;
const gapFrames = Math.round(GAP_SECONDS * OUTPUT_RATE);
for (const name of REQUIRED) {
  const filePath = path.join(RAW_DIR, `${name}.wav`);
  const parsed = parseWav(fs.readFileSync(filePath), filePath);
  const samples = resampleLinear(parsed.samples, parsed.sampleRate, OUTPUT_RATE);
  soundMap[name] = { samples, frames: samples.length };
  frameOffset += samples.length;
  if (name !== REQUIRED[REQUIRED.length - 1]) frameOffset += gapFrames;
}

const spriteSamples = new Float64Array(frameOffset);
const entries = {};
let cursor = 0;
for (const name of REQUIRED) {
  const { samples, frames } = soundMap[name];
  spriteSamples.set(samples, cursor);
  const startMs = cursor / OUTPUT_RATE * 1000;
  const durationMs = frames / OUTPUT_RATE * 1000;
  entries[name] = [Number(startMs.toFixed(3)), Number(durationMs.toFixed(3))];
  cursor += frames + gapFrames;
}
// The last loop also advanced by a gap; the allocation intentionally has no
// trailing silence, so the computed layout must exactly fit the concatenation.
const actualSprite = spriteSamples.subarray(0, cursor - gapFrames);

const sfxWav = path.join(PUBLIC_DIR, 'sfx.wav');
const ambienceWav = path.join(PUBLIC_DIR, 'ambience.wav');
writePcm16Wav(sfxWav, actualSprite, OUTPUT_RATE);
const ambience = parseWav(fs.readFileSync(ambiencePath), ambiencePath);
const ambienceSamples = resampleLinear(ambience.samples, ambience.sampleRate, OUTPUT_RATE);
writePcm16Wav(ambienceWav, ambienceSamples, OUTPUT_RATE);
let shippedFormats = ['wav'];
let ffmpegAvailable = false;
try {
  const probe = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
  ffmpegAvailable = !probe.error && probe.status === 0;
} catch {
  ffmpegAvailable = false;
}

if (ffmpegAvailable) {
  try {
    encodeWithFfmpeg(sfxWav, path.join(PUBLIC_DIR, 'sfx.ogg'), ['-c:a', 'libvorbis', '-q:a', '3']);
    encodeWithFfmpeg(sfxWav, path.join(PUBLIC_DIR, 'sfx.m4a'), ['-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart']);
    encodeWithFfmpeg(ambienceWav, path.join(PUBLIC_DIR, 'ambience.ogg'), ['-c:a', 'libvorbis', '-q:a', '3']);
    encodeWithFfmpeg(ambienceWav, path.join(PUBLIC_DIR, 'ambience.m4a'), ['-c:a', 'aac', '-b:a', '80k', '-movflags', '+faststart']);
    fs.unlinkSync(sfxWav);
    fs.unlinkSync(ambienceWav);
    shippedFormats = ['ogg', 'm4a'];
    console.log('Encoded Ogg Vorbis and AAC/M4A sprite + ambience with ffmpeg.');
  } catch (error) {
    for (const file of ['sfx.ogg', 'sfx.m4a', 'ambience.ogg', 'ambience.m4a']) {
      const outputPath = path.join(PUBLIC_DIR, file);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    }
    console.warn(`${error.message}; retaining PCM WAV assets instead.`);
  }
} else {
  for (const file of ['sfx.ogg', 'sfx.m4a', 'ambience.ogg', 'ambience.m4a']) {
    const outputPath = path.join(PUBLIC_DIR, file);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
  }
  console.log('ffmpeg not found; shipping 32 kHz mono PCM16 WAV assets.');
}

// The runtime reads this list to avoid 404s for codecs not produced on the
// current build machine (and to keep the WAV fallback last).
fs.writeFileSync(
  path.join(PUBLIC_DIR, 'sfx.json'),
  `${JSON.stringify({ sprite: entries, formats: shippedFormats }, null, 2)}\n`,
);

const spriteStats = fs.statSync(fs.existsSync(path.join(PUBLIC_DIR, 'sfx.ogg')) ? path.join(PUBLIC_DIR, 'sfx.ogg') : sfxWav);
console.log(`Packaged ${REQUIRED.length} samples (${(actualSprite.length / OUTPUT_RATE).toFixed(2)} s), sprite ${(spriteStats.size / 1024 / 1024).toFixed(3)} MiB; ${OUTPUT_RATE} Hz mono.`);
