const P="assets/portraits/vereadores/";
const fighters=[
{name:"Afonsinho",abbr:"AF",portrait:P+"afonsinho.png",c:"#355d9a",power:"Força Incomparável",type:"power",stats:[92,68,84]},
{name:"Donizete",abbr:"DZ",portrait:P+"donizete.png",c:"#6a4a43",power:"Fala Supersônica",type:"sonic",stats:[76,88,74]},
{name:"Alan Matias",abbr:"AM",portrait:P+"alan-matias.png",c:"#2f5f82",power:"Super Chute",type:"kick",stats:[86,88,72]},
{name:"Batoré",abbr:"BT",portrait:P+"batore.png",c:"#704438",power:"Bola de Futebol",type:"ball",stats:[82,78,78]},
{name:"Kleber do Cavaco",abbr:"KC",portrait:P+"kleber-do-cavaco.png",c:"#694f83",power:"Cavaco",type:"cavaco",stats:[76,84,80]},
{name:"Dr. Anderson Veterinário",abbr:"AV",portrait:P+"dr-anderson-veterinario.png",c:"#586754",power:"Cães de Guarda",type:"dogs",stats:[84,72,86]},
{name:"Edson Mota",abbr:"EM",portrait:P+"edson-mota.png",c:"#446b86",power:"Kickboxing Afiado",type:"kickbox",stats:[88,86,74]},
{name:"Guilherme do Salão",abbr:"GS",portrait:P+"guilherme-do-salao.png",c:"#604a78",power:"Tesourada",type:"scissors",stats:[80,88,72]},
{name:"Jair do Bar",abbr:"JB",portrait:P+"jair-do-bar.png",c:"#7b6748",power:"Galão d'Água",type:"water",stats:[82,70,84]},
{name:"Marcinho",abbr:"MC",portrait:P+"marcinho.png",c:"#3f6885",power:"Processo Administrativo",type:"process",stats:[76,84,80]},
{name:"Ronaldo da Comissão",abbr:"RC",portrait:P+"ronaldo-da-comissao.png",c:"#5d4a78",power:"Peso Pesado",type:"dumbbell",stats:[92,66,86]},
{name:"Rony",abbr:"RN",portrait:P+"rony.png",c:"#365f80",power:"Galão d'Água",type:"water",stats:[82,82,78]},
{name:"Tinho",abbr:"TH",portrait:P+"tinho.png",c:"#45644e",power:"Super Chute",type:"kick",stats:[88,74,82]},
{name:"Topete",abbr:"TP",portrait:P+"topete.png",c:"#6c5a37",power:"Giro Descontrolado",type:"spin",stats:[80,94,70]},
{name:"Xuxa",abbr:"XX",portrait:P+"xuxa.png",c:"#6c523d",power:"Chicote de Cabelo",type:"hair",stats:[78,90,72]}
];
const maps=[
{id:"paco",name:"Paço Municipal",subtitle:"Centro de Cubatão",src:"assets/maps/paco-municipal.svg"},
{id:"deck",name:"Deck da Orla",subtitle:"Orla de Cubatão",src:"assets/maps/deck-orla.svg"},
{id:"arena",name:"Arena Esportiva",subtitle:"Centro Esportivo",src:"assets/maps/arena-esportiva.svg"}
];

/* Frame data em 60 FPS: startup / active / recovery. */
const MOVE_DATA={
  punch:{startup:5,active:3,recovery:9,damage:6,reach:8.2,hitstun:10,blockstun:6,hitstop:3,knockback:.9,cancelStart:6,cancelEnd:11},
  kick:{startup:8,active:4,recovery:13,damage:9,reach:11.2,hitstun:14,blockstun:8,hitstop:5,knockback:1.45,cancelStart:9,cancelEnd:14},
  special:{startup:10,active:8,recovery:18,damage:18,reach:64,hitstun:20,blockstun:11,hitstop:7,knockback:3.2,cancelStart:0,cancelEnd:0}
};
const FRAME_MS=1000/60, BUFFER_FRAMES=8, QCF_WINDOW=420, DOUBLE_TAP_MS=185;

let selected=0,selectedMap=0,enemy=1,gameMode="quick";
let state=null,loop=null,clock=null,paused=false,keys={};
let tournament={active:false,round:0,opponents:[]};
let inputHistory=[],inputQueue=[];
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];

function avatar(f){
  return `<div class="avatar photo-avatar" style="--c:${f.c}"><img src="${f.portrait}" alt="${f.name}"><span class="portrait-glow"></span></div>`;
}
function renderRoster(){
  $("#roster").innerHTML=fighters.map((f,i)=>`<button class="char ${i===selected?"active":""}" data-i="${i}">${avatar(f)}<b>${f.name}</b><small>ESPECIAL: ${f.power}</small></button>`).join("");
  $$(".char").forEach(b=>b.onclick=()=>{selected=+b.dataset.i;renderRoster()});
  const f=fighters[selected];
  $("#selectedCard").innerHTML=`<div class="big-avatar">${avatar(f)}</div><div class="card-info"><small>LUTADOR SELECIONADO</small><h3>${f.name}</h3><p>ESPECIAL: <b>${f.power}</b></p><div class="stats">${["FORÇA","AGILIDADE","DEFESA"].map((x,i)=>`<div class="stat"><span>${x}</span><div class="bar"><i style="width:${f.stats[i]}%"></i></div></div>`).join("")}</div></div>`;
}
function renderMaps(){
  $("#mapGrid").innerHTML=maps.map((m,i)=>`<button class="map-card ${i===selectedMap?"active":""}" data-map="${i}"><img src="${m.src}" alt="${m.name}"><span><b>${m.name}</b><small>${m.subtitle}</small></span></button>`).join("");
  $$(".map-card").forEach(b=>b.onclick=()=>{selectedMap=+b.dataset.map;renderMaps()});
  $("#mapInfo").innerHTML=`<b>${maps[selectedMap].name}</b><span>${maps[selectedMap].subtitle}</span>`;
}
function go(id){
  $$(".screen").forEach(s=>s.classList.remove("active"));$("#"+id).classList.add("active");$("#modal").classList.remove("show");
  if(id==="select")renderRoster();if(id==="maps")renderMaps();if(id!=="arena")stopGame();
}
$$("[data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));
function startMode(mode){gameMode=mode;tournament={active:false,round:0,opponents:[]};go("select")}
$("#quickModeBtn").onclick=()=>startMode("quick");$("#tournamentModeBtn").onclick=()=>startMode("tournament");$("#howPlayBtn").onclick=()=>startMode("quick");$("#fightBtn").onclick=()=>go("maps");

function pickRandomOpponent(excluded=[]){const pool=fighters.map((_,i)=>i).filter(i=>i!==selected&&!excluded.includes(i));return pool[Math.floor(Math.random()*pool.length)]}
function setupTournament(){const used=[];tournament.opponents=[];for(let i=0;i<3;i++){const o=pickRandomOpponent(used);used.push(o);tournament.opponents.push(o)}tournament.active=true;tournament.round=0}
function renderTournament(){
  const labels=["QUARTAS DE FINAL","SEMIFINAL","FINAL"];$("#tournamentTitle").innerHTML=`${labels[tournament.round]} <span>•</span>`;
  $("#bracket").innerHTML=tournament.opponents.map((idx,i)=>`<div class="bracket-round ${i<tournament.round?"done":i===tournament.round?"current":"future"}"><small>${["LUTA 1","LUTA 2","FINAL"][i]}</small><div class="bracket-match"><span>${fighters[selected].name}</span><b>VS</b><span>${fighters[idx].name}</span></div></div>`).join("")
}
function prepareVs(){
  const p1=fighters[selected],p2=fighters[enemy],m=maps[selectedMap];
  $("#vsMode").textContent=gameMode==="tournament"?"MODO TORNEIO":"LUTA SIMPLES";$("#vsP1Img").src=p1.portrait;$("#vsP2Img").src=p2.portrait;
  $("#vsP1Name").textContent=p1.name;$("#vsP2Name").textContent=p2.name;$("#vsP1Power").textContent=p1.power;$("#vsP2Power").textContent=p2.power;$("#vsArena").textContent=m.name;go("vs")
}
$("#mapConfirm").onclick=()=>{if(gameMode==="quick"){enemy=pickRandomOpponent();prepareVs()}else{if(!tournament.active)setupTournament();enemy=tournament.opponents[tournament.round];renderTournament();go("tournament")}};
$("#nextTournamentBtn").onclick=()=>prepareVs();$("#startFightBtn").onclick=()=>{go("arena");startGame()};

function propMarkup(f){
  if(f.type==="cavaco")return `<div class="fighter-prop prop-cavaco" aria-hidden="true"><span class="prop-neck"></span><span class="prop-body"><i></i></span><span class="prop-strings"></span></div>`;
  if(f.type==="scissors")return `<div class="fighter-prop prop-scissors" aria-hidden="true"><span class="scissor-ring r1"></span><span class="scissor-ring r2"></span><span class="scissor-blade b1"></span><span class="scissor-blade b2"></span></div>`;
  if(f.type==="process")return `<div class="fighter-prop prop-process" aria-hidden="true"><span>PROC.</span><i></i><i></i><i></i></div>`;
  if(f.type==="water")return `<div class="fighter-prop prop-water" aria-hidden="true"><span class="gallon-handle"></span><span class="gallon-cap"></span></div>`;
  if(f.type==="dumbbell")return `<div class="fighter-prop prop-dumbbell" aria-hidden="true"><span class="db-left"></span><span class="db-bar"></span><span class="db-right"></span></div>`;
  if(f.type==="ball")return `<div class="fighter-prop prop-ball" aria-hidden="true">⚽</div>`;
  return "";
}
function fighterMarkup(f){
  return `<div class="fighter-rig">
    <div class="leg leg-back"><span class="thigh"></span><span class="calf"></span><span class="shoe"></span></div>
    <div class="leg leg-front"><span class="thigh"></span><span class="calf"></span><span class="shoe"></span></div>
    <div class="torso"><span class="jacket-lapel lapel-left"></span><span class="jacket-lapel lapel-right"></span><span class="shirt"></span><span class="tie"></span></div>
    <div class="arm arm-back"><span class="upper"></span><span class="forearm"></span><span class="hand"></span></div>
    <div class="head"><div class="face-frame"><img src="${f.portrait}" alt="${f.name}"></div></div>
    <div class="arm arm-front"><span class="upper"></span><span class="forearm"></span><span class="hand"></span></div>
    ${propMarkup(f)}
  </div>`;
}
function makeActor(x){return {hp:100,en:0,x,y:0,vy:0,onGround:true,wins:0,stun:0,blockstun:0,block:false,move:null,combo:0,lastHit:0,dashFrames:0,dashDir:0,lastTap:{a:0,d:0},aiDelay:0}}
function setupFighter(id,f){const el=$("#"+id),sprite=el.querySelector(".sprite");el.style.setProperty("--fighter-color",f.c);el.dataset.special=f.type;el.dataset.name=f.name;sprite.innerHTML=fighterMarkup(f)}
function startGame(){
  stopGame();paused=false;keys={};inputHistory=[];inputQueue=[];
  state={p1:makeActor(13),p2:makeActor(76),round:1,time:75,over:false,frame:0,hitstop:0,lockFrames:60};
  $("#stageBg").src=maps[selectedMap].src;$("#stage").classList.add("has-map");$("#stageName").textContent=maps[selectedMap].name.toUpperCase();
  setupFighter("p1",fighters[selected]);setupFighter("p2",fighters[enemy]);$("#p1Name").textContent=fighters[selected].name;$("#p2Name").textContent=fighters[enemy].name;
  resetRound(true);loop=setInterval(tick,FRAME_MS);clock=setInterval(()=>{if(!paused&&!state.over&&state.lockFrames<=0){state.time--;$("#timer").textContent=state.time;if(state.time<=0)endRound()}},1000)
}
function stopGame(){clearInterval(loop);clearInterval(clock);loop=clock=null}
function resetRound(){
  state.p1=Object.assign(makeActor(13),{wins:state.p1.wins});state.p2=Object.assign(makeActor(76),{wins:state.p2.wins});
  state.time=75;state.over=false;state.lockFrames=58;state.hitstop=0;inputQueue=[];$("#roundLabel").textContent="ROUND "+state.round;updateHUD();
  announce("ROUND "+state.round,600);setTimeout(()=>announce("FIGHT!",600),620)
}
function announce(t,ms=650){$("#announcement").textContent=t;setTimeout(()=>{if($("#announcement").textContent===t)$("#announcement").textContent=""},ms)}

function updateHUD(){
  [["p1",state.p1],["p2",state.p2]].forEach(([id,a])=>{$("#"+id+"Health").style.width=a.hp+"%";$("#"+id+"Energy").style.width=a.en+"%";const el=$("#"+id);el.style.left=a.x+"%";el.style.bottom=`calc(17% + ${a.y}px)`});
  $("#p1Wins").textContent="●".repeat(state.p1.wins);$("#p2Wins").textContent="●".repeat(state.p2.wins);$("#timer").textContent=state.time
}
function anim(id,cls,ms=220){const e=$("#"+id);e.classList.add(cls);setTimeout(()=>e.classList.remove(cls),ms)}
function screenShake(strength="light"){const s=$("#stage");s.classList.remove("shake","shake-heavy");void s.offsetWidth;s.classList.add(strength==="heavy"?"shake-heavy":"shake");setTimeout(()=>s.classList.remove("shake","shake-heavy"),130)}
function impactSpark(att,def,type){
  const fx=document.createElement("div");fx.className="impact-spark "+type;fx.style.left=((att.x+def.x)/2+5)+"%";fx.style.bottom=(31+Math.max(att.y,def.y)/12)+"%";$("#stage").appendChild(fx);setTimeout(()=>fx.remove(),220)
}
function comboFlash(att){const now=performance.now();att.combo=now-att.lastHit<900?att.combo+1:1;att.lastHit=now;if(att.combo>=2){$("#comboText").textContent=att.combo+" HIT COMBO!";setTimeout(()=>$("#comboText").textContent="",500)}}

function isProjectileSpecial(type){return ["ball","water","process","dumbbell","sonic","dogs","cavaco"].includes(type)}
function specialVisual(id,f){
  const fx=document.createElement("div");fx.className="special-object "+f.type+(id==="p2"?" reverse":"");
  fx.textContent={ball:"⚽",cavaco:"🎸",dogs:"🐕 🐕",scissors:"✂️",water:"💧",process:"📁",dumbbell:"🏋️",sonic:")))",hair:"〰",kick:"💥",kickbox:"🥊",spin:"🌀",power:"⚡"}[f.type]||"⚡";
  fx.style.left=(state[id].x+8)+"%";fx.style.bottom=(31+state[id].y/12)+"%";$("#stage").appendChild(fx);setTimeout(()=>fx.remove(),650);announce(f.power+"!",500)
}

function endMove(a,id){a.move=null;const el=$("#"+id);el.classList.remove("attack","kick","specialFx");el.dataset.phase=""}
function startMove(a,type,id){
  if(type==="special"&&a.en<50)return false;
  const d=MOVE_DATA[type];a.move={type,frame:0,hit:false,data:d,fxSpawned:false};if(type==="special")a.en-=50;
  const el=$("#"+id);el.classList.remove("attack","kick","specialFx");el.classList.add(type==="punch"?"attack":type==="kick"?"kick":"specialFx");return true
}
function moveCanCancel(a){
  if(!a.move||!a.move.hit||a.move.type==="special")return false;
  const d=a.move.data,f=a.move.frame;return f>=d.cancelStart&&f<=d.cancelEnd
}
function hitTest(att,def,d,type){
  const vertical=Math.abs(att.y-def.y);if(vertical>92)return false;
  let reach=d.reach;if(type==="special"&&!isProjectileSpecial(fighters[att===state.p1?selected:enemy].type))reach=14.5;
  return Math.abs(att.x-def.x)<=reach
}
function applyHit(att,def,type,aid,did){
  const d=MOVE_DATA[type],blocked=def.block||def.blockstun>0;let damage=d.damage;
  if(blocked){damage=Math.max(1,Math.ceil(damage*.22));def.blockstun=d.blockstun;def.en=Math.min(100,def.en+5)}
  else def.stun=d.hitstun;
  def.hp=Math.max(0,def.hp-damage);att.en=Math.min(100,att.en+(type==="special"?2:type==="kick"?11:9));
  att.move.hit=true;comboFlash(att);anim(did,"hit",180);impactSpark(att,def,type);
  if(type==="kick")screenShake("light");if(type==="special")screenShake("heavy");
  const dir=def.x>att.x?1:-1;def.x=Math.min(84,Math.max(2,def.x+dir*d.knockback));state.hitstop=d.hitstop;
  if(def.hp<=0)setTimeout(endRound,190);updateHUD()
}
function processMove(att,def,id,did){
  if(!att.move)return;const m=att.move,d=m.data;m.frame++;const el=$("#"+id);
  if(m.frame<d.startup)el.dataset.phase="startup";
  else if(m.frame<d.startup+d.active)el.dataset.phase="active";
  else el.dataset.phase="recovery";
  if(m.type==="special"&&!m.fxSpawned&&m.frame===d.startup){m.fxSpawned=true;specialVisual(id,fighters[id==="p1"?selected:enemy])}
  if(m.frame>=d.startup&&m.frame<d.startup+d.active&&!m.hit&&hitTest(att,def,d,m.type))applyHit(att,def,m.type,id,did);
  if(m.frame>=d.startup+d.active+d.recovery)endMove(att,id)
}

function qcfDetected(){
  const now=performance.now(),forward=state&&state.p1.x<state.p2.x?"d":"a";
  const recent=inputHistory.filter(i=>now-i.t<QCF_WINDOW);
  let f=-1,s=-1;for(let i=recent.length-1;i>=0;i--){if(f<0&&recent[i].k===forward)f=i;else if(f>=0&&recent[i].k==="s"){s=i;break}}
  return s>=0&&f>s
}
function queueAction(action){if(!state)return;inputQueue.push({action,expires:state.frame+BUFFER_FRAMES})}
function tryAction(a,action,id){
  if(a.stun>0||a.blockstun>0)return false;
  if(action.type==="jump"){
    if(a.onGround&&!a.move){a.vy=17;a.onGround=false;anim(id,"jump",520);return true}return false
  }
  if(action.type==="dash"){
    if(a.onGround&&!a.move){a.dashFrames=9;a.dashDir=action.dir;anim(id,"dash",170);return true}return false
  }
  if(action.type==="special"&&a.move&&moveCanCancel(a)){endMove(a,id);return startMove(a,"special",id)}
  if(a.move)return false;
  return startMove(a,action.type,id)
}
function consumePlayerBuffer(){
  if(!state)return;
  for(let i=0;i<inputQueue.length;i++){
    const q=inputQueue[i];if(q.expires<state.frame){inputQueue.splice(i--,1);continue}
    if(tryAction(state.p1,q.action,"p1")){inputQueue.splice(i,1);break}
  }
}

function updateGuard(){
  const p=state.p1,e=state.p2,dist=Math.abs(p.x-e.x),back=p.x<e.x?"a":"d";
  const autoBackBlock=!!keys[back]&&!!e.move&&dist<18;
  p.block=p.onGround&&!p.move&&p.stun<=0&&(!!keys.s||autoBackBlock);
  $("#p1").classList.toggle("block",p.block);
}
function updatePhysics(a,id){
  if(!a.onGround){a.y+=a.vy;a.vy-=1.05;if(a.y<=0){a.y=0;a.vy=0;a.onGround=true}}
  if(a.dashFrames>0){a.x=Math.max(2,Math.min(84,a.x+a.dashDir*1.35));a.dashFrames--;$("#"+id).classList.add("dashing")}else $("#"+id).classList.remove("dashing")
}
function keepApart(){
  const min=6.5,dx=state.p2.x-state.p1.x;if(dx<min){const push=(min-dx)/2;state.p1.x=Math.max(2,state.p1.x-push);state.p2.x=Math.min(84,state.p2.x+push)}
}
function playerMovement(){
  const p=state.p1;if(p.stun>0||p.blockstun>0||p.move||p.dashFrames>0)return;
  const speed=.39;let moving=false;
  if(keys.a){p.x=Math.max(2,p.x-speed);moving=true}if(keys.d){p.x=Math.min(84,p.x+speed);moving=true}
  $("#p1").classList.toggle("walking",moving)
}
function aiThink(){
  const e=state.p2,p=state.p1,dist=Math.abs(e.x-p.x);if(e.stun>0||e.blockstun>0||e.move)return;
  if(e.aiDelay>0){e.aiDelay--;return}e.aiDelay=6+Math.floor(Math.random()*7);
  if(p.move&&dist<18&&Math.random()<.38){e.block=true;return}else e.block=false;
  if(dist>22){if(Math.random()<.16){e.dashFrames=8;e.dashDir=-1}else e.x-=.32;$("#p2").classList.add("walking");return}
  $("#p2").classList.remove("walking");
  const r=Math.random();if(e.en>=50&&r<.16)startMove(e,"special","p2");else if(r<.52)startMove(e,"kick","p2");else if(r<.88)startMove(e,"punch","p2")
}

function tick(){
  if(!state||state.over||paused)return;state.frame++;
  if(state.lockFrames>0){state.lockFrames--;updateHUD();return}
  if(state.hitstop>0){state.hitstop--;return}
  [state.p1,state.p2].forEach(a=>{a.stun=Math.max(0,a.stun-1);a.blockstun=Math.max(0,a.blockstun-1)});
  updateGuard();consumePlayerBuffer();playerMovement();aiThink();
  updatePhysics(state.p1,"p1");updatePhysics(state.p2,"p2");keepApart();
  processMove(state.p1,state.p2,"p1","p2");processMove(state.p2,state.p1,"p2","p1");updateHUD()
}
function registerKeyDown(k,repeat=false){
  if(!state||state.over)return;const now=performance.now();if(!repeat)inputHistory.push({k,t:now});inputHistory=inputHistory.filter(i=>now-i.t<600);
  if(k==="j")queueAction({type:qcfDetected()?"special":"punch"});
  if(k==="k")queueAction({type:qcfDetected()?"special":"kick"});
  if(k==="l")queueAction({type:"special"});
  if(k==="w")queueAction({type:"jump"});
  if((k==="a"||k==="d")&&!repeat){const last=state.p1.lastTap[k];if(now-last<DOUBLE_TAP_MS){queueAction({type:"dash",dir:k==="d"?1:-1});state.p1.lastTap[k]=0}else state.p1.lastTap[k]=now}
}

function showResult(win){
  $("#modal").classList.add("show");
  if(gameMode==="quick"){
    $("#modalKicker").textContent="RESULTADO";$("#modalTitle").textContent=win?"VITÓRIA!":"DERROTA";$("#modalText").textContent=(win?fighters[selected].name:fighters[enemy].name)+" venceu a luta.";
    $("#rematch").textContent="REVANCHE";$("#rematch").onclick=()=>{$("#modal").classList.remove("show");startGame()}
  }else if(win&&tournament.round<2){
    $("#modalKicker").textContent="TORNEIO";$("#modalTitle").textContent="CLASSIFICADO!";$("#modalText").textContent="Você avançou para a próxima fase.";
    $("#rematch").textContent="PRÓXIMA LUTA";$("#rematch").onclick=()=>{tournament.round++;selectedMap=(selectedMap+1)%maps.length;go("maps")}
  }else if(win){
    $("#modalKicker").textContent="TORNEIO";$("#modalTitle").textContent="CAMPEÃO!";$("#modalText").textContent=fighters[selected].name+" venceu o torneio.";
    $("#rematch").textContent="NOVO TORNEIO";$("#rematch").onclick=()=>{tournament={active:false,round:0,opponents:[]};go("select")}
  }else{
    $("#modalKicker").textContent="TORNEIO";$("#modalTitle").textContent="ELIMINADO";$("#modalText").textContent="Seu caminho no torneio terminou nesta luta.";
    $("#rematch").textContent="RECOMEÇAR";$("#rematch").onclick=()=>{tournament={active:false,round:0,opponents:[]};go("select")}
  }
}
function endRound(){
  if(state.over)return;state.over=true;const winner=state.p1.hp===state.p2.hp?(Math.random()<.5?state.p1:state.p2):(state.p1.hp>state.p2.hp?state.p1:state.p2),loser=winner===state.p1?state.p2:state.p1;
  winner.wins++;announce("K.O.!",700);updateHUD();
  setTimeout(()=>{if(winner.hp===100)announce("PERFECT!",650)},360);
  setTimeout(()=>{if(winner.wins>=2){const win=winner===state.p1;stopGame();showResult(win)}else{state.round++;resetRound()}},980)
}

const pauseOverlay=$("#pauseOverlay"),controlsOverlay=$("#controlsOverlay");
function openPauseMenu(){
  if(!state||state.over)return;
  paused=true;keys={};pauseOverlay.classList.remove("hidden");controlsOverlay.classList.add("hidden");$("#announcement").textContent="";
}
function closePauseMenu(){
  if(!state)return;
  paused=false;pauseOverlay.classList.add("hidden");controlsOverlay.classList.add("hidden");announce("FIGHT!",360);
}
function openControlsFromPause(){pauseOverlay.classList.add("hidden");controlsOverlay.classList.remove("hidden")}
function backToPause(){controlsOverlay.classList.add("hidden");pauseOverlay.classList.remove("hidden")}
function quitToMenu(){
  paused=false;keys={};pauseOverlay.classList.add("hidden");controlsOverlay.classList.add("hidden");stopGame();state=null;go("home");
}
function togglePause(){
  if(!state||state.over)return;
  if(!controlsOverlay.classList.contains("hidden")){backToPause();return}
  if(paused)closePauseMenu();else openPauseMenu();
}
$("#resumeBtn").onclick=closePauseMenu;
$("#pauseControlsBtn").onclick=openControlsFromPause;
$("#pauseMenuBtn").onclick=quitToMenu;
$("#backToPauseBtn").onclick=backToPause;
$("#closeControlsBtn").onclick=closePauseMenu;
addEventListener("keydown",e=>{
  const k=e.key.toLowerCase();
  if(e.key==="Escape"){e.preventDefault();togglePause();return}
  if(paused)return;
  if(["a","d","w","s","j","k","l"].includes(k)){keys[k]=true;registerKeyDown(k,e.repeat);e.preventDefault()}
});
addEventListener("keyup",e=>{keys[e.key.toLowerCase()]=false});
$(".mobile-controls button").forEach(b=>{const k=b.dataset.key;b.onpointerdown=e=>{e.preventDefault();if(paused)return;keys[k]=true;registerKeyDown(k,false)};b.onpointerup=b.onpointercancel=()=>keys[k]=false});
$("#pauseBtn").onclick=openPauseMenu;
renderRoster();renderMaps();