# Câmara de Cubatão Fighter

Fighting game 2D arcade fictício feito em **HTML, CSS e JavaScript nativo**. O projeto usa retratos e referências locais fornecidos para o trabalho; golpes, estilos de luta, poderes e acontecimentos do jogo são inteiramente fictícios.

## Rodar no Codespaces

```bash
npm install
npm start
```

Abra a porta **3000**. Não há etapa de build obrigatória.

## Modos

- **Luta Simples** — P1 vs CPU ou P1 vs P2 local, dificuldade, melhor de 1/3/5 e tempo configurável.
- **Modo Torneio** — três confrontos com chave e avanço até a final.
- **Modo Treino** — vida/medidor configuráveis, dummy, reset de posição, input display, frame data, hitbox viewer e gravação/reprodução curta do dummy.
- **Mapas** — seleção/visualização das três arenas.
- **Como Jogar**, **Configurações** e **Créditos**.

## Controles

### P1
- Movimento: **A / D**
- Agachar: **S**
- Pular: **W**
- Soco: **Z**
- Chute: **X**
- Pesado: **B**
- Especial simplificado: **C**
- Defesa dedicada: **V**
- Pausa: **Esc**
- Dash: toque duas vezes para frente/trás
- Especial clássico: **↓ ↘ → + soco/chute**
- Agarrão: **soco + chute**
- Super: **pesado + especial** com medidor cheio

Em luta contra CPU, J/K/L continuam aceitos como aliases de soco/chute/especial para compatibilidade com a versão anterior.

### P2 local
- Movimento: **Setas**
- Soco: **J**
- Chute: **K**
- Pesado: **I**
- Especial: **L**
- Defesa: **;**

### Gamepad
- D-pad/analógico: movimento
- A: soco
- B: chute
- X/Y conforme mapeamento padrão: especial/defesa
- LB: pesado
- Start/Menu: pausa

### Mobile
Controles touch aparecem automaticamente em dispositivos com ponteiro coarse, com direcional e botões de soco, chute, pesado, especial e defesa. Em portrait, o jogo pede orientação horizontal.

## Sistemas de combate

- Simulação fixa em **60 Hz** usando `requestAnimationFrame` + acumulador.
- Histórico de input, pressed/held/released, buffer e quarter-circle com leniência.
- Estados explícitos de neutral, walk, crouch, airborne, attack, special, super, hitstun, blockstun, knockdown, wakeup, throw, victory e defeat.
- Hitbox, hurtbox e pushbox separadas.
- Startup / active / recovery por MoveData.
- Hitstop, hit-stun, block-stun, pushback e corner compensation.
- Cancels e chains dirigidos por dados.
- Combo counter, damage scaling e hit-stun scaling.
- Defesa high/low, block spark, chip apenas em especiais/super e sem KO por chip.
- Throw com whiff e janela de tech.
- Knockdown e wake-up.
- Dois especiais + um super por lutador.
- Projéteis com lifetime, dono, hitbox, durabilidade e clash.
- IA com delay de reação por dificuldade e sem leitura de input futuro.
- Red health visual, rounds, timer, medidor, KO, Perfect, Counter e VFX.

## Pausa

Durante a luta, **Esc/Start** congela simulação, timer, IA e projéteis. O menu possui:

- Continuar
- Controles
- Reiniciar round
- Trocar personagem
- Áudio / tremor
- Menu principal

## Treino e debug

No painel de treino:

- Dummy: parado, bloqueio, bloqueio após hit, pulo ou aleatório.
- Vida: infinita, regeneração ou normal.
- Medidor: normal, infinito ou vazio.
- Reset: centro, canto esquerdo ou canto direito.
- Hitbox viewer.
- Input display recente.
- Frame/state display.
- Combo damage.
- Gravação e replay curto do dummy.

## Arquitetura

- `game.js` — bootstrap, preload e integração.
- `src/data.js` — elenco, arenas, MoveData, dificuldade e settings padrão.
- `src/input.js` — teclado, gamepad, touch, buffer e motions.
- `src/engine.js` — Fighter, máquina de estados, fixed step, combate, projéteis, IA, treino e renderer.
- `src/ui.js` — fluxo de telas, seleção, torneio, pausa, settings e resultados.
- `src/services.js` — persistência, preload e áudio procedural.
- `assets/portraits/vereadores/` — retratos reais usados no menu.
- `assets/maps/` — arenas estilizadas.

## Acessibilidade e persistência

Preferências persistidas em `localStorage`:

- volume geral
- música
- efeitos
- interface
- redução de screen shake
- redução de flashes
- especial simplificado
- controles touch forçados
- dificuldade

Ao perder o foco da aba durante a luta, o jogo pausa.

## Checklist manual recomendado

1. Fazer 10 rematches e conferir se não há input duplicado.
2. Testar quarter-circle rápido/lento.
3. Testar buffer no fim da recovery.
4. Testar defesa alta e baixa.
5. Testar cancel de normal conectado e ausência de cancel no whiff.
6. Testar pushbox no corner.
7. Ativar hitboxes no treino.
8. Fazer projéteis colidirem.
9. Pausar durante projétil e abrir Controles.
10. Testar voltar ao menu e iniciar outra luta.
11. Testar resize e troca de aba.
12. Testar gamepad e desconexão.
13. Testar mobile landscape e multi-touch.
14. Jogar menu → seleção → arena → luta → KO → resultado com personagens diferentes.

## Propriedade intelectual

O projeto busca a **sensação de precisão e impacto de fighting games arcade**, mas não utiliza sprites, logos, músicas, efeitos sonoros, interfaces ou código proprietários de outros jogos. A identidade visual e os sistemas deste repositório são próprios do Câmara de Cubatão Fighter.
