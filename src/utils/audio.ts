import type { Dilemma } from '../types.ts';

// Timing landmarks are deliberately centralized for tuning against the canvas animation.
export const SILENCE_BEAT_SEC = 0.08;
export const STAMP_AFTER_IMPACT_SEC = 0.30;
export const STING_AFTER_IMPACT_SEC = 0.70;

const SAMPLE_RATE = 44100;
const STORAGE_SOUND = 'tramvay_sound_enabled';
const STORAGE_VOLUME = 'tramvay_volume';
const SPRITE_URL = '/audio/sfx.wav';
const META_URL = '/audio/sfx.json';
const AMBIENCE_URL = '/audio/ambience.wav';
const SPRITE_RATE = 32000;
const spriteNames = [
  'press','hover_1','hover_2','hover_3','switch_1','switch_2','paper_1','paper_2','paper_3',
  'lever_clack_1','lever_clack_2','bell','air_brake','brake_squeal','drone','clack_1','clack_2',
  'clack_3','impact_muffled_1','impact_muffled_2','crash_comic','stamp_1','stamp_2',
  'sting_relief','sting_dread','sting_absurd',
] as const;
type SoundName = (typeof spriteNames)[number];
type Mood = NonNullable<Dilemma['mood']>;
type SpriteMap = Record<string, [number, number]>;

let context: AudioContext | null = null;
let sfxBuffer: AudioBuffer | null = null;
let ambienceBuffer: AudioBuffer | null = null;
let fetches: Record<string, Promise<ArrayBuffer | null>> = {};
let spriteMap: SpriteMap | null = null;
let sfxBus: GainNode | null = null;
let ambienceBus: GainNode | null = null;
let ambienceDuck: GainNode | null = null;
let master: GainNode | null = null;
let limiter: DynamicsCompressorNode | null = null;
let ambienceSource: AudioBufferSourceNode | null = null;
let ambienceStarted = false;
let soundEnabled = true;
let volume = 0.7;
const warned = new Set<string>();
const previousVariant = new Map<string, string>();
const activeSources = new Set<AudioScheduledSourceNode>();
const timers = new Set<ReturnType<typeof setTimeout>>();
let rumbleSource: AudioBufferSourceNode | null = null;
let rumbleGain: GainNode | null = null;
let rumbleFilter: BiquadFilterNode | null = null;
let clackTimer: ReturnType<typeof setTimeout> | null = null;
let rumbleStopped = true;

function warnOnce(item: string, error?: unknown) {
  if (warned.has(item)) return;
  warned.add(item);
  console.warn(`[audio] ${item} is unavailable; continuing silently.`, error ?? '');
}
function fetchAsset(url: string, item: string): Promise<ArrayBuffer | null> {
  if (!fetches[url]) fetches[url] = fetch(url).then(async (response) => {
    if (!response.ok) { warnOnce(item, `HTTP ${response.status}`); return null; }
    const bytes = await response.arrayBuffer();
    if (url.endsWith('.wav') && (bytes.byteLength < 44 || new DataView(bytes).getUint32(0, false) !== 0x52494646)) {
      warnOnce(item, 'The server returned a non-WAV response (possibly an SPA HTML fallback).'); return null;
    }
    return bytes;
  }).catch((error: unknown) => { warnOnce(item, error); return null; });
  return fetches[url];
}

/** Fetches assets eagerly without constructing or resuming an AudioContext. */
export function preloadAudio(): void {
  void fetchAsset(META_URL, 'sfx.json');
  void fetchAsset(SPRITE_URL, 'sfx.wav');
  void fetchAsset(AMBIENCE_URL, 'ambience.wav');
  try {
    const savedEnabled = localStorage.getItem(STORAGE_SOUND);
    if (savedEnabled !== null) soundEnabled = savedEnabled === 'true';
    const savedVolume = Number(localStorage.getItem(STORAGE_VOLUME));
    if (Number.isFinite(savedVolume) && localStorage.getItem(STORAGE_VOLUME) !== null) volume = Math.max(0, Math.min(1, savedVolume));
  } catch { /* privacy mode / storage disabled */ }
}

function setGain(node: GainNode | null, value: number, seconds = 0.04) {
  if (!node || !context) return;
  const now = context.currentTime;
  node.gain.cancelScheduledValues(now);
  node.gain.setValueAtTime(node.gain.value, now);
  node.gain.setTargetAtTime(value, now, Math.max(0.002, seconds / 4));
}
function createGraph() {
  if (!context) return;
  sfxBus = context.createGain(); ambienceBus = context.createGain(); ambienceDuck = context.createGain();
  master = context.createGain(); limiter = context.createDynamicsCompressor();
  sfxBus.gain.value = 0.82; ambienceBus.gain.value = 0.34; ambienceDuck.gain.value = 1;
  limiter.threshold.value = -3; limiter.knee.value = 2; limiter.ratio.value = 16; limiter.attack.value = 0.003; limiter.release.value = 0.18;
  sfxBus.connect(master); ambienceBus.connect(ambienceDuck); ambienceDuck.connect(master);
  master.connect(limiter); limiter.connect(context.destination); applyMaster();
}
function applyMaster() { setGain(master, soundEnabled ? volume : 0, 0.06); }

function decode(bytes: ArrayBuffer, item: string): Promise<AudioBuffer | null> {
  if (!context) return Promise.resolve(null);
  return context.decodeAudioData(bytes.slice(0)).catch((error: unknown) => { warnOnce(item, error); return null; });
}
function validateSprite(jsonBytes: ArrayBuffer | null): SpriteMap | null {
  if (!jsonBytes) return null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(jsonBytes)) as { sprite?: unknown };
    if (!parsed.sprite || typeof parsed.sprite !== 'object') throw new Error('Invalid sprite metadata');
    return parsed.sprite as SpriteMap;
  } catch (error) { warnOnce('sfx.json', error); return null; }
}
function supportedSpriteUrl(): string {
  // This build ships WAV only. Prefer a playable available format if codecs are added later;
  // WAV remains the last-resort and current bundled format.
  const audio = typeof document !== 'undefined' ? document.createElement('audio') : null;
  const available = [{ url: '/audio/sfx.ogg', mime: 'audio/ogg; codecs="vorbis"', shipped: false }, { url: '/audio/sfx.m4a', mime: 'audio/mp4', shipped: false }, { url: SPRITE_URL, mime: 'audio/wav', shipped: true }];
  return available.find((format) => format.shipped && (!audio || audio.canPlayType(format.mime) !== ''))?.url ?? SPRITE_URL;
}

/** Called synchronously in the title-screen gesture: AudioContext creation is gesture-gated. */
export function unlockAudio(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  try {
    if (!context) {
      const Ctor = window.AudioContext;
      if (!Ctor) { warnOnce('Web Audio', 'AudioContext is not supported'); return Promise.resolve(); }
      context = new Ctor(); createGraph();
    }
    if (context.state === 'suspended') void context.resume().catch((error: unknown) => warnOnce('AudioContext resume', error));
  } catch (error) { warnOnce('Web Audio', error); return Promise.resolve(); }
  return loadDecodedAssets();
}
async function loadDecodedAssets(): Promise<void> {
  if (!context) return;
  const [metaBytes, spriteBytes, ambienceBytes] = await Promise.all([
    fetchAsset(META_URL, 'sfx.json'), fetchAsset(supportedSpriteUrl(), 'sfx.wav'), fetchAsset(AMBIENCE_URL, 'ambience.wav'),
  ]);
  spriteMap ??= validateSprite(metaBytes);
  if (!sfxBuffer && spriteBytes) sfxBuffer = await decode(spriteBytes, 'sfx.wav');
  if (!ambienceBuffer && ambienceBytes) ambienceBuffer = await decode(ambienceBytes, 'ambience.wav');
  // A failed sprite is reported once at the asset level; individual play calls remain silent.
  startAmbience();
}
function startAmbience() {
  if (!context || !ambienceBuffer || !ambienceBus || ambienceStarted) return;
  try {
    const source = context.createBufferSource(); source.buffer = ambienceBuffer; source.loop = true; source.connect(ambienceBus);
    source.start(); ambienceSource = source; ambienceStarted = true; ambienceBus.gain.setValueAtTime(0, context.currentTime); ambienceBus.gain.linearRampToValueAtTime(0.34, context.currentTime + 3);
    track(source);
  } catch (error) { warnOnce('ambience playback', error); }
}
function track<T extends AudioScheduledSourceNode>(source: T): T {
  activeSources.add(source); source.addEventListener('ended', () => activeSources.delete(source), { once: true }); return source;
}
function choose(name: string): string {
  const variants = spriteNames.filter((item) => item === name || item.startsWith(`${name}_`));
  if (variants.length === 0) return name;
  if (variants.length === 1) return variants[0];
  const previous = previousVariant.get(name); const options = variants.filter((item) => item !== previous);
  const picked = options[Math.floor(Math.random() * options.length)] ?? variants[0]; previousVariant.set(name, picked); return picked;
}
function play(name: string, options: { when?: number; gain?: number; rate?: number } = {}): void {
  if (!context || !sfxBuffer || !spriteMap || !sfxBus || !soundEnabled) return;
  try {
    const chosen = choose(name); const bounds = spriteMap[chosen];
    if (!bounds) { warnOnce(chosen, 'Sprite slice missing'); return; }
    const [startMs, durationMs] = bounds;
    const source = context.createBufferSource(); const gainNode = context.createGain(); source.buffer = sfxBuffer;
    const tonal = chosen === 'bell' || chosen === 'drone' || chosen.startsWith('sting_');
    const rate = options.rate ?? (tonal ? 1 : 0.96 + Math.random() * 0.08);
    source.playbackRate.value = rate;
    source.connect(gainNode); gainNode.connect(sfxBus);
    const when = Math.max(context.currentTime, options.when ?? context.currentTime); const duration = durationMs / 1000;
    const level = Math.max(0, options.gain ?? 1); gainNode.gain.setValueAtTime(level, when);
    const fadeAt = when + Math.max(0.005, (duration - 0.012) / rate);
    gainNode.gain.setValueAtTime(level, fadeAt); gainNode.gain.linearRampToValueAtTime(0, fadeAt + 0.012 / rate);
    track(source); source.start(when, startMs / 1000, duration); source.stop(fadeAt + 0.013 / rate);
  } catch (error) { warnOnce(name, error); }
}
function later(fn: () => void, ms: number) { const timer = setTimeout(() => { timers.delete(timer); fn(); }, ms); timers.add(timer); return timer; }
function setDuck(value: number, seconds: number) { if (ambienceDuck && context) { ambienceDuck.gain.cancelScheduledValues(context.currentTime); ambienceDuck.gain.setValueAtTime(ambienceDuck.gain.value, context.currentTime); ambienceDuck.gain.linearRampToValueAtTime(value, context.currentTime + seconds); } }

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled; applyMaster();
  try { localStorage.setItem(STORAGE_SOUND, enabled ? 'true' : 'false'); } catch { /* ignore */ }
}
export function getSoundEnabled(): boolean {
  try { const saved = localStorage.getItem(STORAGE_SOUND); if (saved !== null) soundEnabled = saved === 'true'; } catch { /* ignore */ }
  return soundEnabled;
}
export function setVolume(value: number): void {
  volume = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0.7)); applyMaster();
  try { localStorage.setItem(STORAGE_VOLUME, String(volume)); } catch { /* ignore */ }
}
export function getVolume(): number { return volume; }
export function playPress(): void { play('press', { gain: 0.72 }); }
export function playSwitch(): void { play('switch', { gain: 0.58 }); }
export function playPaper(): void { play('paper', { gain: 0.52 }); }
export function playHoverTick(): void {
  if (typeof window !== 'undefined' && !window.matchMedia('(hover: hover)').matches) return;
  play('hover', { gain: 0.17 });
}

function brownNoiseBuffer(): AudioBuffer | null {
  if (!context) return null;
  const buffer = context.createBuffer(1, SAMPLE_RATE * 2, SAMPLE_RATE), data = buffer.getChannelData(0); let brown = 0;
  for (let i = 0; i < data.length; i++) { brown = (brown + (Math.random() * 2 - 1) * 0.025) / 1.025; data[i] = brown * 5; }
  return buffer;
}
function startRumble(approachSec: number) {
  if (!context || !sfxBus) return;
  stopRumble(); rumbleStopped = false;
  const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
  source.buffer = brownNoiseBuffer(); source.loop = true; filter.type = 'lowpass'; filter.frequency.setValueAtTime(80, context.currentTime); filter.frequency.linearRampToValueAtTime(380, context.currentTime + Math.max(0.42, approachSec));
  gain.gain.setValueAtTime(0.001, context.currentTime); gain.gain.linearRampToValueAtTime(0.19, context.currentTime + Math.max(0.42, approachSec));
  source.connect(filter); filter.connect(gain); gain.connect(sfxBus); source.start();
  rumbleSource=track(source);rumbleGain=gain;rumbleFilter=filter;
  let interval=550,gainLevel=.17,elapsed=0;
  const tick=()=>{if(rumbleStopped||!context)return;play('clack',{gain:gainLevel});interval=Math.max(160,interval*.86);gainLevel=Math.min(.48,gainLevel*1.13);elapsed+=interval;if(elapsed<Math.max(420,approachSec*1000)){clackTimer=later(tick,interval);}};
  clackTimer=later(tick,interval);
  later(()=>stopRumble(),Math.max(400,approachSec*1000+300));
}
function stopRumble() {
  rumbleStopped=true;if(clackTimer){clearTimeout(clackTimer);timers.delete(clackTimer);clackTimer=null;}
  if(context&&rumbleGain){const now=context.currentTime;rumbleGain.gain.cancelScheduledValues(now);rumbleGain.gain.setValueAtTime(rumbleGain.gain.value,now);rumbleGain.gain.linearRampToValueAtTime(0,now+.035);try{rumbleSource?.stop(now+.04);}catch{/* already stopped */}}
  rumbleSource=null;rumbleGain=null;rumbleFilter=null;
}
export function playDecision(pulled: boolean, approachSec: number): void {
  if(!context||!soundEnabled)return;setDuck(.35,.12);
  if(pulled){play('lever_clack',{gain:.9});play('bell',{when:context.currentTime+.28,gain:.62});}
  else{play('air_brake',{gain:.55});play('brake_squeal',{when:context.currentTime+.15,gain:.32});play('drone',{when:context.currentTime+.16,gain:.23});}
  startRumble(Math.max(.2,approachSec));
}
export function playImpact({mood,comic=false}:{mood:Mood;comic?:boolean}):number {
  if(!context||!soundEnabled)return Math.round((SILENCE_BEAT_SEC+STAMP_AFTER_IMPACT_SEC)*1000);
  stopRumble();setDuck(.015,.07);
  const impactAt=context.currentTime+SILENCE_BEAT_SEC;
  play(comic?'crash_comic':'impact_muffled',{when:impactAt,gain:comic?.74:.85});
  play('stamp',{when:impactAt+STAMP_AFTER_IMPACT_SEC,gain:.94});
  play(`sting_${mood}`,{when:impactAt+STING_AFTER_IMPACT_SEC,gain:.53});
  const restoreAt=(SILENCE_BEAT_SEC+STING_AFTER_IMPACT_SEC+0.08)*1000;
  later(()=>setDuck(1,1.8),restoreAt);
  return Math.round((SILENCE_BEAT_SEC+STAMP_AFTER_IMPACT_SEC)*1000);
}
export function stopAllCues():void {
  for(const timer of timers)clearTimeout(timer);timers.clear();clackTimer=null;stopRumble();
  for(const source of activeSources){if(source===ambienceSource)continue;try{source.stop();}catch{/* already ended */}activeSources.delete(source);}
  if(ambienceDuck&&context){ambienceDuck.gain.cancelScheduledValues(context.currentTime);ambienceDuck.gain.setTargetAtTime(1,context.currentTime,.18);}
}

if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{
  if(!context)return;
  if(document.visibilityState==='hidden'){if(context.state==='running')void context.suspend().catch((error:unknown)=>warnOnce('AudioContext suspend',error));}
  else if(context.state==='suspended'&&soundEnabled)void context.resume().catch((error:unknown)=>warnOnce('AudioContext resume',error));
});

// Legacy exports retained for components and for painless future migrations.
export const startMusicBed=()=>{if(context)startAmbience();};
export const stopMusicBed=()=>{if(ambienceSource){try{ambienceSource.stop();}catch{/* already stopped */}ambienceSource=null;ambienceStarted=false;}};
export const duckMusicBed=(duck:boolean)=>setDuck(duck?.35:1,.15);
export const playLeverSnap=playSwitch;
export const playTinyClick=playPress;
export const playDecisionWhoosh=()=>play('air_brake',{gain:.25});
export const playRevealChime=(_intensity=1)=>{};
export const playPaperSwish=playPaper;
export const playFoilSweep=()=>{};
export const playPremiumTransition=playPaper;
export const playPencilScratch=playPaper;
export const playSoftTick=(step=0)=>play(step===0?'switch':'press',{gain:.3});
export const playSonicSignatureMotif=()=>play('bell',{gain:.24});
export const playRisingSweep=()=>play('brake_squeal',{gain:.22});
export const playLowThump=()=>play('impact_muffled',{gain:.42});
export const playChordSwell=()=>play('sting_relief',{gain:.35});
export const playSummaryReveal=()=>{
  if(!context||!soundEnabled)return;play('stamp',{gain:.72});play('sting_relief',{when:context.currentTime+.4,gain:.48});
};
