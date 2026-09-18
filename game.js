const fighters=[
{name:"Afonsinho",abbr:"AF",c:"#566f8f",power:"Oratória",stats:[86,72,78]},
{name:"Alessandro Oliveira",abbr:"AO",c:"#7b5b48",power:"Réplica",stats:[80,82,74]},
{name:"Allan Matias",abbr:"AM",c:"#4f6c56",power:"Apartes",stats:[84,76,80]},
{name:"Batoré",abbr:"BT",c:"#7a4b4b",power:"Bancada",stats:[88,70,79]},
{name:"Cleber do Cavaco",abbr:"CC",c:"#705a87",power:"Acorde Final",stats:[78,86,76]},
{name:"Dr Anderson De Lana",abbr:"DL",c:"#466d7a",power:"Argumento",stats:[82,74,88]},
{name:"Edson Mota",abbr:"EM",c:"#6f6048",power:"Moção",stats:[80,80,80]},
{name:"Guilherme Do Salão",abbr:"GS",c:"#62557d",power:"Tribuna",stats:[76,88,78]},
{name:"Jair do Bar",abbr:"JB",c:"#755242",power:"Requerimento",stats:[88,74,74]},
{name:"Marcinho",abbr:"MC",c:"#486c78",power:"Questão de Ordem",stats:[82,84,74]},
{name:"Ronaldo da Comissão",abbr:"RC",c:"#67547c",power:"Comissão",stats:[84,76,82]},
{name:"Topete",abbr:"TP",c:"#7b6842",power:"Voto Relâmpago",stats:[76,90,74]},
{name:"Xuxa",abbr:"XX",c:"#536b84",power:"Plenário",stats:[82,78,82]},
{name:"Rony",abbr:"RN",c:"#73564b",power:"Emenda",stats:[80,82,78]},
{name:"Tinho",abbr:"TH",c:"#526e5b",power:"Grande Expediente",stats:[84,78,80]}
];
let selected=0,enemy=1,state=null,loop=null,clock=null,paused=false,keys={};
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
function avatar(f,big=false){return `<div class="avatar" style="--c:${f.c}">${f.abbr}</div>`}
function renderRoster(){
 $("#roster").innerHTML=fighters.map((f,i)=>`<button class="char ${i===selected?"active":""}" data-i="${i}">${avatar(f)}<b>${f.name}</b></button>`).join("");
 $$(".char").forEach(b=>b.onclick=()=>{selected=+b.dataset.i;renderRoster();});
 const f=fighters[selected];
 $("#selectedCard").innerHTML=`<div class="big-avatar">${avatar(f,true)}</div><div class="card-info"><small>PERSONAGEM SELECIONADO</small><h3>${f.name}</h3><p>Especial: <b>${f.power}</b></p><div class="stats">${["FORÇA","AGILIDADE","DEFESA"].map((x,i)=>`<div class="stat"><span>${x}</span><div class="bar"><i style="width:${f.stats[i]}%"></i></div></div>`).join("")}</div></div>`;
}
function go(id){$$(".screen").forEach(s=>s.classList.remove("active"));$("#"+id).classList.add("active");$("#modal").classList.remove("show");if(id==="select")renderRoster();if(id!=="arena")stopGame()}
$$("[data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));
$("#fightBtn").onclick=()=>{do{enemy=Math.floor(Math.random()*fighters.length)}while(enemy===selected);go("arena");startGame()};
function startGame(){
 stopGame();paused=false;
 state={p1:{hp:100,en:0,x:18,wins:0,block:false,cool:0},p2:{hp:100,en:0,x:72,wins:0,block:false,cool:0},round:1,time:60,over:false};
 setupFighter("p1",fighters[selected]);setupFighter("p2",fighters[enemy]);
 $("#p1Name").textContent=fighters[selected].name;$("#p2Name").textContent=fighters[enemy].name;
 resetRound(true);loop=setInterval(tick,80);clock=setInterval(()=>{if(!paused&&!state.over){state.time--;$("#timer").textContent=state.time;if(state.time<=0)endRound()}},1000);
}
function stopGame(){clearInterval(loop);clearInterval(clock);loop=clock=null}
function setupFighter(id,f){const el=$("#"+id);el.style.setProperty("--skin","#c9926d");el.querySelector(".sprite span").textContent=f.abbr}
function resetRound(first=false){state.p1.hp=state.p2.hp=100;state.p1.en=state.p2.en=0;state.p1.x=18;state.p2.x=72;state.time=60;state.over=false;$("#roundLabel").textContent="ROUND "+state.round;updateHUD();announce(first?"FIGHT!":"ROUND "+state.round,900)}
function announce(t,ms=700){$("#announcement").textContent=t;setTimeout(()=>{if($("#announcement").textContent===t)$("#announcement").textContent=""},ms)}
function updateHUD(){["p1","p2"].forEach(id=>{$("#"+id+"Health").style.width=state[id].hp+"%";$("#"+id+"Energy").style.width=state[id].en+"%";$("#"+id).style.left=state[id].x+"%"});$("#timer").textContent=state.time}
function anim(id,cls){const e=$("#"+id);e.classList.add(cls);setTimeout(()=>e.classList.remove(cls),220)}
function attack(att,def,type){
 if(state.over||paused||att.cool>0)return;let range=Math.abs(att.x-def.x);let dmg=type==="special"?24:type==="kick"?11:7;
 if(type==="special"&&att.en<50)return;
 att.cool=type==="special"?8:4; if(type==="special"){att.en-=50;anim(att===state.p1?"p1":"p2","specialFx")}else anim(att===state.p1?"p1":"p2",type==="kick"?"kick":"attack");
 if(range<22){if(def.block)dmg=Math.ceil(dmg*.25);def.hp=Math.max(0,def.hp-dmg);att.en=Math.min(100,att.en+(type==="special"?5:12));anim(def===state.p1?"p1":"p2","hit");if(def.hp<=0)setTimeout(endRound,250)} updateHUD();
}
function endRound(){
 if(state.over)return;state.over=true;let winner=state.p1.hp===state.p2.hp?(Math.random()<.5?state.p1:state.p2):(state.p1.hp>state.p2.hp?state.p1:state.p2);winner.wins++;
 announce("K.O.!",900);
 setTimeout(()=>{if(winner.wins>=2){const playerWon=winner===state.p1;$("#modalTitle").textContent=playerWon?"VITÓRIA!":"DERROTA";$("#modalText").textContent=playerWon?`${fighters[selected].name} venceu a disputa por ${state.p1.wins} a ${state.p2.wins}.`:`${fighters[enemy].name} venceu a disputa por ${state.p2.wins} a ${state.p1.wins}.`;$("#modal").classList.add("show");stopGame()}else{state.round++;resetRound()}},1000)
}
function tick(){
 if(!state||state.over||paused)return;state.p1.cool=Math.max(0,state.p1.cool-1);state.p2.cool=Math.max(0,state.p2.cool-1);
 const p=state.p1,e=state.p2;
 if(keys.a)p.x=Math.max(2,p.x-1.5);if(keys.d)p.x=Math.min(82,p.x+1.5);p.block=!!keys.s;$("#p1").classList.toggle("block",p.block);
 if(keys.j){attack(p,e,"punch");keys.j=false}if(keys.k){attack(p,e,"kick");keys.k=false}if(keys.l){attack(p,e,"special");keys.l=false}
 const dist=Math.abs(e.x-p.x);e.block=Math.random()<.06;$("#p2").classList.toggle("block",e.block);
 if(dist>17)e.x+=e.x>p.x?-.7:.7;else if(Math.random()<.15)attack(e,p,e.en>=50&&Math.random()<.25?"special":Math.random()<.45?"kick":"punch");
 if(Math.random()<.02)e.x=Math.min(84,Math.max(3,e.x+(Math.random()-.5)*5));updateHUD()
}
addEventListener("keydown",e=>{const k=e.key.toLowerCase();if(["a","d","w","s","j","k","l"].includes(k)){keys[k]=true;e.preventDefault()}if(k==="w"&&state&&!state.over){anim("p1","specialFx")}if(e.key==="Escape")togglePause()});
addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
$$(".mobile-controls button").forEach(b=>{const k=b.dataset.key;b.onpointerdown=e=>{e.preventDefault();keys[k]=true};b.onpointerup=b.onpointercancel=()=>keys[k]=false});
function togglePause(){if(!state)return;paused=!paused;announce(paused?"PAUSADO":"FIGHT!",paused?999999:500)}
$("#pauseBtn").onclick=togglePause;$("#rematch").onclick=()=>startGame();renderRoster();
