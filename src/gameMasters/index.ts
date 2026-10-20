import type { GameMaster } from '../types';

// Auto-discover every game master under src/gameMasters/*/gameMaster.ts so that
// additional, self-contained game masters are automatically registered without
// touching this file.
const gameMasterModules = import.meta.glob<{ default: GameMaster }>(
  './*/gameMaster.ts',
  { eager: true },
);

export const gameMasters: Record<string, GameMaster> = Object.values(
  gameMasterModules,
).reduce<Record<string, GameMaster>>((registry, mod) => {
  const gm = mod.default;
  registry[gm.id] = gm;
  return registry;
}, {});

export const DEFAULT_GAME_MASTER_ID = 'tactician';

export const GAME_MASTER_ALIASES: Record<string, string> = {
  easy: 'storyTeller',
  storyteller: 'storyTeller',
  storyTeller: 'storyTeller',
  'story-teller': 'storyTeller',
  'story teller': 'storyTeller',
  normal: 'tactician',
  medium: 'tactician',
  tactician: 'tactician',
  hard: 'brutalOverlord',
  overlord: 'brutalOverlord',
  brutalOverlord: 'brutalOverlord',
  'brutal-overlord': 'brutalOverlord',
  'brutal overlord': 'brutalOverlord',
};

export const getGameMaster = (
  idOrAlias: string = DEFAULT_GAME_MASTER_ID,
): GameMaster => {
  const targetId = GAME_MASTER_ALIASES[idOrAlias] ?? idOrAlias;
  const gm = gameMasters[targetId];
  if (!gm) {
    return gameMasters[DEFAULT_GAME_MASTER_ID] ?? Object.values(gameMasters)[0];
  }
  return gm;
};

export const isKnownGameMaster = (idOrAlias: string): boolean => {
  const targetId = GAME_MASTER_ALIASES[idOrAlias] ?? idOrAlias;
  return targetId in gameMasters;
};
