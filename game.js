const fighters=[
{name:"Afonsinho",abbr:"AF",c:"#4c6fa8",power:"Força Incomparável",type:"power",stats:[92,68,84]},
{name:"Donizete",abbr:"DZ",c:"#805a48",power:"Fala Supersônica",type:"sonic",stats:[76,88,74]},
{name:"Alan Matias",abbr:"AM",c:"#406b85",power:"Super Chute",type:"kick",stats:[86,88,72]},
{name:"Batoré",abbr:"BT",c:"#8a5548",power:"Bola de Futebol",type:"ball",stats:[82,78,78]},
{name:"Kleber do Cavaco",abbr:"KC",c:"#72558d",power:"Cavaco",type:"cavaco",stats:[76,84,80]},
{name:"Dr. Anderson Veterinário",abbr:"AV",c:"#65715a",power:"Cães de Guarda",type:"dogs",stats:[84,72,86]},
{name:"Edson Mota",abbr:"EM",c:"#4d7187",power:"Kickboxing Afiado",type:"kickbox",stats:[88,86,74]},
{name:"Guilherme do Salão",abbr:"GS",c:"#69507d",power:"Tesourada",type:"scissors",stats:[80,88,72]},
{name:"Jair do Bar",abbr:"JB",c:"#8a7653",power:"Galão d'Água",type:"water",stats:[82,70,84]},
{name:"Marcinho",abbr:"MC",c:"#4d7187",power:"Processo Administrativo",type:"process",stats:[76,84,80]},
{name:"Ronaldo da Comissão",abbr:"RC",c:"#66527c",power:"Peso Pesado",type:"dumbbell",stats:[92,66,86]},
{name:"Rony",abbr:"RN",c:"#416b84",power:"Galão d'Água",type:"water",stats:[82,82,78]},
{name:"Tinho",abbr:"TH",c:"#526e5b",power:"Super Chute",type:"kick",stats:[88,74,82]},
{name:"Topete",abbr:"TP",c:"#7b6842",power:"Giro Descontrolado",type:"spin",stats:[80,94,70]},
{name:"Xuxa",abbr:"XX",c:"#795f48",power:"Chicote de Cabelo",type:"hair",stats:[78,90,72]}
];
let selected=0,enemy=1,state=null,loop=null,clock=null,paused=false,keys={};
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
function avatar(f){return `<div class="avatar" style="--c:${f.c}"><span class="pixel-head">👤</span><b>${f.abbr}</b></div>`}
function renderRoster(){
 $("#roster").innerHTML=fighters.map((f,i)=>`<button class="char ${i===selected?"active":""}" data-i="${i}">${avatar(f)}<b>${f.name}</b><small>${f.power}</small></button>`).join("");
 $$(".char").forEach(b=>b.onclick=()=>{selected=+b.dataset.i;renderRoster()});
 const f=fighters[selected];$("#selectedCard").innerHTML=`<div class="big-avatar">${avatar(f)}</div><div class="card-info"><small>LUTADOR SELECIONADO</small><h3>${f.name}</h3><p>ESPECIAL: <b>${f.power}</b></p><div class="stats">${["FORÇA","AGILIDADE","DEFESA"].map((x,i)=>`<div class="stat"><span>${x}</span><div class="bar"><i style="width:${f.stats[i]}%"></i></div></div>`).join("")}</div></div>`;
}
function go(id){$$(".screen").forEach(s=>s.classList.remove("active"));$("#"+id).classList.add("active");$("#modal").classList.remove("show");if(id==="select")renderRoster();if(id!=="arena")stopGame()}
$$("[data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));
$("#fightBtn").onclick=()=>{do{enemy=Math.floor(Math.random()*fighters.length)}while(enemy===selected);go("arena");startGame()};
function startGame(){stopGame();paused=false;state={p1:{hp:100,en:0,x:15,wins:0,block:false,cool:0,stun:0},p2:{hp:100,en:0,x:75,wins:0,block:false,cool:0,stun:0},round:1,time:75,over:false};setupFighter("p1",fighters[selected]);setupFighter("p2",fighters[enemy]);$("#p1Name").textContent=fighters[selected].name;$("#p2Name").textContent=fighters[enemy].name;resetRound(true);loop=setInterval(tick,50);clock=setInterval(()=>{if(!paused&&!state.over){state.time--;$("#timer").textContent=state.time;if(state.time<=0)endRound()}},1000)}
function stopGame(){clearInterval(loop);clearInterval(clock);loop=clock=null}
function setupFighter(id,f){const el=$("#"+id);el.style.setProperty("--fighter-color",f.c);el.querySelector(".sprite span").textContent=f.abbr;el.dataset.special=f.type}
function resetRound(first=false){state.p1.hp=state.p2.hp=100;state.p1.en=state.p2.en=0;state.p1.x=15;state.p2.x=75;state.time=75;state.over=false;$("#roundLabel").textContent="ROUND "+state.round;updateHUD();announce(first?"FIGHT!":"ROUND "+state.round,900)}
function announce(t,ms=700){$("#announcement").textContent=t;setTimeout(()=>{if($("#announcement").textContent===t)$("#announcement").textContent=""},ms)}
function updateHUD(){["p1","p2"].forEach(id=>{$("#"+id+"Health").style.width=state[id].hp+"%";$("#"+id+"Energy").style.width=state[id].en+"%";$("#"+id).style.left=state[id].x+"%"});$("#timer").textContent=state.time}
function anim(id,cls,ms=240){const e=$("#"+id);e.classList.add(cls);setTimeout(()=>e.classList.remove(cls),ms)}
function specialVisual(id,f){const el=$("#"+id),stage=$("#stage"),fx=document.createElement("div");fx.className="special-object "+f.type;fx.textContent={ball:"⚽",cavaco:"🎸",dogs:"🐕 🐕",scissors:"✂️",water:"💧",process:"📁",dumbbell:"🏋️",sonic:")))",hair:"〰",kick:"💥",kickbox:"🥊",spin:"🌀",power:"⚡"}[f.type]||"⚡";fx.style.left=(state[id].x+8)+"%";fx.style.bottom="32%";stage.appendChild(fx);setTimeout(()=>fx.remove(),650);announce(f.power+"!",650)}
function attack(att,def,type){
 if(state.over||paused||att.cool>0||att.stun>0)return;const aid=att===state.p1?"p1":"p2",did=def===state.p1?"p1":"p2";let range=Math.abs(att.x-def.x),dmg=type==="special"?22:type==="kick"?10:6;
 if(type==="special"&&att.en<50)return;att.cool=type==="special"?12:5;
 if(type==="special"){att.en-=50;anim(aid,"specialFx",500);specialVisual(aid,fighters[aid==="p1"?selected:enemy]);range=0}else anim(aid,type==="kick"?"kick":"attack");
 if(range<(type==="kick"?20:17)||type==="special"){if(def.block)dmg=Math.ceil(dmg*.25);else def.stun=type==="special"?7:3;def.hp=Math.max(0,def.hp-dmg);att.en=Math.min(100,att.en+(type==="special"?3:10));anim(did,"hit");if(def.hp<=0)setTimeout(endRound,250)}updateHUD()
}
function endRound(){if(state.over)return;state.over=true;let winner=state.p1.hp===state.p2.hp?(Math.random()<.5?state.p1:state.p2):(state.p1.hp>state.p2.hp?state.p1:state.p2);winner.wins++;announce("K.O.!",900);setTimeout(()=>{if(winner.wins>=2){const win=winner===state.p1;$("#modalTitle").textContent=win?"VITÓRIA!":"DERROTA";$("#modalText").textContent=(win?fighters[selected].name:fighters[enemy].name)+" venceu a luta.";$("#modal").classList.add("show");stopGame()}else{state.round++;resetRound()}},1000)}
function tick(){if(!state||state.over||paused)return;const p=state.p1,e=state.p2;[p,e].forEach(x=>{x.cool=Math.max(0,x.cool-1);x.stun=Math.max(0,x.stun-1)});if(!p.stun&&keys.a)p.x=Math.max(2,p.x-1.25);if(!p.stun&&keys.d)p.x=Math.min(84,p.x+1.25);p.block=!p.stun&&!!keys.s;$("#p1").classList.toggle("block",p.block);if(keys.j){attack(p,e,"punch");keys.j=false}if(keys.k){attack(p,e,"kick");keys.k=false}if(keys.l){attack(p,e,"special");keys.l=false}const dist=Math.abs(e.x-p.x);e.block=!e.stun&&Math.random()<.035;$("#p2").classList.toggle("block",e.block);if(!e.stun&&dist>15)e.x+=e.x>p.x?-.72:.72;else if(!e.stun&&Math.random()<.075)attack(e,p,e.en>=50&&Math.random()<.2?"special":Math.random()<.45?"kick":"punch");updateHUD()}
addEventListener("keydown",e=>{const k=e.key.toLowerCase();if(["a","d","w","s","j","k","l"].includes(k)){keys[k]=true;e.preventDefault()}if(k==="w"&&state&&!state.over)anim("p1","jump",450);if(e.key==="Escape")togglePause()});addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
$$(".mobile-controls button").forEach(b=>{const k=b.dataset.key;b.onpointerdown=e=>{e.preventDefault();keys[k]=true};b.onpointerup=b.onpointercancel=()=>keys[k]=false});
function togglePause(){if(!state)return;paused=!paused;announce(paused?"PAUSADO":"FIGHT!",paused?999999:500)}
$("#pauseBtn").onclick=togglePause;$("#rematch").onclick=startGame;renderRoster();