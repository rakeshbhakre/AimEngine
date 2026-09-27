/* =========================================================================
   THE IMPOSTOR — 11-impostor.js
   impostor brain: strategies, prediction, blink
   Classic script (no ES modules): loaded in HTML order, shares the
   global scope with all other js/* modules. Keep load order stable.
   ========================================================================= */
/* ---------------- impostor ---------------- */
const impostor={
  active:false,dead:false,x:0,y:0,hp:80,maxHp:80,radius:22,speed:160,
  strategy:"observe",prediction:null,fragmentation:0.2,t:0,
  fireCd:0,freezeT:0,dashT:0,dashVX:0,dashVY:0,ambushCd:0,orbitAngle:0,
  predCd:0,watch:null,peel:null,
  sprite3d:null,fragCanvas:null,fragCtx:null,fragBase:null,fragTex:null,
  predictionCorrect:0,predictionTotal:0
};
function impostorSetupVisual(srcCanvas){
  const w=Math.max(2,Math.round(srcCanvas.width*0.5)),h=Math.max(2,Math.round(srcCanvas.height*0.5));
  const fc=document.createElement('canvas');fc.width=w;fc.height=h;
  impostor.fragCanvas=fc;
  impostor.fragCtx=fc.getContext('2d',{willReadFrequently:true});
  const tmp=document.createElement('canvas');tmp.width=w;tmp.height=h;
  const tx=tmp.getContext('2d',{willReadFrequently:true});
  tx.drawImage(srcCanvas,0,0,w,h);
  const img=tx.getImageData(0,0,w,h);
  const d=img.data;
  for(let i=0;i<d.length;i+=4){
    if(d[i+3]===0)continue;
    const lum=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];
    const inv=255-lum;
    d[i]=clamp(250-lum*0.6,80,255);
    d[i+1]=inv*0.09;
    d[i+2]=inv*0.17;
  }
  tx.putImageData(img,0,0);
  impostor.fragBase=img;
  impostor.fragCtx.drawImage(tmp,0,0);
  impostor.fragTex=new THREE.CanvasTexture(fc);
  impostor.fragTex.encoding=THREE.sRGBEncoding;
  if(!impostor.sprite3d){
    impostor.sprite3d=new THREE.Sprite(new THREE.SpriteMaterial({map:impostor.fragTex,
      transparent:true,depthWrite:false,fog:false}));
    impostor.sprite3d.center.set(0.5,0);
    impostor.sprite3d.renderOrder=3;
    impostor.spriteGlow=makeGlowSprite(0xff1a3c,4.5,0);
    scene.add(impostor.spriteGlow);
    scene.add(impostor.sprite3d);
  }else{
    impostor.sprite3d.material.map=impostor.fragTex;
    impostor.sprite3d.material.needsUpdate=true;
  }
  const targetH=round>=3?3.4:2.7;
  const s=targetH;
  impostor.sprite3d.scale.set(s*(w/h),s,1);
  impostor.sprite3d.visible=false;
  impostor.spriteGlow.position.z=0;
}
function updateImpostorFrag(){
  if(!impostor.fragBase||!impostor.active)return;
  const fc=impostor.fragCanvas,x=impostor.fragCtx;
  const img=x.createImageData(fc.width,fc.height);
  const src=impostor.fragBase.data,out=img.data;
  const f=impostor.fragmentation;
  for(let i=0;i<src.length;i+=4){
    if(src[i+3]>0&&Math.random()<f)continue;
    out[i]=src[i];out[i+1]=src[i+1];out[i+2]=src[i+2];out[i+3]=src[i+3];
  }
  x.putImageData(img,0,0);
  impostor.fragTex.needsUpdate=true;
}
/* prediction indicator: HTML projected */
let predLabelT=0;
function showPrediction(title,text,secs,color){
  const el=$('predlabel');
  $('pred-a').textContent=title;
  $('pred-b').textContent=text;
  const c=color===0xff1a3c?'var(--ui-red)':color===0x00ff88?'var(--ui-green)':'var(--ui-yellow)';
  el.style.borderColor=c;
  $('pred-a').style.color=c;
  el.style.display='block';
  predLabelT=secs;
}
function hidePredictionLabel(){$('predlabel').style.display='none';}

/* impostor brain */
function dodgeVec(dir){return DIRV[dir]||{x:1,y:0};}
function impostorFireAt(tx,ty){
  fireProj(iProj,impostor.x,impostor.y,tx,ty,280,18,5,3.0);
  noteEnemyShot();
}
function impostorSetPredictionFromProfile(){
  const dom=(aiConfig&&aiConfig.strategy==="exploit_dodge"&&tracker.profile.dominantDodge)
    ?tracker.profile.dominantDodge:liveDominant();
  impostor.prediction=dom;
}
function startDodgePredictionWatch(){
  impostor.predictionTotal++;
  impostor.watch={until:now()+700,dx:0,dy:0,pred:impostor.prediction};
  if(impostor.prediction)
    showPrediction("IMPOSTOR PREDICTS","→ DODGE "+impostor.prediction.toUpperCase(),2);
}
function resolveWatch(){
  const w=impostor.watch;impostor.watch=null;
  const moved=classify(w.dx,w.dy);
  if(Math.abs(w.dx)+Math.abs(w.dy)<12)return;
  if(moved===w.pred){
    impostor.predictionCorrect++;
    showPrediction("PATTERN CONFIRMED ✓","YOU DID IT ANYWAY",1.5);
    sfx.confirm();
    $('pattern-log').textContent="PATTERN CONFIRMED ✓";
    setTimeout(()=>{$('pattern-log').textContent="";},2500);
  }else{
    impostor.freezeT=1.0;
    glitchFlash();
    showPrediction("RECALIBRATING...","",1.2,0xff1a3c);
    impostorSetPredictionFromProfile();
  }
}
function updateImpostor(dt){
  if(!impostor.active||impostor.dead||impostor.peel)return;
  impostor.t+=dt;
  // RAGE PROTOCOL: pushed under 40% HP in the final round — all constraints off
  if(round>=3&&!impostor._rage&&impostor.hp<impostor.maxHp*0.4){
    impostor._rage=true;
    impostor.speed*=1.25;
    impostor.fragmentation=Math.min(1,impostor.fragmentation+0.18);
    glitchFlash();bloomSpike=Math.max(bloomSpike,2.2);shakeMag=Math.max(shakeMag,10);
    showPrediction("RAGE PROTOCOL","ALL CONSTRAINTS WITHDRAWN",2.6,0xff1a3c);
    $('sys-note').textContent="IT STOPPED ADAPTING. IT STARTED KILLING.";
    sfx.impostorAppear();sfx.ominous();
    if(droneOsc){try{droneOsc.frequency.setTargetAtTime(90,audioCtx.currentTime,0.4);}catch(e){}}
  }
  impostor.blinkCd-=dt;
  if((impostor._dmgAcc||0)>30&&impostor.blinkCd<=0){
    impostor._dmgAcc=0;impostor.blinkCd=impostor._rage?2:4;
    spawnParticles(impostor.x,impostor.y,0xff1a3c,16,200);
    if(dist2(impostor.x,impostor.y,player.x,player.y)<340){
      impostor.x=player.x<arena.x+arena.w/2?arena.x+arena.w-60:arena.x+60;
      impostor.y=player.y<arena.y+arena.h/2?arena.y+arena.h-60:arena.y+60;
    }else{
      const c=spawnPoint();impostor.x=c.x;impostor.y=c.y;
    }
    glitchFlash();
    spawnParticles(impostor.x,impostor.y,0xff1a3c,16,200);
    showPrediction("REPOSITIONING","",1,0xff1a3c);
    sfx.ominous();
  }
  if(impostor.freezeT>0){impostor.freezeT-=dt;return;}
  const px=player.x,py=player.y;
  const d=dist2(impostor.x,impostor.y,px,py);
  const strat=impostor.strategy;
  const stag=clamp(impostor.t/1,0,1);

  if(strat==="mirror"){
    playerHistory.push({x:player.x,y:player.y});
    if(playerHistory.length>45)playerHistory.shift();
    const target=playerHistory[0]||{x:px,y:py};
    const mx=VW-target.x,my=target.y;
    const a=Math.atan2(my-impostor.y,mx-impostor.x);
    if(dist2(impostor.x,impostor.y,mx,my)>10){
      impostor.x+=Math.cos(a)*impostor.speed*stag*dt;
      impostor.y+=Math.sin(a)*impostor.speed*stag*dt;
    }
    if(impostor.t>15){
      impostor.fireCd-=dt;
      if(impostor.fireCd<=0){impostor.fireCd=2.2;impostorFireAt(px,py);}
    }
  }
  else if(strat==="exploit_dodge"){
    if(!impostor.prediction)impostorSetPredictionFromProfile();
    const dir=dodgeVec(impostor.prediction);
    const tx=px+dir.x*170,ty=py+dir.y*170;
    steerTo(tx,ty,1);
    impostor.fireCd-=dt;impostor.predCd-=dt;
    if(impostor.fireCd<=0&&dist2(impostor.x,impostor.y,tx,ty)<60){
      impostor.fireCd=2.0*rand(0.85,1.2);
      // lead shots by the player's TYPICAL DODGE DISTANCE along the predicted direction
      const leadPd=dodgeVec(impostor.prediction||liveDominant());
      const leadPx=clamp((tracker.profile.avgDodgeDistance||0)*0.8,0,150);
      if((tracker.profile.stationaryFraction||0)>0.45){
        impostorFireAt(px,py); // profile says they hold still under fire — no lead needed
      }else{
        impostorFireAt(px+leadPd.x*leadPx*0.6,py+leadPd.y*leadPx*0.6);
      }
      if(Math.random()<0.35&&impostor.prediction){
        const pdv=dodgeVec(impostor.prediction);
        const lane=clamp((tracker.profile.avgDodgeDistance||130)*0.9,90,170);
        fireProj(iProj,impostor.x,impostor.y,px+pdv.x*lane,py+pdv.y*lane,280,18,5,3.0);
      }
      startDodgePredictionWatch();
    }
  }
  else if(strat==="exploit_position"){
    const pref=tracker.profile.positionPreference||"center";
    if(pref==="center"){
      impostor.orbitAngle+=dt*0.9;
      steerTo(px+Math.cos(impostor.orbitAngle)*210,py+Math.sin(impostor.orbitAngle)*210,1);
    }else{
      const wx=px<arena.x+arena.w/2?arena.x:arena.x+arena.w;
      const wy=py<arena.y+arena.h/2?arena.y:arena.y+arena.h;
      const cx=(Math.abs(px-wx)<Math.abs(py-wy))?wx:px;
      const cy=(Math.abs(px-wx)<Math.abs(py-wy))?py:wy;
      steerTo(px+(cx-px)*0.35,py+(cy-py)*0.35,1);
    }
    impostor.fireCd-=dt;
    if(impostor.fireCd<=0&&d<520){impostor.fireCd=1.7;impostorFireAt(px,py);}
    if(impostor.predCd<=0){impostor.predCd=6;showPrediction("ROUTE CONTROL","CUTTING OFF "+pref.toUpperCase(),2);}
  }
  else if(strat==="bait"){
    const wasDashing=impostor.dashT>0;
    impostor.baitCd=(impostor.baitCd||0)-dt;
    if(tracker.shotsFired>(impostor._seenShots||0)){
      impostor._seenShots=tracker.shotsFired;
      if(d<430&&impostor.dashT<=0&&impostor.baitCd<=0){
        impostor.baitCd=1.1;
        const a=Math.atan2(impostor.y-py,impostor.x-px)+(Math.random()<0.5?Math.PI/2:-Math.PI/2);
        impostor.dashVX=Math.cos(a)*impostor.speed*2.2;
        impostor.dashVY=Math.sin(a)*impostor.speed*2.2;
        impostor.dashT=0.22;
      }
    }
    if(impostor.dashT>0){
      impostor.dashT-=dt;
      impostor.x+=impostor.dashVX*dt;impostor.y+=impostor.dashVY*dt;
      if(impostor.dashT<=0&&wasDashing){impostor.fireCd=0.08;impostor._volley=2;}
    }else{
      if(d>250)steerTo(px,py,0.45);else steerTo(px,py,-0.3);
    }
    impostor.fireCd-=dt;
    if(impostor.fireCd<=0&&d<560){
      impostor.fireCd=impostor._volley>0?0.14:2.2;
      if(impostor._volley>0)impostor._volley--;
      impostorFireAt(px,py);
    }
    if(impostor.predCd<=0){impostor.predCd=7;showPrediction("VULNERABILITY","FEIGNED",2);}
  }
  else if(strat==="ambush"){
    impostor.ambushCd-=dt;
    if(impostor.dashT>0){
      impostor.dashT-=dt;
      impostor.x+=impostor.dashVX*dt;impostor.y+=impostor.dashVY*dt;
      if(impostor.fireCd<=0){impostor.fireCd=0.5;impostorFireAt(px,py);}
      impostor.fireCd-=dt;
    }else{
      const ex=impostor.x<arena.x+arena.w/2?arena.x+30:arena.x+arena.w-30;
      steerTo(ex,arena.y+arena.h*0.25,0.8);
      const playerBusy=input.mouse.leftDown||eProj.some(q=>q.active);
      if(playerBusy&&impostor.ambushCd<=0){
        impostor.ambushCd=5;
        const a=Math.atan2(py-impostor.y,px-impostor.x);
        impostor.dashVX=Math.cos(a)*impostor.speed*3.1;
        impostor.dashVY=Math.sin(a)*impostor.speed*3.1;
        impostor.dashT=0.8;
        showPrediction("AMBUSH","NOW",1,0xff1a3c);
        sfx.impostorAppear();
      }
    }
  }
  else{ // predict_and_intercept
    const projT=clamp(d/280,0,1.2);
    let lx=px+player.vx*projT,ly=py+player.vy*projT;
    lx=clamp(lx,arena.x,arena.x+arena.w);ly=clamp(ly,arena.y,arena.y+arena.h);
    const strafe=Math.sin(impostor.t*1.7)*120;
    const pa=Math.atan2(ly-impostor.y,lx-impostor.x)+Math.PI/2;
    steerTo(lx+Math.cos(pa)*strafe*0.3,ly+Math.sin(pa)*strafe*0.3,1.15);
    // rhythm snap: the player reverses direction on a timer — volley lands exactly on it
    if(tracker.profile.reversalInterval>0.4){
      impostor._snapT=(impostor._snapT||0)+dt;
      if(impostor._snapT>=tracker.profile.reversalInterval){
        impostor._snapT=0;
        impostor.fireCd=Math.min(impostor.fireCd,0.12);
        showPrediction("RHYTHM LOCKED","YOU CYCLE EVERY "+tracker.profile.reversalInterval.toFixed(1)+"s",1.4,0xffc14a);
      }
    }
    impostor.fireCd-=dt;
    if(impostor.fireCd<=0&&d<620){
      impostor.fireCd=(impostor._rage?1.0:1.6)*rand(0.8,1.15);
      const lt=clamp(dist2(impostor.x,impostor.y,px,py)/280,0,1.2);
      let tx=px+player.vx*lt,ty=py+player.vy*lt;
      // bias the intercept by habitual dodge displacement
      const dsp=dodgeVec(liveDominant()||"right");
      const dod=clamp((tracker.profile.avgDodgeDistance||0)*0.5,0,120);
      tx+=dsp.x*dod;ty+=dsp.y*dod;
      const base=Math.atan2(ty-impostor.y,tx-impostor.x);
      const offs=impostor._rage?[-0.32,-0.16,0,0.16,0.32]:[-0.16,0,0.16];
      for(const off of offs){
        fireProj(iProj,impostor.x,impostor.y,
          impostor.x+Math.cos(base+off)*400,
          impostor.y+Math.sin(base+off)*400,280,18,5,3.0);
      }
      noteEnemyShot();
    }
    if(impostor.predCd<=0){impostor.predCd=8;showPrediction("FULL PROFILE ACTIVE","INTERCEPT VECTORS",2);}
  }

  function steerTo(tx,ty,mult){
    const a=Math.atan2(ty-impostor.y,tx-impostor.x);
    const dd=dist2(impostor.x,impostor.y,tx,ty);
    if(dd<8)return;
    const spd=impostor.speed*(mult||1)*stag;
    impostor.x+=Math.cos(a)*spd*dt;
    impostor.y+=Math.sin(a)*spd*dt;
  }
  impostor.x=clamp(impostor.x,arena.x+20,arena.x+arena.w-20);
  impostor.y=clamp(impostor.y,arena.y+20,arena.y+arena.h-20);
  const ipush=resolvePillarPush(impostor.x,impostor.y,impostor.radius);
  impostor.x=ipush.x;impostor.y=ipush.y;
}
let playerHistory=[];
