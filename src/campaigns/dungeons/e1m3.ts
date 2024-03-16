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
  createMonsterWithInventory,
  createSecret,
  createSecretWithItem,
  createTrappedLockedDoor,
} from '../../dungeon/DungeonLogic';
import { magicItems } from '../../items/magicItems';
import { e1m4 } from './e1m4';

export const e1m3: Dungeon = {
  name: 'campaign.iceDragon.e1m3.name',
  nextDungeon: e1m4,
  beaten: false,
  winConditions: [
    {
      type: ConditionType.KILL_ALL,
      fulfilled: false,
    },
    {
      type: ConditionType.OPEN_DOOR,
      targetCell: { x: 18, y: 4 },
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
    corners: [],
    grid: [
      '       ########     ',
      '     ###DDDEEE#     ',
      '     #CCC##EEE#     ',
      '######CCC##EEE######',
      '#AAA##CCC####F#IIII#',
      '#AAABBB#J####F#IIII#',
      '#AAA####J##G#F#IIII#',
      '##### ##J##GGF#IIII#',
      '   ####KKK###F#IIII#',
      '   #LLLKKK# #FMIIII#',
      '   ####KKK####M#####',
      '      #KKKMMMMM#    ',
      '      ####MMMM##    ',
      '         ######     ',
    ],
    corridors: ['B', 'D', 'F', 'L'],
    pits: [
      { x: 16, y: 6 },
      { x: 17, y: 6 },
      { x: 18, y: 6 },
      { x: 15, y: 8 },
      { x: 16, y: 8 },
      { x: 17, y: 8 },
    ],
    doors: [
      createDoor(Side.RIGHT, 3, 5),
      createTrappedLockedDoor(Side.DOWN, 6, 5, 1),
      createDoor(Side.UP, 6, 5),
      createDoor(Side.DOWN, 8, 4),
      createHiddenDoor(Side.UP, 8, 2),
      createDoor(Side.DOWN, 8, 7),
      createDoor(Side.LEFT, 7, 9),
      createTrappedLockedDoor(Side.LEFT, 4, 9, 1),
      createTrappedLockedDoor(Side.RIGHT, 9, 11, 1),
      createHiddenDoor(Side.RIGHT, 14, 9),
      createHiddenDoor(Side.UP, 18, 4),
      createTrappedLockedDoor(Side.LEFT, 14, 9, 1),
      createDoor(Side.LEFT, 13, 7),
      createLockedDoor(Side.UP, 11, 6),
      createDoor(Side.UP, 13, 4),
      createDoor(Side.LEFT, 11, 1),
    ],
    monsters: [
      createMonster(MonsterType.ORCH, Colour.Yellow, 5, 5),
      createMonsterWithInventory(MonsterType.TROLL, Colour.Yellow, 7, 3, [
        magicItems[3],
      ]),
      createMonster(MonsterType.ORCH, Colour.Red, 7, 11),
      createMonster(MonsterType.ORCH, Colour.Blue, 11, 2),
      createMonster(MonsterType.ORCH, Colour.Blue, 14, 11),
      createMonster(MonsterType.YELLOW_DARK_LORD, Colour.Yellow, 18, 5),
    ],
    secrets: [
      createSecretWithItem(SecretType.MAGIC_ITEM, 8, 10, magicItems[2]),
      createSecret(SecretType.TRAP_DOOR, 'campaign.iceDragon.trapDoor', 8, 6),
      createSecret(SecretType.TRAP_DOOR, 'campaign.iceDragon.trapDoor', 11, 1),
      createSecret(SecretType.TRAP_DOOR, 'campaign.iceDragon.trapDoor', 11, 7),
      createSecret(SecretType.TRAP_DOOR, 'campaign.iceDragon.trapDoor', 13, 11),
    ],
    notes: [
      {
        position: { x: 6, y: 5 },
        message: 'campaign.iceDragon.e1m3.notes.hint1',
      },
      {
        position: { x: 8, y: 3 },
        message: 'campaign.iceDragon.e1m3.notes.hint2',
      },
      {
        position: { x: 8, y: 8 },
        message: 'campaign.iceDragon.e1m3.notes.hint3',
      },
      {
        position: { x: 14, y: 10 },
        message: 'campaign.iceDragon.e1m3.notes.hint4',
      },
    ],
    items: [],
  },
  killCount: 0,
};
