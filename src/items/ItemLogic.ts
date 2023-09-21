import type { GameState, Item } from "../types";
import { onUse } from "../items/magicItems";

export const useItem = (state: GameState, item: Item) => {
  const use = onUse[item.effect];
  if (item.effect && state.currentActor) {
    use(state, item, state.currentActor, state.targetActor);
    state.targetActor = undefined;
  }
}