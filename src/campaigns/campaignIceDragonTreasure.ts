import type { Campaign, Item } from "../routes/types";
import { e1m0 } from "./dungeons/e1m0";
import { e1m1 } from "./dungeons/e1m1";
import { weapons } from "../routes/items/weapons";
import { armour } from "../routes/items/armours";
import { shields } from "../routes/items/shields";
import { Colour } from "../routes/types";
import { newHero } from "../hero/HeroLogic";

const getItemDeck = (): Item[] => {
  const itemDeck: Item[] = [];
  weapons.forEach((weapon) => {
    for (let i = 0; i < weapon.amountInDeck; i++) {
      itemDeck.push(weapon);
    }
  });
  armour.forEach((armour) => {
    for (let i = 0; i < armour.amountInDeck; i++) {
      itemDeck.push(armour);
    }
  });
  shields.forEach((shield) => {
    for (let i = 0; i < shield.amountInDeck; i++) {
      itemDeck.push(shield);
    }
  });
  return itemDeck;
}

export const campaignIceDragonTreasure: Campaign = {
  name: 'Treasure of the Ice Dragon',
  dungeons: [
    e1m0,
    e1m1
  ],
  itemDeck: getItemDeck(),
  heroes: [
    newHero('Fearik', Colour.Yellow),
    newHero('Helbran', Colour.Red),
    newHero('Siedel', Colour.Green),
    newHero('Wulf', Colour.Blue)
  ],
}