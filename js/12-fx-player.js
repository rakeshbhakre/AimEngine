/* =========================================================================
   THE IMPOSTOR — 12-fx-player.js
   glitch fx, damage, full player logic + instrumentation
   Classic script (no ES modules): loaded in HTML order, shares the
   global scope with all other js/* modules. Keep load order stable.
   ========================================================================= */
/* ---------------- glitch + feedback ---------------- */
function glitchFlash(){glitchFrames=4;bloomSpike=1.6;shakeMag=Math.max(shakeMag,4);}
function damageFlash(){
  const f=$('hit-flash');
  f.style.transition='none';f.style.opacity='0.28';
  requestAnimationFrame(()=>{f.style.transition='opacity .25s ease';f.style.opacity='0';});
}
function damagePlayer(d){
  if(player.dead||player.invulnT>0)return;
  player.hp-=d;player.invulnT=0.25;
  stressState.lastDmg=now();
  triggerDodgeWatch();
  damageFlash();shakeMag=7;sfx.pHit();
  updateHpBar();
  if(player.hp<=0){player.hp=0;playerDie();}
}
function updateHpBar(){
  const pct=clamp(player.hp/player.maxHp,0,1);
  const el=$('hp-fill');
  el.style.width=(pct*100)+'%';
  el.style.background=pct>0.5?'var(--ui-green)':pct>0.2?'var(--ui-yellow)':'var(--ui-red)';
}

/* ---------------- player logic ---------------- */
function getInputDir(){
  let vx=0,vy=0;
  if(input.keys['KeyW']||input.keys['ArrowUp'])vy=-1;
  if(input.keys['KeyS']||input.keys['ArrowDown'])vy=1;
  if(input.keys['KeyA']||input.keys['ArrowLeft'])vx=-1;
  if(input.keys['KeyD']||input.keys['ArrowRight'])vx=1;
  if(vx!==0&&vy!==0){vx*=0.707;vy*=0.707;}
  return{x:vx,y:vy};
}
function updatePlayer(dt){
  if(player.dead)return;
  const dir=getInputDir();
  player.vx=dir.x*player.speed;player.vy=dir.y*player.speed;
  const nx=player.x+player.vx*dt,ny=player.y+player.vy*dt;
  player.dxFrame=nx-player.x;player.dyFrame=ny-player.y;
  player.x=clamp(nx,arena.x+player.r,arena.x+arena.w-player.r);
  player.y=clamp(ny,arena.y+player.r,arena.y+arena.h-player.r);
  const ppush=resolvePillarPush(player.x,player.y,player.r);
  player.x=clamp(ppush.x,arena.x+player.r,arena.x+arena.w-player.r);
  player.y=clamp(ppush.y,arena.y+player.r,arena.y+arena.h-player.r);
  tracker.distanceTraveled+=Math.abs(player.dxFrame)+Math.abs(player.dyFrame);

  for(const k of['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']){
    if(input.keys[k]&&!input['_prev_'+k])onInputChange(k);
    input['_prev_'+k]=input.keys[k];
  }

  player.shootCd-=dt;
  tracker.burstCooldown-=dt;   // runs every frame: a gap >=0.8s ends the burst
  if(player.shootCd<=0&&input.mouse.leftDown){
    player.shootCd=0.25;
    fireProj(pProj,player.x,player.y,input.mouse.x,input.mouse.y,600,25,4,2.0);
    tracker.shotsFired++;
    if(player.hp<30)tracker.lowHpShots++;
    // burst tracking
    if(tracker.burstCooldown<=0)tracker.burstEvents++;
    tracker.burstShots++;
    tracker.burstCooldown=0.8;
    // fire-back discipline: did the player answer a recent enemy shot?
    if(now()-(window._lastEnemyShot||-999)<500)tracker.fireUnderFire++;
    // aim accuracy: angle from this shot line to nearest hostile
    const tgt=nearestHostile();
    if(tgt&&tracker.aimOffsets.length<120){
      const a=Math.atan2(input.mouse.y-player.y,input.mouse.x-player.x);
      const b=Math.atan2(tgt.y-player.y,tgt.x-player.x);
      let off=(a-b)*180/Math.PI;
      while(off>180)off-=360;while(off<-180)off+=360;
      tracker.aimOffsets.push({x:Math.cos(a)-Math.cos(b),y:Math.sin(a)-Math.sin(b),m:Math.abs(off)});
      if(tracker.aimOffsets.length>120)tracker.aimOffsets.shift();
    }
    recoil=1;
    sfx.shoot();
  }
  if(player.invulnT>0)player.invulnT-=dt;

  // behavior sampling: quadrants, speed, mouse wobble
  const qx=player.x<arena.x+arena.w/2?0:1, qy=player.y<arena.y+arena.h/2?0:1;
  tracker.quadrantTime[qy*2+qx]+=dt;
  tracker.totalSamples++;
  if(Math.abs(player.dxFrame)+Math.abs(player.dyFrame)<0.25)tracker.stationarySamples++;
  else if(tracker.speedSamples.length<400){
    tracker.speedSamples.push((Math.abs(player.dxFrame)+Math.abs(player.dyFrame))/Math.max(dt,1e-4));
    if(tracker.speedSamples.length>400)tracker.speedSamples.shift();
  }
  tracker.wobbleTime+=dt;
  if(tracker.wobbleTime>0.25){
    tracker.wobbleTime=0;
    let lvx=input.mouse.sx-(input.mouse.lsx||input.mouse.sx);
    let lvy=input.mouse.sy-(input.mouse.lsy||input.mouse.sy);
    tracker.wobbleSamples.push(Math.sqrt(lvx*lvx+lvy*lvy)/0.25);
    if(tracker.wobbleSamples.length>200)tracker.wobbleSamples.shift();
    input.mouse.lsx=input.mouse.sx;input.mouse.lsy=input.mouse.sy;
  }

  posSampleTimer-=dt;
  if(posSampleTimer<=0){
    posSampleTimer=2;
    tracker.positionSamples.push({
      x:(player.x-arena.x)/arena.w,y:(player.y-arena.y)/arena.h});
    if(tracker.positionSamples.length>90)tracker.positionSamples.shift();
  }

  if(dodgeWatch.active){
    dodgeWatch.dx+=player.dxFrame;dodgeWatch.dy+=player.dyFrame;
    if(now()>dodgeWatch.until){
      const dodged=Math.abs(dodgeWatch.dx)+Math.abs(dodgeWatch.dy);
      if(dodged>14){
        tracker.dodgeDirections[classify(dodgeWatch.dx,dodgeWatch.dy)]++;
        tracker.dodgeDistances.push(Math.sqrt(dodgeWatch.dx*dodgeWatch.dx+dodgeWatch.dy*dodgeWatch.dy));
        if(tracker.dodgeDistances.length>40)tracker.dodgeDistances.shift();
      }
      dodgeWatch.active=false;
    }
  }
  if(impostor.watch){
    impostor.watch.dx+=player.dxFrame;impostor.watch.dy+=player.dyFrame;
    if(now()>impostor.watch.until)resolveWatch();
  }
}
