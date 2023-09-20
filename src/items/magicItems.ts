import type { Actor, GameState, Item } from "../types";
import { ItemType } from "../types";
import { roll } from "../game";

export const USED = 'USED';
export const ATTACK_BONUS = 'ATTACK_BONUS';
export const SEARCH_BONUS = 'SEARCH_BONUS';
export const BREAK_LOCK = 'BREAK_LOCK';
export const RE_ROLL_ATTACK = 'RE_ROLL_ATTACK';
export const DESCRIPTION = 'DESCRIPTION';
export const ACTIVE = 'ACTIVE';

export const magicItems: Item[] = [
  {
    name: 'Healing Herbs',
    type: ItemType.MAGIC,
    value: 0,
    amountInDeck: 1,
    properties: {
      USED: false,
      ACTIVE: true,
      DESCRIPTION: 'Chance to heal up to 3 wounds on one hero.',
    },
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
    properties: {
      DESCRIPTION: 'Gives one additional step for each move action.',
    },
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
      DESCRIPTION: 'One additional attack die. Breaks locked doors.',
      BREAK_DOOR: true,
      ATTACK_BONUS: 1
    },
  },
  {
    name: 'Ring of Precision',
    type: ItemType.MAGIC,
    value: 0,
    amountInDeck: 1,
    properties: {
      DESCRIPTION: 'May re-roll one completely missed attack.',
      RE_ROLL_ATTACK: true,
    },
  },
  {
    name: 'Crown of Wisdom',
    type: ItemType.MAGIC,
    value: 0,
    amountInDeck: 1,
    properties: {
      DESCRIPTION: 'One additional die roll when searching.',
      SEARCH_BONUS: 1,
    },
  },
];