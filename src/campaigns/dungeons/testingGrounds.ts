import {
  Colour,
  ConditionType,
  MonsterType,
  SecretType,
  Side
} from '../../types';
import type { Dungeon } from '../../types';
import {
  createDoor,
  createLockedDoor,
  createMonster,
  createSecret, createSecretWithItem,
  createTrappedDoor,
  createTrappedHiddenDoor
} from "../../dungeon/DungeonLogic";
import { weapons } from '../../items/weapons';
import { e1m0 } from '../../campaigns/dungeons/e1m0';
import { magicItems } from "../../items/magicItems";

export const testingGrounds: Dungeon = {
  name: 'Testing Grounds',
  beaten: false,
  winConditions: [
    {
      type: ConditionType.KILL_ALL,
      fulfilled: false
    }
  ],
  nextDungeon: e1m0,
  startingPositions: [
    {x:2,y:9},
    {x:1,y:8},
    {x:1,y:9},
    {x:1,y:10},
  ],
  discoveredRooms: ['A','G'],
  layout: {
    grid: [
      '###########',
      '#CCCCCCCCC#',
      '#CCCCCCCCC#',
      '#CCCCCCCCC#',
      '#######E###',
      '  #####E#  ',
      '  #FFFFE## ',
      '###F###AA# ',
      '#AAAAAAAA# ',
      '#AAAAAAAA# ',
      '#AAAAAAAA# ',
      '##G####### ',
      ' #G#       ',
      ' #G#       ',
      ' ###       '
    ],
    corridors: ['G','E','F'],
    doors: [
      createTrappedHiddenDoor(Side.UP, 3, 8, 1),
      createLockedDoor(Side.LEFT, 7, 6),
      createTrappedDoor(Side.UP, 7, 7, 1),
      createDoor(Side.UP, 7, 4),
    ],
    monsters: [
      createMonster(MonsterType.ORCH, Colour.Green, 1, 1),
      createMonster(MonsterType.TROLL, Colour.Green, 5, 1),
    ],
    secrets: [
      createSecret(SecretType.TRAP_DOOR, 'Welcome to Drakriddarna', 3, 9),
      createSecret(SecretType.EQUIPMENT, 'Random Equipment', 1, 10),
      createSecretWithItem(SecretType.EQUIPMENT, 5, 10, weapons[2]),
    ],
    notes: [],
    items: [
      {
        item: magicItems[0],
        position: {x: 3, y: 10 }
      },
      {
        item: magicItems[1],
        position: {x: 4, y: 10 }
      },
      {
        item: magicItems[6],
        position: {x: 5, y: 10 }
      },
      {
        item: magicItems[2],
        position: {x: 6, y: 10 }
      },
      {
        item: magicItems[3],
        position: {x: 7, y: 10 }
      },
      {
        item: magicItems[4],
        position: {x: 8, y: 10 }
      },
    ],
  },
  killCount: 0
}