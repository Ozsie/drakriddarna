import type { Difficulty, GameState } from '../types';
import { shields } from '../items/shields';
import { weapons } from '../items/weapons';

export const DEFAULT_DIFFICULTY_ID = 'normal';

export const DifficultLevels: Difficulty[] = [
  {
    id: 'easy',
    nameTranslationKey: 'content.difficulty.easy.name',
    descriptionTranslationKey: 'content.difficulty.easy.description',
    modifiers: {
      attack: 1,
      defense: 0,
      movement: 1,
      search: 2,
    },
    monsterBehavior: {
      bowForgottenChance: 0.25,
    },
    events: {
      minMonsterSpawnDistance: 4,
      earliestMonsterRound: 4,
      skipHungryTrollBelowHalfHealth: true,
    },
    startingEquipment: {
      shield: shields[1],
      weapon: weapons[0],
      inventory: [],
    },
  },
  {
    id: 'normal',
    nameTranslationKey: 'content.difficulty.normal.name',
    descriptionTranslationKey: 'content.difficulty.normal.description',
    modifiers: {
      attack: 0,
      defense: 0,
      movement: 0,
      search: 0,
    },
    monsterBehavior: {
      bowForgottenChance: 0.15,
    },
    events: {
      minMonsterSpawnDistance: 3,
      earliestMonsterRound: 3,
      skipHungryTrollBelowHalfHealth: true,
    },
    startingEquipment: {
      weapon: weapons[0],
      inventory: [],
    },
  },
  {
    id: 'hard',
    nameTranslationKey: 'content.difficulty.hard.name',
    descriptionTranslationKey: 'content.difficulty.hard.description',
    modifiers: {
      attack: 0,
      defense: -1,
      movement: -1,
      search: -1,
    },
    monsterBehavior: {
      bowForgottenChance: 0,
    },
    events: {
      minMonsterSpawnDistance: 1,
      earliestMonsterRound: 2,
      skipHungryTrollBelowHalfHealth: false,
    },
    startingEquipment: {
      weapon: weapons[0],
      inventory: [],
    },
  },
];

export const getDifficulty = (state: GameState | undefined): Difficulty =>
  state?.difficulty ??
  DifficultLevels.find((level) => level.id === DEFAULT_DIFFICULTY_ID) ??
  DifficultLevels[1];

export const getEventMinSpawnDistance = (
  difficultyOrState?: Difficulty | GameState | string,
): number => {
  let difficulty: Difficulty | undefined;
  if (typeof difficultyOrState === 'string') {
    difficulty = DifficultLevels.find((d) => d.id === difficultyOrState);
  } else if (difficultyOrState && 'modifiers' in difficultyOrState) {
    difficulty = difficultyOrState;
  } else if (difficultyOrState && 'heroes' in difficultyOrState) {
    difficulty = getDifficulty(difficultyOrState);
  } else {
    difficulty = getDifficulty(undefined);
  }
  return (
    difficulty?.events?.minMonsterSpawnDistance ??
    difficulty?.events?.minSpawnDistance ??
    (difficulty?.id === 'easy' ? 3 : difficulty?.id === 'hard' ? 1 : 2)
  );
};

export const getEarliestMonsterEventRound = (
  difficultyOrState?: Difficulty | GameState | string,
): number => {
  let difficulty: Difficulty | undefined;
  if (typeof difficultyOrState === 'string') {
    difficulty = DifficultLevels.find((d) => d.id === difficultyOrState);
  } else if (difficultyOrState && 'modifiers' in difficultyOrState) {
    difficulty = difficultyOrState;
  } else if (difficultyOrState && 'heroes' in difficultyOrState) {
    difficulty = getDifficulty(difficultyOrState);
  } else {
    difficulty = getDifficulty(undefined);
  }
  return (
    difficulty?.events?.earliestMonsterRound ??
    difficulty?.events?.earliestRound ??
    (difficulty?.id === 'easy' ? 4 : difficulty?.id === 'hard' ? 2 : 3)
  );
};

export const isPartyBelowHalfHealth = (state: GameState): boolean => {
  const heroes = state.heroes;
  if (!heroes || heroes.length === 0) return false;
  const totalMaxHp = heroes.reduce((sum, h) => sum + (h.maxHealth || 0), 0);
  const totalCurrentHp = heroes.reduce(
    (sum, h) => sum + Math.max(0, h.health || 0),
    0,
  );
  if (totalMaxHp === 0) return false;
  return totalCurrentHp / totalMaxHp < 0.5;
};
