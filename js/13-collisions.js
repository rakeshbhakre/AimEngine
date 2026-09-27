/* =========================================================================
   THE IMPOSTOR — 13-collisions.js
   projectile/hitbox collision pass
   Classic script (no ES modules): loaded in HTML order, shares the
   global scope with all other js/* modules. Keep load order stable.
   ========================================================================= */
/* ---------------- collisions ---------------- */
function nearestHostile(){
  let best=null,bd=1e9;
  for(const e of enemies){const d=dist2(player.x,player.y,e.x,e.y);if(d<bd){bd=d;best=e;}}
  if(impostor.active&&!impostor.dead&&!impostor.peel){
    const d=dist2(player.x,player.y,impostor.x,impostor.y);if(d<bd){bd=d;best=impostor;}
  }
  return best;
}
function eProjNearPlayer(){
  for(const pr of eProj)if(pr.active&&dist2(pr.x,pr.y,player.x,player.y)<80)return true;
  for(const pr of iProj)if(pr.active&&dist2(pr.x,pr.y,player.x,player.y)<80)return true;
  return false;
}
function sweptHit(pr,target){
  if(circleCollide(pr,target))return true;
  if(pr.px!==undefined){
    const mid={x:(pr.x+pr.px)/2,y:(pr.y+pr.py)/2,radius:pr.radius};
    return circleCollide(mid,target);
  }
  return false;
}
function checkCollisions(){
  for(const pr of pProj){
    if(!pr.active)continue;
    for(let i=enemies.length-1;i>=0;i--){
      const e=enemies[i];
      if(sweptHit(pr,e)){
        pr.active=false;pr.mesh.visible=false;
        e.hp-=pr.dmg;
        spawnParticles(pr.x,pr.y,e.color,4,90);
        if(e.hp<=0)killEnemy(e,i);else sfx.eHit();
        break;
      }
    }
    if(pr.active&&impostor.active&&!impostor.dead){
      const ib={x:impostor.x,y:impostor.y,radius:impostor.radius};
      if(sweptHit(pr,ib)){
        pr.active=false;pr.mesh.visible=false;
        impostor.hp-=pr.dmg;
        impostor._dmgAcc=(impostor._dmgAcc||0)+pr.dmg;
        spawnParticles(pr.x,pr.y,0xff1a3c,5,110);
        sfx.eHit();
        if(impostor.hp<=0)impostorDie();
      }
    }
  }
  if(!player.dead){
    const hitTest=(pr)=>{
      if(sweptHit(pr,{x:player.x,y:player.y,radius:player.r})){
        pr.active=false;pr.mesh.visible=false;
        damagePlayer(pr.dmg);
      }
    };
    for(const pr of eProj)if(pr.active)hitTest(pr);
    for(const pr of iProj)if(pr.active)hitTest(pr);
    if(impostor.active&&!impostor.dead&&
      dist2(player.x,player.y,impostor.x,impostor.y)<player.r+impostor.radius&&
      player.invulnT<=0){damagePlayer(12);}
    if(eProjNearPlayer())triggerDodgeWatch();
  }
}
