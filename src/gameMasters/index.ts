import { createDirectorRegistry } from '@hoard-engine/directors';
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

// The resolution mechanics (alias, then id, then fallback) live in the
// @hoard-engine/directors engine package; this facade keeps the discovery,
// the alias contents and the default id, which are game knowledge.
const directorRegistry = createDirectorRegistry<GameMaster>({
  directors: gameMasters,
  aliases: GAME_MASTER_ALIASES,
  defaultId: DEFAULT_GAME_MASTER_ID,
});

// The registry only resolves `undefined` against zero directors; the three
// built-in masters always exist, so the fallback chain always lands. Callers
// keep the historical, always-defined signature.
const always = (gm: GameMaster | undefined, idOrAlias: string): GameMaster => {
  if (!gm) {
    throw new Error(`No game master resolves for '${idOrAlias}'.`);
  }
  return gm;
};

export const getGameMaster = (
  idOrAlias: string = DEFAULT_GAME_MASTER_ID,
): GameMaster => always(directorRegistry.resolve(idOrAlias), idOrAlias);

export const isKnownGameMaster = (idOrAlias: string): boolean =>
  directorRegistry.isKnown(idOrAlias);
