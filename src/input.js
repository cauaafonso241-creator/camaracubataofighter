const CODEMAP={
  p1:{
    left:["KeyA"],right:["KeyD"],up:["KeyW"],down:["KeyS"],
    lightPunch:["KeyF","KeyZ"],heavyPunch:["KeyG"],
    lightKick:["KeyV","KeyX"],heavyKick:["KeyB"],
    special:["KeyR","KeyC"],super:["KeyT"]
  },
  p2:{
    left:["ArrowLeft"],right:["ArrowRight"],up:["ArrowUp"],down:["ArrowDown"],
    lightPunch:["Numpad1"],heavyPunch:["Numpad2"],
    lightKick:["Numpad4"],heavyKick:["Numpad5"],
    special:["Numpad7"],super:["Numpad8"]
  }
};
const ACTIONS=["left","right","up","down","lightPunch","heavyPunch","lightKick","heavyKick","special","super"];

export class InputManager{
  constructor(){
    this.codes=new Set();this.virtual=new Set();
    this.prev={p1:new Set(),p2:new Set()};this.history={p1:[],p2:[]};this.maxHistory=24;
    this.p2Enabled=false;this.pauseHandler=()=>{};this.debugHandler=()=>{};
    this.lastGamepadPause=false;this._bind();
  }
  setP2Enabled(v){this.p2Enabled=!!v}
  onPause(fn){this.pauseHandler=fn||(()=>{})}
  onDebug(fn){this.debugHandler=fn||(()=>{})}
  _isGameCode(code){return Object.values(CODEMAP).some(map=>Object.values(map).some(list=>list.includes(code)))}
  _bind(){
    addEventListener("keydown",e=>{
      if(e.code==="Escape"){if(!e.repeat)this.pauseHandler();e.preventDefault();return}
      if(e.code==="F3"){if(!e.repeat)this.debugHandler();e.preventDefault();return}
      if(this._isGameCode(e.code)||["KeyJ","KeyK","KeyL"].includes(e.code)){this.codes.add(e.code);e.preventDefault()}
    },{passive:false});
    addEventListener("keyup",e=>this.codes.delete(e.code));
    addEventListener("blur",()=>this.clear());
    document.querySelectorAll("[data-virt]").forEach(btn=>{
      const action=btn.dataset.virt;
      const down=e=>{e.preventDefault();this.virtual.add(action);btn.setPointerCapture?.(e.pointerId)};
      const up=e=>{e.preventDefault();this.virtual.delete(action)};
      btn.addEventListener("pointerdown",down,{passive:false});btn.addEventListener("pointerup",up,{passive:false});
      btn.addEventListener("pointercancel",up,{passive:false});btn.addEventListener("pointerleave",e=>{if(e.buttons===0)up(e)},{passive:false});
    });
  }
  clear(){this.codes.clear();this.virtual.clear();this.prev.p1.clear();this.prev.p2.clear()}
  _gamepadState(index){
    const pads=navigator.getGamepads?.()||[],p=pads[index],s=new Set();if(!p)return s;
    const ax=p.axes||[],b=p.buttons||[];
    if((ax[0]??0)<-.35||b[14]?.pressed)s.add("left");if((ax[0]??0)>.35||b[15]?.pressed)s.add("right");
    if((ax[1]??0)<-.35||b[12]?.pressed)s.add("up");if((ax[1]??0)>.35||b[13]?.pressed)s.add("down");
    if(b[0]?.pressed)s.add("lightPunch");if(b[2]?.pressed)s.add("heavyPunch");
    if(b[1]?.pressed)s.add("lightKick");if(b[3]?.pressed)s.add("heavyKick");
    if(b[5]?.pressed)s.add("special");if(b[7]?.pressed)s.add("super");
    const pause=!!b[9]?.pressed;if(index===0&&pause&&!this.lastGamepadPause)this.pauseHandler();if(index===0)this.lastGamepadPause=pause;
    return s;
  }
  _heldFor(player){
    const held=new Set(),map=CODEMAP[player];
    for(const action of ACTIONS)if((map[action]||[]).some(code=>this.codes.has(code)))held.add(action);
    if(player==="p1"){
      for(const a of this.virtual)held.add(a);
      // aliases preserved from the previous build while fighting CPU
      if(!this.p2Enabled){if(this.codes.has("KeyJ"))held.add("lightPunch");if(this.codes.has("KeyK"))held.add("lightKick");if(this.codes.has("KeyL"))held.add("special")}
    }
    this._gamepadState(player==="p1"?0:1).forEach(a=>held.add(a));return held;
  }
  step(facing={p1:1,p2:-1}){
    const out={};
    for(const p of ["p1","p2"]){
      const held=this._heldFor(p),prev=this.prev[p],pressed=new Set(),released=new Set();
      held.forEach(a=>{if(!prev.has(a))pressed.add(a)});prev.forEach(a=>{if(!held.has(a))released.add(a)});
      const dir=this._direction(held,facing[p]),frame={held,pressed,released,dir,t:performance.now()};
      this.history[p].push({dir,pressed:new Set(pressed),held:new Set(held),t:frame.t});if(this.history[p].length>this.maxHistory)this.history[p].shift();
      this.prev[p]=new Set(held);out[p]=frame;
    }
    return out;
  }
  _direction(held,facing){
    const down=held.has("down"),up=held.has("up"),left=held.has("left"),right=held.has("right");
    const forward=facing===1?right:left,back=facing===1?left:right;
    if(down&&forward)return "DF";if(down&&back)return "DB";if(up&&forward)return "UF";if(up&&back)return "UB";
    if(down)return "D";if(up)return "U";if(forward)return "F";if(back)return "B";return "N";
  }
  motion(player,name,windowFrames=16){
    const dirs=this.history[player].slice(-windowFrames).map(x=>x.dir).filter((d,i,a)=>i===0||d!==a[i-1]);
    const qcf=arr=>{let stage=0;for(const d of arr){if(stage===0&&d==="D")stage=1;else if(stage===1&&(d==="DF"||d==="F"))stage=d==="F"?3:2;else if(stage===2&&d==="F")stage=3}return stage===3};
    if(name==="qcf")return qcf(dirs);
    if(name==="qcb")return qcf(dirs.map(d=>({DF:"DB",F:"B",DB:"DF",B:"F"}[d]||d)));
    if(name==="doubleQcf"){
      let hits=0,stage=0;for(const d of dirs){if(stage===0&&d==="D")stage=1;else if(stage===1&&(d==="DF"||d==="F"))stage=d==="F"?0:2;else if(stage===2&&d==="F"){hits++;stage=0}}return hits>=2;
    }
    return false;
  }
  doubleTap(player,dir,windowFrames=12){
    const h=this.history[player].slice(-windowFrames);let taps=0,was=false;
    for(const f of h){const now=f.dir===dir;if(now&&!was)taps++;was=now}return taps>=2;
  }
  recentLabels(player="p1",count=20){
    const label={lightPunch:"LP",heavyPunch:"HP",lightKick:"LK",heavyKick:"HK",special:"SP",super:"SU"};
    return this.history[player].slice(-count).map(f=>{const a=[...f.pressed].map(x=>label[x]||"").filter(Boolean).join("+");return a?f.dir+"+"+a:f.dir}).filter((x,i,a)=>i===a.length-1||x!==a[i+1]);
  }
}