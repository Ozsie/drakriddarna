import type { Actor, GameState, Item } from '../types';
import { addLog, i18n, roll } from '../game';
import { canAct } from '../hero/HeroLogic';

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
export const onPickup: {
  [index: string]: (state: GameState, self: Item, user: Actor) => void;
} = {
  movementBonusOnPickup: (state: GameState, self: Item, user: Actor) => {
    user.maxMovement += self.properties?.[MOVEMENT_BONUS] as number;
    if (user.actions > 0) {
      user.movement += self.properties?.[MOVEMENT_BONUS] as number;
    }
  },
};
export const onDrop: {
  [index: string]: (state: GameState, self: Item, user: Actor) => void;
} = {
  movementBonusOnDrop: (state: GameState, self: Item, user: Actor) => {
    if (user.maxMovement - 1 > 0)
      user.maxMovement -= self.properties?.[MOVEMENT_BONUS] as number;
    if (user.movement - 1 >= 0)
      user.movement -= self.properties?.[MOVEMENT_BONUS] as number;
  },
};
export const onUse: {
  [index: string]: (
    state: GameState,
    self: Item,
    user: Actor,
    target?: Actor,
  ) => void;
} = {
  magicHerbsOnUse: (
    state: GameState,
    self: Item,
    user: Actor,
    target?: Actor,
  ) => {
    if (self.disabled) {
      addLog(state, 'logs.item.cannotUse', { item: i18n(self.name) });
      return;
    }
    if (!target) {
      addLog(state, 'logs.item.noTarget');
      return;
    }
    if (!canAct(user)) {
      addLog(state, 'logs.heroAction.noActions', { hero: i18n(user.name) });
      return;
    }
    if (self.properties) {
      if (self.properties[USED]) {
        addLog(state, 'logs.item.noUsesLeft', { item: i18n(self.name) });
        return;
      }
      self.properties[USED] = true;
      const addedHealth = Math.min(
        roll(user.level, 3),
        target.maxHealth - target.health,
      );
      target.health += addedHealth;
      addLog(state, 'logs.item.magicHerbs', {
        user: i18n(user.name),
        item: i18n(self.name),
        target: i18n(target.name),
        addedHealth: `${addedHealth}`,
      });
      user.actions--;
      user.movement = user.maxMovement;
    }
  },
  chaosSwordOnUse: (
    state: GameState,
    self: Item,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    user: Actor,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    target?: Actor,
  ) => {
    if (self.disabled) {
      addLog(state, 'logs.item.cannotUse', { item: i18n(self.name) });
      return;
    }
  },
  potionOfSpeedOnUse: (state: GameState, self: Item, user: Actor) => {
    if (self.disabled) {
      addLog(state, 'logs.item.cannotUse', { item: i18n(self.name) });
      return;
    }
    if (!self.properties?.[USED]) {
      user.actions += self.properties?.[ACTIONS_BONUS] as number;
      if (self.properties) self.properties[USED] = true;
      addLog(state, 'logs.item.potionOfSpeed', {
        user: i18n(user.name),
        item: i18n(self.name),
        actions: self.properties?.[ACTIONS_BONUS] as string,
      });
    } else {
      addLog(state, 'logs.item.consumed', { item: i18n(self.name) });
    }
  },
  necklaceOfLightOnUse: (
    state: GameState,
    self: Item,
    user: Actor,
    target?: Actor,
  ) => {
    if (self.disabled) {
      addLog(state, 'logs.item.cannotUse', { item: i18n(self.name) });
      return;
    }
    if (!target) {
      addLog(state, 'logs.item.noTarget');
      return;
    }
    if (!canAct(user)) {
      addLog(state, 'logs.heroAction.noActions', { hero: i18n(user.name) });
      return;
    }
    if (self.properties && !self.properties?.[USED]) {
      self.properties[USED] = true;
      target.ignoredByMonsters = true;
      user.actions--;
    }
  },
};
export const onReset: {
  [index: string]: (state: GameState, self: Item) => void;
} = {
  magicHerbsOnReset: (state: GameState, self: Item) => {
    if (self.properties) self.properties[USED] = false;
  },
  necklaceOfLightOnUse: (state: GameState, self: Item) => {
    if (self.properties) self.properties[USED] = false;
    state.heroes.forEach((hero) => (hero.ignoredByMonsters = false));
  },
};
export const useItem = (state: GameState, item: Item) => {
  if (item.effect && state.currentActor) {
    const use = onUse[item.effect];
    use(state, item, state.currentActor, state.targetActor);
    state.targetActor = undefined;
  }
};

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
};

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
};

const resetsOnNext = (item: Item) => {
  if (item.properties) {
    const resetOn: string[] = (item.properties[RESET_ON] as string[]) ?? [];
    return resetOn.some((resetOn: string) => resetOn === NEXT_TURN);
  }
  return false;
};

const resetsOnNextDungeon = (item: Item) => {
  if (item.properties) {
    const resetOn: string[] = (item.properties[RESET_ON] as string[]) ?? [];
    return resetOn.some((resetOn: string) => resetOn === NEXT_DUNGEON);
  }
  return false;
};
