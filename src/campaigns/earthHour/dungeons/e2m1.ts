import {
  Colour,
  ConditionType,
  type Dungeon,
  MonsterType,
  SecretType,
  Side,
} from '../../../types';
import { defineDungeon } from '../../../dungeon/DungeonLogic';

export const e2m1: Dungeon = defineDungeon({
  name: 'campaign.earthHour.e2m1.name',
  intro: 'campaign.earthHour.e2m1.intro',
  winConditions: [
    {
      type: ConditionType.OPEN_DOOR,
      targetCell: { x: 5, y: 6 },
      fulfilled: false,
    },
  ],
  startingPositions: [
    [2, 2],
    [1, 1],
    [2, 1],
    [3, 1],
  ],
  discoveredRooms: ['A'],
  layout: {
    grid: [
      '##### #####',
      '#AAA###GGG#',
      '#AAA#HHGGG#',
      '#AAA#H#GGG#',
      '##B#III#F##',
      ' #B#III#F# ',
      '##B#III#F##',
      '#CCC###EEE#',
      '#CCCDDDEEE#',
      '#CCC###EEE#',
      '##### #EEE#',
      '      #####',
    ],
    corridors: ['B', 'D', 'F', 'H'],
    doors: [
      [Side.DOWN, 2, 3],
      [Side.DOWN, 2, 6],
      [Side.RIGHT, 3, 8],
      [Side.RIGHT, 6, 8],
      [Side.UP, 8, 7],
      [Side.UP, 8, 4],
      [Side.LEFT, 7, 2],
      [Side.DOWN, 5, 3],
    ],
    monsters: [
      [MonsterType.ORCH, Colour.Blue, 1, 9],
      [MonsterType.ORCH, Colour.Red, 3, 9],
      [MonsterType.ORCH, Colour.Green, 6, 8],
      [MonsterType.ORCH, Colour.Yellow, 9, 7],
    ],
    secrets: [
      [SecretType.NOTE, 2, 6, 'campaign.earthHour.e2m1.secrets.note1'],
      [SecretType.EQUIPMENT, 8, 1],
      [SecretType.MAGIC_ITEM, 9, 1],
    ],
    notes: [[7, 8, 'campaign.earthHour.e2m1.notes.hint1']],
  },
});
