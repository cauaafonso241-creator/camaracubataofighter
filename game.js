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
let selected=0, selectedMap=0, enemy=1, gameMode="quick";
let state=null,loop=null,clock=null,paused=false,keys={};
let tournament={active:false,round:0,opponents:[]};
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];

function avatar(f){
  return `<div class="avatar photo-avatar" style="--c:${f.c}">
    <img src="${f.portrait}" alt="${f.name}"><span class="portrait-glow"></span>
  </div>`;
}
function renderRoster(){
  $("#roster").innerHTML=fighters.map((f,i)=>`<button class="char ${i===selected?"active":""}" data-i="${i}">
    ${avatar(f)}<b>${f.name}</b><small>ESPECIAL: ${f.power}</small>
  </button>`).join("");
  $$(".char").forEach(b=>b.onclick=()=>{selected=+b.dataset.i;renderRoster()});
  const f=fighters[selected];
  $("#selectedCard").innerHTML=`<div class="big-avatar">${avatar(f)}</div>
  <div class="card-info"><small>LUTADOR SELECIONADO</small><h3>${f.name}</h3><p>ESPECIAL: <b>${f.power}</b></p>
  <div class="stats">${["FORÇA","AGILIDADE","DEFESA"].map((x,i)=>`<div class="stat"><span>${x}</span><div class="bar"><i style="width:${f.stats[i]}%"></i></div></div>`).join("")}</div></div>`;
}
function renderMaps(){
  $("#mapGrid").innerHTML=maps.map((m,i)=>`<button class="map-card ${i===selectedMap?"active":""}" data-map="${i}">
    <img src="${m.src}" alt="${m.name}"><span><b>${m.name}</b><small>${m.subtitle}</small></span>
  </button>`).join("");
  $$(".map-card").forEach(b=>b.onclick=()=>{selectedMap=+b.dataset.map;renderMaps()});
  $("#mapInfo").innerHTML=`<b>${maps[selectedMap].name}</b><span>${maps[selectedMap].subtitle}</span>`;
}
function go(id){
  $$(".screen").forEach(s=>s.classList.remove("active"));
  $("#"+id).classList.add("active");
  $("#modal").classList.remove("show");
  if(id==="select")renderRoster();
  if(id==="maps")renderMaps();
  if(id!=="arena")stopGame();
}
$$("[data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));

function startMode(mode){
  gameMode=mode;
  tournament={active:false,round:0,opponents:[]};
  go("select");
}
$("#quickModeBtn").onclick=()=>startMode("quick");
$("#tournamentModeBtn").onclick=()=>startMode("tournament");
$("#howPlayBtn").onclick=()=>startMode("quick");
$("#fightBtn").onclick=()=>go("maps");

function pickRandomOpponent(excluded=[]){
  const pool=fighters.map((_,i)=>i).filter(i=>i!==selected&&!excluded.includes(i));
  return pool[Math.floor(Math.random()*pool.length)];
}
function setupTournament(){
  const used=[]; tournament.opponents=[];
  for(let i=0;i<3;i++){const o=pickRandomOpponent(used); used.push(o); tournament.opponents.push(o);}
  tournament.active=true;tournament.round=0;
}
function renderTournament(){
  const labels=["QUARTAS DE FINAL","SEMIFINAL","FINAL"];
  $("#tournamentTitle").innerHTML=`${labels[tournament.round]} <span>•</span>`;
  $("#bracket").innerHTML=tournament.opponents.map((idx,i)=>{
    const f=fighters[idx],cls=i<tournament.round?"done":i===tournament.round?"current":"future";
    return `<div class="bracket-round ${cls}"><small>${["LUTA 1","LUTA 2","FINAL"][i]}</small>
      <div class="bracket-match"><span>${fighters[selected].name}</span><b>VS</b><span>${f.name}</span></div>
    </div>`;
  }).join("");
}
function prepareVs(){
  const p1=fighters[selected],p2=fighters[enemy],m=maps[selectedMap];
  $("#vsMode").textContent=gameMode==="tournament"?"MODO TORNEIO":"LUTA SIMPLES";
  $("#vsP1Img").src=p1.portrait;$("#vsP2Img").src=p2.portrait;
  $("#vsP1Name").textContent=p1.name;$("#vsP2Name").textContent=p2.name;
  $("#vsP1Power").textContent=p1.power;$("#vsP2Power").textContent=p2.power;
  $("#vsArena").textContent=m.name;
  go("vs");
}
$("#mapConfirm").onclick=()=>{
  if(gameMode==="quick"){
    enemy=pickRandomOpponent();
    prepareVs();
  }else{
    if(!tournament.active)setupTournament();
    enemy=tournament.opponents[tournament.round];
    renderTournament();go("tournament");
  }
};
$("#nextTournamentBtn").onclick=()=>prepareVs();
$("#startFightBtn").onclick=()=>{go("arena");startGame()};

function fighterMarkup(f){
  return `<div class="fighter-head"><img src="${f.portrait}" alt=""></div>
  <div class="fighter-torso"><span class="shirt"></span><span class="tie"></span></div>
  <div class="arm arm-left"><span class="hand"></span></div>
  <div class="arm arm-right"><span class="hand"></span></div>
  <div class="leg leg-left"><span class="shoe"></span></div>
  <div class="leg leg-right"><span class="shoe"></span></div>`;
}
function setupFighter(id,f){
  const el=$("#"+id),sprite=el.querySelector(".sprite");
  el.style.setProperty("--fighter-color",f.c);el.dataset.special=f.type;el.dataset.name=f.name;
  sprite.innerHTML=fighterMarkup(f);
}
function startGame(){
  stopGame();paused=false;
  state={
    p1:{hp:100,en:0,x:13,wins:0,block:false,cool:0,stun:0,combo:0,lastHit:0},
    p2:{hp:100,en:0,x:76,wins:0,block:false,cool:0,stun:0,combo:0,lastHit:0},
    round:1,time:75,over:false,freezeUntil:0,lockUntil:performance.now()+1050
  };
  $("#stageBg").src=maps[selectedMap].src;
  $("#stage").classList.add("has-map");
  $("#stageName").textContent=maps[selectedMap].name.toUpperCase();
  setupFighter("p1",fighters[selected]);setupFighter("p2",fighters[enemy]);
  $("#p1Name").textContent=fighters[selected].name;$("#p2Name").textContent=fighters[enemy].name;
  resetRound(true);
  loop=setInterval(tick,32);
  clock=setInterval(()=>{if(!paused&&!state.over&&performance.now()>state.lockUntil){state.time--;$("#timer").textContent=state.time;if(state.time<=0)endRound()}},1000);
}
function stopGame(){clearInterval(loop);clearInterval(clock);loop=clock=null}
function resetRound(first=false){
  state.p1.hp=state.p2.hp=100;state.p1.en=state.p2.en=0;state.p1.x=13;state.p2.x=76;
  state.p1.combo=state.p2.combo=0;state.time=75;state.over=false;state.lockUntil=performance.now()+950;
  $("#roundLabel").textContent="ROUND "+state.round;updateHUD();
  announce(first?"ROUND "+state.round:"ROUND "+state.round,650);
  setTimeout(()=>announce("FIGHT!",650),680);
}
function announce(t,ms=700){
  $("#announcement").textContent=t;
  setTimeout(()=>{if($("#announcement").textContent===t)$("#announcement").textContent=""},ms)
}
function updateHUD(){
  ["p1","p2"].forEach(id=>{
    $("#"+id+"Health").style.width=state[id].hp+"%";$("#"+id+"Energy").style.width=state[id].en+"%";$("#"+id).style.left=state[id].x+"%";
  });
  $("#p1Wins").textContent="●".repeat(state.p1.wins);$("#p2Wins").textContent="●".repeat(state.p2.wins);
  $("#timer").textContent=state.time;
}
function anim(id,cls,ms=220){const e=$("#"+id);e.classList.add(cls);setTimeout(()=>e.classList.remove(cls),ms)}
function screenShake(){const s=$("#stage");s.classList.add("shake");setTimeout(()=>s.classList.remove("shake"),130)}
function comboFlash(att){
  const now=performance.now();
  if(now-att.lastHit<900)att.combo++;else att.combo=1;
  att.lastHit=now;
  if(att.combo>=2){$("#comboText").textContent=att.combo+" HIT COMBO!";setTimeout(()=>$("#comboText").textContent="",500)}
}
function specialVisual(id,f){
  const stage=$("#stage"),fx=document.createElement("div");
  fx.className="special-object "+f.type+(id==="p2"?" reverse":"");
  fx.textContent={ball:"⚽",cavaco:"🎸",dogs:"🐕 🐕",scissors:"✂️",water:"💧",process:"📁",dumbbell:"🏋️",sonic:")))",hair:"〰",kick:"💥",kickbox:"🥊",spin:"🌀",power:"⚡"}[f.type]||"⚡";
  fx.style.left=(state[id].x+8)+"%";fx.style.bottom="31%";stage.appendChild(fx);
  setTimeout(()=>fx.remove(),650);announce(f.power+"!",520)
}
function attack(att,def,type){
  if(!state||state.over||paused||performance.now()<state.lockUntil||performance.now()<state.freezeUntil||att.cool>0||att.stun>0)return;
  const aid=att===state.p1?"p1":"p2",did=def===state.p1?"p1":"p2";
  let range=Math.abs(att.x-def.x),dmg=type==="special"?20:type==="kick"?9:6,reach=type==="kick"?18:15;
  if(type==="special"&&att.en<50)return;
  att.cool=type==="special"?14:type==="kick"?7:5;
  if(type==="special"){att.en-=50;anim(aid,"specialFx",480);specialVisual(aid,fighters[aid==="p1"?selected:enemy]);reach=100}
  else anim(aid,type==="kick"?"kick":"attack",type==="kick"?250:180);

  if(range<=reach){
    const blocked=def.block;
    if(blocked){dmg=Math.max(1,Math.ceil(dmg*.22));def.en=Math.min(100,def.en+6)}
    else{def.stun=type==="special"?9:type==="kick"?5:3}
    def.hp=Math.max(0,def.hp-dmg);
    att.en=Math.min(100,att.en+(type==="special"?2:type==="kick"?11:9));
    comboFlash(att);anim(did,"hit",210);screenShake();
    const dir=def.x>att.x?1:-1;def.x=Math.min(84,Math.max(2,def.x+dir*(type==="special"?3.5:1.5)));
    state.freezeUntil=performance.now()+(type==="special"?105:65);
    if(def.hp<=0)setTimeout(endRound,220);
  }
  updateHUD()
}
function showResult(win){
  $("#modal").classList.add("show");
  if(gameMode==="quick"){
    $("#modalKicker").textContent="RESULTADO";
    $("#modalTitle").textContent=win?"VITÓRIA!":"DERROTA";
    $("#modalText").textContent=(win?fighters[selected].name:fighters[enemy].name)+" venceu a luta.";
    $("#rematch").textContent="REVANCHE";
    $("#rematch").onclick=()=>{$("#modal").classList.remove("show");startGame()};
  }else if(win&&tournament.round<2){
    $("#modalKicker").textContent="TORNEIO";
    $("#modalTitle").textContent="CLASSIFICADO!";
    $("#modalText").textContent="Você avançou para a próxima fase.";
    $("#rematch").textContent="PRÓXIMA LUTA";
    $("#rematch").onclick=()=>{tournament.round++;selectedMap=(selectedMap+1)%maps.length;go("maps")};
  }else if(win){
    $("#modalKicker").textContent="TORNEIO";
    $("#modalTitle").textContent="CAMPEÃO!";
    $("#modalText").textContent=fighters[selected].name+" venceu o torneio.";
    $("#rematch").textContent="NOVO TORNEIO";
    $("#rematch").onclick=()=>{tournament={active:false,round:0,opponents:[]};go("select")};
  }else{
    $("#modalKicker").textContent="TORNEIO";
    $("#modalTitle").textContent="ELIMINADO";
    $("#modalText").textContent="Seu caminho no torneio terminou nesta luta.";
    $("#rematch").textContent="RECOMEÇAR";
    $("#rematch").onclick=()=>{tournament={active:false,round:0,opponents:[]};go("select")};
  }
}
function endRound(){
  if(state.over)return;state.over=true;
  let winner=state.p1.hp===state.p2.hp?(Math.random()<.5?state.p1:state.p2):(state.p1.hp>state.p2.hp?state.p1:state.p2);
  winner.wins++;announce("K.O.!",900);updateHUD();
  setTimeout(()=>{
    if(winner.wins>=2){const win=winner===state.p1;stopGame();showResult(win)}
    else{state.round++;resetRound()}
  },980)
}
function tick(){
  if(!state||state.over||paused||performance.now()<state.freezeUntil)return;
  const p=state.p1,e=state.p2;
  [p,e].forEach(x=>{x.cool=Math.max(0,x.cool-1);x.stun=Math.max(0,x.stun-1)});
  if(performance.now()<state.lockUntil){updateHUD();return}

  const moving=!p.stun&&(keys.a||keys.d);$("#p1").classList.toggle("walking",moving);
  if(!p.stun&&keys.a)p.x=Math.max(2,p.x-0.9);if(!p.stun&&keys.d)p.x=Math.min(84,p.x+0.9);
  p.block=!p.stun&&!!keys.s;$("#p1").classList.toggle("block",p.block);
  if(keys.j){attack(p,e,"punch");keys.j=false}
  if(keys.k){attack(p,e,"kick");keys.k=false}
  if(keys.l){attack(p,e,"special");keys.l=false}

  const dist=Math.abs(e.x-p.x);
  e.block=!e.stun&&dist<19&&Math.random()<.055;$("#p2").classList.toggle("block",e.block);
  const desired=14+Math.random()*3,aiMoving=!e.stun&&dist>desired;
  $("#p2").classList.toggle("walking",aiMoving);
  if(aiMoving)e.x+=e.x>p.x?-.52:.52;
  else if(!e.stun&&Math.random()<.048)attack(e,p,e.en>=50&&Math.random()<.19?"special":Math.random()<.48?"kick":"punch");
  updateHUD()
}
addEventListener("keydown",e=>{
  const k=e.key.toLowerCase();
  if(["a","d","w","s","j","k","l"].includes(k)){keys[k]=true;e.preventDefault()}
  if(k==="w"&&state&&!state.over&&!state.p1.stun){anim("p1","jump",460);state.p1.stun=4}
  if(e.key==="Escape")togglePause()
});
addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
$$(".mobile-controls button").forEach(b=>{const k=b.dataset.key;b.onpointerdown=e=>{e.preventDefault();keys[k]=true};b.onpointerup=b.onpointercancel=()=>keys[k]=false});
function togglePause(){if(!state)return;paused=!paused;announce(paused?"PAUSADO":"FIGHT!",paused?999999:500)}
$("#pauseBtn").onclick=togglePause;
renderRoster();renderMaps();