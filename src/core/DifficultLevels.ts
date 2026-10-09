import type { Difficulty, GameState } from '../types';

export const DEFAULT_DIFFICULTY_ID = 'normal';

export const DifficultLevels: Difficulty[] = [
  {
    id: 'easy',
    nameTranslationKey: 'content.difficulty.easy.name',
    descriptionTranslationKey: 'content.difficulty.easy.description',
    modifiers: {
      attack: 1,
      defense: 1,
      movement: 1,
      search: 2,
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
  },
];

export const getDifficulty = (state: GameState | undefined): Difficulty =>
  state?.difficulty ??
  DifficultLevels.find((level) => level.id === DEFAULT_DIFFICULTY_ID) ??
  DifficultLevels[1];
