export const crimeTierDefinitions = [
  {
    tier: 1,
    label: 'Tier 1',
    title: 'Solo e discreto',
    description: 'Acoes basicas, sem armas, sem equipe e sem estrutura.'
  },
  {
    tier: 2,
    label: 'Tier 2',
    title: 'Ferramenta, contato ou risco',
    description: 'Exige item, contato local ou uma primeira camada de logistica.'
  },
  {
    tier: 3,
    label: 'Tier 3',
    title: 'Celula organizada',
    description: 'Requer gente de confianca, territorio ou relacao com NPCs locais.'
  },
  {
    tier: 4,
    label: 'Tier 4',
    title: 'Operacao de bairro',
    description: 'Move dinheiro, influencia e controle local de forma coordenada.'
  },
  {
    tier: 5,
    label: 'Tier 5',
    title: 'Estrutura regional',
    description: 'Acoes grandes para organizacao estabelecida.'
  }
];

export const relationshipLabels = {
  ally: 'Aliado',
  friend: 'Amigo',
  neutral: 'Neutro',
  rival: 'Rival',
  enemy: 'Inimigo'
};

const usefulRelations = new Set(['ally', 'friend', 'neutral']);

export const localNpcTemplates = {
  mooca: [
    {
      id: 'dona-ivete',
      name: 'Dona Ivete',
      role: 'Comerciante observadora',
      relationship: 'friend',
      tags: ['informante', 'comercio-local'],
      note: 'Sabe quem entra e sai das lojas da regiao.'
    },
    {
      id: 'luan-ponte',
      name: 'Luan Ponte',
      role: 'Contato logistico',
      relationship: 'neutral',
      tags: ['contato-logistico', 'transporte-local'],
      note: 'Conhece rotas curtas e gente que faz pequenos corres.'
    },
    {
      id: 'nilo-mooca',
      name: 'Nilo da Mooca',
      role: 'Rival de esquina',
      relationship: 'rival',
      tags: ['rival-local'],
      note: 'Observa qualquer novato tentando crescer no bairro.'
    }
  ],
  santana: [
    {
      id: 'bia-terminal',
      name: 'Bia Terminal',
      role: 'Olheira de fluxo',
      relationship: 'neutral',
      tags: ['informante', 'terminal'],
      note: 'Le movimento de terminal, feira e rua cheia.'
    },
    {
      id: 'marcelo-norte',
      name: 'Marcelo Norte',
      role: 'Atravessador pequeno',
      relationship: 'friend',
      tags: ['atravessador', 'contato-logistico'],
      note: 'Aceita negocios pequenos quando confia na discricao.'
    },
    {
      id: 'vitor-vanguarda',
      name: 'Vitor Vanguarda',
      role: 'Cobrador rival',
      relationship: 'enemy',
      tags: ['rival-local', 'ameaca'],
      note: 'Trabalha para a faccao dominante e testa sua presenca.'
    }
  ],
  'centro-rj': [
    {
      id: 'sandro-camelodromo',
      name: 'Sandro Camelodromo',
      role: 'Comerciante de rua',
      relationship: 'neutral',
      tags: ['comercio-local', 'informante'],
      note: 'Tem ouvido em barracas e lojas apertadas.'
    },
    {
      id: 'kelly-cais',
      name: 'Kelly Cais',
      role: 'Contato de entrega',
      relationship: 'friend',
      tags: ['contato-logistico', 'transporte-local'],
      note: 'Sabe quem precisa mover pacote pequeno sem alarde.'
    },
    {
      id: 'major-centro',
      name: 'Major Centro',
      role: 'Pressao institucional',
      relationship: 'enemy',
      tags: ['ameaca', 'policia-local'],
      note: 'Aumenta o risco quando percebe crescimento de rua.'
    }
  ],
  tijuca: [
    {
      id: 'renata-praca',
      name: 'Renata Praca',
      role: 'Informante social',
      relationship: 'friend',
      tags: ['informante', 'vida-noturna'],
      note: 'Conhece estudantes, bares e horarios de movimento.'
    },
    {
      id: 'guto-galpao',
      name: 'Guto Galpao',
      role: 'Contato de estoque',
      relationship: 'neutral',
      tags: ['atravessador', 'comercio-local'],
      note: 'Ouve sobre mercadoria parada e oportunidade pequena.'
    },
    {
      id: 'eixo-tijuca',
      name: 'Eixo Tijuca',
      role: 'Grupo rival',
      relationship: 'rival',
      tags: ['rival-local', 'ameaca'],
      note: 'Nao gosta de operacao sem permissao no territorio.'
    }
  ]
};

export const createInitialNpcNetwork = () =>
  Object.entries(localNpcTemplates).reduce((acc, [neighborhoodId, npcs]) => {
    acc[neighborhoodId] = npcs.map((npc) => ({ ...npc }));
    return acc;
  }, {});

export const crimeCatalog = [
  {
    id: 'furto',
    name: 'Furto',
    shortName: 'Furtar',
    tier: 1,
    family: 'subtracao',
    summary: 'Pegar algo pequeno sem confronto direto.',
    requirements: {},
    rewards: { cash: 20, respect: 1, xp: 15 },
    challenge: {
      diceMultiplier: 1.15,
      baseDifficulty: 18,
      statWeights: { stealth: 1.25, intelligence: 0.9, analysis: 0.85, speed: 0.35 },
      locations: ['shopping-popular', 'orla', 'loja-centro', 'terminal'],
      opponents: ['seguranca', 'guarda', 'policial', 'lojista']
    }
  },
  {
    id: 'pequeno-roubo',
    name: 'Pequeno Roubo',
    shortName: 'Roubo leve',
    tier: 1,
    family: 'subtracao',
    summary: 'Abordagem curta, sem arma e sem violencia direta.',
    requirements: {},
    rewards: { cash: 26, respect: 1, xp: 18 },
    challenge: {
      diceMultiplier: 1.05,
      baseDifficulty: 20,
      statWeights: { stealth: 0.8, speed: 0.8, analysis: 0.7, intelligence: 0.45 },
      locations: ['feira', 'terminal', 'orla'],
      opponents: ['vitima-atenta', 'guarda', 'popular']
    }
  },
  {
    id: 'olheiro-rua',
    name: 'Olheiro de Rua',
    shortName: 'Observar',
    tier: 1,
    family: 'inteligencia',
    summary: 'Ler o bairro e levantar oportunidade sem se expor.',
    requirements: { npcTags: ['informante'] },
    rewards: { influence: 1, xp: 16 },
    challenge: {
      diceMultiplier: 1.1,
      baseDifficulty: 17,
      statWeights: { analysis: 1.15, intelligence: 1, stealth: 0.5 },
      locations: ['bar-local', 'loja-centro', 'terminal'],
      opponents: ['rival-local', 'desconfiado']
    }
  },
  {
    id: 'transporte-leve',
    name: 'Transporte Leve',
    shortName: 'Transportar',
    tier: 2,
    family: 'logistica',
    summary: 'Mover volume pequeno para um contato local.',
    requirements: { npcTags: ['contato-logistico'], minRespect: 1 },
    rewards: { cash: 44, influence: 1, xp: 24 },
    challenge: {
      diceMultiplier: 1,
      baseDifficulty: 24,
      statWeights: { intelligence: 0.9, analysis: 1, stealth: 0.65, speed: 0.45 },
      locations: ['terminal', 'bar-local', 'beco-comercial'],
      opponents: ['guarda', 'rival-local', 'fiscal']
    }
  },
  {
    id: 'revenda-minima',
    name: 'Revenda Minima',
    shortName: 'Revender',
    tier: 2,
    family: 'mercado',
    summary: 'Girar insumo pequeno em ponto discreto.',
    requirements: { itemIds: ['drogas'], npcTags: ['atravessador'] },
    rewards: { cash: 58, respect: 1, xp: 28 },
    challenge: {
      diceMultiplier: 1,
      baseDifficulty: 25,
      statWeights: { intelligence: 1, analysis: 0.8, stealth: 0.55 },
      locations: ['bar-local', 'praca', 'loja-centro'],
      opponents: ['rival-local', 'desconfiado', 'guarda']
    }
  },
  {
    id: 'assalto-improvisado',
    name: 'Assalto Improvisado',
    shortName: 'Assalto',
    tier: 2,
    family: 'pressao',
    summary: 'Acao de risco com objeto de intimidacao.',
    requirements: { anyItemIds: ['faca', 'porrete', 'garrafa-quebrada', 'arma-fogo'] },
    rewards: { cash: 78, respect: 2, xp: 34 },
    challenge: {
      diceMultiplier: 0.95,
      baseDifficulty: 29,
      statWeights: { attack: 0.8, combatProficiency: 0.8, speed: 0.65, analysis: 0.45 },
      locations: ['estacionamento', 'beco-comercial', 'terminal'],
      opponents: ['seguranca', 'policial', 'vitima-resistente']
    }
  },
  {
    id: 'cobranca-bairro',
    name: 'Cobranca de Bairro',
    shortName: 'Cobrar',
    tier: 3,
    family: 'controle',
    summary: 'Usar reputacao e presenca para impor respeito local.',
    requirements: { minRankCounts: { Soldado: 2 }, npcTags: ['comercio-local'], minRespect: 4 },
    rewards: { cash: 120, respect: 3, influence: 1, xp: 48 },
    challenge: {
      diceMultiplier: 0.95,
      baseDifficulty: 35,
      statWeights: { attack: 0.8, combatProficiency: 0.75, intelligence: 0.7, analysis: 0.55 },
      locations: ['comercio-local', 'bar-local'],
      opponents: ['grupo-rival', 'comerciante-resistente']
    }
  },
  {
    id: 'ponto-discreto',
    name: 'Ponto Discreto',
    shortName: 'Abrir ponto',
    tier: 3,
    family: 'organizacao',
    summary: 'Montar presenca pequena com apoio de contato local.',
    requirements: { minRankCounts: { Soldado: 3 }, npcTags: ['contato-logistico'], minInfluence: 1 },
    rewards: { cash: 140, influence: 2, respect: 2, xp: 56 },
    challenge: {
      diceMultiplier: 0.9,
      baseDifficulty: 38,
      statWeights: { intelligence: 1, analysis: 0.9, stealth: 0.6 },
      locations: ['bar-local', 'beco-comercial', 'comercio-local'],
      opponents: ['grupo-rival', 'policia-local']
    }
  },
  {
    id: 'fachada-comercial',
    name: 'Fachada Comercial',
    shortName: 'Fachada',
    tier: 4,
    family: 'financeiro',
    summary: 'Criar cobertura financeira para operacoes maiores.',
    requirements: { minRankCounts: { General: 1 }, minInfluence: 4, minRespect: 8 },
    rewards: { cash: 240, influence: 3, xp: 72 },
    challenge: {
      diceMultiplier: 0.85,
      baseDifficulty: 46,
      statWeights: { intelligence: 1.2, analysis: 1.1, stealth: 0.3 },
      locations: ['comercio-local', 'centro-financeiro'],
      opponents: ['fiscal', 'grupo-rival']
    }
  },
  {
    id: 'rota-regional',
    name: 'Rota Regional',
    shortName: 'Rota',
    tier: 5,
    family: 'expansao',
    summary: 'Conectar bairros e transformar influencia em poder regional.',
    requirements: { minRankCounts: { General: 2, Elite: 1 }, minInfluence: 8, minRespect: 14 },
    rewards: { cash: 420, influence: 5, respect: 4, xp: 100 },
    challenge: {
      diceMultiplier: 0.8,
      baseDifficulty: 58,
      statWeights: { intelligence: 1, analysis: 1, combatProficiency: 0.6, speed: 0.4 },
      locations: ['rota-regional', 'centro-logistico'],
      opponents: ['grupo-rival', 'policia-local']
    }
  }
];

export const criminalLocations = {
  'shopping-popular': {
    id: 'shopping-popular',
    name: 'Shopping popular',
    description: 'corredor cheio, cameras no teto e segurancas circulando',
    pressure: 3
  },
  orla: {
    id: 'orla',
    name: 'Orla da praia',
    description: 'barracas, turistas distraidos e espaco aberto para fuga',
    pressure: 2
  },
  'loja-centro': {
    id: 'loja-centro',
    name: 'Loja no centro',
    description: 'balcao estreito, dono atento e movimento irregular',
    pressure: 2
  },
  terminal: {
    id: 'terminal',
    name: 'Terminal',
    description: 'fila apertada, fluxo alto e olhar de guarda',
    pressure: 4
  },
  feira: {
    id: 'feira',
    name: 'Feira de rua',
    description: 'bancas proximas, barulho e muita distracao',
    pressure: 2
  },
  'bar-local': {
    id: 'bar-local',
    name: 'Bar local',
    description: 'mesas proximas, conversa baixa e gente conhecida',
    pressure: 3
  },
  praca: {
    id: 'praca',
    name: 'Praca movimentada',
    description: 'passagem aberta, olhares cruzados e rotas curtas',
    pressure: 3
  },
  'beco-comercial': {
    id: 'beco-comercial',
    name: 'Beco comercial',
    description: 'fundos de comercio, pouca luz e saidas estreitas',
    pressure: 4
  },
  estacionamento: {
    id: 'estacionamento',
    name: 'Estacionamento',
    description: 'movimento irregular, carros e seguranca eventual',
    pressure: 4
  },
  'comercio-local': {
    id: 'comercio-local',
    name: 'Comercio local',
    description: 'lojas pequenas, donos atentos e rede de conhecidos',
    pressure: 4
  },
  'centro-financeiro': {
    id: 'centro-financeiro',
    name: 'Centro financeiro',
    description: 'fachadas formais, burocracia e risco institucional',
    pressure: 6
  },
  'rota-regional': {
    id: 'rota-regional',
    name: 'Rota regional',
    description: 'transito entre bairros e interesses de grupos maiores',
    pressure: 7
  },
  'centro-logistico': {
    id: 'centro-logistico',
    name: 'Centro logistico',
    description: 'pontos de passagem, vigilancia e intermediarios',
    pressure: 7
  }
};

export const criminalOpponents = {
  seguranca: {
    id: 'seguranca',
    name: 'Seguranca particular',
    description: 'um seguranca percebeu a movimentacao e fechou a passagem',
    threatPower: 14
  },
  guarda: {
    id: 'guarda',
    name: 'Guarda municipal',
    description: 'um guarda viu a confusao e veio direto na sua direcao',
    threatPower: 16
  },
  policial: {
    id: 'policial',
    name: 'Policial de ronda',
    description: 'um policial escutou o alarme e sacou o radio',
    threatPower: 19
  },
  lojista: {
    id: 'lojista',
    name: 'Lojista irritado',
    description: 'o dono da loja pulou o balcao e tentou te agarrar',
    threatPower: 12
  },
  popular: {
    id: 'popular',
    name: 'Popular atento',
    description: 'alguem da rua percebeu o movimento e chamou atencao',
    threatPower: 11
  },
  'vitima-atenta': {
    id: 'vitima-atenta',
    name: 'Vitima atenta',
    description: 'a vitima percebeu antes do fim e virou o corpo na hora',
    threatPower: 12
  },
  desconfiado: {
    id: 'desconfiado',
    name: 'Morador desconfiado',
    description: 'um conhecido do bairro achou estranho e ficou em cima',
    threatPower: 13
  },
  'rival-local': {
    id: 'rival-local',
    name: 'Rival local',
    description: 'um rival viu a chance de te constranger no proprio bairro',
    threatPower: 17
  },
  fiscal: {
    id: 'fiscal',
    name: 'Fiscal insistente',
    description: 'uma abordagem institucional apertou a operacao',
    threatPower: 18
  },
  'vitima-resistente': {
    id: 'vitima-resistente',
    name: 'Alvo resistente',
    description: 'o alvo reagiu mais forte do que parecia',
    threatPower: 18
  },
  'grupo-rival': {
    id: 'grupo-rival',
    name: 'Grupo rival',
    description: 'um grupo rival apareceu para contestar sua acao',
    threatPower: 24
  },
  'comerciante-resistente': {
    id: 'comerciante-resistente',
    name: 'Comerciante resistente',
    description: 'o comerciante juntou aliados e recusou sua pressao',
    threatPower: 20
  },
  'policia-local': {
    id: 'policia-local',
    name: 'Policia local',
    description: 'a pressao policial local chegou antes do esperado',
    threatPower: 26
  }
};

export const getLocalNpcs = (npcNetwork, selectedLocation) =>
  npcNetwork?.[selectedLocation?.neighborhoodId] ?? [];

const hasUsefulNpcTag = (npcNetwork, selectedLocation, tag) =>
  getLocalNpcs(npcNetwork, selectedLocation).some(
    (npc) => usefulRelations.has(npc.relationship) && (npc.tags ?? []).includes(tag)
  );

const countRankOrAbove = (members, rank, getRankPower) => {
  const targetPower = getRankPower(rank);
  return members.filter((member) => getRankPower(member.rank) >= targetPower).length;
};

export const getCrimeRequirementStatus = ({ state, crime, selectedLocation, getRankPower }) => {
  const requirements = crime.requirements ?? {};
  const missing = [];
  const requiredItems = requirements.itemIds ?? [];
  const hasItems = requiredItems.every((itemId) => (state.inventory[itemId] ?? 0) > 0);

  if (!hasItems) {
    missing.push(`item: ${requiredItems.find((itemId) => !(state.inventory[itemId] > 0))}`);
  }

  const anyItemIds = requirements.anyItemIds ?? [];
  if (anyItemIds.length > 0 && !anyItemIds.some((itemId) => (state.inventory[itemId] ?? 0) > 0)) {
    missing.push(`um item: ${anyItemIds.join(' ou ')}`);
  }

  const requiredRanks = requirements.minRankCounts ?? {};
  Object.entries(requiredRanks).forEach(([rank, count]) => {
    if (countRankOrAbove(state.members, rank, getRankPower) < count) {
      missing.push(`${count} ${rank}+`);
    }
  });

  if ((requirements.minRespect ?? 0) > state.resources.respect) {
    missing.push(`${requirements.minRespect} respeito`);
  }

  if ((requirements.minInfluence ?? 0) > state.resources.influence) {
    missing.push(`${requirements.minInfluence} influencia`);
  }

  (requirements.npcTags ?? []).forEach((tag) => {
    if (!hasUsefulNpcTag(state.npcNetwork, selectedLocation, tag)) {
      missing.push(`NPC: ${tag}`);
    }
  });

  return {
    allowed: missing.length === 0,
    missing
  };
};

export const groupCrimesByTier = (crimes) =>
  crimeTierDefinitions
    .map((tierDefinition) => ({
      ...tierDefinition,
      crimes: crimes.filter((crime) => crime.tier === tierDefinition.tier)
    }))
    .filter((group) => group.crimes.length > 0);
