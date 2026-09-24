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
    this.master=null;this.musicGain=null;this.sfxGain=null;this.uiGain=null;this.musicNodes=[];
    this.enabled=true;
  }
  ensure(){
    if(this.ctx)return this.ctx;
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return null;
    this.ctx=new AC();
    this.master=this.ctx.createGain();this.musicGain=this.ctx.createGain();this.sfxGain=this.ctx.createGain();this.uiGain=this.ctx.createGain();
    this.master.gain.value=this.settings.get("masterVolume");
    this.musicGain.gain.value=this.settings.get("musicVolume");this.sfxGain.gain.value=this.settings.get("sfxVolume");this.uiGain.gain.value=this.settings.get("uiVolume");
    this.musicGain.connect(this.master);this.sfxGain.connect(this.master);this.uiGain.connect(this.master);this.master.connect(this.ctx.destination);
    return this.ctx;
  }
  setVolume(v){this.settings.set("masterVolume",Number(v));if(this.master)this.master.gain.value=Number(v)}
  setCategory(name,v){
    const value=Number(v);this.settings.set(name+"Volume",value);
    const g=name==="music"?this.musicGain:name==="ui"?this.uiGain:this.sfxGain;if(g)g.gain.value=value;
  }
  setGameplayPaused(paused){
    if(!this.ensure())return;
    const now=this.ctx.currentTime;
    const music=paused?0:Number(this.settings.get("musicVolume")??.22),sfx=paused?0:Number(this.settings.get("sfxVolume")??.72);
    this.musicGain.gain.cancelScheduledValues(now);this.sfxGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setTargetAtTime(music,now,.02);this.sfxGain.gain.setTargetAtTime(sfx,now,.02);
  }
  tone({freq=220,duration=.06,type="square",gain=.08,slide=0,group="sfx"}={}){
    const ctx=this.ensure();if(!ctx||!this.enabled)return;
    if(ctx.state==="suspended")ctx.resume().catch(()=>{});
    const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime;
    o.type=type;o.frequency.setValueAtTime(freq,t);
    if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(35,freq+slide),t+duration);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+.005);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.connect(g);g.connect(group==="ui"?this.uiGain:this.sfxGain);o.start(t);o.stop(t+duration+.02);
  }
  noise(duration=.05,gain=.05){
    const ctx=this.ensure();if(!ctx||!this.enabled)return;
    const count=Math.max(1,Math.floor(ctx.sampleRate*duration)),buf=ctx.createBuffer(1,count,ctx.sampleRate),arr=buf.getChannelData(0);
    for(let i=0;i<count;i++)arr[i]=Math.random()*2-1;
    const src=ctx.createBufferSource(),g=ctx.createGain(),t=ctx.currentTime;
    src.buffer=buf;g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    src.connect(g);g.connect(this.sfxGain);src.start();
  }
  play(name){
    const map={
      ui:()=>this.tone({freq:520,duration:.035,gain:.035,group:"ui"}),
      confirm:()=>this.tone({freq:660,duration:.06,gain:.045,slide:220,group:"ui"}),
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
  startMusic(stageId="paco"){
    this.stopMusic();const ctx=this.ensure();if(!ctx)return;
    const base={paco:73,deck:82,arena:92}[stageId]||78,t=ctx.currentTime;
    const osc=ctx.createOscillator(),sub=ctx.createOscillator(),gain=ctx.createGain(),lfo=ctx.createOscillator(),lfoGain=ctx.createGain();
    osc.type="triangle";sub.type="sine";osc.frequency.value=base*2;sub.frequency.value=base;
    gain.gain.value=.035;lfo.frequency.value=.14;lfoGain.gain.value=.012;
    lfo.connect(lfoGain);lfoGain.connect(gain.gain);osc.connect(gain);sub.connect(gain);gain.connect(this.musicGain);
    osc.start(t);sub.start(t);lfo.start(t);this.musicNodes=[osc,sub,lfo,gain,lfoGain];
  }
  stopMusic(){
    for(const n of this.musicNodes){try{n.stop?.()}catch{}try{n.disconnect?.()}catch{}}
    this.musicNodes=[];
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
