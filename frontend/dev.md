# Dev Guide - Frontend (Underworld UI)

## Visao geral
Frontend em `React + Vite + Tailwind` com estado principal via `useReducer`.

Fluxo principal:
1. Tela `auth` (registro/login).
2. Tela `saves` (3 slots por usuario).
3. Tela `game` (loop de jogo com abas internas).
4. Salvamento manual e auto-save em nuvem via API do backend.

## Estrutura
- `src/main.jsx`: entrada React.
- `src/App.jsx`: composicao das telas (`auth`, `saves`, `game`) e orquestracao de sessao.
- `src/game/reducer.js`: reducer principal e utilitarios de estado/saves.
- `src/game/modules/actionResolution.js`: rolagens, pesos de status e encontros dinamicos de acoes.
- `src/game/modules/criminalEngine.js`: catalogo de crimes por tier, requisitos, locais, oposicoes e NPCs locais.
- `src/game/modules/recruits.js`: geracao e renovacao da fila de candidatos.
- `src/services/api.js`: cliente HTTP (`authApi`, `saveApi`).
- `src/data/gameData.js`: catalogos e funcoes de regra (crime, mapa, ranks, estado inicial).
- `src/index.css`: Tailwind base/utilitarios e estilos globais.

## Estado e reducer (`src/game/reducer.js`)
Estado global guarda:
- progresso (`day`, `resources`, `activityLog`)
- mundo (`worldMap`, `selectedLocation`)
- dominio local (`domain`)
- organizacao (`members`, `recruitPool`, `inventory`)
- rede local (`npcNetwork`)
- encontros de acao (`activeEvent`)
- UI efemera (`combatReport`, `lastTurnSummary`, `uiInfoPanel`)

Acoes principais:
- `ADVANCE_DAY`: calcula renda territorial e pode renovar o `recruitPool`.
- `SET_LOCATION`: seleciona estado/cidade/bairro.
- `ACTION_COMMIT_CRIME`: inicia teste RPG com dado, pesos de status, faixas min/medio/max e possivel encontro.
- `RESOLVE_ACTIVE_EVENT_OPTION`: resolve uma resposta do jogador dentro de um encontro dinamico.
- `CLOSE_ACTIVE_EVENT`: fecha encontro ja resolvido.
- `UPGRADE_DOMAIN`: evolui casa para base e base para area quando requisitos forem atendidos.
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
- `crimes`: catalogo vindo do motor criminal com tiers, familias, recompensas e requisitos.
- Atributos de acao incluem `stealth`, `intelligence` e `analysis`, usados em crimes furtivos.
- `domain`: representa o ponto atual do jogador no mapa (`casa`, `base` ou `area`).
- `blackMarketItems`: itens e efeitos.
- `createRecruitPool`: inicia a campanha com candidatos recrutaveis.
- `worldMap`: hierarquia pais > estado > cidade > bairro.
- `createInitialState(playerName)`: fabrica estado inicial de campanha.
- `calculateTerritoryIncome`: renda passiva de bairros `Dominado`.

## UI de mapa, timeline e NPCs
- Linha do tempo usa categorias inferidas do texto do log: crimes, mapa, pessoas e sistema.
- Cada item da timeline pode abrir um modal com leitura isolada do evento.
- O painel de NPCs tem abas `Rede` e `Conversas`; conversas sao semi-estaticas e ficam em estado local da UI.
- O painel de dominio mostra casa/base/area, atributos de seguranca/logistica/influencia e botao de upgrade.
- Upgrade de dominio consome recursos e registra evento na timeline.
- A tela de jogo usa abas `Visao`, `Mapa`, `Acoes`, `Equipe` e `Historico`.
- Em mobile, as abas aparecem como navegacao inferior fixa para reduzir scroll e aproximar a experiencia de app.
- A aba `Mapa` usa visual tatico: regioes, setores de bairro, barras de controle, ameaca rival e painel de alvo.

## Resolucao dinamica de acoes
- Crimes usam `src/game/modules/actionResolution.js`.
- O catalogo e requisitos usam `src/game/modules/criminalEngine.js`.
- Tiers atuais vao de acoes solo ate estrutura regional.
- Requisitos podem depender de item, patente, respeito, influencia ou NPC local com tag util.
- Cada bairro possui personagens locais com relacao (`ally`, `friend`, `neutral`, `rival`, `enemy`) e tags que liberam oportunidades.
- Cada acao rola `d20`, aplica multiplicador por nivel e soma status ponderados.
- O resultado compara `minimum`, `medium` e `maximum` para definir falha, empate, sucesso ou sucesso critico.
- No `furto`, falha abre um modal de encontro com local, oponente e respostas possiveis.
- Respostas tambem usam rolagem e status ponderados, permitindo desdobramentos como lutar, bater e fugir, se soltar e correr ou conversar.

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
- Mecanicas de recrutamento devem ser ajustadas em `src/game/modules/recruits.js`.
