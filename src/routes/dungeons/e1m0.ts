import { Colour, ConditionType, MonsterType, SecretType, Side } from '../types';
import type { Dungeon } from '../types';
import { createDoor, createMonster, createSecret } from '../dungeons';
import { e1m1 } from './e1m1';

export const e1m0: Dungeon = {
  name: 'Troll cave',
  beaten: false,
  winConditions: [
    {
      type: ConditionType.KILL_ALL,
      fulfilled: false
    }
  ],
  nextDungeon: e1m1,
  startingPositions: [
    {x:1,y:8},
    {x:0,y:7},
    {x:0,y:8},
    {x:0,y:9},
  ],
  discoveredRooms: ['A'],
  layout: {
    grid: [
      '     CCCC',
      '     CCCC',
      '     CCCC',
      '      E  ',
      '      E  ',
      '      E  ',
      '      BB ',
      'AAA   BB ',
      'AAADDDBB ',
      'AAA   BB '
    ],
    doors: [
      createDoor(Side.RIGHT, 2, 8),
      createDoor(Side.RIGHT, 5, 8),
      createDoor(Side.UP, 6, 6),
      createDoor(Side.UP, 6, 3),
    ],
    monsters: [
      createMonster(MonsterType.ORCH, Colour.Green, 5, 8),
      createMonster(MonsterType.ORCH, Colour.Yellow, 7, 9),
      createMonster(MonsterType.ORCH, Colour.Red, 6, 4),
      createMonster(MonsterType.ORCH, Colour.Red, 8, 2),
      createMonster(MonsterType.TROLL, Colour.Green, 5, 0),
    ],
    secrets: [
      createSecret(SecretType.NOTE, 'Welcome to Drakriddarna', 1, 8),
    ],
    notes: []
  },
  killCount: 0
}