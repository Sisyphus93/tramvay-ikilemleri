import fs from 'node:fs';
import assert from 'node:assert/strict';

function readWav(file) {
  const b=fs.readFileSync(file); assert.equal(b.toString('ascii',0,4),'RIFF');
  const rate=b.readUInt32LE(24), channels=b.readUInt16LE(22), bits=b.readUInt16LE(34), off=b.indexOf('data')+8;
  assert.equal(channels,1);assert.equal(bits,16);const x=new Float32Array((b.length-off)/2);
  for(let i=0;i<x.length;i++)x[i]=b.readInt16LE(off+i*2)/32768;
  return {x,rate};
}
const {x,rate}=readWav('public/audio/sfx.wav'), meta=JSON.parse(fs.readFileSync('public/audio/sfx.json','utf8')).sprite;
const required=['press','hover_1','hover_2','hover_3','switch_1','switch_2','paper_1','paper_2','paper_3','lever_clack_1','lever_clack_2','bell','air_brake','brake_squeal','drone','clack_1','clack_2','clack_3','impact_muffled_1','impact_muffled_2','crash_comic','stamp_1','stamp_2','sting_relief','sting_dread','sting_absurd'];
const samples={};const rms=(a)=>Math.sqrt(a.reduce((s,v)=>s+v*v,0)/Math.max(1,a.length));
function spectral(a, sr){const step=4,n=Math.min(2048,Math.floor(a.length/step));let weighted=0,total=0;for(let k=1;k<n/2;k++){let re=0,im=0;for(let j=0;j<n;j++){const v=a[Math.min(a.length-1,j*step)]*(.5-.5*Math.cos(2*Math.PI*j/(n-1))),p=2*Math.PI*k*j/n;re+=v*Math.cos(p);im-=v*Math.sin(p);}const power=re*re+im*im,f=k*(sr/step)/n;weighted+=f*power;total+=power;}return total?weighted/total:0;}
function projection(a,sr,f){let re=0,im=0;for(let i=0;i<a.length;i++){const p=2*Math.PI*f*i/sr;re+=a[i]*Math.cos(p);im-=a[i]*Math.sin(p);}return 2*Math.hypot(re,im)/a.length;}
for(const name of required){assert.ok(meta[name],`missing ${name}`);const [ms,dur]=meta[name],start=Math.round(ms*rate/1000),n=Math.round(dur*rate/1000),end=start+n;assert.ok(start>=0&&n>0&&end<=x.length,`${name} bounds`);const a=x.slice(start,end);samples[name]=a;let peak=0,sum=0;for(const v of a){peak=Math.max(peak,Math.abs(v));sum+=v;}assert.ok(peak<Math.pow(10,-1/20),`${name}: peak >= -1 dBFS (${peak})`);assert.ok(rms(a)>.003,`${name}: silent`);assert.ok(Math.abs(sum/a.length)<.025,`${name}: DC offset`);}
function attack(name){const a=samples[name],p=Math.max(...a.map(Math.abs));let i=0;while(i<a.length&&Math.abs(a[i])<p*.98)i++;return i/rate*1000;}
const transient=required.filter(n=>/^(press|hover|switch|clack|lever_clack|stamp)/.test(n));const attacks=transient.map(n=>[n,attack(n)]);for(const [n,ms] of attacks)assert.ok(ms<=10,`${n}: attack ${ms.toFixed(2)}ms`);
const centroidNames=['stamp_1','stamp_2','impact_muffled_1','impact_muffled_2','air_brake','paper_1','paper_2','paper_3','drone','sting_dread'];const centroids=Object.fromEntries(centroidNames.map(n=>[n,spectral(samples[n],rate)]));
for(const n of ['stamp_1','stamp_2','impact_muffled_1','impact_muffled_2'])assert.ok(centroids[n]<800,`${n}: centroid ${centroids[n].toFixed(0)}Hz`);
for(const n of ['air_brake','paper_1','paper_2','paper_3'])assert.ok(centroids[n]>2000,`${n}: centroid ${centroids[n].toFixed(0)}Hz`);
for(const n of ['drone','sting_dread'])assert.ok(centroids[n]<500,`${n}: centroid ${centroids[n].toFixed(0)}Hz`);
function correlation(a,b){const n=Math.min(a.length,b.length);let aa=0,bb=0,ab=0,ma=0,mb=0;for(let i=0;i<n;i++){ma+=a[i];mb+=b[i];}ma/=n;mb/=n;for(let i=0;i<n;i++){const u=a[i]-ma,v=b[i]-mb;aa+=u*u;bb+=v*v;ab+=u*v;}return ab/Math.sqrt(aa*bb||1);}
const variants=[['hover_1','hover_2'],['hover_2','hover_3'],['switch_1','switch_2'],['paper_1','paper_2'],['paper_2','paper_3'],['lever_clack_1','lever_clack_2'],['clack_1','clack_2'],['clack_2','clack_3'],['impact_muffled_1','impact_muffled_2'],['stamp_1','stamp_2']].map(([a,b])=>[a,b,correlation(samples[a],samples[b])]);for(const [a,b,c] of variants)assert.ok(c<.9,`${a}/${b} correlation ${c.toFixed(3)}`);
const bell=samples.bell, after=bell.slice(Math.floor(.6*rate),Math.floor(1.1*rate));let fundamental=0;for(let f=830;f<=930;f+=2)fundamental=Math.max(fundamental,projection(after,rate,f));assert.ok(fundamental>Math.pow(10,-40/20),`bell fundamental at 600ms ${fundamental}`);
const ratios=[1,2,2.76,5.4,8.9], peaks=[];for(const ratio of ratios){let best=[0,0];for(let f=Math.round(880*ratio*.9);f<=880*ratio*1.1;f+=2){const v=projection(bell.slice(0,Math.floor(.45*rate)),rate,f);if(v>best[1])best=[f,v];}peaks.push(best);assert.ok(best[1]>.002,`bell partial ${ratio} absent`);}
const {x:amb,rate:ar}=readWav('public/audio/ambience.wav');const n50=Math.round(.05*ar),edge=Math.abs(amb[0]-amb[amb.length-1]);let stepSum=0;for(let i=1;i<n50;i++)stepSum+=Math.abs(amb[i]-amb[i-1]);const averageStep=stepSum/(n50-1);assert.ok(edge<=averageStep,`ambience endpoint discontinuity ${edge} > avg step ${averageStep}`);const loud=20*Math.log10(rms(amb));assert.ok(loud>=-28&&loud<=-24,`ambience RMS loudness ${loud.toFixed(2)} dBFS (target proxy -26)`);
console.log(`PASS ${required.length}/${required.length} SFX bounds, peak, RMS, DC`);
console.log(`PASS transient attack <=10ms: worst ${Math.max(...attacks.map(x=>x[1])).toFixed(2)}ms`);
console.log(`PASS spectral centroids (Hz): ${Object.entries(centroids).map(([n,v])=>`${n}=${v.toFixed(0)}`).join(', ')}`);
console.log(`PASS variant correlations: ${variants.map(([a,b,c])=>`${a}/${b}=${c.toFixed(3)}`).join(', ')}`);
console.log(`PASS bell modal peaks (Hz): ${peaks.map(([f])=>f).join(', ')}; 600ms fundamental=${(20*Math.log10(fundamental)).toFixed(1)} dB`);
console.log(`PASS ambience boundary=${edge.toFixed(5)}, avg step=${averageStep.toFixed(5)}, RMS loudness=${loud.toFixed(2)} dBFS`);
