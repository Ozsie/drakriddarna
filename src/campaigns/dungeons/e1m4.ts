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
  createEquipment,
  createHiddenDoor,
  createLockedDoor,
  createMonster,
  createMonsterWithInventory,
  createSecret,
  createTrappedDoor,
  createTrappedHiddenDoor,
  createTrappedLockedDoor,
} from '../../dungeon/DungeonLogic';
import { weapons } from '../../items/weapons';
import { magicItems } from '../../items/magicItems';

export const e1m4: Dungeon = {
  name: 'campaign.iceDragon.e1m4.name',
  beaten: false,
  winConditions: [
    {
      type: ConditionType.KILL_AT_LEAST,
      killMinCount: 7,
      fulfilled: false,
    },
    {
      type: ConditionType.KILL_ALL,
      fulfilled: false,
    },
    {
      type: ConditionType.REACH_CELL,
      fulfilled: false,
      targetCell: { x: 16, y: 11 },
      checkFulfilled: 'hasNecklaceOfLight',
      additionalDescription:
        'content.winConditions.additional.requiresNecklace',
    },
  ],
  startingPositions: [
    { x: 3, y: 2 },
    { x: 2, y: 1 },
    { x: 2, y: 2 },
    { x: 2, y: 3 },
  ],
  discoveredRooms: ['A'],
  layout: {
    corners: [],
    grid: [
      ' ##### ########   ',
      ' #AAA###CCCCCC#   ',
      ' #AAABBBCCCCCC#   ',
      ' #AAA###CCCCCC#   ',
      ' ##D## #####G##   ',
      '  #D#  #####G##   ',
      '###D## #####G##   ',
      '#EEEE###HHHHHH#   ',
      '#EEEEFFFHHHHHH#   ',
      '##L#####HHHHHH####',
      '##L#NNN#HHHHHHIII#',
      '##L#NNN####K##III#',
      '#MMMNNN####K##III#',
      '#MMM#######K###J##',
      '#MMM###PPPPPPPJJ##',
      '#MMMPPPPPPPPPP####',
      '#######PPPPPPP#   ',
      '      #########   ',
    ],
    corridors: ['B', 'D', 'G', 'F', 'L', 'K', 'J'],
    pits: [],
    doors: [
      createDoor(Side.DOWN, 3, 3),
      createLockedDoor(Side.RIGHT, 4, 2),
      createDoor(Side.RIGHT, 7, 2),
      createLockedDoor(Side.DOWN, 12, 3),
      createDoor(Side.DOWN, 3, 6),
      createDoor(Side.DOWN, 12, 6),
      createHiddenDoor(Side.DOWN, 2, 8),
      createTrappedLockedDoor(Side.RIGHT, 4, 8, 2),
      createDoor(Side.RIGHT, 7, 8),
      createDoor(Side.DOWN, 11, 10),
      createDoor(Side.DOWN, 2, 11),
      createHiddenDoor(Side.RIGHT, 3, 12),
      createDoor(Side.DOWN, 3, 15),
      createTrappedDoor(Side.DOWN, 11, 13, 2),
      createTrappedHiddenDoor(Side.RIGHT, 13, 10, 2),
      createTrappedHiddenDoor(Side.RIGHT, 13, 14, 2),
      createHiddenDoor(Side.UP, 15, 13),
    ],
    monsters: [
      createMonster(MonsterType.ORCH, Colour.Blue, 12, 1),
      createMonster(MonsterType.ORCH, Colour.Red, 12, 6),
      createMonster(MonsterType.ORCH, Colour.Green, 2, 8),
      createMonster(MonsterType.ORCH, Colour.Yellow, 2, 14),
      createMonster(MonsterType.TROLL, Colour.Blue, 10, 9),
      createMonsterWithInventory(MonsterType.TROLL, Colour.Yellow, 9, 15, [
        magicItems[7],
      ]),
      createMonster(MonsterType.RED_DARK_LORD, Colour.Red, 16, 10),
    ],
    secrets: [
      createSecret(
        SecretType.NOTE,
        'campaign.iceDragon.e1m4.secrets.note1',
        13,
        2,
      ),
      createSecret(
        SecretType.EQUIPMENT,
        'campaign.iceDragon.randomEquipment',
        4,
        10,
      ),
      createSecret(SecretType.TRAP_DOOR, 'campaign.iceDragon.trapDoor', 5, 15),
      createSecret(SecretType.TRAP_DOOR, 'campaign.iceDragon.trapDoor', 14, 10),
      createSecret(SecretType.TRAP_DOOR, 'campaign.iceDragon.trapDoor', 15, 11),
      createSecret(SecretType.TRAP_DOOR, 'campaign.iceDragon.trapDoor', 14, 12),
    ],
    notes: [
      {
        position: { x: 11, y: 8 },
        message: 'campaign.iceDragon.e1m4.notes.liberVortex',
      },
      {
        position: { x: 13, y: 10 },
        message: 'campaign.iceDragon.e1m4.notes.ironDoor',
      },
    ],
    items: [createEquipment(3, 8, weapons[1])],
  },
  killCount: 0,
};
