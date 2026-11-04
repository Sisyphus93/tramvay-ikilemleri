#!/usr/bin/env node
/** Numerical regression checks for the generated audio sprite and ambience. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = path.join(ROOT, 'public', 'audio');
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
const failures = [];
const checks = [];

function check(condition, message) {
  checks.push({ ok: Boolean(condition), message });
  if (!condition) failures.push(message);
}

function parseWav(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error(`${filePath} is not RIFF/WAVE`);
  }
  let offset = 12;
  let format = null;
  let dataChunk = null;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const content = offset + 8;
    if (id === 'fmt ') {
      format = {
        code: buffer.readUInt16LE(content),
        channels: buffer.readUInt16LE(content + 2),
        sampleRate: buffer.readUInt32LE(content + 4),
        blockAlign: buffer.readUInt16LE(content + 12),
        bits: buffer.readUInt16LE(content + 14),
      };
    } else if (id === 'data') {
      dataChunk = buffer.subarray(content, Math.min(buffer.length, content + size));
    }
    offset = content + size + (size % 2);
  }
  if (!format || !dataChunk || format.code !== 1 || format.bits !== 16) {
    throw new Error(`${filePath}: verifier expects PCM16 WAV`);
  }
  const frames = Math.floor(dataChunk.length / format.blockAlign);
  const samples = new Float64Array(frames);
  for (let i = 0; i < frames; i++) {
    let sum = 0;
    for (let channel = 0; channel < format.channels; channel++) {
      sum += dataChunk.readInt16LE(i * format.blockAlign + channel * 2) / 32768;
    }
    samples[i] = sum / format.channels;
  }
  return { samples, sampleRate: format.sampleRate, channels: format.channels };
}

function rms(samples) {
  if (!samples.length) return 0;
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  return Math.sqrt(sum / samples.length);
}

function peak(samples) {
  let maximum = 0;
  for (const sample of samples) maximum = Math.max(maximum, Math.abs(sample));
  return maximum;
}

function estimatedTruePeak(samples) {
  let maximum = peak(samples);
  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[Math.max(0, i - 1)];
    const b = samples[i];
    const c = samples[i + 1];
    const d = samples[Math.min(samples.length - 1, i + 2)];
    for (let step = 1; step < 4; step++) {
      const p = step / 4;
      const p2 = p * p;
      const p3 = p2 * p;
      const value = 0.5 * (
        2 * b + (-a + c) * p + (2 * a - 5 * b + 4 * c - d) * p2 + (-a + 3 * b - 3 * c + d) * p3
      );
      maximum = Math.max(maximum, Math.abs(value));
    }
  }
  return maximum;
}

function mean(samples) {
  let sum = 0;
  for (const sample of samples) sum += sample;
  return sum / Math.max(1, samples.length);
}

function db(value) {
  return value > 0 ? 20 * Math.log10(value) : -Infinity;
}

function fftPower(data, size) {
  const real = new Float64Array(size);
  const imag = new Float64Array(size);
  const use = Math.min(size, data.length);
  for (let i = 0; i < use; i++) {
    const window = use > 1 ? 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (use - 1)) : 1;
    real[i] = data[i] * window;
  }

  let j = 0;
  for (let i = 1; i < size; i++) {
    let bit = size >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }

  for (let length = 2; length <= size; length <<= 1) {
    const angle = (-2 * Math.PI) / length;
    const wLenReal = Math.cos(angle);
    const wLenImag = Math.sin(angle);
    for (let start = 0; start < size; start += length) {
      let wReal = 1;
      let wImag = 0;
      for (let k = 0; k < length / 2; k++) {
        const even = start + k;
        const odd = even + length / 2;
        const oddReal = real[odd] * wReal - imag[odd] * wImag;
        const oddImag = real[odd] * wImag + imag[odd] * wReal;
        real[odd] = real[even] - oddReal;
        imag[odd] = imag[even] - oddImag;
        real[even] += oddReal;
        imag[even] += oddImag;
        const nextWReal = wReal * wLenReal - wImag * wLenImag;
        wImag = wReal * wLenImag + wImag * wLenReal;
        wReal = nextWReal;
      }
    }
  }

  const power = new Float64Array(size / 2 + 1);
  for (let i = 0; i < power.length; i++) power[i] = real[i] * real[i] + imag[i] * imag[i];
  return power;
}

function nextPowerOfTwoAtMost(value) {
  let result = 1;
  while (result * 2 <= value) result *= 2;
  return result;
}

function getSpectrum(samples, sampleRate, startSec = 0, endSec = samples.length / sampleRate) {
  const first = Math.max(0, Math.floor(startSec * sampleRate));
  const last = Math.min(samples.length, Math.floor(endSec * sampleRate));
  const length = Math.max(0, last - first);
  const fftSize = Math.min(8192, nextPowerOfTwoAtMost(length));
  if (fftSize < 64) return { power: new Float64Array(fftSize / 2 + 1), fftSize };
  const hop = Math.max(fftSize >> 1, 1);
  const average = new Float64Array(fftSize / 2 + 1);
  let count = 0;
  for (let at = first; at + fftSize <= last; at += hop) {
    const frame = samples.subarray(at, at + fftSize);
    const power = fftPower(frame, fftSize);
    for (let i = 0; i < average.length; i++) average[i] += power[i];
    count++;
  }
  if (count === 0 && length > 0) {
    const frame = samples.subarray(first, last);
    const power = fftPower(frame, fftSize);
    for (let i = 0; i < average.length; i++) average[i] += power[i];
    count = 1;
  }
  if (count > 0) for (let i = 0; i < average.length; i++) average[i] /= count;
  return { power: average, fftSize };
}

function centroidAndBandEnergy(samples, sampleRate, lowCut = 500) {
  const { power, fftSize } = getSpectrum(samples, sampleRate);
  const binHz = sampleRate / fftSize;
  let total = 0;
  let weighted = 0;
  let low = 0;
  for (let bin = 1; bin < power.length; bin++) {
    const frequency = bin * binHz;
    const energy = power[bin];
    total += energy;
    weighted += frequency * energy;
    if (frequency < lowCut) low += energy;
  }
  return { centroid: weighted / Math.max(1e-30, total), lowRatio: low / Math.max(1e-30, total) };
}

function frequencyPeak(power, sampleRate, fftSize, targetHz, toleranceHz) {
  const binHz = sampleRate / fftSize;
  const min = Math.max(1, Math.floor((targetHz - toleranceHz) / binHz));
  const max = Math.min(power.length - 1, Math.ceil((targetHz + toleranceHz) / binHz));
  let bestBin = min;
  for (let bin = min + 1; bin <= max; bin++) if (power[bin] > power[bestBin]) bestBin = bin;
  return { frequency: bestBin * binHz, power: power[bestBin] };
}

function correlation(left, right) {
  const length = Math.min(left.length, right.length);
  const leftMean = mean(left.subarray(0, length));
  const rightMean = mean(right.subarray(0, length));
  let numerator = 0;
  let leftPower = 0;
  let rightPower = 0;
  for (let i = 0; i < length; i++) {
    const a = left[i] - leftMean;
    const b = right[i] - rightMean;
    numerator += a * b;
    leftPower += a * a;
    rightPower += b * b;
  }
  return numerator / Math.sqrt(Math.max(1e-30, leftPower * rightPower));
}

function attackMs(samples, sampleRate) {
  const fullPeak = peak(samples);
  const threshold = fullPeak * 0.9;
  for (let i = 0; i < samples.length; i++) {
    if (Math.abs(samples[i]) >= threshold) return i / sampleRate * 1000;
  }
  return Infinity;
}

function verifySprite() {
  const manifestPath = path.join(PUBLIC_DIR, 'sfx.json');
  const spritePath = path.join(PUBLIC_DIR, 'sfx.wav');
  check(fs.existsSync(manifestPath), 'public/audio/sfx.json exists');
  check(fs.existsSync(spritePath), 'public/audio/sfx.wav exists (PCM WAV fallback)');
  if (!fs.existsSync(manifestPath) || !fs.existsSync(spritePath)) return null;

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const wav = parseWav(spritePath);
  check(wav.channels === 1, `SFX sprite is mono (got ${wav.channels} channels)`);
  check(wav.sampleRate === 32_000, `SFX sprite is 32 kHz (got ${wav.sampleRate} Hz)`);
  check(manifest.sprite && typeof manifest.sprite === 'object', 'sfx.json contains a sprite object');

  const slices = new Map();
  for (const name of REQUIRED) {
    const item = manifest.sprite?.[name];
    check(Array.isArray(item) && item.length === 2, `${name} is present in sfx.json`);
    if (!Array.isArray(item) || item.length !== 2) continue;
    const start = Math.round(item[0] * wav.sampleRate / 1000);
    const length = Math.round(item[1] * wav.sampleRate / 1000);
    const end = start + length;
    check(start >= 0 && length > 0 && end <= wav.samples.length, `${name} slice lies inside sfx.wav`);
    const samples = wav.samples.subarray(start, end);
    slices.set(name, samples);
    const truePeak = estimatedTruePeak(samples);
    const sampleRms = rms(samples);
    const dc = Math.abs(mean(samples));
    const peakDb = db(truePeak);
    const rmsDb = db(sampleRms);
    check(peakDb < -1, `${name} estimated true peak ${peakDb.toFixed(2)} dBFS is below -1 dBFS`);
    check(sampleRms > 0.003, `${name} is not silent (RMS ${sampleRms.toFixed(4)})`);
    check(dc < 0.002, `${name} DC offset ${dc.toFixed(5)} is below 0.002`);
    console.log(`${name.padEnd(18)} ${(item[1] / 1000).toFixed(3).padStart(5)} s   ${peakDb.toFixed(1).padStart(6)} dBFS TP   ${rmsDb.toFixed(1).padStart(6)} dBFS RMS   DC ${dc.toFixed(4)}`);
  }

  const transientNames = REQUIRED.filter((name) => /^(press|hover|switch|clack|lever_clack|stamp)/.test(name));
  const attackResults = [];
  for (const name of transientNames) {
    const samples = slices.get(name);
    if (!samples) continue;
    const attack = attackMs(samples, wav.sampleRate);
    attackResults.push({ name, attack });
    check(attack <= 10, `${name} transient reaches 90% of peak within 10 ms (got ${attack.toFixed(2)} ms)`);
  }

  const lowCentroidNames = ['stamp_1', 'stamp_2', 'impact_muffled_1', 'impact_muffled_2'];
  const lowCentroids = lowCentroidNames.map((name) => {
    const stats = centroidAndBandEnergy(slices.get(name), wav.sampleRate);
    check(stats.centroid < 800, `${name} centroid ${stats.centroid.toFixed(0)} Hz is below 800 Hz`);
    return `${name} ${stats.centroid.toFixed(0)} Hz`;
  });
  const highCentroidNames = ['air_brake', 'paper_1', 'paper_2', 'paper_3'];
  const highCentroids = highCentroidNames.map((name) => {
    const stats = centroidAndBandEnergy(slices.get(name), wav.sampleRate);
    check(stats.centroid > 2000, `${name} centroid ${stats.centroid.toFixed(0)} Hz is above 2 kHz`);
    return `${name} ${stats.centroid.toFixed(0)} Hz`;
  });
  const lowEnergyRatios = ['drone', 'sting_dread'].map((name) => {
    const stats = centroidAndBandEnergy(slices.get(name), wav.sampleRate);
    check(stats.lowRatio > 0.7, `${name} has ${(stats.lowRatio * 100).toFixed(1)}% of spectral energy below 500 Hz`);
    return `${name} ${(stats.lowRatio * 100).toFixed(1)}%`;
  });

  const bell = slices.get('bell');
  const bellStart = Math.round(0.25 * wav.sampleRate);
  const bellEnd = Math.min(bell.length, Math.round(1.05 * wav.sampleRate));
  const bellSpectrum = getSpectrum(bell, wav.sampleRate, bellStart / wav.sampleRate, bellEnd / wav.sampleRate);
  const bellRatios = [1, 2.0, 2.76, 5.4, 8.9];
  const bellPeaks = bellRatios.map((ratio) => frequencyPeak(
    bellSpectrum.power,
    wav.sampleRate,
    bellSpectrum.fftSize,
    880 * ratio,
    Math.max(24, 880 * ratio * 0.022),
  ));
  const fundamental = bellPeaks[0].frequency;
  for (let i = 0; i < bellRatios.length; i++) {
    const observedRatio = bellPeaks[i].frequency / fundamental;
    const relativeError = Math.abs(observedRatio - bellRatios[i]) / bellRatios[i];
    check(relativeError < 0.035, `bell partial ${i + 1} is near inharmonic ratio ${bellRatios[i]} (observed ${observedRatio.toFixed(3)})`);
  }
  const lateBellSpectrum = getSpectrum(bell, wav.sampleRate, 0.62, 0.88);
  const lateFundamental = frequencyPeak(lateBellSpectrum.power, wav.sampleRate, lateBellSpectrum.fftSize, fundamental, 35);
  const fullBellPeak = Math.max(...bellSpectrum.power);
  const lateFundamentalDb = db(Math.sqrt(lateFundamental.power / Math.max(1e-30, fullBellPeak)));
  check(lateFundamentalDb > -40, `bell fundamental remains above -40 dB after 600 ms (relative ${lateFundamentalDb.toFixed(1)} dB)`);

  const stampCorrelation = correlation(slices.get('stamp_1'), slices.get('stamp_2'));
  check(stampCorrelation < 0.9, `stamp variants correlate below 0.9 (r=${stampCorrelation.toFixed(3)})`);
  const maxAttack = Math.max(...attackResults.map(({ attack }) => attack));
  console.log(`\ntransient attacks: max ${maxAttack.toFixed(2)} ms / 10 ms (all ${attackResults.length} passed)`);
  console.log(`low-centroid sounds: ${lowCentroids.join(', ')}`);
  console.log(`high-centroid sounds: ${highCentroids.join(', ')}`);
  console.log(`<500 Hz energy: ${lowEnergyRatios.join(', ')}`);
  console.log(`bell modal peak estimates: ${bellPeaks.map((peak) => `${peak.frequency.toFixed(0)} Hz`).join(', ')}; late fundamental ${lateFundamentalDb.toFixed(1)} dB`);
  console.log(`stamp variant correlation: ${stampCorrelation.toFixed(3)}`);
  console.log(`sprite size: ${(fs.statSync(spritePath).size / 1024 / 1024).toFixed(3)} MiB; ${wav.samples.length} frames`);
  return { wav, slices };
}

function verifyAmbience() {
  const filePath = path.join(PUBLIC_DIR, 'ambience.wav');
  check(fs.existsSync(filePath), 'public/audio/ambience.wav exists (PCM WAV fallback)');
  if (!fs.existsSync(filePath)) return;
  const ambience = parseWav(filePath);
  const data = ambience.samples;
  const loudness = db(rms(data));
  const duration = data.length / ambience.sampleRate;
  check(ambience.channels === 1, `ambience is mono (got ${ambience.channels} channels)`);
  check(Math.abs(duration - 30) < 0.01, `ambience is a 30 s loop (got ${duration.toFixed(3)} s)`);
  check(Math.abs(loudness - (-26)) <= 2, `ambience RMS loudness ${loudness.toFixed(2)} LUFS-equivalent is within ±2 LU of -26`);

  let stepSum = 0;
  let stepCount = 0;
  const windowFrames = Math.min(Math.round(0.05 * ambience.sampleRate), Math.floor(data.length / 2));
  for (let i = 1; i < windowFrames; i++) {
    stepSum += Math.abs(data[i] - data[i - 1]);
    stepCount++;
    const tailIndex = data.length - windowFrames + i;
    stepSum += Math.abs(data[tailIndex] - data[tailIndex - 1]);
    stepCount++;
  }
  const averageStep = stepSum / Math.max(1, stepCount);
  const boundaryStep = Math.abs(data[0] - data[data.length - 1]);
  check(boundaryStep <= averageStep, `ambience loop seam step ${boundaryStep.toFixed(6)} <= average sample step ${averageStep.toFixed(6)}`);
  const ambiencePeakDb = db(estimatedTruePeak(data));
  check(ambiencePeakDb < -3, `ambience estimated true peak ${ambiencePeakDb.toFixed(2)} dBFS is below -3 dBFS`);
  console.log(`\nambience             ${duration.toFixed(2)} s   ${ambiencePeakDb.toFixed(1)} dBFS TP   ${loudness.toFixed(2)} LUFS-equivalent RMS   seam ${boundaryStep.toFixed(6)} / avg step ${averageStep.toFixed(6)}`);
}

try {
  console.log('SFX numerical verification:');
  verifySprite();
  verifyAmbience();
} catch (error) {
  failures.push(`Verifier could not complete: ${error.stack || error.message}`);
}

console.log(`\n${checks.filter((item) => item.ok).length}/${checks.length} checks passed.`);
if (failures.length) {
  console.error('\nFAILED:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exitCode = 1;
} else {
  console.log('All generated audio checks passed.');
}
