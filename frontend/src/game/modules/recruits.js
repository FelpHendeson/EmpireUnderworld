import { nanoid } from 'nanoid';

const RECRUIT_NAME_POOL = [
  'Nina Docks',
  'Rafa Cais',
  'Ivo Cobalto',
  'Lia Volpi',
  'Breno Norte',
  'Zeca Veloz',
  'Mara Ponte',
  'Caio Marfim',
  'Duda Queda',
  'Teo Marujo',
  'Nanda Rua 8',
  'Juca Zero'
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const pickAvailableName = (takenNames) => {
  const available = RECRUIT_NAME_POOL.filter((name) => !takenNames.has(name));

  if (available.length === 0) {
    return `Contato ${nanoid(5)}`;
  }

  return available[randomInt(0, available.length - 1)];
};

const createRecruitCandidate = (day, takenNames) => {
  const name = pickAvailableName(takenNames);
  takenNames.add(name);

  const scaledDay = Math.max(1, day);
  const cashCost = randomInt(45 + scaledDay * 3, 95 + scaledDay * 5);
  const respectCost = randomInt(1, clamp(1 + Math.floor(scaledDay / 6), 1, 5));
  const entryType = Math.random() < 0.3 ? 'respect' : 'cash';
  const xp = randomInt(0, clamp(scaledDay * 12, 10, 220));

  return {
    id: nanoid(),
    name,
    rank: 'Recruta',
    xp,
    level: 1 + Math.floor(xp / 50),
    entry: {
      type: entryType,
      value: entryType === 'cash' ? cashCost : respectCost
    }
  };
};

export const createRecruitPool = ({ day = 1, size = 3, takenNames = [] } = {}) => {
  const resolvedSize = Math.max(0, size);
  const usedNames = new Set(takenNames);

  return Array.from({ length: resolvedSize }, () => createRecruitCandidate(day, usedNames));
};

// Mantem o ritmo de aparicao de contatos para evitar dead-end na mecanica de recrutamento.
export const refillRecruitPoolForDay = ({ recruitPool, day, members }) => {
  const currentPool = Array.isArray(recruitPool) ? recruitPool : [];

  if (day % 2 !== 0) {
    return {
      nextPool: currentPool,
      newCandidates: []
    };
  }

  const targetPoolSize = day >= 12 ? 5 : 4;
  const missing = Math.max(0, targetPoolSize - currentPool.length);
  if (!missing) {
    return {
      nextPool: currentPool,
      newCandidates: []
    };
  }

  const takenNames = [
    ...(Array.isArray(members) ? members : []).map((member) => member.name),
    ...currentPool.map((candidate) => candidate.name)
  ];

  const newCandidates = createRecruitPool({
    day,
    size: Math.min(2, missing),
    takenNames
  });

  return {
    nextPool: [...currentPool, ...newCandidates],
    newCandidates
  };
};
