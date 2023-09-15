import type { Door, Dungeon, Monster, Secret } from "./types";
import { ConditionType, Level, MonsterType, SecretType, Side, Colour } from "./types";

export const PIT = '0'
export const PILLAR = '#'
export const EMPTY = ' '

const createSecret = (type: SecretType, name: string, x: number, y: number): Secret => {
  return {
    type,
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

const createMonster = (type: MonsterType, colour: Colour, x: number, y: number): Monster => {
  const indexOfColour = Object.values(Colour).indexOf(colour);
  const colourName = Object.keys(Colour)[indexOfColour];

  let level = Level.LORD;
  let actions = 2;
  let defense = 2;
  let health = 4;
  let maxHealth = 4;
  let experience = 4;
  switch(type) {
    case MonsterType.ORCH: {
      level = Level.APPRENTICE;
      defense = 0;
      health = 2
      maxHealth = 2;
      experience = 1;
      break;
    }
    case MonsterType.TROLL: {
      level = Level.KNIGHT;
      defense = 1;
      health = 3;
      maxHealth = 3;
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
    maxHealth,
    experience,
    name: type + ' (' + colourName + ')',
    movement: 3,
    position: { x, y }
  }
}

const second: Dungeon = {
  name: 'Second cave',
  beaten: false,
  winConditions: [
    {
      type: ConditionType.REACH_CELL,
      targetCell: {x: 0, y: 0},
      fulfilled: false
    }
  ],
  startingPositions: [
    {x:0,y:2},
    {x:0,y:3},
    {x:0,y:4},
    {x:1,y:3}
  ],
  discoveredRooms: ['A'],
  layout: {
    grid: [
      'AAA',
      'A A',
      'AAA',
      'AAA',
      'AAA'
    ],
    doors: [],
    monsters: [],
    secrets: []
  }
}

export const tutorial: Dungeon = {
  name: 'Troll cave',
  beaten: false,
  winConditions: [
    {
      type: ConditionType.KILL_ALL,
      fulfilled: false
    }
  ],
  nextDungeon: second,
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
      createMonster(MonsterType.ORCH, Colour.Green, 5, 8),
      createMonster(MonsterType.ORCH, Colour.Yellow, 7, 9),
      createMonster(MonsterType.ORCH, Colour.Red, 6, 4),
      createMonster(MonsterType.ORCH, Colour.Red, 8, 2),
      createMonster(MonsterType.TROLL, Colour.Green, 5, 0),
    ],
    secrets: [
      createSecret(SecretType.NOTE, 'Welcome to Drakriddarna', 1, 8),
    ]
  }
}
