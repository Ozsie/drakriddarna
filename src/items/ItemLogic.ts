import type { GameState, Item } from "../types";
import { NEXT_DUNGEON, NEXT_TURN, onReset, onUse, RESET_ON } from "../items/magicItems";

export const useItem = (state: GameState, item: Item) => {
  if (item.effect && state.currentActor) {
    const use = onUse[item.effect];
    use(state, item, state.currentActor, state.targetActor);
    state.targetActor = undefined;
  }
}

export const resetOnNextDungeon = (state: GameState) => {
  state.heroes.forEach((hero) => {
    hero.inventory
      .filter((item) => resetsOnNextDungeon(item))
      .forEach((item) => {
        if (item.reset) {
          const reset = onReset[item.reset];
          reset(state, item);
        }
      });
  });
}

export const resetOnNext = (state: GameState) => {
  state.heroes.forEach((hero) => {
    hero.inventory
      .filter((item) => resetsOnNext(item))
      .forEach((item) => {
        if (item.reset) {
          const reset = onReset[item.reset];
          reset(state, item);
        }
      });
  });
}

const resetsOnNext = (item: Item) => {
  if (item.properties) {
    const resetOn: string[] = item.properties[RESET_ON] ?? [];
    return resetOn.some((resetOn: string) => resetOn === NEXT_TURN);
  }
  return false;
}

const resetsOnNextDungeon = (item: Item) => {
  if (item.properties) {
    const resetOn: string[] = item.properties[RESET_ON] ?? [];
    return resetOn.some((resetOn: string) => resetOn === NEXT_DUNGEON);
  }
  return false;
}
