import { CornerType, type Dungeon } from '../../types';
import {
  Colour,
  ConditionType,
  MonsterType,
  SecretType,
  Side,
} from '../../types';
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
    corners: [
      { position: { x: 0, y: 0 }, type: CornerType.INNER_TOP_LEFT },
      { position: { x: 10, y: 0 }, type: CornerType.INNER_TOP_RIGHT },
      { position: { x: 0, y: 4 }, type: CornerType.INNER_BOTTOM_LEFT },
      { position: { x: 6, y: 4 }, type: CornerType.OUTER_TOP_RIGHT },
      { position: { x: 8, y: 4 }, type: CornerType.OUTER_TOP_LEFT },
      { position: { x: 10, y: 4 }, type: CornerType.INNER_BOTTOM_RIGHT },
      { position: { x: 2, y: 5 }, type: CornerType.INNER_TOP_LEFT },
      { position: { x: 6, y: 5 }, type: CornerType.OUTER_BOTTOM_RIGHT },
      { position: { x: 8, y: 6 }, type: CornerType.OUTER_BOTTOM_LEFT },
      { position: { x: 9, y: 6 }, type: CornerType.INNER_TOP_RIGHT },
      { position: { x: 0, y: 7 }, type: CornerType.INNER_TOP_LEFT },
      { position: { x: 2, y: 7 }, type: CornerType.OUTER_BOTTOM_RIGHT },
      { position: { x: 4, y: 7 }, type: CornerType.LEFT_END },
      { position: { x: 6, y: 7 }, type: CornerType.RIGHT_END },
      { position: { x: 0, y: 11 }, type: CornerType.INNER_BOTTOM_LEFT },
      { position: { x: 1, y: 11 }, type: CornerType.OUTER_TOP_RIGHT },
      { position: { x: 3, y: 11 }, type: CornerType.TOP_END },
      {
        position: { x: 9, y: 11 },
        type: CornerType.BOTTOM_END,
      },
      { position: { x: 10, y: 11 }, type: CornerType.INNER_TOP_RIGHT },
      { position: { x: 3, y: 12 }, type: CornerType.BOTTOM_END },
      { position: { x: 3, y: 13 }, type: CornerType.INNER_BOTTOM_RIGHT },
      { position: { x: 8, y: 13 }, type: CornerType.TOP_END },
      { position: { x: 1, y: 14 }, type: CornerType.INNER_BOTTOM_LEFT },
      {
        position: { x: 8, y: 14 },
        type: CornerType.THREE_WAY_INTERSECTION_UP,
      },
      {
        position: { x: 10, y: 14 },
        type: CornerType.INNER_BOTTOM_RIGHT,
      },
    ],
    grid: [
      '###########',
      '#CCCCCCCCC#',
      '#CCCCCCCCC#',
      '#CCCCCCCCC#',
      '#######E###',
      '  #####E#  ',
      '  #FFFFE## ',
      '###F###AA# ',
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
    ],
  },
});
