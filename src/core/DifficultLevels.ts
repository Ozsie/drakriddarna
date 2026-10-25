import type { GameMaster, GameState } from '../types';
import {
  gameMasters,
  getGameMaster,
  DEFAULT_GAME_MASTER_ID,
  GAME_MASTER_ALIASES,
} from '../gameMasters';

export {
  gameMasters,
  getGameMaster,
  DEFAULT_GAME_MASTER_ID,
  GAME_MASTER_ALIASES,
};

export const DEFAULT_DIFFICULTY_ID = DEFAULT_GAME_MASTER_ID;

export const DifficultLevels: GameMaster[] = Object.values(gameMasters);

export const getDifficulty = (state: GameState | undefined): GameMaster =>
  state?.difficulty ??
  state?.gameMaster ??
  getGameMaster(state?.gameMasterId ?? DEFAULT_DIFFICULTY_ID);

export const getEventMinSpawnDistance = (
  difficultyOrState?: GameMaster | GameState | string,
): number => {
  let difficulty: GameMaster | undefined;
  if (typeof difficultyOrState === 'string') {
    difficulty = getGameMaster(difficultyOrState);
  } else if (difficultyOrState && 'modifiers' in difficultyOrState) {
    difficulty = difficultyOrState;
  } else if (difficultyOrState && 'heroes' in difficultyOrState) {
    difficulty = getDifficulty(difficultyOrState);
  } else {
    difficulty = getDifficulty(undefined);
  }
  return (
    difficulty?.events?.minMonsterSpawnDistance ??
    (difficulty?.id === 'storyTeller' || difficulty?.id === 'easy'
      ? 4
      : difficulty?.id === 'brutalOverlord' || difficulty?.id === 'hard'
      ? 1
      : 3)
  );
};

export const getEarliestMonsterEventRound = (
  difficultyOrState?: GameMaster | GameState | string,
): number => {
  let difficulty: GameMaster | undefined;
  if (typeof difficultyOrState === 'string') {
    difficulty = getGameMaster(difficultyOrState);
  } else if (difficultyOrState && 'modifiers' in difficultyOrState) {
    difficulty = difficultyOrState;
  } else if (difficultyOrState && 'heroes' in difficultyOrState) {
    difficulty = getDifficulty(difficultyOrState);
  } else {
    difficulty = getDifficulty(undefined);
  }
  return (
    difficulty?.events?.earliestMonsterRound ??
    (difficulty?.id === 'storyTeller' || difficulty?.id === 'easy'
      ? 4
      : difficulty?.id === 'brutalOverlord' || difficulty?.id === 'hard'
      ? 2
      : 3)
  );
};

export const isPartyBelowHalfHealth = (state: GameState): boolean => {
  const heroes = state.heroes;
  if (!heroes || heroes.length === 0) return false;
  const healthModifier = getDifficulty(state).modifiers.health ?? 0;
  const totalMaxHp = heroes.reduce((sum, h) => {
    const heroMaxHealth = h.maxHealth + healthModifier;
    return sum + (heroMaxHealth || 0);
  }, 0);
  const totalCurrentHp = heroes.reduce(
    (sum, h) => sum + Math.max(0, h.health || 0),
    0,
  );
  if (totalMaxHp === 0) return false;
  return totalCurrentHp / totalMaxHp < 0.5;
};
