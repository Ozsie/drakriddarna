import type { Dungeon } from '../../types';
import {
  Colour,
  ConditionType,
  MonsterType,
  SecretType,
  Side,
} from '../../types';
import {
  createDoor,
  createHiddenDoor,
  createMonster,
  createSecret,
  createSecretWithItem,
} from '../../dungeon/DungeonLogic';
import { magicItems } from '../../items/magicItems';
import { e1m2 } from './e1m2';

export const e1m1: Dungeon = {
  name: 'The Three Gates of Power',
  nextDungeon: e1m2,
  beaten: false,
  winConditions: [
    {
      type: ConditionType.KILL_ALL,
      fulfilled: false,
    },
    {
      type: ConditionType.OPEN_DOOR,
      targetCell: { x: 15, y: 1 },
      fulfilled: false,
    },
  ],
  startingPositions: [
    { x: 2, y: 5 },
    { x: 1, y: 4 },
    { x: 1, y: 5 },
    { x: 1, y: 6 },
  ],
  discoveredRooms: ['A'],
  layout: {
    grid: [
      '            ######',
      '            #EEEE#',
      '         ####EEEE#',
      '##### ####DDDEEEE#',
      '#AAA###CCCC#######',
      '#AAABBBCCCC###GGG#',
      '#AAA###CCCCFFFGGG#',
      '##### #CCCC###GGG#',
      '      #CCCC#######',
      '      #CCCCHHHIII#',
      '      ########III#',
      '             #III#',
      '             #####',
    ],
    corridors: ['B', 'D', 'F', 'H'],
    doors: [
      createDoor(Side.RIGHT, 3, 5),
      createDoor(Side.RIGHT, 6, 5),
      createDoor(Side.RIGHT, 10, 6),
      createDoor(Side.RIGHT, 13, 6),
      createDoor(Side.RIGHT, 10, 9),
      createDoor(Side.RIGHT, 13, 9),
      createDoor(Side.RIGHT, 12, 3),
      createHiddenDoor(Side.UP, 9, 4),
      createHiddenDoor(Side.RIGHT, 15, 2),
    ],
    monsters: [
      createMonster(MonsterType.ORCH, Colour.Blue, 10, 8),
      createMonster(MonsterType.ORCH, Colour.Red, 13, 9),
      createMonster(MonsterType.TROLL, Colour.Red, 16, 2),
      createMonster(MonsterType.TROLL, Colour.Yellow, 14, 7),
    ],
    secrets: [
      createSecret(SecretType.EQUIPMENT, 'Random Equipment', 10, 5),
      createSecret(SecretType.EQUIPMENT, 'Random Equipment', 13, 1),
      createSecret(SecretType.EQUIPMENT, 'Random Equipment', 16, 10),
      createSecretWithItem(SecretType.MAGIC_ITEM, 16, 6, magicItems[0]),
    ],
    notes: [
      {
        message:
          'Beyond stone and fire you shall find the Dread tunnel, the road to the Ice Dragons treasure.',
        position: { x: 2, y: 4 },
      },
      {
        message:
          'The Gate of Water. <There is an image of a sea dragon under the text>',
        position: { x: 9, y: 8 },
      },
      {
        message:
          'The Gate of Air. <There is an image of a pegasus under the text>',
        position: { x: 9, y: 5 },
      },
      {
        message:
          'The Gate of Fire. <There is an image of a hippogriph under the text>',
        position: { x: 9, y: 3 },
      },
    ],
    items: [],
  },
  killCount: 0,
};
