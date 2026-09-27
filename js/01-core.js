/* =========================================================================
   THE IMPOSTOR — 01-core.js
   helpers: $, clamp, rand, dist2, now, DIRV
   Classic script (no ES modules): loaded in HTML order, shares the
   global scope with all other js/* modules. Keep load order stable.
   ========================================================================= */
/* ---------------- utils ---------------- */
const $=(id)=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rand=(a,b)=>a+Math.random()*(b-a);
const now=()=>performance.now();
const easeInOut=(t)=>t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
const dist2=(ax,ay,bx,by)=>{const dx=ax-bx,dy=ay-by;return Math.sqrt(dx*dx+dy*dy);};
function circleCollide(a,b){return dist2(a.x,a.y,b.x,b.y)<(a.radius+b.radius);}
const DIRV={left:{x:-1,y:0},right:{x:1,y:0},up:{x:0,y:-1},down:{x:0,y:1}};
