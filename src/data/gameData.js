import { nanoid } from 'nanoid';

const villainRoles = [
  {
    title: 'Contador',
    buff: {
      type: 'profit',
      value: 0.2,
      description: 'Aumenta o lucro dos negócios em 20%.'
    }
  },
  {
    title: 'Psicopata',
    buff: {
      type: 'attack',
      value: 0.25,
      description: 'Aumenta a força de ataque em 25%.'
    }
  },
  {
    title: 'Diplomata',
    buff: {
      type: 'influence',
      value: 0.15,
      description: 'Melhora ganhos de influência política em 15%.'
    }
  },
  {
    title: 'Sabotador',
    buff: {
      type: 'defense',
      value: 0.2,
      description: 'Reduz o poder defensivo rival em 20%.'
    }
  }
];

const villainRarities = ['Comum', 'Raro', 'Épico', 'Lendário'];
const firstNames = ['Luca', 'Valentina', 'Sergio', 'Isabella', 'Rafael', 'Bianca'];
const lastNames = ['Moretti', 'Santoro', 'Rossi', 'Costa', 'Bianchi', 'Ferraz'];

const businesses = [
  {
    id: 'casino',
    name: 'Cassino Eclipse',
    income: { cash: 120, respect: 3 },
    heat: 4
  },
  {
    id: 'laundering',
    name: 'Lavagem de Dinheiro',
    income: { cash: 80, influence: 2 },
    heat: 2
  },
  {
    id: 'intel',
    name: 'Tráfico de Informação',
    income: { cash: 60, influence: 3, respect: 1 },
    heat: 3
  }
];

const troops = [
  {
    id: 'capangas',
    name: 'Capangas',
    type: 'Básico',
    description: 'Carne para canhão e ocupação de território.',
    attack: 8,
    defense: 5,
    upkeep: 5
  },
  {
    id: 'segurancas',
    name: 'Seguranças',
    type: 'Especialista',
    description: 'Protegem negócios e resistem a raids.',
    attack: 6,
    defense: 10,
    upkeep: 8
  },
  {
    id: 'hackers',
    name: 'Hackers',
    type: 'Especialista',
    description: 'Infiltram sistemas e aumentam influência.',
    attack: 7,
    defense: 6,
    upkeep: 9
  },
  {
    id: 'batedores',
    name: 'Batedores',
    type: 'Especialista',
    description: 'Reconhecimento e bônus de ataque em raids.',
    attack: 9,
    defense: 4,
    upkeep: 6
  }
];

const territories = [
  {
    id: 'north',
    name: 'Distrito Ártico',
    defense: 22,
    businesses: ['casino', 'intel']
  },
  {
    id: 'central',
    name: 'Cinturão Central',
    defense: 18,
    businesses: ['laundering']
  },
  {
    id: 'docks',
    name: 'Docas Prismáticas',
    defense: 26,
    businesses: ['intel', 'laundering']
  },
  {
    id: 'uptown',
    name: 'Zona Alta',
    defense: 30,
    businesses: ['casino']
  }
];

const createVillain = () => {
  const role = villainRoles[Math.floor(Math.random() * villainRoles.length)];
  return {
    id: nanoid(),
    name: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
    rarity: villainRarities[Math.floor(Math.random() * villainRarities.length)],
    role: role.title,
    buff: role.buff
  };
};

export const createInitialState = () => {
  const villains = Array.from({ length: 4 }, () => createVillain());
  return {
    resources: {
      cash: 2500,
      influence: 35,
      respect: 20
    },
    territories,
    businesses,
    troops,
    villains,
    activityLog: [
      'O império nasceu na madrugada chuvosa da Cidade Neon.',
      'Capangas patrulham o Distrito Ártico em busca de rivais.'
    ],
    activeRaid: {
      troopId: 'capangas',
      villainId: villains[0]?.id ?? '',
      targetTerritoryId: 'central'
    }
  };
};

const sumIncome = (businessIds) =>
  businessIds.reduce(
    (total, businessId) => {
      const business = businesses.find((item) => item.id === businessId);
      if (!business) {
        return total;
      }
      return {
        cash: total.cash + (business.income.cash ?? 0),
        influence: total.influence + (business.income.influence ?? 0),
        respect: total.respect + (business.income.respect ?? 0)
      };
    },
    { cash: 0, influence: 0, respect: 0 }
  );

export const calculatePassiveIncome = (territoryList) =>
  territoryList.reduce(
    (total, territory) => {
      const income = sumIncome(territory.businesses);
      return {
        cash: total.cash + income.cash,
        influence: total.influence + income.influence,
        respect: total.respect + income.respect
      };
    },
    { cash: 0, influence: 0, respect: 0 }
  );

export const calculateRaidOutcome = ({ troop, villain, territory }) => {
  const baseAttack = troop.attack;
  const attackBuff = villain?.buff?.type === 'attack' ? villain.buff.value : 0;
  const defenseDebuff = villain?.buff?.type === 'defense' ? villain.buff.value : 0;
  const effectiveAttack = baseAttack * (1 + attackBuff);
  const effectiveDefense = territory.defense * (1 - defenseDebuff);
  const winChance = Math.min(0.9, Math.max(0.1, effectiveAttack / (effectiveDefense + 1)));
  const roll = Math.random();
  return {
    winChance,
    victory: roll <= winChance,
    roll
  };
};
