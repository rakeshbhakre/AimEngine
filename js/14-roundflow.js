/* =========================================================================
   THE IMPOSTOR — 14-roundflow.js
   deaths, round lifecycle, peel + impostor visuals
   Classic script (no ES modules): loaded in HTML order, shares the
   global scope with all other js/* modules. Keep load order stable.
   ========================================================================= */
/* ---------------- deaths ---------------- */
function impostorDie(){
  impostor.dead=true;
  spawnParticles(impostor.x,impostor.y,0xff1a3c,30,260);
  spawnParticles(impostor.x,impostor.y,0xffffff,10,180);
  if(impostor.sprite3d)impostor.sprite3d.visible=false;
  hidePredictionLabel();
  glitchFlash();shakeMag=10;sfx.die();
  if(round>=3){setTimeout(()=>{if(state===GS.PLAYING)winGame();},900);}
  else{$('sys-note').textContent="IMPOSTOR FORM: DISSOLVED — RE-EQUATION PENDING";}
}
function playerDie(){
  player.dead=true;
  spawnParticles(player.x,player.y,0xe8f4f8,26,240);
  spawnParticles(player.x,player.y,0xff1a3c,16,180);
  shakeMag=12;sfx.die();
  setTimeout(()=>endGame(false),1100);
}

/* ---------------- round flow ---------------- */
const roundPlans={
  1:{duration:60, aliveCap:4, mix:{drone:1},    impostor:false, spawnInterval:2.8},
  2:{duration:90, aliveCap:5, mix:{drone:0.65}, impostor:true,  spawnInterval:2.4},
  3:{duration:120,aliveCap:6, mix:{drone:0.5},  impostor:true,  spawnInterval:2.0}
};
const annSub={1:"CALIBRATION IN PROGRESS",2:"THE IMPOSTOR HAS ARRIVED",3:"IT ALREADY KNOWS HOW THIS ENDS"};
function announce(r,s,cb){
  $('ann-r').textContent=r;$('ann-s').textContent=s;
  $('announce').style.opacity='1';
  sfx.round();
  setTimeout(()=>{$('announce').style.opacity='0';if(cb)cb();},2000);
}
function clearField(){
  enemies.slice().forEach(e=>scene.remove(e.grp));
  enemies.length=0;
  [pProj,eProj,iProj].forEach(pool=>pool.forEach(pr=>{pr.active=false;pr.mesh.visible=false;}));
  pillars.forEach(p=>{if(p.grp)scene.remove(p.grp);});
  pillars.length=0;
}
function beginRound(n){
  round=n;clearField();computeProfile();
  if(droneOsc){try{droneOsc.frequency.setTargetAtTime(n>=3?70:55,audioCtx.currentTime,0.5);}catch(e){}}
  drawFloor();
  buildPillars();
  coreCfg.t=10;coreWaveT=0;
  if(coreWave){coreWave.material.opacity=0;coreWave.scale.setScalar(1);}
  stressSum=0;stressN=0;stressPeak=0;lastThump=0;
  const plan=roundPlans[n];
  roundTimeLeft=plan.duration;
  spawnTimer=1.2;
  timeScale=1;
  if(n>1&&!player.dead){player.hp=Math.min(player.maxHp,player.hp+25);updateHpBar();}
  $('round-label').textContent="ROUND "+n;
  $('sys-note').textContent=n===1?"SCANNING SUBJECT...":"PROFILE: "+(aiConfig?(aiConfig.worldState||'').toUpperCase():"—");
  state=GS.ROUND_INTRO;
  announce("ROUND "+n,annSub[n],()=>{
    state=GS.PLAYING;
    if(n===2&&plan.impostor&&!impostor._peeled){startPeel();}
    else if(plan.impostor){activateImpostor(false);}
  });
}
function activateImpostor(fromPeel){
  impostor.active=true;impostor.dead=false;
  impostor.maxHp=impostor.hp=round>=3?150:100;
  impostor._dmgAcc=0;impostor.blinkCd=0;
  impostor.speed=aiConfig?clamp(aiConfig.impostorSpeed||160,120,220):160;
  impostor.strategy=aiConfig?aiConfig.strategy:(round===2?"mirror":"predict_and_intercept");
  if(round>=3)impostor.strategy="predict_and_intercept";
  impostor.fragmentation=round>=3?0.12:0.25;
  impostor.t=0;impostor.freezeT=0;impostor.ambushCd=3;impostor.predCd=2;
  impostor.fireCd=2;impostor._volley=0;impostor._seenShots=tracker.shotsFired;
  playerHistory=[];
  impostorSetPredictionFromProfile();
  if(!fromPeel){
    const c=spawnPoint();
    impostor.x=c.x;impostor.y=c.y;
    glitchFlash();
  }
  if(impostor.sprite3d){
    impostor.sprite3d.visible=true;
    const targetH=round>=3?3.4:2.7;
    const asp=impostor.fragCanvas?impostor.fragCanvas.width/impostor.fragCanvas.height:0.7;
    impostor.sprite3d.scale.set(targetH*asp,targetH,1);
  }
  if(round>=3)showPrediction("FULL PROFILE ACTIVE","",3);
  else if(impostor.strategy==="mirror")$('sys-note').textContent="IT MOVES LIKE YOU. WATCH.";
}

/* peel animation */
function startPeel(){
  impostor._peeled=true;
  timeScale=0.2;
  impostorSetupVisual(getPlayerSourceCanvas());
  const from={x:VW/2,y:VH*0.86}, to={x:VW*0.82,y:VH*0.2};
  impostor.x=from.x;impostor.y=from.y;
  impostor.active=true;impostor.dead=false;
  if(impostor.sprite3d)impostor.sprite3d.visible=true;
  impostor.fragmentation=0.3;
  sfx.impostorAppear();
  glitchFlash();
  impostor.peel={t:0,dur:1.5,from,to,done:false};
  $('sys-note').textContent="SUBJECT COPY: SEPARATING";
}
function updatePeel(dt){
  const pl=impostor.peel;if(!pl||pl.done)return;
  pl.t+=dt;
  const k=easeInOut(clamp(pl.t/pl.dur,0,1));
  impostor.x=pl.from.x+(pl.to.x-pl.from.x)*k;
  impostor.y=pl.from.y+(pl.to.y-pl.from.y)*k;
  impostor.fragmentation=0.3+0.5*k;
  if(pl.t>=pl.dur){
    pl.done=true;impostor.peel=null;
    timeScale=1;
    impostor.fragmentation=0.25;
    activateImpostor(true);
    $('sys-note').textContent="IT CAME FROM YOU.";
  }
}
