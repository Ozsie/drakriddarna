import type {
  Campaign,
  Item
} from "../types";
import { e1m0 } from "./dungeons/e1m0";
import { e1m1 } from "./dungeons/e1m1";
import { weapons } from "../items/weapons";
import { armour } from "../items/armours";
import { shields } from "../items/shields";
import { Colour } from "../types";
import { newHero } from "../hero/HeroLogic";
import { magicItems } from "../items/magicItems";
import { events } from "../events/events";


const getMagicItemDeck = (): Item[] => {
  const itemDeck: Item[] = [];
  magicItems.forEach((item) => {
    for (let i = 0; i < item.amountInDeck; i++) {
      itemDeck.push(item);
    }
  });
  return itemDeck;
}

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
  magicItemDeck: getMagicItemDeck(),
  heroes: [
    newHero('Fearik', Colour.Yellow),
    newHero('Helbran', Colour.Red),
    newHero('Siedel', Colour.Green),
    newHero('Wulf', Colour.Blue)
  ],
  eventDeck: events
}