import type { Actor, GameState, Item } from "../types";
import { ItemType } from "../types";
import { roll } from "../game";

export const USED = 'USED';
export const ATTACK_BONUS = 'ATTACK_BONUS';
export const BREAK_LOCK = 'BREAK_LOCK';

export const magicItems: Item[] = [
  {
    name: 'Healing Herbs',
    type: ItemType.MAGIC,
    value: 0,
    amountInDeck: 1,
    properties: { USED: false },
    effect: (state: GameState, self: Item, user: Actor, target?: Actor) => {
      if (self.properties && target) {
        if (self.properties[USED]) return;
        self.properties[USED] = true;
        target.health += roll(user.level, 3);
      }
    },
    reset: (state: GameState, self: Item) => {
      if (self.properties) self.properties[USED] = false;
    }
  },
  {
    name: 'Thousand League Boots',
    type: ItemType.MAGIC,
    value: 0,
    amountInDeck: 1,
    pickup: (state: GameState, self: Item, user: Actor) => {
      user.maxMovement++;
      user.movement++;
    },
    drop: (state: GameState, self: Item, user: Actor) => {
      if (user.maxMovement - 1 > 0) user.maxMovement--;
      if (user.movement - 1 >= 0) user.movement--;
    },
  },
  {
    name: 'Giants Glove',
    type: ItemType.MAGIC,
    value: 0,
    amountInDeck: 1,
    properties: {
      BREAK_DOOR: true,
      ATTACK_BONUS: 1
    },
  }
];