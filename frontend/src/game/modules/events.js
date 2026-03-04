import eventsConfig from '../../content/events.json';

const pickRandom = (list) => list[Math.floor(Math.random() * list.length)];

export const resolveCrimeEvent = (crime) => {
  const eventConfig = eventsConfig.find((entry) => entry.crimeId === crime.id);

  if (!eventConfig) {
    return {
      text: `O ato ${crime.name} nao gerou eventos extras.`,
      effects: { cash: 0, respect: 0, health: 0 },
      eventTags: []
    };
  }

  const targetType = pickRandom(eventConfig.types);
  const consequence = pickRandom(eventConfig.consequences);

  return {
    text: `[${targetType}] ${consequence.text}`,
    effects: {
      cash: consequence.effects.cash ?? 0,
      respect: consequence.effects.respect ?? 0,
      health: consequence.effects.health ?? 0
    },
    type: consequence.type,
    eventTags: consequence.eventTags ?? []
  };
};