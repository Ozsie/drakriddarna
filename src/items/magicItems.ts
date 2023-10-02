import type { Item } from '../types';
import { ItemType } from '../types';
import { NEXT_DUNGEON, NEXT_TURN, TRADE } from './ItemLogic';

export const magicItems: Item[] = [
  {
    name: 'items.magicItems.healingHerbs.name',
    type: ItemType.MAGIC,
    value: 0,
    amountInDeck: 1,
    properties: {
      USED: false,
      ACTIVE: true,
      DESCRIPTION: 'items.magicItems.healingHerbs.description',
      RESET_ON: [TRADE, NEXT_DUNGEON],
    },
    effect: 'magicHerbsOnUse',
    reset: 'magicHerbsOnReset',
  },
  {
    name: 'items.magicItems.boots.name',
    type: ItemType.MAGIC,
    value: 0,
    amountInDeck: 1,
    properties: {
      DESCRIPTION: 'items.magicItems.boots.description',
      MOVEMENT_BONUS: 1,
    },
    pickup: 'movementBonusOnPickup',
    drop: 'movementBonusOnDrop',
  },
  {
    name: 'items.magicItems.giantsGlove.name',
    type: ItemType.MAGIC,
    value: 0,
    amountInDeck: 1,
    properties: {
      DESCRIPTION: 'items.magicItems.giantsGlove.description',
      BREAK_DOOR: true,
      ATTACK_BONUS: 1,
    },
  },
  {
    name: 'items.magicItems.ringOfPrecision.name',
    type: ItemType.MAGIC,
    value: 0,
    amountInDeck: 1,
    properties: {
      DESCRIPTION: 'items.magicItems.ringOfPrecision.description',
      RE_ROLL_ATTACK: true,
    },
  },
  {
    name: 'items.magicItems.crownOfWisdom.name',
    type: ItemType.MAGIC,
    value: 0,
    amountInDeck: 1,
    properties: {
      DESCRIPTION: 'items.magicItems.crownOfWisdom.description',
      SEARCH_BONUS: 1,
    },
  },
  {
    name: 'items.magicItems.swordOfChaos.name',
    type: ItemType.MAGIC,
    value: 0,
    amountInDeck: 1,
    properties: {
      DESCRIPTION: 'items.magicItems.swordOfChaos.description',
    },
    effect: 'chaosSwordOnUse',
  },
  {
    name: 'items.magicItems.potionOfSpeed.name',
    type: ItemType.MAGIC,
    value: 0,
    amountInDeck: 1,
    properties: {
      DESCRIPTION: 'items.magicItems.potionOfSpeed.description',
      USED: false,
      ACTIONS_BONUS: 2,
      ACTIVE: true,
    },
    effect: 'potionOfSpeedOnUse',
  },
  {
    name: 'items.magicItems.necklaceOfLight.name',
    type: ItemType.MAGIC,
    value: 0,
    amountInDeck: 1,
    properties: {
      USED: false,
      RESET_ON: [NEXT_TURN],
      ACTIVE: true,
      DESCRIPTION: 'items.magicItems.necklaceOfLight.description',
    },
    effect: 'necklaceOfLightOnUse',
    reset: 'necklaceOfLightOnReset',
  },
];
