import type { Weapon } from '../types';

export const weapons: Weapon[] = [
  {
    name: 'Sword',
    range: 1,
    dice: 3,
    twoHanded: false,
    useHearHeroes: true,
    amountInDeck: 4,
  },
  {
    name: 'Two-handed Sword',
    range: 1,
    dice: 4,
    twoHanded: true,
    useHearHeroes: false,
    amountInDeck: 1,
  },
  {
    name: 'Halberd',
    range: 2,
    dice: 3,
    twoHanded: true,
    useHearHeroes: true,
    amountInDeck: 1,
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
  },
  {
    name: 'Troll Club',
    range: 1,
    dice: 3,
    twoHanded: false,
    useHearHeroes: true,
    amountInDeck: 4,
  },
]