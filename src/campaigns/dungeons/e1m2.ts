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
import { e1m3 } from './e1m3';

export const e1m2: Dungeon = {
  name: 'campaign.iceDragon.e1m2.name',
  nextDungeon: e1m3,
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
      createSecret(
        SecretType.EQUIPMENT,
        'campaign.iceDragon.randomEquipment',
        1,
        3,
      ),
      createSecret(
        SecretType.EQUIPMENT,
        'campaign.iceDragon.randomEquipment',
        3,
        3,
      ),
      createSecret(
        SecretType.EQUIPMENT,
        'campaign.iceDragon.randomEquipment',
        15,
        2,
      ),
      createSecretWithItem(SecretType.MAGIC_ITEM, 2, 3, magicItems[1]),
      createSecretWithItem(SecretType.MAGIC_ITEM, 16, 11, magicItems[6]),
    ],
    notes: [
      {
        message: 'campaign.iceDragon.e1m2.notes.hint1',
        position: { x: 2, y: 10 },
      },
      {
        message: 'campaign.iceDragon.e1m2.notes.hint2',
        position: { x: 8, y: 10 },
      },
      {
        message: 'campaign.iceDragon.e1m2.notes.hint3',
        position: { x: 2, y: 3 },
      },
      {
        message: 'campaign.iceDragon.e1m2.notes.hint4',
        position: { x: 17, y: 11 },
      },
    ],
    items: [],
  },
  killCount: 0,
};
