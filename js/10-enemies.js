/* =========================================================================
   THE IMPOSTOR — 10-enemies.js
   enemy meshes, spawning, drone/hunter AI
   Classic script (no ES modules): loaded in HTML order, shares the
   global scope with all other js/* modules. Keep load order stable.
   ========================================================================= */
/* ---------------- enemies ---------------- */
const enemies=[];
function spawnPoint(){
  for(let tries=0;tries<12;tries++){
    const side=(Math.random()*4)|0;
    let x,y;
    if(side===0){x=rand(arena.x,arena.x+arena.w);y=arena.y+10;}
    else if(side===1){x=rand(arena.x,arena.x+arena.w);y=arena.y+arena.h-10;}
    else if(side===2){x=arena.x+10;y=rand(arena.y,arena.y+arena.h*0.7);}
    else{x=arena.x+arena.w-10;y=rand(arena.y,arena.y+arena.h*0.7);}
    if(dist2(x,y,player.x,player.y)>150)return{x,y};
  }
  return{x:arena.x+arena.w/2,y:arena.y+20};
}
function buildEnemyMesh(type){
  const grp=new THREE.Group();
  const u=grp.userData;
  let core,glow;
  if(type==='drone'){
    // rotator turret: dark faceted hull inside a tilted gyro ring with a spinning core
    const hull=new THREE.Mesh(new THREE.IcosahedronGeometry(0.32,0),
      new THREE.MeshBasicMaterial({color:0x171736,fog:true}));
    hull.scale.y=0.72;
    const ring=new THREE.Mesh(new THREE.TorusGeometry(0.52,0.03,6,26),
      new THREE.MeshBasicMaterial({color:0x5a5a9a,fog:false}));
    const ring2=new THREE.Mesh(new THREE.TorusGeometry(0.44,0.015,5,22),
      new THREE.MeshBasicMaterial({color:0x2e2e5c,fog:false}));
    core=new THREE.Mesh(new THREE.OctahedronGeometry(0.13,0),
      new THREE.MeshBasicMaterial({color:0xb8b8ff,fog:false}));
    const wings=new THREE.Group();
    for(let k=0;k<3;k++){
      const fin=new THREE.Mesh(new THREE.TetrahedronGeometry(0.09,0),
        new THREE.MeshBasicMaterial({color:0x8a8ad8,fog:false}));
      fin.position.set(Math.cos(k/3*Math.PI*2)*0.56,0,Math.sin(k/3*Math.PI*2)*0.56);
      wings.add(fin);
    }
    glow=makeGlowSprite(0x4a4a7a,2.3,0.34);
    grp.add(hull,ring,ring2,core,wings,glow);
    u.hull=hull;u.ring=ring;u.ring2=ring2;u.core=core;u.wings=wings;
  }else{
    // seeker dart: elongated crimson crystal that FACES its velocity, twin spinning blades
    const dart=new THREE.Mesh(new THREE.OctahedronGeometry(0.34,0),
      new THREE.MeshBasicMaterial({color:0x2a1024,fog:true}));
    dart.scale.set(0.7,0.55,1.7);
    const bladeA=new THREE.Mesh(new THREE.TorusGeometry(0.3,0.02,5,18),
      new THREE.MeshBasicMaterial({color:0x9a3a5a,fog:false}));
    const bladeB=bladeA.clone();
    bladeB.material=new THREE.MeshBasicMaterial({color:0x6a2440,fog:false});
    bladeA.position.z=0.1;bladeB.position.z=-0.14;bladeB.scale.setScalar(0.8);
    core=new THREE.Mesh(new THREE.SphereGeometry(0.085,8,6),
      new THREE.MeshBasicMaterial({color:0xff2a4c,fog:false}));
    core.position.z=0.42;
    glow=makeGlowSprite(0x7a2a4a,1.8,0.34);
    grp.add(dart,bladeA,bladeB,core,glow);
    u.dart=dart;u.bladeA=bladeA;u.bladeB=bladeB;u.core=core;
  }
  u.glow=glow;u.spin=rand(0.8,1.4);u.phase=rand(0,6);
  scene.add(grp);
  return grp;
}
function spawnEnemy(type){
  const diffMult=(aiConfig?(0.8+(aiConfig.difficulty||0.6)*0.45):1)*(1+(round-1)*0.15);
  const c=spawnPoint();
  const grp=buildEnemyMesh(type);
  const e={type,x:c.x,y:c.y,alive:true,grp,
    glow:grp.userData.glow,
    cd:rand(0.5,1.8),wobT:0,wob:0,meleeCd:0,strafe:Math.random()<0.5?1:-1,
    strafeT:0,burst:0,teleT:0,lungeT:0,lungeCd:rand(1,2.5),lungeVX:0,lungeVY:0};
  if(type==='drone'){
    e.maxHp=e.hp=Math.round(34*diffMult);e.speed=85;e.dmg=10;e.range=350;e.rate=1.5;
    e.radius=14;e.color=0x4a4a7a;
  }else{
    e.maxHp=e.hp=Math.round(20*diffMult);e.speed=150;e.dmg=15;e.range=0;e.rate=0;
    e.radius=10;e.color=0xff5a7a;
  }
  enemies.push(e);
  spawnParticles(e.x,e.y,e.color,6,90);
}
function killEnemy(e,idx){
  e.alive=false;
  spawnParticles(e.x,e.y,e.color,14,180);
  spawnParticles(e.x,e.y,0xffffff,4,120);
  sfx.eHit();
  scene.remove(e.grp);
  enemies.splice(idx,1);
}
function droneFire(e){
  const ps=200+(round-1)*35;
  const leadF=(round-1)*0.5;
  const t=clamp(dist2(e.x,e.y,player.x,player.y)/ps,0,0.6)*leadF;
  fireProj(eProj,e.x,e.y,
    player.x+player.vx*t+rand(-24,24),
    player.y+player.vy*t+rand(-24,24),
    ps,10,6,3.0);
  noteEnemyShot();
}
function updateEnemies(dt){
  for(let i=enemies.length-1;i>=0;i--){
    const e=enemies[i];
    e.wobT-=dt;
    if(e.wobT<=0){e.wobT=1;e.wob=rand(-15,15)*Math.PI/180;}
    e.strafeT-=dt;
    if(e.strafeT<=0){e.strafeT=rand(1.5,3);e.strafe*=-1;}
    const d=dist2(e.x,e.y,player.x,player.y);
    const busy=(e.type==='hunter'&&(e.teleT>0||e.lungeT>0));
    if(!busy){
      let tx,ty;
      if(e.type==='hunter'){
        const dv=dodgeVec(liveDominant());
        tx=player.x+dv.x*120;ty=player.y+dv.y*120;
      }else{tx=player.x;ty=player.y;}
      let a=Math.atan2(ty-e.y,tx-e.x)+e.wob;
      if(e.type==='drone'&&d<e.range*0.9){
        const sa=a+Math.PI/2*e.strafe;
        e.x+=Math.cos(sa)*e.speed*0.4*dt;e.y+=Math.sin(sa)*e.speed*0.4*dt;
      }else{
        e.x+=Math.cos(a)*e.speed*dt;e.y+=Math.sin(a)*e.speed*dt;
      }
    }
    for(const o of enemies){
      if(o===e||!o.alive)continue;
      const dd=dist2(e.x,e.y,o.x,o.y);
      if(dd<e.radius+o.radius+6&&dd>0.01){
        const push=(e.radius+o.radius+6-dd)*0.5;
        e.x+=(e.x-o.x)/dd*push;e.y+=(e.y-o.y)/dd*push;
      }
    }
    e.x=clamp(e.x,arena.x+e.radius,arena.x+arena.w-e.radius);
    e.y=clamp(e.y,arena.y+e.radius,arena.y+arena.h-e.radius);
    const epush=resolvePillarPush(e.x,e.y,e.radius);e.x=epush.x;e.y=epush.y;

    if(e.type==='drone'){
      e.cd-=dt;
      if(d<e.range&&e.cd<=0){
        if(e.burst<=0)e.burst=(round>=2?3:1);
        e.burst--;
        e.cd=e.burst>0?0.15:e.rate*spawnTensionMult*rand(0.85,1.2);
        droneFire(e);
      }
      e.glow.material.opacity=0.2+0.12*Math.sin(simTime*5+i);
    }else{
      e.lungeCd-=dt;
      if(e.teleT>0){
        e.teleT-=dt;
        e.glow.material.color.setHex(0xff1a3c);
        e.glow.material.opacity=0.45+0.3*Math.sin(simTime*30);
        if(e.teleT<=0){
          const dv=dodgeVec(liveDominant());
          const tx=player.x+dv.x*140,ty=player.y+dv.y*140;
          const la=Math.atan2(ty-e.y,tx-e.x);
          e.lungeVX=Math.cos(la)*e.speed*3.2;e.lungeVY=Math.sin(la)*e.speed*3.2;
          e.lungeT=0.35;
        }
      }else if(e.lungeT>0){
        e.lungeT-=dt;
        e.x+=e.lungeVX*dt;e.y+=e.lungeVY*dt;
        if(e.lungeT<=0)e.glow.material.color.setHex(0x7a2a4a);
      }else if(d<180&&e.lungeCd<=0){
        e.teleT=0.4;
        e.lungeCd=rand(3,4.5);
        playTone(220,'square',0.12,0.08);
      }else{
        e.glow.material.color.setHex(0x7a2a4a);
      }
      e.meleeCd-=dt;
      if(d<e.radius+player.r+6&&e.meleeCd<=0){
        e.meleeCd=0.8;damagePlayer(e.dmg);
      }
    }
    // 3D sync: animated assemblies
    const u=e.grp.userData;
    if(e.type==='drone'){
      e.grp.position.set(L2X(e.x),0.62+Math.sin(simTime*2.2+u.phase)*0.1,L2Z(e.y));
      e.grp.rotation.y+=dt*0.5*e.strafe;
      u.ring.rotation.x+=dt*1.7*u.spin;u.ring.rotation.z+=dt*0.9*u.spin;
      u.ring2.rotation.x-=dt*2.3*u.spin;u.ring2.rotation.y+=dt*1.1*u.spin;
      u.core.rotation.y+=dt*3.4;u.core.rotation.x+=dt*1.6;
      u.wings.rotation.y-=dt*1.25*u.spin;
      const pulse=0.9+0.2*Math.sin(simTime*5+u.phase);
      u.core.scale.setScalar(pulse);
    }else{
      const dx=e.x-(e._px===undefined?e.x:e._px), dy=e.y-(e._py===undefined?e.y:e._py);
      e._px=e.x;e._py=e.y;
      if(Math.abs(dx)+Math.abs(dy)>0.01){
        const aW=Math.atan2(dy,dx);
        e.faceA=e.faceA===undefined?aW:e.faceA;
        let da=aW-e.faceA;
        while(da>Math.PI)da-=Math.PI*2;while(da<-Math.PI)da+=Math.PI*2;
        e.faceA+=da*dt*10;
      }
      e.grp.position.set(L2X(e.x),0.6+Math.sin(simTime*2.6+u.phase)*0.07,L2Z(e.y));
      e.grp.rotation.y=Math.PI/2-(e.faceA||0);       // dart nose (+z) → travel dir
      e.grp.rotation.x=Math.sin(simTime*3.1+u.phase)*0.12; // body roll
      u.bladeA.rotation.z+=dt*7*u.spin;
      u.bladeB.rotation.z-=dt*9*u.spin;
      const stretch=e.teleT>0?0.8:(e.lungeT>0?1.3:1);     // squash on telegraph, stretch on lunge
      u.dart.scale.z=stretch*1.7;u.dart.scale.x=0.7*(e.teleT>0?1.25:1);
    }
  }
}
