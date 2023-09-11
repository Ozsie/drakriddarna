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
  colour: string;
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
}

export type Layout = {
  grid: string[],
  doors: Door[],
  monsters: Monster[],
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
