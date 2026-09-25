import type { Dungeon } from '../../types';
import {
  Colour,
  ConditionType,
  MonsterType,
  SecretType,
  Side,
} from '../../types';
import { defineDungeon } from '../../dungeon/DungeonLogic';
import { weapons } from '../../items/weapons';
import { magicItems } from '../../items/magicItems';
import { e1m5 } from './e1m5';

export const e1m4: Dungeon = defineDungeon({
  name: 'campaign.iceDragon.e1m4.name',
  nextDungeon: e1m5,
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
      type: ConditionType.SECRET_FOUND,
      fulfilled: false,
      targetSecretId: 'secret_stair_16_11',
      additionalDescription:
        'content.winConditions.additional.requiresNecklace',
    },
  ],
  startingPositions: [
    [3, 2],
    [2, 1],
    [2, 2],
    [2, 3],
  ],
  discoveredRooms: ['A'],
  layout: {
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
    doors: [
      [Side.DOWN, 3, 3],
      [Side.RIGHT, 4, 2, { locked: true }],
      [Side.RIGHT, 7, 2],
      [Side.DOWN, 12, 3, { locked: true }],
      [Side.DOWN, 3, 6],
      [Side.DOWN, 12, 6],
      [Side.DOWN, 2, 8, { hidden: true }],
      [Side.RIGHT, 4, 8, { trapped: 2, locked: true }],
      [Side.RIGHT, 7, 8],
      [Side.DOWN, 11, 10],
      [Side.DOWN, 2, 11],
      [Side.RIGHT, 3, 12, { hidden: true }],
      [Side.DOWN, 3, 15],
      [Side.DOWN, 11, 13, { trapped: 2 }],
      [Side.RIGHT, 13, 10, { trapped: 2, hidden: true }],
      [Side.RIGHT, 13, 14, { trapped: 2, hidden: true }],
      [Side.UP, 15, 13, { hidden: true }],
    ],
    monsters: [
      [MonsterType.ORC, Colour.Blue, 12, 1],
      [MonsterType.ORC, Colour.Red, 12, 6],
      [MonsterType.ORC, Colour.Green, 2, 8],
      [MonsterType.ORC, Colour.Yellow, 2, 14],
      [MonsterType.TROLL, Colour.Blue, 10, 9],
      [MonsterType.TROLL, Colour.Yellow, 9, 15, [magicItems[7]]],
      [MonsterType.RED_DARK_LORD, Colour.Red, 16, 10],
    ],
    secrets: [
      [SecretType.NOTE, 13, 2, 'campaign.iceDragon.e1m4.secrets.note1'],
      [SecretType.EQUIPMENT, 4, 10],
      [SecretType.TRAP_DOOR, 5, 15],
      [SecretType.TRAP_DOOR, 14, 10],
      [SecretType.TRAP_DOOR, 15, 11],
      [SecretType.TRAP_DOOR, 14, 12],
      {
        id: 'secret_stair_16_11',
        name: 'campaign.iceDragon.e1m4.secrets.stair',
        nameTranslationKey: 'campaign.iceDragon.e1m4.secrets.stair',
        type: SecretType.NOTE,
        position: { x: 16, y: 11 },
        found: false,
        revealedBy: 'necklace_of_light',
      },
    ],
    notes: [
      [11, 8, 'campaign.iceDragon.e1m4.notes.liberVortex'],
      [13, 10, 'campaign.iceDragon.e1m4.notes.ironDoor'],
    ],
    items: [[3, 8, weapons[1]]],
  },
});
