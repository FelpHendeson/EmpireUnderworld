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

  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true
  });

  await app.register(authPlugin);
  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: '/api' });
  await app.register(saveRoutes, { prefix: '/api' });
  await app.register(gameRoutes, { prefix: '/api' });

  return app;
};

export default appInstance;
