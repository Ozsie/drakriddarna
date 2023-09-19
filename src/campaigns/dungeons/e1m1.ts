import type { Dungeon } from "../../types";
import {
  Colour,
  ConditionType,
  MonsterType,
  SecretType,
  Side
} from "../../types";
import {
  createDoor,
  createHiddenDoor,
  createMonster
} from "../../dungeon/DungeonLogic";

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
      createHiddenDoor(Side.UP, 9, 3),
      createHiddenDoor(Side.RIGHT, 15, 1)
    ],
    monsters: [
      createMonster(MonsterType.ORCH, Colour.Blue, 9, 7),
      createMonster(MonsterType.ORCH, Colour.Red, 12, 8),
      createMonster(MonsterType.TROLL, Colour.Red, 15, 1),
      createMonster(MonsterType.TROLL, Colour.Yellow, 13, 6),
    ],
    secrets: [
      {
        type: SecretType.EQUIPMENT,
        position: {x:9,y:4},
        found: false,
        name: 'Random Equipment'
      },
      {
        type: SecretType.EQUIPMENT,
        position: {x:12,y:0},
        found: false,
        name: 'Random Equipment'
      },
      {
        type: SecretType.MAGIC_ITEM,
        position: {x:15,y:5},
        found: false,
        name: 'Random Magic Item',
      },
      {
        type: SecretType.EQUIPMENT,
        position: {x:15,y:9},
        found: false,
        name: 'Random Equipment'
      },
    ],
    notes: [
      {
        message: 'Beyond stone and fire you shall find the Dread tunnel, the road to the Ice Dragons treasure.',
        position: {x:2,y:4}
      },
      {
        message: 'The Gate of Water. <There is an image of a sea dragon under the text>',
        position: {x:9,y:8}
      },
      {
        message: 'The Gate of Air. <There is an image of a pegasus under the text>',
        position: {x:9,y:5}
      },
      {
        message: 'The Gate of Fire. <There is an image of a hippogriph under the text>',
        position: {x:9,y:3}
      },
    ]
  },
  killCount: 0
}