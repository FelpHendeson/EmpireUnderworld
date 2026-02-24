# Backend API - Empire Underworld

## Setup rapido
```bash
cp .env.example .env
npm install
npm run dev
```

## Variaveis
- `PORT`
- `HOST`
- `CORS_ORIGIN`
- `JWT_SECRET`
- `MONGODB_URI`

## Rotas
- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/saves`
- `GET /api/saves/:slot`
- `PUT /api/saves/:slot`
- `DELETE /api/saves/:slot`
- `GET /api/game/config`
- `GET /api/game/leaderboard`
