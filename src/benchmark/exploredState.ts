import type { Dungeon, GameState, Hero } from '../types';
import { createSeededRng, resetRng, setRng, toArray } from '../core';
import { init } from '../game';
import { resetLiveHeroes } from '../hero/HeroLogic';
import { DEFAULT_CAMPAIGN_ID } from '../campaigns';
import { DEFAULT_GAME_MASTER_ID } from '../gameMasters';

export interface ExploredStateOptions {
  campaignId?: string;
  gameMasterId?: string;
  seed?: number;
  explored?: boolean;
}

// Build a state for a selected dungeon. Supply a seed for deterministic
// initialization; discovery can be controlled without mutating authored content.
export const createExploredState = (
  dungeon: Dungeon,
  options: ExploredStateOptions = {},
): GameState => {
  const seed = options.seed;
  setRng(createSeededRng(seed ?? 42));
  try {
    const state = init(
      options.campaignId ?? DEFAULT_CAMPAIGN_ID,
      options.gameMasterId ?? DEFAULT_GAME_MASTER_ID,
      seed,
    );
    state.dungeon = structuredClone(dungeon);
    resetLiveHeroes(state);
    state.currentActor = state.heroes[0] as Hero | undefined;

    if (options.explored !== false) {
      const rooms = new Set<string>();
      state.dungeon.layout.grid.forEach((row) => {
        toArray(row).forEach((cell) => {
          if (cell) rooms.add(cell);
        });
      });
      state.dungeon.discoveredRooms = [...rooms];
      state.dungeon.layout.secrets?.forEach((secret) => {
        secret.found = true;
      });
      state.dungeon.layout.notes?.forEach((note) => {
        note.found = true;
      });
    }
    return state;
  } finally {
    resetRng();
  }
};
