export const LEVEL_UP_POINTS = 2;

export const getLevelFromXp = (xp) => 1 + Math.floor(xp / 50);

export const applyXpGain = (player, xpGain) => {
  const nextXp = player.xp + xpGain;
  const nextLevel = getLevelFromXp(nextXp);
  const gainedLevels = Math.max(0, nextLevel - player.level);

  return {
    ...player,
    xp: nextXp,
    level: nextLevel,
    unspentPoints: player.unspentPoints + gainedLevels * LEVEL_UP_POINTS
  };
};

export const distributeAttributePoint = (player, attribute) => {
  if (player.unspentPoints <= 0) {
    return player;
  }

  const nextPlayer = {
    ...player,
    unspentPoints: player.unspentPoints - 1
  };

  if (attribute === 'health') {
    nextPlayer.maxHealth += 10;
    nextPlayer.health += 10;
  }

  if (attribute === 'attack') {
    nextPlayer.attack += 2;
  }

  if (attribute === 'defense') {
    nextPlayer.defense += 2;
  }

  if (attribute === 'combatProficiency') {
    nextPlayer.combatProficiency += 1;
  }

  if (attribute === 'speed') {
    nextPlayer.speed += 1;
  }

  return nextPlayer;
};