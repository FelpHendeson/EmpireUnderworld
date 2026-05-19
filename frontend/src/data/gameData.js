import { nanoid } from 'nanoid';
import { createInitialMissions } from '../game/modules/missions';
import {
  computePassiveBonuses,
  createInitialSkillLevels,
  getSkillsView
} from '../game/modules/skills';
import { getPrologueModal } from '../game/modules/story';
import { createRecruitPool } from '../game/modules/recruits';
import { createInitialNpcNetwork, crimeCatalog } from '../game/modules/criminalEngine';

// Estados de progresso territorial no mapa.
export const presenceStates = ['Inexistente', 'Infiltrado', 'Disputado', 'Dominado'];

// Ordem oficial de progressao de patente.
export const rankOrder = ['Recruta', 'Soldado', 'General', 'Elite'];

// Regras por patente: XP minimo, custo de promocao e poder base em combate.
export const rankData = {
  Recruta: {
    minXp: 0,
    promoteCost: { cash: 40, respect: 0 },
    power: 1
  },
  Soldado: {
    minXp: 60,
    promoteCost: { cash: 120, respect: 2 },
    power: 2
  },
  General: {
    minXp: 160,
    promoteCost: { cash: 260, respect: 6 },
    power: 4
  },
  Elite: {
    minXp: 320,
    promoteCost: { cash: 520, respect: 12 },
    power: 6
  }
};

// O jogador escolhe a origem no inicio para gerar identidade e replayabilidade.
export const backstoryOptions = [
  {
    id: 'orfao-sobrevivente',
    title: 'Orfao sobrevivente',
    summary: 'Perdeu a familia cedo e aprendeu a sobreviver nas ruas.',
    statBonus: {
      health: 18,
      attack: 1,
      defense: 2,
      combatProficiency: 1,
      speed: 1,
      stealth: 2,
      intelligence: 0,
      analysis: 2
    },
    startingSkillIds: ['punch']
  },
  {
    id: 'rebeldia-inata',
    title: 'Rebeldia inata',
    summary: 'Nunca aceitou autoridade e entrou no crime por escolha.',
    statBonus: {
      health: 8,
      attack: 3,
      defense: 0,
      combatProficiency: 2,
      speed: 1,
      stealth: 1,
      intelligence: 1,
      analysis: 0
    },
    startingSkillIds: ['punch']
  },
  {
    id: 'filho-da-rua',
    title: 'Filho da rua',
    summary: 'Criado por uma rede informal de rua, com talento social.',
    statBonus: {
      health: 12,
      attack: 1,
      defense: 1,
      combatProficiency: 3,
      speed: 2,
      stealth: 2,
      intelligence: 2,
      analysis: 1
    },
    startingSkillIds: ['punch']
  }
];

// Catalogo de crimes executaveis pelo jogador.
export const crimes = crimeCatalog;

// Itens disponiveis no mercado negro e efeitos imediatos.
export const blackMarketItems = [
  {
    id: 'faca',
    name: 'Faca',
    type: 'arma-branca',
    price: 70,
    effects: { respect: 1 }
  },
  {
    id: 'porrete',
    name: 'Porrete',
    type: 'arma-improvisada',
    price: 45,
    effects: {}
  },
  {
    id: 'garrafa-quebrada',
    name: 'Garrafa quebrada',
    type: 'arma-improvisada',
    price: 20,
    effects: {}
  },
  {
    id: 'arma-fogo',
    name: 'Arma de fogo',
    type: 'arma',
    price: 120,
    effects: { respect: 1 }
  },
  {
    id: 'roupa-marca',
    name: 'Roupas de marca',
    type: 'roupa',
    price: 80,
    effects: { respect: 2 }
  },
  {
    id: 'drogas',
    name: 'Insumos para revenda',
    type: 'insumo',
    price: 60,
    effects: {}
  }
];

// Mapa base da campanha, com hierarquia pais > estado > cidade > bairro.
export const worldMap = [
  {
    id: 'br',
    name: 'Brasil',
    states: [
      {
        id: 'sp',
        name: 'Sao Paulo',
        cities: [
          {
            id: 'sp-capital',
            name: 'Sao Paulo',
            neighborhoods: [
              {
                id: 'mooca',
                name: 'Mooca',
                dominantOrg: { name: 'Irmandade Mooca', powerLevel: 6, eliteCount: 2 }
              },
              {
                id: 'santana',
                name: 'Santana',
                dominantOrg: { name: 'Vanguarda Norte', powerLevel: 7, eliteCount: 3 }
              }
            ]
          }
        ]
      },
      {
        id: 'rj',
        name: 'Rio de Janeiro',
        cities: [
          {
            id: 'rio-centro',
            name: 'Rio de Janeiro',
            neighborhoods: [
              {
                id: 'centro-rj',
                name: 'Centro',
                dominantOrg: { name: 'Liga do Centro', powerLevel: 5, eliteCount: 1 }
              },
              {
                id: 'tijuca',
                name: 'Tijuca',
                dominantOrg: { name: 'Eixo Tijuca', powerLevel: 8, eliteCount: 3 }
              }
            ]
          }
        ]
      }
    ]
  }
];

// Injeta o estado inicial de presenca em todos os bairros do mapa.
const attachPresence = (mapData) =>
  mapData.map((country) => ({
    ...country,
    states: country.states.map((state) => ({
      ...state,
      cities: state.cities.map((city) => ({
        ...city,
        neighborhoods: city.neighborhoods.map((neighborhood) => ({
          ...neighborhood,
          presence: 'Inexistente'
        }))
      }))
    }))
  }));

// Retorna a proxima patente na cadeia de progressao.
export const getNextRank = (rank) => {
  const index = rankOrder.indexOf(rank);
  if (index < 0 || index >= rankOrder.length - 1) {
    return null;
  }
  return rankOrder[index + 1];
};

// Traduz patente para poder numerico de combate.
export const getRankPower = (rank) => rankData[rank]?.power ?? 1;

// Soma renda passiva gerada por bairros ja dominados.
export const calculateTerritoryIncome = (mapData) => {
  let cash = 0;
  let influence = 0;
  let respect = 0;
  mapData.forEach((country) => {
    country.states.forEach((state) => {
      state.cities.forEach((city) => {
        city.neighborhoods.forEach((neighborhood) => {
          if (neighborhood.presence === 'Dominado') {
            cash += 15 + neighborhood.dominantOrg.powerLevel * 2;
            influence += 1;
            respect += 1;
          }
        });
      });
    });
  });

  return { cash, influence, respect };
};

// Fabrica o estado inicial global consumido pelo useReducer.
export const createInitialState = (playerName = 'Jogador', backstoryId = backstoryOptions[0].id) => {
  const mapWithPresence = attachPresence(worldMap);
  const firstNeighborhood = mapWithPresence[0].states[0].cities[0].neighborhoods[0];
  const normalizedPlayerName = playerName.trim() || 'Jogador';
  const selectedBackstory =
    backstoryOptions.find((item) => item.id === backstoryId) ?? backstoryOptions[0];
  const skillLevels = createInitialSkillLevels(selectedBackstory.startingSkillIds);
  const passiveBonuses = computePassiveBonuses(skillLevels);
  const basePlayer = {
    age: 14,
    health: 90 + (selectedBackstory.statBonus.health ?? 0) + passiveBonuses.health,
    maxHealth: 90 + (selectedBackstory.statBonus.health ?? 0) + passiveBonuses.health,
    attack: 6 + (selectedBackstory.statBonus.attack ?? 0) + passiveBonuses.attack,
    defense: 4 + (selectedBackstory.statBonus.defense ?? 0) + passiveBonuses.defense,
    speed: 3 + (selectedBackstory.statBonus.speed ?? 0) + passiveBonuses.speed,
    combatProficiency:
      1 +
      (selectedBackstory.statBonus.combatProficiency ?? 0) +
      passiveBonuses.combatProficiency,
    stealth: 4 + (selectedBackstory.statBonus.stealth ?? 0),
    intelligence: 4 + (selectedBackstory.statBonus.intelligence ?? 0),
    analysis: 3 + (selectedBackstory.statBonus.analysis ?? 0),
    level: 1,
    xp: 0,
    unspentPoints: 0
  };
  const initialRecruitPool = createRecruitPool({
    day: 1,
    size: 3,
    takenNames: [normalizedPlayerName]
  });

  return {
    stateVersion: 4,
    day: 1,
    resources: {
      cash: 0,
      influence: 0,
      respect: 0
    },
    player: {
      name: normalizedPlayerName,
      backstoryId: selectedBackstory.id,
      backstoryTitle: selectedBackstory.title,
      skillLevels,
      skills: getSkillsView(skillLevels),
      ...basePlayer
    },
    worldMap: mapWithPresence,
    selectedLocation: {
      countryId: 'br',
      stateId: mapWithPresence[0].states[0].id,
      cityId: mapWithPresence[0].states[0].cities[0].id,
      neighborhoodId: firstNeighborhood.id
    },
    inventory: {},
    members: [
      {
        id: nanoid(),
        name: normalizedPlayerName,
        rank: 'Recruta',
        xp: basePlayer.xp,
        level: basePlayer.level
      }
    ],
    recruitPool: initialRecruitPool,
    npcNetwork: createInitialNpcNetwork(),
    crimes,
    blackMarket: blackMarketItems,
    objectives: createInitialMissions(),
    storyFlags: {
      introShown: false
    },
    seenStoryEntries: [],
    storyModal: getPrologueModal({
      playerName: normalizedPlayerName,
      backstoryTitle: selectedBackstory.title
    }),
    eventCounters: {},
    crimeHistory: [],
    activityLog: ['Voce chegou ao Brasil com 14 anos para comecar do zero.'],
    combatReport: null,
    activeEvent: null,
    lastTurnSummary: null,
    uiInfoPanel: null
  };
};
