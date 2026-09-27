/* =========================================================================
   THE IMPOSTOR — 07-player.js
   player state + 3D billboard sprite
   Classic script (no ES modules): loaded in HTML order, shares the
   global scope with all other js/* modules. Keep load order stable.
   ========================================================================= */
/* ---------------- player ---------------- */
const player={x:VW/2,y:VH*0.68,r:30,radius:30,
  hp:100,maxHp:100,speed:220,shootCd:0,dead:false,invulnT:0,
  vx:0,vy:0,dxFrame:0,dyFrame:0};
let playerSprite3d=null,playerTexDirty=false,userTex=null;

function ensurePlayerSprite(){
  if(playerSprite3d){
    if(playerTexDirty){userTex.needsUpdate=true;playerTexDirty=false;}
    return;
  }
  if(!offCanvas.width)return;
  userTex=new THREE.CanvasTexture(offCanvas);
  userTex.encoding=THREE.sRGBEncoding;
  const mat=new THREE.SpriteMaterial({map:userTex,color:0xcfe3ee,transparent:true,opacity:0.85,depthWrite:false,fog:false});
  playerSprite3d=new THREE.Sprite(mat);
  const h=3.3, w=h*(offCanvas.width/offCanvas.height);
  playerSprite3d.scale.set(w,h,1);
  playerSprite3d.center.set(0.5,0);
  playerSprite3d._baseY=0.55;
  playerSprite3d.position.set(0,playerSprite3d._baseY,6.35);
  playerSprite3d.renderOrder=2;
  scene.add(playerSprite3d);
}
