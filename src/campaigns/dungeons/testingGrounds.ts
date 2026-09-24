import {
  Colour,
  ConditionType,
  MonsterType,
  SecretType,
  Side,
} from '../../types';
import type { Dungeon } from '../../types';
import { defineDungeon } from '../../dungeon/DungeonLogic';
import { weapons } from '../../items/weapons';
import { e1m0 } from './e1m0';
import { magicItems } from '../../items/magicItems';

export const testingGrounds: Dungeon = defineDungeon({
  name: 'campaign.iceDragon.testingGrounds.name',
  beaten: true,
  winConditions: [
    {
      type: ConditionType.KILL_ALL,
      fulfilled: true,
    },
    {
      type: ConditionType.OPEN_DOOR,
      targetCell: { x: 2, y: 10 },
      fulfilled: false,
    },
    {
      type: ConditionType.KILL_ALL_OF_TYPE,
      targetMonsterType: MonsterType.ORC,
      fulfilled: false,
    },
    {
      type: ConditionType.REACH_CELL,
      targetCell: { x: 2, y: 10 },
      fulfilled: false,
    },
    {
      type: ConditionType.KILL_AT_LEAST,
      killMinCount: 5,
      fulfilled: false,
    },
  ],
  nextDungeon: e1m0,
  startingPositions: [
    [2, 9],
    [1, 8],
    [1, 9],
    [1, 10],
  ],
  discoveredRooms: ['A', 'D', 'I'],
  layout: {
    grid: [
      '###########',
      '#CCCCCCCCC#',
      '#CCCCCCCCC#',
      '#CCCCCCCCC#',
      '#######E###',
      '  #####EDDD',
      '  #FFFFE##D',
      '###F###AA#D',
      '#AAAAAAAA#D',
      '#AAAAAAAA#D',
      '#AAAAAAAA#D',
      '##G########',
      ' #G#IIIIII#',
      ' #GIIIII#I#',
      ' ##########',
    ],
    pillars: [
      [8, 3],
      [7, 9],
    ],
    pits: [
      [6, 3],
      [6, 2],
    ],
    corridors: ['G', 'E', 'F'],
    doors: [
      [Side.UP, 3, 8, { trapped: 1, hidden: true }],
      [Side.LEFT, 7, 6, { locked: true }],
      [Side.UP, 7, 7, { trapped: 1 }],
      [Side.UP, 7, 4],
      [Side.DOWN, 2, 10, { hidden: true }],
    ],
    monsters: [
      [MonsterType.ORC, Colour.Green, 1, 1],
      [MonsterType.ORC, Colour.Red, 4, 9],
      [MonsterType.TROLL, Colour.Green, 5, 1],
    ],
    secrets: [
      [
        SecretType.TRAP_DOOR,
        3,
        9,
        'campaign.iceDragon.testingGrounds.secrets.trapDoor',
      ],
      [SecretType.EQUIPMENT, 1, 10],
      [SecretType.EQUIPMENT, 5, 10, weapons[2]],
    ],
    notes: [
      [
        2,
        10,
        'Some note\nto test rendering\n on game board. \nThe note is pretty long, so we g\net several lines of text. I wonder how it handles a linebreak?\nLike this apparently.',
      ],
    ],
    items: [
      [3, 10, magicItems[0]],
      [4, 10, magicItems[1]],
      [5, 10, magicItems[6]],
      [6, 10, magicItems[2]],
      [7, 10, magicItems[3]],
      [8, 10, magicItems[4]],
      [8, 7, magicItems[5]],
      [10, 10],
    ],
  },
  events: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
});
