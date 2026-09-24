import {fighters,maps} from "./src/data.js";
import {InputManager} from "./src/input.js";
import {SettingsStore,AudioManager,AssetLoader} from "./src/services.js";
import {GameEngine} from "./src/engine.js";
import {UIController} from "./src/ui.js";

const settings=new SettingsStore();
const audio=new AudioManager(settings);
const input=new InputManager();
let ui;

const engine=new GameEngine({
  input,audio,settings,
  onMatchEnd:result=>ui?.handleMatchEnd(result)
});

ui=new UIController({engine,input,audio,settings});
input.onDebug(()=>{if(engine.running){engine.setDebug(!engine.debug);const btn=document.querySelector("#debugBoxesBtn");if(btn)btn.classList.toggle("active",engine.debug)}});

const criticalAssets=[
  ...fighters.map(f=>f.portrait),
  ...maps.map(m=>m.src)
];

const progress=document.querySelector("#loadProgress");
const progressText=document.querySelector("#loadText");
const loader=new AssetLoader(criticalAssets,p=>{
  const pct=Math.round(p*100);
  if(progress)progress.style.width=pct+"%";
  if(progressText)progressText.textContent=pct+"%";
});

loader.load().finally(()=>{
  setTimeout(()=>{
    document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
    document.querySelector("#home")?.classList.add("active");
    document.querySelector("#quickModeBtn")?.focus();
  },120);
});

document.addEventListener("error",e=>{
  const img=e.target;
  if(img instanceof HTMLImageElement){
    img.classList.add("asset-failed");
    img.alt=img.alt||"Imagem indisponível";
    console.warn("Fallback visual aplicado ao asset:",img.src);
  }
},true);

window.CCF={engine,ui,input,settings,audio,fighters,maps};
