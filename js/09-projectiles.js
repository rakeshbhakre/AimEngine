/* =========================================================================
   THE IMPOSTOR — 09-projectiles.js
   projectile pools, firing, pillar blocking
   Classic script (no ES modules): loaded in HTML order, shares the
   global scope with all other js/* modules. Keep load order stable.
   ========================================================================= */
/* ---------------- projectiles ---------------- */
function makeProjPool(n,hex,size){
  const pool=[];
  const geo=new THREE.SphereGeometry(size,10,8);
  for(let i=0;i<n;i++){
    const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:hex,fog:false}));
    m.visible=false;scene.add(m);
    pool.push({active:false,mesh:m,x:0,y:0,vx:0,vy:0,dmg:0,radius:5,life:0});
  }
  return pool;
}
const pProj=makeProjPool(48,0xe8f4f8,0.14);
const eProj=makeProjPool(64,0x7a7ad8,0.17);
const iProj=makeProjPool(32,0xff2a4c,0.16);
function fireProj(pool,x,y,tx,ty,speed,dmg,radius,life){
  const pr=pool.find(q=>!q.active);if(!pr)return;
  const a=Math.atan2(ty-y,tx-x);
  pr.active=true;pr.x=x;pr.y=y;
  pr.vx=Math.cos(a)*speed;pr.vy=Math.sin(a)*speed;
  pr.dmg=dmg;pr.radius=radius;pr.life=life;
  pr.mesh.visible=true;
}
function updateProjPool(pool,dt,trailHex){
  for(const pr of pool){
    if(!pr.active)continue;
    pr.life-=dt;
    pr.px=pr.x;pr.py=pr.y;
    pr.x+=pr.vx*dt;pr.y+=pr.vy*dt;
    if(trailHex){
      pr._trailT=(pr._trailT||0)-dt;
      if(pr._trailT<=0){pr._trailT=0.045;
        spawnParticles(pr.x-pr.vx*0.04,pr.y-pr.vy*0.04,trailHex,1,10);}
    }
    // cover pillars block projectiles
    for(const pl of pillars){
      if(pl.dead)continue;
      if(dist2(pr.x,pr.y,pl.x,pl.y)<pl.r+pr.radius+6){
        pr.active=false;pr.mesh.visible=false;
        damagePillar(pl,pr.dmg,trailHex||0xffffff);
        spawnParticles(pr.x,pr.y,0x2affc8,5,90);
        break;
      }
    }
    if(!pr.active)continue;
    if(pr.life<=0||pr.x<arena.x-10||pr.x>arena.x+arena.w+10||pr.y<arena.y-10||pr.y>arena.y+arena.h+10){
      pr.active=false;pr.mesh.visible=false;
    }
  }
}
function syncProjMeshes(){
  const sync=pool=>{for(const pr of pool)if(pr.active)pr.mesh.position.set(L2X(pr.x),0.5,L2Z(pr.y));};
  sync(pProj);sync(eProj);sync(iProj);
}
