import type { Dungeon } from '../../../types';
import {
  CellAlignment,
  Colour,
  ConditionType,
  MonsterType,
  Side,
} from '../../../types';
import { defineDungeon } from '../../../dungeon/dungeonParser';
import { e1m1 } from './e1m1';
import { brazier, chandelier } from '../../../dungeon/LightSources';
import { barrelsStacked_E, barrelsStacked_N, barrelsStacked_S, barrelsStacked_W, bones, hay_N, sack_E, sack_W } from '../../../dungeon/Decorators.ts';

const e1m0: Dungeon = defineDungeon({
  name: 'campaign.iceDragon.e1m0.name',
  intro: 'campaign.iceDragon.e1m0.intro',
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
  ambientLight: 0.2,
  layout: {
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
    notes: [
      [2, 9, 'campaign.iceDragon.e1m0.notes.tutorial1'],
      [3, 9, 'campaign.iceDragon.e1m0.notes.tutorial2'],
    ],
    lights: [
      [2, 9, CellAlignment.CEILING, chandelier],
      [8, 10, CellAlignment.BOTTOM_RIGHT, brazier],
      [8, 7, CellAlignment.TOP_RIGHT, brazier],
      [9, 1, CellAlignment.TOP_RIGHT, brazier],
      [9, 3, CellAlignment.BOTTOM_RIGHT, brazier],
      [6, 1, CellAlignment.TOP_LEFT, brazier],
      [6, 3, CellAlignment.BOTTOM_LEFT, brazier],
    ],
    decorators: [
      [3, 8, CellAlignment.CENTER_TOP, barrelsStacked_S],
      [8, 9, CellAlignment.CENTER_RIGHT, barrelsStacked_W],
      [8, 1, CellAlignment.TOP_RIGHT, hay_N],
      [6, 2, CellAlignment.CENTER_LEFT, sack_E],
      [7, 8, CellAlignment.CENTER_LEFT, sack_E],
    ],
  },
  events: [1, 2, 3, 4, 5, 6],
});
export default e1m0;
