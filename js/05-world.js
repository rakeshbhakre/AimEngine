/* =========================================================================
   THE IMPOSTOR — 05-world.js
   THREE scene: renderer, bloom, floor, walls, floaters, stars
   Classic script (no ES modules): loaded in HTML order, shares the
   global scope with all other js/* modules. Keep load order stable.
   ========================================================================= */
/* =========================================================================
   THREE.JS RENDER LAYER
   ========================================================================= */
if(typeof THREE==='undefined'){
  $('fatal').style.display='block';
  $('fatal').textContent='FAILED TO LOAD THREE.JS FROM CDN. CHECK INTERNET CONNECTION.';
  throw new Error('THREE missing');
}
const L2X=(lx)=>(lx-VW/2)/U;         // logical → world x
const L2Z=(ly)=>(ly-VH/2)/U;         // logical → world z
const X2L=(wx)=>wx*U+VW/2;
const Z2L=(wz)=>wz*U+VH/2;

const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
renderer.setSize(innerWidth,innerHeight);
renderer.setClearColor(0x050508);
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.1;
$('game-container').appendChild(renderer.domElement);

const scene=new THREE.Scene();
scene.fog=new THREE.Fog(0x050508,20,46);
const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,0.1,120);
camera.position.set(0,9.5,12);
camera.lookAt(0,1,0);

const composer=new THREE.EffectComposer(renderer);
composer.addPass(new THREE.RenderPass(scene,camera));
const bloomPass=new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),0.55,0.4,0.28);
composer.addPass(bloomPass);

/* lights */
scene.add(new THREE.AmbientLight(0x2a3048,0.9));
const playerLight=new THREE.PointLight(0xd8ecf5,0.5,14);
playerLight.position.set(0,2.6,5.6);
scene.add(playerLight);
const impostorLight=new THREE.PointLight(0xff1a3c,0,12);
scene.add(impostorLight);

/* floor: canvas texture (grid + polygons re-rendered per round) */
const floorCanvas=document.createElement('canvas');
floorCanvas.width=1024;floorCanvas.height=640;
const fctx=floorCanvas.getContext('2d');
const floorTex=new THREE.CanvasTexture(floorCanvas);
floorTex.encoding=THREE.sRGBEncoding;
const floorMesh=new THREE.Mesh(
  new THREE.PlaneGeometry((VW/U),(VH/U)),
  new THREE.MeshBasicMaterial({map:floorTex,fog:true}));
floorMesh.rotation.x=-Math.PI/2;
scene.add(floorMesh);
function drawFloor(){
  const w=floorCanvas.width,h=floorCanvas.height;
  fctx.fillStyle='#06070c';fctx.fillRect(0,0,w,h);
  const op=round>=3?1.0:round===2?0.75:0.55;
  fctx.lineWidth=1;
  const sx=w/(VW/60), sy=h/(VH/60);
  const ax=40*(w/VW), ay=40*(h/VH), aw=(arena.w)*(w/VW), ah=(arena.h)*(h/VH);
  // hexagonal battle tiles
  fctx.strokeStyle='rgba(28,42,70,'+op+')';
  fctx.beginPath();
  const HS=16;
  const qN=Math.ceil(w/(HS*1.5))+1, rN=Math.ceil(h/(HS*0.866*2))+1;
  for(let q=0;q<qN;q++)for(let r=0;r<=rN;r++){
    const cx=q*1.5*HS+HS, cy=(2*r+(q%2))*HS*0.866;
    if(cy<-HS||cy>h+HS)continue;
    for(let k=0;k<7;k++){
      const an=Math.PI/3*k+Math.PI/6;
      const px=cx+HS*Math.cos(an),py=cy+HS*Math.sin(an);
      k===0?fctx.moveTo(px,py):fctx.lineTo(px,py);
    }
  }
  fctx.stroke();
  // reactor glyph at the arena core
  const gx=(VW/2)/VW*w, gy=330/VH*h;
  fctx.strokeStyle='rgba(42,255,200,'+(op*0.55)+')';
  fctx.beginPath();fctx.arc(gx,gy,26,0,Math.PI*2);fctx.stroke();
  fctx.beginPath();
  for(let k=0;k<8;k++){
    const an=k/8*Math.PI*2;
    fctx.moveTo(gx+Math.cos(an)*30,gy+Math.sin(an)*30);
    fctx.lineTo(gx+Math.cos(an)*37,gy+Math.sin(an)*37);
  }
  fctx.stroke();
  fctx.strokeStyle='rgba(0,255,136,0.2)';
  fctx.strokeRect(ax,ay,aw,ah);
  if(round>=2){
    const a=round>=3?0.20:0.10;
    fctx.strokeStyle='rgba(74,74,122,'+a+')';
    const polys=[
      [[0.12,0.2],[0.3,0.13],[0.36,0.3],[0.2,0.36],[0.1,0.3]],
      [[0.75,0.12],[0.9,0.2],[0.84,0.36],[0.68,0.3]],
      [[0.15,0.72],[0.3,0.66],[0.38,0.8],[0.24,0.9]],
      [[0.7,0.7],[0.88,0.68],[0.92,0.85],[0.74,0.88]]
    ];
    polys.forEach(p=>{
      fctx.beginPath();
      fctx.moveTo(p[0][0]*w,p[0][1]*h);
      const n=round>=3?p.length:p.length-1;
      for(let k=1;k<n;k++)fctx.lineTo(p[k][0]*w,p[k][1]*h);
      if(round>=3)fctx.closePath();
      fctx.stroke();
    });
  }
  floorTex.needsUpdate=true;
}

/* walls: rise as the world materializes */
const wallCfg={1:{h:0.35,o:0.18},2:{h:0.85,o:0.45},3:{h:1.5,o:0.8}};
const walls=[];
{
  const wallMat=()=>new THREE.MeshBasicMaterial({color:0x0a0d16,transparent:true,opacity:0.2,fog:true});
  const edgeMat=()=>new THREE.MeshBasicMaterial({color:0x00ff88,transparent:true,opacity:0.25,fog:false});
  const defs=[
    {w:arena.w/U,z:L2Z(arena.y),          x:0,                 rot:0, horiz:true },
    {w:arena.w/U,z:L2Z(arena.y+arena.h),  x:0,                 rot:0, horiz:true },
    {w:arena.h/U,x:L2X(arena.x),          z:0,                 rot:Math.PI/2, horiz:false },
    {w:arena.h/U,x:L2X(arena.x+arena.w),  z:0,                 rot:Math.PI/2, horiz:false }
  ];
  defs.forEach(d=>{
    const seg=new THREE.Group();
    const body=new THREE.Mesh(new THREE.BoxGeometry(d.w,1,0.08),wallMat());
    const edge=new THREE.Mesh(new THREE.BoxGeometry(d.w,0.035,0.03),edgeMat());
    seg.add(body,edge);
    // flickering charge marks along each wall — turn red when the copy is loose
    const marks=[];
    for(let k=0;k<4;k++){
      const mk=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.055,0.025),edgeMat());
      mk.position.set((k-1.5)*d.w*0.22,0.14,0.03);
      mk.userData.ph=k*2.1+d.w;
      marks.push(mk);seg.add(mk);
    }
    if(d.horiz){seg.position.set(d.x,0,d.z);}
    else{seg.position.set(d.x,0,d.z);seg.rotation.y=d.rot;}
    scene.add(seg);
    walls.push({seg,body,edge,h:0.35,marks});
  });
}
function updateWalls(dt){
  const cfg=wallCfg[round]||wallCfg[1];
  const hostile=impostor.active&&!impostor.dead;
  for(const w of walls){
    w.h+=(cfg.h-w.h)*dt*1.5;
    w.body.scale.y=Math.max(0.01,w.h);
    w.body.position.y=w.h/2;
    w.edge.position.y=w.h;
    w.body.material.opacity+=(cfg.o-w.body.material.opacity)*dt*1.5;
    w.edge.material.opacity=w.body.material.opacity+0.1;
    w.edge.material.color.setHex(hostile?0xff2a4c:0x00ff88);
    w.marks.forEach(m=>{
      m.position.y=w.h*0.55;
      m.material.opacity=0.10+0.10*Math.sin(simTime*4+m.userData.ph)+(hostile?0.08:0);
      m.material.color.setHex(hostile?0xff2a4c:0x00ff88);
    });
  }
}

/* void floaters: ambient dark geometry outside the arena */
const floaters=[];
{
  const geos=[new THREE.OctahedronGeometry(0.5),new THREE.TetrahedronGeometry(0.55),new THREE.IcosahedronGeometry(0.42)];
  for(let i=0;i<16;i++){
    const m=new THREE.Mesh(geos[i%3],new THREE.MeshBasicMaterial({color:i%2?0x141828:0x1a1220,wireframe:i%3===0,transparent:true,opacity:0.55,fog:true}));
    const a=Math.random()*Math.PI*2, r=13+Math.random()*9;
    m.position.set(Math.cos(a)*r, 0.8+Math.random()*6, Math.sin(a)*r*0.8);
    m.userData={rs:rand(0.1,0.5),fs:rand(0.2,0.7),ph:rand(0,6),y:m.position.y};
    scene.add(m);
    floaters.push(m);
  }
}
const floaterCount={1:5,2:10,3:16};
function updateFloaters(dt){
  const n=floaterCount[round]||5;
  floaters.forEach((f,i)=>{
    f.visible=i<n;
    if(!f.visible)return;
    f.rotation.x+=dt*f.userData.rs;f.rotation.y+=dt*f.userData.rs*0.7;
    f.position.y=f.userData.y+Math.sin(simTime*f.userData.fs+f.userData.ph)*0.35;
  });
}
