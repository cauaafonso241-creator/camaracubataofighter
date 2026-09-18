import {DEFAULT_SETTINGS} from "./data.js";

export class SettingsStore{
  constructor(key="ccf-settings"){
    this.key=key;
    this.value={...DEFAULT_SETTINGS};
    try{
      const saved=JSON.parse(localStorage.getItem(key)||"{}");
      this.value={...this.value,...saved};
    }catch{}
    this.applyBody();
  }
  get(name){return this.value[name]}
  set(name,value){this.value[name]=value;this.save();this.applyBody()}
  patch(obj){Object.assign(this.value,obj);this.save();this.applyBody()}
  save(){try{localStorage.setItem(this.key,JSON.stringify(this.value))}catch{}}
  applyBody(){
    document.body?.classList.toggle("reduce-flash",!!this.value.reduceFlashes);
    document.body?.classList.toggle("force-touch",!!this.value.forceTouch);
  }
}

export class AudioManager{
  constructor(settings){
    this.settings=settings;
    this.ctx=null;
    this.master=null;
    this.enabled=true;
  }
  ensure(){
    if(this.ctx)return this.ctx;
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return null;
    this.ctx=new AC();
    this.master=this.ctx.createGain();
    this.master.gain.value=this.settings.get("masterVolume");
    this.master.connect(this.ctx.destination);
    return this.ctx;
  }
  setVolume(v){
    this.settings.set("masterVolume",Number(v));
    if(this.master)this.master.gain.value=Number(v);
  }
  tone({freq=220,duration=.06,type="square",gain=.08,slide=0}={}){
    const ctx=this.ensure();if(!ctx||!this.enabled)return;
    if(ctx.state==="suspended")ctx.resume().catch(()=>{});
    const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime;
    o.type=type;o.frequency.setValueAtTime(freq,t);
    if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(35,freq+slide),t+duration);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+.005);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.connect(g);g.connect(this.master);o.start(t);o.stop(t+duration+.02);
  }
  noise(duration=.05,gain=.05){
    const ctx=this.ensure();if(!ctx||!this.enabled)return;
    const count=Math.max(1,Math.floor(ctx.sampleRate*duration)),buf=ctx.createBuffer(1,count,ctx.sampleRate),arr=buf.getChannelData(0);
    for(let i=0;i<count;i++)arr[i]=Math.random()*2-1;
    const src=ctx.createBufferSource(),g=ctx.createGain(),t=ctx.currentTime;
    src.buffer=buf;g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    src.connect(g);g.connect(this.master);src.start();
  }
  play(name){
    const map={
      ui:()=>this.tone({freq:520,duration:.035,gain:.035}),
      confirm:()=>this.tone({freq:660,duration:.06,gain:.045,slide:220}),
      hitLight:()=>{this.tone({freq:155,duration:.045,gain:.075,slide:-60});this.noise(.025,.025)},
      hitHeavy:()=>{this.tone({freq:95,duration:.085,gain:.1,slide:-35});this.noise(.045,.045)},
      block:()=>this.tone({freq:330,duration:.04,gain:.05,type:"triangle",slide:-80}),
      special:()=>this.tone({freq:260,duration:.11,gain:.075,type:"sawtooth",slide:380}),
      super:()=>{this.tone({freq:120,duration:.23,gain:.11,type:"sawtooth",slide:760});this.noise(.09,.055)},
      ko:()=>this.tone({freq:210,duration:.28,gain:.11,type:"square",slide:-140}),
      jump:()=>this.tone({freq:410,duration:.04,gain:.025,slide:120}),
      throw:()=>{this.tone({freq:130,duration:.08,gain:.08});this.noise(.035,.04)}
    };
    map[name]?.();
  }
}

export class AssetLoader{
  constructor(urls=[],onProgress=()=>{}){this.urls=[...new Set(urls)];this.onProgress=onProgress}
  async load(){
    let done=0;
    if(!this.urls.length){this.onProgress(1);return}
    await Promise.all(this.urls.map(url=>new Promise(resolve=>{
      const img=new Image();
      const finish=()=>{done++;this.onProgress(done/this.urls.length);resolve()};
      img.onload=finish;img.onerror=()=>{console.warn("Asset não carregou:",url);finish()};img.src=url;
    })));
  }
}
