import type { Shield } from '../types';
import { ItemType } from '../types';

export const shields: Shield[] = [
  {
    id: 'large_shield',
    name: 'items.shields.largeShield.name',
    nameTranslationKey: 'items.shields.largeShield.name',
    type: ItemType.SHIELD,
    amountInDeck: 2,
    dice: 2,
    value: 2,
    blockSound: 'sfx/shield_block.mp3',
    sprite: {
      image: 'items/kite_shield.png',
      size: 32,
      index: 0,
    },
  },
  {
    id: 'small_shield',
    name: 'items.shields.smallShield.name',
    nameTranslationKey: 'items.shields.smallShield.name',
    type: ItemType.SHIELD,
    amountInDeck: 2,
    dice: 1,
    value: 1,
    blockSound: 'sfx/shield_block.mp3',
    sprite: {
      image: 'items/wooden_buckler.png',
      size: 32,
      index: 0,
    },
  },
];

export const monsterShields: Shield[] = [
  {
    id: 'blue_dark_lord_shield',
    name: 'items.shields.blueDarkLordShield.name',
    nameTranslationKey: 'items.shields.blueDarkLordShield.name',
    type: ItemType.SHIELD,
    amountInDeck: 1,
    dice: 1,
    value: 0,
  },
];
