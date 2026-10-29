import type { Campaign, Item } from '../../types';
import { Colour } from '../../types';
import { weapons } from '../../items/weapons';
import { armour } from '../../items/armours';
import { shields } from '../../items/shields';
import { magicItems } from '../../items/magicItems';
import { newHero } from '../../hero/HeroLogic';
import './monsters/templates';
import { generateCampaign } from './generator/generateCampaign';
import type { PopulationDecks } from './generator/populationGenerator';

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
};

const getMagicItemDeck = (): Item[] => {
  const itemDeck: Item[] = [];
  magicItems.forEach((item) => {
    for (let i = 0; i < item.amountInDeck; i++) {
      itemDeck.push(item);
    }
  });
  return itemDeck;
};

// Loot pool for the generator: the unique equipment the campaign can place
// as depth-weighted floor and monster loot (items with amountInDeck 0, like
// the heroes' starting sword, are deck-less and excluded).
const equipmentPool: Item[] = [...weapons, ...armour, ...shields].filter(
  (item) => item.amountInDeck > 0,
);

const decks: PopulationDecks = {
  equipment: equipmentPool,
  magicItems,
};

const { dungeons } = generateCampaign(decks);

export const campaignBrogue: Campaign = {
  id: 'brogue',
  name: 'campaign.brogue.name',
  dungeons,
  itemDeck: getItemDeck(),
  magicItemDeck: getMagicItemDeck(),
  heroes: [
    newHero('Fearik', Colour.Yellow),
    newHero('Helbran', Colour.Red),
    newHero('Siedel', Colour.Green),
    newHero('Wulf', Colour.Blue),
  ],
};

export default campaignBrogue;
