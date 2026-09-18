export const P="assets/portraits/vereadores/";

export const fighters=[
  {name:"Afonsinho",abbr:"AF",portrait:P+"afonsinho.png",color:"#355d9a",power:"Força Incomparável",type:"power",specialB:"Avanço de Força",super:"Força Total",stats:[92,68,84],look:{skin:"#c99573",hair:"#d5d0c7",beard:"#c7c1b7",hairStyle:"bald",beardStyle:"full",glasses:true}},
  {name:"Donizete",abbr:"DZ",portrait:P+"donizete.png",color:"#6a4a43",power:"Fala Supersônica",type:"sonic",specialB:"Eco Rápido",super:"Onda Supersônica",stats:[76,88,74],look:{skin:"#c58e6e",hair:"#3b3735",beard:"#62554f",hairStyle:"swept",beardStyle:"stubble",glasses:false}},
  {name:"Alan Matias",abbr:"AM",portrait:P+"alan-matias.png",color:"#2f5f82",power:"Super Chute",type:"kick",specialB:"Chute Ascendente",super:"Sequência de Chutes",stats:[86,88,72],look:{skin:"#aa6d4d",hair:"#121c24",beard:"#29221f",hairStyle:"short",beardStyle:"none",glasses:false}},
  {name:"Batoré",abbr:"BT",portrait:P+"batore.png",color:"#704438",power:"Bola de Futebol",type:"ball",specialB:"Bicicleta de Impacto",super:"Chuva de Bolas",stats:[82,78,78],look:{skin:"#b67654",hair:"#172029",beard:"#26201d",hairStyle:"slick",beardStyle:"none",glasses:false}},
  {name:"Kleber do Cavaco",abbr:"KC",portrait:P+"kleber-do-cavaco.png",color:"#694f83",power:"Cavaco",type:"cavaco",specialB:"Acorde Rápido",super:"Solo do Cavaco",stats:[76,84,80],look:{skin:"#ae6d50",hair:"#24201e",beard:"#302a27",hairStyle:"bald",beardStyle:"goatee",glasses:false}},
  {name:"Dr. Anderson Veterinário",abbr:"AV",portrait:P+"dr-anderson-veterinario.png",color:"#586754",power:"Cães de Guarda",type:"dogs",specialB:"Investida Canina",super:"Matilha de Guarda",stats:[84,72,86],look:{skin:"#9f6c53",hair:"#44423e",beard:"#3f403d",hairStyle:"bald",beardStyle:"full",glasses:false}},
  {name:"Edson Mota",abbr:"EM",portrait:P+"edson-mota.png",color:"#446b86",power:"Kickboxing Afiado",type:"kickbox",specialB:"Joelhada Rápida",super:"Combo Kickboxing",stats:[88,86,74],look:{skin:"#b67856",hair:"#111b22",beard:"#211e1c",hairStyle:"short",beardStyle:"none",glasses:false}},
  {name:"Guilherme do Salão",abbr:"GS",portrait:P+"guilherme-do-salao.png",color:"#604a78",power:"Tesourada",type:"scissors",specialB:"Corte Cruzado",super:"Tesoura Relâmpago",stats:[80,88,72],look:{skin:"#83533f",hair:"#111a20",beard:"#171817",hairStyle:"short",beardStyle:"full",glasses:false}},
  {name:"Jair do Bar",abbr:"JB",portrait:P+"jair-do-bar.png",color:"#7b6748",power:"Galão d'Água",type:"water",specialB:"Jato d'Água",super:"Maré de Galões",stats:[82,70,84],look:{skin:"#9d725d",hair:"#d2d2cb",beard:"#c6c3bd",hairStyle:"short",beardStyle:"none",glasses:true}},
  {name:"Marcinho",abbr:"MC",portrait:P+"marcinho.png",color:"#3f6885",power:"Processo Administrativo",type:"process",specialB:"Despacho Rápido",super:"Pilha de Processos",stats:[76,84,80],look:{skin:"#a86e53",hair:"#263139",beard:"#342c28",hairStyle:"fade",beardStyle:"none",glasses:true}},
  {name:"Ronaldo da Comissão",abbr:"RC",portrait:P+"ronaldo-da-comissao.png",color:"#5d4a78",power:"Peso Pesado",type:"dumbbell",specialB:"Levantamento Rápido",super:"Carga Máxima",stats:[92,66,86],look:{skin:"#785444",hair:"#3d4242",beard:"#444541",hairStyle:"short",beardStyle:"full",glasses:false}},
  {name:"Rony",abbr:"RN",portrait:P+"rony.png",color:"#365f80",power:"Galão d'Água",type:"water",specialB:"Jato d'Água",super:"Maré de Galões",stats:[82,82,78],look:{skin:"#724936",hair:"#10191f",beard:"#191817",hairStyle:"short",beardStyle:"none",glasses:false}},
  {name:"Tinho",abbr:"TH",portrait:P+"tinho.png",color:"#45644e",power:"Super Chute",type:"kick",specialB:"Chute Ascendente",super:"Sequência de Chutes",stats:[88,74,82],look:{skin:"#93634f",hair:"#b7b6af",beard:"#77736c",hairStyle:"bald",beardStyle:"goatee",glasses:true}},
  {name:"Topete",abbr:"TP",portrait:P+"topete.png",color:"#6c5a37",power:"Giro Descontrolado",type:"spin",specialB:"Arranque Giratório",super:"Turbilhão",stats:[80,94,70],look:{skin:"#714a39",hair:"#101920",beard:"#17191a",hairStyle:"short",beardStyle:"short",glasses:true}},
  {name:"Xuxa",abbr:"XX",portrait:P+"xuxa.png",color:"#6c523d",power:"Chicote de Cabelo",type:"hair",specialB:"Corte Aéreo",super:"Redemoinho de Cabelo",stats:[78,90,72],look:{skin:"#b97859",hair:"#d2ad68",beard:"#67483a",hairStyle:"swept",beardStyle:"full",glasses:false}}
];

export const maps=[
  {id:"paco",name:"Paço Municipal",subtitle:"Centro de Cubatão",src:"assets/maps/paco-municipal.svg"},
  {id:"deck",name:"Deck da Orla",subtitle:"Orla de Cubatão",src:"assets/maps/deck-orla.svg"},
  {id:"arena",name:"Arena Esportiva",subtitle:"Centro Esportivo",src:"assets/maps/arena-esportiva.svg"}
];

export const projectileTypes=new Set(["ball","water","process","dumbbell","sonic","dogs","cavaco"]);

export const projectileGlyph={
  ball:"⚽",water:"💧",process:"▤",dumbbell:"▰",sonic:")))",dogs:"🐕",cavaco:"♫",
  power:"⚡",kick:"✦",kickbox:"✦",scissors:"✂",spin:"◉",hair:"〰"
};

export const MOVE_TEMPLATES={
  jab:{
    id:"jab",kind:"normal",startup:4,active:2,recovery:8,damage:35,hitstun:10,blockstun:7,hitstop:5,
    hitLevel:"mid",meterGain:5,pushHit:1.0,pushBlock:.65,range:6.4,cancelStart:4,cancelEnd:8,
    cancelOnHit:["jab","kick","specialA","specialB"],cancelOnBlock:["specialA"],knockdown:false
  },
  kick:{
    id:"kick",kind:"normal",startup:8,active:4,recovery:16,damage:62,hitstun:17,blockstun:12,hitstop:7,
    hitLevel:"mid",meterGain:8,pushHit:1.55,pushBlock:.9,range:10.2,cancelStart:9,cancelEnd:14,
    cancelOnHit:["specialA","specialB"],cancelOnBlock:[],knockdown:false
  },
  heavy:{
    id:"heavy",kind:"normal",startup:11,active:4,recovery:23,damage:90,hitstun:22,blockstun:15,hitstop:10,
    hitLevel:"mid",meterGain:11,pushHit:2.4,pushBlock:1.15,range:8.7,cancelStart:12,cancelEnd:16,
    cancelOnHit:["specialA","specialB","super"],cancelOnBlock:[],knockdown:true
  },
  lowKick:{
    id:"lowKick",kind:"normal",startup:5,active:3,recovery:10,damage:38,hitstun:11,blockstun:8,hitstop:5,
    hitLevel:"low",meterGain:5,pushHit:.9,pushBlock:.55,range:7.4,cancelStart:5,cancelEnd:8,
    cancelOnHit:["jab"],cancelOnBlock:[],knockdown:false
  },
  airKick:{
    id:"airKick",kind:"air",startup:6,active:8,recovery:8,damage:50,hitstun:14,blockstun:10,hitstop:6,
    hitLevel:"high",meterGain:6,pushHit:1.15,pushBlock:.75,range:7.8,cancelStart:0,cancelEnd:0,
    cancelOnHit:[],cancelOnBlock:[],knockdown:false
  },
  throw:{
    id:"throw",kind:"throw",startup:5,active:2,recovery:19,damage:95,hitstun:0,blockstun:0,hitstop:8,
    hitLevel:"throw",meterGain:8,pushHit:3.2,pushBlock:0,range:4.2,cancelStart:0,cancelEnd:0,
    cancelOnHit:[],cancelOnBlock:[],knockdown:true
  }
};

export function createCharacterMoves(fighter){
  const ranged=projectileTypes.has(fighter.type);
  const specialA={
    id:"specialA",name:fighter.power,kind:ranged?"projectile":"special",startup:9,active:ranged?3:6,recovery:22,
    damage:95,hitstun:24,blockstun:16,hitstop:8,hitLevel:"mid",meterGain:3,meterCost:35,pushHit:2.7,pushBlock:1.3,
    range:ranged?5.5:12.5,cancelStart:10,cancelEnd:14,cancelOnHit:["super"],cancelOnBlock:[],knockdown:false,
    projectile:ranged?{speed:1.05,lifetime:95,width:3.2,height:3.0,durability:1}:null
  };
  const specialB={
    id:"specialB",name:fighter.specialB,kind:"special",startup:11,active:6,recovery:24,damage:112,hitstun:26,blockstun:16,
    hitstop:9,hitLevel:"mid",meterGain:4,meterCost:35,pushHit:3.3,pushBlock:1.5,range:10.8,cancelStart:12,cancelEnd:18,
    cancelOnHit:["super"],cancelOnBlock:[],knockdown:true,movement:3.8
  };
  const superMove={
    id:"super",name:fighter.super,kind:ranged?"superProjectile":"super",startup:7,active:ranged?8:10,recovery:30,
    damage:220,hitstun:34,blockstun:20,hitstop:13,hitLevel:"mid",meterGain:0,meterCost:100,pushHit:5.3,pushBlock:2.2,
    range:ranged?6:15,cancelStart:0,cancelEnd:0,cancelOnHit:[],cancelOnBlock:[],knockdown:true,
    projectile:ranged?{speed:1.38,lifetime:110,width:5.3,height:4.2,durability:2}:null
  };
  return {jab:{...MOVE_TEMPLATES.jab},kick:{...MOVE_TEMPLATES.kick},heavy:{...MOVE_TEMPLATES.heavy},lowKick:{...MOVE_TEMPLATES.lowKick},airKick:{...MOVE_TEMPLATES.airKick},throw:{...MOVE_TEMPLATES.throw},specialA,specialB,super:superMove};
}

export const difficulty={
  easy:{reaction:[18,26],blockChance:.18,attackChance:.34,specialChance:.07,error:.28},
  normal:{reaction:[12,18],blockChance:.34,attackChance:.48,specialChance:.13,error:.18},
  hard:{reaction:[8,13],blockChance:.48,attackChance:.58,specialChance:.19,error:.11},
  veryhard:{reaction:[6,10],blockChance:.58,attackChance:.65,specialChance:.24,error:.07}
};

export const DEFAULT_SETTINGS={
  masterVolume:.55,musicVolume:.22,sfxVolume:.72,uiVolume:.55,
  reduceShake:false,reduceFlashes:false,simpleSpecial:true,forceTouch:false,difficulty:"normal"
};
