/* =========================================================================
   THE IMPOSTOR — 08-particles.js
   particle pool + spawnParticles
   Classic script (no ES modules): loaded in HTML order, shares the
   global scope with all other js/* modules. Keep load order stable.
   ========================================================================= */
/* ---------------- particles (3D sprites) ---------------- */
const particles=[];
function spawnParticles(lx,ly,hex,n,spd){
  for(let i=0;i<n;i++){
    let p=particles.find(q=>!q.active);
    if(!p){
      if(particles.length>150)return;
      p={active:false,
        spr:new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,transparent:true,
          blending:THREE.AdditiveBlending,depthWrite:false,fog:false})),
        vx:0,vy:0,vz:0,life:0,maxLife:1};
      scene.add(p.spr);
      particles.push(p);
    }
    p.active=true;p.life=p.maxLife=rand(0.3,0.8);
    const a=Math.random()*Math.PI*2,s=rand(spd*0.3,spd)/U;
    p.vx=Math.cos(a)*s;p.vz=Math.sin(a)*s;p.vy=rand(0.8,2.4);
    p.spr.material.color.setHex(hex);
    p.spr.material.opacity=1;
    p.spr.position.set(L2X(lx),0.5,L2Z(ly));
    const sc=rand(0.15,0.4);
    p.spr.scale.set(sc,sc,1);
    p.spr.visible=true;
  }
}
function updateParticles(dt){
  for(const p of particles){
    if(!p.active)continue;
    p.life-=dt;
    if(p.life<=0){p.active=false;p.spr.visible=false;continue;}
    p.vy-=6*dt;
    if(p.spr.position.y<0.04)p.vy*=-0.4;
    p.spr.position.x+=p.vx*dt;p.spr.position.y+=p.vy*dt;p.spr.position.z+=p.vz*dt;
    p.spr.material.opacity=Math.max(0,p.life/p.maxLife);
  }
}
