const C={
  ink:"#08111f",blue:"#102d55",blue2:"#1c4674",wood:"#6f3f20",wood2:"#9a5b2d",
  cream:"#d7cfb7",cream2:"#b8ae94",gold:"#dcae42",marble:"#d9d3bc",marble2:"#aaa58f",
  green:"#1f6b47",green2:"#399366",white:"#f1f0e8",black:"#05080d"
};
const rect=(c,x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))};
const line=(c,x1,y1,x2,y2,col,w=1)=>{c.strokeStyle=col;c.lineWidth=w;c.beginPath();c.moveTo(Math.round(x1),Math.round(y1));c.lineTo(Math.round(x2),Math.round(y2));c.stroke()};
const circle=(c,x,y,r,fill,stroke=null,lw=1)=>{c.fillStyle=fill;c.beginPath();c.arc(Math.round(x),Math.round(y),r,0,Math.PI*2);c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke()}};
const poly=(c,pts,col)=>{c.fillStyle=col;c.beginPath();c.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1]);c.closePath();c.fill()};
const txt=(c,t,x,y,size,col="#fff",align="center",font="900")=>{c.fillStyle=col;c.textAlign=align;c.textBaseline="middle";c.font=`${font} ${size}px "Arial Black",monospace`;c.fillText(t,Math.round(x),Math.round(y))};

function chair(c,x,y,s=1){
  rect(c,x-8*s,y-19*s,16*s,17*s,"#10284a");rect(c,x-7*s,y-17*s,14*s,4*s,"#1e426f");
  rect(c,x-10*s,y-3*s,20*s,5*s,"#0a1830");rect(c,x-8*s,y+2*s,3*s,7*s,"#06101f");rect(c,x+5*s,y+2*s,3*s,7*s,"#06101f");
}
function mic(c,x,y,s=1){line(c,x,y,x,y-11*s,"#15191d",2);rect(c,x-2*s,y-14*s,4*s,4*s,"#1b2028")}
function plant(c,x,y,s=1){
  rect(c,x-9*s,y-8*s,18*s,11*s,"#45331e");rect(c,x-7*s,y-9*s,14*s,3*s,"#76532a");
  for(let i=0;i<9;i++){const a=(-1.35+i*.34),len=(14+(i%3)*4)*s;line(c,x,y-9*s,x+Math.cos(a)*len,y-9*s-Math.sin(a)*len,C.green2,3)}
}
function shield(c,x,y,s=1){
  poly(c,[[x-10*s,y-10*s],[x+10*s,y-10*s],[x+8*s,y+7*s],[x,y+14*s],[x-8*s,y+7*s]],"#1c5f96");
  rect(c,x-7*s,y-6*s,14*s,5*s,"#d8d15c");rect(c,x-6*s,y+1*s,5*s,6*s,"#b62c36");rect(c,x+1*s,y+1*s,5*s,6*s,"#2d8b52");
  rect(c,x-2*s,y-8*s,4*s,16*s,"#f0ece0");
  txt(c,"C",x,y+3*s,6*s,"#17283a");
}
function flag(c,x,y,h,color,accent){
  line(c,x,y,x,y+h,"#1a1e25",2);rect(c,x-1,y-3,3,4,C.gold);
  poly(c,[[x+2,y+2],[x+16,y+7],[x+14,y+h*.62],[x+2,y+h*.55]],color);
  if(accent)line(c,x+4,y+10,x+14,y+h*.5,accent,3);
}
function chamberBackground(ctx,w,h,camX=0){
  rect(ctx,0,0,w,h,"#111a27");
  const wallTop=Math.round(h*.055),wallBottom=Math.round(h*.67),floorY=Math.round(h*.73);
  rect(ctx,0,wallTop,w,wallBottom-wallTop,C.cream);
  for(let x=0;x<w;x+=Math.round(w/10)){rect(ctx,x,wallTop,3,wallBottom-wallTop,"#1b3b62");rect(ctx,x+3,wallTop,8,wallBottom-wallTop,"#315681")}
  rect(ctx,0,0,w,wallTop,"#0b1524");
  for(let x=42;x<w;x+=120){rect(ctx,x,18,34,4,"#ddd9bd");rect(ctx,x+5,22,24,2,"#fffbe7");poly(ctx,[[x+6,24],[x+28,24],[x+35,wallBottom],[x-2,wallBottom]],"#fff7cf10")}
  // ceiling beams and repeated light bays
  for(let x=0;x<w;x+=120){rect(ctx,x,0,4,wallTop,"#1b2f4c");rect(ctx,x+78,0,3,wallTop,"#1b2f4c")}
  rect(ctx,0,wallTop-4,w,4,"#324a63");
  // wall boards / institutional side details
  rect(ctx,35,150,118,100,"#3e291d");rect(ctx,41,156,106,88,"#151923");txt(ctx,"AQUI",94,178,12,"#b9bec7");txt(ctx,"O POVO",94,198,12,"#b9bec7");txt(ctx,"TEM VOZ",94,218,12,"#b9bec7");
  rect(ctx,w-153,150,118,100,"#3e291d");rect(ctx,w-147,156,106,88,"#151923");txt(ctx,"TRANSPARÊNCIA",w-94,175,10,"#b9bec7");txt(ctx,"TRABALHO",w-94,197,11,"#b9bec7");txt(ctx,"CUBATÃO MAIS FORTE",w-94,219,8,"#b9bec7");
  // stylized crucifix, matching the visual composition without using external assets
  rect(ctx,w-215,135,6,58,"#4b2a17","#17100b",1);rect(ctx,w-229,150,34,6,"#4b2a17","#17100b",1);
  circle(ctx,w-212,150,4,"#d7a446","#3b260f",1);line(ctx,w-212,154,w-212,171,"#d7a446",3);line(ctx,w-212,159,w-220,166,"#d7a446",2);line(ctx,w-212,159,w-204,166,"#d7a446",2);
  // flags
  flag(ctx,174,130,122,"#ecece2","#222");flag(ctx,204,130,122,"#197c3e","#f2d84a");flag(ctx,234,130,122,"#e6e8e4","#3384a7");
  // center logo + text: dominant, symmetric focal point
  shield(ctx,w/2,136,1.25);txt(ctx,"CÂMARA MUNICIPAL DE",w/2,186,19,"#0d2446");txt(ctx,"CUBATÃO",w/2,218,31,"#0b244b");
  // chairs back
  for(let x=270;x<w-265;x+=52)chair(ctx,x,300,1);
  // main dais
  rect(ctx,w*.24,298,w*.52,11,"#422619");rect(ctx,w*.23,308,w*.54,81,C.wood);rect(ctx,w*.23,308,w*.54,8,C.wood2);
  for(let x=w*.24+15;x<w*.77-15;x+=55){rect(ctx,x,319,2,63,"#3b2317");mic(ctx,x+24,310,.75)}
  shield(ctx,w/2,347,.9);
  // side desks
  rect(ctx,0,324,w*.205,70,C.wood);rect(ctx,0,324,w*.205,8,C.wood2);rect(ctx,w*.795,324,w*.205,70,C.wood);rect(ctx,w*.795,324,w*.205,8,C.wood2);
  for(let x=22;x<w*.19;x+=50){chair(ctx,x,317,.85);mic(ctx,x+14,324,.65)}
  for(let x=w*.81;x<w-15;x+=50){chair(ctx,x,317,.85);mic(ctx,x+14,324,.65)}
  plant(ctx,25,318,1.15);plant(ctx,w-25,318,1.15);plant(ctx,145,309,.9);plant(ctx,w-145,309,.9);
  // floor: large glossy marble plane with converging perspective
  rect(ctx,0,floorY,w,h-floorY,C.marble);
  for(let y=floorY;y<h;y+=22)line(ctx,0,y,w,y,(Math.round(y-floorY)/22)%2===0?"#8c8877":"#aaa58f",1);
  const vp=w/2;
  for(let x=-w;x<w*2;x+=54)line(ctx,vp,floorY,x,h,C.marble2,1);
  // broad reflections from ceiling spots
  ctx.globalAlpha=.13;
  for(let x=40;x<w;x+=112){poly(ctx,[[x,floorY],[x+16,floorY],[x+52,h],[x-24,h]],"#fff")}
  ctx.globalAlpha=.06;rect(ctx,0,floorY,w,10,"#fff9de");
  ctx.globalAlpha=1;
  rect(ctx,0,floorY,w,2,"#f5efd5");
  // subtle vignette
  const g=ctx.createLinearGradient(0,0,w,0);g.addColorStop(0,"#00000035");g.addColorStop(.12,"#0000");g.addColorStop(.88,"#0000");g.addColorStop(1,"#00000035");ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
}
function pacoBackground(ctx,w,h){
  rect(ctx,0,0,w,h,"#8db3c8");rect(ctx,0,h*.45,w,h*.28,"#c9c6bb");
  rect(ctx,w*.16,h*.27,w*.68,h*.35,"#c6c8c3");for(let x=w*.2;x<w*.82;x+=w*.08)rect(ctx,x,h*.31,w*.045,h*.24,"#667a85");
  rect(ctx,w*.48,h*.24,w*.04,h*.38,"#81857f");rect(ctx,0,h*.68,w,h*.05,"#5e655e");
  for(let i=0;i<8;i++){plant(ctx,35+i*(w-70)/7,h*.69,.75)}
  rect(ctx,0,h*.73,w,h*.27,"#ada79a");for(let y=h*.76;y<h;y+=24)line(ctx,0,y,w,y,"#817c72",1);
}
function deckBackground(ctx,w,h){
  rect(ctx,0,0,w,h,"#8dc3dd");rect(ctx,0,h*.36,w,h*.33,"#5fa4bd");rect(ctx,0,h*.62,w,h*.07,"#30677e");
  for(let x=0;x<w;x+=18)line(ctx,x,h*.58,x+70,h*.7,"#88c4d6",1);
  rect(ctx,0,h*.7,w,h*.3,"#bd9b63");for(let x=0;x<w;x+=42)line(ctx,x,h*.7,x,h,"#7d6545",1);
  rect(ctx,w*.46,h*.45,w*.08,h*.02,"#6f6b5d");line(ctx,w*.5,h*.45,w*.5,h*.33,"#77776d",3);
  poly(ctx,[[w*.5,h*.32],[w*.46,h*.38],[w*.54,h*.38]],"#d6d6cc");
  plant(ctx,65,h*.7,.8);plant(ctx,w-65,h*.7,.8);
}
function arenaBackground(ctx,w,h){
  rect(ctx,0,0,w,h,"#27313c");rect(ctx,0,h*.1,w,h*.48,"#b9bcc0");rect(ctx,0,h*.16,w,h*.07,"#9a1f2a");rect(ctx,0,h*.55,w,h*.18,"#7f8585");
  for(let x=50;x<w;x+=80){rect(ctx,x,h*.31,36,h*.15,"#24292e");rect(ctx,x+5,h*.34,26,h*.05,"#d7d8d6")}
  rect(ctx,0,h*.73,w,h*.27,"#6c7a58");for(let y=h*.76;y<h;y+=28)line(ctx,0,y,w,y,"#556246",1);
  for(let x=40;x<w;x+=110)plant(ctx,x,h*.73,.7);
}

export function drawStage(ctx,w,h,mapId="plenario",camera={x:50,zoom:1}){
  ctx.save();ctx.imageSmoothingEnabled=false;
  if(mapId==="plenario")chamberBackground(ctx,w,h,camera.x);
  else if(mapId==="paco")pacoBackground(ctx,w,h);
  else if(mapId==="deck")deckBackground(ctx,w,h);
  else arenaBackground(ctx,w,h);
  ctx.restore();
}

export function drawStagePreview(ctx,w,h,mapId){
  drawStage(ctx,w,h,mapId,{x:50,zoom:1});
}
