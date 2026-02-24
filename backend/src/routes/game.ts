import type { FastifyPluginAsync } from 'fastify';
import { SaveGameModel } from '../models/SaveGame.js';

export const gameRoutes: FastifyPluginAsync = async (app) => {
  app.get('/game/config', async () => ({
    tick: 'manual',
    resources: ['cash', 'influence', 'respect'],
    systems: ['map', 'crime', 'recruitment', 'promotion', 'takeover', 'saves']
  }));

  app.get('/game/leaderboard', async (_request, reply) => {
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
