/* =========================================================================
   THE IMPOSTOR — 04-tracker.js
   behavior tracker + computeProfile
   Classic script (no ES modules): loaded in HTML order, shares the
   global scope with all other js/* modules. Keep load order stable.
   ========================================================================= */
/* ---------------- behavior tracker ---------------- */
const tracker={
  dodgeDirections:{left:0,right:0,up:0,down:0},
  dodgeDistances:[],                      // how FAR each dodge travels (px)
  quadrantTime:[0,0,0,0],                 // seconds spent in each arena quadrant
  speedSamples:[],stationarySamples:0,totalSamples:0,
  aimOffsets:[],                          // angular aim error (deg) at each shot
  wobbleSamples:[],wobbleTime:0,          // mouse movement speed (px/s) sampling
  burstShots:0,burstEvents:0,burstCooldown:0,
  lowHpShots:0,                           // of shotsFired, how many under 30hp
  reversalSamples:0,lastReversalTime:0, // zigzag rhythm timing (s)
  fireUnderFire:0,                        // shots fired within 500ms of an enemy shot
  positionSamples:[],shotsFired:0,distanceTraveled:0,
  reactionTimes:[],panicMoves:[],
  profile:{dominantDodge:null,dodgeConsistency:0,positionPreference:null,
    aggressionRatio:0,avgReactionTime:0,panicBehavior:null,patternConfidence:0,
    avgDodgeDistance:0,dominantQuadrant:null,avgSpeed:0,stationaryFraction:0,
    aimBiasX:0,aimBiasY:0,aimOffsetMag:0,handWobble:0,avgBurst:0,
    lowHpAggression:0,reversalInterval:0,firesBackRatio:0}
};
let pendingShotTime=0,lastInputKey="",posSampleTimer=0;
let dodgeWatch={active:false,until:0,dx:0,dy:0};
function triggerDodgeWatch(){
  if(dodgeWatch.active)return;
  dodgeWatch={active:true,until:now()+500,dx:0,dy:0};
}
function noteEnemyShot(){ window._lastEnemyShot=now(); if(!pendingShotTime)pendingShotTime=now(); }
function onInputChange(key){
  if(!key||key===lastInputKey)return;
  const nowT=now();
  if(lastInputKey&&tracker.lastReversalTime){
    tracker.reversalInterval=clamp(0.88*(tracker.reversalInterval||0)+0.12*(nowT-tracker.lastReversalTime),0.25,4);
    tracker.reversalSamples++;
  }
  tracker.lastReversalTime=nowT;
  lastInputKey=key;
  if(pendingShotTime){
    const rt=now()-pendingShotTime;
    if(rt>80&&rt<3000)tracker.reactionTimes.push(rt);
    pendingShotTime=0;
  }
  if(player.hp<30){
    const d=keyDir(key); if(d&&tracker.panicMoves.length<24)tracker.panicMoves.push(d);
  }
}
function keyDir(key){
  if(key==='KeyA'||key==='ArrowLeft')return'left';
  if(key==='KeyD'||key==='ArrowRight')return'right';
  if(key==='KeyW'||key==='ArrowUp')return'up';
  if(key==='KeyS'||key==='ArrowDown')return'down';
  return null;
}
function classify(dx,dy){
  if(Math.abs(dx)>Math.abs(dy))return dx>0?'right':'left';
  return dy>0?'down':'up';
}
function liveDominant(){
  const d=tracker.dodgeDirections;
  const total=d.left+d.right+d.up+d.down;
  if(total<2)return null;
  return Object.keys(d).reduce((a,b)=>d[a]>=d[b]?a:b);
}
function computeProfile(){
  const p=tracker.profile,d=tracker.dodgeDirections;
  const total=d.left+d.right+d.up+d.down;
  if(total>0){
    const dom=Object.keys(d).reduce((a,b)=>d[a]>=d[b]?a:b);
    p.dominantDodge=dom;p.dodgeConsistency=d[dom]/total;
  }
  if(tracker.dodgeDistances.length>0){
    const ds=tracker.dodgeDistances;
    p.avgDodgeDistance=ds.reduce((a,b)=>a+b,0)/ds.length;
  }
  if(tracker.positionSamples.length>0){
    const ax=tracker.positionSamples.reduce((a,b)=>a+b.x,0)/tracker.positionSamples.length;
    const ay=tracker.positionSamples.reduce((a,b)=>a+b.y,0)/tracker.positionSamples.length;
    const dc=Math.sqrt(Math.pow(ax-0.5,2)+Math.pow(ay-0.5,2));
    p.positionPreference=dc<0.16?"center":dc<0.3?"edge":"corner";
  }
  if(tracker.quadrantTime.some(q=>q>0)){
    let qi=0;for(let i=1;i<4;i++)if(tracker.quadrantTime[i]>tracker.quadrantTime[qi])qi=i;
    p.dominantQuadrant=(qi%2===0?"LEFT ":"RIGHT ")+(qi<2?"TOP":"BOTTOM");
  }
  if(tracker.reactionTimes.length>0)
    p.avgReactionTime=tracker.reactionTimes.reduce((a,b)=>a+b,0)/tracker.reactionTimes.length;
  if(tracker.totalSamples>0)p.stationaryFraction=tracker.stationarySamples/tracker.totalSamples;
  if(tracker.speedSamples.length>0)
    p.avgSpeed=tracker.speedSamples.reduce((a,b)=>a+b,0)/tracker.speedSamples.length;
  if(tracker.aimOffsets.length>0){
    const ox=tracker.aimOffsets.reduce((a,b)=>a+b.x,0)/tracker.aimOffsets.length;
    const oy=tracker.aimOffsets.reduce((a,b)=>a+b.y,0)/tracker.aimOffsets.length;
    const om=tracker.aimOffsets.reduce((a,b)=>a+b.m,0)/tracker.aimOffsets.length;
    p.aimBiasX=ox;p.aimBiasY=oy;p.aimOffsetMag=om;
  }
  if(tracker.wobbleTime>0)
    p.handWobble=tracker.wobbleSamples.reduce((a,b)=>a+b,0)/tracker.wobbleSamples.length;
  if(tracker.burstEvents>0)p.avgBurst=tracker.burstShots/tracker.burstEvents;
  p.reversalInterval=tracker.reversalInterval||0;
  if(tracker.shotsFired>0)p.lowHpAggression=tracker.lowHpShots/tracker.shotsFired;
  if(tracker.reactionTimes.length>0)p.firesBackRatio=tracker.fireUnderFire/tracker.reactionTimes.length;
  const sampleWeight=Math.min(total/10,1);
  const coverage=(tracker.dodgeDistances.length>0?0.08:0)
    +(tracker.quadrantTime.some(q=>q>0)?0.08:0)+(tracker.aimOffsets.length>0?0.08:0)
    +(tracker.burstEvents>0?0.06:0);
  p.patternConfidence=clamp(p.dodgeConsistency*0.6+sampleWeight*0.4+coverage,0,1);
  p.aggressionRatio=Math.min(tracker.shotsFired/30,1);
  if(tracker.panicMoves.length>0){
    const counts={};tracker.panicMoves.forEach(m=>counts[m]=(counts[m]||0)+1);
    p.panicBehavior=Object.keys(counts).reduce((a,b)=>counts[a]>=counts[b]?a:b);
  }
}
