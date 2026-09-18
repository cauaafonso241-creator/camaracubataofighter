import {fighters,maps,createCharacterMoves,difficulty,projectileGlyph,projectileTypes} from "./data.js";

const FIXED_DT=1/60;
const WORLD_LEFT=6.5,WORLD_RIGHT=93.5,Y_SCALE=1.6;
const STATES={
  IDLE:"IDLE",WALK:"WALK",CROUCH:"CROUCH",AIRBORNE:"AIRBORNE",ATTACK:"ATTACK",SPECIAL:"SPECIAL",SUPER:"SUPER",
  HITSTUN:"HITSTUN",BLOCKSTUN:"BLOCKSTUN",KNOCKDOWN:"KNOCKDOWN",WAKEUP:"WAKEUP",THROW:"THROW",THROWN:"THROWN",
  VICTORY:"VICTORY",DEFEAT:"DEFEAT"
};
const SCALE=[1,.90,.80,.72,.65,.60,.56,.55];

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const rand=(a,b)=>a+Math.floor(Math.random()*(b-a+1));

class Fighter{
  constructor(index,x,side){
    this.index=index;this.data=fighters[index];this.moves=createCharacterMoves(this.data);this.side=side;this.x=x;
    this.wins=0;this.resetRound(x);
  }
  resetRound(x){
    this.x=x;this.y=0;this.vy=0;this.onGround=true;this.facing=this.side==="p1"?1:-1;
    this.hp=1000;this.redHp=1000;this.meter=0;this.state=STATES.IDLE;this.stateFrame=0;this.move=null;this.moveFrame=0;
    this.hitstun=0;this.blockstun=0;this.knockdown=0;this.wakeup=0;this.invuln=0;this.blocking=false;this.blockType="high";
    this.crouching=false;this.dashFrames=0;this.dashDir=0;this.buffer=[];this.connected=null;this.pendingKnockdown=false;
    this.comboCount=0;this.comboDamage=0;this.lastHitFrame=-999;this.lastDashFrame=-999;this.justLanded=0;
  }
  neutral(){return [STATES.IDLE,STATES.WALK,STATES.CROUCH].includes(this.state)}
  locked(){return [STATES.HITSTUN,STATES.BLOCKSTUN,STATES.KNOCKDOWN,STATES.WAKEUP,STATES.THROWN,STATES.VICTORY,STATES.DEFEAT].includes(this.state)}
}

class AIController{
  constructor(level="normal"){this.level=level;this.cooldown=0;this.intent={move:0,guard:false,down:false,action:null};}
  setLevel(level){this.level=level in difficulty?level:"normal"}
  step(engine,actor,opponent){
    const cfg=difficulty[this.level]||difficulty.normal;
    if(this.cooldown>0){this.cooldown--;return this.intent}
    this.cooldown=rand(cfg.reaction[0],cfg.reaction[1]);
    const d=Math.abs(opponent.x-actor.x),toward=actor.x<opponent.x?1:-1,away=-toward;
    const atCorner=actor.x<10||actor.x>90,lowLife=actor.hp<350,opponentAir=!opponent.onGround;
    const intent={move:0,guard:false,down:false,action:null};
    if(Math.random()<cfg.error){intent.move=Math.random()<.5?toward:away;this.intent=intent;return intent}
    if(opponentAir&&d<15&&Math.random()<.68){intent.action="heavy";this.intent=intent;return intent}
    if(atCorner&&d<14&&Math.random()<.42){intent.guard=Math.random()<.55;intent.move=intent.guard?0:(actor.x<50?1:-1);this.intent=intent;return intent}
    if(lowLife&&d<17&&Math.random()<cfg.blockChance+.12){intent.guard=true;intent.down=opponent.move?.hitLevel==="low";this.intent=intent;return intent}
    if(opponent.move&&d<16&&Math.random()<cfg.blockChance){
      intent.guard=true;intent.down=opponent.move.hitLevel==="low";this.intent=intent;return intent;
    }
    if(opponent.move&&engine.phaseOf(opponent)==="RECOVERY"&&d<13&&Math.random()<.6){intent.action="kick";this.intent=intent;return intent}
    if(d>24){
      intent.move=toward;
      if(actor.meter>=35&&Math.random()<cfg.specialChance)intent.action=Math.random()<.65?"specialA":"specialB";
      else if(Math.random()<.15)intent.action="dashForward";
    }else if(d>11){
      if(Math.random()<.45)intent.move=toward;
      if(Math.random()<cfg.attackChance*.55)intent.action=Math.random()<.55?"kick":"heavy";
      else if(actor.meter>=35&&Math.random()<cfg.specialChance)intent.action="specialA";
    }else{
      const r=Math.random();
      if(r<cfg.blockChance*.45)intent.guard=true;
      else if(r<cfg.attackChance*.42)intent.action="jab";
      else if(r<cfg.attackChance*.75)intent.action="kick";
      else if(r<cfg.attackChance)intent.action="heavy";
      else if(actor.meter>=35&&Math.random()<cfg.specialChance)intent.action="specialB";
    }
    if(actor.meter>=100&&Math.random()<cfg.specialChance*.5)intent.action="super";
    this.intent=intent;return intent;
  }
}

class Renderer{
  constructor(engine){
    this.engine=engine;
    this.stage=document.querySelector("#stage");
    this.fighterEls={p1:document.querySelector("#p1"),p2:document.querySelector("#p2")};
    this.projectileLayer=document.querySelector("#projectileLayer");
    this.vfxLayer=document.querySelector("#vfxLayer");
    this.debugLayer=document.querySelector("#debugLayer");
  }
  render(){
    const e=this.engine;if(!e.p1||!e.p2)return;
    this.renderFighter("p1",e.p1);this.renderFighter("p2",e.p2);
    this.renderHUD();this.renderProjectiles();this.renderDebug();
    const mid=(e.p1.x+e.p2.x)/2,shift=clamp((50-mid)*.08,-2.2,2.2);
    this.stage.style.setProperty("--camera-shift",shift+"%");
  }
  renderFighter(id,a){
    const el=this.fighterEls[id];if(!el)return;
    el.style.left=a.x+"%";el.style.bottom=`calc(var(--stage-floor) + ${(a.y*Y_SCALE).toFixed(2)}%)`;
    const classes=["fighter"];if(id==="p2")classes.push("enemy");
    if(a.state===STATES.WALK)classes.push("walking");
    if(a.state===STATES.CROUCH)classes.push("crouching");
    if(a.state===STATES.AIRBORNE)classes.push("airborne");
    if(a.state===STATES.HITSTUN||a.state===STATES.THROWN)classes.push("hit");
    if(a.state===STATES.KNOCKDOWN)classes.push("knockdown");
    if(a.state===STATES.VICTORY)classes.push("victory");
    if(a.state===STATES.DEFEAT)classes.push("defeat");
    if(a.blocking||a.state===STATES.BLOCKSTUN)classes.push("blocking");
    if(a.dashFrames>0)classes.push("dashing");
    if(a.move){
      const idm=a.move.id;
      if(idm==="jab")classes.push("attack");
      else if(idm==="kick"||idm==="airKick")classes.push("kick");
      else if(idm==="heavy")classes.push("heavy");
      else if(idm==="lowKick")classes.push("lowkick");
      else if(idm==="specialA"||idm==="specialB")classes.push("specialFx");
      else if(idm==="super")classes.push("superFx");
    }
    el.className=classes.join(" ");
    el.dataset.phase=this.engine.phaseOf(a);
    el.dataset.special=a.data.type;
  }
  renderHUD(){
    const e=this.engine;
    for(const [id,a] of [["p1",e.p1],["p2",e.p2]]){
      const life=document.querySelector("#"+id+"Health"),red=document.querySelector("#"+id+"RedHealth"),meter=document.querySelector("#"+id+"Energy");
      if(life)life.style.width=(a.hp/10)+"%";
      if(red)red.style.width=(a.redHp/10)+"%";
      if(meter)meter.style.width=a.meter+"%";
    }
    document.querySelector("#p1Wins").textContent="●".repeat(e.p1.wins);
    document.querySelector("#p2Wins").textContent="●".repeat(e.p2.wins);
    document.querySelector("#timer").textContent=Math.max(0,Math.ceil(e.roundFrames/60));
    if(e.mode==="training"){
      const fd=document.querySelector("#frameDataText"),cd=document.querySelector("#comboDamageText"),inp=document.querySelector("#inputDisplay");
      if(fd)fd.textContent=e.p1.move?`${e.p1.move.id.toUpperCase()} • ${e.phaseOf(e.p1)} • F${e.p1.moveFrame}`:e.p1.state;
      if(cd)cd.textContent=`DANO: ${e.p1.comboDamage}`;
      if(inp)inp.innerHTML=e.input.recentLabels("p1",20).map(x=>`<span class="input-chip">${x}</span>`).join("");
    }
  }
  renderProjectiles(){
    this.projectileLayer.innerHTML=this.engine.projectiles.map(p=>`<span class="projectile ${p.css}" style="left:${p.x}%;bottom:calc(var(--stage-floor) + ${(p.y*Y_SCALE).toFixed(2)}%)">${p.glyph}</span>`).join("");
  }
  renderDebug(){
    if(!this.engine.debug){this.debugLayer.innerHTML="";return}
    const boxes=[];
    for(const [id,a] of [["P1",this.engine.p1],["P2",this.engine.p2]]){
      const h=this.engine.hurtbox(a),p=this.engine.pushbox(a);
      boxes.push(this.box(h,"hurt"),this.box(p,"push"));
      if(a.move&&this.engine.phaseOf(a)==="ACTIVE"&&!a.move.projectile){
        const hb=this.engine.hitbox(a,a.move);if(hb)boxes.push(this.box(hb,a.move.kind==="throw"?"throw":"hit"));
      }
      boxes.push(`<span class="debug-label" style="left:${a.x}%;bottom:calc(var(--stage-floor) + ${((a.y+20)*Y_SCALE).toFixed(2)}%)">${id} ${a.state}${a.move?" "+a.move.id+" F"+a.moveFrame:""}</span>`);
    }
    for(const pr of this.engine.projectiles)boxes.push(this.box({x:pr.x-pr.w/2,y:pr.y-pr.h/2,w:pr.w,h:pr.h},"projectile-box"));
    this.debugLayer.innerHTML=boxes.join("");
  }
  box(b,cls){return `<i class="debug-box ${cls}" style="left:${b.x}%;width:${b.w}%;bottom:calc(var(--stage-floor) + ${(b.y*Y_SCALE).toFixed(2)}%);height:${(b.h*Y_SCALE).toFixed(2)}%"></i>`}
}

export class GameEngine{
  constructor({input,audio,settings,onMatchEnd=()=>{},onRoundEnd=()=>{}}){
    this.input=input;this.audio=audio;this.settings=settings;this.onMatchEnd=onMatchEnd;this.onRoundEnd=onRoundEnd;
    this.renderer=new Renderer(this);this.running=false;this.paused=false;this.raf=0;this.lastTime=0;this.acc=0;this.frame=0;this.hitstop=0;
    this.p1=null;this.p2=null;this.projectiles=[];this.projectileId=0;this.mode="quick";this.config=null;this.debug=false;
    this.ai=null;this.round=1;this.roundFrames=75*60;this.roundOver=false;this.matchOver=false;this.freezeRoundIntro=0;
    this.comboOwner=null;this.comboTimer=0;this.roundEndFrames=0;this.roundWinner=null;this.roundReason="";this.recording=false;this.recorded=[];this.replaying=false;this.replayIndex=0;
    this.lastInput={p1:null,p2:null};
  }
  start(config){
    this.stop();this.config={...config};this.mode=config.mode||"quick";this.paused=false;this.frame=0;this.round=1;this.roundOver=false;this.matchOver=false;
    this.p1=new Fighter(config.p1Index,20,"p1");this.p2=new Fighter(config.p2Index,80,"p2");
    this.input.setP2Enabled(config.opponentType==="p2"||this.mode==="training");
    this.ai=new AIController(config.difficulty||this.settings.get("difficulty")||"normal");
    this.projectiles=[];this.setupArena();this.audio.startMusic?.(maps[config.mapIndex]?.id);this.setupFighterDOM("p1",this.p1);this.setupFighterDOM("p2",this.p2);this.resetRound(true);
    this.running=true;this.lastTime=performance.now();this.acc=0;this.loop(this.lastTime);
  }
  stop(){this.running=false;if(this.raf)cancelAnimationFrame(this.raf);this.raf=0;this.projectiles=[];this.audio.stopMusic?.()}
  pause(v=true){this.paused=v;this.input.clear();if(!v)this.lastTime=performance.now()}
  loop=(now)=>{
    if(!this.running)return;
    const delta=Math.min(.1,Math.max(0,(now-this.lastTime)/1000));this.lastTime=now;
    if(!this.paused){
      this.acc+=delta;
      let guard=0;
      while(this.acc>=FIXED_DT&&guard<6){this.step();this.acc-=FIXED_DT;guard++}
    }
    this.renderer.render();this.raf=requestAnimationFrame(this.loop);
  };
  setupArena(){
    const map=maps[this.config.mapIndex];
    document.querySelector("#stageBg").src=map.src;document.querySelector("#stageName").textContent=map.name.toUpperCase();
    document.querySelector("#p1Name").textContent=this.p1.data.name;document.querySelector("#p2Name").textContent=this.p2.data.name;
    document.querySelector("#p1HudImg").src=this.p1.data.portrait;document.querySelector("#p2HudImg").src=this.p2.data.portrait;
    document.querySelector("#p2HudSide").textContent=this.config.opponentType==="p2"?"P2":"CPU";
  }
  setupFighterDOM(id,a){
    const el=document.querySelector("#"+id);el.style.setProperty("--fighter-color",a.data.color);
    el.querySelector(".sprite").innerHTML=this.fighterMarkup(a.data);el.dataset.special=a.data.type;
  }
  propMarkup(f){
    if(f.type==="cavaco")return `<div class="fighter-prop prop-cavaco"><span class="prop-neck"></span><span class="prop-body"></span><span class="prop-strings"></span></div>`;
    if(f.type==="scissors")return `<div class="fighter-prop prop-scissors"><span class="scissor-ring r1"></span><span class="scissor-ring r2"></span><span class="scissor-blade b1"></span><span class="scissor-blade b2"></span></div>`;
    if(f.type==="process")return `<div class="fighter-prop prop-process"><span>PROC.</span><i></i><i></i><i></i></div>`;
    if(f.type==="water")return `<div class="fighter-prop prop-water"><span class="gallon-handle"></span><span class="gallon-cap"></span></div>`;
    if(f.type==="dumbbell")return `<div class="fighter-prop prop-dumbbell"><span class="db-left"></span><span class="db-bar"></span><span class="db-right"></span></div>`;
    if(f.type==="ball")return `<div class="fighter-prop prop-ball">⚽</div>`;return "";
  }
  fighterMarkup(f){
    return `<div class="fighter-rig">
      <div class="leg leg-back"><span class="thigh"></span><span class="calf"></span><span class="shoe"></span></div>
      <div class="leg leg-front"><span class="thigh"></span><span class="calf"></span><span class="shoe"></span></div>
      <div class="torso"><span class="jacket-lapel lapel-left"></span><span class="jacket-lapel lapel-right"></span><span class="shirt"></span><span class="tie"></span></div>
      <div class="arm arm-back"><span class="upper"></span><span class="forearm"></span><span class="hand"></span></div>
      <div class="head"><div class="face-frame"><img src="${f.portrait}" alt="${f.name}"></div></div>
      <div class="arm arm-front"><span class="upper"></span><span class="forearm"></span><span class="hand"></span></div>
      ${this.propMarkup(f)}</div>`;
  }
  resetRound(first=false){
    const w1=this.p1.wins,w2=this.p2.wins;this.p1.resetRound(20);this.p2.resetRound(80);this.p1.wins=w1;this.p2.wins=w2;
    this.projectiles=[];this.roundFrames=(this.config.time||75)*60;this.roundOver=false;this.roundEndFrames=0;this.roundWinner=null;this.roundReason="";this.hitstop=0;this.freezeRoundIntro=62;this.comboOwner=null;this.comboTimer=0;
    document.querySelector("#roundLabel").textContent="ROUND "+this.round;
    this.announce("ROUND "+this.round,550);setTimeout(()=>{if(this.running&&!this.paused)this.announce("FIGHT!",450)},580);
  }
  announce(text,ms=500){
    const el=document.querySelector("#announcement");el.textContent=text;
    setTimeout(()=>{if(el.textContent===text)el.textContent=""},ms);
  }
  phaseOf(a){
    if(!a.move)return "";
    const d=a.move,f=a.moveFrame;
    if(f<d.startup)return "STARTUP";
    if(f<d.startup+d.active)return "ACTIVE";
    return "RECOVERY";
  }
  step(){
    this.frame++;
    const facing={p1:this.p1.x<=this.p2.x?1:-1,p2:this.p2.x<=this.p1.x?1:-1};this.p1.facing=facing.p1;this.p2.facing=facing.p2;
    const inp=this.input.step(facing);this.lastInput=inp;
    this.bufferInput(this.p1,inp.p1,"p1");
    const p2Human=this.config.opponentType==="p2"||this.mode==="training"&&this.recording;
    if(p2Human)this.bufferInput(this.p2,inp.p2,"p2");
    if(this.recording&&this.mode==="training"){
      this.recorded.push(this.encodeInput(inp.p2));if(this.recorded.length>=600)this.recording=false;
    }
    if(this.freezeRoundIntro>0){this.freezeRoundIntro--;return}
    if(this.hitstop>0){this.hitstop--;this.processBuffersOnly();return}
    if(this.matchOver)return;
    if(this.roundOver){
      if(this.roundEndFrames>0)this.roundEndFrames--;
      if(this.roundEndFrames===0&&this.roundWinner)this.finishRound(this.roundWinner,this.roundReason);
      return;
    }
    this.updateGuard(this.p1,inp.p1);this.updateGuard(this.p2,inp.p2);
    if(!p2Human)this.updateCPU(inp);
    if(this.mode==="training"&&this.replaying)this.applyReplayToDummy();
    this.consumeBuffer(this.p1,"p1");this.consumeBuffer(this.p2,"p2");
    this.updateFighter(this.p1,"p1");this.updateFighter(this.p2,"p2");
    this.resolvePushboxes();this.updateProjectiles();this.resolveProjectileClashes();this.resolveProjectileHits();
    this.updateComboState();this.updateTimer();this.updateTrainingRules();
    if(this.p1.redHp>this.p1.hp)this.p1.redHp=Math.max(this.p1.hp,this.p1.redHp-1.5);
    if(this.p2.redHp>this.p2.hp)this.p2.redHp=Math.max(this.p2.hp,this.p2.redHp-1.5);
  }
  processBuffersOnly(){this.consumeBuffer(this.p1,"p1",true);this.consumeBuffer(this.p2,"p2",true)}
  encodeInput(frame){return {held:[...frame.held],pressed:[...frame.pressed],dir:frame.dir}}
  applyReplayToDummy(){
    if(!this.recorded.length){this.replaying=false;return}
    const r=this.recorded[this.replayIndex++%this.recorded.length];
    const fake={held:new Set(r.held),pressed:new Set(r.pressed),released:new Set(),dir:r.dir};
    this.bufferInput(this.p2,fake,"p2",true);this.updateGuard(this.p2,fake);
  }
  startDummyRecord(){this.recorded=[];this.recording=true;this.replaying=false}
  stopDummyRecord(){this.recording=false}
  playDummy(){if(this.recorded.length){this.replaying=true;this.recording=false;this.replayIndex=0}}
  bufferInput(a,inp,side,fromReplay=false){
    if(!inp)return;
    const push=(type,ttl)=>{if(!a.buffer.some(q=>q.type===type&&q.expires>=this.frame))a.buffer.push({type,expires:this.frame+ttl})};
    const both=inp.held.has("punch")&&inp.held.has("kick")&&(inp.pressed.has("punch")||inp.pressed.has("kick"));
    const superInput=inp.held.has("heavy")&&inp.held.has("special")&&(inp.pressed.has("heavy")||inp.pressed.has("special"));
    if(superInput||((inp.pressed.has("special")||inp.pressed.has("heavy"))&&this.input.motion(side,"doubleQcf",22)))push("super",8);
    else if(both)push("throw",5);
    else{
      if((inp.pressed.has("punch")||inp.pressed.has("kick"))&&this.input.motion(side,"qcf",16))push(inp.pressed.has("kick")?"specialB":"specialA",8);
      else{
        if(inp.pressed.has("punch"))push("jab",5);
        if(inp.pressed.has("kick"))push(!a.onGround?"airKick":inp.held.has("down")?"lowKick":"kick",5);
        if(inp.pressed.has("heavy"))push("heavy",5);
        if(inp.pressed.has("special")&&this.settings.get("simpleSpecial"))push(inp.held.has("down")?"specialB":"specialA",8);
      }
    }
    if(inp.pressed.has("up")&&a.onGround)push("jump",5);
    if((inp.pressed.has("left")||inp.pressed.has("right"))&&this.frame-a.lastDashFrame>10){
      if(this.input.doubleTap(side,"F",12)){push("dashForward",4);a.lastDashFrame=this.frame}
      else if(this.input.doubleTap(side,"B",12)){push("dashBack",4);a.lastDashFrame=this.frame}
    }
  }
  consumeBuffer(a,side,duringHitstop=false){
    a.buffer=a.buffer.filter(q=>q.expires>=this.frame);
    if(duringHitstop)return;
    for(let i=0;i<a.buffer.length;i++){
      if(this.tryAction(a,a.buffer[i].type,side)){a.buffer.splice(i,1);break}
    }
  }
  tryAction(a,type,side){
    if(a.locked())return false;
    if(type==="jump"){
      if(a.onGround&&a.neutral()){a.state=STATES.AIRBORNE;a.onGround=false;a.vy=1.52;a.stateFrame=0;this.audio.play("jump");return true}return false;
    }
    if(type==="dashForward"||type==="dashBack"){
      if(a.onGround&&a.neutral()){a.dashFrames=type==="dashForward"?8:7;a.dashDir=(type==="dashForward"?1:-1)*a.facing;a.state=STATES.WALK;return true}return false;
    }
    const move=a.moves[type];if(!move)return false;
    if((move.meterCost||0)>a.meter)return false;
    if(a.move){
      if(!this.canCancel(a,type))return false;
      this.endMove(a);
    }else if(!a.neutral()&&a.state!==STATES.AIRBORNE)return false;
    if(type==="airKick"&&a.onGround)return false;
    if(type!=="airKick"&&!a.onGround&&move.kind!=="air")return false;
    this.startMove(a,move);return true;
  }
  canCancel(a,target){
    if(!a.move||!a.connected)return false;
    const d=a.move;if(a.moveFrame<d.cancelStart||a.moveFrame>d.cancelEnd)return false;
    const list=a.connected==="block"?d.cancelOnBlock:d.cancelOnHit;
    return list?.includes(target);
  }
  startMove(a,move){
    a.move={...move};a.moveFrame=0;a.connected=null;a.stateFrame=0;
    if(move.meterCost)a.meter=clamp(a.meter-move.meterCost,0,100);
    a.state=move.kind==="throw"?STATES.THROW:move.kind.includes("super")?STATES.SUPER:move.kind.includes("special")||move.kind==="projectile"?STATES.SPECIAL:STATES.ATTACK;
    if(move.id==="super"){this.audio.play("super");this.superFlash()}
  }
  endMove(a){a.move=null;a.moveFrame=0;a.connected=null;a.state=a.onGround?(a.crouching?STATES.CROUCH:STATES.IDLE):STATES.AIRBORNE}
  updateGuard(a,inp){
    if(!inp)return;
    const back=inp.dir==="B"||inp.dir==="DB",dedicated=inp.held.has("guard");
    a.crouching=a.onGround&&inp.held.has("down")&&!a.move&&!a.locked();
    a.blocking=a.onGround&&!a.move&&!a.locked()&&(back||dedicated);
    a.blockType=a.crouching||inp.dir==="DB"?"low":"high";
    if(a.neutral())a.state=a.crouching?STATES.CROUCH:STATES.IDLE;
  }
  updateCPU(){
    if(this.config.opponentType==="p2")return;
    if(this.mode==="training"){
      const mode=document.querySelector("#dummyMode")?.value||"stand";
      if(this.replaying||this.recording)return;
      if(mode==="stand"){this.p2.blocking=false;return}
      if(mode==="block"){this.p2.blocking=true;this.p2.blockType=this.p1.move?.hitLevel==="low"?"low":"high";return}
      if(mode==="afterhit"){this.p2.blocking=this.p1.comboCount>0;this.p2.blockType=this.p1.move?.hitLevel==="low"?"low":"high";return}
      if(mode==="jump"){if(this.p2.onGround&&this.frame%110===0)this.p2.buffer.push({type:"jump",expires:this.frame+3});return}
      if(mode==="random")this.ai.setLevel("easy");else return;
    }
    const intent=this.ai.step(this,this.p2,this.p1);
    this.p2.blocking=!!intent.guard;this.p2.blockType=intent.down?"low":"high";
    if(intent.action)this.p2.buffer.push({type:intent.action,expires:this.frame+6});
    if(intent.move&&!this.p2.move&&!this.p2.locked()){this.p2.x+=intent.move*.24;this.p2.state=STATES.WALK}
  }
  updateFighter(a,side){
    a.stateFrame++;if(a.invuln>0)a.invuln--;
    if(a.state===STATES.HITSTUN){if(--a.hitstun<=0){if(a.pendingKnockdown){a.state=STATES.KNOCKDOWN;a.knockdown=42;a.pendingKnockdown=false}else a.state=STATES.IDLE}return}
    if(a.state===STATES.BLOCKSTUN){if(--a.blockstun<=0)a.state=STATES.IDLE;return}
    if(a.state===STATES.KNOCKDOWN){if(--a.knockdown<=0){a.state=STATES.WAKEUP;a.wakeup=14;a.invuln=8}return}
    if(a.state===STATES.WAKEUP){if(--a.wakeup<=0)a.state=STATES.IDLE;return}
    if(a.state===STATES.THROWN){if(--a.hitstun<=0){a.state=STATES.KNOCKDOWN;a.knockdown=48;a.pendingKnockdown=false}return}
    if(a.move){this.updateMove(a,side)}
    else this.updateMovement(a,side);
    if(!a.onGround){
      a.y+=a.vy;a.vy-=.085;
      const inp=this.lastInput[side];
      if(inp&&!a.locked()){if(inp.held.has("left"))a.x-=.12;if(inp.held.has("right"))a.x+=.12}
      if(a.y<=0){a.y=0;a.vy=0;a.onGround=true;a.justLanded=8;if(a.state===STATES.AIRBORNE)a.state=STATES.IDLE}
    }
    if(a.justLanded>0)a.justLanded--;
    a.x=clamp(a.x,WORLD_LEFT,WORLD_RIGHT);
  }
  updateMovement(a,side){
    if(a.dashFrames>0){a.x+=a.dashDir*1.15;a.dashFrames--;if(a.dashFrames===0)a.state=STATES.IDLE;return}
    if(!a.onGround)return;
    const inp=this.lastInput[side];if(!inp||a.blocking||a.crouching)return;
    let dx=0;
    if(inp.held.has("left"))dx=-1;if(inp.held.has("right"))dx=1;
    if(dx){
      const spd=(dx===a.facing)?0.34:0.27;a.x+=dx*spd;a.state=STATES.WALK;
    }else if(a.state===STATES.WALK)a.state=STATES.IDLE;
  }
  updateMove(a,side){
    const m=a.move;a.moveFrame++;
    if(m.movement&&a.moveFrame<=m.startup+m.active)a.x+=a.facing*(m.movement/(m.startup+m.active));
    const phase=this.phaseOf(a);
    if(phase==="ACTIVE"){
      if((m.kind==="projectile"||m.kind==="superProjectile")&&!m.spawned){m.spawned=true;this.spawnProjectile(a,m)}
      else if(m.kind!=="projectile"&&m.kind!=="superProjectile"&&!m.hitDone){
        const def=a===this.p1?this.p2:this.p1;
        if(this.checkMoveHit(a,def,m)){m.hitDone=true}
      }
    }
    if(a.moveFrame>=m.startup+m.active+m.recovery)this.endMove(a);
  }
  hurtbox(a){
    const h=a.state===STATES.CROUCH||a.crouching?12:18,w=5.6;
    return {x:a.x-w/2,y:a.y,w,h};
  }
  pushbox(a){return {x:a.x-2.45,y:a.y,w:4.9,h:a.crouching?8.5:10.5}}
  hitbox(a,m){
    const y=m.hitLevel==="low"?a.y+1:m.id==="airKick"?a.y+7:a.y+(m.kind.includes("super")?4.5:6);
    const h=m.hitLevel==="low"?4:m.kind.includes("super")?10:6.5,w=m.range;
    return {x:a.facing===1?a.x+2.2:a.x-2.2-w,y,w,h};
  }
  checkMoveHit(att,def,m){
    if(def.invuln>0)return false;
    if(m.kind==="throw"){
      if(!def.onGround||!def.neutral()||Math.abs(att.x-def.x)>m.range)return false;
      const di=this.lastInput[def.side];
      if(di&&di.held.has("punch")&&di.held.has("kick")&&(di.pressed.has("punch")||di.pressed.has("kick"))){
        this.announce("TECH!",400);att.x-=att.facing*1.8;def.x+=att.facing*1.8;this.audio.play("block");return true;
      }
      this.applyThrow(att,def,m);return true;
    }
    const hb=this.hitbox(att,m),hurt=this.hurtbox(def);
    if(overlap(hb,hurt)){this.applyHit(att,def,m);return true}
    return false;
  }
  canBlock(def,m){
    if(!def.blocking||def.state===STATES.HITSTUN||def.state===STATES.KNOCKDOWN||!def.onGround)return false;
    if(m.hitLevel==="throw")return false;
    if(m.hitLevel==="low")return def.blockType==="low";
    if(m.hitLevel==="high")return def.blockType==="high";
    return true;
  }
  applyHit(att,def,m,fromProjectile=false){
    const blocked=this.canBlock(def,m);
    if(blocked){
      if(this.comboOwner===att){att.comboCount=0;att.comboDamage=0;this.comboOwner=null;this.comboTimer=0}
      let chip=(m.kind==="special"||m.kind==="projectile"||m.kind.includes("super"))?Math.ceil(m.damage*.08):0;
      if(chip>0)def.hp=Math.max(1,def.hp-chip);
      def.state=STATES.BLOCKSTUN;def.blockstun=m.blockstun;att.connected="block";if(att.move)att.move.connected="block";
      def.meter=clamp(def.meter+3,0,100);this.pushActors(att,def,m.pushBlock||.8);this.hitstop=Math.max(2,m.hitstop-2);
      this.spark(def,"block");this.audio.play("block");return;
    }
    const wasAttacking=!!def.move&&this.phaseOf(def)==="STARTUP";
    const continuing=this.comboOwner===att&&def.state===STATES.HITSTUN&&this.comboTimer>0;
    if(!continuing){att.comboCount=0;att.comboDamage=0}
    att.comboCount++;const scale=SCALE[Math.min(att.comboCount-1,SCALE.length-1)]||.55;
    const damage=Math.round(m.damage*scale);def.hp=clamp(def.hp-damage,0,1000);att.comboDamage+=damage;att.lastHitFrame=this.frame;
    this.comboOwner=att;this.comboTimer=Math.max(m.hitstun+14,28);
    att.meter=clamp(att.meter+(m.meterGain||4),0,100);def.meter=clamp(def.meter+Math.max(2,Math.floor(damage/40)),0,100);
    def.state=STATES.HITSTUN;def.hitstun=Math.max(1,Math.round(m.hitstun*Math.max(.65,1-(att.comboCount-1)*.04)));
    def.pendingKnockdown=!!m.knockdown;att.connected="hit";if(att.move)att.move.connected="hit";
    this.pushActors(att,def,m.pushHit||1.2);this.hitstop=m.hitstop;this.spark(def,m.kind.includes("super")?"super":m.damage>=80?"heavy":"light");
    this.audio.play(m.damage>=80?"hitHeavy":"hitLight");
    if(wasAttacking){document.querySelector("#counterText").textContent="COUNTER!";setTimeout(()=>document.querySelector("#counterText").textContent="",420)}
    if(att.comboCount>=2){const el=document.querySelector("#comboText");el.style.left=att.side==="p1"?"6%":"auto";el.style.right=att.side==="p2"?"6%":"auto";el.textContent=att.comboCount+" HIT COMBO!";setTimeout(()=>{if(el.textContent.includes("HIT"))el.textContent=""},520)}
    if(def.hp<=0){if(this.mode==="training"){def.hp=1000;def.redHp=1000}else this.beginKO(att,def)}
  }
  applyThrow(att,def,m){
    def.hp=clamp(def.hp-m.damage,0,1000);att.meter=clamp(att.meter+8,0,100);def.state=STATES.THROWN;def.pendingKnockdown=true;def.hitstun=16;
    this.audio.play("throw");this.spark(def,"heavy");this.hitstop=m.hitstop;this.pushActors(att,def,m.pushHit);
    if(def.hp<=0){if(this.mode==="training"){def.hp=1000;def.redHp=1000}else this.beginKO(att,def)}
  }
  pushActors(att,def,amount){
    const dir=def.x>=att.x?1:-1,target=def.x+dir*amount;
    if(target>WORLD_RIGHT||target<WORLD_LEFT)att.x=clamp(att.x-dir*amount*.75,WORLD_LEFT,WORLD_RIGHT);
    else def.x=target;
  }
  resolvePushboxes(){
    const a=this.pushbox(this.p1),b=this.pushbox(this.p2);if(!overlap(a,b))return;
    const pen=Math.min(a.x+a.w-b.x,b.x+b.w-a.x);if(pen<=0)return;
    const half=pen/2+.03;
    if(this.p1.x<this.p2.x){this.p1.x=clamp(this.p1.x-half,WORLD_LEFT,WORLD_RIGHT);this.p2.x=clamp(this.p2.x+half,WORLD_LEFT,WORLD_RIGHT)}
    else{this.p1.x=clamp(this.p1.x+half,WORLD_LEFT,WORLD_RIGHT);this.p2.x=clamp(this.p2.x-half,WORLD_LEFT,WORLD_RIGHT)}
  }
  spawnProjectile(owner,m){
    const css=owner.data.type+(m.id==="super"?" super":"");
    const glyph=m.id==="super"?"✦"+(projectileGlyph[owner.data.type]||"✦"):projectileGlyph[owner.data.type]||"✦";
    this.projectiles.push({id:++this.projectileId,owner,x:owner.x+owner.facing*4.2,y:owner.y+8,vx:owner.facing*m.projectile.speed,
      w:m.projectile.width,h:m.projectile.height,lifetime:m.projectile.lifetime,durability:m.projectile.durability,glyph,css,
      move:{...m,kind:m.id==="super"?"superProjectile":"projectile"}});
    this.audio.play(m.id==="super"?"super":"special");
  }
  updateProjectiles(){
    for(const p of this.projectiles){p.x+=p.vx;p.lifetime--}
    this.projectiles=this.projectiles.filter(p=>p.lifetime>0&&p.x>WORLD_LEFT-5&&p.x<WORLD_RIGHT+5);
  }
  resolveProjectileClashes(){
    for(let i=0;i<this.projectiles.length;i++)for(let j=i+1;j<this.projectiles.length;j++){
      const a=this.projectiles[i],b=this.projectiles[j];if(a.owner===b.owner)continue;
      const ra={x:a.x-a.w/2,y:a.y-a.h/2,w:a.w,h:a.h},rb={x:b.x-b.w/2,y:b.y-b.h/2,w:b.w,h:b.h};
      if(overlap(ra,rb)){
        this.clashSpark((a.x+b.x)/2,(a.y+b.y)/2);
        if(a.durability===b.durability){a.lifetime=b.lifetime=0}else if(a.durability>b.durability){a.durability-=b.durability;b.lifetime=0}else{b.durability-=a.durability;a.lifetime=0}
      }
    }
    this.projectiles=this.projectiles.filter(p=>p.lifetime>0);
  }
  resolveProjectileHits(){
    for(const p of this.projectiles){
      const def=p.owner===this.p1?this.p2:this.p1;if(def.invuln>0)continue;
      const r={x:p.x-p.w/2,y:p.y-p.h/2,w:p.w,h:p.h};
      if(overlap(r,this.hurtbox(def))){this.applyHit(p.owner,def,p.move,true);p.lifetime=0}
    }
    this.projectiles=this.projectiles.filter(p=>p.lifetime>0);
  }
  spark(def,type){
    const layer=document.querySelector("#vfxLayer"),el=document.createElement("i");el.className=type==="block"?"block-spark":type==="super"?"impact-spark clash-spark":"impact-spark";
    el.style.left=def.x+"%";el.style.bottom=`calc(var(--stage-floor) + ${((def.y+9)*Y_SCALE).toFixed(2)}%)`;layer.appendChild(el);setTimeout(()=>el.remove(),230);
    if(type!=="light")this.shake(type==="super"?"heavy":"light");
  }
  clashSpark(x,y){const layer=document.querySelector("#vfxLayer"),el=document.createElement("i");el.className="clash-spark";el.style.left=x+"%";el.style.bottom=`calc(var(--stage-floor) + ${(y*Y_SCALE).toFixed(2)}%)`;layer.appendChild(el);setTimeout(()=>el.remove(),230);this.audio.play("block")}
  shake(level){
    if(this.settings.get("reduceShake"))return;
    const s=document.querySelector("#stage"),cls=level==="heavy"?"shake-heavy":"shake";s.classList.remove("shake","shake-heavy");void s.offsetWidth;s.classList.add(cls);setTimeout(()=>s.classList.remove(cls),150)
  }
  superFlash(){
    if(this.settings.get("reduceFlashes"))return;
    const el=document.createElement("i");el.className="super-flash";document.querySelector("#stage").appendChild(el);setTimeout(()=>el.remove(),260)
  }
  updateComboState(){
    if(this.comboTimer>0)this.comboTimer--;
    if(this.comboTimer<=0&&this.comboOwner){this.comboOwner.comboCount=0;this.comboOwner.comboDamage=0;this.comboOwner=null}
  }
  updateTimer(){
    if(this.mode==="training")return;
    this.roundFrames--;if(this.roundFrames<=0)this.resolveTimeout()
  }
  updateTrainingRules(){
    if(this.mode!=="training")return;
    const meter=document.querySelector("#trainingMeter")?.value||"normal",life=document.querySelector("#trainingLife")?.value||"infinite";
    if(meter==="infinite")this.p1.meter=this.p2.meter=100;else if(meter==="empty")this.p1.meter=this.p2.meter=0;
    if(life==="infinite"){this.p1.hp=this.p1.redHp=1000;this.p2.hp=this.p2.redHp=1000}
    else if(life==="regen"){this.p1.hp=Math.min(1000,this.p1.hp+3);this.p2.hp=Math.min(1000,this.p2.hp+3)}
  }
  resolveTimeout(){
    if(this.roundOver)return;
    if(this.p1.hp===this.p2.hp)this.p1.hp+=1;
    const winner=this.p1.hp>this.p2.hp?this.p1:this.p2,loser=winner===this.p1?this.p2:this.p1;
    this.roundOver=true;this.roundWinner=winner;this.roundReason="TIME";this.roundEndFrames=32;
    winner.state=STATES.VICTORY;loser.state=STATES.DEFEAT;this.announce("TIME!",520);
  }
  beginKO(winner,loser){
    if(this.roundOver||this.mode==="training")return;
    this.roundOver=true;this.roundWinner=winner;this.roundReason="KO";this.roundEndFrames=46;
    this.hitstop=Math.max(this.hitstop,12);this.audio.play("ko");this.announce("K.O.!",700);
    winner.state=STATES.VICTORY;loser.state=STATES.DEFEAT;
  }
  finishRound(winner,reason){
    if(this.matchOver||!winner)return;
    this.roundWinner=null;this.roundEndFrames=0;winner.wins++;
    const perfect=winner.hp===1000&&reason!=="TIME";if(perfect)this.announce("PERFECT!",500);
    const need=Math.ceil((this.config.bestOf||3)/2);
    if(winner.wins>=need){this.matchOver=true;this.onMatchEnd({winner:winner.side,winnerIndex:winner.index,reason,perfect})}
    else{this.round++;this.resetRound()}
  }
  setDebug(v){this.debug=!!v}
  resetTrainingPosition(){
    if(this.mode!=="training")return;
    const pos=document.querySelector("#trainingPosition")?.value||"center";
    const pair=pos==="left"?[12,38]:pos==="right"?[62,88]:[28,72];
    const w1=this.p1.wins,w2=this.p2.wins;this.p1.resetRound(pair[0]);this.p2.resetRound(pair[1]);this.p1.wins=w1;this.p2.wins=w2;
    if((document.querySelector("#trainingMeter")?.value||"normal")==="infinite")this.p1.meter=this.p2.meter=100;
    this.projectiles=[];this.comboOwner=null;this.comboTimer=0;
  }
}

export {STATES};
