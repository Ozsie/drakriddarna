export enum Colour {
  Red = '#CD5C5C',
  Blue = '#1E90FF',
  Green = '#90EE90',
  Yellow = '#FCFF4F'
}

export type GameState = {
  heroes: Actor[];
  dungeon: Dungeon;
  currentActor?: Actor;
  actionLog: string[];
}

export type Actor = {
  name: string;
  actions: number;
  movement: number;
  defense: number;
  health: number;
  maxHealth: number;
  colour: Colour;
  experience: number;
  position?: Position;
}

export type Hero = Actor & {
  level: Level;
};

export type Monster = Actor & {
  type: MonsterType;
  level: Level;
}

export enum MonsterType {
  ORCH = 'Orch',
  TROLL = 'Troll',
  GREEN_DARK_LORD = 'Green Dark Lord',
  BLUE_DARK_LORD = 'Blue Dark Lord',
  RED_DARK_LORD = 'Red Dark Lord',
  YELLOW_DARK_LORD = 'Yellow Dark Lord',
}

export enum Level {
  APPRENTICE = 'Apprentice',
  KNIGHT = 'Knight',
  HERO = 'Hero',
  LORD = 'Lord',
  MASTER = 'Master'
}

export type Dungeon = {
  name: string;
  layout: Layout;
  startingPositions: Position[],
  discoveredRooms: string[],
  winConditions: WinCondition[],
  beaten: boolean,
  nextDungeon?: Dungeon,
}

export type WinCondition = {
  type: ConditionType,
  targetCell?: Position,
  targetMonster?: Monster,
  fulfilled: boolean,
}

export enum ConditionType {
  KILL_ALL, KILL_ONE, REACH_CELL
}

export type Layout = {
  grid: string[],
  doors: Door[],
  monsters: Monster[],
  secrets: Secret[],
}

export type Secret = {
  name: string,
  type: SecretType,
  position: Position,
  found: boolean,
}

export enum SecretType {
  EQUIPMENT = 'Equipment',
  MAGIC_ITEM = 'Magic Item',
  DOOR = 'Door',
  NOTE = 'Note'
}

export type Door = {
  locked: boolean,
  trapped: boolean,
  open: boolean,
  x: number,
  y: number,
  side: Side,
}

export enum Side {
  LEFT = 'Left',
  RIGHT = 'Right',
  UP = 'Up',
  DOWN = 'Down'
}

export type Position = {
  x: number,
  y: number
}
