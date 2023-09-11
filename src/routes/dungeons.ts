import type { Dungeon, Monster } from "./types";
import { Level, MonsterType, Side } from "./types";

export const PIT = '0'
export const PILLAR = '#'
export const EMPTY = ' '

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
    name: type.valueOf(),
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
      {
        locked: false,
        trapped: false,
        open: false,
        x: 2,
        y: 8,
        side: Side.RIGHT
      },
      {
        locked: false,
        trapped: false,
        open: false,
        x: 5,
        y: 8,
        side: Side.RIGHT
      },
      {
        locked: false,
        trapped: false,
        open: false,
        x: 6,
        y: 6,
        side: Side.UP
      },
      {
        locked: false,
        trapped: false,
        open: false,
        x: 6,
        y: 3,
        side: Side.UP
      },
    ],
    monsters: [
      createMonster(MonsterType.ORCH, 'green', 5, 8)
    ]
  }
}
