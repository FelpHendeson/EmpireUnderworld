# DEV Guide - Empire Underworld

Este documento descreve como o sistema funciona hoje, com foco em arquitetura de estado, fluxo de jogo e extensoes.

## 1. Arquitetura geral

O projeto usa uma arquitetura simples e centralizada:
- Fonte unica de estado com `useReducer` em `src/App.jsx`.
- Dados e regras base em `src/data/gameData.js`.
- UI declarativa em React renderizando o estado atual.

Objetivo dessa escolha:
- Facilitar debug e previsibilidade das mudancas de estado.
- Preparar o projeto para persistencia futura (LocalStorage, backend ou save game).

## 2. Modelo de estado

Estado inicial criado por `createInitialState()` em `src/data/gameData.js`.

Campos principais:
- `day`: contador de turnos.
- `resources`: economia global (`cash`, `influence`, `respect`).
- `worldMap`: mapa hierarquico e status de presenca por bairro.
- `selectedLocation`: bairro atualmente selecionado na UI.
- `members`: elenco do jogador (nome, rank, xp, level).
- `recruitPool`: candidatos disponiveis para recrutamento.
- `crimes`: tabela de crimes com risco, requisitos e recompensas.
- `blackMarket`: catalogo de itens compraveis.
- `inventory`: quantidade por item comprado.
- `activityLog`: timeline narrativa limitada aos ultimos 12 eventos.
- `combatReport`: resumo textual do ultimo confronto territorial.
- `lastTurnSummary`: resumo de renda passiva do ultimo turno.
- `uiInfoPanel`: painel informativo aberto na UI.

## 3. Dados de dominio (`src/data/gameData.js`)

### 3.1 Patentes
- `rankOrder`: progressao oficial (`Recruta` -> `Soldado` -> `General` -> `Elite`).
- `rankData`: define requisitos de XP, custo de promocao e poder de combate.
- `getNextRank(rank)`: retorna proxima patente valida.
- `getRankPower(rank)`: traduz patente para valor numerico de combate.

### 3.2 Mapa
`worldMap` segue a hierarquia:
- Pais -> Estado -> Cidade -> Bairro

Cada bairro contem:
- `dominantOrg` com nome, `powerLevel` e `eliteCount`.
- `presence` (injetado por `attachPresence`) para indicar progresso do jogador.

### 3.3 Economia territorial
`calculateTerritoryIncome(mapData)` percorre todos os bairros:
- Apenas bairros `Dominado` geram renda.
- Formula atual por bairro dominado:
  - `cash += 15 + powerLevel * 2`
  - `influence += 1`
  - `respect += 1`

## 4. Reducer e fluxo de jogo (`src/App.jsx`)

Toda mudanca ocorre por `dispatch({ type, payload })`.

### 4.1 `ADVANCE_DAY`
- Calcula renda passiva com `calculateTerritoryIncome`.
- Soma em `resources` com `applyResourceDelta`.
- Incrementa `day`.
- Atualiza `lastTurnSummary`.

### 4.2 `SET_LOCATION`
- Atualiza o bairro selecionado para a UI.

### 4.3 `ACTION_COMMIT_CRIME`
- Valida requisitos via `canCommitCrime` (itens + patentes minimas).
- Rola sucesso/falha por `Math.random()` comparado ao `risk`.
- Aplica recompensa completa no sucesso ou penalidade de respeito na falha.
- Adiciona XP no personagem principal e recalcula nivel.
- Registra evento em `activityLog`.

### 4.4 `ACTION_BUY_ITEM`
- Valida saldo (`cash >= price`).
- Debita custo, aplica efeitos do item e incrementa inventario.
- Registra evento no log.

### 4.5 `ACTION_RECRUIT`
- Valida custo de entrada do candidato (`cash` ou `respect`).
- Move membro de `recruitPool` para `members`.
- Debita recursos e registra log.

### 4.6 `ACTION_PROMOTE`
- Busca proxima patente do membro.
- Confere XP minimo e custo em recursos.
- Atualiza patente e debita custo.
- Registra log.

### 4.7 `ACTION_TAKEOVER` (conflito territorial)
Fluxo:
1. Resolve bairro selecionado no mapa.
2. Calcula `ourPower` somando poder por patente dos membros.
3. Le `enemyPower` do bairro (`dominantOrg.powerLevel`).
4. Calcula chance de vitoria:
   - `winChance = clamp(ourPower / (enemyPower + 1), 0.1, 0.9)`
5. Rola resultado com `Math.random()`.
6. Evolui `presence` no bairro:
   - `Inexistente` -> `Infiltrado`
   - `Infiltrado` -> `Disputado`
   - `Disputado` + vitoria -> `Dominado`
7. Chance extra (20%) de absorver 1-2 membros elite ao dominar.
8. Atualiza mapa com `updateNeighborhood` (imutavel).
9. Escreve `combatReport` e `activityLog`.

### 4.8 `TOGGLE_INFO`
- Abre/fecha painel textual de ajuda contextual.

## 5. Helpers importantes

- `applyResourceDelta(resources, delta)`:
  - Padroniza a soma de recursos em todas as acoes.
- `countRankOrAbove(members, rank)`:
  - Base para validar crimes que exigem quantidade minima por patente.
- `updateNeighborhood(worldMap, ids, updater)`:
  - Atualizacao imutavel de bairro sem mutar estado anterior.

## 6. UI e composicao

Componentes locais simples:
- `InfoButton`: icone para abrir ajuda contextual.
- `ResourceCard`: card padrao para recursos do topo.

Blocos de tela:
- Header com dia atual e botao de avancar turno.
- Cards de recursos.
- Mapa (estados e bairros selecionaveis).
- Acoes estrategicas (crimes, mercado negro, recrutamento).
- Roster de membros e promocao.
- Inventario.
- Linha do tempo.

## 7. Pontos de extensao recomendados

- Persistencia:
  - Salvar/restaurar estado completo com LocalStorage ou API.
- Eventos aleatorios:
  - Consumir `activeEvent` com uma tabela de eventos por turno.
- Tenentes/viloes unicos:
  - Criar entidade dedicada com buffs passivos em renda/combate.
- Balanceamento:
  - Externalizar formulas de risco, recompensa e renda para arquivo de config.
- Testes:
  - Cobrir reducer e helpers com casos de sucesso/falha.

## 8. Convencoes do projeto

- Regras de negocio em funcoes puras sempre que possivel.
- Acoes nomeadas com prefixo `ACTION_` para distinguir de eventos de UI.
- Evitar mutacao direta de arrays/objetos do estado.
- Logs narrativos curtos e limitados para nao inflar o estado.
