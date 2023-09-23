import {
  Colour,
  ConditionType,
  MonsterType,
  SecretType,
  Side,
} from "../../types";
import type { Dungeon } from "../../types";
import {
  createDoor,
  createMonster,
  createSecret,
} from "../../dungeon/DungeonLogic";
import { e1m1 } from "../../campaigns/dungeons/e1m1";

export const e1m0: Dungeon = {
  name: "Troll cave",
  beaten: false,
  winConditions: [
    {
      type: ConditionType.KILL_ALL,
      fulfilled: false,
    },
  ],
  nextDungeon: e1m1,
  startingPositions: [
    { x: 2, y: 9 },
    { x: 1, y: 8 },
    { x: 1, y: 9 },
    { x: 1, y: 10 },
  ],
  discoveredRooms: ["A"],
  layout: {
    grid: [
      "     ######",
      "     #CCCC#",
      "     #CCCC#",
      "     #CCCC#",
      "     ##E###",
      "      #E#  ",
      "      #E## ",
      "##### #BB# ",
      "#AAA###BB# ",
      "#AAADDDBB# ",
      "#AAA###BB# ",
      "##### #### ",
    ],
    doors: [
      createDoor(Side.RIGHT, 3, 9),
      createDoor(Side.RIGHT, 6, 9),
      createDoor(Side.UP, 7, 7),
      createDoor(Side.UP, 7, 4),
    ],
    monsters: [
      createMonster(MonsterType.ORCH, Colour.Green, 6, 9),
      createMonster(MonsterType.ORCH, Colour.Yellow, 8, 10),
      createMonster(MonsterType.ORCH, Colour.Red, 7, 5),
      createMonster(MonsterType.ORCH, Colour.Red, 9, 3),
      createMonster(MonsterType.TROLL, Colour.Green, 6, 1),
    ],
    secrets: [createSecret(SecretType.NOTE, "Welcome to Drakriddarna", 3, 9)],
    notes: [],
    items: [],
    corridors: ["D", "E"],
  },
  killCount: 0,
  events: [1, 2, 3, 4, 5, 6],
};
