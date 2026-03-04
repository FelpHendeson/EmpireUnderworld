import historyConfig from '../../content/history.json';

const replaceTokens = (text, context) =>
  text
    .replace('{playerName}', context.playerName)
    .replace('{backstoryTitle}', context.backstoryTitle.toLowerCase());

export const getPrologueModal = (context) => {
  const chapter = historyConfig.chapters.find((entry) => entry.id === 'chapter-1');
  const prologue = chapter?.entries.find((entry) => entry.condition.type === 'campaignStart');
  if (!prologue) {
    return null;
  }

  return {
    id: prologue.id,
    title: prologue.title,
    text: replaceTokens(prologue.text, context)
  };
};

const conditionMet = (entry, state) => {
  const condition = entry.condition;

  if (condition.type === 'crimeCountAtLeast') {
    return state.crimeHistory.length >= condition.value;
  }

  if (condition.type === 'playerLevelAtLeast') {
    return state.player.level >= condition.value;
  }

  return false;
};

export const getStoryModalFromState = (state) => {
  if (state.storyModal) {
    return state.storyModal;
  }

  const seen = new Set(state.seenStoryEntries ?? []);

  for (const chapter of historyConfig.chapters) {
    for (const entry of chapter.entries) {
      if (entry.condition.type === 'campaignStart') {
        continue;
      }

      if (seen.has(entry.id)) {
        continue;
      }

      if (conditionMet(entry, state)) {
        return {
          id: entry.id,
          title: entry.title,
          text: replaceTokens(entry.text, {
            playerName: state.player.name,
            backstoryTitle: state.player.backstoryTitle
          })
        };
      }
    }
  }

  return null;
};