import fs from "node:fs";
import assert from "node:assert/strict";
import {fighters,maps,createCharacterMoves} from "../src/data.js";

assert.equal(fighters.length,15,"O elenco deve ter 15 personagens");
assert.ok(maps.length>=4,"Devem existir Plenário + arenas já existentes");
assert.equal(maps[0].id,"plenario","O Plenário deve ser a arena principal");

for(const [i,f] of fighters.entries()){
  assert.ok(f.name&&f.portrait&&f.power&&f.specialB&&f.super,`Dados incompletos no lutador ${i}`);
  assert.ok(f.look&&f.look.skin&&f.look.hair,`${f.name}: traços visuais pixel art ausentes`);
  const moves=createCharacterMoves(f);
  for(const id of ["jab","kick","heavy","heavyKick","lowKick","airKick","throw","specialA","specialB","super"]){
    const m=moves[id];assert.ok(m,`${f.name}: golpe ${id} ausente`);
    assert.ok(Number.isFinite(m.startup)&&m.startup>=0,`${f.name}/${id}: startup inválido`);
    assert.ok(Number.isFinite(m.active)&&m.active>0,`${f.name}/${id}: active inválido`);
    assert.ok(Number.isFinite(m.recovery)&&m.recovery>=0,`${f.name}/${id}: recovery inválido`);
    assert.ok(Number.isFinite(m.damage)&&m.damage>=0,`${f.name}/${id}: dano inválido`);
  }
  assert.equal(moves.super.meterCost,100,`${f.name}: Super deve custar 100`);
}

const index=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");
const requiredIds=[
  "boot","home","fightConfig","select","maps","tournament","vs","how","settings","credits","arena",
  "fightCanvas","pauseOverlay","controlsOverlay","trainingPanel","mobileControls","modal"
];
for(const id of requiredIds)assert.ok(index.includes(`id="${id}"`),`Tela/componente #${id} ausente`);
assert.ok(!index.includes('id="p1" class="fighter"'),"Gameplay não deve voltar aos bonecos DOM");
assert.ok(index.includes('data-virt="lightPunch"')&&index.includes('data-virt="super"'),"Touch de seis botões incompleto");

const engine=fs.readFileSync(new URL("../src/engine.js",import.meta.url),"utf8");
for(const token of ["CanvasRenderer","requestAnimationFrame","HITSTUN","BLOCKSTUN","KNOCKDOWN","WAKEUP","hurtboxes","pushbox","resolveProjectileClashes","comboCount","resetTrainingPosition","restartMatch"]){
  assert.ok(engine.includes(token),`Engine sem requisito: ${token}`);
}
assert.ok(!engine.includes("projectileGlyph"),"Gameplay não deve usar glyph/emoji em projéteis");

const renderer=fs.readFileSync(new URL("../src/canvasRenderer.js",import.meta.url),"utf8");
for(const token of ["getContext(\"2d\"","imageSmoothingEnabled=false","drawStage","drawFighter","drawHUD","drawDebug","camera","ParticleSystem"]){
  assert.ok(renderer.includes(token),`Renderer Canvas sem requisito: ${token}`);
}

const input=fs.readFileSync(new URL("../src/input.js",import.meta.url),"utf8");
for(const token of ["KeyF","KeyG","KeyV","KeyB","KeyR","KeyT","Numpad1","Numpad8","motion(player","doubleTap","navigator.getGamepads","pressed","released","F3"]){
  assert.ok(input.includes(token),`Input sem requisito: ${token}`);
}

const stage=fs.readFileSync(new URL("../src/stageArt.js",import.meta.url),"utf8");
for(const token of ["CÂMARA MUNICIPAL DE","CUBATÃO","flag(","shield(","chamberBackground","floorY"]){
  assert.ok(stage.includes(token),`Arena principal sem detalhe esperado: ${token}`);
}

console.log("✓ Smoke QA: Canvas2D, pixel art, elenco, arena, HUD, MoveData, inputs e combate validados.");
