import type { Dungeon } from '../../types';
import {
  Colour,
  ConditionType,
  MonsterType,
  SecretType,
  Side,
} from '../../types';
import { defineDungeon } from '../../dungeon/DungeonLogic';
import { magicItems } from '../../items/magicItems';
import { e1m2 } from './e1m2';

export const e1m1: Dungeon = defineDungeon({
  name: 'campaign.iceDragon.e1m1.name',
  nextDungeon: e1m2,
  winConditions: [
    {
      type: ConditionType.KILL_ALL,
      fulfilled: false,
    },
    {
      type: ConditionType.OPEN_DOOR,
      targetCell: { x: 15, y: 1 },
      fulfilled: false,
    },
  ],
  startingPositions: [
    [2, 5],
    [1, 4],
    [1, 5],
    [1, 6],
  ],
  discoveredRooms: ['A'],
  layout: {
    grid: [
      '            ######',
      '            #EEEE#',
      '         ####EEEE#',
      '##### ####DDDEEEE#',
      '#AAA###CCCC#######',
      '#AAABBBCCCC###GGG#',
      '#AAA###CCCCFFFGGG#',
      '##### #CCCC###GGG#',
      '      #CCCC#######',
      '      #CCCCHHHIII#',
      '      ########III#',
      '             #III#',
      '             #####',
    ],
    corridors: ['B', 'D', 'F', 'H'],
    doors: [
      [Side.RIGHT, 3, 5],
      [Side.RIGHT, 6, 5],
      [Side.RIGHT, 10, 6],
      [Side.RIGHT, 13, 6],
      [Side.RIGHT, 10, 9],
      [Side.RIGHT, 13, 9],
      [Side.RIGHT, 12, 3],
      [Side.UP, 10, 4, { hidden: true }],
      [Side.RIGHT, 15, 2, { hidden: true }],
    ],
    monsters: [
      [MonsterType.ORC, Colour.Blue, 10, 8],
      [MonsterType.ORC, Colour.Red, 13, 9],
      [MonsterType.TROLL, Colour.Red, 16, 2],
      [MonsterType.TROLL, Colour.Yellow, 14, 7],
    ],
    secrets: [
      [SecretType.EQUIPMENT, 10, 5],
      [SecretType.EQUIPMENT, 13, 1],
      [SecretType.EQUIPMENT, 16, 10],
      [SecretType.MAGIC_ITEM, 16, 6, magicItems[0]],
    ],
    notes: [
      [3, 5, 'campaign.iceDragon.e1m1.notes.hint1'],
      [10, 9, 'campaign.iceDragon.e1m1.notes.hint2'],
      [10, 6, 'campaign.iceDragon.e1m1.notes.hint3'],
      [10, 4, 'campaign.iceDragon.e1m1.notes.hint4'],
    ],
  },
});
