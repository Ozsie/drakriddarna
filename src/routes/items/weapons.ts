import type { Weapon } from "../types";
import { ItemType } from "../types";

export const weapons: Weapon[] = [
  {
    name: 'Sword',
    range: 1,
    dice: 3,
    twoHanded: false,
    useHearHeroes: true,
    amountInDeck: 0,
    type: ItemType.WEAPON,
  },
  {
    name: 'Two-handed Sword',
    range: 1,
    dice: 4,
    twoHanded: true,
    useHearHeroes: false,
    amountInDeck: 1,
    type: ItemType.WEAPON,
  },
  {
    name: 'Halberd',
    range: 2,
    dice: 3,
    twoHanded: true,
    useHearHeroes: true,
    amountInDeck: 1,
    type: ItemType.WEAPON,
  },
  {
    name: 'Flail',
    range: 1,
    dice: 4,
    twoHanded: false,
    useHearHeroes: true,
    amountInDeck: 1,
    type: ItemType.WEAPON,
  },
  {
    name: 'Double Headed Axe',
    range: 1,
    dice: 4,
    twoHanded: true,
    useHearHeroes: true,
    amountInDeck: 1,
    type: ItemType.WEAPON,
  },
]

export const monsterWeapons: Weapon[] = [
  {
    name: 'Orch Sword/Bow',
    range: 99,
    dice: 3,
    twoHanded: false,
    useHearHeroes: true,
    amountInDeck: 4,
    type: ItemType.WEAPON,
  },
  {
    name: 'Troll Club',
    range: 1,
    dice: 3,
    twoHanded: false,
    useHearHeroes: true,
    amountInDeck: 4,
    type: ItemType.WEAPON,
  },
]