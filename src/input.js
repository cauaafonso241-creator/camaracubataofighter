const KEYMAP={
  p1:{left:"a",right:"d",up:"w",down:"s",punch:"z",kick:"x",heavy:"b",special:"c",guard:"v"},
  p2:{left:"arrowleft",right:"arrowright",up:"arrowup",down:"arrowdown",punch:"j",kick:"k",heavy:"i",special:"l",guard:";"}
};
const ACTIONS=["left","right","up","down","punch","kick","heavy","special","guard"];

export class InputManager{
  constructor(){
    this.keys=new Set();
    this.virtual=new Set();
    this.prev={p1:new Set(),p2:new Set()};
    this.history={p1:[],p2:[]};
    this.maxHistory=24;
    this.p2Enabled=false;
    this.pauseHandler=()=>{};
    this.lastGamepadPause=false;
    this._bind();
  }
  setP2Enabled(v){this.p2Enabled=!!v}
  onPause(fn){this.pauseHandler=fn||(()=>{})}
  _bind(){
    addEventListener("keydown",e=>{
      const k=e.key.toLowerCase();
      if(k==="escape"){if(!e.repeat)this.pauseHandler();e.preventDefault();return}
      if(Object.values(KEYMAP.p1).includes(k)||Object.values(KEYMAP.p2).includes(k)){
        this.keys.add(k);e.preventDefault();
      }
    },{passive:false});
    addEventListener("keyup",e=>this.keys.delete(e.key.toLowerCase()));
    addEventListener("blur",()=>this.clear());
    document.querySelectorAll("[data-virt]").forEach(btn=>{
      const a=btn.dataset.virt;
      const down=e=>{e.preventDefault();this.virtual.add(a);btn.setPointerCapture?.(e.pointerId)};
      const up=e=>{e.preventDefault();this.virtual.delete(a)};
      btn.addEventListener("pointerdown",down,{passive:false});
      btn.addEventListener("pointerup",up,{passive:false});
      btn.addEventListener("pointercancel",up,{passive:false});
      btn.addEventListener("pointerleave",e=>{if(e.buttons===0)up(e)},{passive:false});
    });
  }
  clear(){
    this.keys.clear();this.virtual.clear();
    this.prev.p1.clear();this.prev.p2.clear();
  }
  _gamepadState(index){
    const pads=navigator.getGamepads?.()||[],p=pads[index];
    const s=new Set();if(!p)return s;
    const ax=p.axes||[],b=p.buttons||[];
    if((ax[0]??0)<-.35||b[14]?.pressed)s.add("left");
    if((ax[0]??0)>.35||b[15]?.pressed)s.add("right");
    if((ax[1]??0)<-.35||b[12]?.pressed)s.add("up");
    if((ax[1]??0)>.35||b[13]?.pressed)s.add("down");
    if(b[0]?.pressed)s.add("punch");
    if(b[1]?.pressed)s.add("kick");
    if(b[4]?.pressed)s.add("heavy");
    if(b[2]?.pressed)s.add("special");
    if(b[3]?.pressed)s.add("guard");
    const pause=!!b[9]?.pressed;
    if(index===0&&pause&&!this.lastGamepadPause)this.pauseHandler();
    if(index===0)this.lastGamepadPause=pause;
    return s;
  }
  _heldFor(player){
    const map=KEYMAP[player],held=new Set();
    for(const a of ACTIONS)if(this.keys.has(map[a]))held.add(a);
    if(player==="p1"){
      for(const a of this.virtual)held.add(a);
      if(!this.p2Enabled){
        if(this.keys.has("j"))held.add("punch");
        if(this.keys.has("k"))held.add("kick");
        if(this.keys.has("l"))held.add("special");
      }
    }
    const gp=this._gamepadState(player==="p1"?0:1);
    gp.forEach(a=>held.add(a));
    return held;
  }
  step(facing={p1:1,p2:-1}){
    const out={};
    for(const p of ["p1","p2"]){
      const held=this._heldFor(p),prev=this.prev[p],pressed=new Set(),released=new Set();
      held.forEach(a=>{if(!prev.has(a))pressed.add(a)});
      prev.forEach(a=>{if(!held.has(a))released.add(a)});
      const dir=this._direction(held,facing[p]);
      const frame={held,pressed,released,dir,t:performance.now()};
      this.history[p].push({dir,pressed:new Set(pressed),held:new Set(held),t:frame.t});
      if(this.history[p].length>this.maxHistory)this.history[p].shift();
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
    const h=this.history[player].slice(-windowFrames);
    const dirs=h.map(x=>x.dir).filter((d,i,a)=>i===0||d!==a[i-1]);
    if(name==="qcf"){
      let stage=0;
      for(const d of dirs){
        if(stage===0&&d==="D")stage=1;
        else if(stage===1&&(d==="DF"||d==="F"))stage=d==="F"?3:2;
        else if(stage===2&&d==="F")stage=3;
      }
      return stage===3;
    }
    if(name==="doubleQcf"){
      let hits=0,stage=0;
      for(const d of dirs){
        if(stage===0&&d==="D")stage=1;
        else if(stage===1&&(d==="DF"||d==="F"))stage=d==="F"?0:2;
        else if(stage===2&&d==="F"){hits++;stage=0}
      }
      return hits>=2;
    }
    return false;
  }
  doubleTap(player,dir,windowFrames=12){
    const h=this.history[player].slice(-windowFrames);
    let taps=0,was=false;
    for(const f of h){
      const now=f.dir===dir;
      if(now&&!was)taps++;
      was=now;
    }
    return taps>=2;
  }
  recentLabels(player="p1",count=20){
    return this.history[player].slice(-count).map(f=>{
      const a=[...f.pressed].map(x=>({punch:"P",kick:"K",heavy:"H",special:"S",guard:"G"}[x]||"")).filter(Boolean).join("+");
      return a?f.dir+"+"+a:f.dir;
    }).filter((x,i,a)=>i===a.length-1||x!==a[i+1]);
  }
}
