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
import { e1m3 } from './e1m3';

export const e1m2: Dungeon = defineDungeon({
  name: 'campaign.iceDragon.e1m2.name',
  nextDungeon: e1m3,
  winConditions: [
    {
      type: ConditionType.KILL_ALL,
      fulfilled: false,
    },
    {
      type: ConditionType.OPEN_DOOR,
      targetCell: { x: 17, y: 14 },
      fulfilled: false,
    },
  ],
  startingPositions: [
    [2, 14],
    [1, 15],
    [2, 15],
    [3, 15],
  ],
  discoveredRooms: ['M'],
  layout: {
    grid: [
      '############## #####',
      '#AAA###CCCCCC###EEE#',
      '#AAABBBC@CC@CDDDEEE#',
      '#AAA###CCCCCC###EEE#',
      '##### ##H##### #EEE#',
      '       #H#     #EEE#',
      '##### ##H##### #EEE#',
      '#KKK###IIIIII# #EEE#',
      '#KKKJJJIIIIII# ##F##',
      '#KKK###IIIIII# ##F##',
      '##L## #IIIIII# ##F##',
      ' #L#  ######## #GGG#',
      '##L##          #GGG#',
      '#MMM#          #GGG#',
      '#MMM#          #GGG#',
      '#MMM#          #####',
      '#####               ',
    ],
    corridors: ['B', 'D', 'F', 'H', 'J', 'L'],
    doors: [
      [Side.UP, 2, 13],
      [Side.UP, 2, 10],
      [Side.RIGHT, 3, 8],
      [Side.RIGHT, 6, 8, { locked: true }],
      [Side.UP, 8, 7],
      [Side.UP, 8, 4],
      [Side.LEFT, 7, 2, { hidden: true }],
      [Side.LEFT, 4, 2],
      [Side.RIGHT, 12, 2, { locked: true }],
      [Side.RIGHT, 15, 2],
      [Side.DOWN, 17, 7],
      [Side.DOWN, 17, 10],
      [Side.DOWN, 17, 14, { hidden: true }],
    ],
    monsters: [
      [MonsterType.TROLL, Colour.Red, 3, 7],
      [MonsterType.ORC, Colour.Red, 12, 8],
      [MonsterType.ORC, Colour.Green, 11, 1],
      [MonsterType.TROLL, Colour.Green, 2, 2],
      [MonsterType.ORC, Colour.Yellow, 18, 7],
      [MonsterType.TROLL, Colour.Yellow, 17, 10],
    ],
    secrets: [
      [SecretType.EQUIPMENT, 1, 3],
      [SecretType.EQUIPMENT, 3, 3],
      [SecretType.EQUIPMENT, 15, 2],
      [SecretType.MAGIC_ITEM, 2, 3, magicItems[1]],
      [SecretType.MAGIC_ITEM, 16, 11, magicItems[6]],
    ],
    notes: [
      [2, 10, 'campaign.iceDragon.e1m2.notes.hint1'],
      [8, 10, 'campaign.iceDragon.e1m2.notes.hint2'],
      [2, 3, 'campaign.iceDragon.e1m2.notes.hint3'],
      [17, 11, 'campaign.iceDragon.e1m2.notes.hint4'],
    ],
  },
});
