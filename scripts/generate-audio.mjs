#!/usr/bin/env node
/**
 * Deterministic, dependency-free foley renderer for Absürt Tramvay İkilemleri.
 * Generated from first principles; no recordings or third-party audio are used.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW_DIR = path.join(ROOT, 'audio-src', 'raw');
const SAMPLE_RATE = 44_100;
const FORCE = process.argv.includes('--force');
const TAU = Math.PI * 2;

fs.mkdirSync(RAW_DIR, { recursive: true });

function hashString(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function makeRng(seed) {
  let state = seed >>> 0 || 0x6d2b79f5;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function rngFor(name) {
  return makeRng(hashString(`tramvay-sample-dsp-v1:${name}`));
}

function randBetween(rng, min, max) {
  return min + rng() * (max - min);
}

function randomJitter(rng, amount = 0.05) {
  return 1 + (rng() * 2 - 1) * amount;
}

function zeros(seconds, sampleRate = SAMPLE_RATE) {
  return new Float64Array(Math.max(1, Math.round(seconds * sampleRate)));
}

function addAt(destination, source, offset = 0, gain = 1) {
  const start = Math.max(0, Math.round(offset));
  const end = Math.min(destination.length, start + source.length);
  for (let i = start; i < end; i++) destination[i] += source[i - start] * gain;
}

function whiteNoise(length, rng) {
  const out = new Float64Array(length);
  for (let i = 0; i < length; i++) out[i] = rng() * 2 - 1;
  return out;
}

function brownNoise(length, rng) {
  const out = new Float64Array(length);
  let brown = 0;
  for (let i = 0; i < length; i++) {
    brown = brown * 0.996 + (rng() * 2 - 1) * 0.035;
    out[i] = brown;
  }
  return out;
}

function biquad(input, type, frequency, q = 0.707, sampleRate = SAMPLE_RATE) {
  const out = new Float64Array(input.length);
  const f = Math.min(Math.max(10, frequency), sampleRate * 0.45);
  const omega = TAU * f / sampleRate;
  const cosine = Math.cos(omega);
  const sine = Math.sin(omega);
  const alpha = sine / (2 * Math.max(0.05, q));
  let b0;
  let b1;
  let b2;
  if (type === 'lowpass') {
    b0 = (1 - cosine) / 2;
    b1 = 1 - cosine;
    b2 = (1 - cosine) / 2;
  } else if (type === 'highpass') {
    b0 = (1 + cosine) / 2;
    b1 = -(1 + cosine);
    b2 = (1 + cosine) / 2;
  } else {
    // Constant-skirt-gain bandpass.
    b0 = alpha;
    b1 = 0;
    b2 = -alpha;
  }
  const a0 = 1 + alpha;
  const a1 = -2 * cosine;
  const a2 = 1 - alpha;
  b0 /= a0;
  b1 /= a0;
  b2 /= a0;
  const normalizedA1 = a1 / a0;
  const normalizedA2 = a2 / a0;

  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < input.length; i++) {
    const x0 = input[i];
    const y0 = b0 * x0 + b1 * x1 + b2 * x2 - normalizedA1 * y1 - normalizedA2 * y2;
    out[i] = y0;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
  }
  return out;
}

function onePoleLowpass(input, cutoffHz, sampleRate = SAMPLE_RATE) {
  const out = new Float64Array(input.length);
  const alpha = 1 - Math.exp(-TAU * Math.max(5, cutoffHz) / sampleRate);
  let state = 0;
  for (let i = 0; i < input.length; i++) {
    state += alpha * (input[i] - state);
    out[i] = state;
  }
  return out;
}

function movingLowpass(input, cutoffAt, sampleRate = SAMPLE_RATE) {
  const out = new Float64Array(input.length);
  let state = 0;
  for (let i = 0; i < input.length; i++) {
    const alpha = 1 - Math.exp(-TAU * Math.max(5, cutoffAt(i / sampleRate)) / sampleRate);
    state += alpha * (input[i] - state);
    out[i] = state;
  }
  return out;
}

function movingHighpass(input, cutoffAt, sampleRate = SAMPLE_RATE) {
  const out = new Float64Array(input.length);
  let state = 0;
  for (let i = 0; i < input.length; i++) {
    const alpha = 1 - Math.exp(-TAU * Math.max(5, cutoffAt(i / sampleRate)) / sampleRate);
    state += alpha * (input[i] - state);
    out[i] = input[i] - state;
  }
  return out;
}

function envelopeADSR(seconds, sampleRate, { attack = 0.005, decay = 0.05, sustain = 0.5, release = 0.1 } = {}) {
  const length = Math.round(seconds * sampleRate);
  const out = new Float64Array(length);
  const attackN = Math.max(1, Math.round(attack * sampleRate));
  const decayN = Math.max(1, Math.round(decay * sampleRate));
  const releaseN = Math.max(1, Math.round(release * sampleRate));
  const releaseStart = Math.max(attackN + decayN, length - releaseN);
  for (let i = 0; i < length; i++) {
    if (i < attackN) out[i] = i / attackN;
    else if (i < attackN + decayN) {
      const p = (i - attackN) / decayN;
      out[i] = 1 + (sustain - 1) * p;
    } else if (i < releaseStart) out[i] = sustain;
    else out[i] = sustain * Math.max(0, 1 - (i - releaseStart) / Math.max(1, length - releaseStart));
  }
  return out;
}

function expDecay(t, tau, attack = 0) {
  if (t < attack) return t / Math.max(attack, 1e-6);
  return Math.exp(-(t - attack) / Math.max(tau, 1e-5));
}

function softSaturate(input, drive = 1.2) {
  const out = new Float64Array(input.length);
  const norm = Math.tanh(drive);
  for (let i = 0; i < input.length; i++) out[i] = Math.tanh(input[i] * drive) / norm;
  return out;
}

function applyFade(input, sampleRate, fadeInSec = 0.001, fadeOutSec = 0.006) {
  const out = new Float64Array(input);
  const inN = Math.min(out.length, Math.max(0, Math.round(fadeInSec * sampleRate)));
  const outN = Math.min(out.length, Math.max(0, Math.round(fadeOutSec * sampleRate)));
  for (let i = 0; i < inN; i++) {
    const p = inN <= 1 ? 1 : i / (inN - 1);
    out[i] *= 0.5 - 0.5 * Math.cos(Math.PI * p);
  }
  for (let i = 0; i < outN; i++) {
    const p = outN <= 1 ? 1 : i / (outN - 1);
    out[out.length - outN + i] *= 0.5 + 0.5 * Math.cos(Math.PI * p);
  }
  return out;
}

function addDampedMode(destination, sampleRate, startSec, frequency, tau, amplitude, phase) {
  const start = Math.round(startSec * sampleRate);
  const length = destination.length - start;
  if (length <= 0) return;
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    destination[start + i] += amplitude * Math.sin(TAU * frequency * t + phase) * Math.exp(-t / tau);
  }
}

function addSweptTone(destination, sampleRate, startSec, durationSec, startHz, endHz, amplitude, rng, options = {}) {
  const start = Math.round(startSec * sampleRate);
  const length = Math.min(destination.length - start, Math.round(durationSec * sampleRate));
  if (length <= 0) return;
  const phase = randBetween(rng, 0, TAU);
  const { attack = 0.001, tau = durationSec * 0.5, curvature = 1, vibratoHz = 0, vibratoDepth = 0 } = options;
  let phaseAcc = phase;
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const p = Math.min(1, t / durationSec);
    const curved = Math.pow(p, curvature);
    let frequency = startHz + (endHz - startHz) * curved;
    if (vibratoHz > 0) frequency += Math.sin(TAU * vibratoHz * t) * vibratoDepth;
    const attackGain = attack > 0 ? Math.min(1, t / attack) : 1;
    destination[start + i] += amplitude * attackGain * Math.exp(-t / Math.max(0.001, tau)) * Math.sin(phaseAcc);
    phaseAcc += TAU * frequency / sampleRate;
  }
}

function addWaveVoice(destination, sampleRate, {
  startSec = 0,
  durationSec,
  startHz,
  endHz = startHz,
  amplitude = 0.1,
  phase = 0,
  wave = 'saw',
  attackSec = 0.02,
  releaseSec = 0.2,
  detuneCents = 0,
  vibratoHz = 0,
  vibratoCents = 0,
  harmonicCount = 12,
  envelope = null,
} = {}) {
  const start = Math.round(startSec * sampleRate);
  const length = Math.min(destination.length - start, Math.round(durationSec * sampleRate));
  if (length <= 0) return;
  const detune = Math.pow(2, detuneCents / 1200);
  const releaseStart = Math.max(0, durationSec - releaseSec);
  let phaseAcc = phase;
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const p = Math.min(1, t / durationSec);
    const glide = startHz + (endHz - startHz) * p;
    const vibrato = vibratoCents === 0 ? 1 : Math.pow(2, Math.sin(TAU * vibratoHz * t) * vibratoCents / 1200);
    const frequency = glide * detune * vibrato;
    let waveValue = 0;
    let weightSum = 0;
    const count = Math.min(harmonicCount, Math.max(1, Math.floor((sampleRate * 0.45) / frequency)));
    for (let h = 1; h <= count; h++) {
      let weight = 0;
      if (wave === 'triangle') {
        if (h % 2 === 1) weight = (Math.pow(-1, (h - 1) / 2) / (h * h));
      } else if (wave === 'square') {
        if (h % 2 === 1) weight = 1 / h;
      } else {
        weight = (h % 2 === 0 ? -1 : 1) / h;
      }
      waveValue += weight * Math.sin(phaseAcc * h);
      weightSum += Math.abs(weight);
    }
    waveValue /= Math.max(1, weightSum);

    let env;
    if (envelope) env = envelope(t, p);
    else {
      const attack = attackSec > 0 ? Math.min(1, t / attackSec) : 1;
      const release = releaseSec > 0 && t > releaseStart ? Math.max(0, (durationSec - t) / releaseSec) : 1;
      env = attack * release;
    }
    destination[start + i] += waveValue * amplitude * env;
    phaseAcc += TAU * frequency / sampleRate;
  }
}

function combReverb(input, sampleRate, delaySec, feedback) {
  const delay = Math.max(1, Math.round(delaySec * sampleRate));
  const out = new Float64Array(input.length);
  for (let i = delay; i < input.length; i++) out[i] = input[i - delay] + out[i - delay] * feedback;
  return out;
}

function allpass(input, sampleRate, delaySec, gain = 0.45) {
  const delay = Math.max(1, Math.round(delaySec * sampleRate));
  const out = new Float64Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const delayedIn = i >= delay ? input[i - delay] : 0;
    const delayedOut = i >= delay ? out[i - delay] : 0;
    out[i] = -gain * input[i] + delayedIn + gain * delayedOut;
  }
  return out;
}

function roomReverb(input, sampleRate = SAMPLE_RATE, wet = 0.12) {
  const combs = [
    combReverb(input, sampleRate, 0.0211, 0.22),
    combReverb(input, sampleRate, 0.0277, 0.18),
    combReverb(input, sampleRate, 0.0349, 0.16),
  ];
  const sum = new Float64Array(input.length);
  for (let i = 0; i < sum.length; i++) sum[i] = (combs[0][i] + combs[1][i] + combs[2][i]) / 3;
  const diffused = allpass(allpass(sum, sampleRate, 0.0051, 0.42), sampleRate, 0.0017, 0.36);
  const out = new Float64Array(input.length);
  for (let i = 0; i < out.length; i++) out[i] = input[i] + diffused[i] * wet;
  return out;
}

function removeDc(input) {
  let mean = 0;
  for (const sample of input) mean += sample;
  mean /= Math.max(1, input.length);
  const out = new Float64Array(input.length);
  for (let i = 0; i < input.length; i++) out[i] = input[i] - mean;
  return out;
}

function peakOf(input) {
  let peak = 0;
  for (const sample of input) peak = Math.max(peak, Math.abs(sample));
  return peak;
}

function rmsOf(input) {
  let sum = 0;
  for (const sample of input) sum += sample * sample;
  return Math.sqrt(sum / Math.max(1, input.length));
}

function normalizePeak(input, targetDb) {
  const target = Math.pow(10, targetDb / 20);
  const peak = peakOf(input);
  const scale = peak > 0 ? target / peak : 1;
  const out = new Float64Array(input.length);
  for (let i = 0; i < input.length; i++) out[i] = input[i] * scale;
  return out;
}

function finalizeSfx(input, targetDb = -6, fadeOutSec = 0.007) {
  const faded = applyFade(removeDc(input), SAMPLE_RATE, 0.0004, fadeOutSec);
  return normalizePeak(removeDc(faded), targetDb);
}

function writePcm16Wav(filePath, data, sampleRate = SAMPLE_RATE) {
  const bytesPerSample = 2;
  const dataBytes = data.length * bytesPerSample;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataBytes, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * bytesPerSample, 28);
  header.writeUInt16LE(bytesPerSample, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataBytes, 40);
  const pcm = Buffer.alloc(dataBytes);
  for (let i = 0; i < data.length; i++) {
    const sample = Math.max(-1, Math.min(1, data[i]));
    pcm.writeInt16LE(Math.round(sample * 32767), i * 2);
  }
  fs.writeFileSync(filePath, Buffer.concat([header, pcm]));
}

function addNoiseBurst(destination, {
  startSec = 0,
  durationSec,
  centerHz = 1400,
  q = 0.8,
  filterType = 'bandpass',
  amplitude = 0.3,
  attackSec = 0.0005,
  decaySec = durationSec * 0.5,
  rng,
  shaping = null,
} = {}) {
  const length = Math.max(1, Math.round(durationSec * SAMPLE_RATE));
  let noise = whiteNoise(length, rng);
  if (filterType === 'bandpass' || filterType === 'highpass' || filterType === 'lowpass') {
    noise = biquad(noise, filterType, centerHz, q, SAMPLE_RATE);
  }
  const out = new Float64Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / SAMPLE_RATE;
    const env = shaping ? shaping(t, durationSec) : expDecay(t, decaySec, attackSec);
    out[i] = noise[i] * env * amplitude;
  }
  addAt(destination, out, startSec * SAMPLE_RATE);
  return out;
}

function synthPress(name) {
  const rng = rngFor(name);
  const out = zeros(0.15);
  addNoiseBurst(out, {
    durationSec: 0.005 * randomJitter(rng, 0.08),
    centerHz: 1500 * randomJitter(rng, 0.05),
    q: 0.95,
    amplitude: 1.1,
    attackSec: 0.00015,
    decaySec: 0.0025,
    rng,
  });
  addDampedMode(out, SAMPLE_RATE, 0.0005, 120 * randomJitter(rng, 0.04), 0.060, 0.34 * randomJitter(rng, 0.08), randBetween(rng, 0, TAU));
  const tail = roomReverb(out, SAMPLE_RATE, 0.055);
  return finalizeSfx(tail, -8, 0.012);
}

function synthHover(name, index) {
  const rng = rngFor(name);
  const out = zeros(0.05);
  const resonance = [2200, 2550, 2860][index - 1] * randomJitter(rng, 0.025);
  addNoiseBurst(out, {
    durationSec: 0.0024 * randomJitter(rng, 0.1),
    centerHz: 3900 * randomJitter(rng, 0.05),
    q: 0.65,
    filterType: 'highpass',
    amplitude: 0.95,
    attackSec: 0.0001,
    decaySec: 0.0013,
    rng,
  });
  addDampedMode(out, SAMPLE_RATE, 0.0002, resonance, 0.012 + index * 0.001, 0.045, randBetween(rng, 0, TAU));
  return finalizeSfx(roomReverb(out, SAMPLE_RATE, 0.012), -17, 0.006);
}

function synthSwitch(name, index) {
  const rng = rngFor(name);
  const out = zeros(0.12);
  const firstAt = randBetween(rng, 0.000, 0.003);
  const secondAt = randBetween(rng, 0.025, 0.040);
  for (const [hitAt, amp] of [[firstAt, 0.9], [secondAt, 0.68]] ) {
    addNoiseBurst(out, {
      startSec: hitAt,
      durationSec: 0.0035 * randomJitter(rng, 0.1),
      centerHz: 1700 * randomJitter(rng, 0.04),
      q: 0.85,
      amplitude: amp,
      attackSec: 0.0002,
      decaySec: 0.0024,
      rng,
    });
    addDampedMode(out, SAMPLE_RATE, hitAt + 0.0005, 900 * randomJitter(rng, 0.025), 0.044, 0.24 * amp * randomJitter(rng, 0.1), randBetween(rng, 0, TAU));
    addDampedMode(out, SAMPLE_RATE, hitAt + 0.0003, 2400 * randomJitter(rng, 0.025), 0.024, 0.16 * amp * randomJitter(rng, 0.1), randBetween(rng, 0, TAU));
  }
  addDampedMode(out, SAMPLE_RATE, 0.002, 320 * randomJitter(rng, 0.05), 0.048, 0.06, randBetween(rng, 0, TAU));
  return finalizeSfx(roomReverb(out, SAMPLE_RATE, 0.04), -8, 0.01);
}

function synthPaper(name, durationSec) {
  const rng = rngFor(name);
  const out = zeros(durationSec);
  const length = out.length;
  const white = whiteNoise(length, rng);
  const high = biquad(biquad(white, 'highpass', 1900 * randomJitter(rng, 0.035), 0.58), 'lowpass', 6700 * randomJitter(rng, 0.04), 0.68);
  const lowSource = brownNoise(length, rng);
  const body = biquad(onePoleLowpass(lowSource, 820), 'highpass', 180, 0.72);
  const grains = new Float64Array(length);
  let cursor = 0;
  while (cursor < durationSec) {
    cursor += randBetween(rng, 0.004, 0.018);
    const burstDuration = randBetween(rng, 0.004, 0.030);
    const start = Math.round(cursor * SAMPLE_RATE);
    const count = Math.round(burstDuration * SAMPLE_RATE);
    const level = randBetween(rng, 0.18, 0.72);
    for (let i = 0; i < count && start + i < length; i++) {
      const p = i / Math.max(1, count - 1);
      const shape = Math.pow(Math.sin(Math.PI * p), randBetween(rng, 0.5, 1.5));
      grains[start + i] += level * shape;
    }
  }

  let slow = 0.42;
  let nextChange = 0;
  const slowStep = Math.max(1, Math.round(SAMPLE_RATE * 0.025));
  let slowTarget = 0.5;
  for (let i = 0; i < length; i++) {
    if (i >= nextChange) {
      slowTarget = randBetween(rng, 0.27, 0.72);
      nextChange = i + slowStep;
    }
    slow += (slowTarget - slow) * 0.012;
    const t = i / SAMPLE_RATE;
    const attack = Math.min(1, t / 0.035);
    const tail = Math.min(1, Math.max(0, (durationSec - t) / 0.06));
    const texture = Math.min(1.05, 0.20 + slow + grains[i] * 0.9);
    out[i] = (high[i] * 0.34 * texture + body[i] * 0.65 * (0.38 + grains[i] * 0.2)) * attack * tail;
  }
  return finalizeSfx(roomReverb(out, SAMPLE_RATE, 0.085), -9, 0.018);
}

function synthLeverClack(name) {
  const rng = rngFor(name);
  const out = zeros(0.5);
  const chunkAt = randBetween(rng, 0.09, 0.13);
  addNoiseBurst(out, {
    durationSec: 0.0038,
    centerHz: 1550 * randomJitter(rng, 0.04),
    q: 0.72,
    amplitude: 1.0,
    attackSec: 0.00012,
    decaySec: 0.0024,
    rng,
  });
  for (const [frequency, tau, amp] of [[400, 0.115, 0.30], [1100, 0.10, 0.24], [2700, 0.075, 0.14]]) {
    addDampedMode(out, SAMPLE_RATE, 0.0003, frequency * randomJitter(rng, 0.045), tau * randomJitter(rng, 0.1), amp * randomJitter(rng, 0.1), randBetween(rng, 0, TAU));
  }
  addNoiseBurst(out, {
    startSec: chunkAt,
    durationSec: 0.09,
    centerHz: 260 * randomJitter(rng, 0.05),
    q: 0.6,
    filterType: 'lowpass',
    amplitude: 0.72,
    attackSec: 0.0004,
    decaySec: 0.075,
    rng,
  });
  addDampedMode(out, SAMPLE_RATE, chunkAt, 70 * randomJitter(rng, 0.04), 0.20, 0.58, randBetween(rng, 0, TAU));
  addDampedMode(out, SAMPLE_RATE, chunkAt + 0.004, 178 * randomJitter(rng, 0.05), 0.12, 0.14, randBetween(rng, 0, TAU));
  return finalizeSfx(roomReverb(out, SAMPLE_RATE, 0.14), -6, 0.025);
}

function synthBell(name) {
  const rng = rngFor(name);
  const out = zeros(1.2);
  const base = 880 * randomJitter(rng, 0.015);
  const ratios = [1, 2.0, 2.76, 5.4, 8.9];
  const amplitudes = [0.80, 0.36, 0.25, 0.15, 0.085];
  const decays = [0.90, 0.62, 0.45, 0.29, 0.18];
  for (const [strike, strikeGain] of [[0.001, 1], [0.18, 0.69]]) {
    addNoiseBurst(out, {
      startSec: strike,
      durationSec: 0.002 * randomJitter(rng, 0.1),
      centerHz: 4200,
      q: 0.8,
      amplitude: 0.17 * strikeGain,
      attackSec: 0.0001,
      decaySec: 0.0012,
      rng,
    });
    ratios.forEach((ratio, i) => {
      const frequency = base * ratio * randomJitter(rng, 0.006);
      addDampedMode(
        out,
        SAMPLE_RATE,
        strike,
        frequency,
        decays[i] * randomJitter(rng, 0.06),
        amplitudes[i] * strikeGain * randomJitter(rng, 0.09),
        randBetween(rng, 0, TAU),
      );
    });
  }
  return finalizeSfx(roomReverb(out, SAMPLE_RATE, 0.045), -8, 0.02);
}

function synthAirBrake(name) {
  const rng = rngFor(name);
  const duration = 0.8;
  const out = zeros(duration);
  const noise = whiteNoise(out.length, rng);
  const tilted = movingHighpass(noise, (t) => {
    if (t < 0.12) return 1950 + (t / 0.12) * 1450;
    return 2650 - Math.min(1, (t - 0.12) / 0.68) * 430;
  });
  const hiss = biquad(tilted, 'lowpass', 9600, 0.68);
  const lowTexture = biquad(whiteNoise(out.length, rng), 'bandpass', 1650, 0.65);
  const hissEnvelope = envelopeADSR(duration, SAMPLE_RATE, { attack: 0.015, decay: 0.14, sustain: 0.78, release: 0.62 });
  for (let i = 0; i < out.length; i++) {
    const t = i / SAMPLE_RATE;
    const highTilt = t < 0.08 ? 0.72 + (t / 0.08) * 0.5 : 1;
    out[i] = hiss[i] * hissEnvelope[i] * highTilt * 0.47 + lowTexture[i] * hissEnvelope[i] * 0.035;
  }
  addNoiseBurst(out, { durationSec: 0.005, centerHz: 2500, q: 0.7, amplitude: 0.24, attackSec: 0.0002, decaySec: 0.003, rng });
  return finalizeSfx(roomReverb(out, SAMPLE_RATE, 0.06), -9, 0.045);
}

function synthBrakeSqueal(name) {
  const rng = rngFor(name);
  const duration = 0.6;
  const out = zeros(duration);
  const noise = biquad(biquad(whiteNoise(out.length, rng), 'highpass', 1550, 0.65), 'lowpass', 6200, 0.7);
  for (const [frequency, amplitude] of [[1840, 0.17], [2460, 0.13], [3180, 0.08]]) {
    const start = frequency * randomJitter(rng, 0.035);
    const end = start * randBetween(rng, 0.88, 0.95);
    addWaveVoice(out, SAMPLE_RATE, {
      durationSec: duration,
      startHz: start,
      endHz: end,
      amplitude: amplitude * randomJitter(rng, 0.1),
      phase: randBetween(rng, 0, TAU),
      wave: 'triangle',
      attackSec: 0.045,
      releaseSec: 0.15,
      detuneCents: randBetween(rng, -5, 5),
      vibratoHz: randBetween(rng, 0.35, 0.75),
      vibratoCents: randBetween(rng, 2, 7),
      harmonicCount: 1,
      envelope: (t) => t < 0.06 ? t / 0.06 : Math.exp(-Math.max(0, t - 0.34) / 0.16),
    });
  }
  for (let i = 0; i < out.length; i++) {
    const t = i / SAMPLE_RATE;
    const env = t < 0.06 ? t / 0.06 : Math.exp(-Math.max(0, t - 0.32) / 0.18);
    out[i] += noise[i] * env * 0.20;
  }
  addNoiseBurst(out, { durationSec: 0.009, centerHz: 2100, q: 0.6, amplitude: 0.16, decaySec: 0.006, rng });
  return finalizeSfx(roomReverb(out, SAMPLE_RATE, 0.09), -9, 0.03);
}

function synthDrone(name = 'drone') {
  const rng = rngFor(name);
  const duration = 2.0;
  const out = zeros(duration);
  const fundamentals = [55, 82.4, 110, 146.8];
  fundamentals.forEach((frequency, i) => {
    addWaveVoice(out, SAMPLE_RATE, {
      durationSec: duration,
      startHz: frequency * randomJitter(rng, 0.025),
      endHz: frequency * randomJitter(rng, 0.035),
      amplitude: [0.25, 0.19, 0.14, 0.08][i],
      phase: randBetween(rng, 0, TAU),
      wave: i === 0 ? 'saw' : 'triangle',
      attackSec: 0.28,
      releaseSec: 0.9,
      detuneCents: randBetween(rng, -7, 7),
      vibratoHz: 0.08,
      vibratoCents: 3,
      harmonicCount: 15,
      envelope: (t) => {
        const attack = Math.min(1, t / 0.36);
        const fade = t < 1.05 ? 1 : Math.max(0, (duration - t) / 0.95);
        return attack * fade;
      },
    });
  });
  const lowCutoff = movingLowpass(out, (t) => 330 + 75 * (0.5 + 0.5 * Math.sin(TAU * 0.18 * t)));
  const room = roomReverb(lowCutoff, SAMPLE_RATE, 0.12);
  addNoiseBurst(room, { durationSec: 0.12, centerHz: 130, q: 0.6, filterType: 'lowpass', amplitude: 0.08, attackSec: 0.025, decaySec: 0.1, rng });
  return finalizeSfx(room, -9, 0.06);
}

function synthClack(name, index) {
  const rng = rngFor(name);
  const out = zeros(0.12);
  const resonance = [1330, 1640, 1940][index - 1] * randomJitter(rng, 0.04);
  addNoiseBurst(out, {
    durationSec: 0.0028,
    centerHz: resonance * 1.15,
    q: 0.65,
    amplitude: 1.05,
    attackSec: 0.00008,
    decaySec: 0.0018,
    rng,
  });
  addDampedMode(out, SAMPLE_RATE, 0.0002, resonance, 0.044 * randomJitter(rng, 0.1), 0.34 * randomJitter(rng, 0.1), randBetween(rng, 0, TAU));
  addNoiseBurst(out, { startSec: 0.001, durationSec: 0.035, centerHz: 430, q: 0.7, filterType: 'lowpass', amplitude: 0.10, decaySec: 0.018, rng });
  return finalizeSfx(roomReverb(out, SAMPLE_RATE, 0.022), -8, 0.01);
}

function synthImpact(name) {
  const rng = rngFor(name);
  const out = zeros(0.6);
  addNoiseBurst(out, {
    durationSec: 0.19,
    centerHz: 410 * randomJitter(rng, 0.05),
    q: 0.65,
    filterType: 'lowpass',
    amplitude: 0.78,
    attackSec: 0.0003,
    decaySec: 0.085,
    rng,
  });
  addSweptTone(out, SAMPLE_RATE, 0, 0.27, 90 * randomJitter(rng, 0.04), 35 * randomJitter(rng, 0.05), 0.9, rng, { attack: 0.0003, tau: 0.17, curvature: 0.8 });
  addDampedMode(out, SAMPLE_RATE, 0.006, 192 * randomJitter(rng, 0.04), 0.085, 0.23, randBetween(rng, 0, TAU));
  addDampedMode(out, SAMPLE_RATE, 0.012, 315 * randomJitter(rng, 0.04), 0.055, 0.12, randBetween(rng, 0, TAU));
  addNoiseBurst(out, { startSec: 0.045, durationSec: 0.07, centerHz: 240, q: 1.1, amplitude: 0.17, attackSec: 0.001, decaySec: 0.035, rng });
  return finalizeSfx(roomReverb(out, SAMPLE_RATE, 0.15), -3, 0.025);
}

function synthComicCrash(name = 'crash_comic') {
  const rng = rngFor(name);
  const out = zeros(1.2);
  const crash = whiteNoise(Math.round(0.32 * SAMPLE_RATE), rng);
  const crashFiltered = biquad(biquad(crash, 'lowpass', 5200, 0.65), 'highpass', 120, 0.7);
  for (let i = 0; i < crashFiltered.length; i++) {
    const t = i / SAMPLE_RATE;
    const env = t < 0.003 ? t / 0.003 : Math.exp(-t / 0.13);
    out[i] += crashFiltered[i] * env * 0.58;
  }
  const partials = [125, 211, 318, 487, 725, 1090, 1640, 2380];
  partials.forEach((frequency, index) => {
    addDampedMode(out, SAMPLE_RATE, randBetween(rng, 0, 0.009), frequency * randomJitter(rng, 0.045), 0.48 - index * 0.035, (0.25 / (1 + index * 0.22)) * randomJitter(rng, 0.1), randBetween(rng, 0, TAU));
  });
  addSweptTone(out, SAMPLE_RATE, 0, 0.46, 260, 54, 0.48, rng, { attack: 0.0002, tau: 0.29, curvature: 0.75 });
  addWaveVoice(out, SAMPLE_RATE, {
    startSec: 0.05,
    durationSec: 0.37,
    startHz: 1500 * randomJitter(rng, 0.03),
    endHz: 3500 * randomJitter(rng, 0.03),
    amplitude: 0.16,
    phase: randBetween(rng, 0, TAU),
    wave: 'triangle',
    attackSec: 0.025,
    releaseSec: 0.12,
    vibratoHz: 8,
    vibratoCents: 18,
    harmonicCount: 4,
    envelope: (t) => Math.min(1, t / 0.025) * Math.exp(-Math.max(0, t - 0.22) / 0.09),
  });
  const squealNoise = whiteNoise(Math.round(0.15 * SAMPLE_RATE), rng);
  const wobbleStart = 0.72;
  const chunkSize = 384;
  for (let start = 0; start < squealNoise.length; start += chunkSize) {
    const t = start / SAMPLE_RATE;
    const wobble = 0.5 + 0.5 * Math.sin(TAU * 26 * t);
    const center = 1050 + wobble * 2100;
    const chunk = squealNoise.slice(start, Math.min(start + chunkSize, squealNoise.length));
    const filtered = biquad(chunk, 'bandpass', center, 1.15);
    for (let i = 0; i < filtered.length; i++) {
      const localT = (start + i) / SAMPLE_RATE;
      const env = Math.sin(Math.PI * (start + i) / squealNoise.length);
      out[Math.round(wobbleStart * SAMPLE_RATE) + start + i] += filtered[i] * env * 0.32;
    }
  }
  addNoiseBurst(out, { startSec: 0.74, durationSec: 0.16, centerHz: 1650, q: 0.7, amplitude: 0.13, decaySec: 0.11, rng });
  return finalizeSfx(roomReverb(softSaturate(out, 1.08), SAMPLE_RATE, 0.16), -3, 0.055);
}

function synthStamp(name) {
  const rng = rngFor(name);
  const out = zeros(0.4);
  addNoiseBurst(out, {
    durationSec: 0.003 * randomJitter(rng, 0.08),
    centerHz: 940 * randomJitter(rng, 0.05),
    q: 0.55,
    amplitude: 0.56,
    attackSec: 0.00008,
    decaySec: 0.0021,
    rng,
  });
  addSweptTone(out, SAMPLE_RATE, 0.0002, 0.13, 140 * randomJitter(rng, 0.04), 55 * randomJitter(rng, 0.04), 0.95 * randomJitter(rng, 0.08), rng, { attack: 0.0004, tau: 0.072, curvature: 0.72 });
  addDampedMode(out, SAMPLE_RATE, randBetween(rng, 0.001, 0.003), 202 * randomJitter(rng, 0.04), 0.062 * randomJitter(rng, 0.08), 0.29 * randomJitter(rng, 0.08), randBetween(rng, 0, TAU));
  addDampedMode(out, SAMPLE_RATE, 0.002, 112 * randomJitter(rng, 0.04), 0.09, 0.16, randBetween(rng, 0, TAU));
  const dry = roomReverb(out, SAMPLE_RATE, 0.035);
  return finalizeSfx(dry, -3, 0.03);
}

function synthStingRelief(name = 'sting_relief') {
  const rng = rngFor(name);
  const out = zeros(1.5);
  const chordA = [174.61, 220, 261.63, 329.63]; // Fmaj7
  const chordB = [130.81, 164.81, 196, 261.63]; // C
  const renderChord = (notes, startSec, durationSec, level) => {
    notes.forEach((frequency, index) => {
      addWaveVoice(out, SAMPLE_RATE, {
        startSec,
        durationSec,
        startHz: frequency * randomJitter(rng, 0.012),
        amplitude: level * (index < 2 ? 0.24 : 0.18) * randomJitter(rng, 0.09),
        phase: randBetween(rng, 0, TAU),
        wave: index === 0 ? 'triangle' : 'saw',
        attackSec: 0.24,
        releaseSec: 0.42,
        detuneCents: randBetween(rng, -5, 5),
        harmonicCount: 9,
        envelope: (t, p) => Math.min(1, t / 0.24) * Math.min(1, (1 - p) / 0.26),
      });
    });
  };
  renderChord(chordA, 0.01, 0.88, 1);
  renderChord(chordB, 0.58, 0.91, 0.86);
  const softened = biquad(out, 'lowpass', 1550, 0.64);
  addNoiseBurst(softened, { durationSec: 0.012, centerHz: 1100, q: 0.6, amplitude: 0.045, attackSec: 0.001, decaySec: 0.008, rng });
  return finalizeSfx(roomReverb(softened, SAMPLE_RATE, 0.16), -8, 0.09);
}

function synthStingDread(name = 'sting_dread') {
  const rng = rngFor(name);
  const out = zeros(1.5);
  const notes = [55, 58.27, 77.78, 82.4]; // low semitone and tritone cluster
  notes.forEach((frequency, index) => {
    addWaveVoice(out, SAMPLE_RATE, {
      durationSec: 1.5,
      startHz: frequency * randomJitter(rng, 0.018),
      endHz: frequency * randomJitter(rng, 0.024),
      amplitude: [0.28, 0.23, 0.21, 0.14][index],
      phase: randBetween(rng, 0, TAU),
      wave: 'saw',
      attackSec: 0.68,
      releaseSec: 0.28,
      detuneCents: randBetween(rng, -8, 8),
      harmonicCount: 9,
      envelope: (t) => Math.min(1, t / 0.72) * Math.min(1, (1.5 - t) / 0.32),
    });
  });
  const lowpass = movingLowpass(out, (t) => 245 + 48 * (0.5 + 0.5 * Math.sin(TAU * 0.15 * t)));
  addNoiseBurst(lowpass, { durationSec: 0.075, centerHz: 180, q: 0.7, filterType: 'lowpass', amplitude: 0.055, attackSec: 0.035, decaySec: 0.055, rng });
  return finalizeSfx(roomReverb(lowpass, SAMPLE_RATE, 0.095), -8, 0.11);
}

function synthStingAbsurd(name = 'sting_absurd') {
  const rng = rngFor(name);
  const out = zeros(1.5);
  const notes = [
    { at: 0.045, duration: 0.33, start: 224, end: 209, amp: 0.38 },
    { at: 0.39, duration: 0.31, start: 198, end: 184, amp: 0.34 },
    { at: 0.73, duration: 0.37, start: 168, end: 143, amp: 0.39 },
  ];
  notes.forEach((note) => {
    addNoiseBurst(out, { startSec: note.at, durationSec: 0.012, centerHz: 850, q: 0.55, amplitude: 0.12, attackSec: 0.002, decaySec: 0.008, rng });
    addWaveVoice(out, SAMPLE_RATE, {
      startSec: note.at,
      durationSec: note.duration,
      startHz: note.start * randomJitter(rng, 0.02),
      endHz: note.end * randomJitter(rng, 0.025),
      amplitude: note.amp,
      phase: randBetween(rng, 0, TAU),
      wave: 'square',
      attackSec: 0.035,
      releaseSec: 0.12,
      detuneCents: randBetween(rng, -17, 17),
      harmonicCount: 15,
      envelope: (t, p) => Math.min(1, t / 0.035) * Math.min(1, (1 - p) / 0.30),
    });
  });
  addWaveVoice(out, SAMPLE_RATE, {
    startSec: 1.03,
    durationSec: 0.35,
    startHz: 144,
    endHz: 172,
    amplitude: 0.19,
    phase: randBetween(rng, 0, TAU),
    wave: 'triangle',
    attackSec: 0.018,
    releaseSec: 0.16,
    detuneCents: 11,
    vibratoHz: 5.5,
    vibratoCents: 28,
    harmonicCount: 8,
  });
  const filtered = biquad(out, 'lowpass', 1250, 0.88);
  return finalizeSfx(roomReverb(filtered, SAMPLE_RATE, 0.12), -8, 0.12);
}

function makeAmbience() {
  const rng = rngFor('ambience');
  const rawSeconds = 32;
  const raw = zeros(rawSeconds);
  const brown = onePoleLowpass(brownNoise(raw.length, rng), 120);
  const brownRms = rmsOf(brown) || 1;
  for (let i = 0; i < raw.length; i++) {
    const t = i / SAMPLE_RATE;
    const slowWobble = 0.82 + 0.18 * Math.sin(TAU * 0.047 * t + 0.4) + 0.06 * Math.sin(TAU * 0.019 * t);
    const humLevel = 0.24 + 0.04 * Math.sin(TAU * 0.031 * t + 1.3);
    const hum = Math.sin(TAU * 50.15 * t) + 0.28 * Math.sin(TAU * 100.3 * t + 0.12) + 0.11 * Math.sin(TAU * 150.45 * t + 0.5);
    raw[i] = (brown[i] / brownRms) * 0.035 * slowWobble + hum * humLevel * 0.020;
  }

  // Sparse close-but-soft vinyl crackles.
  let crackAt = 0.2;
  while (crackAt < rawSeconds) {
    crackAt += randBetween(rng, 0.13, 1.25);
    const length = Math.round(randBetween(rng, 0.0007, 0.0035) * SAMPLE_RATE);
    const start = Math.round(crackAt * SAMPLE_RATE);
    for (let i = 0; i < length && start + i < raw.length; i++) {
      const t = i / Math.max(1, length);
      raw[start + i] += (rng() * 2 - 1) * Math.sin(Math.PI * t) * randBetween(rng, 0.002, 0.009);
    }
  }

  // Distant, filtered two-wheel clatter on a loose 0.9 second rhythm.
  const clatter = zeros(rawSeconds);
  for (let at = 0.16; at < rawSeconds; at += 0.9) {
    for (const [offset, level] of [[0, 0.10], [0.072, 0.075]]) {
      addNoiseBurst(clatter, {
        startSec: at + offset,
        durationSec: 0.027,
        centerHz: 260,
        q: 0.55,
        filterType: 'lowpass',
        amplitude: level,
        attackSec: 0.0003,
        decaySec: 0.017,
        rng,
      });
      addDampedMode(clatter, SAMPLE_RATE, at + offset, 92 * randomJitter(rng, 0.02), 0.036, level * 0.45, randBetween(rng, 0, TAU));
    }
  }
  const distant = roomReverb(biquad(clatter, 'lowpass', 350, 0.6), SAMPLE_RATE, 0.62);
  for (let i = 0; i < raw.length; i++) raw[i] += distant[i] * 0.11;

  // Circular 2-second equal-power crossfade. Start at the old tail, crossfade
  // into the old head, then continue from t=2s to t=30s (exactly 30 seconds).
  const crossfadeSamples = 2 * SAMPLE_RATE;
  const loop = zeros(30);
  for (let i = 0; i < crossfadeSamples; i++) {
    const p = i / Math.max(1, crossfadeSamples - 1);
    const tailGain = Math.cos(p * Math.PI * 0.5);
    const headGain = Math.sin(p * Math.PI * 0.5);
    loop[i] = raw[30 * SAMPLE_RATE + i] * tailGain + raw[i] * headGain;
  }
  const restStart = 2 * SAMPLE_RATE;
  for (let i = restStart; i < loop.length; i++) loop[i] = raw[i];
  // Make the final periodic sample exactly meet the loop's first sample.
  loop[loop.length - 1] = loop[0];

  let normalized = removeDc(loop);
  const targetRms = Math.pow(10, -26 / 20);
  const rms = rmsOf(normalized);
  const rmsScale = rms > 0 ? targetRms / rms : 1;
  for (let i = 0; i < normalized.length; i++) normalized[i] *= rmsScale;
  const peakLimit = Math.pow(10, -3.5 / 20);
  const peak = peakOf(normalized);
  if (peak > peakLimit) {
    const scale = peakLimit / peak;
    for (let i = 0; i < normalized.length; i++) normalized[i] *= scale;
  }
  return normalized;
}

const recipes = [];
recipes.push(['press', () => synthPress('press')]);
for (let i = 1; i <= 3; i++) recipes.push([`hover_${i}`, () => synthHover(`hover_${i}`, i)]);
for (let i = 1; i <= 2; i++) recipes.push([`switch_${i}`, () => synthSwitch(`switch_${i}`, i)]);
for (const [i, duration] of [[1, 0.48], [2, 0.54], [3, 0.51]]) {
  recipes.push([`paper_${i}`, () => synthPaper(`paper_${i}`, duration)]);
}
for (let i = 1; i <= 2; i++) recipes.push([`lever_clack_${i}`, () => synthLeverClack(`lever_clack_${i}`)]);
recipes.push(['bell', () => synthBell('bell')]);
recipes.push(['air_brake', () => synthAirBrake('air_brake')]);
recipes.push(['brake_squeal', () => synthBrakeSqueal('brake_squeal')]);
recipes.push(['drone', () => synthDrone('drone')]);
for (let i = 1; i <= 3; i++) recipes.push([`clack_${i}`, () => synthClack(`clack_${i}`, i)]);
for (let i = 1; i <= 2; i++) recipes.push([`impact_muffled_${i}`, () => synthImpact(`impact_muffled_${i}`)]);
recipes.push(['crash_comic', () => synthComicCrash('crash_comic')]);
for (let i = 1; i <= 2; i++) recipes.push([`stamp_${i}`, () => synthStamp(`stamp_${i}`)]);
recipes.push(['sting_relief', () => synthStingRelief('sting_relief')]);
recipes.push(['sting_dread', () => synthStingDread('sting_dread')]);
recipes.push(['sting_absurd', () => synthStingAbsurd('sting_absurd')]);

const generatedManifestPath = path.join(RAW_DIR, '.generated-audio.json');
let generatedHashes = {};
if (fs.existsSync(generatedManifestPath)) {
  try {
    generatedHashes = JSON.parse(fs.readFileSync(generatedManifestPath, 'utf8'));
  } catch {
    generatedHashes = {};
  }
}
const sha256File = (filePath) => createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');

let generated = 0;
let kept = 0;
for (const [name, render] of recipes) {
  const output = path.join(RAW_DIR, `${name}.wav`);
  const exists = fs.existsSync(output);
  const isUnmodifiedProceduralRender = exists && generatedHashes[name] === sha256File(output);
  if (exists && !FORCE && !isUnmodifiedProceduralRender) {
    kept++;
    continue;
  }
  const rendered = render();
  writePcm16Wav(output, rendered, SAMPLE_RATE);
  generatedHashes[name] = sha256File(output);
  generated++;
  console.log(`${name.padEnd(18)} ${rendered.length.toString().padStart(7)} samples  ${peakOf(rendered).toFixed(3)} peak  ${rmsOf(rendered).toFixed(4)} RMS`);
}

const ambiencePath = path.join(RAW_DIR, 'ambience.wav');
const ambienceExists = fs.existsSync(ambiencePath);
const ambienceIsUnmodified = ambienceExists && generatedHashes.ambience === sha256File(ambiencePath);
if (ambienceExists && !FORCE && !ambienceIsUnmodified) {
  kept++;
} else {
  const ambience = makeAmbience();
  writePcm16Wav(ambiencePath, ambience, SAMPLE_RATE);
  generatedHashes.ambience = sha256File(ambiencePath);
  generated++;
  console.log(`ambience           ${ambience.length.toString().padStart(7)} samples  ${peakOf(ambience).toFixed(3)} peak  ${rmsOf(ambience).toFixed(4)} RMS`);
}

fs.writeFileSync(generatedManifestPath, `${JSON.stringify(generatedHashes, null, 2)}\n`);
console.log(`\nRendered/refreshed ${generated} WAV file(s) at ${SAMPLE_RATE} Hz mono PCM16; preserved ${kept} custom raw file(s).${FORCE ? ' (--force)' : ''}`);
