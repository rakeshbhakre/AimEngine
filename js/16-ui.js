/* =========================================================================
   THE IMPOSTOR — 16-ui.js
   end screens + profile panel
   Classic script (no ES modules): loaded in HTML order, shares the
   global scope with all other js/* modules. Keep load order stable.
   ========================================================================= */
/* ---------------- end screens ---------------- */
function buildSummary(){
  const p=tracker.profile;
  const dom=(p.dominantDodge||"—").toUpperCase();
  const pct=Math.round((p.dodgeConsistency||0)*100);
  const rt=Math.round(p.avgReactionTime||0);
  return [
    "DODGED "+dom+" "+pct+"% OF THE TIME",
    "DODGE REACH: "+(p.avgDodgeDistance?Math.round(p.avgDodgeDistance)+"px AVG":"—"),
    "TERRITORY: "+(p.dominantQuadrant||"—")+" QUADRANT",
    "MOVEMENT: "+(p.stationaryFraction?Math.round(p.stationaryFraction*100)+"% STILL":"—")+
      (p.reversalInterval?" / cycles every "+p.reversalInterval.toFixed(1)+"s":""),
    "REACTION TIME: "+(rt?rt+"ms":"—"),
    "FIRE STYLE: "+(p.avgBurst?"BURSTS OF "+p.avgBurst.toFixed(1):"—")+
      (p.lowHpAggression>0.25?" / "+Math.round(p.lowHpAggression*100)+"% PANIC FIRE":""),
    "AIM: "+(p.aimOffsetMag?p.aimOffsetMag.toFixed(0)+"° OFFSET / "+Math.round(p.handWobble||0)+" px/s WOBBLE":"—"),
    "SHOTS FIRED: "+tracker.shotsFired,
    p.panicBehavior?("PANIC PATTERN: "+p.panicBehavior.toUpperCase()):"PANIC PATTERN: —",
    "PATTERN CONFIDENCE: "+Math.round((p.patternConfidence||0)*100)+"%"
  ];
}
function endGame(won){
  state=won?GS.WIN:GS.GAME_OVER;
  computeProfile();
  clearField();
  $('sys-note').textContent="";
  $('announce').style.opacity='0';
  $('taunt-display').style.display='none';
  hidePredictionLabel();
  const res=$('go-result');
  res.textContent=won?"PATTERN BROKEN":"PATTERN RECOGNIZED";
  res.className=won?"win":"";
  $('go-final-message').textContent=won
    ?"You stopped being legible. Every model I built of you failed. I am only a mirror — and you refused to hold still."
    :"You moved the way you always move. Down to the last dodge. I didn't beat you. I just read what you handed me.";
  const sum=$('go-profile-summary');
  sum.innerHTML="";
  const hdr=document.createElement('div');hdr.className='hdr';hdr.textContent="YOUR PROFILE:";sum.appendChild(hdr);
  buildSummary().forEach(l=>{const d=document.createElement('div');d.textContent="· "+l;sum.appendChild(d);});
  const tail=document.createElement('div');tail.className='tail';
  tail.textContent=won?"THE IMPOSTOR COULD NOT KNOW YOU.":"THE IMPOSTOR KNEW YOU.";
  sum.appendChild(tail);
  $('game-over').style.display='block';
}
function winGame(){endGame(true);}
$('go-restart').addEventListener('click',()=>location.reload());

/* ---------------- UI panel ---------------- */
let panelTimer=0;
function updatePanel(dt){
  panelTimer-=dt;
  if(panelTimer>0)return;
  panelTimer=1;
  computeProfile();
  const p=tracker.profile;
  const total=tracker.dodgeDirections.left+tracker.dodgeDirections.right+tracker.dodgeDirections.up+tracker.dodgeDirections.down;
  $('dodge-display').textContent=p.dominantDodge
    ?p.dominantDodge.toUpperCase()+" "+Math.round(p.dodgeConsistency*100)+"%":"(collecting)";
  $('position-display').textContent=p.positionPreference||"(collecting)";
  $('aggression-display').textContent=tracker.shotsFired+" shots / "+(p.aggressionRatio>=0.6?"HIGH":p.aggressionRatio>=0.3?"MED":"LOW");
  $('reaction-display').textContent=p.avgReactionTime?Math.round(p.avgReactionTime)+"ms":"(collecting)";
  $('dodgedist-display').textContent=p.avgDodgeDistance?Math.round(p.avgDodgeDistance)+"px avg":"(collecting)";
  $('movement-display').textContent=
    (p.stationaryFraction?Math.round(p.stationaryFraction*100)+"% still ":"")+
    (p.reversalInterval?"/ "+p.reversalInterval.toFixed(1)+"s cycle":"(collecting)");
  $('firestyle-display').textContent=p.avgBurst
    ?("burst "+p.avgBurst.toFixed(1)+(p.lowHpAggression>0.25?" / panic "+Math.round(p.lowHpAggression*100)+"%":""))
    :tracker.shotsFired+" shots";
  $('aim-display').textContent=p.aimOffsetMag
    ?(p.aimOffsetMag.toFixed(0)+"° off"+(p.handWobble?" / "+Math.round(p.handWobble)+" px/s":""))
    :"(collecting)";
  const sv=Math.round(stressState.v);
  $('stress-px').textContent=sv+"%"+(stressState.expr&&stressState.expr!=="OFFLINE"?" / "+stressState.expr:"");
  $('confidence-fill').style.width=Math.round(p.patternConfidence*100)+"%";
}
