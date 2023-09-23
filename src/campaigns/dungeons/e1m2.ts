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
  createLockedDoor,
  createMonster,
  createSecret,
  createSecretWithItem,
} from '../../dungeon/DungeonLogic';
import { magicItems } from '../../items/magicItems';

export const e1m2: Dungeon = {
  name: 'The Mines of Evil',
  beaten: false,
  winConditions: [
    {
      type: ConditionType.KILL_ALL,
      fulfilled: false,
    },
    {
      type: ConditionType.OPEN_DOOR,
      targetCell: { x: 17, y: 14 },
      fulfilled: false,
    },
  ],
  startingPositions: [
    { x: 2, y: 14 },
    { x: 1, y: 15 },
    { x: 2, y: 15 },
    { x: 3, y: 15 },
  ],
  discoveredRooms: ['M'],
  layout: {
    grid: [
      '############## #####',
      '#AAA###CCCCCC###EEE#',
      '#AAABBBC@CC@CDDDEEE#',
      '#AAA###CCCCCC###EEE#',
      '##### ##H##### #EEE#',
      '       #H#     #EEE#',
      '##### ##H##### #EEE#',
      '#KKK###IIIIII# #EEE#',
      '#KKKJJJIIIIII# ##F##',
      '#KKK###IIIIII# ##F##',
      '##L## #IIIIII# ##F##',
      ' #L#  ######## #GGG#',
      '##L##          #GGG#',
      '#MMM#          #GGG#',
      '#MMM#          #GGG#',
      '#MMM#          #####',
      '#####               ',
    ],
    corridors: ['B', 'D', 'F', 'H', 'J', 'L'],
    doors: [
      createDoor(Side.UP, 2, 13),
      createDoor(Side.UP, 2, 10),
      createDoor(Side.RIGHT, 3, 8),
      createLockedDoor(Side.RIGHT, 6, 8),
      createDoor(Side.UP, 8, 7),
      createDoor(Side.UP, 8, 4),
      createHiddenDoor(Side.LEFT, 7, 2),
      createDoor(Side.LEFT, 4, 2),
      createLockedDoor(Side.RIGHT, 12, 2),
      createDoor(Side.RIGHT, 15, 2),
      createDoor(Side.DOWN, 17, 7),
      createDoor(Side.DOWN, 17, 10),
      createHiddenDoor(Side.DOWN, 17, 14),
    ],
    monsters: [
      createMonster(MonsterType.TROLL, Colour.Red, 3, 7),
      createMonster(MonsterType.ORCH, Colour.Red, 12, 8),
      createMonster(MonsterType.ORCH, Colour.Green, 11, 1),
      createMonster(MonsterType.TROLL, Colour.Green, 2, 2),
      createMonster(MonsterType.ORCH, Colour.Yellow, 18, 7),
      createMonster(MonsterType.TROLL, Colour.Yellow, 17, 10),
    ],
    secrets: [
      createSecret(SecretType.EQUIPMENT, 'Equipment', 1, 3),
      createSecret(SecretType.EQUIPMENT, 'Equipment', 3, 3),
      createSecret(SecretType.EQUIPMENT, 'Equipment', 15, 2),
      createSecretWithItem(SecretType.MAGIC_ITEM, 2, 3, magicItems[1]),
      createSecretWithItem(SecretType.MAGIC_ITEM, 16, 11, magicItems[6]),
    ],
    notes: [
      {
        message: 'Guard room',
        position: { x: 2, y: 10 },
      },
      {
        message: 'Look in the pillar room for the armory of the dwarf king',
        position: { x: 8, y: 10 },
      },
      {
        message:
          'To reach the treasure of the ice dragon, look behind the mirror in the alchemy laboratory.',
        position: { x: 2, y: 3 },
      },
      {
        message: 'A large mirror decorates the far wall of this room.',
        position: { x: 17, y: 11 },
      },
    ],
    items: [],
  },
  killCount: 0,
};
