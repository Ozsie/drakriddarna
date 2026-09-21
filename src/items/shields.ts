import type { Shield } from '../types';
import { ItemType } from '../types';

export const shields: Shield[] = [
  {
    id: 'large_shield',
    name: 'items.shields.largeShield',
    nameTranslationKey: 'items.shields.largeShield',
    type: ItemType.SHIELD,
    amountInDeck: 2,
    dice: 2,
    value: 2,
  },
  {
    id: 'small_shield',
    name: 'items.shields.smallShield',
    nameTranslationKey: 'items.shields.smallShield',
    type: ItemType.SHIELD,
    amountInDeck: 2,
    dice: 1,
    value: 1,
  },
];

export const monsterShields: Shield[] = [
  {
    id: 'blue_dark_lord_shield',
    name: 'items.shields.blueDarkLordShield',
    nameTranslationKey: 'items.shields.blueDarkLordShield',
    type: ItemType.SHIELD,
    amountInDeck: 1,
    dice: 1,
    value: 0,
  },
];
