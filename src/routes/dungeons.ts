import type { Door, Dungeon, Monster, Secret } from "./types";
import { Level, MonsterType, Side } from "./types";

export const PIT = '0'
export const PILLAR = '#'
export const EMPTY = ' '

const createSecret = (name: string, x: number, y: number): Secret => {
  return {
    name,
    position: {x, y},
    found: false
  }
}

const createDoor = (side: Side, x: number, y: number): Door => {
  return {
    side,
    x,
    y,
    locked: false,
    trapped: false,
    open: false,
  }
}

const createMonster = (type: MonsterType, colour: string, x: number, y: number): Monster => {
  let level = Level.LORD;
  let actions = 2;
  let defense = 2;
  let health = 4;
  let experience = 3;
  switch(type) {
    case MonsterType.ORCH: {
      level = Level.APPRENTICE;
      defense = 0;
      health = 2
      experience = 1;
      break;
    }
    case MonsterType.TROLL: {
      level = Level.KNIGHT;
      defense = 1;
      health = 3;
      experience = 2;
      break;
    }
  }
  if (type === MonsterType.YELLOW_DARK_LORD) actions = 3
  return {
    type,
    level,
    colour,
    actions,
    defense,
    health,
    experience,
    name: type.valueOf() + ' (' + colour + ')',
    movement: 3,
    position: { x, y }
  }
}

export const tutorial: Dungeon = {
  name: 'Troll cave',
  startingPositions: [
    {x:0,y:7},
    {x:0,y:8},
    {x:0,y:9},
    {x:1,y:8}
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
      createMonster(MonsterType.ORCH, 'green', 5, 8),
      createMonster(MonsterType.ORCH, 'yellow', 7, 9),
      createMonster(MonsterType.ORCH, 'red', 6, 4),
      createMonster(MonsterType.ORCH, 'red', 8, 2),
      createMonster(MonsterType.TROLL, 'green', 5, 0),
    ],
    secrets: [
      createSecret('Welcome to Drakriddarna', 1, 8),
    ]
  }
}
