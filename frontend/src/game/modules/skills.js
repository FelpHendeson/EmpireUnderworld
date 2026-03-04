import skillsConfig from '../../content/skills.json';

const conditionMet = (condition, counters) => {
  if (!condition || condition.type === 'none') {
    return true;
  }

  if (condition.type === 'eventCount') {
    const count = counters[condition.eventId] ?? 0;
    return count >= condition.minCount;
  }

  return false;
};

export const createInitialSkillLevels = (startingSkillIds = []) => {
  const levels = {};

  skillsConfig.forEach((skill) => {
    const hasFreeUnlock = skill.levels.some((level) => level.unlockCondition?.type === 'none');
    if (hasFreeUnlock) {
      levels[skill.id] = 1;
    }
  });

  startingSkillIds.forEach((skillId) => {
    levels[skillId] = Math.max(1, levels[skillId] ?? 0);
  });

  return levels;
};

export const getSkillsView = (skillLevels) =>
  skillsConfig
    .filter((skill) => (skillLevels[skill.id] ?? 0) > 0)
    .map((skill) => {
      const level = skillLevels[skill.id];
      const levelData = skill.levels.find((entry) => entry.level === level) ?? skill.levels[0];
      return {
        id: skill.id,
        name: skill.name,
        type: skill.type,
        level,
        title: levelData?.title ?? '',
        effects: levelData?.effects ?? {}
      };
    });

export const computePassiveBonuses = (skillLevels) => {
  const bonuses = {
    attack: 0,
    defense: 0,
    speed: 0,
    health: 0,
    combatProficiency: 0
  };

  skillsConfig.forEach((skill) => {
    const unlockedLevel = skillLevels[skill.id] ?? 0;
    if (!unlockedLevel || skill.type !== 'passive') return;

    skill.levels
      .filter((entry) => entry.level <= unlockedLevel)
      .forEach((entry) => {
        bonuses.attack += entry.effects.attack ?? 0;
        bonuses.defense += entry.effects.defense ?? 0;
        bonuses.speed += entry.effects.speed ?? 0;
        bonuses.health += entry.effects.health ?? 0;
        bonuses.combatProficiency += entry.effects.combatProficiency ?? 0;
      });
  });

  return bonuses;
};

export const applySkillUnlocks = (skillLevels, counters) => {
  const nextLevels = { ...skillLevels };
  const unlocked = [];

  skillsConfig.forEach((skill) => {
    let currentLevel = nextLevels[skill.id] ?? 0;

    skill.levels
      .sort((a, b) => a.level - b.level)
      .forEach((levelEntry) => {
        if (levelEntry.level <= currentLevel) {
          return;
        }

        if (conditionMet(levelEntry.unlockCondition, counters)) {
          currentLevel = levelEntry.level;
          nextLevels[skill.id] = currentLevel;
          unlocked.push({
            skillId: skill.id,
            level: currentLevel,
            name: skill.name,
            effects: levelEntry.effects ?? {}
          });
        }
      });
  });

  return { skillLevels: nextLevels, unlocked };
};

export { skillsConfig };
