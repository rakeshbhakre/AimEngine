/* =========================================================================
   THE IMPOSTOR — 20-sync3d.js
   sync3D, camera, HUD projections, main loop
   Classic script (no ES modules): loaded in HTML order, shares the
   global scope with all other js/* modules. Keep load order stable.
   ========================================================================= */
/* =========================================================================
   3D SYNC + CAMERA + MAIN LOOP
   ========================================================================= */
const camCfg={1:{y:9.5,z:12},2:{y:8.4,z:10.8},3:{y:7.0,z:9.6}};
const camGoal=new THREE.Vector3(0,9.5,12);
const lookGoal=new THREE.Vector3(0,1,0);
const lookCur=new THREE.Vector3(0,1,0);
const raycaster=new THREE.Raycaster();
const floorPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
const ndc=new THREE.Vector2();
const hitPoint=new THREE.Vector3();
const projV=new THREE.Vector3();
const impBarEl=$('impbar'), impBarFill=impBarEl.querySelector('i');
const enemyBars=[];
{
  const hud=$('world-hud');
  for(let i=0;i<8;i++){
    const d=document.createElement('div');
    d.className='hbar';d.style.display='none';
    d.innerHTML='<i></i>';
    hud.appendChild(d);
    enemyBars.push(d);
  }
}
function projectToScreen(wx,wy,wz){
  projV.set(wx,wy,wz).project(camera);
  if(projV.z>1)return null;
  return {x:(projV.x*0.5+0.5)*innerWidth,y:(-projV.y*0.5+0.5)*innerHeight};
}
function clampLabelX(el,x){
  const w=el.offsetWidth||80;
  el.style.left=Math.max(w/2+6,Math.min(x,innerWidth-w/2-6))+'px';
}
function updateMouseRay(){
  if(!mouseDirty)return;
  mouseDirty=false;
  ndc.x=(input.mouse.sx/innerWidth)*2-1;
  ndc.y=-(input.mouse.sy/innerHeight)*2+1;
  raycaster.setFromCamera(ndc,camera);
  const hit=raycaster.ray.intersectPlane(floorPlane,hitPoint);
  if(hit){
    input.mouse.x=clamp(X2L(hitPoint.x),0,VW);
    input.mouse.y=clamp(Z2L(hitPoint.z),0,VH);
  }
}
function sync3D(dt){
  simTime+=dt;

  // aim line + marker rings
  const hx=L2X(player.x), hz=L2Z(player.y);
  ring.position.x=hx;ring.position.z=hz;
  ring2.position.x=hx;ring2.position.z=hz;
  ring2.scale.setScalar(1+Math.sin(simTime*3)*0.08);
  const showAim=state===GS.PLAYING&&!player.dead;
  aimLine.visible=showAim;
  ring.visible=ring2.visible=!player.dead;
  if(showAim){
    const mx=L2X(input.mouse.x),mz=L2Z(input.mouse.y);
    const p=aimLine.geometry.attributes.position;
    p.setXYZ(0,hx,0.5,hz);p.setXYZ(1,mx,0.5,mz);
    p.needsUpdate=true;
    aimLine.computeLineDistances();
  }

  // projectiles
  syncProjMeshes();

  // player orbit shards + impostor shard halo
  playerOrbit.visible=showAim;
  if(showAim){
    playerOrbit.position.set(hx,0.2,hz);
    playerOrbit.rotation.y+=dt*2.6;
    playerOrbit.children.forEach(c=>{
      const a=c.userData.k/3*Math.PI*2;
      c.position.set(Math.cos(a)*0.52,Math.sin(simTime*3+c.userData.k)*0.07,Math.sin(a)*0.52);
      c.rotation.x+=dt*2.4;c.rotation.y+=dt*3.1;
    });
  }
  impShards.visible=impostor.active&&!impostor.dead&&!impostor.peel;
  if(impShards.visible){
    impShards.position.set(L2X(impostor.x),1.35,L2Z(impostor.y));
    impShards.rotation.y+=dt*1.9;
    const shR=0.75+impostor.fragmentation*0.6;
    impShards.children.forEach(s=>{
      const a=s.userData.k/5*Math.PI*2;
      s.position.set(Math.cos(a)*shR,Math.sin(simTime*4+s.userData.ph)*0.28,Math.sin(a)*shR);
      s.rotation.x+=dt*3;s.rotation.y+=dt*2.2;
    });
  }

  // impostor
  if(impostor.sprite3d){
    if(impostor.active&&!impostor.dead){
      const ix=L2X(impostor.x),iz=L2Z(impostor.y);
      const topY=0.15+impostor.sprite3d.scale.y;
      impostor.sprite3d.position.set(ix,0.15,iz);   // grounded: stands on the floor
      impostor.spriteGlow.position.set(ix,1.4,iz);
      impostor.spriteGlow.material.opacity=0.35+0.18*Math.sin(simTime*4)+impostor.fragmentation*0.15;
      impostor.spriteGlow.visible=true;
      impostorLight.position.set(ix,1.6,iz);
      impostorLight.intensity=0.9+0.3*Math.sin(simTime*3);
      // impostor hp bar projection
      const sp=projectToScreen(ix,topY+0.4,iz);
      if(sp){impBarEl.style.display='block';clampLabelX(impBarEl,sp.x);impBarEl.style.top=sp.y+'px';
        impBarEl.classList.toggle('enraged',!!impostor._rage);
        impBarFill.style.width=Math.max(0,impostor.hp/impostor.maxHp*100)+'%';}
      else impBarEl.style.display='none';
      // prediction label projection
      if(predLabelT>0){
        predLabelT-=dt;
        const pp=projectToScreen(ix,topY+0.95,iz);
        const el=$('predlabel');
        if(pp){clampLabelX(el,pp.x);el.style.top=pp.y+'px';el.style.opacity='1';}
        else el.style.opacity='0';
        if(predLabelT<=0)hidePredictionLabel();
      }
      // player sprite "distortion" near impostor (position jitter)
      if(playerSprite3d){
        const dd=dist2(player.x,player.y,impostor.x,impostor.y);
        const k=clamp(1-dd/450,0,1);
        playerSprite3d.position.x=rand(-0.02,0.02)*k*8;
        playerSprite3d.position.y=playerSprite3d._baseY+rand(-0.02,0.02)*k*8;
      }
    }else{
      impostor.sprite3d.visible=false;
      impostor.spriteGlow.visible=false;
      impostorLight.intensity=0;
      impBarEl.style.display='none';
    }
  }

  // enemy hp bars
  for(let i=0;i<enemyBars.length;i++){
    const bar=enemyBars[i], e=enemies[i];
    if(e&&e.alive&&(state===GS.PLAYING||state===GS.ROUND_INTRO)){
      const ep=projectToScreen(L2X(e.x),1.15,L2Z(e.y));
      if(ep){
        bar.style.display='block';
        bar.style.left=ep.x+'px';bar.style.top=ep.y+'px';
        bar.className='hbar '+(e.type==='hunter'?'hunter':'');
        bar.querySelector('i').style.width=Math.max(0,e.hp/e.maxHp*100)+'%';
      }else bar.style.display='none';
    }else bar.style.display='none';
  }

  // walls + floaters
  updateWalls(dt);
  updateFloaters(dt);
  updateBattlefield(dt);

  // glitch frames
  if(glitchFrames>0){
    glitchFrames--;
    camera.position.x+=rand(-0.3,0.3);
    if(glitchFrames<=0)bloomSpike=0.4;
  }
  if(bloomSpike>0)bloomSpike=Math.max(0,bloomSpike-dt*1.6);
  bloomPass.strength=0.55+bloomSpike;

  // camera: round-based framing + follow + parallax + shake + recoil
  const base=camCfg[round]||camCfg[1];
  camGoal.set(hx*0.22+L2X(input.mouse.x)*0.06, base.y+Math.sin(simTime*0.28)*0.18, base.z+recoil*0.5);
  camera.position.lerp(camGoal,dt*3.2);
  lookGoal.set(hx*0.3+L2X(input.mouse.x)*0.12,1.0,-1.2+L2Z(input.mouse.y)*0.06);
  lookCur.lerp(lookGoal,dt*3.5);
  camera.lookAt(lookCur);
  recoil=Math.max(0,recoil-dt*4);
  if(shakeMag>0.1){
    camera.position.x+=rand(-0.05,0.05)*shakeMag*0.14;
    camera.position.y+=rand(-0.04,0.04)*shakeMag*0.14;
    shakeMag*=Math.pow(0.001,dt);
  }else shakeMag=0;
}

/* main loop */
let lastT=0, fragFrameSkip=0;
function loop(t){
  requestAnimationFrame(loop);
  const dt=Math.min((t-lastT)||16.7,34)/1000;
  lastT=t;
  if(dt<=0)return;

  updateParticles(dt);

  if(camOn&&visionReady){
    segTimer-=dt;faceTimer-=dt;
    if(segTimer<=0){segTimer=1/15;runSegmentation();}
    if(faceTimer<=0){faceTimer=0.1;runFace();}
  }
  ensurePlayerSprite();
  updateMouseRay();

  if(state===GS.PLAYING){
    const wdt=dt*timeScale;
    updatePlayer(dt);
    updateImpostor(dt);
    if(impostor.peel){updatePeel(dt);}
    else{
      updateEnemies(wdt);
      updateProjPool(pProj,wdt,0xd8ecf5);
      updateProjPool(eProj,wdt,0x8a8ad8);
      updateProjPool(iProj,wdt,0xff2a4c);
      checkCollisions();
      const plan=roundPlans[round];
      if(enemies.length<plan.aliveCap){
        spawnTimer-=dt;
        const interval=plan.spawnInterval*(aiConfig?(2-(aiConfig.spawnRate||0.7)):1)*spawnTensionMult;
        if(spawnTimer<=0){
          spawnTimer=Math.max(0.7,interval);
          spawnEnemy(Math.random()<plan.mix.drone?'drone':'hunter');
        }
      }
      checkRoundEnd(dt);
    }
    updatePanel(dt);
    updateStress(dt);
    fragFrameSkip++;
    if(fragFrameSkip>3){fragFrameSkip=0;updateImpostorFrag();}
  }else if(state!==GS.LOADING){
    updatePanel(dt*0.2);
    if(impostor.peel)updatePeel(dt);
    updateImpostorFrag();
    // vitals settle between rounds
    stressState.v+=(10-stressState.v)*dt*0.5;
    stressState.expr=classifyExpression();
    $('stress-vign').style.opacity=clamp((stressState.v-52)/48,0,1)*0.85;
  }

  sync3D(dt);
  try{composer.render();}catch(e){renderer.render(scene,camera);}
}
window.addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
  composer.setSize(innerWidth,innerHeight);
});
