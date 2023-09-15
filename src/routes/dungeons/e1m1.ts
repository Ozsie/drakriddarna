import type { Dungeon } from '../types';
import { ConditionType, Side } from '../types';
import { createDoor, createHiddenDoor } from '../dungeons';

export const e1m1: Dungeon = {
  name: 'The Three Gates of Power',
  beaten: false,
  winConditions: [
    {
      type: ConditionType.KILL_ALL,
      fulfilled: false,
    },
    {
      type: ConditionType.OPEN_DOOR,
      targetCell: {x:15,y:1},
      fulfilled: false
}
  ],
  startingPositions: [
    {x:1,y:4},
    {x:0,y:3},
    {x:0,y:4},
    {x:0,y:5},
  ],
  discoveredRooms: ['A'],
  layout: {
    grid: [
      '            EEEE',
      '            EEEE',
      '         DDDEEEE',
      'AAA   CCCC',
      'AAABBBCCCC   GGG',
      'AAA   CCCCFFFGGG',
      '      CCCC   GGG',
      '      CCCC',
      '      CCCCHHHIII',
      '             III',
      '             III',
    ],
    doors: [
      createDoor(Side.RIGHT, 2, 4),
      createDoor(Side.RIGHT, 5, 4),
      createDoor(Side.RIGHT, 9, 5),
      createDoor(Side.RIGHT, 12, 5),
      createDoor(Side.RIGHT, 9, 8),
      createDoor(Side.RIGHT, 12, 8),
      createDoor(Side.RIGHT, 11, 2),
      createHiddenDoor(Side.UP, 9, 3)
    ],
    monsters: [],
    secrets: []
  },
  killCount: 0
}