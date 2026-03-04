import missionsConfig from '../../content/missions.json';
import { applyXpGain } from './progression';

export const createInitialMissions = () =>
  missionsConfig.map((mission) => ({
    ...mission,
    progress: 0,
    target: mission.condition.value,
    completed: false,
    rewardClaimed: false
  }));

const getProgressValue = (mission, state) => {
  const type = mission.condition.type;

  if (type === 'crimeCountAtLeast') {
    return state.crimeHistory.length;
  }

  if (type === 'playerLevelAtLeast') {
    return state.player.level;
  }

  if (type === 'cashAtLeast') {
    return state.resources.cash;
  }

  return 0;
};

export const applyMissionSystem = (state) => {
  const objectives = state.objectives.map((mission) => {
    const progress = getProgressValue(mission, state);
    return {
      ...mission,
      progress,
      completed: progress >= mission.target
    };
  });

  let resources = { ...state.resources };
  let player = { ...state.player };
  let addedLogs = [];

  const rewardedObjectives = objectives.map((mission) => {
    if (!mission.completed || mission.rewardClaimed) {
      return mission;
    }

    const rewards = mission.rewards ?? {};
    resources.cash += rewards.cash ?? 0;
    resources.influence += rewards.influence ?? 0;
    resources.respect += rewards.respect ?? 0;
    player = applyXpGain(player, rewards.xp ?? 0);
    player.unspentPoints += rewards.skillPoints ?? 0;

    addedLogs = [`Missao concluida: ${mission.name}.`, ...addedLogs];
    return {
      ...mission,
      rewardClaimed: true
    };
  });

  return {
    ...state,
    player,
    resources,
    objectives: rewardedObjectives,
    activityLog: [...addedLogs, ...state.activityLog].slice(0, 20)
  };
};