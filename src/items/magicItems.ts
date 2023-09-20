import type { Actor, GameState, Item } from "../types";
import { ItemType } from "../types";
import { roll } from "../game";

export const magicItems: Item[] = [
  {
    name: 'Healing Herbs',
    type: ItemType.MAGIC,
    value: 0,
    amountInDeck: 1,
    properties: { 'used': false },
    effect: (state: GameState, self: Item, user: Actor, target?: Actor) => {
      if (self.properties && target) {
        if (self.properties['used']) return;
        self.properties['used'] = true;
        target.health += roll(user.level, 3);
      }
    },
    reset: (state: GameState, self: Item) => {
      if (self.properties) self.properties['used'] = false;
    }
  },
  {
    name: 'Thousand League Boots',
    type: ItemType.MAGIC,
    value: 0,
    amountInDeck: 1,
    properties: { 'passive': true },
    pickup: (state: GameState, self: Item, user: Actor) => {
      user.maxMovement++;
      user.movement++;
    },
    drop: (state: GameState, self: Item, user: Actor) => {
      if (user.maxMovement - 1 > 0) user.maxMovement--;
      if (user.movement - 1 >= 0) user.movement--;
    },
  }
];