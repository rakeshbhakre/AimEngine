/* =========================================================================
   THE IMPOSTOR — 17-vision.js
   webcam segmentation + face landmarker
   Classic script (no ES modules): loaded in HTML order, shares the
   global scope with all other js/* modules. Keep load order stable.
   ========================================================================= */
/* ---------------- vision (webcam + segmentation) ---------------- */
const videoEl=$('webcam-video');
const offCanvas=document.createElement('canvas');
const octx=offCanvas.getContext('2d',{willReadFrequently:true});
let imageSegmenter=null,faceLandmarker=null,visionReady=false,camOn=false;
let segTimer=0,faceTimer=0,lastMaskClass=15;
let faceBboxBase=0,faceBaseCount=0,tensionLevel="NORMAL";
async function initVision(){
  if(CONFIG.DEBUG_MODE)return;
  try{
    const stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},facingMode:'user'}});
    videoEl.srcObject=stream;
    await new Promise(res=>{videoEl.onloadeddata=()=>res();setTimeout(res,3000);});
    await videoEl.play().catch(()=>{});
    camOn=true;
    const vision=await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm");
    imageSegmenter=await ImageSegmenter.createFromOptions(vision,{
      baseOptions:{
        modelAssetPath:"https://storage.googleapis.com/mediapipe-models/image_segmenter/deeplab_v3/float32/1/deeplab_v3.tflite",
        delegate:"GPU"},
      outputCategoryMask:true,runningMode:"VIDEO"});
    try{
      faceLandmarker=await FaceLandmarker.createFromOptions(vision,{
        baseOptions:{modelAssetPath:"https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"},
        runningMode:"VIDEO",numFaces:1,outputFaceBlendshapes:true});
    }catch(e){faceLandmarker=null;}
    visionReady=true;
    // mount the live feed into the subject cam box
    try{
      const vb=$('cb-vid');vb.insertBefore(videoEl,vb.firstChild);
      videoEl.style.display='block';
      $('cb-nosignal').style.display='none';
      $('cb-state').textContent='LIVE';
      showCamBox();
    }catch(e){}
  }catch(e){
    camOn=false;visionReady=false;
    try{$('cb-state').textContent='SYNTH';showCamBox();}catch(err){}
  }
}
function buildPlaceholderAvatar(){
  offCanvas.width=160;offCanvas.height=220;
  octx.clearRect(0,0,160,220);
  octx.fillStyle="rgba(190,205,216,1)";
  octx.beginPath();octx.arc(80,52,34,0,Math.PI*2);octx.fill();
  octx.beginPath();
  octx.moveTo(30,220);octx.quadraticCurveTo(30,110,80,104);
  octx.quadraticCurveTo(130,110,130,220);octx.closePath();octx.fill();
}
function getPlayerSourceCanvas(){return offCanvas;}
function runSegmentation(){
  if(!visionReady||!imageSegmenter||videoEl.readyState<2)return;
  if(videoEl.videoWidth===0)return;
  try{
    const res=imageSegmenter.segmentForVideo(videoEl,now());
    if(!res||!res.categoryMask)return;
    const mask=res.categoryMask;
    const mw=mask.width,mh=mask.height;
    if(offCanvas.width!==mw||offCanvas.height!==mh){offCanvas.width=mw;offCanvas.height=mh;}
    octx.save();octx.clearRect(0,0,mw,mh);
    octx.translate(mw,0);octx.scale(-1,1);
    octx.drawImage(videoEl,0,0,mw,mh);
    octx.restore();
    const frame=octx.getImageData(0,0,mw,mh);
    const fd=frame.data;
    let md;
    try{md=mask.getAsUint8Array();}
    catch(err){
      const f=mask.getAsFloat32Array();
      md=new Uint8Array(f.length);
      for(let i=0;i<f.length;i++)md[i]=f[i];
    }
    if(lastMaskClass===null||faceBaseCount<3){
      const hist={};
      for(let i=0;i<md.length;i+=7){const v=md[i];if(v>0)hist[v]=(hist[v]||0)+1;}
      const keys=Object.keys(hist);
      if(keys.length)lastMaskClass=+keys.reduce((a,b)=>hist[a]>hist[b]?a:b);
    }
    const pc=lastMaskClass;
    for(let y=0;y<mh;y++){
      const row=y*mw;
      for(let x=0;x<mw;x++){
        if(md[row+(mw-1-x)]!==pc)fd[(row+x)*4+3]=0;
      }
    }
    octx.putImageData(frame,0,0);
    if(mask.close)try{mask.close();}catch(e){}
    if(res.close)try{res.close&&res.close();}catch(e){}
    if(playerSprite3d){
      const h=3.3;
      playerSprite3d.scale.set(h*(mw/mh),h,1);
    }
    playerTexDirty=true;
  }catch(e){}
}
function runFace(){
  if(!faceLandmarker||videoEl.readyState<2)return;
  try{
    const res=faceLandmarker.detectForVideo(videoEl,now());
    const lm=res&&res.faceLandmarks&&res.faceLandmarks[0];
    if(!lm){
      stressState.noFace=true;
      tensionLevel="NORMAL";spawnTensionMult=1;
      return;
    }
    stressState.noFace=false;
    let minX=1,maxX=0,minY=1,maxY=0;
    for(const p of lm){if(p.x<minX)minX=p.x;if(p.x>maxX)maxX=p.x;if(p.y<minY)minY=p.y;if(p.y>maxY)maxY=p.y;}
    const scale=Math.sqrt((maxX-minX)*(maxY-minY));
    if(faceBaseCount<60){faceBboxBase=faceBboxBase*0.9+scale*0.1;faceBaseCount++;tensionLevel="NORMAL";spawnTensionMult=1;}
    else{
      const ratio=scale/(faceBboxBase||0.0001);
      faceBboxBase=faceBboxBase*0.997+scale*0.003;
      if(ratio>1.12){tensionLevel="HIGH";spawnTensionMult=0.85;}
      else if(ratio<0.90){tensionLevel="LOW";spawnTensionMult=1.15;}
      else{tensionLevel="NORMAL";spawnTensionMult=1;}
    }
    // expression blendshapes (AR blendshape kit)
    const bs=(res.faceBlendshapes&&res.faceBlendshapes[0]&&res.faceBlendshapes[0].categories)||null;
    if(bs){
      const g=n=>{const c=bs.find(q=>q.categoryName===n);return c?c.score:0;};
      const s=stressState;
      s.smile=s.smile*0.72+(g('mouthSmileLeft')+g('mouthSmileRight'))*0.5*0.28;
      s.jawOpen=s.jawOpen*0.72+g('jawOpen')*0.28;
      s.innerBrow=s.innerBrow*0.72+g('browInnerUp')*0.28;
      const bd=(g('browDownLeft')+g('browDownRight'))*0.5;
      const sq=(g('eyeSquintLeft')+g('eyeSquintRight'))*0.5;
      s.browDown=s.browDown*0.72+bd*0.28;
      s.squint=s.squint*0.72+sq*0.28;
      s.brow=clamp(bd*0.6+sq*0.4,0,1);
    }
    // fidget energy: nose-tip velocity between frames
    if(lm[1]){
      const px=lm[1].x,py=lm[1].y;
      if(stressState._np)
        stressState.faceJitter=stressState.faceJitter*0.86+
          Math.sqrt((px-stressState._np.x)*(px-stressState._np.x)+(py-stressState._np.y)*(py-stressState._np.y))*700*0.14;
      stressState._np={x:px,y:py};
    }
  }catch(e){}
}
