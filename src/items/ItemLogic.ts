import type { Actor, GameState, Item } from '../types';
import { Level } from '../types';
import { addLog, i18n } from '../core';
import { roll } from '../core';
import {
  canAct,
  ATTACK_BONUS,
  RE_ROLL_ATTACK,
  getEffectiveMaxMovement,
} from '../core';

export const USED = 'USED';
export { ATTACK_BONUS };
export const SEARCH_BONUS = 'SEARCH_BONUS';
export const BREAK_LOCK = 'BREAK_LOCK';
export { RE_ROLL_ATTACK };
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
export const resolveChaosSwordAttack = (
  state: GameState,
  user: Actor,
  target: Actor,
): void => {
  const hits = roll(user.level, 4);

  const killTarget = () => {
    target.health = 0;
    target.level = Level.APPRENTICE;
    const monster = state.dungeon.layout.monsters.find((m) => m === target);
    if (monster) {
      state.dungeon.layout.monsters = state.dungeon.layout.monsters.filter(
        (m) => m !== monster,
      );
      state.dungeon.killCount++;
      user.experience += monster.experience;
    }
  };

  switch (hits) {
    case 0:
      addLog(state, 'logs.item.chaosSwordInstantKill', {
        user: i18n(user.name),
        target: i18n(target.name),
      });
      killTarget();
      break;
    case 1:
      addLog(state, 'logs.item.chaosSwordStumble', { user: i18n(user.name) });
      user.movement = 0;
      user.actions = 0;
      user.incapacitated = true;
      break;
    case 2:
    case 3: {
      const damage = hits === 2 ? 2 : 1;
      target.health -= damage;
      addLog(state, 'logs.item.chaosSwordHit', {
        user: i18n(user.name),
        target: i18n(target.name),
        damage: String(damage),
      });
      if (target.health <= 0) {
        addLog(state, 'logs.takeDamage.killed', {
          actor: i18n(user.name),
          target: i18n(target.name),
        });
        killTarget();
      }
      break;
    }
    default:
      addLog(state, 'logs.item.chaosSwordMiss', { user: i18n(user.name) });
      break;
  }
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
    resolveChaosSwordAttack(state, user, target);
    if (user.actions === 0) {
      return;
    }
    if (user.actions > 1 && user.movement < getEffectiveMaxMovement(user)) {
      user.actions -= 2;
    } else {
      user.actions--;
    }
    if (user.actions === 0) {
      user.movement = 0;
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
        actions: String(self.properties?.[ACTIONS_BONUS] ?? ''),
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
  necklaceOfLightOnReset: (state: GameState, self: Item) => {
    if (self.properties) self.properties[USED] = false;
    state.heroes.forEach((hero) => (hero.ignoredByMonsters = false));
  },
  // Backward compatibility alias
  necklaceOfLightOnUse: (state: GameState, self: Item) => {
    if (self.properties) self.properties[USED] = false;
    state.heroes.forEach((hero) => (hero.ignoredByMonsters = false));
  },
};
export const useItem = (state: GameState, item: Item) => {
  if (item && item.effect && state.currentActor) {
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
        if (item && item.reset) {
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
        if (item && item.reset) {
          const reset = onReset[item.reset];
          reset(state, item);
        }
      });
  });
};

const resetsOnNext = (item: Item) => {
  if (item && item.properties) {
    const resetOn: string[] = (item.properties[RESET_ON] as string[]) ?? [];
    return resetOn.some((resetOn: string) => resetOn === NEXT_TURN);
  }
  return false;
};

const resetsOnNextDungeon = (item: Item) => {
  if (item && item.properties) {
    const resetOn: string[] = (item.properties[RESET_ON] as string[]) ?? [];
    return resetOn.some((resetOn: string) => resetOn === NEXT_DUNGEON);
  }
  return false;
};
