/* =========================================================================
   THE IMPOSTOR — 21-boot.js
   boot: init + scan + round 1
   Classic script (no ES modules): loaded in HTML order, shares the
   global scope with all other js/* modules. Keep load order stable.
   ========================================================================= */
/* ---------------- boot ---------------- */
function setApiNote(){
  const el=$('api-note');
  const order=providerOrder().filter(n=>PROVIDERS[n]&&PROVIDERS[n].configured());
  if(!order.length){
    el.textContent="NO API KEY SET — IMPOSTOR RUNNING ON LOCAL FALLBACK MIND";
    return;
  }
  const chain=order.map(n=>PROVIDERS[n].name+" ("+PROVIDERS[n].model()+")").join(" → ");
  el.textContent="MIND: "+chain+" → LOCAL FALLBACK"+(activeAIProvider?("  ·  ACTIVE: "+activeAIProvider):"");
}
(async function boot(){
  setApiNote();
  drawFloor();
  buildPillars();
  updateHpBar();
  if(CONFIG.DEBUG_MODE){
    buildPlaceholderAvatar();
    try{$('cb-state').textContent='SYNTH';showCamBox();}catch(e){}
  }
  await initVision();
  if(!camOn&&!CONFIG.DEBUG_MODE&&offCanvas.width===0)buildPlaceholderAvatar();
  runScanSequence(()=>{beginRound(1);});
  requestAnimationFrame(loop);
})();
