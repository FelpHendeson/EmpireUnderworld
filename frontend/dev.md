# Dev Guide - Frontend (Underworld UI)

## Visao geral
Frontend em `React + Vite + Tailwind` com estado principal via `useReducer`.

Fluxo principal:
1. Tela `auth` (registro/login).
2. Tela `saves` (3 slots por usuario).
3. Tela `game` (loop de jogo).
4. Salvamento manual e auto-save em nuvem via API do backend.

## Estrutura
- `src/main.jsx`: entrada React.
- `src/App.jsx`: tela completa do jogo + auth + saves + reducer.
- `src/services/api.js`: cliente HTTP (`authApi`, `saveApi`).
- `src/data/gameData.js`: catalogos e funcoes de regra (crime, mapa, ranks, estado inicial).
- `src/index.css`: Tailwind base/utilitarios e estilos globais.

## Estado e reducer (`src/App.jsx`)
Estado global guarda:
- progresso (`day`, `resources`, `activityLog`)
- mundo (`worldMap`, `selectedLocation`)
- organizacao (`members`, `recruitPool`, `inventory`)
- UI efemera (`combatReport`, `lastTurnSummary`, `uiInfoPanel`)

Acoes principais:
- `ADVANCE_DAY`: calcula renda territorial (`calculateTerritoryIncome`).
- `SET_LOCATION`: seleciona estado/cidade/bairro.
- `ACTION_COMMIT_CRIME`: executa crime com risco e recompensa.
- `ACTION_BUY_ITEM`: compra item e aplica efeitos.
- `ACTION_RECRUIT`: move candidato do pool para membros ativos.
- `ACTION_PROMOTE`: sobe patente se requisitos forem atendidos.
- `ACTION_TAKEOVER`: resolve disputa territorial com chance de vitoria.
- `TOGGLE_INFO`: abre/fecha painel de ajuda.
- `HYDRATE_STATE`: carrega estado vindo do save.

## Sessao e autenticacao
- Token JWT salvo em `localStorage` com chave `underworld_auth_token`.
- No bootstrap (`useEffect` com `authToken`), chama `authApi.me`.
- Token invalido limpa sessao local e volta para `auth`.

## Saves
- Slots fixos: `slot-1`, `slot-2`, `slot-3`.
- `createInitialSlotDrafts` prepara nome de personagem/campanha para slots vazios.
- `saveCurrentProgress` envia `PUT /api/saves/:slot`.
- `extractSavableState` remove campos de UI antes de persistir.
- Auto-save ativo a cada `30s` apenas quando:
  - tela atual = `game`
  - usuario autenticado
  - existe slot ativo

## Integracao HTTP (`src/services/api.js`)
- Base URL: `VITE_API_URL` ou default `http://localhost:3333/api`.
- `parseResponse` transforma erros HTTP em `Error(message)`.
- `authApi`: `register`, `login`, `me`.
- `saveApi`: `list`, `load`, `save`, `remove`.

## Regras de jogo (`src/data/gameData.js`)
- `rankOrder` e `rankData`: progressao de patentes e poder.
- `crimes`: tabela de risco/recompensa/requisitos.
- `blackMarketItems`: itens e efeitos.
- `worldMap`: hierarquia pais > estado > cidade > bairro.
- `createInitialState(playerName)`: fabrica estado inicial de campanha.
- `calculateTerritoryIncome`: renda passiva de bairros `Dominado`.

## Comandos
- `npm run dev`: servidor Vite.
- `npm run build`: build de producao.
- `npm run preview`: preview local da build.

## Variaveis de ambiente
- `VITE_API_URL` (opcional): URL base da API.

Exemplo:
- `VITE_API_URL=http://localhost:3333/api`

## Manutencao e extensao
- Nova mecanica: adicionar action no reducer e dados em `gameData.js`.
- Nova tela: controlar transicao pelo estado `screen` em `App.jsx`.
- Novo endpoint backend: adicionar metodo em `src/services/api.js` e integrar no fluxo de estado.
- Se o reducer crescer muito, separar em modulo (`gameReducer.js`) mantendo `App.jsx` para composicao de telas.