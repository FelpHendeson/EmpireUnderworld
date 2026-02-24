import { nanoid } from 'nanoid';

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

// Catalogo de crimes executaveis pelo jogador.
export const crimes = [
  {
    id: 'furto',
    name: 'Furto',
    tier: 1,
    requirements: {},
    rewards: { cash: 20, respect: 1, xp: 15 },
    risk: 0.25
  },
  {
    id: 'pequeno-trafico',
    name: 'Pequeno Trafico',
    tier: 1,
    requirements: {},
    rewards: { cash: 30, respect: 1, xp: 20 },
    risk: 0.3
  },
  {
    id: 'assalto-arma',
    name: 'Assalto a mao armada',
    tier: 2,
    requirements: { itemIds: ['arma-fogo'] },
    rewards: { cash: 80, respect: 2, xp: 35 },
    risk: 0.45
  },
  {
    id: 'carro-forte',
    name: 'Assalto a carro forte',
    tier: 3,
    requirements: { minRankCounts: { Soldado: 5 } },
    rewards: { cash: 180, respect: 4, xp: 60 },
    risk: 0.6
  }
];

// Itens disponiveis no mercado negro e efeitos imediatos.
export const blackMarketItems = [
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

// Candidatos iniciais para recrutamento.
export const recruitPool = [
  {
    id: 'm-ramon',
    name: 'Ramon',
    rank: 'Recruta',
    xp: 0,
    level: 1,
    entry: { type: 'respect', value: 2 }
  },
  {
    id: 'm-sarah',
    name: 'Sarah',
    rank: 'Recruta',
    xp: 0,
    level: 1,
    entry: { type: 'cash', value: 60 }
  },
  {
    id: 'm-tainara',
    name: 'Tainara',
    rank: 'Recruta',
    xp: 0,
    level: 1,
    entry: { type: 'respect', value: 4 }
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
export const createInitialState = () => {
  const mapWithPresence = attachPresence(worldMap);
  const firstNeighborhood = mapWithPresence[0].states[0].cities[0].neighborhoods[0];

  return {
    day: 1,
    resources: {
      cash: 0,
      influence: 0,
      respect: 0
    },
    player: {
      name: 'Jogador'
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
        name: 'Jogador',
        rank: 'Recruta',
        xp: 0,
        level: 1
      }
    ],
    recruitPool,
    crimes,
    blackMarket: blackMarketItems,
    activityLog: ['Voce chegou ao Brasil para comecar do zero.'],
    combatReport: null,
    activeEvent: null,
    lastTurnSummary: null,
    uiInfoPanel: null
  };
};
