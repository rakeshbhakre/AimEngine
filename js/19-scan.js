/* =========================================================================
   THE IMPOSTOR — 19-scan.js
   scanning intro sequence
   Classic script (no ES modules): loaded in HTML order, shares the
   global scope with all other js/* modules. Keep load order stable.
   ========================================================================= */
/* ---------------- scanning intro ---------------- */
function runScanSequence(done){
  state=GS.SCANNING;
  const t=$('scan-text'),sub=$('scan-sub'),line=$('scan-gate');
  const bars=document.querySelectorAll('.scan-bars i');
  const steps=[
    [400,()=>{t.childNodes[0].textContent="INITIALIZING...";}],
    [1400,()=>{line.classList.add('go');sub.textContent="OPTICAL FEED: LOCKED";}],
    [2500,()=>{t.childNodes[0].textContent="SUBJECT DETECTED";bars[0].classList.add('on');bars[1].classList.add('on');}],
    [3600,()=>{t.childNodes[0].textContent="BEHAVIORAL BASELINE: NULL";bars[2].classList.add('on');bars[3].classList.add('on');$('profile-panel').style.display='block';}],
    [4700,()=>{line.classList.remove('go');line.classList.add('go');t.childNodes[0].textContent="GAME INITIALIZED";bars[4].classList.add('on');sub.textContent="WASD — MOVE · MOUSE — AIM · CLICK — FIRE";}],
    [5800,()=>{$('scan-overlay').style.display='none';done();}]
  ];
  if(CONFIG.DEBUG_MODE||!camOn)
    sub.textContent=CONFIG.DEBUG_MODE?"DEBUG MODE — SYNTHETIC SUBJECT":"CAMERA UNAVAILABLE — SYNTHETIC SUBJECT";
  steps.forEach(s=>setTimeout(s[1],s[0]));
}
