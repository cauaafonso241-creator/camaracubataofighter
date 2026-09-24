import {chromium} from "playwright";
import fs from "node:fs";

fs.mkdirSync("test-artifacts",{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1600,height:900}});
const errors=[];
page.on("pageerror",e=>errors.push("pageerror: "+e.message));
page.on("console",m=>{if(m.type()==="error")errors.push("console: "+m.text())});
page.on("response",r=>{if(r.status()>=400&&!r.url().endsWith("favicon.ico"))errors.push(`HTTP ${r.status()} ${r.url()}`)});

await page.goto("http://127.0.0.1:3000",{waitUntil:"networkidle"});
await page.locator("#home.active").waitFor({timeout:10000});

await page.click("#quickModeBtn");
await page.locator("#fightConfig.active").waitFor();
await page.selectOption("#difficultySelect","normal");
await page.click("#configContinueBtn");
await page.locator("#select.active").waitFor();

await page.click('#roster .char[data-i="4"]');
await page.click("#confirmFighterBtn");
await page.click('#roster .char[data-i="5"]');
await page.click("#confirmFighterBtn");

await page.locator("#maps.active").waitFor();
await page.click('#mapGrid .map-card[data-map="0"]');
await page.click("#mapConfirm");
await page.locator("#vs.active").waitFor();
await page.click("#startFightBtn");
await page.locator("#arena.active").waitFor();

await page.waitForTimeout(1900);
const canvasInfo=await page.evaluate(()=>({
  width:document.querySelector("#fightCanvas")?.width,
  height:document.querySelector("#fightCanvas")?.height,
  running:window.CCF?.engine?.running,
  p1:window.CCF?.engine?.p1?.data?.name,
  p2:window.CCF?.engine?.p2?.data?.name,
  map:window.CCF?.maps?.[window.CCF?.engine?.config?.mapIndex]?.id
}));
if(!canvasInfo.width||!canvasInfo.height||!canvasInfo.running)errors.push("Canvas/engine não iniciou");
if(canvasInfo.p1!=="Kleber do Cavaco"||canvasInfo.p2!=="Dr. Anderson Veterinário")errors.push("Seleção de lutadores não propagou");
if(canvasInfo.map!=="plenario")errors.push("Arena Plenário não iniciou");

await page.keyboard.down("d");await page.waitForTimeout(240);await page.keyboard.up("d");
for(const key of ["f","g","v","b","r"]){await page.keyboard.press(key);await page.waitForTimeout(220)}
await page.evaluate(()=>window.CCF.engine.p1.meter=100);
await page.keyboard.press("t");
await page.waitForTimeout(350);

await page.keyboard.press("F3");
await page.waitForTimeout(100);
const debug=await page.evaluate(()=>window.CCF.engine.debug);
if(!debug)errors.push("F3 não ativou debug");

await page.keyboard.press("Escape");
await page.locator("#pauseOverlay:not(.hidden)").waitFor();
const paused=await page.evaluate(()=>window.CCF.engine.paused);
if(!paused)errors.push("Pause não congelou engine");

await page.click("#pauseControlsBtn");
await page.locator("#controlsOverlay:not(.hidden)").waitFor();
await page.click("#backToPauseBtn");
await page.locator("#pauseOverlay:not(.hidden)").waitFor();

await page.screenshot({path:"test-artifacts/fight.png",fullPage:true});

await page.click("#pauseMenuBtn");
await page.locator("#confirmOverlay:not(.hidden)").waitFor();
await page.click("#confirmYes");
await page.locator("#home.active").waitFor();
const stopped=await page.evaluate(()=>!window.CCF.engine.running);
if(!stopped)errors.push("Voltar ao menu não encerrou engine");

await browser.close();
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log("✓ Browser smoke: menu → seleção → Plenário → luta → ataques → F3 → pause → controles → menu.");
