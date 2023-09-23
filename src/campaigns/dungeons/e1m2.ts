import type { Colour, Dungeon, MonsterType, SecretType } from "../../types";
import { ConditionType, Side } from "../../types";
import {
  createDoor,
  createHiddenDoor,
  createLockedDoor,
  createMonster,
  createSecret,
  createSecretWithItem,
} from "../../dungeon/DungeonLogic";
import { magicItems } from "../../items/magicItems";

export const e1m2: Dungeon = {
  name: "The Mines of Evil",
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
  discoveredRooms: ["M"],
  layout: {
    grid: [
      "############## #####",
      "#AAA###CCCCCC###EEE#",
      "#AAABBBC@CC@CDDDEEE#",
      "#AAA###CCCCCC###EEE#",
      "##### ##H##### #EEE#",
      "       #H#     #EEE#",
      "##### ##H##### #EEE#",
      "#KKK###IIIIII# #EEE#",
      "#KKKJJJIIIIII# ##F##",
      "#KKK###IIIIII# ##F##",
      "##L## #IIIIII# ##F##",
      " #L#  ######## #GGG#",
      "##L##          #GGG#",
      "#MMM#          #GGG#",
      "#MMM#          #GGG#",
      "#MMM#          #####",
      "#####               ",
    ],
    corridors: ["B", "D", "F", "H", "J", "L"],
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
    monsters: [],
    secrets: [],
    notes: [
      {
        message: "Guard room",
        position: { x: 2, y: 10 },
      },
      {
        message: "Look in the pillar room for the armory of the dwarf king",
        position: { x: 8, y: 10 },
      },
      {
        message:
          "To reach the treasure of the ice dragon, look behind the mirror in the alchemy laboratory.",
        position: { x: 2, y: 3 },
      },
      {
        message: "A large mirror decorates the far wall of this room.",
        position: { x: 17, y: 11 },
      },
    ],
    items: [],
  },
  killCount: 0,
};
