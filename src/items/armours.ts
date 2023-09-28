import type { Armour } from '../types';
import { ItemType } from '../types';

export const armour: Armour[] = [
  {
    name: 'Chain mail',
    type: ItemType.ARMOUR,
    amountInDeck: 2,
    defense: 1,
    magicProtection: false,
    movementReduction: 0,
    value: 2,
  },
  {
    name: 'Plate mail',
    type: ItemType.ARMOUR,
    amountInDeck: 1,
    defense: 2,
    magicProtection: false,
    movementReduction: 1,
    value: 3,
  },
  {
    name: 'Dragon Skin mail',
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
    name: 'Orch Mail',
    defense: 0,
    magicProtection: false,
    amountInDeck: 4,
    type: ItemType.ARMOUR,
    movementReduction: 0,
    value: 0,
  },
  {
    name: 'Troll Skin',
    defense: 1,
    magicProtection: false,
    amountInDeck: 4,
    type: ItemType.ARMOUR,
    movementReduction: 0,
    value: 0,
  },
];
