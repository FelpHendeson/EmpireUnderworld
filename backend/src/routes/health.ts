import type { FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => ({ ok: true, service: 'underworld-api' }));
  app.get('/health', async () => ({ status: 'ok' }));
};
