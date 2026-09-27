/* =========================================================================
   THE IMPOSTOR — 06-battlefield.js
   pillars, reactor core, pylons, beams, glow sprites, orbit shards
   Classic script (no ES modules): loaded in HTML order, shares the
   global scope with all other js/* modules. Keep load order stable.
   ========================================================================= */
/* =========================================================================
   BATTLEFIELD DRESSING
   cover pillars (destroyable, block shots) · reactor core (periodic EMP)
   corner pylons · glowing edge beams · player orbit shards · impostor shard halo
   ========================================================================= */
const pillars=[];
const pillarPresets={
  1:[[420,240],[780,540]],
  2:[[350,210],[850,210],[600,560]],
  3:[[350,210],[850,210],[350,550],[850,550]]
};
function buildPillars(){
  pillars.forEach(p=>{if(p.grp)scene.remove(p.grp);});
  pillars.length=0;
  (pillarPresets[round]||pillarPresets[1]).forEach(([lx,ly])=>{
    const grp=new THREE.Group();
    const body=new THREE.Mesh(new THREE.CylinderGeometry(0.46,0.6,1.1,6),
      new THREE.MeshBasicMaterial({color:0x0c1418,fog:true}));
    body.position.y=0.55;
    const edges=new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry),
      new THREE.LineBasicMaterial({color:0x2affc8,fog:false}));
    edges.position.y=0.55;
    const cap=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.3,0.14,6),
      new THREE.MeshBasicMaterial({color:0x2affc8,transparent:true,opacity:0.9,fog:false}));
    cap.position.y=1.18;
    const glow=makeGlowSprite(0x1a8a70,1.7,0.26);
    glow.position.y=0.5;
    grp.add(body,edges,cap,glow);
    grp.position.set(L2X(lx),0,L2Z(ly));
    scene.add(grp);
    pillars.push({x:lx,y:ly,r:27,hp:48,maxHp:48,dead:false,grp,
      edges,cap,glow,flash:0,bob:rand(0,6)});
  });
}
function damagePillar(pl,dmg,hex){
  if(pl.dead)return;
  pl.hp-=dmg*0.6;pl.flash=1;
  if(pl.hp<=0){
    pl.dead=true;
    spawnParticles(pl.x,pl.y,0x2affc8,26,220);
    spawnParticles(pl.x,pl.y,0xffffff,9,150);
    shakeMag=Math.max(shakeMag,9);bloomSpike=Math.max(bloomSpike,1.0);
    sfx.eHit();
    scene.remove(pl.grp);
  }
}
function updatePillars(dt){
  for(const pl of pillars){
    if(pl.dead)continue;
    if(pl.flash>0)pl.flash=Math.max(0,pl.flash-dt*4);
    const frac=clamp(pl.hp/pl.maxHp,0,1);
    pl.edges.material.color.setHex(pl.flash>0.35?0xffffff:(frac<0.5?0xff5a4c:0x2affc8));
    pl.cap.material.opacity=0.55+0.35*Math.sin(simTime*3+pl.bob)+pl.flash*0.6;
    pl.cap.position.y=1.18+Math.sin(simTime*1.8+pl.bob)*0.05;
    pl.glow.material.opacity=0.16+frac*0.18+pl.flash*0.5;
  }
}
/* push a logical point out of any standing pillar */
function resolvePillarPush(x,y,r){
  for(const pl of pillars){
    if(pl.dead)continue;
    const dd=dist2(x,y,pl.x,pl.y),min=pl.r+r;
    if(dd<min){
      if(dd<0.1){x=pl.x+min;continue;}
      x=pl.x+(x-pl.x)/dd*min;
      y=pl.y+(y-pl.y)/dd*min;
    }
  }
  return{x,y};
}

/* reactor core: slowly rotates, periodically clears ALL hostile fire (mercy EMP) */
const coreObj={};
let coreWave=null,coreWaveT=0,coreCfg={t:9,cd:24};
const coreLight=new THREE.PointLight(0x2affc8,0.4,11);
{
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.IcosahedronGeometry(0.4,0),
    new THREE.MeshBasicMaterial({color:0x0e2030,fog:true}));
  const edges=new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry),
    new THREE.LineBasicMaterial({color:0x3affc8,fog:false}));
  body.position.y=1.55;edges.position.y=1.55;
  const ringX=new THREE.Mesh(new THREE.TorusGeometry(0.92,0.02,6,42),
    new THREE.MeshBasicMaterial({color:0x1a7a68,transparent:true,opacity:0.8,fog:false}));
  const ringY=new THREE.Mesh(new THREE.TorusGeometry(0.68,0.014,6,32),
    new THREE.MeshBasicMaterial({color:0x2affc8,transparent:true,opacity:0.6,fog:false}));
  ringX.position.y=1.55;ringY.position.y=1.55;
  const glyph=new THREE.Mesh(new THREE.RingGeometry(1.05,1.12,48),
    new THREE.MeshBasicMaterial({color:0x2affc8,transparent:true,opacity:0.3,side:THREE.DoubleSide,fog:true}));
  glyph.rotation.x=-Math.PI/2;glyph.position.y=0.015;
  g.add(body,edges,ringX,ringY,glyph);
  g.position.set(L2X(VW/2),0,L2Z(330));
  scene.add(g);
  coreLight.position.set(L2X(VW/2),1.6,L2Z(330));
  scene.add(coreLight);
  coreWave=new THREE.Mesh(new THREE.RingGeometry(0.92,1.02,64),
    new THREE.MeshBasicMaterial({color:0x2affc8,transparent:true,opacity:0,side:THREE.DoubleSide,fog:false}));
  coreWave.rotation.x=-Math.PI/2;
  coreWave.position.set(L2X(VW/2),0.05,L2Z(330));
  scene.add(coreWave);
  Object.assign(coreObj,{g,body,edges,ringX,ringY,glyph,glow:null});
}

/* corner pylons + edge beams */
const pylons=[],beams=[];
{
  const corners=[[arena.x,arena.y],[arena.x+arena.w,arena.y],[arena.x,arena.y+arena.h],[arena.x+arena.w,arena.y+arena.h]];
  corners.forEach(c=>{
    const g=new THREE.Group();
    const post=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.085,1.1,8),
      new THREE.MeshBasicMaterial({color:0x0e1218,fog:true}));
    post.position.y=0.55;
    const cap=new THREE.Mesh(new THREE.SphereGeometry(0.085,8,6),
      new THREE.MeshBasicMaterial({color:0x2affc8,transparent:true,opacity:0.9,fog:false}));
    cap.position.y=1.18;
    g.add(post,cap);
    g.position.set(L2X(c[0]),0,L2Z(c[1]));
    scene.add(g);
    pylons.push({g,cap});
  });
  const bb=[[arena.x+arena.w/2,arena.y+6,arena.w],[arena.x+arena.w/2,arena.y+arena.h-6,arena.w],
    [arena.x+6,arena.y+arena.h/2,arena.h],[arena.x+arena.w-6,arena.y+arena.h/2,arena.h]];
  bb.forEach((d,i)=>{
    const horiz=i<2;
    const m=new THREE.Mesh(new THREE.BoxGeometry(horiz?d[2]/U:0.035,0.025,horiz?0.035:d[2]/U),
      new THREE.MeshBasicMaterial({color:0x00ff88,transparent:true,opacity:0.3,fog:false}));
    m.position.set(L2X(d[0]),0.03,L2Z(d[1]));
    scene.add(m);
    beams.push(m);
  });
}

/* player orbit shards: three crystal satellites circling the hit-point */
const playerOrbit=new THREE.Group();
for(let k=0;k<3;k++){
  const s=new THREE.Mesh(new THREE.TetrahedronGeometry(0.09,0),
    new THREE.MeshBasicMaterial({color:0xd8ecf5,fog:false}));
  s.userData.k=k;
  playerOrbit.add(s);
}
scene.add(playerOrbit);

/* impostor shard halo: red crystal swarm hovering around the copy */
const impShards=new THREE.Group();
for(let k=0;k<5;k++){
  const s=new THREE.Mesh(new THREE.TetrahedronGeometry(0.11,0),
    new THREE.MeshBasicMaterial({color:0xff2a4c,fog:false}));
  s.userData={k,ph:rand(0,6)};
  impShards.add(s);
}
scene.add(impShards);

function updateBattlefield(dt){
  if(!coreObj.glow){coreObj.glow=makeGlowSprite(0x2affc8,2.4,0.3);coreObj.glow.position.y=1.55;coreObj.g.add(coreObj.glow);}
  coreObj.edges.rotation.y+=dt*0.7;coreObj.body.rotation.y+=dt*0.7;
  coreObj.body.rotation.x+=dt*0.3;coreObj.edges.rotation.x+=dt*0.3;
  coreObj.ringX.rotation.x+=dt*0.9;coreObj.ringX.rotation.z+=dt*0.5;
  coreObj.ringY.rotation.x-=dt*1.3;coreObj.ringY.rotation.y+=dt*0.8;
  coreObj.glow.material.opacity=0.22+0.1*Math.sin(simTime*2.4);
  coreLight.intensity=0.32+0.16*Math.sin(simTime*2.4)+(coreWaveT>0?coreWaveT*0.5:0);
  // EMP pulse: periodically wipes hostile projectiles
  if(state===GS.PLAYING&&!impostor.peel){
    coreCfg.t-=dt;
    if(coreCfg.t<=0){
      coreCfg.t=coreCfg.cd;
      coreWaveT=1;
      sfx.round();shakeMag=Math.max(shakeMag,3);
      showPrediction("REACTOR PULSE","HOSTILE FIRE CLEARED",1.6,0x2affc8);
      for(const pool of[eProj,iProj])
        for(const pr of pool)if(pr.active){
          spawnParticles(pr.x,pr.y,0x2affc8,2,60);
          pr.active=false;pr.mesh.visible=false;
        }
    }
  }
  if(coreWaveT>0){
    coreWaveT-=dt*2.4;
    const p=1-coreWaveT;
    coreWave.scale.setScalar(1+p*8);
    coreWave.material.opacity=Math.max(0,coreWaveT)*0.6;
  }else coreWave.material.opacity=0;
  updatePillars(dt);
  pylons.forEach((p,i)=>{
    const pd=dist2(player.x,player.y,X2L(p.g.position.x),Z2L(p.g.position.z));
    p.cap.material.opacity=clamp(0.45+0.42*Math.sin(simTime*2.8+i*1.7)+(pd<160?0.5*(1-pd/160):0),0,1);
  });
  beams.forEach((b,i)=>{b.material.opacity=0.24+0.13*Math.sin(simTime*2+i*Math.PI/2);});
}

/* starfield */
{
  const n=420,pos=new Float32Array(n*3);
  for(let i=0;i<n;i++){
    const r=38+Math.random()*30,a=Math.random()*Math.PI*2,b=Math.random()*Math.PI;
    pos[i*3]=r*Math.sin(b)*Math.cos(a);pos[i*3+1]=Math.abs(r*Math.cos(b))*0.6-2;pos[i*3+2]=r*Math.sin(b)*Math.sin(a);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  scene.add(new THREE.Points(g,new THREE.PointsMaterial({color:0x44507a,size:0.2,fog:false})));
}

/* glow texture (radial) */
function makeGlowTex(){
  const c=document.createElement('canvas');c.width=c.height=128;
  const x=c.getContext('2d');
  const gr=x.createRadialGradient(64,64,2,64,64,64);
  gr.addColorStop(0,'rgba(255,255,255,0.9)');
  gr.addColorStop(0.45,'rgba(255,255,255,0.25)');
  gr.addColorStop(1,'rgba(255,255,255,0)');
  x.fillStyle=gr;x.fillRect(0,0,128,128);
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t;
}
const glowTex=makeGlowTex();
function makeGlowSprite(hex,scale,opacity){
  const m=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:hex,transparent:true,
    opacity:opacity===undefined?0.4:opacity,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));
  m.scale.set(scale,scale,1);
  return m;
}

/* crosshair aim line (3D, dashed) */
const aimLine=(()=>{
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3));
  const l=new THREE.Line(g,new THREE.LineDashedMaterial({color:0xe8f4f8,transparent:true,opacity:0.22,dashSize:0.22,gapSize:0.18,fog:false}));
  l.frustumCulled=false;
  scene.add(l);
  return l;
})();

/* player hitbox marker ring */
const ring=(()=>{
  const m=new THREE.Mesh(new THREE.RingGeometry(0.5,0.62,40),
    new THREE.MeshBasicMaterial({color:0xe8f4f8,transparent:true,opacity:0.4,side:THREE.DoubleSide,fog:false}));
  m.rotation.x=-Math.PI/2;m.position.y=0.02;
  scene.add(m);
  return m;
})();
const ring2=(()=>{
  const m=new THREE.Mesh(new THREE.RingGeometry(0.7,0.74,40),
    new THREE.MeshBasicMaterial({color:0xe8f4f8,transparent:true,opacity:0.15,side:THREE.DoubleSide,fog:false}));
  m.rotation.x=-Math.PI/2;m.position.y=0.02;
  scene.add(m);
  return m;
})();
