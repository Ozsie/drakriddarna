import type { Dungeon, GameState, GameMaster } from './types';
import {
  COLLAPSED,
  DEFAULT_GAME_MASTER_ID,
  getGameMaster,
  toArray,
} from './core';

// Save format versions, in order. Bump CURRENT_SAVE_VERSION when the
// persisted shape changes and add a migration below; old saves migrate
// through every missing step, current saves pass through untouched.
//   1 — the game master collapses into a single `gameMaster` field
//       (legacy saves carry `difficulty` and/or `gameMasterId`)
//   2 — landslides track every collapse with its exact cells in
//       `collapsedCorridors` (legacy saves carry a single
//       `collapsedCorridor` letter on the dungeon)
export const CURRENT_SAVE_VERSION = 2;

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

/** Converts a legacy single-letter `collapsedCorridor` into restore groups. */
export const migrateCollapsedCorridor = (state: GameState): void => {
  // Only the active dungeon is migrated — an untouched nextDungeon keeps
  // its legacy shape and migrates when it becomes active.
  const legacyDungeon = state.dungeon as Dungeon & {
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

/** Runs every missing migration step, in order, and stamps the version. */
export const migrateSaveState = (state: GameState): void => {
  const version = state.saveVersion ?? 0;
  if (version < 1) {
    migrateGameMasterFields(state);
  }
  if (version < 2) {
    migrateCollapsedCorridor(state);
  }
  state.saveVersion = CURRENT_SAVE_VERSION;
};
