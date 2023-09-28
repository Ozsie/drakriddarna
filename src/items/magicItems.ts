import type { Item } from "../types";
import { ItemType } from "../types";
import { NEXT_DUNGEON, NEXT_TURN, TRADE } from "./ItemLogic";

export const magicItems: Item[] = [
  {
    name: "Healing Herbs",
    type: ItemType.MAGIC,
    value: 0,
    amountInDeck: 1,
    properties: {
      USED: false,
      ACTIVE: true,
      DESCRIPTION: "Chance to heal up to 3 wounds on one hero.",
      RESET_ON: [TRADE, NEXT_DUNGEON],
    },
    effect: "magicHerbsOnUse",
    reset: "magicHerbsOnReset",
  },
  {
    name: "Thousand League Boots",
    type: ItemType.MAGIC,
    value: 0,
    amountInDeck: 1,
    properties: {
      DESCRIPTION: "Gives one additional step for each move action.",
      MOVEMENT_BONUS: 1,
    },
    pickup: "movementBonusOnPickup",
    drop: "movementBonusOnDrop",
  },
  {
    name: "Giants Glove",
    type: ItemType.MAGIC,
    value: 0,
    amountInDeck: 1,
    properties: {
      DESCRIPTION: "One additional attack die. Breaks locked doors.",
      BREAK_DOOR: true,
      ATTACK_BONUS: 1,
    },
  },
  {
    name: "Ring of Precision",
    type: ItemType.MAGIC,
    value: 0,
    amountInDeck: 1,
    properties: {
      DESCRIPTION: "May re-roll one completely missed attack.",
      RE_ROLL_ATTACK: true,
    },
  },
  {
    name: "Crown of Wisdom",
    type: ItemType.MAGIC,
    value: 0,
    amountInDeck: 1,
    properties: {
      DESCRIPTION: "One additional die roll when searching.",
      SEARCH_BONUS: 1,
    },
  },
  {
    name: "Sword of Chaos",
    type: ItemType.MAGIC,
    value: 0,
    amountInDeck: 1,
    properties: {
      DESCRIPTION: `A sword with a will of it's own. Use at your own peril.`,
    },
    effect: "chaosSwordOnUse",
  },
  {
    name: "Potion of Speed",
    type: ItemType.MAGIC,
    value: 0,
    amountInDeck: 1,
    properties: {
      DESCRIPTION: "Gives 2 additional actions. Can only be used once.",
      USED: false,
      ACTIONS_BONUS: 2,
      ACTIVE: true,
    },
    effect: "potionOfSpeedOnUse",
  },
  {
    name: "Necklace of Light",
    type: ItemType.MAGIC,
    value: 0,
    amountInDeck: 1,
    properties: {
      USED: false,
      RESET_ON: [NEXT_TURN],
      ACTIVE: true,
    },
    effect: "necklaceOfLightOnUse",
    reset: "necklaceOfLightOnReset",
  },
];
