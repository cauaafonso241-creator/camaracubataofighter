import {maps} from "./data.js";
import {ParticleSystem} from "./particleSystem.js";
import {drawStage} from "./stageArt.js";
import {drawFighter,drawFighterShadow,drawPixelPortrait,drawProjectile} from "./pixelFighters.js";

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;

export class CanvasRenderer{
  constructor(engine){
    this.engine=engine;
    this.canvas=document.querySelector("#fightCanvas");
    this.ctx=this.canvas?.getContext("2d",{alpha:false})||null;
    this.stage=document.querySelector("#stage");
    this.particles=new ParticleSystem(240);
    this.camera={x:50,zoom:1};
    this.flashFrames=0;this.shakeFrames=0;this.shakePower=0;
    this.lastSize={w:0,h:0};this.fps=60;this.frames=0;this.fpsTick=performance.now();
    this.mapId="plenario";
    if(this.ctx)this.ctx.imageSmoothingEnabled=false;
  }
  init(config){
    this.mapId=maps[config.mapIndex]?.id||"plenario";
    this.camera.x=50;this.camera.zoom=1;this.particles.clear();this.flashFrames=0;this.shakeFrames=0;
    this.resize();
  }
  resize(){
    if(!this.canvas||!this.stage)return;
    const r=this.stage.getBoundingClientRect(),cssW=Math.max(640,Math.round(r.width||960)),cssH=Math.max(360,Math.round(r.height||540));
    const aspect=clamp(cssW/cssH,16/9,3);
    const h=540,w=Math.round(h*aspect);
    if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;this.ctx.imageSmoothingEnabled=false}
    this.lastSize={w,h};
  }
  step(){
    this.particles.update();
    if(this.flashFrames>0)this.flashFrames--;
    if(this.shakeFrames>0)this.shakeFrames--;
  }
  worldX(x){
    const {w}=this.lastSize;
    return w/2+((x-this.camera.x)/100*w)*this.camera.zoom;
  }
  groundY(){return Math.round(this.lastSize.h*.89)}
  worldY(y){return this.groundY()-y*10*this.camera.zoom}
  render(){
    if(!this.ctx||!this.engine.p1||!this.engine.p2)return;
    this.resize();
    const e=this.engine,ctx=this.ctx,{w,h}=this.lastSize;
    const mid=(e.p1.x+e.p2.x)/2,dist=Math.abs(e.p2.x-e.p1.x);
    const targetX=clamp(mid,46,54),targetZoom=clamp(1.075-(Math.max(0,dist-34)*.0035),.94,1.075);
    this.camera.x=lerp(this.camera.x,targetX,.08);this.camera.zoom=lerp(this.camera.zoom,targetZoom,.07);
    let sx=0,sy=0;if(this.shakeFrames>0&&!e.settings.get("reduceShake")){const phase=this.shakeFrames%4;sx=(phase===0?-1:phase===1?1:phase===2?-.6:.6)*this.shakePower;sy=(phase%2?-.45:.45)*this.shakePower}
    ctx.save();ctx.translate(Math.round(sx),Math.round(sy));ctx.imageSmoothingEnabled=false;
    drawStage(ctx,w,h,this.mapId,this.camera);
    this.drawArenaLights(ctx,w,h);
    this.drawFighters(ctx);
    this.drawProjectiles(ctx);
    this.particles.draw(ctx);
    if(e.debug)this.drawDebug(ctx);
    this.drawHUD(ctx,w,h);
    this.drawBanners(ctx,w,h);
    if(this.flashFrames>0&&!e.settings.get("reduceFlashes")){ctx.globalAlpha=clamp(this.flashFrames/7,0,.55);ctx.fillStyle="#fff8da";ctx.fillRect(0,0,w,h);ctx.globalAlpha=1}
    ctx.restore();
    this.updateTrainingDOM();this.updateFPS();
  }
  updateFPS(){
    this.frames++;const now=performance.now();if(now-this.fpsTick>=500){this.fps=Math.round(this.frames*1000/(now-this.fpsTick));this.frames=0;this.fpsTick=now}
  }
  drawArenaLights(ctx,w,h){
    ctx.save();ctx.globalAlpha=.08;ctx.fillStyle="#fff7c9";
    for(let x=80;x<w;x+=180){ctx.beginPath();ctx.moveTo(x-12,22);ctx.lineTo(x+12,22);ctx.lineTo(x+55,h*.76);ctx.lineTo(x-55,h*.76);ctx.closePath();ctx.fill()}
    ctx.restore();
  }
  fighterScale(){return 2.95*this.camera.zoom}
  drawFighters(ctx){
    const e=this.engine,gy=this.groundY(),ordered=[e.p1,e.p2].sort((a,b)=>a.x-b.x);
    for(const a of ordered){
      const x=this.worldX(a.x),y=this.worldY(a.y),scale=this.fighterScale(),phase=e.phaseOf(a);
      drawFighterShadow(ctx,x,gy,scale/2.95,a.y);
      if(a.dashFrames>0){
        ctx.save();ctx.globalAlpha=.13;drawFighter(ctx,a.data,a,{x:x-a.facing*20,y,scale,facing:a.facing,phase,tick:e.frame-2});ctx.globalAlpha=.08;drawFighter(ctx,a.data,a,{x:x-a.facing*38,y,scale,facing:a.facing,phase,tick:e.frame-4});ctx.restore();
      }
      if(a.state==="HITSTUN"&&e.hitstop>0){ctx.save();ctx.globalAlpha=.35;ctx.fillStyle="#fff";ctx.fillRect(Math.round(x-55),Math.round(y-220),110,210);ctx.restore()}
      drawFighter(ctx,a.data,a,{x,y,scale,facing:a.facing,phase,tick:e.frame});
      if((a.move?.id==="specialA"||a.move?.id==="specialB")&&phase==="ACTIVE")this.drawSpecialAura(ctx,a,x,y);
      if(a.move?.id==="super")this.drawSuperAura(ctx,a,x,y);
    }
  }
  drawSpecialAura(ctx,a,x,y){
    ctx.save();ctx.globalAlpha=.45;ctx.strokeStyle=a.data.type==="cavaco"?"#38c8ff":"#ffd35a";ctx.lineWidth=2;
    for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(x+a.facing*(30+i*8),y-95,18+i*8,-.7,.7);ctx.stroke()}
    ctx.restore();
  }
  drawSuperAura(ctx,a,x,y){
    ctx.save();ctx.globalAlpha=.32;ctx.strokeStyle="#ffe673";ctx.lineWidth=2;
    for(let i=0;i<5;i++){ctx.beginPath();ctx.arc(x,y-105,34+i*10,0,Math.PI*2);ctx.stroke()}
    ctx.restore();
  }
  drawProjectiles(ctx){
    for(const p of this.engine.projectiles){
      const x=this.worldX(p.x),y=this.worldY(p.y);
      ctx.save();
      if(p.vx<0){ctx.translate(x,y);ctx.scale(-1,1);drawProjectile(ctx,p,0,0);ctx.restore()}else{drawProjectile(ctx,p,x,y)}
      if(p.owner.data.type==="cavaco"&&this.engine.frame%8===0)this.particles.note(x-8,y-15,p.vx>0?1:-1);
    }
  }
  drawHUD(ctx,w,h){
    const e=this.engine,top=9,portrait=58,center=w/2;
    ctx.save();ctx.imageSmoothingEnabled=false;
    ctx.fillStyle="#020815dd";ctx.fillRect(0,0,w,92);ctx.fillStyle="#19314f";ctx.fillRect(0,90,w,3);
    this.hudPortrait(ctx,e.p1,12,10,portrait,false,"#2c8b53");
    this.hudPortrait(ctx,e.p2,w-12-portrait,10,portrait,true,"#d39a18");
    const leftX=82,leftEnd=center-58,rightX=center+58,rightEnd=w-82,barY=43,barH=18;
    this.pixelText(ctx,e.p1.data.name.toUpperCase(),leftX,23,16,"left","#f5f7fa");
    this.pixelText(ctx,e.p2.data.name.toUpperCase(),rightEnd,23,16,"right","#f5f7fa");
    this.healthBar(ctx,e.p1,leftX,barY,leftEnd-leftX,barH,false);
    this.healthBar(ctx,e.p2,rightX,barY,rightEnd-rightX,barH,true);
    this.energySegments(ctx,e.p1,leftX,68,leftEnd-leftX,false);
    this.energySegments(ctx,e.p2,rightX,68,rightEnd-rightX,true);
    this.pixelText(ctx,String(Math.max(0,Math.ceil(e.roundFrames/60))).padStart(2,"0"),center,34,48,"center","#ffd13b","#451511");
    this.pixelText(ctx,"ROUND "+e.round,center,74,10,"center","#d9e7f4");
    this.roundPips(ctx,e.p1,leftX,83,false);this.roundPips(ctx,e.p2,rightEnd,83,true);
    ctx.restore();
  }
  hudPortrait(ctx,a,x,y,size,flip,border){
    ctx.save();ctx.fillStyle="#07101d";ctx.fillRect(x-3,y-3,size+6,size+6);ctx.fillStyle=border;ctx.fillRect(x,y,size,size);ctx.fillStyle="#0c2137";ctx.fillRect(x+4,y+4,size-8,size-8);
    ctx.save();ctx.beginPath();ctx.rect(x+4,y+4,size-8,size-8);ctx.clip();drawPixelPortrait(ctx,a.data,x+2,y+1,size-4,flip);ctx.restore();ctx.restore();
  }
  healthBar(ctx,a,x,y,w,h,reverse){
    ctx.fillStyle="#dbe6f2";ctx.fillRect(x-3,y-3,w+6,h+6);ctx.fillStyle="#07101c";ctx.fillRect(x,y,w,h);
    const delayed=clamp(a.redHp/1000,0,1),hp=clamp(a.hp/1000,0,1),innerH=h-6;
    this.fillBar(ctx,x+3,y+3,w-6,innerH,delayed,reverse,"#c62834");
    const col=hp>.55?"#35dc65":hp>.25?"#f3db32":"#ed3a3a";
    const grad=ctx.createLinearGradient(x,0,x+w,0);grad.addColorStop(0,reverse?"#ffbd35":col);grad.addColorStop(.5,"#f6ec44");grad.addColorStop(1,reverse?col:"#ffbd35");
    this.fillBar(ctx,x+3,y+3,w-6,innerH,hp,reverse,grad);
  }
  fillBar(ctx,x,y,w,h,pct,reverse,fill){
    const fw=Math.round(w*pct);ctx.fillStyle=fill;if(reverse)ctx.fillRect(x+w-fw,y,fw,h);else ctx.fillRect(x,y,fw,h);
  }
  energySegments(ctx,a,x,y,w,reverse){
    const segW=36,gap=7,total=segW*3+gap*2,start=reverse?x+w-total:x;
    for(let i=0;i<3;i++){const filled=a.meter>=(i+1)*33-1;const xx=start+i*(segW+gap);ctx.fillStyle="#dce9f7";ctx.fillRect(xx-2,y-2,segW+4,10);ctx.fillStyle="#07101d";ctx.fillRect(xx,y,segW,6);if(filled){ctx.fillStyle="#29a8ff";ctx.fillRect(xx+2,y+2,segW-4,2)}}
  }
  roundPips(ctx,a,x,y,reverse){for(let i=0;i<a.wins;i++){ctx.fillStyle="#ffd23e";ctx.fillRect(reverse?x-7-i*9:x+i*9,y,6,6);ctx.strokeStyle="#34160e";ctx.strokeRect(reverse?x-7-i*9:x+i*9,y,6,6)}}
  pixelText(ctx,text,x,y,size,align="center",fill="#fff",shadow="#06101b"){
    ctx.save();ctx.textAlign=align;ctx.textBaseline="middle";ctx.font=`900 ${size}px "Arial Black",monospace`;ctx.fillStyle=shadow;ctx.fillText(text,x+2,y+2);ctx.fillStyle=fill;ctx.fillText(text,x,y);ctx.restore();
  }
  drawBanners(ctx,w,h){
    const e=this.engine;
    if(e.announcement?.frames>0)this.banner(ctx,e.announcement.text,w/2,h*.29,48);
    if(e.comboBanner?.frames>0){const left=e.comboBanner.side==="p1";this.pixelText(ctx,e.comboBanner.text,left?55:w-55,h*.34,24,left?"left":"right","#ffd74b","#651915")}
    if(e.counterBanner?.frames>0)this.pixelText(ctx,"COUNTER!",e.counterBanner.side==="p1"?w*.18:w*.82,h*.40,20,"center","#ff7052","#2c0908");
  }
  banner(ctx,text,x,y,size){
    ctx.save();ctx.translate(x,y);ctx.transform(1,-.03,.02,1,0,0);this.pixelText(ctx,text,0,0,size,"center","#ffd547","#711a15");ctx.restore();
  }
  drawDebug(ctx){
    const e=this.engine;for(const a of [e.p1,e.p2]){
      for(const b of e.hurtboxes(a))this.debugBox(ctx,b,"#39ff6a");
      this.debugBox(ctx,e.pushbox(a),"#42a9ff");
      if(a.move&&e.phaseOf(a)==="ACTIVE"&&!a.move.projectile){const hb=e.hitbox(a,a.move);if(hb)this.debugBox(ctx,hb,a.move.kind==="throw"?"#ffe55b":"#ff4d4d")}
      this.pixelText(ctx,`${a.side.toUpperCase()} ${a.state} x:${a.x.toFixed(1)} y:${a.y.toFixed(1)} vx:${(a.vx||0).toFixed(2)}`,this.worldX(a.x),this.worldY(a.y+22),9,"center","#fff","#000");
    }
    for(const p of e.projectiles)this.debugBox(ctx,{x:p.x-p.w/2,y:p.y-p.h/2,w:p.w,h:p.h},"#d14cff");
    this.pixelText(ctx,`F3 DEBUG • ${this.fps} FPS`,12,this.lastSize.h-12,10,"left","#9cffaa","#000");
  }
  debugBox(ctx,b,col){
    const x1=this.worldX(b.x),x2=this.worldX(b.x+b.w),y1=this.worldY(b.y),y2=this.worldY(b.y+b.h);
    ctx.save();ctx.strokeStyle=col;ctx.lineWidth=2;ctx.globalAlpha=.9;ctx.strokeRect(Math.round(Math.min(x1,x2)),Math.round(Math.min(y1,y2)),Math.round(Math.abs(x2-x1)),Math.round(Math.abs(y2-y1)));ctx.globalAlpha=.15;ctx.fillStyle=col;ctx.fillRect(Math.min(x1,x2),Math.min(y1,y2),Math.abs(x2-x1),Math.abs(y2-y1));ctx.restore();
  }
  spawnImpact(def,type="light"){
    const x=this.worldX(def.x),y=this.worldY(def.y+9);
    const heavy=type==="heavy"||type==="super";this.particles.burst(x,y,{count:heavy?24:13,color:type==="block"?"#8eeaff":"#ffe05b",secondary:type==="super"?"#fff4bd":"#ff6d37",speed:heavy?5:3.2,life:heavy?25:17,size:heavy?4:3});
  }
  spawnDust(a){this.particles.dust(this.worldX(a.x),this.groundY()-2,a.facing)}
  spawnEnergy(a,color="#52cfff"){this.particles.energy(this.worldX(a.x),this.worldY(a.y+10),a.facing,color)}
  shake(level="light"){this.shakePower=level==="heavy"?5:level==="medium"?3:1.5;this.shakeFrames=level==="heavy"?12:7}
  flash(level="normal"){this.flashFrames=level==="super"?8:4}
  updateTrainingDOM(){
    const e=this.engine;if(e.mode!=="training")return;
    const fd=document.querySelector("#frameDataText"),cd=document.querySelector("#comboDamageText"),inp=document.querySelector("#inputDisplay");
    if(fd)fd.textContent=e.p1.move?`${e.p1.move.id.toUpperCase()} • ${e.phaseOf(e.p1)} • F${e.p1.moveFrame}`:e.p1.state;
    if(cd)cd.textContent=`DANO: ${e.p1.comboDamage}`;
    if(inp)inp.innerHTML=e.input.recentLabels("p1",20).map(x=>`<span class="input-chip">${x}</span>`).join("");
  }
}
