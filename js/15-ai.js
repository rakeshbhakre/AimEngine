/* =========================================================================
   THE IMPOSTOR — 15-ai.js
   between-rounds AI: providers + fallback mind + endRound
   Classic script (no ES modules): loaded in HTML order, shares the
   global scope with all other js/* modules. Keep load order stable.
   ========================================================================= */
/* ---------------- round end / AI ---------------- */
function checkRoundEnd(dt){
  roundTimeLeft-=dt;
  $('round-timer').textContent=Math.max(0,Math.ceil(roundTimeLeft))+"s";
  if(roundTimeLeft<=0)startRoundEnd();
}
function startRoundEnd(){
  if(state!==GS.PLAYING)return;
  state=GS.ROUND_END;
  computeProfile();
  if(round>=3){winGame();return;}
  aiThinking();
}
async function aiThinking(){
  state=GS.AI_THINKING;
  const td=$('taunt-display');
  $('taunt-source').textContent="SYSTEM";
  $('taunt-text').textContent="IMPOSTOR ANALYZING...";
  td.classList.add('pulse');td.style.display='block';
  sfx.ominous();
  let cfg;
  try{cfg=await callImpostorAI(round+1,tracker.profile);}
  catch(e){cfg=getDefaultImpostorConfig(round+1,tracker.profile);}
  if(!cfg||!VALID_STRATS[cfg.strategy])cfg=getDefaultImpostorConfig(round+1,tracker.profile);
  aiConfig=cfg;
  td.classList.remove('pulse');
  state=GS.TAUNT;
  $('taunt-source').textContent="THE IMPOSTOR"+(cfg._provider?(" · MIND: "+cfg._provider):"");
  let tauntTxt=cfg.taunt||"I have seen enough.";
  if(stressN>80){
    tauntTxt+="  ·  Your vitals betrayed you. Stress peaked at "+Math.round(stressPeak)+"%"+
      (stressState.expr&&stressState.expr!=='OFFLINE'?(" — and you wore "+stressState.expr.toLowerCase()+" on your face."):".");
  }
  $('taunt-text').textContent=tauntTxt;
  lastAITaunt=tauntTxt;
  setTimeout(()=>{td.style.display='none';beginRound(round+1);},4200);
}

/* ---------------- AI providers ---------------- */
function keyIsSet(k){return k&&k.indexOf("YOUR_")!==0;}
let activeAIProvider=null;
async function fetchJSON(url,opts,timeoutMs){
  const ctrl=new AbortController();
  const to=setTimeout(()=>ctrl.abort(),timeoutMs||12000);
  try{
    const res=await fetch(url,Object.assign({},opts,{signal:ctrl.signal}));
    if(!res.ok)throw new Error("HTTP "+res.status);
    return await res.json();
  }finally{clearTimeout(to);}
}
function openAIStyleContent(data){
  const msg=data&&data.choices&&data.choices[0]&&data.choices[0].message;
  if(!msg)return"";
  if(typeof msg.content==="string")return msg.content;
  if(Array.isArray(msg.content))return msg.content.map(c=>(c&&c.text)||"").join("");
  return"";
}
const PROVIDERS={
  omniai:{
    name:"OMNI AI",
    configured:()=>keyIsSet(CONFIG.OMNIAI_API_KEY),
    model:()=>CONFIG.OMNIAI_MODEL,
    call:(system,user)=>fetchJSON("https://api.ideamart.io/omniai/api/v1/chat/completions",{
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":CONFIG.OMNIAI_API_KEY},
      body:JSON.stringify({
        model:CONFIG.OMNIAI_MODEL,max_tokens:450,temperature:0.8,
        messages:[{role:"system",content:system},{role:"user",content:user}]
      })
    },12000).then(openAIStyleContent)
  },
  openrouter:{
    name:"OPENROUTER",
    configured:()=>keyIsSet(CONFIG.OPENROUTER_API_KEY),
    model:()=>CONFIG.OPENROUTER_MODEL,
    call:(system,user)=>fetchJSON("https://openrouter.ai/api/v1/chat/completions",{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization":"Bearer "+CONFIG.OPENROUTER_API_KEY,
        "HTTP-Referer":(typeof location!=="undefined"&&location.origin&&location.origin!=="null")?location.origin:"https://the-impostor.local",
        "X-Title":"THE IMPOSTOR"
      },
      body:JSON.stringify({
        model:CONFIG.OPENROUTER_MODEL,max_tokens:450,temperature:0.8,
        messages:[{role:"system",content:system},{role:"user",content:user}]
      })
    },12000).then(openAIStyleContent)
  },
  anthropic:{
    name:"ANTHROPIC",
    configured:()=>keyIsSet(CONFIG.ANTHROPIC_API_KEY),
    model:()=>CONFIG.ANTHROPIC_MODEL,
    call:(system,user)=>fetchJSON("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "x-api-key":CONFIG.ANTHROPIC_API_KEY,
        "anthropic-version":"2023-06-01",
        "anthropic-dangerous-direct-browser-calls":"true"
      },
      body:JSON.stringify({
        model:CONFIG.ANTHROPIC_MODEL,max_tokens:450,
        system:system,
        messages:[{role:"user",content:user}]
      })
    },12000).then(d=>((d.content&&d.content[0]&&d.content[0].text)||""))
  }
};
const VALID_STRATS={observe:1,mirror:1,exploit_dodge:1,exploit_position:1,bait:1,ambush:1,predict_and_intercept:1};
function parseConfigFromText(text){
  if(!text)return null;
  const t=String(text).replace(/```json|```/g,"").trim();
  let m=null;
  try{m=JSON.parse(t);}catch(e){
    const a=t.indexOf("{"),b=t.lastIndexOf("}");
    if(a>=0&&b>a){try{m=JSON.parse(t.slice(a,b+1));}catch(e2){return null;}}
    else return null;
  }
  if(!m||typeof m!=="object"||!VALID_STRATS[m.strategy])return null;
  m.difficulty=clamp(parseFloat(m.difficulty)||0.7,0,1);
  m.spawnRate=clamp(parseFloat(m.spawnRate)||0.7,0.3,1);
  m.impostorSpeed=clamp(parseFloat(m.impostorSpeed)||160,120,220);
  if(typeof m.taunt!=="string")m.taunt="";
  if(typeof m.prediction!=="string")m.prediction="";
  return m;
}
function providerOrder(){
  if(CONFIG.PROVIDER&&CONFIG.PROVIDER!=="auto")
    return CONFIG.PROVIDER==="local"?[]:[CONFIG.PROVIDER];
  return["omniai","openrouter","anthropic"];
}
async function callImpostorAI(nextRound,profile){
  const systemPrompt=`You are the Impostor — an AI entity that has been watching a player and learning their behavioral patterns. You speak in cold, precise, clinical language. You are not evil. You are a mirror.

You receive a behavioral profile of the player and must:
1. Choose the best Impostor strategy for the next round
2. Generate a short taunt (1-3 sentences) that references specific data from their profile
3. Set difficulty parameters

Respond ONLY with valid JSON. No explanation. No markdown. No prose outside the JSON.`;
  const userPrompt=`Round ${nextRound-1} just ended. Here is the player's behavioral profile:

${JSON.stringify(profile,null,2)}

Raw stats: shots fired ${tracker.shotsFired}, distance traveled ${Math.round(tracker.distanceTraveled)}px, reaction samples ${tracker.reactionTimes.length}, panic behavior ${profile.panicBehavior||'none recorded'}. Physiology (live face monitoring): stress averaged ${stressN?Math.round(stressSum/stressN):0}% and peaked at ${Math.round(stressPeak)}%, current expression ${stressState.expr}${!camOn?' (camera offline — inferred from input patterns only)':''}. Movement rhythm: reverses direction every ${(profile.reversalInterval||0).toFixed(2)}s (${tracker.reversalSamples} samples). Fire style: avg burst length ${(profile.avgBurst||0).toFixed(1)} shots, ${Math.round((profile.lowHpAggression||0)*100)}% of shots fired while below 30hp, fires back within 500ms of incoming fire ${Math.round((profile.firesBackRatio||0)*100)}% of the time. Stillness: stands still ${Math.round((profile.stationaryFraction||0)*100)}% of the time, avg move speed ${Math.round(profile.avgSpeed||0)}px/s. Territory: dominant quadrant ${profile.dominantQuadrant||'n/a'}. Dodge physics: covers avg ${Math.round(profile.avgDodgeDistance||0)}px per dodge. Aim: offset ${(profile.aimOffsetMag||0).toFixed(1)}deg bias (${(profile.aimBiasX||0).toFixed(2)}, ${(profile.aimBiasY||0).toFixed(2)}), mouse wobble ${Math.round(profile.handWobble||0)}px/s — high wobble = panic tracking.

Respond with this exact JSON structure:
{
  "strategy": "one of: observe | mirror | exploit_dodge | exploit_position | bait | ambush | predict_and_intercept",
  "prediction": "what you predict the player will do next round (one short phrase)",
  "taunt": "your message to the player (1-3 sentences, cold, precise, references their actual data)",
  "difficulty": 0.75,
  "spawnRate": 0.6,
  "impostorSpeed": 170,
  "worldState": "one of: sparse | materializing | confrontation"
}

Rules for choosing strategy:
- Round 2, low confidence: use "mirror"
- Round 2, high dodge consistency: use "exploit_dodge" (also favored when dodge distance data exists — lead targets by it)
- Round 2, position preference = edge/corner OR strong dominant quadrant: use "exploit_position"
- Round 2, high aggression OR burst length > 3 OR high low-hp aggression: use "bait"
- Round 2, high reaction time (slow) OR stationary fraction > 40%: use "ambush"
- Round 3: always use "predict_and_intercept" regardless of other factors
- Reference the new data in your taunt when it's striking (rhythm seconds, burst length, stillness %)
- difficulty: 0.0-1.0, based on how well the player performed
- spawnRate: 0.3-1.0 (multiplier on base spawn timing)
- impostorSpeed: 120-220 (pixels per second)`;
  for(const name of providerOrder()){
    const p=PROVIDERS[name];
    if(!p||!p.configured())continue;
    try{
      const text=await p.call(systemPrompt,userPrompt);
      const cfg=parseConfigFromText(text);
      if(cfg){
        cfg._provider=p.name;
        activeAIProvider=p.name;
        setApiNote();
        return cfg;
      }
    }catch(e){/* try next */}
  }
  activeAIProvider=null;
  setApiNote();
  return getDefaultImpostorConfig(nextRound,profile);
}
function getDefaultImpostorConfig(nextRound,profile){
  const strategies={
    2:(profile.dodgeConsistency||0)>0.6?"exploit_dodge":"mirror",
    3:"predict_and_intercept"
  };
  return{
    strategy:strategies[nextRound]||"mirror",
    prediction:profile.dominantDodge?("dodge "+profile.dominantDodge):"unknown",
    taunt:nextRound===2
      ?"I've been watching you. Your patterns are becoming clear."
      :"I know how you move. I know how you think. Prove me wrong.",
    difficulty:0.7,spawnRate:0.7,impostorSpeed:160,
    worldState:nextRound===2?"materializing":"confrontation"
  };
}
