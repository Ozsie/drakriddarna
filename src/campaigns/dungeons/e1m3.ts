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
import { e1m4 } from './e1m4';

export const e1m3: Dungeon = defineDungeon({
  name: 'campaign.iceDragon.e1m3.name',
  nextDungeon: e1m4,
  winConditions: [
    {
      type: ConditionType.KILL_ALL,
      fulfilled: false,
    },
    {
      type: ConditionType.OPEN_DOOR,
      targetCell: { x: 18, y: 4 },
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
      '       ########     ',
      '     ###DDDEEE#     ',
      '     #CCC##EEE#     ',
      '######CCC##EEE######',
      '#AAA##CCC####F#IIII#',
      '#AAABBB#J####F#IIII#',
      '#AAA####J##G#F#IIII#',
      '##### ##J##GGF#IIII#',
      '   ####KKK###F#IIII#',
      '   #LLLKKK# #FMIIII#',
      '   ####KKK####M#####',
      '      #KKKMMMMM#    ',
      '      ####MMMM##    ',
      '         ######     ',
    ],
    corridors: ['B', 'D', 'F', 'J', 'L'],
    pits: [
      [16, 6],
      [17, 6],
      [18, 6],
      [15, 8],
      [16, 8],
      [17, 8],
    ],
    doors: [
      [Side.RIGHT, 3, 5],
      [Side.DOWN, 6, 5, { trapped: 1, locked: true }],
      [Side.UP, 6, 5],
      [Side.DOWN, 8, 4],
      [Side.UP, 8, 2, { hidden: true }],
      [Side.DOWN, 8, 7],
      [Side.LEFT, 7, 9],
      [Side.LEFT, 4, 9, { trapped: 1, locked: true }],
      [Side.RIGHT, 9, 11, { trapped: 1, locked: true }],
      [Side.RIGHT, 14, 9, { hidden: true }],
      [Side.UP, 18, 4, { hidden: true }],
      [Side.LEFT, 14, 9, { trapped: 1, locked: true }],
      [Side.LEFT, 13, 7],
      [Side.UP, 11, 6, { locked: true }],
      [Side.UP, 13, 4],
      [Side.LEFT, 11, 1],
    ],
    monsters: [
      [MonsterType.ORC, Colour.Yellow, 5, 5],
      [MonsterType.TROLL, Colour.Yellow, 7, 3, [magicItems[3]]],
      [MonsterType.ORC, Colour.Red, 7, 11],
      [MonsterType.ORC, Colour.Blue, 11, 2],
      [MonsterType.ORC, Colour.Blue, 14, 11],
      [MonsterType.YELLOW_DARK_LORD, Colour.Yellow, 18, 5],
    ],
    secrets: [
      [SecretType.MAGIC_ITEM, 8, 10, magicItems[2]],
      [SecretType.TRAP_DOOR, 8, 6],
      [SecretType.TRAP_DOOR, 11, 1],
      [SecretType.TRAP_DOOR, 11, 7],
      [SecretType.TRAP_DOOR, 13, 11],
    ],
    notes: [
      [6, 5, 'campaign.iceDragon.e1m3.notes.hint1'],
      [8, 3, 'campaign.iceDragon.e1m3.notes.hint2'],
      [8, 8, 'campaign.iceDragon.e1m3.notes.hint3'],
      [14, 10, 'campaign.iceDragon.e1m3.notes.hint4'],
    ],
  },
});
