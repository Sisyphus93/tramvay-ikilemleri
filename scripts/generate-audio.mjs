import fs from 'node:fs';
import path from 'node:path';

const SR = 44100;
const OUT = 'audio-src/raw';
const PUB = 'public/audio';
let seed = 0x51a7e;
const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const signed = () => rand() * 2 - 1;
const clamp = (x, a = -1, b = 1) => Math.max(a, Math.min(b, x));
const buf = (seconds) => new Float32Array(Math.ceil(seconds * SR));
const add = (dst, src, at = 0, gain = 1) => { const off = Math.max(0, Math.round(at * SR)); for (let i = 0; i < src.length && i + off < dst.length; i++) dst[i + off] += src[i] * gain; return dst; };
const onePole = (input, cutoff, high = false) => {
  const out = new Float32Array(input.length), a = Math.exp(-2 * Math.PI * Math.max(10, cutoff) / SR); let y = 0;
  for (let i = 0; i < input.length; i++) { y = (1 - a) * input[i] + a * y; out[i] = high ? input[i] - y : y; } return out;
};
const biquad = (input, freq, q = 0.8) => {
  const w = 2 * Math.PI * freq / SR, alpha = Math.sin(w) / (2 * q), c = Math.cos(w), a0 = 1 + alpha;
  const b0 = alpha / a0, b1 = 0, b2 = -alpha / a0, a1 = -2 * c / a0, a2 = (1 - alpha) / a0;
  const out = new Float32Array(input.length); let x1=0,x2=0,y1=0,y2=0;
  for(let i=0;i<input.length;i++){const x=input[i],y=b0*x+b1*x1+b2*x2-a1*y1-a2*y2;out[i]=y;x2=x1;x1=x;y2=y1;y1=y;}return out;
};
const env = (t, attack, decay, sustain = 0, release = 0, duration = 1) => {
  if (t < 0 || t >= duration) return 0;
  if (t < attack) return t / Math.max(attack, 1e-5);
  if (t < attack + decay) return 1 - (1 - sustain) * (t - attack) / Math.max(decay, 1e-5);
  return sustain * Math.exp(-Math.max(0, t - attack - decay) / Math.max(release, 1e-5));
};
const noise = (n, brown = false) => { const a = new Float32Array(n); let b=0; for(let i=0;i<n;i++){const w=signed(); b=(b+0.025*w)/1.025; a[i]=brown?b*5:w;} return a; };
const tone = (duration, hz, amp = 1, decay = 0.1, phase = 0, harmonic = 'sine') => {
  const a=buf(duration); let ph=phase;
  for(let i=0;i<a.length;i++){const t=i/SR; ph+=2*Math.PI*hz/SR; const wave=harmonic==='saw'?2*((ph/(2*Math.PI))%1)-1:harmonic==='square'?(Math.sin(ph)>=0?1:-1):Math.sin(ph); a[i]=wave*amp*Math.exp(-t/decay);}return a;
};
const sweep = (duration, f0, f1, amp, decay, wave='sine') => {const a=buf(duration);let ph=0;for(let i=0;i<a.length;i++){const t=i/SR,u=t/duration,f=f0*Math.pow(f1/f0,u);ph+=2*Math.PI*f/SR; a[i]=(wave==='saw'?2*((ph/(2*Math.PI))%1)-1:Math.sin(ph))*amp*Math.exp(-t/decay);}return a;};
const soft = (a, gain=1) => {let peak=0;for(const x of a)peak=Math.max(peak,Math.abs(x));const scale=peak?gain/peak:1;for(let i=0;i<a.length;i++)a[i]=Math.tanh(a[i]*scale*1.15)/Math.tanh(1.15)*gain;return a;};
const fade = (a, tail=.01) => {const n=Math.min(a.length,Math.round(tail*SR));for(let i=0;i<n;i++)a[a.length-n+i]*=(n-i)/n;return a;};
const reverb = (a, wet=.12) => {const out=new Float32Array(a);for(const delay of [0.021,0.031,0.043]){const d=Math.round(delay*SR);for(let i=d;i<out.length;i++)out[i]+=out[i-d]*.22*wet;}return out;};
const click = (dur, cutoff=1500, level=.5) => {const a=noise(Math.ceil(dur*SR));const f=onePole(a,cutoff,true);for(let i=0;i<f.length;i++)f[i]*=Math.exp(-i/SR/(dur*.28))*level;return f;};
const resonance = (dur, hz, amp, decay, phase=rand()*6.28) => tone(dur,hz*(.95+rand()*.1),amp*(.9+rand()*.2),decay,phase);
const writeWav = (file, data, rate=SR) => {
  const b=Buffer.alloc(44+data.length*2);b.write('RIFF',0);b.writeUInt32LE(36+data.length*2,4);b.write('WAVE',8);b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(data.length*2,40);
  for(let i=0;i<data.length;i++)b.writeInt16LE(Math.round(clamp(data[i],-.99997,.99997)*32767),44+i*2);fs.writeFileSync(file,b);
};
const readRawWav = (file) => {const b=fs.readFileSync(file);if(b.toString('ascii',0,4)!=='RIFF'||b.readUInt16LE(22)!==1||b.readUInt16LE(34)!==16)throw new Error(`${file} must be mono 16-bit PCM WAV`);const rate=b.readUInt32LE(24),off=b.indexOf('data')+8,n=(b.length-off)/2,a=new Float32Array(n);for(let i=0;i<n;i++)a[i]=b.readInt16LE(off+i*2)/32768;if(rate!==SR)throw new Error(`${file} must be ${SR} Hz (found ${rate})`);return a;};
const variant = (name, fn, peak=.5) => {const file=path.join(OUT,`${name}.wav`);if(fs.existsSync(file)&&!process.argv.includes('--regenerate'))return readRawWav(file);const a=soft(fade(fn(),.008),peak);writeWav(file,a);return a;};
const makePress=()=>{let a=buf(.15);add(a,click(.005,1400,.4));add(a,resonance(.12,120,.25,.06));add(a,reverb(click(.015,900,.06),.2),.01);return a;};
const makeHover=(v)=>{let a=buf(.05);add(a,click(.003,3800,.17),.001+v*.0004);add(a,resonance(.04,2200+v*340,.06,.018),.002);return a;};
const makeSwitch=(v)=>{let a=buf(.12);for(const [idx,[t,h]] of [[.003,900],[.032+v*.005,2400]].entries()){add(a,click(.008,3000,idx===0?.52:.28),t);add(a,resonance(.075,h,idx===0?.22:.16,.035),t);}return a;};
const makePaper=(v)=>{const a=buf(.5+v*.035);for(let k=0;k<65;k++){const t=rand()*(a.length/SR-.035),d=.008+rand()*.035;let g=click(d,3400+rand()*2200,.15+rand()*.12);g=onePole(g,5200+rand()*1800,false);add(a,g,t);}// Low-mid cardstock body is mixed below.
 const body=onePole(noise(a.length),650);for(let i=0;i<a.length;i++)a[i]+=body[i]*.075;return a;};
const makeLever=()=>{const a=buf(.5);const hit=click(.012,5000,.7);add(a,hit,.002);for(const [f,g,d] of [[400,.36,.12],[1100,.28,.10],[2700,.18,.07]])add(a,resonance(.2,f,g,d),.004);const t=.1+rand()*.03;add(a,onePole(noise(Math.round(.08*SR)),450),t,.3);add(a,sweep(.28,95,50,.5,.2),t);return reverb(a,.45);};
const makeBell=()=>{const a=buf(1.2);for(const [t,g] of [[.002,.65],[.182,.46]]){add(a,click(.002,6000,.2),t);for(const [r,amp,d] of [[1,.34,.9],[2,.2,.48],[2.76,.2,.32],[5.4,.13,.2],[8.9,.08,.12]])add(a,resonance(1.02,880*r,amp*g,d),t);}return reverb(a,.18);};
const makeBrake=()=>{const a=buf(.8),n=noise(a.length);let f=onePole(n,2100,true);for(let i=0;i<a.length;i++){let t=i/SR;f[i]*=(.75+.25*Math.sin(t*3))*env(t,.018,.1,.72,.4,.8);}return f;};
const makeSqueal=()=>{const a=buf(.6),n=onePole(noise(a.length),800,true);for(let i=0;i<a.length;i++){const t=i/SR,u=t/.6;const drift=Math.sin(t*9)*90+Math.sin(t*2.1)*60;const f1=2600-600*u+drift,f2=1900-220*u+drift*.7;a[i]=.15*n[i]+(.12*Math.sin(2*Math.PI*f1*t)+.075*Math.sin(2*Math.PI*f2*t))*env(t,.05,.2,.6,.35,.6);}return a;};
const makeDrone=(dur=2)=>{const a=buf(dur);for(let i=0;i<a.length;i++){const t=i/SR,cut=240+90*Math.sin(t*1.7);let s=0;for(const f of [55,55.8,82,110]){const ph=(f*t)%1;s+=(2*ph-1)*.25;}a[i]=onePoleSample(s,cut)*env(t,.3,.6,.75,.8,dur);}return a;};
function onePoleSample(x,cut){const k=Math.min(1,cut/(SR*.5));return x*k;}
const makeClack=(v)=>{const a=buf(.12);add(a,click(.009,1600+v*250,.55));add(a,resonance(.08,1200+v*320,.3,.04),.003);return a;};
const makeImpact=(v)=>{const a=buf(.6),n=onePole(noise(a.length),500);for(let i=0;i<a.length;i++){const t=i/SR;n[i]*=env(t,.003,.08,.35,.24,.6);}add(a,n,0,.55);add(a,sweep(.48,v?118:90,v?52:35,.52,.19),.005+v*.008);for(const f of (v?[132,287,420]:[155,233,355]))add(a,resonance(.23,f,.13,.12),.012+v*.004);if(v)add(a,click(.018,800,.18),.075);return reverb(a,.42);};
const makeCrash=()=>{let a=makeImpact(0);for(let i=0;i<a.length;i++)a[i]*=.7;for(const f of [520,760,1030,1480,2190])add(a,resonance(1.0,f,.18,.18),.01+rand()*.02);const screech=buf(.6);let ph=0;for(let i=0;i<screech.length;i++){const t=i/SR,f=1500+2000*t/.6+100*Math.sin(t*60);ph+=2*Math.PI*f/SR;screech[i]=Math.sin(ph)*env(t,.06,.24,.4,.2,.6)*.08;}add(a,screech,.05);const wob=onePole(noise(Math.round(.15*SR)),500,true);for(let i=0;i<wob.length;i++)wob[i]*=Math.sin(i/SR*2*Math.PI*29)*.15;add(a,wob,.68);return reverb(a,.35);};
const makeStamp=(v)=>{const a=buf(.4),rubber=onePole(noise(Math.ceil(.003*SR)),700);for(let i=0;i<rubber.length;i++)rubber[i]=rubber[i]*.24*Math.exp(-i/(SR*.001))+1.4*Math.cos(2*Math.PI*95*i/SR)*Math.exp(-i/(SR*.001));add(a,rubber);add(a,sweep(.17,140,55,.42,.105),.002);add(a,resonance(.22,198+v*9,.33,.075),.005);add(a,onePole(noise(Math.round(.05*SR)),1200),.01,.09);return a;};
const makeSting=(kind)=>{const a=buf(1.5);if(kind==='relief'){for(const f of [174.6,220,261.6,329.6,392])for(const det of [-.004,.003])add(a,tone(1.4,f*(1+det),.1,.9,rand()*6.28,'saw'));}else if(kind==='dread'){for(const f of [55,58.27,82.4,116.5,164.8])add(a,tone(1.4,f,.14,.9,rand()*6.28,'saw'));}else{for(const [t,f,d] of [[.03,220,.24],[.36,185,.24],[.7,155,.42]]){add(a,sweep(d,f,f*.81,.25,.25,'saw'),t);add(a,tone(d,f*1.51,.08,.18,0,'square'),t);}}return onePole(a,kind==='dread'?280:1000);};

fs.mkdirSync(OUT,{recursive:true});fs.mkdirSync(PUB,{recursive:true});
const sounds={};
sounds.press=variant('press',makePress,.5);
for(let i=0;i<3;i++)sounds[`hover_${i+1}`]=variant(`hover_${i+1}`,()=>makeHover(i),.24);
for(let i=0;i<2;i++)sounds[`switch_${i+1}`]=variant(`switch_${i+1}`,()=>makeSwitch(i),.48);
for(let i=0;i<3;i++)sounds[`paper_${i+1}`]=variant(`paper_${i+1}`,()=>makePaper(i),.45);
for(let i=0;i<2;i++)sounds[`lever_clack_${i+1}`]=variant(`lever_clack_${i+1}`,makeLever,.65);
sounds.bell=variant('bell',makeBell,.55);sounds.air_brake=variant('air_brake',makeBrake,.48);sounds.brake_squeal=variant('brake_squeal',makeSqueal,.42);sounds.drone=variant('drone',makeDrone,.38);
for(let i=0;i<3;i++)sounds[`clack_${i+1}`]=variant(`clack_${i+1}`,()=>makeClack(i),.48);
for(let i=0;i<2;i++)sounds[`impact_muffled_${i+1}`]=variant(`impact_muffled_${i+1}`,()=>makeImpact(i),.68);
sounds.crash_comic=variant('crash_comic',makeCrash,.68);
for(let i=0;i<2;i++)sounds[`stamp_${i+1}`]=variant(`stamp_${i+1}`,()=>makeStamp(i),.68);
for(const mood of ['relief','dread','absurd'])sounds[`sting_${mood}`]=variant(`sting_${mood}`,()=>makeSting(mood),.43);

// The browser sprite is intentionally 32 kHz mono WAV to remain comfortably below 1.5 MB.
const ratio=32000/SR, slices={}, all=[];let cursor=0;
for(const [name,raw] of Object.entries(sounds)){const n=Math.round(raw.length*ratio),res=new Float32Array(n);for(let i=0;i<n;i++){const x=i/ratio,j=Math.floor(x),f=x-j;res[i]=(raw[j]||0)*(1-f)+(raw[j+1]||0)*f;}slices[name]=[Math.round(cursor/32),Math.round(n/32)];all.push(res);cursor+=n;all.push(new Float32Array(3200));cursor+=3200;}
const sprite=new Float32Array(cursor);let pos=0;for(const part of all){sprite.set(part,pos);pos+=part.length;}writeWav(path.join(PUB,'sfx.wav'),sprite,32000);fs.writeFileSync(path.join(PUB,'sfx.json'),JSON.stringify({sprite:slices},null,2)+'\n');

// 30-second deterministic low-level ambience with a two-second cyclic crossfade.
const N=30*SR, amb=new Float32Array(N), brown=noise(N,true);let humPhase=0;
for(let i=0;i<N;i++){const t=i/SR;humPhase+=2*Math.PI*50/SR;const wob=.72+.13*Math.sin(2*Math.PI*t/11)+.06*Math.sin(2*Math.PI*t/4.7);amb[i]=onePoleSample(brown[i],120)*.16*wob+(.018*Math.sin(humPhase)+.006*Math.sin(humPhase*2))*wob;}
for(let i=0;i<65;i++){const t=rand()*29.8,dur=.001+rand()*.004,at=Math.floor(t*SR),n=Math.ceil(dur*SR);for(let j=0;j<n&&at+j<N;j++)amb[at+j]+=signed()*.012*Math.exp(-j/(SR*.0015));}
for(let t=.3;t<30;t+=.9){for(const dt of [0,.075]){const at=Math.floor((t+dt)*SR);for(let j=0;j<Math.floor(.06*SR)&&at+j<N;j++)amb[at+j]+=(signed()*.022+Math.sin(j/SR*2*Math.PI*180)*.01)*Math.exp(-j/(SR*.018));}}
// Crossfade endpoint regions to produce matching periodic boundaries.
const xf=2*SR;for(let i=0;i<xf;i++){const u=i/xf, tail=amb[N-xf+i],head=amb[i];amb[N-xf+i]=tail*(1-u)+head*u;amb[i]=head*(1-u)+tail*u;}
// RMS-calibrated loudness target; low-frequency mono calibration approximates integrated LUFS.
let rms=0;for(const x of amb)rms+=x*x;rms=Math.sqrt(rms/N);const target=Math.pow(10,-26/20);const g=target/Math.max(rms,1e-8);for(let i=0;i<N;i++)amb[i]*=g;let pk=0;for(const x of amb)pk=Math.max(pk,Math.abs(x));if(pk>.7){const s=.7/pk;for(let i=0;i<N;i++)amb[i]*=s;}
const rawAmbience=path.join(OUT,'ambience.wav');if(fs.existsSync(rawAmbience)&&!process.argv.includes('--regenerate'))amb.set(readRawWav(rawAmbience));else writeWav(rawAmbience,amb);writeWav(path.join(PUB,'ambience.wav'),amb);
fs.writeFileSync(path.join(PUB,'README.md'),`# Procedural audio assets\n\n44.1 kHz, mono, 16-bit PCM raw samples in ../audio-src/raw; browser SFX sprite is 32 kHz mono WAV (under 1.5 MB), with offsets in sfx.json. Ambience is a 30-second seamless 44.1 kHz WAV loop, calibrated to approximately -26 dBFS RMS / LUFS-equivalent for mono.\n\nRebuild with \`npm run audio:build\`. To replace one sound with a recording, overwrite its mono 44.1 kHz, 16-bit WAV in \`audio-src/raw/\` (for example \`stamp_1.wav\`) and rerun \`npm run audio:build\`; existing raw WAVs are preserved and packaged. Pass \`--regenerate\` to the script to regenerate every procedural sound. No external audio or dependencies are used.\n\nSounds: ${Object.keys(sounds).join(', ')}.\n`);
fs.writeFileSync(path.join(PUB,'CREDITS.md'),'All sounds procedurally generated by `scripts/generate-audio.mjs`; no third-party material.\n');
console.log(`Generated ${Object.keys(sounds).length} SFX; sprite ${(fs.statSync(path.join(PUB,'sfx.wav')).size/1024/1024).toFixed(2)} MiB; ambience ${(fs.statSync(path.join(PUB,'ambience.wav')).size/1024/1024).toFixed(2)} MiB`);
