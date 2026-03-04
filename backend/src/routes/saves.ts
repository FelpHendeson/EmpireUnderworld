import type { FastifyPluginAsync } from 'fastify';
import { SaveGameModel } from '../models/SaveGame.js';

const ALLOWED_SLOTS = new Set(['slot-1', 'slot-2', 'slot-3']);
const MAX_STATE_BYTES = 512_000;

const toSafeNumber = (value: unknown, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const toSafeNonNegativeNumber = (value: unknown, fallback = 0) =>
  Math.max(0, toSafeNumber(value, fallback));

const normalizeSlot = (slot: string) => slot.trim().toLowerCase();

const ensureValidSlot = (slot: string) => ALLOWED_SLOTS.has(slot);

const normalizeStatePayload = (value: unknown): Record<string, unknown> | null => {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }

  return null;
};

const getPayloadByteSize = (payload: Record<string, unknown>) => {
  try {
    return Buffer.byteLength(JSON.stringify(payload), 'utf8');
  } catch {
    return MAX_STATE_BYTES + 1;
  }
};

const normalizeResources = (input: unknown) => {
  const resources = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};

  return {
    cash: toSafeNonNegativeNumber(resources.cash),
    influence: toSafeNonNegativeNumber(resources.influence),
    respect: toSafeNonNegativeNumber(resources.respect)
  };
};

const toSummary = (save: any) => ({
  slot: save.slot,
  name: save.name,
  day: save.day,
  resources: save.resources,
  stateVersion: save.stateVersion ?? 1,
  meta: save.meta ?? {},
  updatedAt: save.updatedAt
});

const extractStateMeta = (state: Record<string, unknown>) => {
  const player = (state.player ?? {}) as Record<string, unknown>;
  const objectives = Array.isArray(state.objectives) ? state.objectives : [];
  const crimeHistory = Array.isArray(state.crimeHistory) ? state.crimeHistory : [];
  const seenStoryEntries = Array.isArray(state.seenStoryEntries) ? state.seenStoryEntries : [];

  const objectivesCompleted = objectives.filter((objective) => {
    if (!objective || typeof objective !== 'object') return false;
    return Boolean((objective as Record<string, unknown>).completed);
  }).length;

  const stateVersion = Math.max(1, Math.floor(toSafeNumber(state.stateVersion, 1)));
  const playerLevel = Math.max(1, Math.floor(toSafeNumber(player.level, 1)));
  const playerXp = Math.floor(toSafeNonNegativeNumber(player.xp));

  return {
    stateVersion,
    meta: {
      playerLevel,
      playerXp,
      crimesCommitted: crimeHistory.length,
      objectivesCompleted,
      lastStoryEntry:
        typeof seenStoryEntries[seenStoryEntries.length - 1] === 'string'
          ? (seenStoryEntries[seenStoryEntries.length - 1] as string).slice(0, 160)
          : ''
    }
  };
};

export const saveRoutes: FastifyPluginAsync = async (app) => {
  app.get('/saves', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.sub;
    const saves = await SaveGameModel.find({ userId }).sort({ updatedAt: -1 }).lean();
    return reply.send({
      saves: saves.filter((save) => ensureValidSlot(save.slot)).map(toSummary)
    });
  });

  app.get('/saves/:slot', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.sub;
    const params = request.params as { slot: string };
    const slot = normalizeSlot(params.slot);

    if (!ensureValidSlot(slot)) {
      return reply.code(400).send({ message: 'invalid slot' });
    }

    const save = await SaveGameModel.findOne({ userId, slot }).lean();
    if (!save) {
      return reply.code(404).send({ message: 'save not found' });
    }

    return reply.send({ save });
  });

  app.put('/saves/:slot', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.sub;
    const params = request.params as { slot: string };
    const slot = normalizeSlot(params.slot);
    const body = request.body as {
      name?: string;
      state?: Record<string, unknown> | string;
    };

    if (!ensureValidSlot(slot)) {
      return reply.code(400).send({ message: 'invalid slot' });
    }

    const normalizedState = normalizeStatePayload(body.state);

    if (!normalizedState) {
      return reply.code(400).send({ message: 'state object is required' });
    }

    const statePayloadBytes = getPayloadByteSize(normalizedState);
    if (statePayloadBytes > MAX_STATE_BYTES) {
      return reply.code(413).send({ message: `state payload exceeds ${MAX_STATE_BYTES} bytes` });
    }

    // Alguns campos de resumo sao espelhados para busca/listagem rapida.
    const safeState = normalizedState;
    const day = Math.max(1, Math.floor(toSafeNumber((safeState as any).day, 1)));
    const resources = normalizeResources((safeState as any).resources);
    const { stateVersion, meta } = extractStateMeta(safeState);

    const save = await SaveGameModel.findOneAndUpdate(
      { userId, slot },
      {
        slot,
        name: body.name?.trim() || `Save ${slot}`,
        day,
        resources,
        stateVersion,
        meta,
        state: safeState
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return reply.send({ save: toSummary(save) });
  });

  app.delete('/saves/:slot', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.sub;
    const params = request.params as { slot: string };
    const slot = normalizeSlot(params.slot);

    if (!ensureValidSlot(slot)) {
      return reply.code(400).send({ message: 'invalid slot' });
    }

    const deleted = await SaveGameModel.findOneAndDelete({ userId, slot }).lean();
    if (!deleted) {
      return reply.code(404).send({ message: 'save not found' });
    }

    return reply.code(204).send();
  });
};
