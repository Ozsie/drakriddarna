import type {
  Actor,
  Armour,
  GameState,
  Hero,
  Item,
  Position,
  Secret,
  Shield,
  Weapon,
} from '../types';
import { Colour, ItemType, Level, SecretType } from '../types';
import {
  addLog,
  isNeighbouring,
  isSamePosition,
  roll,
  takeDamage,
} from '../game';
import { onPickup, SEARCH_BONUS } from '../items/magicItems';

export const searchForSecret = (state: GameState) => {
  const hero = state.currentActor as Hero;
  if (hero.blinded) {
    addLog(state, `${hero.name} is blinded and may not search.`);
    return;
  }
  const searchBonus = hero.inventory
    .filter((item) => item.properties?.[SEARCH_BONUS])
    .map((item) => {
      addLog(
        state,
        `${hero.name} used the effect of ${item.name} when searching`,
      );
      return item.properties?.[SEARCH_BONUS] as number;
    })
    .reduce((partial, bonus) => partial + bonus, 0);
  const result = roll(hero.level, 1 + searchBonus);
  let trapDoor, hiddenDoor, trap, secret;
  if (result >= 1) {
    trapDoor = lookForTrapDoor(state, hero, result);
    if (!trapDoor) {
      hiddenDoor = lookForHiddenDoor(state, hero, result);
    }
    if (!trapDoor && !hiddenDoor) {
      trap = lookForTrap(state, hero, result);
    }
    if (!trapDoor && !hiddenDoor && !trap) {
      secret = lookForSecret(state, hero, result);
    }
    if (!trapDoor && !hiddenDoor && !trap && !secret) {
      addLog(state, `${hero.name} searched but found nothing`);
    }
  } else {
    addLog(state, `${hero.name} searched but found nothing`);
  }
};

export const checkForTrapDoor = (state: GameState) => {
  const actor = state.currentActor;
  if (!actor) return false;
  const trap = state.dungeon.layout.secrets
    .filter((secret) => secret.type === SecretType.TRAP_DOOR)
    .filter((secret) => !secret.found)
    .find((secret) => isSamePosition(secret.position, actor.position));
  if (trap) {
    takeDamage(state, secretAsActor(trap), actor, false);
    addLog(
      state,
      `${actor.name} fell into a pit and is incapacitated for one turn.`,
    );
    actor.movement = 0;
    actor.actions = 0;
    actor.incapacitated = true;
    trap.found = true;
    return true;
  }
  return false;
};

export const removeFoundItemFromDeck = (state: GameState, item: Item) => {
  const index = state.itemDeck.findIndex(
    (i) => i.type === item.type && i.name === item.name,
  );
  state.itemDeck.splice(index, 1);
};

export const removeFoundMagicItemFromDeck = (state: GameState, item: Item) => {
  const index = state.magicItemDeck.findIndex(
    (i) => i.type === item.type && i.name === item.name,
  );
  state.magicItemDeck.splice(index, 1);
};

const secretAsActor = (secret: Secret): Actor => ({
  health: 0,
  position: secret.position,
  defense: 0,
  experience: 0,
  actions: 0,
  movement: 0,
  maxMovement: 0,
  colour: Colour.Red,
  maxHealth: 0,
  name: 'Trap Door',
  level: Level.APPRENTICE,
  incapacitated: false,
  weapon: {
    name: 'Falling',
    amountInDeck: 0,
    dice: 3,
    useHearHeroes: true,
    twoHanded: false,
    range: 1,
    type: ItemType.WEAPON,
    value: 0,
    ignoresShield: true,
    ignoresArmour: true,
  },
  inventory: [],
});

const findHiddenDoor = (state: GameState, pos: Position) =>
  state.dungeon.layout.doors
    .filter((secret) => secret.hidden)
    .find((door) => isNeighbouring({ x: door.x, y: door.y }, pos.x, pos.y));

const findTrap = (state: GameState, pos: Position) =>
  state.dungeon.layout.doors
    .filter((door) => door.trapped)
    .find((door) => door.x === pos.x && door.y === pos.y);

const findSecret = (state: GameState, pos: Position) =>
  state.dungeon.layout.secrets
    .filter((secret) => !secret.found)
    .find((secret) => isNeighbouring(secret.position, pos.x, pos.y));

const findTrapDoor = (state: GameState, pos: Position) =>
  state.dungeon.layout.secrets
    .filter((secret) => !secret.found)
    .filter((secret) => secret.type === SecretType.TRAP_DOOR)
    .find((secret) => isNeighbouring(secret.position, pos.x, pos.y));

const lookForHiddenDoor = (state: GameState, hero: Hero, result: number) => {
  const hiddenDoor = findHiddenDoor(state, hero.position);
  if (hiddenDoor) {
    addLog(state, `${hero.name} searched (${result}) and found a hidden door`);
    return true;
  }
  return false;
};

const lookForTrap = (state: GameState, hero: Hero, result: number) => {
  const trap = findTrap(state, hero.position);
  if (trap) {
    addLog(
      state,
      `${hero.name} searched (${result}) and found a trap in a door`,
    );
    trap.trapped = false;
    return true;
  }
  return false;
};

const lookForSecret = (state: GameState, hero: Hero, result: number) => {
  const secret = findSecret(state, hero.position);
  if (secret) {
    addLog(state, `${hero.name} searched (${result}) and found ${secret.name}`);
    secret.found = true;
    switch (secret.type) {
      case SecretType.EQUIPMENT: {
        const item = secret.item ?? randomItem(state);
        if (item.amountInDeck > 0) {
          removeFoundItemFromDeck(state, item);
          addLog(state, `${hero.name} equipped (${item.name})`);
          switch (item.type) {
            case ItemType.ARMOUR:
              if (hero.armour) hero.inventory.push(hero.armour);
              hero.armour = item as Armour;
              break;
            case ItemType.SHIELD:
              if (hero.shield) hero.inventory.push(hero.shield);
              hero.shield = item as Shield;
              break;
            case ItemType.WEAPON:
              if (hero.weapon) hero.inventory.push(hero.weapon);
              hero.weapon = item as Weapon;
              break;
          }
        }
        break;
      }
      case SecretType.MAGIC_ITEM: {
        const item = secret.item ?? randomMagicItem(state);
        if (item.amountInDeck > 0) {
          removeFoundMagicItemFromDeck(state, item);
          addLog(state, `${hero.name} found (${item.name})`);
          hero.inventory.push(item);
          if (item.pickup) onPickup[item.pickup](state, item, hero);
        }
        break;
      }
    }
    return true;
  }
  return false;
};

const randomItem = (state: GameState): Item => {
  const itemCount = state.itemDeck.length;
  const index = Math.floor(Math.random() * itemCount);
  return state.itemDeck[index];
};

const randomMagicItem = (state: GameState): Item => {
  const itemCount = state.magicItemDeck.length;
  const index = Math.floor(Math.random() * itemCount);
  return state.magicItemDeck[index];
};

const lookForTrapDoor = (state: GameState, hero: Hero, result: number) => {
  const trapDoor = findTrapDoor(state, hero.position);
  if (trapDoor) {
    addLog(
      state,
      `${hero.name} searched (${result}) and found ${trapDoor.name}`,
    );
    trapDoor.found = true;
    return true;
  }
  return false;
};
