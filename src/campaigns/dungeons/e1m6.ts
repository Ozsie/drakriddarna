import type { Dungeon } from '../../types';
import {
  Colour,
  ConditionType,
  MonsterType,
  SecretType,
  Side,
} from '../../types';
import { defineDungeon } from '../../dungeon/DungeonLogic';

export const e1m6: Dungeon = defineDungeon({
  name: 'campaign.iceDragon.e1m6.name',
  winConditions: [
    {
      type: ConditionType.KILL_ALL,
      fulfilled: false,
    },
  ],
  startingPositions: [
    [11, 2],
    [12, 1],
    [12, 2],
    [12, 3],
  ],
  discoveredRooms: ['A'],
  layout: {
    grid: [
      '######## #####',
      '#BBBBBB###AAA#',
      '#BBBBBBCCCAAA#',
      '#BBBBBB###AAA#',
      '##D##### #####',
      ' #D#          ',
      '##D##FFFFFF   ',
      '#EEE#F    F   ',
      '#EEE#FFF  F   ',
      '#EEE#FFF  F   ',
      '#EEE#FFF  F   ',
      '#EEE#     F   ',
      '#EEE#  FFFF   ',
      '#EEEFFFFFFF   ',
      '#####         ',
    ],
    corridors: ['C', 'D'],
    pits: [],
    pillars: [],
    doors: [
      [Side.LEFT, 10, 2, { reinforced: true }],
      [Side.DOWN, 2, 3, { reinforced: true }],
      [Side.RIGHT, 3, 13, { reinforced: true }],
    ],
    monsters: [
      [MonsterType.ORC, Colour.Green, 2, 1],
      [MonsterType.ORC, Colour.Red, 4, 1],
      [MonsterType.ORC, Colour.Blue, 2, 3],
      [MonsterType.ORC, Colour.Yellow, 4, 3],
      [MonsterType.TROLL, Colour.Green, 1, 9],
      [MonsterType.TROLL, Colour.Red, 3, 9],
      [MonsterType.TROLL, Colour.Blue, 1, 12],
      [MonsterType.TROLL, Colour.Yellow, 3, 12],
      [MonsterType.GREEN_DARK_LORD, Colour.Green, 5, 8],
      [MonsterType.RED_DARK_LORD, Colour.Red, 7, 8],
      [MonsterType.YELLOW_DARK_LORD, Colour.Yellow, 5, 10],
      [MonsterType.BLUE_DARK_LORD, Colour.Blue, 7, 10],
    ],
    secrets: [
      [SecretType.TRAP_DOOR, 7, 2],
      [SecretType.TRAP_DOOR, 5, 13],
    ],
    notes: [],
  },
  onRoomDiscovered: {
    F: 'stopEvents',
  },
});
