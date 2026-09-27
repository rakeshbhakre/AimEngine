/* =========================================================================
   THE IMPOSTOR — 03-state-input.js
   game state enum, globals, input listeners
   Classic script (no ES modules): loaded in HTML order, shares the
   global scope with all other js/* modules. Keep load order stable.
   ========================================================================= */
/* ---------------- game state ---------------- */
const GS={LOADING:"loading",SCANNING:"scanning",ROUND_INTRO:"round_intro",PLAYING:"playing",
  ROUND_END:"round_end",AI_THINKING:"ai_thinking",TAUNT:"taunt",GAME_OVER:"game_over",WIN:"win"};
let state=GS.LOADING;
let round=1, timeScale=1, shakeMag=0, glitchFrames=0, simTime=0, recoil=0, bloomSpike=0;
let roundTimeLeft=0, spawnTimer=0, spawnTensionMult=1;
let aiConfig=null, lastAITaunt="";

/* virtual logical arena (sim resolution-independent) */
const VW=1200, VH=720;
const arena={x:40,y:40,w:VW-80,h:VH-80};
const U=50; // logical px per world unit

/* ---------------- input ---------------- */
const input={keys:{},mouse:{x:600,y:300,sx:0,sy:0,lsx:null,lsy:null,leftDown:false}};
document.addEventListener('keydown',e=>{initAudio();if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume();
  input.keys[e.code]=true;
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();});
document.addEventListener('keyup',e=>{input.keys[e.code]=false;});
document.addEventListener('mousemove',e=>{
  input.mouse.sx=e.clientX;input.mouse.sy=e.clientY;
  $('xhair').style.left=e.clientX+'px';$('xhair').style.top=e.clientY+'px';
  mouseDirty=true;});
document.addEventListener('mousedown',e=>{initAudio();if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume();
  if(e.button===0)input.mouse.leftDown=true;});
document.addEventListener('mouseup',e=>{if(e.button===0)input.mouse.leftDown=false;});
let mouseDirty=true;
