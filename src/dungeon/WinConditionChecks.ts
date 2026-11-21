import type { GameState, WinCondition } from '../types';
import { liveHeroes } from '../hero/HeroLogic';
import { addLog } from '../core';

// Custom win-condition checks referenced by a WinCondition's
// `checkFulfilled` key. Dungeon validation rejects unknown keys
// (see dungeonValidator) and checkWinConditions in src/game.ts
// dispatches the registered check over the built-in result.
export const onCheckFulfilled: {
  [index: string]: (state: GameState, self: WinCondition) => boolean;
} = {
  hasNecklaceOfLight: (state: GameState, self: WinCondition): boolean => {
    const hasNecklaceOfLight = liveHeroes(state).some((hero) =>
      hero.inventory.some(
        (item) =>
          item &&
          (item.id === 'necklace_of_light' ||
            item.name === 'items.magicItems.necklaceOfLight.name'),
      ),
    );
    if (state.settings['debug']) {
      addLog(state, 'logs.debug.hasNecklaceOfLight', {
        hasNecklaceOfLight: hasNecklaceOfLight ? 'Y' : 'N',
      });
    }
    return self.fulfilled && hasNecklaceOfLight;
  },
};
