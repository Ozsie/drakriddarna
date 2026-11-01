// UI actions: what a UI hit does to the game state. The renderer layer
// stays free of side effects; these are the only place a chrome hit
// reaches into the game.

import type { GameState } from '../../types';
import { addLog, startDungeonTimer } from '../../core';

/**
 * Dismisses the dungeon intro: the intro text becomes a diary note and
 * closing the intro starts the dungeon's timer (a no-op when it already
 * runs, e.g. a dungeon without an intro).
 */
export const dismissDungeonIntro = (
  state: GameState | null | undefined,
): boolean => {
  if (!state?.dungeon?.intro) return false;
  const dungeon = state.dungeon;
  addLog(state, dungeon.intro);
  startDungeonTimer(state);

  if (!dungeon.layout) {
    dungeon.layout = {
      grid: [],
      doors: [],
      monsters: [],
      secrets: [],
      notes: [],
      items: [],
      corridors: [],
      corners: [],
    };
  }
  if (!dungeon.layout.notes) {
    dungeon.layout.notes = [];
  }

  if (!dungeon.layout.notes.find((note) => note.message === dungeon.intro)) {
    dungeon.layout.notes.push({
      found: true,
      foundOn: 0,
      message: dungeon.intro,
      position: { x: 0, y: 0 },
    });
  }

  return true;
};
