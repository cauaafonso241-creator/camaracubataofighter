const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const darken=(hex,amt=.25)=>{
  const h=hex.replace("#","");const n=parseInt(h.length===3?h.split("").map(x=>x+x).join(""):h,16);
  const f=1-amt;return "#"+[n>>16,(n>>8)&255,n&255].map(v=>Math.round(v*f).toString(16).padStart(2,"0")).join("");
};
const lighten=(hex,amt=.25)=>{
  const h=hex.replace("#","");const n=parseInt(h.length===3?h.split("").map(x=>x+x).join(""):h,16);
  return "#"+[n>>16,(n>>8)&255,n&255].map(v=>Math.round(v+(255-v)*amt).toString(16).padStart(2,"0")).join("");
};
function poly(c,pts,fill,stroke="#07101b",lw=2){c.fillStyle=fill;c.strokeStyle=stroke;c.lineWidth=lw;c.beginPath();c.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1]);c.closePath();c.fill();c.stroke()}
function rect(c,x,y,w,h,fill,stroke="#07101b",lw=2){c.fillStyle=fill;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.strokeRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}}
function line(c,x1,y1,x2,y2,col,w=2){c.strokeStyle=col;c.lineWidth=w;c.beginPath();c.moveTo(Math.round(x1),Math.round(y1));c.lineTo(Math.round(x2),Math.round(y2));c.stroke()}
function circle(c,x,y,r,fill,stroke="#07101b",lw=2){c.fillStyle=fill;c.strokeStyle=stroke;c.lineWidth=lw;c.beginPath();c.arc(Math.round(x),Math.round(y),r,0,Math.PI*2);c.fill();if(stroke)c.stroke()}
function rotPoint(x,y,a){const ca=Math.cos(a),sa=Math.sin(a);return [x*ca-y*sa,x*sa+y*ca]}

export class SpriteSheetBank{
  constructor(){this.sheets=new Map()}
  register(id,image,meta){this.sheets.set(id,{image,meta})}
  has(id){return this.sheets.has(id)}
  draw(ctx,id,anim,frame,x,y,scale=1,flip=false){
    const s=this.sheets.get(id);if(!s)return false;
    const a=s.meta?.animations?.[anim];if(!a?.frames?.length)return false;
    const f=a.frames[frame%a.frames.length],fw=s.meta.frameWidth,fh=s.meta.frameHeight;
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(x,y);ctx.scale(flip?-scale:scale,scale);
    ctx.drawImage(s.image,f*fw,0,fw,fh,-fw/2,-fh,fw,fh);ctx.restore();return true;
  }
}

function drawHair(c,look){
  const hair=look.hair||"#17191d",style=look.hairStyle||"short";
  c.fillStyle=hair;c.strokeStyle="#07101b";c.lineWidth=2;
  if(style==="bald"){c.fillRect(-8,-56,16,3);return}
  if(style==="swept"){poly(c,[[-10,-54],[-7,-62],[2,-64],[10,-59],[12,-52],[6,-55],[1,-52],[-4,-55]],hair);return}
  if(style==="slick"){poly(c,[[-11,-55],[-7,-63],[5,-64],[12,-58],[11,-52],[4,-55],[-3,-54]],hair);return}
  if(style==="fade"){poly(c,[[-10,-54],[-8,-61],[7,-62],[11,-55],[8,-52],[1,-54],[-7,-52]],hair);return}
  poly(c,[[-10,-54],[-8,-61],[-2,-64],[7,-63],[11,-57],[10,-52],[4,-54],[-3,-52]],hair);
}
function drawFace(c,f){
  const look=f.look||{},skin=look.skin||"#b97955",hair=look.hair||"#242424",beard=look.beard||hair;
  circle(c,0,-47,12,skin);
  drawHair(c,look);
  // ears
  rect(c,-13,-50,4,7,skin,"#07101b",1);rect(c,9,-50,4,7,skin,"#07101b",1);
  // eyebrows + eyes
  rect(c,-8,-50,6,2,hair,null);rect(c,2,-50,6,2,hair,null);
  rect(c,-6,-47,3,2,"#f2e9dc","#07101b",1);rect(c,3,-47,3,2,"#f2e9dc","#07101b",1);
  rect(c,-5,-47,1,2,"#10151a",null);rect(c,4,-47,1,2,"#10151a",null);
  rect(c,-1,-45,3,5,darken(skin,.2),null);
  rect(c,-5,-38,10,2,"#5c302e",null);
  if(look.beardStyle&&look.beardStyle!=="none"){
    c.fillStyle=beard;
    if(look.beardStyle==="full")poly(c,[[-10,-43],[-8,-34],[-3,-31],[3,-31],[9,-35],[10,-43],[6,-39],[0,-38],[-6,-39]],beard,"#07101b",1);
    else if(look.beardStyle==="goatee")poly(c,[[-4,-39],[4,-39],[3,-30],[0,-28],[-3,-30]],beard,"#07101b",1);
    else rect(c,-8,-40,16,5,beard,"#07101b",1);
  }
  if(look.glasses){
    rect(c,-10,-49,8,6,"#88c9e820","#14202d",2);rect(c,2,-49,8,6,"#88c9e820","#14202d",2);rect(c,-2,-47,4,1,"#14202d",null);
  }
}
function drawShoe(c,x,y,w=9,h=5){rect(c,x,y,w,h,"#070a0f","#02050a",2);rect(c,x+1,y+h-2,w-1,2,"#1b2230",null)}
function drawLimb(c,x1,y1,x2,y2,w,col){
  c.strokeStyle="#07101b";c.lineWidth=w+4;c.lineCap="square";c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();
  c.strokeStyle=col;c.lineWidth=w;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();
}
function poseFor(f,state,move,phase,frame){
  const p={bob:0,bodyX:0,bodyY:0,bodyRot:0,frontArm:[7,-29,16,-18],backArm:[-7,-29,-16,-20],frontLeg:[7,-7,10,20],backLeg:[-7,-7,-10,20],crouch:0,air:0};
  const tick=frame||0;
  if(state==="IDLE"){p.bob=(Math.floor(tick/12)%2);p.frontArm[3]+=(Math.floor(tick/18)%2)}
  if(state==="WALK"){const s=Math.floor(tick/5)%2?1:-1;p.frontLeg=[6,-7,13*s,20];p.backLeg=[-6,-7,-13*s,20];p.frontArm=[7,-29,13*-s,-19];p.backArm=[-7,-29,-13*-s,-18]}
  if(state==="CROUCH"){p.crouch=1;p.bodyY=8;p.frontLeg=[7,-3,15,12];p.backLeg=[-7,-3,-12,14];p.frontArm=[7,-22,16,-14];p.backArm=[-7,-22,-15,-14]}
  if(state==="AIRBORNE"){p.air=1;p.bodyRot=-.05;p.frontLeg=[7,-7,16,8];p.backLeg=[-7,-7,-13,5];p.frontArm=[7,-29,15,-32];p.backArm=[-7,-29,-13,-30]}
  if(state==="BLOCKSTUN"||state==="blocking"){p.frontArm=[7,-29,17,-39];p.backArm=[-7,-29,8,-41];p.bodyX=-2}
  if(state==="HITSTUN"||state==="THROWN"){p.bodyRot=-.12;p.bodyX=-4;p.frontArm=[7,-29,19,-13];p.backArm=[-7,-29,-18,-11]}
  if(state==="KNOCKDOWN"||state==="DEFEAT"){p.bodyRot=-1.12;p.bodyY=18;p.frontLeg=[7,-7,16,8];p.backLeg=[-7,-7,-13,6]}
  if(state==="VICTORY"){p.frontArm=[7,-29,11,-58];p.backArm=[-7,-29,-15,-25];p.bodyRot=-.04}
  if(move){
    if(move.id==="jab"){
      if(phase==="STARTUP")p.frontArm=[7,-29,12,-27];
      if(phase==="ACTIVE"){p.frontArm=[7,-29,35,-29];p.bodyX=3}
    }else if(move.id==="heavy"||move.id==="heavyPunch"){
      if(phase==="STARTUP"){p.frontArm=[7,-29,-4,-18];p.bodyRot=-.12}
      if(phase==="ACTIVE"){p.frontArm=[7,-29,39,-23];p.bodyX=5;p.bodyRot=.07}
    }else if(move.id==="kick"||move.id==="lowKick"){
      if(phase==="STARTUP")p.frontLeg=[7,-7,13,7];
      if(phase==="ACTIVE"){p.frontLeg=move.id==="lowKick"?[7,-7,34,13]:[7,-7,34,-4];p.bodyX=3}
    }else if(move.id==="heavyKick"||move.id==="airKick"){
      if(phase==="STARTUP")p.frontLeg=[7,-7,10,4];
      if(phase==="ACTIVE"){p.frontLeg=[7,-7,38,-13];p.bodyRot=-.08;p.bodyX=3}
    }else if(move.id==="specialA"||move.id==="specialB"||move.id==="super"){
      p.frontArm=[7,-29,19,-25];p.backArm=[-7,-29,-16,-24];p.bodyRot=phase==="ACTIVE"?.04:-.05;
    }
  }
  return p;
}
function drawSuit(c,f,p){
  const main=f.type==="dogs"?"#e6e7e1":f.color||"#315d9e",shade=darken(main,.35),light=lighten(main,.18),skin=f.look?.skin||"#b97955";
  // legs
  drawLimb(c,-5+p.backLeg[0]*.2,-14,p.backLeg[2],p.backLeg[3],7,shade);
  drawShoe(c,p.backLeg[2]-5,p.backLeg[3]-1,11,5);
  drawLimb(c,5+p.frontLeg[0]*.2,-14,p.frontLeg[2],p.frontLeg[3],8,darken(main,.25));
  drawShoe(c,p.frontLeg[2]-4,p.frontLeg[3]-1,12,5);
  // torso
  poly(c,[[-13,-39],[13,-39],[17,-14],[9,-8],[-9,-8],[-17,-14]],main);
  rect(c,-5,-38,10,18,"#eef0ea","#07101b",1);poly(c,[[-2,-36],[2,-36],[1,-20],[-1,-20]],"#a5222a","#07101b",1);
  poly(c,[[-13,-39],[-2,-28],[-7,-15],[-15,-18]],light,"#07101b",1);poly(c,[[13,-39],[2,-28],[7,-15],[15,-18]],shade,"#07101b",1);
  if(f.type==="dogs"){rect(c,-17,-35,5,24,"#f6f6f0","#07101b",1);rect(c,12,-35,5,24,"#f6f6f0","#07101b",1);line(c,-2,-27,-8,-18,"#204f78",2);circle(c,-8,-17,2,"#d9d9d3","#07101b",1)}
  // arms
  drawLimb(c,-10,-34,p.backArm[2],p.backArm[3],7,shade);circle(c,p.backArm[2],p.backArm[3],4,skin);
  drawLimb(c,10,-34,p.frontArm[2],p.frontArm[3],8,main);circle(c,p.frontArm[2],p.frontArm[3],4,skin);
}
function drawCavaco(c){
  c.save();c.translate(5,-24);c.rotate(-.18);
  circle(c,8,2,9,"#c9802f","#4b2c16",2);circle(c,8,2,3,"#3f2415",null);rect(c,15,-1,22,5,"#ad6c2b","#4b2c16",2);rect(c,35,-2,6,7,"#6b421f","#4b2c16",1);
  line(c,12,0,39,0,"#f4d99d",1);line(c,12,3,39,3,"#f4d99d",1);c.restore();
}
function drawScissors(c){c.save();c.translate(18,-25);c.rotate(-.2);circle(c,0,8,5,"#9d2f37","#07101b",2);circle(c,8,8,5,"#9d2f37","#07101b",2);line(c,4,5,-1,-16,"#d6dde3",4);line(c,5,5,14,-14,"#d6dde3",4);c.restore()}
function drawWater(c){c.save();c.translate(17,-26);rect(c,-7,-6,14,20,"#72c9ed","#155986",2);rect(c,-4,-11,8,6,"#94dff5","#155986",2);rect(c,-2,-13,4,3,"#1b6da5","#07101b",1);c.restore()}
function drawProcess(c){c.save();c.translate(17,-28);c.rotate(.08);rect(c,-8,-8,16,22,"#f3f0dd","#27313b",2);rect(c,-5,-4,10,2,"#65717a",null);rect(c,-5,1,10,2,"#65717a",null);rect(c,-5,6,8,2,"#65717a",null);c.restore()}
function drawDumbbell(c){c.save();c.translate(18,-25);c.rotate(-.22);rect(c,-12,-2,24,4,"#9ca8b3","#26313a",1);rect(c,-16,-6,5,12,"#222a33","#07101b",2);rect(c,11,-6,5,12,"#222a33","#07101b",2);c.restore()}
function drawBall(c){c.save();c.translate(18,-25);circle(c,0,0,8,"#f1f1e8","#10141a",2);poly(c,[[-2,-3],[2,-4],[4,0],[1,3],[-3,2]],"#111",null,0);c.restore()}
function drawHairTrail(c,f){
  if(f.type!=="hair")return;c.strokeStyle=f.look?.hair||"#c7a259";c.lineWidth=5;c.beginPath();c.moveTo(8,-53);c.bezierCurveTo(23,-58,30,-42,25,-30);c.stroke();c.strokeStyle="#07101b";c.lineWidth=1;
}
function drawProp(c,f,move){
  if(f.type==="cavaco")drawCavaco(c);
  else if(f.type==="scissors")drawScissors(c);
  else if(f.type==="water")drawWater(c);
  else if(f.type==="process")drawProcess(c);
  else if(f.type==="dumbbell")drawDumbbell(c);
  else if(f.type==="ball")drawBall(c);
}
export function drawFighter(ctx,f,a,{x,y,scale=2.15,facing=1,phase="",tick=0}={}){
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(x),Math.round(y));ctx.scale(facing*scale,scale);
  const p=poseFor(f,a.state,a.move,phase,tick);
  ctx.rotate(p.bodyRot);ctx.translate(p.bodyX,p.bodyY+p.bob);
  drawSuit(ctx,f,p);drawFace(ctx,f);drawHairTrail(ctx,f);drawProp(ctx,f,a.move);
  ctx.restore();
}
export function drawFighterShadow(ctx,x,y,scale=1,air=0){
  const shrink=clamp(1-air*.018,.45,1);ctx.save();ctx.globalAlpha=.35;ctx.fillStyle="#05070a";ctx.beginPath();ctx.ellipse(Math.round(x),Math.round(y),Math.round(34*scale*shrink),Math.round(7*scale*shrink),0,0,Math.PI*2);ctx.fill();ctx.restore();
}
export function drawPixelPortrait(ctx,f,x,y,size=56,flip=false){
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(x+size/2),Math.round(y+size*.82));ctx.scale(flip?-.95:.95,.95);
  const fake={state:"IDLE",move:null};drawSuit(ctx,f,poseFor(f,"IDLE",null,"",0));drawFace(ctx,f);drawHairTrail(ctx,f);drawProp(ctx,f,null);ctx.restore();
}
export function drawProjectile(ctx,p,screenX,screenY){
  const t=p.owner.data.type,superShot=p.move?.id==="super";ctx.save();ctx.translate(Math.round(screenX),Math.round(screenY));ctx.scale(superShot?1.35:1,superShot?1.35:1);
  if(t==="ball"){circle(ctx,0,0,9,"#f2f0e6","#0b0f14",2);poly(ctx,[[-2,-4],[3,-4],[5,0],[1,4],[-4,2]],"#111",null,0)}
  else if(t==="water"){poly(ctx,[[0,-12],[8,0],[4,10],[-4,10],[-8,0]],"#54c9ff","#0f5f98",2);rect(ctx,-2,-7,3,10,"#c7f4ff",null)}
  else if(t==="process"){rect(ctx,-8,-11,16,22,"#f1ecd9","#26303a",2);rect(ctx,-5,-6,9,2,"#6f7881",null);rect(ctx,-5,-1,10,2,"#6f7881",null);rect(ctx,-5,4,7,2,"#6f7881",null)}
  else if(t==="dumbbell"){rect(ctx,-11,-2,22,4,"#a6b0ba","#26313a",1);rect(ctx,-16,-7,5,14,"#232a32","#08101a",2);rect(ctx,11,-7,5,14,"#232a32","#08101a",2)}
  else if(t==="sonic"||t==="cavaco"){for(let i=0;i<3;i++){ctx.strokeStyle=i===2?"#caefff":"#39bdf5";ctx.lineWidth=3;ctx.beginPath();ctx.arc(-5+i*3,0,8+i*6,-.9,.9);ctx.stroke()}}
  else if(t==="dogs"){ctx.fillStyle="#d39b60";rect(ctx,-13,-5,22,12,"#d39b60","#17120e",2);circle(ctx,11,-5,7,"#c58145","#17120e",2);rect(ctx,-8,5,4,8,"#ad713d","#17120e",1);rect(ctx,4,5,4,8,"#ad713d","#17120e",1)}
  else {poly(ctx,[[-10,0],[-3,-5],[0,-13],[4,-5],[12,0],[4,5],[0,13],[-3,5]],superShot?"#fff2a1":"#63dcff","#15334a",2)}
  if(superShot){ctx.strokeStyle="#fff0a5";ctx.lineWidth=2;ctx.strokeRect(-18,-18,36,36)}
  ctx.restore();
}
