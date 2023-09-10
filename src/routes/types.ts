export type GameState = {
  heroes: Actor[];
  dungeon: Dungeon;
  currentActor?: Actor
}

export type Actor = {
  name: string;
  actions: number;
  movement: number;
  defense: number;
  health: number;
  colour: string;
  position?: Position;
}

export type Hero = Actor & {
  level: Level;
};

export type Monster = Actor & {}

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
  doors: Door[]
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
