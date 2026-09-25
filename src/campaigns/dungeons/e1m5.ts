import {
  Colour,
  ConditionType,
  type Dungeon,
  type GameState,
  ItemType,
  MonsterType,
  SecretType,
  Side,
} from '../../types';
import { defineDungeon } from '../../dungeon/dungeonParser';
import { magicItems } from '../../items/magicItems';
import { isSamePosition } from '../../core';
import {
  removeFoundItemFromDeck,
  removeFoundMagicItemFromDeck,
} from '../../secrets/SecretsLogic';

const roomKFloorPositions = [
  { x: 10, y: 2 },
  { x: 11, y: 2 },
  { x: 12, y: 2 },
  { x: 13, y: 2 },
  { x: 10, y: 3 },
  { x: 12, y: 3 },
  { x: 13, y: 3 },
  { x: 10, y: 4 },
  { x: 11, y: 4 },
  { x: 12, y: 4 },
  { x: 13, y: 4 },
];

const revealRemainingItemsInRoomK = (state: GameState) => {
  const floorPositions = roomKFloorPositions.filter(
    (pos) => !state.dungeon.layout.items.some((i) => isSamePosition(i.position, pos)),
  );

  const remaining = [...state.itemDeck, ...state.magicItemDeck];

  remaining.forEach((item, index) => {
    const position = floorPositions[index % floorPositions.length];
    state.dungeon.layout.items.push({ item, position });
    if (item.type === ItemType.MAGIC) {
      removeFoundMagicItemFromDeck(state, item);
    } else {
      removeFoundItemFromDeck(state, item);
    }
  });
};

export const e1m5: Dungeon = defineDungeon({
  name: 'campaign.iceDragon.e1m5.name',
  winConditions: [
    {
      type: ConditionType.OPEN_DOOR,
      targetCell: { x: 17, y: 2 },
      fulfilled: false,
    },
  ],
  startingPositions: [
    [2, 10],
    [1, 9],
    [1, 10],
    [1, 11],
  ],
  discoveredRooms: ['A'],
  layout: {
    grid: [
      '              ##### ',
      '   ##### ######III# ',
      '   #MMM###KKKK#III# ',
      '   #MMMLLLKKKK#III# ',
      '   #MMM###KKKK##H## ',
      '   ###N# ###J# #H#  ',
      '     #N#####J###H###',
      '     #NCCC##JGGGGGG#',
      '#######CCC###GGGGGG#',
      '#AAA###CCC###GGGGGG#',
      '#AAABBBCCCFFFGGGGGG#',
      '#AAA###CCC###GGGGGG#',
      '##### #CCC# #GGGGGG#',
      '      #CCC# #GGGGGG#',
      '      ##D###########',
      '       #DDEEEE#     ',
      '       ###EEEE#     ',
      '         ######     ',
    ],
    corridors: ['B', 'D', 'F', 'H', 'J', 'L', 'N'],
    doors: [
      [Side.RIGHT, 3,10],
      [Side.RIGHT, 6,10, { trapped: 1, locked: true }],
      [Side.RIGHT, 9,10],
      [Side.RIGHT, 12,10, { trapped: 1, locked: true }],
      [Side.DOWN, 8, 13],
      [Side.RIGHT, 9, 15, { trapped: 1, locked: true }],
      [Side.UP, 16, 7],
      [Side.UP, 16, 4, { trapped: 1, locked: true }],
      [Side.RIGHT, 17, 2, { hidden: true }],
      [Side.LEFT, 7, 6],
      [Side.UP, 6, 4, { trapped: 1, locked: true }],
      [Side.RIGHT, 6, 3, { hidden: true }],
      [Side.RIGHT, 9, 3, { hidden: true }],
      [Side.LEFT, 13, 7, { hidden: true }],
      [Side.UP, 12, 5, { hidden: true }],
    ],
    monsters: [
      [MonsterType.ORC, Colour.Blue, 8, 8],
      [MonsterType.TROLL, Colour.Blue, 8, 10],
      [MonsterType.ORC, Colour.Red, 8, 12],
      [MonsterType.ORC, Colour.Green, 13, 15],
      [MonsterType.ORC, Colour.Yellow, 6, 3],
      [MonsterType.BLUE_DARK_LORD, Colour.Blue, 15, 1],
      [MonsterType.YELLOW_DARK_LORD, Colour.Yellow, 16, 8],
      [MonsterType.GREEN_DARK_LORD, Colour.Green, 16, 12],
    ],
    secrets: [
      [SecretType.TRAP_DOOR, 6, 6],
    ],
    notes: [
      [9, 8, 'campaign.iceDragon.e1m5.notes.magicNumber'],
      [16, 11, 'campaign.iceDragon.e1m5.notes.stoneFace'],
      [5, 3, 'campaign.iceDragon.e1m5.notes.crystalBall']
    ],
    items: [[11, 3, magicItems[4]]],
  },
  onRoomDiscovered: {
    K: revealRemainingItemsInRoomK,
  },
});