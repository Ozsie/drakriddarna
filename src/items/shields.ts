import type { Shield } from '../types';
import { ItemType } from '../types';

export const shields: Shield[] = [
  {
    name: 'items.shields.largeShield',
    type: ItemType.SHIELD,
    amountInDeck: 2,
    dice: 2,
    value: 2,
  },
  {
    name: 'items.shields.smallShield',
    type: ItemType.SHIELD,
    amountInDeck: 2,
    dice: 1,
    value: 1,
  },
];
