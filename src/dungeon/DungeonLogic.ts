import type {
  Door,
  Item,
  Monster,
  Secret
} from "../types";
import {
  Colour,
  Level,
  MonsterType,
  SecretType,
  Side
} from "../types";
import { monsterWeapons } from '../items/weapons';
import { monsterArmour } from '../items/armours';

export const PIT = '0'
export const PILLAR = '@'
export const EMPTY = ' '
export const COLLAPSED = '?'
export const WALL = '#'

export const createSecret = (type: SecretType, name: string, x: number, y: number): Secret => {
  return {
    type,
    name,
    position: {x, y},
    found: false
  }
}

export const createSecretWithItem = (type: SecretType, x: number, y: number, item: Item): Secret => {
  return {
    type,
    name: item.name,
    position: {x, y},
    found: false,
    item,
  }
}

export const createDoor = (side: Side, x: number, y: number): Door => {
  return {
    side,
    x,
    y,
    locked: false,
    trapped: false,
    open: false,
    hidden: false,
    trapAttacks: 0
  }
}

export const createTrappedDoor = (side: Side, x: number, y: number, trapAttacks: number): Door => {
  return {
    ...createDoor(side, x, y),
    trapped: true,
    trapAttacks
  }
}

export const createHiddenDoor = (side: Side, x: number, y: number): Door => {
  return {
    ...createDoor(side, x, y),
    hidden: true,
  }
}

export const createLockedDoor = (side: Side, x: number, y: number): Door => {
  return {
    ...createDoor(side, x, y),
    locked: true,
  }
}

export const createTrappedLockedDoor = (side: Side, x: number, y: number, trapAttacks: number): Door => {
  return {
    ...createDoor(side, x, y),
    locked: true,
    trapped: true,
    trapAttacks
  }
}

export const createTrappedHiddenDoor = (side: Side, x: number, y: number, trapAttacks: number): Door => {
  return {
    ...createDoor(side, x, y),
    hidden: true,
    trapped: true,
    trapAttacks
  }
}

export const createMonster = (type: MonsterType, colour: Colour, x: number, y: number): Monster => {
  const indexOfColour = Object.values(Colour).indexOf(colour);
  const colourName = Object.keys(Colour)[indexOfColour];

  let level = Level.LORD;
  let actions = 2;
  let defense = 2;
  let health = 4;
  let maxHealth = 4;
  let experience = 4;
  let weapon = monsterWeapons[0];
  let rangedWeapon = undefined;
  let armour = monsterArmour[0];
  switch(type) {
    case MonsterType.ORCH: {
      level = Level.APPRENTICE;
      defense = 0;
      health = 2
      maxHealth = 2;
      experience = 1;
      rangedWeapon = monsterWeapons[1]
      break;
    }
    case MonsterType.TROLL: {
      level = Level.KNIGHT;
      defense = 1;
      health = 3;
      maxHealth = 3;
      experience = 2;
      weapon = monsterWeapons[2];
      armour = monsterArmour[1];
      break;
    }
  }
  if (type === MonsterType.YELLOW_DARK_LORD) actions = 3
  return {
    type,
    level,
    colour,
    actions,
    defense,
    health,
    maxHealth,
    experience,
    name: type + ' (' + colourName + ')',
    movement: 3,
    maxMovement: 3,
    position: { x, y },
    weapon,
    armour,
    incapacitated: false,
    inventory: [],
    rangedWeapon: rangedWeapon,
  }
}
