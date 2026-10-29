import type { Dungeon, GameState, GameMaster, Monster } from './types';
import { Colour } from './types';
import {
  COLLAPSED,
  DEFAULT_GAME_MASTER_ID,
  getGameMaster,
  toArray,
} from './core';
import { getMonsterTemplate } from './monsters/MonsterRegistry';

// Save format versions, in order. Bump CURRENT_SAVE_VERSION when the
// persisted shape changes and add a migration below; old saves migrate
// through every missing step, current saves pass through untouched.
//   1 — the game master collapses into a single `gameMaster` field
//       (legacy saves carry `difficulty` and/or `gameMasterId`)
//   2 — landslides track every collapse with its exact cells in
//       `collapsedCorridors` (legacy saves carry a single
//       `collapsedCorridor` letter on the dungeon)
//   3 — monster display names become translation keys (legacy saves carry
//       raw English names like 'Orc (Green)' in `name`/`nameTranslationKey`)
export const CURRENT_SAVE_VERSION = 3;

/** Collapses the legacy `difficulty`/`gameMasterId` fields into `gameMaster`. */
export const migrateGameMasterFields = (state: GameState): void => {
  const legacy = state as GameState & {
    difficulty?: GameMaster;
    gameMasterId?: string;
  };
  if (!state.gameMaster) {
    state.gameMaster =
      (legacy.difficulty
        ? legacy.difficulty.modifiers
          ? legacy.difficulty
          : getGameMaster(legacy.difficulty.id)
        : undefined) ??
      (legacy.gameMasterId ? getGameMaster(legacy.gameMasterId) : undefined) ??
      getGameMaster(DEFAULT_GAME_MASTER_ID);
  }
  delete legacy.difficulty;
  delete legacy.gameMasterId;
};

/**
 * Converts a legacy single-letter `collapsedCorridor` into restore groups.
 * The whole pending chain is migrated: nothing re-runs migrations when a
 * nextDungeon later becomes the active dungeon, so its restore groups must
 * exist by the time the save is loaded.
 */
export const migrateCollapsedCorridor = (state: GameState): void => {
  let dungeon: Dungeon | undefined = state.dungeon;
  while (dungeon) {
    migrateCollapsedCorridorOnDungeon(dungeon);
    dungeon = dungeon.nextDungeon;
  }
};

const migrateCollapsedCorridorOnDungeon = (dungeon: Dungeon): void => {
  const legacyDungeon = dungeon as Dungeon & {
    collapsedCorridor?: string;
  };
  if (!legacyDungeon.collapsedCorridor) {
    return;
  }
  const collapsedCells: { x: number; y: number }[] = [];
  legacyDungeon.layout.grid.forEach((row, y) => {
    toArray(row).forEach((cell, x) => {
      if (cell === COLLAPSED) {
        collapsedCells.push({ x, y });
      }
    });
  });
  if (collapsedCells.length > 0) {
    legacyDungeon.collapsedCorridors = [
      ...(legacyDungeon.collapsedCorridors ?? []),
      { letter: legacyDungeon.collapsedCorridor, cells: collapsedCells },
    ];
  }
  delete legacyDungeon.collapsedCorridor;
};

const migrateMonsterName = (monster: Monster): void => {
  const baseKey = getMonsterTemplate(monster.type)?.nameTranslationKey;
  if (!baseKey) {
    return;
  }
  const colourIndex = Object.values(Colour).indexOf(monster.colour);
  if (colourIndex < 0) {
    return;
  }
  const colourName = Object.keys(Colour)[colourIndex].toLowerCase();
  monster.name = `${baseKey}.${colourName}`;
  monster.nameTranslationKey = monster.name;
};

/**
 * Rewrites legacy English monster display names ('Orc (Green)') into the
 * translation keys createMonster now produces ('monsters.orc.green'), so
 * monsters in already-running games translate too. The whole pending
 * dungeon chain is migrated, matching `migrateCollapsedCorridor`.
 */
export const migrateMonsterNames = (state: GameState): void => {
  let dungeon: Dungeon | undefined = state.dungeon;
  while (dungeon) {
    dungeon.layout.monsters.forEach(migrateMonsterName);
    dungeon = dungeon.nextDungeon;
  }
  const target = state.targetActor as Monster | undefined;
  if (target && target.type) {
    migrateMonsterName(target);
  }
};

/** Runs every missing migration step, in order, and stamps the version. */
export const migrateSaveState = (state: GameState): void => {
  const version = state.saveVersion ?? 0;
  if (version < 1) {
    migrateGameMasterFields(state);
  }
  if (version < 2) {
    migrateCollapsedCorridor(state);
  }
  if (version < 3) {
    migrateMonsterNames(state);
  }
  state.saveVersion = CURRENT_SAVE_VERSION;
};
