import type { FastifyPluginAsync } from 'fastify';
import { SaveGameModel } from '../models/SaveGame.js';

export const gameRoutes: FastifyPluginAsync = async (app) => {
  // Endpoint leve para o frontend descobrir modulos e recursos disponiveis.
  app.get('/game/config', async () => ({
    tick: 'manual',
    resources: ['cash', 'influence', 'respect'],
    systems: ['map', 'crime', 'recruitment', 'promotion', 'takeover', 'saves']
  }));

  app.get('/game/leaderboard', async (_request, reply) => {
    // Ranking por usuario consolidando o melhor progresso entre seus saves.
    const leaderboard = await SaveGameModel.aggregate([
      { $sort: { updatedAt: -1 } },
      {
        $group: {
          _id: '$userId',
          totalCash: { $max: '$resources.cash' },
          totalRespect: { $max: '$resources.respect' },
          day: { $max: '$day' }
        }
      },
      { $sort: { totalCash: -1, totalRespect: -1, day: -1 } },
      { $limit: 10 }
    ]);

    return reply.send({ leaderboard });
  });
};
