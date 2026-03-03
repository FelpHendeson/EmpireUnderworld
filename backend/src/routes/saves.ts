import type { FastifyPluginAsync } from 'fastify';
import { SaveGameModel } from '../models/SaveGame.js';

const toSummary = (save: any) => ({
  slot: save.slot,
  name: save.name,
  day: save.day,
  resources: save.resources,
  updatedAt: save.updatedAt
});

export const saveRoutes: FastifyPluginAsync = async (app) => {
  app.get('/saves', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.sub;
    const saves = await SaveGameModel.find({ userId }).sort({ updatedAt: -1 }).lean();
    return reply.send({ saves: saves.map(toSummary) });
  });

  app.get('/saves/:slot', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.sub;
    const params = request.params as { slot: string };

    const save = await SaveGameModel.findOne({ userId, slot: params.slot }).lean();
    if (!save) {
      return reply.code(404).send({ message: 'save not found' });
    }

    return reply.send({ save });
  });

  app.put('/saves/:slot', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.sub;
    const params = request.params as { slot: string };
    const body = request.body as {
      name?: string;
      state?: Record<string, unknown> | string;
    };
    let normalizedState: Record<string, unknown> | null = null;

    // Aceita state como objeto ou string JSON para facilitar clientes diferentes.
    if (body.state && typeof body.state === 'object') {
      normalizedState = body.state as Record<string, unknown>;
    }

    if (body.state && typeof body.state === 'string') {
      try {
        const parsed = JSON.parse(body.state);
        if (parsed && typeof parsed === 'object') {
          normalizedState = parsed as Record<string, unknown>;
        }
      } catch {
        normalizedState = null;
      }
    }

    if (!normalizedState) {
      return reply.code(400).send({ message: 'state object is required' });
    }

    // Alguns campos de resumo sao espelhados para busca/listagem rapida.
    const safeState = normalizedState;
    const day = Number((safeState as any).day ?? 1);
    const resources = ((safeState as any).resources ?? {
      cash: 0,
      influence: 0,
      respect: 0
    }) as { cash: number; influence: number; respect: number };

    const save = await SaveGameModel.findOneAndUpdate(
      { userId, slot: params.slot },
      {
        slot: params.slot,
        name: body.name?.trim() || `Save ${params.slot}`,
        day,
        resources,
        state: safeState
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return reply.send({ save: toSummary(save) });
  });

  app.delete('/saves/:slot', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.sub;
    const params = request.params as { slot: string };

    const deleted = await SaveGameModel.findOneAndDelete({ userId, slot: params.slot }).lean();
    if (!deleted) {
      return reply.code(404).send({ message: 'save not found' });
    }

    return reply.code(204).send();
  });
};
