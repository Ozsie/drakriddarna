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
  createTrappedDoor,
  createTrappedHiddenDoor,
} from '../../dungeon/DungeonLogic';
import { weapons } from '../../items/weapons';
import { e1m0 } from './e1m0';
import { magicItems } from '../../items/magicItems';

export const testingGrounds: Dungeon = {
  name: 'campaign.iceDragon.testingGrounds.name',
  beaten: true,
  winConditions: [
    {
      type: ConditionType.KILL_ALL,
      fulfilled: true,
    },
    {
      type: ConditionType.OPEN_DOOR,
      targetCell: { x: 2, y: 10 },
      fulfilled: false,
    },
    {
      type: ConditionType.KILL_ALL_OF_TYPE,
      targetMonsterType: MonsterType.ORCH,
      fulfilled: false,
    },
    {
      type: ConditionType.REACH_CELL,
      targetCell: { x: 2, y: 10 },
      fulfilled: false,
    },
    {
      type: ConditionType.KILL_AT_LEAST,
      killMinCount: 5,
      fulfilled: false,
    },
  ],
  nextDungeon: e1m0,
  startingPositions: [
    { x: 2, y: 9 },
    { x: 1, y: 8 },
    { x: 1, y: 9 },
    { x: 1, y: 10 },
  ],
  discoveredRooms: ['A', 'D'],
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
      '#AAAAAAAA#D',
      '#AAAAAAAA#D',
      '#AAAAAAAA#D',
      '##G####### ',
      ' #G#       ',
      ' #G#       ',
      ' ###       ',
    ],
    pillars: [
      { x: 8, y: 3 },
      { x: 7, y: 9 },
    ],
    pits: [
      { x: 6, y: 3 },
      { x: 6, y: 2 },
    ],
    corridors: ['G', 'E', 'F'],
    doors: [
      createTrappedHiddenDoor(Side.UP, 3, 8, 1),
      createLockedDoor(Side.LEFT, 7, 6),
      createTrappedDoor(Side.UP, 7, 7, 1),
      createDoor(Side.UP, 7, 4),
      createHiddenDoor(Side.DOWN, 2, 10),
    ],
    monsters: [
      createMonster(MonsterType.ORCH, Colour.Green, 1, 1),
      createMonster(MonsterType.ORCH, Colour.Red, 4, 9),
      createMonster(MonsterType.TROLL, Colour.Green, 5, 1),
    ],
    secrets: [
      createSecret(
        SecretType.TRAP_DOOR,
        'campaign.iceDragon.testingGrounds.secrets.trapDoor',
        3,
        9,
      ),
      createSecret(
        SecretType.EQUIPMENT,
        'campaign.iceDragon.randomEquipment',
        1,
        10,
      ),
      createSecretWithItem(SecretType.EQUIPMENT, 5, 10, weapons[2]),
    ],
    notes: [],
    items: [
      {
        item: magicItems[0],
        position: { x: 3, y: 10 },
      },
      {
        item: magicItems[1],
        position: { x: 4, y: 10 },
      },
      {
        item: magicItems[6],
        position: { x: 5, y: 10 },
      },
      {
        item: magicItems[2],
        position: { x: 6, y: 10 },
      },
      {
        item: magicItems[3],
        position: { x: 7, y: 10 },
      },
      {
        item: magicItems[4],
        position: { x: 8, y: 10 },
      },
    ],
  },
  killCount: 0,
};
