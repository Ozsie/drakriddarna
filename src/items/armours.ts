import type { Armour } from '../types';
import { ItemType } from '../types';

export const armour: Armour[] = [
  {
    id: 'chain_mail',
    name: 'items.armour.chainMail',
    nameTranslationKey: 'items.armour.chainMail',
    type: ItemType.ARMOUR,
    amountInDeck: 2,
    defense: 1,
    magicProtection: false,
    movementReduction: 0,
    value: 2,
  },
  {
    id: 'plate_mail',
    name: 'items.armour.plateMail',
    nameTranslationKey: 'items.armour.plateMail',
    type: ItemType.ARMOUR,
    amountInDeck: 1,
    defense: 2,
    magicProtection: false,
    movementReduction: 1,
    value: 3,
  },
  {
    id: 'dragon_skin_mail',
    name: 'items.armour.dragonSkinMail',
    nameTranslationKey: 'items.armour.dragonSkinMail',
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
    id: 'orc_mail',
    name: 'items.armour.orchMail',
    nameTranslationKey: 'items.armour.orchMail',
    defense: 0,
    magicProtection: false,
    amountInDeck: 4,
    type: ItemType.ARMOUR,
    movementReduction: 0,
    value: 0,
  },
  {
    id: 'troll_skin',
    name: 'items.armour.trollSkin',
    nameTranslationKey: 'items.armour.trollSkin',
    defense: 1,
    magicProtection: false,
    amountInDeck: 4,
    type: ItemType.ARMOUR,
    movementReduction: 0,
    value: 0,
  },
  {
    id: 'dark_lord_cape',
    name: 'items.armour.darkLordCape',
    nameTranslationKey: 'items.armour.darkLordCape',
    defense: 2,
    magicProtection: false,
    amountInDeck: 4,
    type: ItemType.ARMOUR,
    movementReduction: 0,
    value: 0,
  },
];
