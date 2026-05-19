import { criminalLocations, criminalOpponents } from './criminalEngine';

const DICE_SIDES = 20;

const outcomeLabels = {
  failure: 'Falha',
  tie: 'Empate',
  success: 'Sucesso',
  critical: 'Sucesso critico'
};

const statLabels = {
  stealth: 'Furtividade',
  intelligence: 'Inteligencia',
  analysis: 'Analise',
  attack: 'Ataque',
  defense: 'Defesa',
  speed: 'Velocidade',
  combatProficiency: 'Proeza'
};

const responseConfigs = {
  fight: {
    label: 'Lutar e vencer',
    description: 'Encarar quem te pegou e tentar abrir caminho na forca.',
    statWeights: {
      attack: 1.1,
      defense: 0.7,
      combatProficiency: 1,
      speed: 0.25
    },
    effects: {
      critical: { respect: 2, health: -2, xp: 14 },
      success: { respect: 1, health: -5, xp: 10 },
      tie: { health: -8, xp: 5 },
      failure: { respect: -2, health: -16, xp: 3 }
    },
    text: {
      critical: 'Voce dominou a briga rapido e saiu antes que a situacao virasse caso de policia.',
      success: 'Voce venceu a troca de golpes e escapou machucado, mas de pe.',
      tie: 'A luta travou. Ninguem venceu de verdade, mas voce conseguiu se afastar sem levar nada.',
      failure: 'Voce perdeu a briga e apanhou antes de conseguir escapar.'
    }
  },
  hitAndRun: {
    label: 'Bater e fugir',
    description: 'Criar uma abertura curta e correr antes que alguem organize a perseguicao.',
    statWeights: {
      speed: 1.15,
      attack: 0.65,
      stealth: 0.7,
      analysis: 0.35
    },
    effects: {
      critical: { cash: 8, respect: 1, health: -1, xp: 12 },
      success: { respect: 1, health: -3, xp: 8 },
      tie: { health: -5, xp: 4 },
      failure: { respect: -1, health: -11, xp: 3 }
    },
    text: {
      critical: 'Voce acertou o tempo perfeito, sumiu na multidao e ainda manteve parte do ganho.',
      success: 'Voce abriu espaco com um golpe rapido e fugiu.',
      tie: 'A corrida virou confusao. Voce escapou, mas perdeu a chance do furto.',
      failure: 'A fuga saiu atrasada. Te alcancaram e voce levou a pior antes de escapar.'
    }
  },
  breakFree: {
    label: 'Se soltar e correr',
    description: 'Usar reflexo, leitura do ambiente e furtividade para sumir sem confronto direto.',
    statWeights: {
      speed: 1,
      stealth: 1,
      analysis: 0.7,
      intelligence: 0.35
    },
    effects: {
      critical: { respect: 1, health: 0, xp: 12 },
      success: { health: -2, xp: 8 },
      tie: { health: -4, xp: 4 },
      failure: { respect: -1, health: -10, xp: 3 }
    },
    text: {
      critical: 'Voce leu a rota de fuga, se desvencilhou e desapareceu sem deixar rastro.',
      success: 'Voce escapou no reflexo e saiu quase ileso.',
      tie: 'Voce se soltou, mas precisou largar tudo para correr.',
      failure: 'Voce tentou correr, mas calculou mal o caminho e foi derrubado.'
    }
  },
  talkOut: {
    label: 'Conversar e enrolar',
    description: 'Improvisar uma historia, medir a reacao e tentar sair sem escalar para luta.',
    statWeights: {
      intelligence: 1.15,
      analysis: 1,
      stealth: 0.35
    },
    effects: {
      critical: { influence: 1, xp: 14 },
      success: { xp: 9 },
      tie: { respect: -1, xp: 4 },
      failure: { respect: -2, health: -6, xp: 2 }
    },
    text: {
      critical: 'Voce virou a conversa, confundiu os envolvidos e saiu com a imagem intacta.',
      success: 'Sua historia colou por tempo suficiente para voce sair andando.',
      tie: 'Ninguem acreditou totalmente, mas tambem nao conseguiram te segurar.',
      failure: 'A mentira caiu rapido e a situacao ficou pior antes da fuga.'
    }
  }
};

const randomEntry = (entries) => entries[Math.floor(Math.random() * entries.length)];

const toNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const rollDie = () => Math.floor(Math.random() * DICE_SIDES) + 1;

const getStatTotal = (player, statWeights) =>
  Object.entries(statWeights).reduce(
    (total, [stat, weight]) => total + toNumber(player[stat]) * weight,
    0
  );

const getOutcome = (total, thresholds) => {
  if (total < thresholds.minimum) return 'failure';
  if (total < thresholds.medium) return 'tie';
  if (total < thresholds.maximum) return 'success';
  return 'critical';
};

const getCrimeThresholds = ({ player, crime, context, challenge }) => {
  const level = Math.max(1, toNumber(player.level));
  const tier = Math.max(1, toNumber(crime.tier));
  const minimum =
    challenge.baseDifficulty + tier * 3 + context.location.pressure * 2 + Math.floor(level * 1.25);
  const medium = minimum + 6 + Math.floor(level / 2);
  const maximum = medium + 8 + tier;

  return { minimum, medium, maximum };
};

const getResponseThresholds = ({ player, event, option }) => {
  const level = Math.max(1, toNumber(player.level));
  const opponentPower = toNumber(event.context.opponent.threatPower);
  const pressure = toNumber(event.context.location.pressure);
  const minimum = 12 + opponentPower + pressure + Math.floor(level * 0.75);
  const medium = minimum + 6;
  const maximum = medium + 8 + (option.id === 'talkOut' ? 1 : 0);

  return { minimum, medium, maximum };
};

const rollCheck = ({ player, statWeights, thresholds, diceMultiplier }) => {
  const die = rollDie();
  const levelMultiplier = 1 + Math.max(1, toNumber(player.level)) * 0.06;
  const statTotal = getStatTotal(player, statWeights);
  const diceTotal = die * diceMultiplier * levelMultiplier;
  const total = Math.round((statTotal + diceTotal) * 10) / 10;
  const outcome = getOutcome(total, thresholds);

  return {
    die,
    sides: DICE_SIDES,
    diceMultiplier: Math.round(diceMultiplier * levelMultiplier * 100) / 100,
    statTotal: Math.round(statTotal * 10) / 10,
    total,
    thresholds,
    outcome,
    outcomeLabel: outcomeLabels[outcome],
    stats: Object.entries(statWeights).map(([id, weight]) => ({
      id,
      label: statLabels[id] ?? id,
      value: toNumber(player[id]),
      weight
    }))
  };
};

const resolveEntries = (ids, catalog, fallbackIds) => {
  const resolved = (ids ?? fallbackIds)
    .map((id) => catalog[id])
    .filter(Boolean);

  return resolved.length ? resolved : fallbackIds.map((id) => catalog[id]).filter(Boolean);
};

const getChallenge = (crime) => {
  const challenge = crime.challenge ?? {};

  return {
    title: crime.name,
    diceMultiplier: challenge.diceMultiplier ?? 1,
    baseDifficulty: challenge.baseDifficulty ?? 20 + Math.max(1, toNumber(crime.tier)) * 2,
    statWeights: challenge.statWeights ?? {
      attack: 0.6,
      speed: 0.6,
      intelligence: 0.5,
      analysis: 0.5
    },
    context: {
      locations: resolveEntries(challenge.locations, criminalLocations, [
        'shopping-popular',
        'loja-centro',
        'terminal'
      ]),
      opponents: resolveEntries(challenge.opponents, criminalOpponents, [
        'seguranca',
        'guarda',
        'rival-local'
      ])
    }
  };
};

const getAttemptEffects = (crime, outcome) => {
  if (outcome === 'critical') {
    return {
      cash: Math.round((crime.rewards.cash ?? 0) * 1.25),
      respect: (crime.rewards.respect ?? 0) + 1,
      xp: Math.round((crime.rewards.xp ?? 0) * 1.2)
    };
  }

  if (outcome === 'success') {
    return {
      cash: crime.rewards.cash ?? 0,
      respect: crime.rewards.respect ?? 0,
      xp: crime.rewards.xp ?? 0
    };
  }

  if (outcome === 'tie') {
    return {
      xp: Math.max(1, Math.round((crime.rewards.xp ?? 0) * 0.25))
    };
  }

  return {
    respect: -1,
    xp: Math.max(1, Math.round((crime.rewards.xp ?? 0) * 0.15))
  };
};

const getAttemptDescription = ({ crime, context, check }) => {
  if (check.outcome === 'critical') {
    return `Voce escolheu ${context.location.name}, leu o movimento e executou ${crime.name.toLowerCase()} com precisao. Ninguem percebeu a tempo.`;
  }

  if (check.outcome === 'success') {
    return `Voce furtou em ${context.location.name} e saiu ileso antes que a rotina do lugar reagisse.`;
  }

  if (check.outcome === 'tie') {
    return `Voce quase conseguiu furtar em ${context.location.name}, mas o tempo fechou. Melhor largar a oportunidade e sair sem chamar atencao.`;
  }

  return `Voce tentou furtar em ${context.location.name}, mas ${context.opponent.description}. A acao virou encontro.`;
};

const buildResponseOptions = () =>
  Object.entries(responseConfigs).map(([id, config]) => ({
    id,
    label: config.label,
    description: config.description,
    stats: Object.keys(config.statWeights).map((stat) => statLabels[stat] ?? stat)
  }));

export const resolveCrimeAttempt = ({ crime, player }) => {
  const challenge = getChallenge(crime);
  const context = {
    location: randomEntry(challenge.context.locations),
    opponent: randomEntry(challenge.context.opponents)
  };
  const thresholds = getCrimeThresholds({ player, crime, context, challenge });
  const check = rollCheck({
    player,
    statWeights: challenge.statWeights,
    thresholds,
    diceMultiplier: challenge.diceMultiplier
  });
  const effects = getAttemptEffects(crime, check.outcome);
  const resolved = check.outcome !== 'failure';

  return {
    outcome: check.outcome,
    effects,
    eventTags: [`crime:${crime.id}`, `outcome:${check.outcome}`],
    historyType: `rpg-${check.outcome}`,
    log:
      check.outcome === 'failure'
        ? `${crime.name}: falha no teste inicial. Encontro aberto.`
        : `${crime.name}: ${outcomeLabels[check.outcome]} no teste inicial.`,
    event: {
      id: `${crime.id}-${Date.now()}`,
      type: 'crime-resolution',
      crimeId: crime.id,
      crimeName: crime.name,
      title: resolved ? `${crime.name}: ${outcomeLabels[check.outcome]}` : `${crime.name}: alguem te pegou`,
      description: getAttemptDescription({ crime, context, check }),
      context,
      openingCheck: check,
      phase: resolved ? 'resolved' : 'caught',
      options: resolved ? [] : buildResponseOptions(),
      result: resolved
        ? {
            title: outcomeLabels[check.outcome],
            description: getAttemptDescription({ crime, context, check }),
            effects
          }
        : null
    }
  };
};

export const resolveEventResponse = ({ event, optionId, player }) => {
  const config = responseConfigs[optionId];
  if (!event || !config) {
    return null;
  }

  const option = { id: optionId, ...config };
  const thresholds = getResponseThresholds({ player, event, option });
  const responseCheck = rollCheck({
    player,
    statWeights: config.statWeights,
    thresholds,
    diceMultiplier: 1.05
  });
  const effects = config.effects[responseCheck.outcome] ?? {};
  const description = config.text[responseCheck.outcome];

  return {
    event: {
      ...event,
      title: `${config.label}: ${outcomeLabels[responseCheck.outcome]}`,
      description,
      phase: 'resolved',
      options: [],
      responseCheck,
      result: {
        title: outcomeLabels[responseCheck.outcome],
        description,
        effects
      }
    },
    effects,
    log: `${config.label}: ${outcomeLabels[responseCheck.outcome]}. ${description}`
  };
};

export const actionOutcomeLabels = outcomeLabels;
