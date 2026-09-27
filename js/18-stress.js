/* =========================================================================
   THE IMPOSTOR — 18-stress.js
   expression classification + stress monitoring
   Classic script (no ES modules): loaded in HTML order, shares the
   global scope with all other js/* modules. Keep load order stable.
   ========================================================================= */
/* ---------------- expression + stress monitoring ---------------- */
const exprMap={
  FOCUSED:["😐","FOCUSED"],GRINNING:["😄","GRINNING"],STARTLED:["😲","STARTLED"],
  SUSPICIOUS:["🤨","SUSPICIOUS"],ALERT:["👀","ALERT"],TENSE:["😬","TENSE"],
  PANICKING:["😵","PANICKING"],RELIEVED:["😌","RELIEVED"],
  OFFLINE:["▒","OFFLINE"],NOSIGNAL:["👤","NO FACE"]
};
const stressState={v:0,expr:"OFFLINE",brow:0,faceJitter:0,lastDmg:-99,noFace:true,
  smile:0,jawOpen:0,innerBrow:0,browDown:0,squint:0,_np:null};
let lastThump=0,stressSum=0,stressN=0,stressPeak=0,camUiTimer=0;
function showCamBox(){const b=$('cam-box');if(b)b.style.display='block';}
function classifyExpression(){
  const s=stressState;
  if(CONFIG.DEBUG_MODE||!camOn||s.noFace){
    if(s.v>82)return"PANICKING";
    if(s.v>62)return"TENSE";
    if(state===GS.WIN)return"RELIEVED";
    if(impostor.active&&!impostor.dead)return"ALERT";
    if(!camOn&&!CONFIG.DEBUG_MODE)return"OFFLINE";
    return"FOCUSED";
  }
  if(s.smile>0.4)return"GRINNING";
  if(s.jawOpen>0.34&&s.innerBrow>0.28)return"STARTLED";
  if(s.browDown>0.42&&s.squint>0.24)return"SUSPICIOUS";
  if(s.v>78)return"PANICKING";
  if(s.v>58)return"TENSE";
  return"FOCUSED";
}
function updateStress(dt){
  let target=14;
  if(player.hp<35)target+=22+(35-player.hp)*1.1;
  if(now()-stressState.lastDmg<2000)target+=16;
  if(eProjNearPlayer())target+=12;
  if(impostor.active&&!impostor.dead&&!impostor.peel&&
     dist2(player.x,player.y,impostor.x,impostor.y)<300)target+=14;
  target+=clamp(stressState.faceJitter*0.5,0,18);
  target+=clamp(stressState.brow*22,0,22);
  target+=clamp((tracker.profile.handWobble||0)*0.008,0,8);
  if(round>=3)target+=8;
  target=clamp(target,4,100);
  stressState.v+=(target-stressState.v)*dt*2.0;
  stressState.expr=classifyExpression();
  stressSum+=stressState.v;stressN++;
  if(stressState.v>stressPeak)stressPeak=stressState.v;
  // heartbeat when vitals spike
  if(stressState.v>70&&now()-lastThump>Math.max(420,1150-stressState.v*6)){
    lastThump=now();
    playTone(52,'sine',0.1,0.25);
    setTimeout(()=>playTone(46,'sine',0.12,0.22),160);
  }
  camUiTimer-=dt;
  if(camUiTimer<=0){
    camUiTimer=0.15;
    const v=Math.round(stressState.v);
    const fill=$('stress-fill'),px=$('stress-pct'),box=$('cam-box');
    fill.style.width=v+'%';
    fill.style.background=v>70?'var(--ui-red)':v>40?'var(--ui-yellow)':'var(--ui-green)';
    px.textContent=v+'%';
    box.classList.toggle('stress-hi',v>70);
    box.classList.toggle('stress-mid',v>40&&v<=70);
    const em=exprMap[stressState.expr]||exprMap.FOCUSED;
    $('expr-emoji').textContent=em[0];
    $('expr-text').textContent=(camOn&&stressState.noFace)?"SCANNING":em[1];
    if(impostor.active&&!impostor.dead&&!impostor.peel&&stressState.v>55&&Math.random()<0.01)
      $('pattern-log').textContent="IT SEES YOUR VITALS SPIKE";
    $('stress-vign').style.opacity=clamp((stressState.v-52)/48,0,1)*0.85;
  }
}
