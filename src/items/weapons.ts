import type { Weapon } from '../types';
import { ItemType } from '../types';

export const weapons: Weapon[] = [
  {
    name: 'Sword',
    range: 1,
    dice: 3,
    twoHanded: false,
    useHearHeroes: true,
    amountInDeck: 0,
    type: ItemType.WEAPON,
    value: 0,
    ignoresShield: false,
    ignoresArmour: false,
  },
  {
    name: 'Two-handed Sword',
    range: 1,
    dice: 4,
    twoHanded: true,
    useHearHeroes: false,
    amountInDeck: 1,
    type: ItemType.WEAPON,
    value: 3,
    ignoresShield: false,
    ignoresArmour: false,
  },
  {
    name: 'Halberd',
    range: 2,
    dice: 3,
    twoHanded: true,
    useHearHeroes: true,
    amountInDeck: 1,
    type: ItemType.WEAPON,
    value: 2,
    ignoresShield: false,
    ignoresArmour: false,
  },
  {
    name: 'Flail',
    range: 1,
    dice: 4,
    twoHanded: false,
    useHearHeroes: true,
    amountInDeck: 1,
    type: ItemType.WEAPON,
    value: 4,
    ignoresShield: false,
    ignoresArmour: false,
  },
  {
    name: 'Double Headed Axe',
    range: 1,
    dice: 4,
    twoHanded: true,
    useHearHeroes: true,
    amountInDeck: 1,
    type: ItemType.WEAPON,
    value: 3,
    ignoresShield: false,
    ignoresArmour: false,
  },
];

export const monsterWeapons: Weapon[] = [
  {
    name: 'Orch Sword',
    range: 1,
    dice: 3,
    twoHanded: false,
    useHearHeroes: true,
    amountInDeck: 4,
    type: ItemType.WEAPON,
    value: 0,
    ignoresShield: false,
    ignoresArmour: false,
  },
  {
    name: 'Orch Bow',
    range: 999,
    dice: 3,
    twoHanded: false,
    useHearHeroes: true,
    amountInDeck: 4,
    type: ItemType.WEAPON,
    value: 0,
    ignoresShield: true,
    ignoresArmour: false,
  },
  {
    name: 'Troll Club',
    range: 1,
    dice: 3,
    twoHanded: false,
    useHearHeroes: true,
    amountInDeck: 4,
    type: ItemType.WEAPON,
    value: 0,
    ignoresShield: false,
    ignoresArmour: false,
  },
];
