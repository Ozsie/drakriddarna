import type { Armour } from '../types';
import { ItemType } from '../types';

export const armour: Armour[] = [
  {
    name: 'items.armour.chainMail',
    type: ItemType.ARMOUR,
    amountInDeck: 2,
    defense: 1,
    magicProtection: false,
    movementReduction: 0,
    value: 2,
  },
  {
    name: 'items.armour.plateMail',
    type: ItemType.ARMOUR,
    amountInDeck: 1,
    defense: 2,
    magicProtection: false,
    movementReduction: 1,
    value: 3,
  },
  {
    name: 'items.armour.dragonSkinMail',
    type: ItemType.ARMOUR,
    amountInDeck: 1,
    defense: 2,
    magicProtection: true,
    movementReduction: 0,
    value: 4,
  },
];

export const monsterArmour: Armour[] = [
  {
    name: 'items.armour.orchMail',
    defense: 0,
    magicProtection: false,
    amountInDeck: 4,
    type: ItemType.ARMOUR,
    movementReduction: 0,
    value: 0,
  },
  {
    name: 'items.armour.trollSkin',
    defense: 1,
    magicProtection: false,
    amountInDeck: 4,
    type: ItemType.ARMOUR,
    movementReduction: 0,
    value: 0,
  },
  {
    name: 'items.armour.darkLordCape',
    defense: 2,
    magicProtection: false,
    amountInDeck: 4,
    type: ItemType.ARMOUR,
    movementReduction: 0,
    value: 0,
  },
];
