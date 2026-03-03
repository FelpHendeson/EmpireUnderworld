import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './config/env.js';
import { authPlugin } from './plugins/auth.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { saveRoutes } from './routes/saves.js';
import { gameRoutes } from './routes/game.js';

const appInstance = async () => {
  const app = Fastify({ logger: true });

  // CORS exposto para o host do frontend configurado em ambiente.
  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true
  });

  // O plugin de auth precisa ser registrado antes das rotas protegidas.
  await app.register(authPlugin);
  await app.register(healthRoutes);
  // Todas as rotas de dominio ficam sob /api.
  await app.register(authRoutes, { prefix: '/api' });
  await app.register(saveRoutes, { prefix: '/api' });
  await app.register(gameRoutes, { prefix: '/api' });

  return app;
};

export default appInstance;
