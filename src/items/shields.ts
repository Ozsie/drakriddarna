import type { Shield } from "../types";
import { ItemType } from "../types";

export const shields: Shield[] = [
  {
    name: 'Large shield',
    type: ItemType.SHIELD,
    amountInDeck: 2,
    dice: 2,
    value: 2,
  },
  {
    name: 'Small shield',
    type: ItemType.SHIELD,
    amountInDeck: 2,
    dice: 1,
    value: 1,
  },
];