import {fighters,maps} from "./data.js";

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const chooseOpponent=(exclude,used=[])=>{
  const pool=fighters.map((_,i)=>i).filter(i=>i!==exclude&&!used.includes(i));
  return pool[Math.floor(Math.random()*pool.length)];
};

export class UIController{
  constructor({engine,input,audio,settings}){
    this.engine=engine;this.input=input;this.audio=audio;this.settings=settings;
    this.gameMode="quick";this.selectionPhase="p1";this.cursor=0;this.mapContext="fight";this.selectedMap=Number(localStorage.getItem("ccf-last-map")||0)||0;
    this.config={mode:"quick",opponentType:"cpu",difficulty:settings.get("difficulty")||"normal",bestOf:3,time:75,mapIndex:this.selectedMap,p1Index:0,p2Index:1};
    this.tournament={active:false,round:0,opponents:[]};
    this.pendingConfirm=null;this.padNav={up:false,down:false,left:false,right:false,a:false,b:false,lastMove:0};
    this.bind();this.renderSettings();this.renderMaps();this.renderRoster();this.menuPadLoop();
  }
  bind(){
    $$("[data-go]").forEach(b=>b.addEventListener("click",()=>this.show(b.dataset.go)));
    $("#quickModeBtn").onclick=()=>this.startQuick();
    $("#tournamentModeBtn").onclick=()=>this.startTournament();
    $("#trainingModeBtn").onclick=()=>this.startTraining();
    $("#mapGalleryBtn").onclick=()=>this.openMapGallery();
    $("#howPlayBtn").onclick=()=>this.startQuick();
    $("#configContinueBtn").onclick=()=>this.confirmFightConfig();
    $("#confirmFighterBtn").onclick=()=>this.confirmFighter();
    $("#selectBackBtn").onclick=()=>this.backFromSelect();
    $("#mapBackBtn").onclick=()=>this.backFromMaps();
    $("#mapConfirm").onclick=()=>this.confirmMap();
    $("#nextTournamentBtn").onclick=()=>this.prepareVs();
    $("#startFightBtn").onclick=()=>this.beginFight();
    $("#settingsSaveBtn").onclick=()=>this.saveSettings();
    $("#pauseBtn").onclick=()=>this.openPause();
    $("#resumeBtn").onclick=()=>this.closePause();
    $("#pauseControlsBtn").onclick=()=>this.openPauseControls();
    $("#backToPauseBtn").onclick=()=>this.backToPause();
    $("#closeControlsBtn").onclick=()=>this.closePause();
    $("#restartRoundBtn").onclick=()=>this.askConfirm("REINICIAR ROUND?","Vida, posição, tempo e medidor deste round serão reiniciados.",()=>{this.engine.resetRound();this.closePause()});
    $("#changeFighterBtn").onclick=()=>this.askConfirm("TROCAR PERSONAGEM?","A luta atual será encerrada e você voltará à seleção.",()=>{this.engine.stop();this.hideOverlays();this.beginSelection()});
    $("#pauseMenuBtn").onclick=()=>this.askConfirm("VOLTAR AO MENU?","A luta atual será encerrada.",()=>{this.engine.stop();this.hideOverlays();this.show("home")});
    $("#pauseSettingsBtn").onclick=()=>this.openQuickSettings();
    $("#backFromQuickSettings").onclick=()=>{this.saveQuickSettings();$("#quickSettingsOverlay").classList.add("hidden");$("#pauseOverlay").classList.remove("hidden")};
    $("#confirmNo").onclick=()=>{$("#confirmOverlay").classList.add("hidden");this.pendingConfirm=null};
    $("#confirmYes").onclick=()=>{const fn=this.pendingConfirm;$("#confirmOverlay").classList.add("hidden");this.pendingConfirm=null;fn?.()};
    $("#resultSelectBtn").onclick=()=>{this.engine.stop();this.hideResult();this.beginSelection()};
    $("#resultMenuBtn").onclick=()=>{this.engine.stop();this.hideResult();this.show("home")};
    $("#trainingResetBtn").onclick=()=>this.engine.resetTrainingPosition();
    $("#debugBoxesBtn").onclick=()=>{this.engine.setDebug(!this.engine.debug);$("#debugBoxesBtn").classList.toggle("active",this.engine.debug)};
    $("#recordDummyBtn").onclick=()=>this.toggleDummyRecord();
    $("#playDummyBtn").onclick=()=>this.engine.playDummy();

    this.input.onPause(()=>this.togglePause());
    addEventListener("visibilitychange",()=>{if(document.hidden&&this.currentScreen()==="arena"&&this.engine.running&&!this.engine.paused)this.openPause()});
    addEventListener("gamepaddisconnected",()=>{if(this.currentScreen()==="arena"&&this.engine.running&&!this.engine.paused)this.openPause()});
    addEventListener("keydown",e=>this.menuKeyboard(e));
    document.addEventListener("click",e=>{if(e.target.closest("button"))this.audio.play("ui")});
  }
  currentScreen(){return $(".screen.active")?.id||""}
  show(id){
    $$(".screen").forEach(s=>s.classList.remove("active"));$("#"+id)?.classList.add("active");
    this.audio.play("ui");
    setTimeout(()=>this.focusFirst(),0);
  }
  focusFirst(){
    const active=$(".screen.active");active?.querySelector("button:not([disabled]),select,input")?.focus({preventScroll:true});
  }
  startQuick(){
    this.gameMode="quick";this.config.mode="quick";this.config.opponentType="cpu";this.mapContext="fight";this.show("fightConfig");
    $("#difficultySelect").value=this.settings.get("difficulty")||"normal";
  }
  confirmFightConfig(){
    this.config.opponentType=$("#opponentType").value;this.config.difficulty=$("#difficultySelect").value;
    this.config.bestOf=Number($("#roundsSelect").value)||3;this.config.time=Number($("#timeSelect").value)||75;
    this.settings.set("difficulty",this.config.difficulty);this.beginSelection();
  }
  startTournament(){
    this.gameMode="tournament";this.config={...this.config,mode:"tournament",opponentType:"cpu",difficulty:"normal",bestOf:3,time:75};
    this.tournament={active:false,round:0,opponents:[]};this.mapContext="fight";this.beginSelection();
  }
  startTraining(){
    this.gameMode="training";this.config={...this.config,mode:"training",opponentType:"cpu",difficulty:"easy",bestOf:1,time:99};
    this.mapContext="fight";this.beginSelection();
  }
  openMapGallery(){this.gameMode="gallery";this.mapContext="gallery";$("#mapConfirm").textContent="USAR COMO ARENA PADRÃO";this.renderMaps();this.show("maps")}
  beginSelection(){
    this.selectionPhase="p1";this.cursor=this.config.p1Index||0;this.renderRoster();this.show("select");
  }
  backFromSelect(){
    if(this.selectionPhase==="p2"){this.selectionPhase="p1";this.cursor=this.config.p1Index;this.renderRoster();return}
    if(this.gameMode==="quick")this.show("fightConfig");else this.show("home");
  }
  avatar(f){return `<div class="avatar"><img src="${f.portrait}" alt="${f.name}"><span class="portrait-glow"></span></div>`}
  renderRoster(){
    const p1=this.config.p1Index,p2=this.selectionPhase==="p2"?this.config.p2Index:null;
    $("#roster").innerHTML=fighters.map((f,i)=>`<button class="char ${i===this.cursor?"active":""}" data-i="${i}">
      ${i===p1&&this.selectionPhase==="p2"?'<span class="badge">P1</span>':""}
      ${i===p2&&this.selectionPhase==="p2"?'<span class="badge p2">'+(this.config.opponentType==="p2"?"P2":this.gameMode==="training"?"DUMMY":"CPU")+'</span>':""}
      ${this.avatar(f)}<b>${f.name}</b><small>ESPECIAL: ${f.power}</small></button>`).join("");
    $$(".char").forEach(b=>b.onclick=()=>{this.cursor=Number(b.dataset.i);this.renderRoster()});
    const f=fighters[this.cursor];
    $("#selectedCard").innerHTML=`<div class="big-avatar">${this.avatar(f)}</div><div class="card-info"><small>${this.selectionPhase==="p1"?"LUTADOR P1":"SEGUNDO LUTADOR"}</small><h3>${f.name}</h3><p>ESPECIAL: <b>${f.power}</b><br>ESPECIAL B: <b>${f.specialB}</b><br>SUPER: <b>${f.super}</b></p><div class="stats">${["FORÇA","AGILIDADE","DEFESA"].map((x,i)=>`<div class="stat"><span>${x}</span><div class="bar"><i style="width:${f.stats[i]}%"></i></div></div>`).join("")}</div></div>`;
    const who=this.selectionPhase==="p1"?"P1":this.config.opponentType==="p2"?"P2":this.gameMode==="training"?"DUMMY":"CPU";
    $("#selectPhaseLabel").textContent=`${who} • ESCOLHA O LUTADOR`;
    $("#selectHint").textContent=this.selectionPhase==="p1"?"Confirme para continuar.":"Escolha o adversário.";
    $("#confirmFighterBtn").textContent="CONFIRMAR "+who;
  }
  confirmFighter(){
    if(this.selectionPhase==="p1"){
      this.config.p1Index=this.cursor;
      if(this.gameMode==="tournament"){this.setupTournament();this.openFightMaps();return}
      this.selectionPhase="p2";this.cursor=this.cursor===0?1:0;this.config.p2Index=this.cursor;this.renderRoster();return;
    }
    if(this.cursor===this.config.p1Index&&this.gameMode!=="training"){this.cursor=(this.cursor+1)%fighters.length;this.config.p2Index=this.cursor;this.renderRoster();return}
    this.config.p2Index=this.cursor;this.openFightMaps();
  }
  openFightMaps(){this.mapContext="fight";$("#mapConfirm").textContent=this.gameMode==="tournament"?"CONTINUAR":"CONFIRMAR ARENA";this.renderMaps();this.show("maps")}
  backFromMaps(){
    if(this.mapContext==="gallery"){this.show("home");return}
    this.beginSelection();
  }
  renderMaps(){
    $("#mapGrid").innerHTML=maps.map((m,i)=>`<button class="map-card ${i===this.selectedMap?"active":""}" data-map="${i}"><img src="${m.src}" alt="${m.name}"><span><b>${m.name}</b><small>${m.subtitle}</small></span></button>`).join("");
    $$(".map-card").forEach(b=>b.onclick=()=>{this.selectedMap=Number(b.dataset.map);this.renderMaps()});
    const m=maps[this.selectedMap];$("#mapInfo").innerHTML=`<b>${m.name}</b><span>${m.subtitle}</span>`;
  }
  confirmMap(){
    this.config.mapIndex=this.selectedMap;localStorage.setItem("ccf-last-map",String(this.selectedMap));
    if(this.mapContext==="gallery"){this.audio.play("confirm");this.show("home");return}
    if(this.gameMode==="tournament"){this.config.p2Index=this.tournament.opponents[this.tournament.round];this.renderTournament();this.show("tournament");return}
    this.prepareVs();
  }
  setupTournament(){
    const used=[];this.tournament.opponents=[];
    for(let i=0;i<3;i++){const o=chooseOpponent(this.config.p1Index,used);used.push(o);this.tournament.opponents.push(o)}
    this.tournament.active=true;this.tournament.round=0;
  }
  renderTournament(){
    const labels=["QUARTAS DE FINAL","SEMIFINAL","FINAL"];$("#tournamentTitle").innerHTML=`${labels[this.tournament.round]} <span>•</span>`;
    $("#bracket").innerHTML=this.tournament.opponents.map((idx,i)=>`<div class="bracket-round ${i<this.tournament.round?"done":i===this.tournament.round?"current":"future"}"><small>${["LUTA 1","LUTA 2","FINAL"][i]}</small><div class="bracket-match"><span>${fighters[this.config.p1Index].name}</span><b>VS</b><span>${fighters[idx].name}</span></div></div>`).join("");
  }
  prepareVs(){
    const p1=fighters[this.config.p1Index],p2=fighters[this.config.p2Index],m=maps[this.config.mapIndex];
    $("#vsMode").textContent=this.gameMode==="tournament"?"MODO TORNEIO":this.gameMode==="training"?"MODO TREINO":"LUTA SIMPLES";
    $("#vsP1Img").src=p1.portrait;$("#vsP2Img").src=p2.portrait;$("#vsP1Name").textContent=p1.name;$("#vsP2Name").textContent=p2.name;
    $("#vsP1Power").textContent=p1.power;$("#vsP2Power").textContent=p2.power;$("#vsArena").textContent=m.name;
    $("#vsP2Label").textContent=this.config.opponentType==="p2"?"P2":this.gameMode==="training"?"DUMMY":"CPU";this.show("vs");
  }
  beginFight(){
    this.hideOverlays();this.hideResult();this.show("arena");$("#trainingPanel").classList.toggle("hidden",this.gameMode!=="training");
    this.audio.play("confirm");this.engine.start({...this.config,mode:this.gameMode});
  }
  handleMatchEnd(result){
    this.engine.pause(true);
    const p1Won=result.winner==="p1";
    if(this.gameMode==="training")return;
    $("#modal").classList.add("show");
    if(this.gameMode==="tournament"){
      if(p1Won&&this.tournament.round<2){
        $("#modalKicker").textContent="TORNEIO";$("#modalTitle").textContent="CLASSIFICADO!";$("#modalText").textContent="Você avançou para a próxima fase.";
        $("#rematch").textContent="PRÓXIMA LUTA";$("#rematch").onclick=()=>{this.hideResult();this.engine.stop();this.tournament.round++;this.config.p2Index=this.tournament.opponents[this.tournament.round];this.selectedMap=(this.selectedMap+1)%maps.length;this.config.mapIndex=this.selectedMap;this.renderTournament();this.show("tournament")};
      }else if(p1Won){
        $("#modalKicker").textContent="TORNEIO";$("#modalTitle").textContent="CAMPEÃO!";$("#modalText").textContent=fighters[this.config.p1Index].name+" venceu o torneio.";
        $("#rematch").textContent="NOVO TORNEIO";$("#rematch").onclick=()=>{this.hideResult();this.engine.stop();this.startTournament()};
      }else{
        $("#modalKicker").textContent="TORNEIO";$("#modalTitle").textContent="ELIMINADO";$("#modalText").textContent=fighters[result.winnerIndex].name+" venceu o confronto.";
        $("#rematch").textContent="RECOMEÇAR";$("#rematch").onclick=()=>{this.hideResult();this.engine.stop();this.startTournament()};
      }
    }else{
      $("#modalKicker").textContent=result.perfect?"PERFECT":"RESULTADO";$("#modalTitle").textContent=p1Won?"VITÓRIA!":"DERROTA";
      $("#modalText").textContent=fighters[result.winnerIndex].name+" venceu a luta.";
      $("#rematch").textContent="REVANCHE";$("#rematch").onclick=()=>{this.hideResult();this.engine.start({...this.config,mode:this.gameMode})};
    }
  }
  hideResult(){$("#modal").classList.remove("show")}
  togglePause(){
    if(this.currentScreen()!=="arena"||!this.engine.running||this.engine.matchOver)return;
    if(!$("#confirmOverlay").classList.contains("hidden")){$("#confirmNo").click();return}
    if(!$("#controlsOverlay").classList.contains("hidden")||!$("#quickSettingsOverlay").classList.contains("hidden")){this.backToPause();return}
    if(this.engine.paused)this.closePause();else this.openPause();
  }
  openPause(){if(!this.engine.running)return;this.engine.pause(true);$("#pauseOverlay").classList.remove("hidden");$("#controlsOverlay").classList.add("hidden");$("#quickSettingsOverlay").classList.add("hidden")}
  closePause(){this.hideOverlays();this.engine.pause(false)}
  openPauseControls(){$("#pauseOverlay").classList.add("hidden");$("#controlsOverlay").classList.remove("hidden")}
  backToPause(){$("#controlsOverlay").classList.add("hidden");$("#pauseOverlay").classList.remove("hidden")}
  openQuickSettings(){
    $("#pauseVolume").value=this.settings.get("masterVolume");$("#pauseShake").checked=this.settings.get("reduceShake");
    $("#pauseOverlay").classList.add("hidden");$("#quickSettingsOverlay").classList.remove("hidden");
  }
  saveQuickSettings(){this.audio.setVolume($("#pauseVolume").value);this.settings.set("reduceShake",$("#pauseShake").checked)}
  askConfirm(title,msg,fn){
    this.pendingConfirm=fn;$("#confirmTitle").textContent=title;$("#confirmMessage").textContent=msg;$("#confirmOverlay").classList.remove("hidden");
  }
  hideOverlays(){$("#pauseOverlay").classList.add("hidden");$("#controlsOverlay").classList.add("hidden");$("#quickSettingsOverlay").classList.add("hidden");$("#confirmOverlay").classList.add("hidden")}
  renderSettings(){
    $("#masterVolume").value=this.settings.get("masterVolume");$("#musicVolume").value=this.settings.get("musicVolume");$("#sfxVolume").value=this.settings.get("sfxVolume");$("#uiVolume").value=this.settings.get("uiVolume");$("#reduceShake").checked=this.settings.get("reduceShake");$("#reduceFlashes").checked=this.settings.get("reduceFlashes");
    $("#simpleSpecial").checked=this.settings.get("simpleSpecial");$("#forceTouch").checked=this.settings.get("forceTouch");
  }
  saveSettings(){
    this.audio.setVolume($("#masterVolume").value);this.audio.setCategory("music",$("#musicVolume").value);this.audio.setCategory("sfx",$("#sfxVolume").value);this.audio.setCategory("ui",$("#uiVolume").value);this.settings.patch({reduceShake:$("#reduceShake").checked,reduceFlashes:$("#reduceFlashes").checked,simpleSpecial:$("#simpleSpecial").checked,forceTouch:$("#forceTouch").checked});
    this.audio.play("confirm");this.show("home");
  }
  toggleDummyRecord(){
    if(this.engine.recording){this.engine.stopDummyRecord();$("#recordDummyBtn").textContent="GRAVAR"}
    else{this.engine.startDummyRecord();$("#recordDummyBtn").textContent="PARAR"}
  }
  menuContainer(){
    const overlays=["#confirmOverlay","#controlsOverlay","#quickSettingsOverlay","#pauseOverlay"];
    for(const sel of overlays){const el=$(sel);if(el&&!el.classList.contains("hidden"))return el}
    return $(".screen.active");
  }
  menuKeyboard(e){
    const active=this.menuContainer();if(!active)return;
    if(this.currentScreen()==="arena"&&active.classList.contains("screen"))return;
    const focusable=[...active.querySelectorAll("button:not([disabled]),select,input")].filter(x=>x.offsetParent!==null);
    if(!focusable.length)return;
    const i=Math.max(0,focusable.indexOf(document.activeElement));
    if(["ArrowDown","ArrowRight"].includes(e.key)){e.preventDefault();focusable[(i+1)%focusable.length].focus()}
    if(["ArrowUp","ArrowLeft"].includes(e.key)){e.preventDefault();focusable[(i-1+focusable.length)%focusable.length].focus()}
    if(e.key==="Escape"){
      e.preventDefault();
      if(active.id==="controlsOverlay"||active.id==="quickSettingsOverlay"){this.backToPause();return}
      if(active.id==="confirmOverlay"){$("#confirmNo").click();return}
      const back=active.querySelector(".back");if(back)back.click();
    }
  }
  menuPadLoop=()=>{
    const pad=(navigator.getGamepads?.()||[])[0],active=this.menuContainer();
    const arenaWithoutOverlay=this.currentScreen()==="arena"&&active?.classList.contains("screen");
    if(pad&&active&&!arenaWithoutOverlay){
      const now=performance.now(),down=pad.buttons[13]?.pressed||(pad.axes[1]||0)>.55,up=pad.buttons[12]?.pressed||(pad.axes[1]||0)<-.55;
      const a=pad.buttons[0]?.pressed,b=pad.buttons[1]?.pressed;
      if(now-this.padNav.lastMove>170&&(down||up)){
        const fs=[...active.querySelectorAll("button:not([disabled]),select,input")].filter(x=>x.offsetParent!==null);
        if(fs.length){const i=Math.max(0,fs.indexOf(document.activeElement)),n=down?(i+1)%fs.length:(i-1+fs.length)%fs.length;fs[n].focus();this.padNav.lastMove=now}
      }
      if(a&&!this.padNav.a)document.activeElement?.click?.();
      if(b&&!this.padNav.b){
        if(active.id==="controlsOverlay"||active.id==="quickSettingsOverlay")this.backToPause();
        else if(active.id==="confirmOverlay")$("#confirmNo").click();
        else active.querySelector(".back")?.click?.();
      }
      this.padNav.a=a;this.padNav.b=b;
    }
    requestAnimationFrame(this.menuPadLoop);
  }
}
