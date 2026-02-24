# DEV Guide - Empire Underworld

## 1. Arquitetura

Projeto em monorepo com separacao clara de responsabilidades:
- `frontend`: gameplay, UI, estado da sessao de jogo.
- `backend`: persistencia, autenticacao, API de suporte ao jogo.

Essa separacao permite evolucao independente de UI e servicos, sem acoplar regras de dominio ao cliente.

## 2. Frontend (`frontend/`)

### 2.1 Estado principal
O jogo continua com fonte unica de estado via `useReducer` em `frontend/src/App.jsx`.

Acoes principais:
- `ADVANCE_DAY`
- `SET_LOCATION`
- `ACTION_COMMIT_CRIME`
- `ACTION_BUY_ITEM`
- `ACTION_RECRUIT`
- `ACTION_PROMOTE`
- `ACTION_TAKEOVER`
- `TOGGLE_INFO`
- `HYDRATE_STATE` (nova: reidrata estado vindo da API)

### 2.2 Integracao com API
Cliente HTTP em `frontend/src/services/api.js`.

Modulos:
- `authApi`: `register`, `login`, `me`
- `saveApi`: `list`, `load`, `save`, `remove`

Token JWT:
- armazenado em `localStorage` (`underworld_auth_token`)
- enviado no header `Authorization: Bearer <token>`

### 2.3 Cloud Save
No topo da tela principal:
- formulario de registro/login
- status de usuario autenticado
- save por slot
- listagem de slots remotos
- carregar/apagar save

Persistencia enviada ao backend:
- snapshot completo do estado do jogo (sem campos transitivos de UI)

## 3. Backend (`backend/`)

Baseado no template cru de API do `Auth.zip` (Fastify + TypeScript), expandido para dominio de jogo.

### 3.1 Stack
- Fastify
- Mongoose
- JWT (`@fastify/jwt`)
- CORS (`@fastify/cors`)
- bcryptjs

### 3.2 Organizacao
- `src/app.ts`: bootstrap da aplicacao e registro de plugins/rotas
- `src/server.ts`: start do servidor + conexao Mongo
- `src/config/env.ts`: leitura/validacao de variaveis de ambiente
- `src/lib/mongo.ts`: conexao com MongoDB
- `src/plugins/auth.ts`: plugin JWT + `app.authenticate`
- `src/models/User.ts`: modelo de usuario
- `src/models/SaveGame.ts`: modelo de save por slot
- `src/routes/auth.ts`: cadastro/login/me
- `src/routes/saves.ts`: CRUD de saves
- `src/routes/game.ts`: config publica + leaderboard
- `src/routes/health.ts`: healthcheck

### 3.3 Modelos
`User`
- `email` (unico)
- `username` (unico)
- `passwordHash`
- `createdAt`, `updatedAt`

`SaveGame`
- `userId`
- `slot`
- `name`
- `day`
- `resources` (`cash`, `influence`, `respect`)
- `state` (snapshot completo do jogo)
- `createdAt`, `updatedAt`
- indice unico: `{ userId, slot }`

### 3.4 Endpoints
Auth:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

Saves:
- `GET /api/saves`
- `GET /api/saves/:slot`
- `PUT /api/saves/:slot`
- `DELETE /api/saves/:slot`

Game support:
- `GET /api/game/config`
- `GET /api/game/leaderboard`

Infra:
- `GET /`
- `GET /health`

### 3.5 Seguranca aplicada
- senha hasheada com bcrypt
- endpoints de save protegidos por JWT
- fallback de erro 401 em autenticacao
- CORS configuravel por env

## 4. Variaveis de ambiente

Arquivo base: `backend/.env.example`

Obrigatorias:
- `JWT_SECRET`
- `MONGODB_URI`

O backend falha no startup se variaveis obrigatorias nao existirem.

## 5. Workspace scripts (raiz)

Scripts no `package.json` da raiz:
- `npm run dev`: sobe frontend + backend com `concurrently`
- `npm run dev:frontend`
- `npm run dev:backend`
- `npm run build`

## 6. Decisoes de design

- Reducer mantido no frontend para gameplay responsivo offline-first.
- Persistencia via snapshots para reduzir acoplamento entre schema de jogo e banco.
- API focada em auth/save, permitindo evoluir para inventario remoto, eventos sazonais, marketplace e ranking persistente.

## 7. Proximos passos recomendados

1. Criar refresh token e expiracao curta para access token.
2. Adicionar versao de schema no snapshot (`stateVersion`) para migracoes.
3. Implementar limites de tamanho e validacao de payload de save com schema.
4. Criar testes de rotas (`auth` e `saves`) e testes de reducer no frontend.
5. Introduzir fila/event bus para eventos globais (policia, traicao, guerras entre faccoes).
