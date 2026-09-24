const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export class ParticleSystem{
  constructor(limit=220){
    this.pool=Array.from({length:limit},()=>({active:false}));
    this.cursor=0;
  }
  clear(){for(const p of this.pool)p.active=false}
  spawn(opts={}){
    let p=this.pool[this.cursor++%this.pool.length];
    Object.assign(p,{
      active:true,x:opts.x||0,y:opts.y||0,vx:opts.vx||0,vy:opts.vy||0,
      life:opts.life||18,maxLife:opts.life||18,size:opts.size||3,
      color:opts.color||"#fff",gravity:opts.gravity||0,drag:opts.drag??.94,
      type:opts.type||"square",rot:opts.rot||0,vr:opts.vr||0,alpha:opts.alpha??1
    });
    return p;
  }
  burst(x,y,{count=14,color="#ffd35a",secondary="#ff6c2e",speed=3.2,life=18,size=3,type="square"}={}){
    for(let i=0;i<count;i++){
      const a=(i/count)*TAU+(i%3)*.11,s=speed*(.45+Math.random()*.75);
      this.spawn({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:life+Math.floor(Math.random()*8),size:size+(i%2),color:i%3===0?secondary:color,type,gravity:.08,drag:.92,rot:a,vr:(Math.random()-.5)*.25});
    }
  }
  dust(x,y,dir=1){
    for(let i=0;i<8;i++)this.spawn({x:x+(Math.random()-.5)*10,y:y-Math.random()*3,vx:(-dir*(.4+Math.random()*1.2))+(Math.random()-.5)*.5,vy:-.4-Math.random()*1.1,life:18+Math.random()*15,size:3+Math.random()*4,color:i%2?"#d7d0bb":"#a9a28f",type:"dust",gravity:.03,drag:.93,alpha:.8});
  }
  energy(x,y,dir=1,color="#4bc8ff"){
    for(let i=0;i<10;i++)this.spawn({x:x+(Math.random()-.5)*10,y:y+(Math.random()-.5)*18,vx:-dir*(1.4+Math.random()*2.5),vy:(Math.random()-.5)*1.3,life:10+Math.random()*9,size:2+Math.random()*3,color,type:"line",drag:.9,alpha:.9});
  }
  note(x,y,dir=1){
    this.spawn({x,y,vx:dir*(.5+Math.random()*.5),vy:-1-Math.random()*.6,life:34,size:4,color:"#ffd246",type:"note",drag:.99,gravity:-.01,alpha:1});
  }
  update(){
    for(const p of this.pool){
      if(!p.active)continue;
      p.life--;if(p.life<=0){p.active=false;continue}
      p.vx*=p.drag;p.vy=p.vy*p.drag+p.gravity;p.x+=p.vx;p.y+=p.vy;p.rot+=p.vr;
    }
  }
  draw(ctx,scale=1){
    ctx.save();ctx.imageSmoothingEnabled=false;
    for(const p of this.pool){
      if(!p.active)continue;
      const t=clamp(p.life/p.maxLife,0,1);ctx.globalAlpha=p.alpha*t;
      ctx.fillStyle=p.color;ctx.strokeStyle=p.color;
      const x=Math.round(p.x),y=Math.round(p.y),s=Math.max(1,Math.round(p.size));
      if(p.type==="line"){
        ctx.lineWidth=Math.max(1,s/2);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-p.vx*5,y-p.vy*3);ctx.stroke();
      }else if(p.type==="dust"){
        ctx.fillRect(x-s,y-s,s*2,s);ctx.fillRect(x-s*2,y,s*4,Math.max(1,s-1));
      }else if(p.type==="note"){
        ctx.fillRect(x,y,s,s);ctx.fillRect(x+s-1,y-s*3,Math.max(2,s/2),s*3);ctx.fillRect(x+s,y-s*3,s*2,Math.max(2,s/2));
      }else{
        ctx.save();ctx.translate(x,y);ctx.rotate(p.rot);ctx.fillRect(-s/2,-s/2,s,s);ctx.restore();
      }
    }
    ctx.restore();
  }
}