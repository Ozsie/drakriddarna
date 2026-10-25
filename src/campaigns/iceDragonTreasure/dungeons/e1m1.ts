import { CellAlignment, type Dungeon } from '../../../types';
import {
  Colour,
  ConditionType,
  MonsterType,
  SecretType,
  Side,
} from '../../../types';
import { defineDungeon } from '../../../dungeon/DungeonLogic';
import { magicItems } from '../../../items/magicItems';
import { e1m2 } from './e1m2';
import { brazier, chandelier, torch } from '../../../dungeon/LightSources';

export const e1m1: Dungeon = defineDungeon({
  name: 'campaign.iceDragon.e1m1.name',
  intro: 'campaign.iceDragon.e1m1.intro',
  nextDungeon: e1m2,
  winConditions: [
    {
      type: ConditionType.KILL_ALL,
      fulfilled: false,
    },
    {
      type: ConditionType.OPEN_DOOR,
      targetCell: { x: 16, y: 2 },
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
  ambientLight: 0.2,
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
    lights: [
      [
        9,
        4,
        CellAlignment.TOP_RIGHT,
        {
          color: '#dc572d',
          radius: 2,
          intensity: 0.45,
          softness: 0.5,
          effect: 'flicker',
          rate: 2,
        },
      ],
      [
        10,
        7,
        CellAlignment.TOP_RIGHT,
        {
          color: '#a0ccff',
          radius: 2,
          intensity: 0.45,
          softness: 0.5,
          effect: 'flicker',
          rate: 2,
        },
      ],
      [
        10,
        9,
        CellAlignment.BOTTOM_LEFT,
        {
          color: '#005fc7',
          radius: 2,
          intensity: 0.45,
          softness: 0.5,
          effect: 'flicker',
          rate: 2,
        },
      ],
      [11, 3, CellAlignment.TOP_RIGHT, torch],
      [16, 1, CellAlignment.CENTER, brazier],
      [16, 3, CellAlignment.CENTER, brazier],
      [2, 5, CellAlignment.CEILING, chandelier],
      [12, 6, CellAlignment.TOP_RIGHT, torch],
      [16, 6, CellAlignment.BOTTOM_RIGHT, torch],
      [15, 10, CellAlignment.CEILING, chandelier],
      [7, 4, CellAlignment.TOP_LEFT, brazier],
      [7, 9, CellAlignment.TOP_LEFT, brazier],
    ],
    doors: [
      [Side.RIGHT, 3, 5],
      [Side.RIGHT, 6, 5],
      [Side.RIGHT, 10, 6],
      [Side.RIGHT, 13, 6],
      [Side.RIGHT, 10, 9],
      [Side.RIGHT, 13, 9],
      [Side.RIGHT, 12, 3],
      [Side.UP, 10, 4, { hidden: true }],
      [Side.RIGHT, 16, 2, { hidden: true }],
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
