import {
  Colour,
  ConditionType,
  CornerType,
  MonsterType,
  Side,
} from '../../types';
import type { Dungeon } from '../../types';
import { defineDungeon } from '../../dungeon/DungeonLogic';
import { e1m1 } from './e1m1';

export const e1m0: Dungeon = defineDungeon({
  name: 'campaign.iceDragon.e1mo.name',
  winConditions: [
    {
      type: ConditionType.KILL_ALL,
      fulfilled: false,
    },
  ],
  nextDungeon: e1m1,
  startingPositions: [
    [2, 9],
    [1, 8],
    [1, 9],
    [1, 10],
  ],
  discoveredRooms: ['A'],
  layout: {
    corners: [
      { position: { x: 5, y: 0 }, type: CornerType.INNER_TOP_LEFT },
      { position: { x: 10, y: 0 }, type: CornerType.INNER_BOTTOM_RIGHT },
      { position: { x: 5, y: 4 }, type: CornerType.INNER_BOTTOM_LEFT },
      { position: { x: 6, y: 4 }, type: CornerType.OUTER_TOP_RIGHT },
      { position: { x: 8, y: 4 }, type: CornerType.OUTER_TOP_LEFT },
      { position: { x: 10, y: 4 }, type: CornerType.INNER_BOTTOM_RIGHT },
      { position: { x: 8, y: 6 }, type: CornerType.OUTER_BOTTOM_LEFT },
      { position: { x: 9, y: 6 }, type: CornerType.INNER_TOP_RIGHT },
      { position: { x: 0, y: 7 }, type: CornerType.INNER_TOP_LEFT },
      { position: { x: 4, y: 7 }, type: CornerType.INNER_TOP_RIGHT },
      { position: { x: 4, y: 8 }, type: CornerType.OUTER_BOTTOM_LEFT },
      { position: { x: 6, y: 8 }, type: CornerType.OUTER_BOTTOM_RIGHT },
      { position: { x: 4, y: 10 }, type: CornerType.OUTER_TOP_LEFT },
      { position: { x: 6, y: 10 }, type: CornerType.OUTER_TOP_RIGHT },
      { position: { x: 0, y: 11 }, type: CornerType.INNER_BOTTOM_LEFT },
      { position: { x: 4, y: 11 }, type: CornerType.INNER_BOTTOM_RIGHT },
      { position: { x: 6, y: 11 }, type: CornerType.INNER_BOTTOM_LEFT },
      { position: { x: 9, y: 11 }, type: CornerType.INNER_BOTTOM_RIGHT },
    ],
    grid: [
      '     ######',
      '     #CCCC#',
      '     #CCCC#',
      '     #CCCC#',
      '     ##E###',
      '      #E#  ',
      '      #E## ',
      '##### #BB# ',
      '#AAA###BB# ',
      '#AAADDDBB# ',
      '#AAA###BB# ',
      '##### #### ',
    ],
    doors: [
      [Side.RIGHT, 3, 9],
      [Side.RIGHT, 6, 9],
      [Side.UP, 7, 7],
      [Side.UP, 7, 4],
    ],
    monsters: [
      [MonsterType.ORC, Colour.Green, 6, 9],
      [MonsterType.ORC, Colour.Yellow, 8, 10],
      [MonsterType.ORC, Colour.Red, 7, 5],
      [MonsterType.ORC, Colour.Red, 9, 3],
      [MonsterType.TROLL, Colour.Green, 6, 1],
    ],
    corridors: ['D', 'E'],
  },
  events: [1, 2, 3, 4, 5, 6],
});
