# Empire Underworld

Monorepo de jogo web (frontend + backend) para simulacao e gestao de organizacao criminosa.

## Estrutura
- `frontend/`: cliente React + Vite + Tailwind, com loop de jogo e UI.
- `backend/`: API Fastify + MongoDB para auth, usuarios e cloud saves.
- `DEV.md`: documentacao tecnica detalhada da arquitetura e fluxo.

## Requisitos
- Node.js 20+
- MongoDB Atlas (ou instancia MongoDB acessivel)

## Setup
1. Instale dependencias na raiz:
```bash
npm install
```
2. Configure backend:
```bash
cp backend/.env.example backend/.env
```
3. Ajuste `backend/.env`:
- `MONGODB_URI`: mesma URL do seu cluster, trocando apenas o nome do database para `empire_underworld`.
- `JWT_SECRET`: chave de assinatura de tokens.
- `CORS_ORIGIN`: URL do frontend.
4. (Opcional) configure frontend:
```bash
cp frontend/.env.example frontend/.env
```

## Rodando
Subir frontend + backend juntos:
```bash
npm run dev
```

Comandos separados:
```bash
npm run dev:frontend
npm run dev:backend
```

Build:
```bash
npm run build
```

## Endpoints principais
Base URL local: `http://localhost:3333/api`

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `GET /saves`
- `GET /saves/:slot`
- `PUT /saves/:slot`
- `DELETE /saves/:slot`
- `GET /game/config`
- `GET /game/leaderboard`

## Fluxo de jogo integrado com API
- Front continua com estado central no `useReducer`.
- Login/registro gera token JWT.
- Token fica persistido em `localStorage`.
- Save em nuvem envia snapshot do estado atual para `/saves/:slot`.
- Load em nuvem hidrata o reducer com snapshot vindo da API.

## Observacao sobre Auth.zip
O template de API foi usado como base (Fastify + TS). Na copia recebida do `Auth.zip`, nao havia URL MongoDB explicita em arquivos visiveis/historico Git extraido, apenas placeholder comentado. O `.env.example` deste projeto ja esta preparado para voce inserir a URL correta do cluster.
