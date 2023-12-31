import type { Weapon } from '../types';
import { ItemType } from '../types';

export const weapons: Weapon[] = [
  {
    name: 'items.weapons.sword',
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
    name: 'items.weapons.twoHandedSword',
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
    name: 'items.weapons.halberd',
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
    name: 'items.weapons.flail',
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
    name: 'items.weapons.doubleHeadedAxe',
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
    name: 'items.weapons.orchSword',
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
    name: 'items.weapons.orchBow',
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
    name: 'items.weapons.trollClub',
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
    name: 'items.weapons.darkLordSword',
    range: 1,
    dice: 3,
    twoHanded: false,
    useHearHeroes: true,
    amountInDeck: 3,
    type: ItemType.WEAPON,
    value: 0,
    ignoresShield: false,
    ignoresArmour: false,
  },
  {
    name: 'items.weapons.greenDarkLordSword',
    range: 1,
    dice: 3,
    twoHanded: false,
    useHearHeroes: true,
    amountInDeck: 1,
    type: ItemType.WEAPON,
    value: 0,
    ignoresShield: false,
    ignoresArmour: false,
  },
];
