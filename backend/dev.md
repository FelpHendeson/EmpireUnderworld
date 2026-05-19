# Dev Guide - Backend (Underworld API)

## Visao geral
Backend em `Fastify + MongoDB (Mongoose)` com autenticacao JWT e persistencia de saves por slot.

Fluxo principal:
1. Usuario registra/faz login em `/api/auth/*`.
2. Frontend recebe JWT e envia `Authorization: Bearer <token>`.
3. Rotas protegidas (`/api/saves/*`) validam token via `app.authenticate`.
4. Estado do jogo e salvo em `SaveGame.state` e alguns campos sao espelhados (`day`, `resources`) para consultas rapidas.

## Estrutura
- `src/server.ts`: bootstrap do servidor e conexao Mongo.
- `src/app.ts`: fabrica da instancia Fastify e registro de plugins/rotas.
- `src/config/env.ts`: validacao de variaveis obrigatorias de ambiente.
- `src/lib/mongo.ts`: connect/disconnect do Mongoose.
- `src/plugins/auth.ts`: registro do JWT e decorator `authenticate`.
- `src/models/User.ts`: schema de usuario (email, username, passwordHash).
- `src/models/SaveGame.ts`: schema de save + indice unico `{ userId, slot }`.
- `src/routes/health.ts`: probes de vida.
- `src/routes/auth.ts`: register/login/me.
- `src/routes/saves.ts`: CRUD de saves por slot autenticado.
- `src/routes/game.ts`: config do jogo e leaderboard agregado.

## Ambiente
Arquivo `.env` (base em `.env.example`):
- `PORT` (default `3333`)
- `HOST` (default `0.0.0.0`)
- `CORS_ORIGIN` (default `http://localhost:5173`)
- `JWT_SECRET` (obrigatoria)
- `JWT_EXPIRES_IN` (default `1h`)
- `MONGODB_URI` (obrigatoria)

Sem `JWT_SECRET` ou `MONGODB_URI`, a aplicacao falha no boot.

## Endpoints
Publicos:
- `GET /` -> `{ ok: true, service: 'underworld-api' }`
- `GET /health` -> `{ status: 'ok' }`
- `POST /api/auth/register`
- `POST /api/auth/login`

Protegidos (JWT):
- `GET /api/auth/me`
- `GET /api/saves`
- `GET /api/saves/:slot`
- `PUT /api/saves/:slot`
- `DELETE /api/saves/:slot`

Game metadata:
- `GET /api/game/config`
- `GET /api/game/leaderboard`

## Contratos relevantes
### Register/Login
Retorno:
- `token`: JWT
- `user`: `{ id, email, username }`

Token:
- emitido com expiracao configurada por `JWT_EXPIRES_IN`.

Senha:
- hash com `bcrypt` (`salt rounds = 10`)

### Saves
`PUT /api/saves/:slot` aceita:
- `name?: string`
- `state: object | json-string`

Normalizacao no backend:
- slots aceitos: `slot-1`, `slot-2`, `slot-3` (fora disso retorna `400 invalid slot`).
- se `state` vier string, tenta `JSON.parse`.
- se invalido, responde `400 state object is required`.
- payload de `state` acima de `512000` bytes retorna `413`.
- espelha `day` e `resources` de `state` para facilitar listagem/ranking.
- faz sanitizacao numerica de `day/resources/meta` para evitar `NaN`/valores negativos.

### Game metadata
- `/api/game/config` informa `stateVersion` atual e `saveSlots` suportados.
- `/api/game/leaderboard` agrega por melhor progresso e devolve `username` junto dos totais.

## Regras de dados
- Usuario unico por `email` e `username`.
- Save unico por `(userId, slot)`.
- `findOneAndUpdate(..., { upsert: true })` garante create/update no mesmo endpoint de save.

## Comandos
- `npm run dev`: desenvolvimento (`tsx watch`).
- `npm run typecheck`: TypeScript sem emitir build (`tsc --noEmit`).
- `npm run build`: build com `tsup` para `dist`.
- `npm run start`: roda build.
- `npm run test`: testes (`vitest run`).

## Manutencao e extensao
- Nova rota protegida: adicionar `{ preHandler: [app.authenticate] }`.
- Novo dado calculado em ranking: ajustar pipeline em `src/routes/game.ts`.
- Alteracao de schema: atualizar model Mongoose e validar compatibilidade com saves antigos.
- Para aumentar seguranca, considerar `refresh tokens` e expiracao curta do JWT.
