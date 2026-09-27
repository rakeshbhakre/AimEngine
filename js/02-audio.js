/* =========================================================================
   THE IMPOSTOR — 02-audio.js
   procedural WebAudio: tones, noise, sfx
   Classic script (no ES modules): loaded in HTML order, shares the
   global scope with all other js/* modules. Keep load order stable.
   ========================================================================= */
/* ---------------- audio (procedural WebAudio) ---------------- */
let audioCtx=null, droneOsc=null;
function initAudio(){
  if(audioCtx) return;
  try{
    audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    droneOsc=audioCtx.createOscillator();
    const g=audioCtx.createGain(); g.gain.value=0.02;
    droneOsc.type='sine'; droneOsc.frequency.value=55;
    droneOsc.connect(g); g.connect(audioCtx.destination); droneOsc.start();
  }catch(e){}
}
function playTone(freq,type,duration,gain){
  if(!audioCtx)return; gain=gain===undefined?0.25:gain;
  try{
    const o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.connect(g);g.connect(audioCtx.destination);
    o.type=type;o.frequency.value=freq;
    g.gain.setValueAtTime(gain,audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+duration);
    o.start();o.stop(audioCtx.currentTime+duration);
  }catch(e){}
}
function playNoise(dur,gain){
  if(!audioCtx)return;
  try{
    const n=(audioCtx.sampleRate*dur)|0;
    const buf=audioCtx.createBuffer(1,n,audioCtx.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);
    const s=audioCtx.createBufferSource();s.buffer=buf;
    const g=audioCtx.createGain();g.gain.value=gain;
    s.connect(g);g.connect(audioCtx.destination);s.start();
  }catch(e){}
}
function playSweep(f1,f2,dur,type,gain){
  if(!audioCtx)return;
  try{
    const o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.type=type||'sawtooth';o.frequency.setValueAtTime(f1,audioCtx.currentTime);
    o.frequency.exponentialRampToValueAtTime(f2,audioCtx.currentTime+dur);
    g.gain.setValueAtTime(gain||0.2,audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+dur);
    o.connect(g);g.connect(audioCtx.destination);
    o.start();o.stop(audioCtx.currentTime+dur);
  }catch(e){}
}
const sfx={
  shoot:()=>playTone(800,'square',0.05,0.10),
  eHit:()=>playNoise(0.08,0.22),
  pHit:()=>{playTone(80,'sine',0.15,0.4);playNoise(0.1,0.18);},
  impostorAppear:()=>playSweep(400,80,1.5,'sawtooth',0.16),
  confirm:()=>{playTone(440,'sine',0.1,0.2);setTimeout(()=>playTone(880,'sine',0.1,0.2),110);},
  round:()=>playSweep(100,300,2,'sine',0.12),
  ominous:()=>playTone(46,'sine',1.4,0.22),
  die:()=>{playSweep(300,40,0.9,'sawtooth',0.2);playNoise(0.4,0.25);}
};
