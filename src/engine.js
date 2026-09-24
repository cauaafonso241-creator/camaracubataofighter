import {fighters,maps,createCharacterMoves,difficulty} from "./data.js";
import {CanvasRenderer} from "./canvasRenderer.js";

const FIXED_DT=1/60;
const WORLD_LEFT=6.5,WORLD_RIGHT=93.5;
const STATES={
  IDLE:"IDLE",WALK:"WALK",CROUCH:"CROUCH",JUMPSQUAT:"JUMPSQUAT",AIRBORNE:"AIRBORNE",LANDING:"LANDING",ATTACK:"ATTACK",SPECIAL:"SPECIAL",SUPER:"SUPER",
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
    this.x=x;this.y=0;this.vx=0;this.vy=0;this.onGround=true;this.facing=this.side==="p1"?1:-1;
    this.hp=1000;this.redHp=1000;this.meter=0;this.state=STATES.IDLE;this.stateFrame=0;this.move=null;this.moveFrame=0;
    this.hitstun=0;this.blockstun=0;this.knockdown=0;this.wakeup=0;this.invuln=0;this.blocking=false;this.blockType="high";
    this.crouching=false;this.jumpSquat=0;this.landingLag=0;this.dashFrames=0;this.dashTotal=0;this.dashDir=0;this.dashKind="";this.buffer=[];this.connected=null;this.pendingKnockdown=false;
    this.comboCount=0;this.comboDamage=0;this.lastHitFrame=-999;this.lastDashFrame=-999;this.justLanded=0;this.aiMove=0;
  }
  neutral(){return [STATES.IDLE,STATES.WALK,STATES.CROUCH].includes(this.state)}
  locked(){return [STATES.JUMPSQUAT,STATES.LANDING,STATES.HITSTUN,STATES.BLOCKSTUN,STATES.KNOCKDOWN,STATES.WAKEUP,STATES.THROWN,STATES.VICTORY,STATES.DEFEAT].includes(this.state)}
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
      if(Math.random()<cfg.specialChance)intent.action=Math.random()<.65?"specialA":"specialB";
      else if(Math.random()<.15)intent.action="dashForward";
    }else if(d>11){
      if(Math.random()<.45)intent.move=toward;
      if(Math.random()<cfg.attackChance*.55)intent.action=Math.random()<.55?"kick":"heavy";
      else if(Math.random()<cfg.specialChance)intent.action="specialA";
    }else{
      const r=Math.random();
      if(r<cfg.blockChance*.45)intent.guard=true;
      else if(r<cfg.attackChance*.42)intent.action="jab";
      else if(r<cfg.attackChance*.75)intent.action="kick";
      else if(r<cfg.attackChance)intent.action="heavy";
      else if(Math.random()<cfg.specialChance)intent.action="specialB";
    }
    if(actor.meter>=100&&Math.random()<cfg.specialChance*.5)intent.action="super";
    this.intent=intent;return intent;
  }
}

export class GameEngine{
  constructor({input,audio,settings,onMatchEnd=()=>{},onRoundEnd=()=>{}}){
    this.input=input;this.audio=audio;this.settings=settings;this.onMatchEnd=onMatchEnd;this.onRoundEnd=onRoundEnd;
    this.renderer=new CanvasRenderer(this);this.running=false;this.paused=false;this.raf=0;this.lastTime=0;this.acc=0;this.frame=0;this.hitstop=0;
    this.p1=null;this.p2=null;this.projectiles=[];this.projectileId=0;this.mode="quick";this.config=null;this.debug=false;
    this.ai=null;this.round=1;this.roundFrames=75*60;this.roundOver=false;this.matchOver=false;this.freezeRoundIntro=0;
    this.comboOwner=null;this.comboTimer=0;this.roundEndFrames=0;this.roundWinner=null;this.roundReason="";this.recording=false;this.recorded=[];this.replaying=false;this.replayIndex=0;
    this.lastInput={p1:null,p2:null};
    this.announcement={text:"",frames:0};this.comboBanner={text:"",side:"p1",frames:0};this.counterBanner={side:"p1",frames:0};
  }
  start(config){
    this.stop();this.config={...config};this.mode=config.mode||"quick";this.paused=false;this.frame=0;this.round=1;this.roundOver=false;this.matchOver=false;
    this.p1=new Fighter(config.p1Index,32,"p1");this.p2=new Fighter(config.p2Index,68,"p2");
    this.input.setP2Enabled(config.opponentType==="p2"||this.mode==="training");
    this.ai=new AIController(config.difficulty||this.settings.get("difficulty")||"normal");
    this.projectiles=[];this.renderer.init(this.config);this.audio.startMusic?.(maps[config.mapIndex]?.id);this.resetRound(true);
    this.running=true;this.lastTime=performance.now();this.acc=0;this.loop(this.lastTime);
  }
  stop(){this.running=false;if(this.raf)cancelAnimationFrame(this.raf);this.raf=0;this.projectiles=[];this.audio.stopMusic?.()}
  pause(v=true){this.paused=v;this.input.clear();this.audio.setGameplayPaused?.(v);if(!v)this.lastTime=performance.now()}
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
  resetRound(first=false){
    const w1=this.p1.wins,w2=this.p2.wins;this.p1.resetRound(32);this.p2.resetRound(68);this.p1.wins=w1;this.p2.wins=w2;
    this.projectiles=[];this.roundFrames=(this.config.time||75)*60;this.roundOver=false;this.roundEndFrames=0;this.roundWinner=null;this.roundReason="";this.hitstop=0;this.freezeRoundIntro=105;this.comboOwner=null;this.comboTimer=0;
    this.announcement={text:"ROUND "+this.round,frames:48};this.comboBanner={text:"",side:"p1",frames:0};this.counterBanner={side:"p1",frames:0};
  }
  announce(text,ms=500){this.announcement={text,frames:Math.max(1,Math.round(ms/16.67))}}
  phaseOf(a){
    if(!a.move)return "";
    const d=a.move,f=a.moveFrame;
    if(f<d.startup)return "STARTUP";
    if(f<d.startup+d.active)return "ACTIVE";
    return "RECOVERY";
  }
  step(){
    this.frame++;this.renderer.step();
    if(this.announcement.frames>0)this.announcement.frames--;
    if(this.comboBanner.frames>0)this.comboBanner.frames--;
    if(this.counterBanner.frames>0)this.counterBanner.frames--;
    const facing={p1:this.p1.x<=this.p2.x?1:-1,p2:this.p2.x<=this.p1.x?1:-1};this.p1.facing=facing.p1;this.p2.facing=facing.p2;
    const inp=this.input.step(facing);this.lastInput=inp;
    this.bufferInput(this.p1,inp.p1,"p1");
    const p2Human=this.config.opponentType==="p2"||this.mode==="training"&&this.recording;
    if(p2Human)this.bufferInput(this.p2,inp.p2,"p2");
    if(this.recording&&this.mode==="training"){
      this.recorded.push(this.encodeInput(inp.p2));if(this.recorded.length>=600)this.recording=false;
    }
    if(this.freezeRoundIntro>0){this.freezeRoundIntro--;if(this.freezeRoundIntro===42)this.announcement={text:"FIGHT!",frames:32};return}
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
    const push=(type,ttl=9)=>{if(!a.buffer.some(q=>q.type===type&&q.expires>=this.frame))a.buffer.push({type,expires:this.frame+ttl})};
    const lp=inp.held.has("lightPunch"),lk=inp.held.has("lightKick");
    const throwInput=lp&&lk&&(inp.pressed.has("lightPunch")||inp.pressed.has("lightKick"));
    if(inp.pressed.has("super"))push("super",10);
    else if(throwInput)push("throw",7);
    else{
      const punchPressed=inp.pressed.has("lightPunch")||inp.pressed.has("heavyPunch");
      const kickPressed=inp.pressed.has("lightKick")||inp.pressed.has("heavyKick");
      if((punchPressed||kickPressed)&&(this.input.motion(side,"qcf",18)||this.input.motion(side,"qcb",18))){
        push(kickPressed?"specialB":"specialA",10);
      }else{
        if(inp.pressed.has("lightPunch"))push("jab",8);
        if(inp.pressed.has("heavyPunch"))push("heavy",8);
        if(inp.pressed.has("lightKick"))push(!a.onGround?"airKick":inp.held.has("down")?"lowKick":"kick",8);
        if(inp.pressed.has("heavyKick"))push(!a.onGround?"airKick":"heavyKick",8);
        if(inp.pressed.has("special")&&this.settings.get("simpleSpecial"))push(inp.held.has("down")?"specialB":"specialA",10);
      }
    }
    if(inp.pressed.has("up")&&a.onGround)push("jump",8);
    if((inp.pressed.has("left")||inp.pressed.has("right"))&&this.frame-a.lastDashFrame>10){
      if(this.input.doubleTap(side,"F",13)){push("dashForward",7);a.lastDashFrame=this.frame}
      else if(this.input.doubleTap(side,"B",13)){push("dashBack",7);a.lastDashFrame=this.frame}
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
      if(a.onGround&&a.neutral()){
        a.state=STATES.JUMPSQUAT;a.jumpSquat=3;a.stateFrame=0;a.vx*=.78;return true;
      }
      return false;
    }
    if(type==="dashForward"||type==="dashBack"){
      if(a.onGround&&a.neutral()){
        a.dashKind=type;a.dashTotal=type==="dashForward"?11:10;a.dashFrames=a.dashTotal;
        a.dashDir=(type==="dashForward"?1:-1)*a.facing;a.state=STATES.WALK;a.vx=0;
        if(type==="dashBack")a.invuln=Math.max(a.invuln,4);
        this.renderer.spawnDust(a);return true;
      }
      return false;
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
    this.p2.blocking=!!intent.guard;this.p2.blockType=intent.down?"low":"high";this.p2.aiMove=intent.move||0;
    if(intent.action)this.p2.buffer.push({type:intent.action,expires:this.frame+8});
  }
  updateFighter(a,side){
    a.stateFrame++;if(a.invuln>0)a.invuln--;
    if(a.state===STATES.JUMPSQUAT){
      if(--a.jumpSquat<=0){
        const inp=this.lastInput[side],dir=inp?.held.has("left")?-1:inp?.held.has("right")?1:0;
        a.state=STATES.AIRBORNE;a.onGround=false;a.vy=1.48;a.vx=dir*.24+a.vx*.45;a.stateFrame=0;this.audio.play("jump");
      }
      return;
    }
    if(a.state===STATES.LANDING){if(--a.landingLag<=0)a.state=STATES.IDLE;return}
    if(a.state===STATES.HITSTUN){
      this.updateAirPhysics(a,side,false);
      if(--a.hitstun<=0){
        if(a.pendingKnockdown){if(a.onGround){a.state=STATES.KNOCKDOWN;a.knockdown=42;a.pendingKnockdown=false}else a.hitstun=1}
        else a.state=a.onGround?STATES.IDLE:STATES.AIRBORNE;
      }
      return;
    }
    if(a.state===STATES.BLOCKSTUN){if(--a.blockstun<=0)a.state=STATES.IDLE;return}
    if(a.state===STATES.KNOCKDOWN){if(--a.knockdown<=0){a.state=STATES.WAKEUP;a.wakeup=14;a.invuln=8}return}
    if(a.state===STATES.WAKEUP){if(--a.wakeup<=0)a.state=STATES.IDLE;return}
    if(a.state===STATES.THROWN){if(--a.hitstun<=0){a.state=STATES.KNOCKDOWN;a.knockdown=48;a.pendingKnockdown=false}return}
    if(a.move){this.updateMove(a,side)}
    else this.updateMovement(a,side);
    this.updateAirPhysics(a,side,true);
    if(a.justLanded>0)a.justLanded--;
    a.x=clamp(a.x,WORLD_LEFT,WORLD_RIGHT);
  }
  updateAirPhysics(a,side,allowControl=true){
    if(a.onGround)return;
    const inp=this.lastInput[side];
    if(allowControl&&inp&&!a.locked()){
      const axis=inp.held.has("left")?-1:inp.held.has("right")?1:0;
      a.vx+=clamp(axis*.25-a.vx,-.022,.022);
    }
    a.x+=a.vx;a.y+=a.vy;a.vy-=.082;
    if(a.y<=0){
      a.y=0;a.vy=0;a.vx*=.55;a.onGround=true;a.justLanded=8;this.renderer.spawnDust(a);
      if(a.pendingKnockdown){a.state=STATES.KNOCKDOWN;a.knockdown=42;a.pendingKnockdown=false}
      else if(a.state===STATES.AIRBORNE){a.state=STATES.LANDING;a.landingLag=3}
    }
  }
  updateMovement(a,side){
    if(a.dashFrames>0){
      const elapsed=a.dashTotal-a.dashFrames,forward=a.dashKind==="dashForward";
      const curve=elapsed<2?.72:elapsed<7?1:Math.max(.35,a.dashFrames/5);
      a.vx=a.dashDir*(forward?1.04:.92)*curve;a.x+=a.vx;a.dashFrames--;
      if(a.dashFrames%3===0)this.renderer.spawnDust(a);
      if(a.dashFrames===0){a.vx*=.32;a.dashKind="";a.state=STATES.IDLE}
      return;
    }
    if(!a.onGround)return;
    const inp=this.lastInput[side];if(!inp||a.blocking||a.crouching){a.vx*=.72;return}
    let dx=0;if(inp?.held.has("left"))dx=-1;if(inp?.held.has("right"))dx=1;
    if(side==="p2"&&this.config.opponentType!=="p2"&&a.aiMove)dx=a.aiMove;
    if(dx){
      const agility=(a.data.stats?.[1]||80),bonus=(agility-80)*.0015;
      const max=(dx===a.facing)?0.335+bonus:0.265+bonus*.65,target=dx*max;
      a.vx+=clamp(target-a.vx,-.065,.065);a.x+=a.vx;a.state=STATES.WALK;
    }else{
      a.vx*=.74;if(Math.abs(a.vx)<.015)a.vx=0;a.x+=a.vx;if(a.state===STATES.WALK&&Math.abs(a.vx)<.05)a.state=STATES.IDLE;
    }
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
  hurtboxes(a){
    if(a.state===STATES.KNOCKDOWN||a.state===STATES.DEFEAT)return [{x:a.x-5,y:a.y,w:10,h:3.5}];
    const crouch=a.state===STATES.CROUCH||a.crouching;
    if(crouch)return [
      {x:a.x-2.8,y:a.y+7.5,w:5.6,h:4.5},
      {x:a.x-3.1,y:a.y+3.2,w:6.2,h:4.8},
      {x:a.x-3.3,y:a.y,w:6.6,h:3.8}
    ];
    return [
      {x:a.x-2.4,y:a.y+13.2,w:4.8,h:5.2},
      {x:a.x-3.0,y:a.y+6.2,w:6.0,h:7.2},
      {x:a.x-3.1,y:a.y,w:6.2,h:6.6}
    ];
  }
  hurtbox(a){
    const boxes=this.hurtboxes(a);const x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y));
    const r=Math.max(...boxes.map(b=>b.x+b.w)),t=Math.max(...boxes.map(b=>b.y+b.h));return {x,y,w:r-x,h:t-y};
  }
  pushbox(a){return {x:a.x-2.55,y:a.y,w:5.1,h:a.crouching?7.8:10.8}}
  hitbox(a,m){
    let w=m.range,h=5.5,y=a.y+7;
    if(m.id==="jab"){w=Math.min(w,6.5);h=4.4;y=a.y+8.2}
    if(m.id==="heavy"||m.id==="heavyPunch"){w=Math.max(w,8.8);h=5.8;y=a.y+7.5}
    if(m.id==="kick"){h=4.2;y=a.y+4.4}
    if(m.id==="heavyKick"||m.id==="airKick"){h=5.0;y=a.y+8.7}
    if(m.id==="lowKick"){h=3.5;y=a.y+1.2}
    if(m.kind.includes("super")){h=9.5;y=a.y+5.5}
    return {x:a.facing===1?a.x+2.1:a.x-2.1-w,y,w,h};
  }
  checkMoveHit(att,def,m){
    if(def.invuln>0)return false;
    if(m.kind==="throw"){
      if(!def.onGround||!def.neutral()||Math.abs(att.x-def.x)>m.range)return false;
      const di=this.lastInput[def.side];
      const techNow=di&&di.held.has("lightPunch")&&di.held.has("lightKick")&&(di.pressed.has("lightPunch")||di.pressed.has("lightKick"));
      const techBuffered=this.input.pressedWithin(def.side,["lightPunch","lightKick"],5)&&di?.held.has("lightPunch")&&di?.held.has("lightKick");
      if(techNow||techBuffered){
        this.announce("TECH!",400);att.x-=att.facing*1.8;def.x+=att.facing*1.8;att.vx=-att.facing*.18;def.vx=att.facing*.18;this.audio.play("block");return true;
      }
      this.applyThrow(att,def,m);return true;
    }
    const hb=this.hitbox(att,m),hurts=this.hurtboxes(def);if(hurts.some(h=>overlap(hb,h))){this.applyHit(att,def,m);return true}
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
    const counterMul=wasAttacking?1.1:1;
    const damage=Math.round(m.damage*scale*counterMul);def.hp=clamp(def.hp-damage,0,1000);att.comboDamage+=damage;att.lastHitFrame=this.frame;
    this.comboOwner=att;this.comboTimer=Math.max(m.hitstun+14,28);
    att.meter=clamp(att.meter+(m.meterGain||4),0,100);def.meter=clamp(def.meter+Math.max(2,Math.floor(damage/40)),0,100);
    def.state=STATES.HITSTUN;def.hitstun=Math.max(1,Math.round((m.hitstun+(wasAttacking?3:0))*Math.max(.65,1-(att.comboCount-1)*.04)));
    def.pendingKnockdown=!!m.knockdown;
    if((m.knockbackY||0)>0){def.onGround=false;def.vy=m.knockbackY;def.vx=att.facing*Math.max(.18,(m.pushHit||1)*.08)}
    att.connected="hit";if(att.move)att.move.connected="hit";
    this.pushActors(att,def,m.pushHit||1.2);this.hitstop=m.hitstop;this.spark(def,m.kind.includes("super")?"super":m.damage>=80?"heavy":"light");
    this.audio.play(m.damage>=80?"hitHeavy":"hitLight");
    if(wasAttacking)this.counterBanner={side:att.side,frames:28};
    if(att.comboCount>=2)this.comboBanner={text:att.comboCount+" HIT COMBO!",side:att.side,frames:34};
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
    this.projectiles.push({id:++this.projectileId,owner,x:owner.x+owner.facing*4.2,y:owner.y+8,vx:owner.facing*m.projectile.speed,vy:0,
      w:m.projectile.width,h:m.projectile.height,lifetime:m.projectile.lifetime,durability:m.projectile.durability,
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
      if(this.hurtboxes(def).some(h=>overlap(r,h))){this.applyHit(p.owner,def,p.move,true);p.lifetime=0}
    }
    this.projectiles=this.projectiles.filter(p=>p.lifetime>0);
  }
  spark(def,type){this.renderer.spawnImpact(def,type);if(type!=="light")this.shake(type==="super"?"heavy":"medium")}
  clashSpark(x,y){this.renderer.particles.burst(this.renderer.worldX(x),this.renderer.worldY(y),{count:18,color:"#87e9ff",secondary:"#ffffff",speed:4,life:20,size:3});this.audio.play("block")}
  shake(level){if(!this.settings.get("reduceShake"))this.renderer.shake(level)}
  superFlash(){if(!this.settings.get("reduceFlashes"))this.renderer.flash("super")}
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
  restartMatch(){if(!this.p1||!this.p2)return;this.round=1;this.p1.wins=0;this.p2.wins=0;this.matchOver=false;this.resetRound(true)}
  resetTrainingPosition(){
    if(this.mode!=="training")return;
    const pos=document.querySelector("#trainingPosition")?.value||"center";
    const pair=pos==="left"?[13,39]:pos==="right"?[61,87]:[32,68];
    const w1=this.p1.wins,w2=this.p2.wins;this.p1.resetRound(pair[0]);this.p2.resetRound(pair[1]);this.p1.wins=w1;this.p2.wins=w2;
    if((document.querySelector("#trainingMeter")?.value||"normal")==="infinite")this.p1.meter=this.p2.meter=100;
    this.projectiles=[];this.comboOwner=null;this.comboTimer=0;
  }
}

export {STATES};
