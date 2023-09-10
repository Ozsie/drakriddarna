import type { Dungeon } from './types';
import { Side } from './types';

export const PIT = '0'
export const PILLAR = '#'
export const EMPTY = ' '

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
    ]
  }
}
