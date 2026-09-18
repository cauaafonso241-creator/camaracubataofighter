import fs from "node:fs";
import assert from "node:assert/strict";
import {fighters,maps,createCharacterMoves} from "../src/data.js";

assert.equal(fighters.length,15,"O elenco deve ter 15 personagens");
assert.ok(maps.length>=3,"Devem existir pelo menos 3 arenas");

for(const [i,f] of fighters.entries()){
  assert.ok(f.name&&f.portrait&&f.power&&f.specialB&&f.super,`Dados incompletos no lutador ${i}`);
  const moves=createCharacterMoves(f);
  for(const id of ["jab","kick","heavy","lowKick","airKick","throw","specialA","specialB","super"]){
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
  "pauseOverlay","controlsOverlay","trainingPanel","mobileControls","modal","projectileLayer","debugLayer"
];
for(const id of requiredIds)assert.ok(index.includes(`id="${id}"`),`Tela/componente #${id} ausente`);

const engine=fs.readFileSync(new URL("../src/engine.js",import.meta.url),"utf8");
for(const token of ["requestAnimationFrame","HITSTUN","BLOCKSTUN","KNOCKDOWN","WAKEUP","hurtbox","pushbox","resolveProjectileClashes","comboCount","resetTrainingPosition"]){
  assert.ok(engine.includes(token),`Engine sem requisito: ${token}`);
}

const input=fs.readFileSync(new URL("../src/input.js",import.meta.url),"utf8");
for(const token of ["motion(player","doubleQcf","doubleTap","navigator.getGamepads","pressed","released"]){
  assert.ok(input.includes(token),`Input sem requisito: ${token}`);
}

console.log("✓ Smoke QA: estrutura, elenco, MoveData, telas, input e engine validados.");
