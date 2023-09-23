import type {
  Actor,
  GameState,
  Item
} from "../types";
import { ItemType } from "../types";
import {
  addLog,
  roll
} from "../game";
import { canAct } from "../hero/HeroLogic";

export const USED = 'USED';
export const ATTACK_BONUS = 'ATTACK_BONUS';
export const SEARCH_BONUS = 'SEARCH_BONUS';
export const BREAK_LOCK = 'BREAK_LOCK';
export const RE_ROLL_ATTACK = 'RE_ROLL_ATTACK';
export const DESCRIPTION = 'DESCRIPTION';
export const ACTIVE = 'ACTIVE';
export const MOVEMENT_BONUS = 'MOVEMENT_BONUS';
export const ACTIONS_BONUS = 'ACTIONS_BONUS';
export const RESET_ON = 'RESET_ON';

export const NEXT_TURN = 'NEXT_TURN';
export const TRADE = 'TRADE';
export const NEXT_DUNGEON = 'NEXT_SCENARIO';

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
      RESET_ON: [TRADE, NEXT_DUNGEON]
    },
    effect: 'magicHerbsOnUse',
    reset: 'magicHerbsOnReset',
  },
  {
    name: 'Thousand League Boots',
    type: ItemType.MAGIC,
    value: 0,
    amountInDeck: 1,
    properties: {
      DESCRIPTION: 'Gives one additional step for each move action.',
      MOVEMENT_BONUS: 1,
    },
    pickup: 'movementBonusOnPickup',
    drop: 'movementBonusOnDrop',
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
  {
    name: 'Sword of Chaos',
    type: ItemType.MAGIC,
    value: 0,
    amountInDeck: 1,
    properties: {
      DESCRIPTION: `A sword with a will of it's own. Use at your own peril.`
    },
    effect: 'chaosSwordOnUse'
  },
  {
    name: 'Potion of Speed',
    type: ItemType.MAGIC,
    value: 0,
    amountInDeck: 1,
    properties: {
      DESCRIPTION: 'Gives 2 additional actions. Can only be used once.',
      USED: false,
      ACTIONS_BONUS: 2,
      ACTIVE: true,
    },
    effect: 'potionOfSpeedOnUse'
  },
  {
    name: 'Necklace of Light',
    type: ItemType.MAGIC,
    value: 0,
    amountInDeck: 1,
    properties: {
      USED: false,
      RESET_ON: [NEXT_TURN],
      ACTIVE: true,
    },
    effect: 'necklaceOfLightOnUse',
    reset: 'necklaceOfLightOnReset'
  }
];

export const onPickup: {[index: string]:(state: GameState, self: Item, user: Actor) => void} = {
  movementBonusOnPickup: (state: GameState, self: Item, user: Actor) => {
    user.maxMovement += self.properties?.[MOVEMENT_BONUS];
    user.movement += self.properties?.[MOVEMENT_BONUS];
  },
}

export const onDrop: {[index: string]:(state: GameState, self: Item, user: Actor) => void} = {
  movementBonusOnDrop: (state: GameState, self: Item, user: Actor) => {
    if (user.maxMovement - 1 > 0) user.maxMovement -= self.properties?.[MOVEMENT_BONUS];
    if (user.movement - 1 >= 0) user.movement -= self.properties?.[MOVEMENT_BONUS];
  },
}

export const onUse: {[index: string]: (state: GameState, self: Item, user: Actor, target?: Actor) => void} = {
  magicHerbsOnUse: (state: GameState, self: Item, user: Actor, target?: Actor) => {
    if (self.disabled) {
      addLog(state, `${self.name} cannot be used at this moment.`);
      return;
    }
    if (!target) {
      addLog(state, `No target was selected.`);
      return;
    }
    if (!canAct(user)) {
      addLog(state, `${user.name} has no actions left.`);
      return;
    }
    if (self.properties) {
      if (self.properties[USED]) {
        addLog(state, `${self.name} has no uses left.`);
        return;
      }
      self.properties[USED] = true;
      let addedHealth = Math.min(roll(user.level, 3), target.maxHealth - target.health);
      target.health += addedHealth;
      addLog(state, `${user.name} used ${self.name} on ${target.name}, restoring ${addedHealth} HP`);
      user.actions--;
      user.movement = user.maxMovement;
    }
  },
  chaosSwordOnUse: (state: GameState, self: Item, user: Actor, target?: Actor) => {
    if (self.disabled) {
      addLog(state, `${self.name} cannot be used at this moment.`);
      return;
    }

  },
  potionOfSpeedOnUse: (state: GameState, self: Item, user: Actor) => {
    if (self.disabled) {
      addLog(state, `${self.name} cannot be used at this moment.`);
      return;
    }
    if (!self.properties?.[USED]) {
      user.actions += self.properties?.[ACTIONS_BONUS];
      if (self.properties) self.properties[USED] = true;
      addLog(state, `${user.name} used ${self.name}, adding ${self.properties?.[ACTIONS_BONUS]} actions`);
    } else {
      addLog(state, `${self.name} has been consumed.`);
    }
  },
  necklaceOfLightOnUse: (state: GameState, self: Item, user: Actor, target?: Actor) => {
    if (self.disabled) {
      addLog(state, `${self.name} cannot be used at this moment.`);
      return;
    }
    if (!target) {
      addLog(state, `No target was selected.`);
      return;
    }
    if (!canAct(user)) {
      addLog(state, `${user.name} has no actions left.`);
      return;
    }
    if (self.properties && !self.properties?.[USED]) {
      self.properties[USED] = true;
      target.ignoredByMonsters = true;
      user.actions--;
    }
  }
}

export const onReset: {[index: string]: (state: GameState, self: Item) => void} = {
  magicHerbsOnReset: (state: GameState, self: Item) => {
    if (self.properties) self.properties[USED] = false;
  },
  necklaceOfLightOnUse: (state: GameState, self: Item) => {
    if (self.properties) self.properties[USED] = false;
    state.heroes.forEach((hero) => hero.ignoredByMonsters = false);
  }
}
