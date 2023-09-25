import type { Dungeon } from "../../types";
import { ConditionType, Side } from "../../types";
import {
  createDoor,
  createHiddenDoor,
  createLockedDoor,
  createTrappedLockedDoor,
} from "../../dungeon/DungeonLogic";

export const e1m3: Dungeon = {
  name: "The Dread Labyrinth",
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
  discoveredRooms: ["A"],
  layout: {
    grid: [
      "       ########     ",
      "     ###DDDEEE#     ",
      "     #CCC##EEE#     ",
      "######CCC##EEE######",
      "#AAA##CCC####F#IIII#",
      "#AAABBB#J####F#IIII#",
      "#AAA####J##G#F#IIII#",
      "##### ##J##GGF#IIII#",
      "   ####KKK###F#IIII#",
      "   #LLLKKK# #FMIIII#",
      "   ####KKK####M#####",
      "      #KKKMMMMM#    ",
      "      ####MMMM##    ",
      "         ######     ",
    ],
    corridors: ["B", "D", "F", "L"],
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
    monsters: [],
    secrets: [],
    notes: [],
    items: [],
  },
  killCount: 0,
};
