import type { FastifyPluginAsync } from 'fastify';
import { SaveGameModel } from '../models/SaveGame.js';

const SLOT_IDS = ['slot-1', 'slot-2', 'slot-3'];
const GAME_STATE_VERSION = 4;

export const gameRoutes: FastifyPluginAsync = async (app) => {
  // Endpoint leve para o frontend descobrir modulos e recursos disponiveis.
  app.get('/game/config', async () => ({
    tick: 'manual',
    stateVersion: GAME_STATE_VERSION,
    saveSlots: SLOT_IDS,
    resources: ['cash', 'influence', 'respect'],
    systems: [
      'map',
      'crime',
      'dynamic-actions',
      'recruitment',
      'promotion',
      'takeover',
      'missions',
      'saves'
    ]
  }));

  app.get('/game/leaderboard', async (_request, reply) => {
    // Ranking por usuario consolidando o melhor progresso entre seus saves.
    const leaderboard = await SaveGameModel.aggregate([
      { $match: { slot: { $in: SLOT_IDS } } },
      { $sort: { updatedAt: -1 } },
      {
        $group: {
          _id: '$userId',
          totalCash: { $max: '$resources.cash' },
          totalRespect: { $max: '$resources.respect' },
          day: { $max: '$day' },
          updatedAt: { $max: '$updatedAt' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          username: { $ifNull: ['$user.username', 'Unknown'] },
          totalCash: 1,
          totalRespect: 1,
          day: 1,
          updatedAt: 1
        }
      },
      { $sort: { totalCash: -1, totalRespect: -1, day: -1, updatedAt: -1 } },
      { $limit: 10 }
    ]);

    return reply.send({ leaderboard });
  });
};
