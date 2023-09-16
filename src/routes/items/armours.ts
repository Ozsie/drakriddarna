import type { Armour } from "../types";
import { ItemType } from "../types";

export const armour: Armour[] = [];

export const monsterArmour: Armour[] = [
  {
    name: 'Orch Mail',
    defense: 0,
    magicProtection: false,
    amountInDeck: 4,
    type: ItemType.ARMOUR,
  },
  {
    name: 'Troll Skin',
    defense: 1,
    magicProtection: false,
    amountInDeck: 4,
    type: ItemType.ARMOUR,
  },
]