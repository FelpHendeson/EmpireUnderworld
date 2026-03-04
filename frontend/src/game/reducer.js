import { nanoid } from 'nanoid';
import {
  backstoryOptions,
  calculateTerritoryIncome,
  createInitialState,
  getNextRank,
  getRankPower,
  rankData
} from '../data/gameData';
import { resolveCrimeEvent } from './modules/events';
import { applyMissionSystem } from './modules/missions';
import { applyXpGain, distributeAttributePoint } from './modules/progression';
import { applySkillUnlocks, getSkillsView } from './modules/skills';
import { getStoryModalFromState } from './modules/story';
import { refillRecruitPoolForDay } from './modules/recruits';

export const SLOT_IDS = ['slot-1', 'slot-2', 'slot-3'];
export const TOKEN_STORAGE_KEY = 'underworld_auth_token';
export const AUTO_SAVE_INTERVAL_MS = 30000;

// Prepara metadados de cada slot antes de existir save persistido na nuvem.
export const createInitialSlotDrafts = () =>
  SLOT_IDS.reduce((acc, slot) => {
    acc[slot] = {
      playerName: '',
      saveName: 'Campanha principal',
      backstoryId: backstoryOptions[0].id
    };
    return acc;
  }, {});

export const infoContent = {
  resources: {
    title: 'Recursos',
    text: 'Cash sustenta operacoes. Influencia abre portas politicas. Respeito alimenta sua reputacao.'
  },
  map: {
    title: 'Mapa geopolitico',
    text: 'Clique em um bairro para iniciar infiltracao ou disputa territorial.'
  },
  actions: {
    title: 'Acoes estrategicas',
    text: 'Crimes, mercado negro e recrutamento definem sua progressao.'
  }
};

const applyResourceDelta = (resources, delta) => ({
  cash: resources.cash + (delta.cash ?? 0),
  influence: resources.influence + (delta.influence ?? 0),
  respect: resources.respect + (delta.respect ?? 0)
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const updateNeighborhood = (worldMap, ids, updater) =>
  worldMap.map((country) => ({
    ...country,
    states: country.states.map((state) => ({
      ...state,
      cities: state.cities.map((city) => ({
        ...city,
        neighborhoods: city.neighborhoods.map((neighborhood) => {
          if (
            country.id === ids.countryId &&
            state.id === ids.stateId &&
            city.id === ids.cityId &&
            neighborhood.id === ids.neighborhoodId
          ) {
            return updater(neighborhood);
          }
          return neighborhood;
        })
      }))
    }))
  }));

const countRankOrAbove = (members, rank) => {
  const targetPower = getRankPower(rank);
  return members.filter((member) => getRankPower(member.rank) >= targetPower).length;
};

export const canCommitCrime = (state, crime) => {
  const requiredItems = crime.requirements?.itemIds ?? [];
  const requiredRanks = crime.requirements?.minRankCounts ?? {};
  const hasItems = requiredItems.every((itemId) => (state.inventory[itemId] ?? 0) > 0);
  const hasRanks = Object.entries(requiredRanks).every(([rank, count]) =>
    countRankOrAbove(state.members, rank) >= count
  );
  return hasItems && hasRanks;
};

const normalizeLoadedState = (payload) => {
  const seedName = payload?.player?.name ?? payload?.members?.[0]?.name ?? 'Jogador';
  const seedBackstory = payload?.player?.backstoryId ?? backstoryOptions[0].id;
  const base = createInitialState(seedName, seedBackstory);

  const merged = {
    ...base,
    ...payload,
    resources: { ...base.resources, ...(payload?.resources ?? {}) },
    selectedLocation: { ...base.selectedLocation, ...(payload?.selectedLocation ?? {}) },
    player: { ...base.player, ...(payload?.player ?? {}) },
    storyFlags: { ...base.storyFlags, ...(payload?.storyFlags ?? {}) },
    members: payload?.members?.length ? payload.members : base.members,
    recruitPool: Array.isArray(payload?.recruitPool) ? payload.recruitPool : base.recruitPool,
    objectives: payload?.objectives?.length ? payload.objectives : base.objectives,
    crimeHistory: Array.isArray(payload?.crimeHistory) ? payload.crimeHistory : base.crimeHistory,
    eventCounters:
      payload?.eventCounters && typeof payload.eventCounters === 'object'
        ? payload.eventCounters
        : base.eventCounters,
    seenStoryEntries: Array.isArray(payload?.seenStoryEntries)
      ? payload.seenStoryEntries
      : base.seenStoryEntries,
    storyModal: null,
    combatReport: null,
    lastTurnSummary: null,
    uiInfoPanel: null
  };

  const normalizedSkills =
    merged.player.skillLevels && typeof merged.player.skillLevels === 'object'
      ? merged.player.skillLevels
      : base.player.skillLevels;

  const withSkills = {
    ...merged,
    player: {
      ...merged.player,
      skillLevels: normalizedSkills,
      skills: getSkillsView(normalizedSkills)
    }
  };

  return applyMissionSystem(withSkills);
};

const applyPostActionSystems = (state) => {
  const withMissions = applyMissionSystem(state);
  const unlockedResult = applySkillUnlocks(
    withMissions.player.skillLevels ?? {},
    withMissions.eventCounters ?? {}
  );
  const hasSkillUnlock = unlockedResult.unlocked.length > 0;
  const withSkills = hasSkillUnlock
    ? {
        ...withMissions,
        player: {
          ...withMissions.player,
          skillLevels: unlockedResult.skillLevels,
          skills: getSkillsView(unlockedResult.skillLevels),
          attack:
            withMissions.player.attack +
            unlockedResult.unlocked.reduce((sum, skill) => sum + (skill.effects.attack ?? 0), 0),
          defense:
            withMissions.player.defense +
            unlockedResult.unlocked.reduce((sum, skill) => sum + (skill.effects.defense ?? 0), 0),
          speed:
            withMissions.player.speed +
            unlockedResult.unlocked.reduce((sum, skill) => sum + (skill.effects.speed ?? 0), 0),
          combatProficiency:
            withMissions.player.combatProficiency +
            unlockedResult.unlocked.reduce(
              (sum, skill) => sum + (skill.effects.combatProficiency ?? 0),
              0
            ),
          maxHealth:
            withMissions.player.maxHealth +
            unlockedResult.unlocked.reduce((sum, skill) => sum + (skill.effects.health ?? 0), 0),
          health:
            withMissions.player.health +
            unlockedResult.unlocked.reduce((sum, skill) => sum + (skill.effects.health ?? 0), 0)
        },
        activityLog: [
          ...unlockedResult.unlocked.map(
            (entry) => `Skill desbloqueada: ${entry.name} (nivel ${entry.level}).`
          ),
          ...withMissions.activityLog
        ].slice(0, 20)
      }
    : withMissions;

  if (withSkills.storyModal) {
    return withSkills;
  }

  const storyModal = getStoryModalFromState(withSkills);
  if (!storyModal) {
    return withSkills;
  }

  return {
    ...withSkills,
    storyModal,
    seenStoryEntries: [...withSkills.seenStoryEntries, storyModal.id]
  };
};

// Remove estados visuais/ephemeros antes de serializar para o backend.
export const extractSavableState = (state) => ({
  ...state,
  combatReport: null,
  lastTurnSummary: null,
  uiInfoPanel: null,
  storyModal: null
});

export const gameReducer = (state, action) => {
  switch (action.type) {
    case 'ADVANCE_DAY': {
      const income = calculateTerritoryIncome(state.worldMap);
      const nextDay = state.day + 1;
      const recruitRefresh = refillRecruitPoolForDay({
        recruitPool: state.recruitPool,
        day: nextDay,
        members: state.members
      });

      const activityLog =
        recruitRefresh.newCandidates.length > 0
          ? [
              `${recruitRefresh.newCandidates.length} novo(s) contato(s) apareceram para recrutamento.`,
              ...state.activityLog
            ].slice(0, 20)
          : state.activityLog;

      const nextResources = applyResourceDelta(state.resources, income);
      return applyPostActionSystems({
        ...state,
        day: nextDay,
        recruitPool: recruitRefresh.nextPool,
        activityLog,
        resources: nextResources,
        lastTurnSummary: income
      });
    }
    case 'SET_LOCATION': {
      return {
        ...state,
        selectedLocation: action.payload
      };
    }
    case 'ACTION_COMMIT_CRIME': {
      const crime = state.crimes.find((item) => item.id === action.payload.crimeId);
      if (!crime || !canCommitCrime(state, crime)) {
        return state;
      }
      const eventResult = resolveCrimeEvent(crime);
      const success = Math.random() > crime.risk;
      const baseXp = success ? crime.rewards.xp : Math.round(crime.rewards.xp / 3);
      const xpGain = baseXp;
      const nextPlayer = applyXpGain(state.player, xpGain);
      const updatedMembers = state.members.map((member, index) =>
        index === 0
          ? {
              ...member,
              xp: nextPlayer.xp,
              level: nextPlayer.level
            }
          : member
      );
      return applyPostActionSystems({
        ...state,
        eventCounters: eventResult.eventTags.reduce(
          (acc, tag) => ({
            ...acc,
            [tag]: (acc[tag] ?? 0) + 1
          }),
          state.eventCounters
        ),
        members: updatedMembers,
        resources: applyResourceDelta(
          state.resources,
          success
            ? {
                ...crime.rewards,
                cash: (crime.rewards.cash ?? 0) + (eventResult.effects.cash ?? 0),
                respect: (crime.rewards.respect ?? 0) + (eventResult.effects.respect ?? 0)
              }
            : { respect: -1 + (eventResult.effects.respect ?? 0), cash: eventResult.effects.cash ?? 0 }
        ),
        combatReport: eventResult.type === 'combat' ? eventResult.text : state.combatReport,
        player: {
          ...nextPlayer,
          health: Math.max(
            1,
            Math.min(nextPlayer.maxHealth, nextPlayer.health + (eventResult.effects.health ?? 0))
          )
        },
        crimeHistory: [
          {
            id: nanoid(),
            crimeId: crime.id,
            crimeName: crime.name,
            success,
            day: state.day,
            xpGain,
            cashDelta: success
              ? (crime.rewards.cash ?? 0) + (eventResult.effects.cash ?? 0)
              : eventResult.effects.cash ?? 0,
            respectDelta: success
              ? (crime.rewards.respect ?? 0) + (eventResult.effects.respect ?? 0)
              : -1 + (eventResult.effects.respect ?? 0),
            eventType: eventResult.type
          },
          ...state.crimeHistory
        ].slice(0, 500),
        activityLog: [
          eventResult.text,
          success
            ? `Crime realizado: ${crime.name}. O caixa aumentou.`
            : `Crime falhou: ${crime.name}. A policia ficou alerta.`,
          ...state.activityLog
        ].slice(0, 20)
      });
    }
    case 'DISTRIBUTE_PLAYER_POINT': {
      const { attribute } = action.payload;
      if (!['health', 'attack', 'defense', 'combatProficiency', 'speed'].includes(attribute)) {
        return state;
      }
      const nextPlayer = distributeAttributePoint(state.player, attribute);

      return {
        ...state,
        player: nextPlayer
      };
    }
    case 'ACTION_BUY_ITEM': {
      const item = state.blackMarket.find((entry) => entry.id === action.payload.itemId);
      if (!item || state.resources.cash < item.price) {
        return state;
      }
      const nextInventory = {
        ...state.inventory,
        [item.id]: (state.inventory[item.id] ?? 0) + 1
      };
      return {
        ...state,
        inventory: nextInventory,
        resources: applyResourceDelta(state.resources, {
          cash: -item.price,
          ...item.effects
        }),
        activityLog: [`Compra no mercado negro: ${item.name}.`, ...state.activityLog].slice(0, 12)
      };
    }
    case 'ACTION_RECRUIT': {
      const recruit = state.recruitPool.find((member) => member.id === action.payload.memberId);
      if (!recruit) {
        return state;
      }
      const entry = recruit.entry;
      if (entry.type === 'cash' && state.resources.cash < entry.value) {
        return state;
      }
      if (entry.type === 'respect' && state.resources.respect < entry.value) {
        return state;
      }
      const nextResources = applyResourceDelta(state.resources, {
        cash: entry.type === 'cash' ? -entry.value : 0,
        respect: entry.type === 'respect' ? -entry.value : 0
      });
      return {
        ...state,
        resources: nextResources,
        members: [...state.members, { ...recruit, entry: undefined }],
        recruitPool: state.recruitPool.filter((member) => member.id !== recruit.id),
        activityLog: [`${recruit.name} entrou na organizacao.`, ...state.activityLog].slice(0, 12)
      };
    }
    case 'ACTION_PROMOTE': {
      const member = state.members.find((item) => item.id === action.payload.memberId);
      if (!member) {
        return state;
      }
      const nextRank = getNextRank(member.rank);
      if (!nextRank) {
        return state;
      }
      const requirements = rankData[nextRank];
      if (!requirements || member.xp < requirements.minXp) {
        return state;
      }
      if (
        state.resources.cash < requirements.promoteCost.cash ||
        state.resources.respect < requirements.promoteCost.respect
      ) {
        return state;
      }
      return {
        ...state,
        resources: applyResourceDelta(state.resources, {
          cash: -requirements.promoteCost.cash,
          respect: -requirements.promoteCost.respect
        }),
        members: state.members.map((item) =>
          item.id === member.id ? { ...item, rank: nextRank } : item
        ),
        activityLog: [`${member.name} foi promovido para ${nextRank}.`, ...state.activityLog].slice(0, 12)
      };
    }
    case 'ACTION_TAKEOVER': {
      const ids = state.selectedLocation;
      let selectedNeighborhood = null;
      state.worldMap.forEach((country) => {
        if (country.id !== ids.countryId) return;
        country.states.forEach((stateItem) => {
          if (stateItem.id !== ids.stateId) return;
          stateItem.cities.forEach((city) => {
            if (city.id !== ids.cityId) return;
            selectedNeighborhood = city.neighborhoods.find(
              (neighborhood) => neighborhood.id === ids.neighborhoodId
            );
          });
        });
      });
      if (!selectedNeighborhood) return state;

      const ourPower = state.members.reduce((total, member) => total + getRankPower(member.rank), 0);
      const enemyPower = selectedNeighborhood.dominantOrg.powerLevel;
      // Chance de vitoria limitada para evitar extremos e manter progressao.
      const winChance = clamp(ourPower / (enemyPower + 1), 0.1, 0.9);
      const victory = Math.random() <= winChance;

      const nextPresence =
        selectedNeighborhood.presence === 'Inexistente'
          ? 'Infiltrado'
          : selectedNeighborhood.presence === 'Infiltrado'
            ? 'Disputado'
            : selectedNeighborhood.presence === 'Disputado' && victory
              ? 'Dominado'
              : selectedNeighborhood.presence;

      let absorbedMembers = [];
      if (victory && nextPresence === 'Dominado' && Math.random() < 0.2) {
        const eliteCount = Math.max(1, Math.min(2, selectedNeighborhood.dominantOrg.eliteCount));
        absorbedMembers = Array.from({ length: eliteCount }, () => ({
          id: nanoid(),
          name: 'Elite absorvido',
          rank: 'Elite',
          xp: 400,
          level: 8
        }));
      }

      const updatedWorldMap = updateNeighborhood(state.worldMap, ids, (neighborhood) => ({
        ...neighborhood,
        presence: victory
          ? nextPresence
          : neighborhood.presence === 'Inexistente'
            ? 'Infiltrado'
            : neighborhood.presence
      }));

      const report = `Seus ${countRankOrAbove(state.members, 'Soldado')} Soldados e ${
        countRankOrAbove(state.members, 'Recruta')
      } Recrutas enfrentaram ${enemyPower} capangas da faccao ${selectedNeighborhood.dominantOrg.name}. ${
        victory ? 'Vitoria!' : 'Derrota.'
      }`;

      return {
        ...state,
        worldMap: updatedWorldMap,
        members: absorbedMembers.length ? [...state.members, ...absorbedMembers] : state.members,
        combatReport: report,
        activityLog: [
          victory
            ? `Territorio em ${selectedNeighborhood.name} avancou para ${nextPresence}.`
            : `A tentativa em ${selectedNeighborhood.name} fracassou.`,
          ...state.activityLog
        ].slice(0, 12)
      };
    }
    case 'TOGGLE_INFO': {
      return {
        ...state,
        uiInfoPanel: state.uiInfoPanel === action.payload.panel ? null : action.payload.panel
      };
    }
    case 'HYDRATE_STATE': {
      return normalizeLoadedState(action.payload);
    }
    case 'CLOSE_STORY_MODAL': {
      const modalId = state.storyModal?.id;
      return {
        ...state,
        seenStoryEntries:
          modalId && !(state.seenStoryEntries ?? []).includes(modalId)
            ? [...(state.seenStoryEntries ?? []), modalId]
            : state.seenStoryEntries,
        storyModal: null
      };
    }
    default:
      return state;
  }
};
