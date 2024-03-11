export enum Colour {
  Red = '#CD5C5C',
  Blue = '#1E90FF',
  Green = '#90EE90',
  Yellow = '#FCFF4F',
}

export type GameState = {
  heroes: Actor[];
  dungeon: Dungeon;
  currentActor?: Hero;
  actionLog: LogEvent[];
  itemDeck: Item[];
  magicItemDeck: Item[];
  targetActor?: Actor;
  settings: Record<string, string | number | boolean>;
  eventDeck: TurnEvent[];
  reRender: boolean;
  currentEvent?: TurnEvent;
  turnCount?: number;
};

export type LogEvent = {
  key: string;
  properties?: Record<string, string>;
  turn: number;
};

export type Campaign = {
  name: string;
  dungeons: Dungeon[];
  heroes: Actor[];
  itemDeck: Item[];
  magicItemDeck: Item[];
};

export type Actor = {
  name: string;
  actions: number;
  movement: number;
  maxMovement: number;
  defense: number;
  health: number;
  maxHealth: number;
  colour: Colour;
  experience: number;
  position: Position;
  level: Level;
  weapon: Weapon;
  armour?: Armour;
  shield?: Shield;
  incapacitated?: boolean;
  inventory: Item[];
  ignoredByMonsters?: boolean;
  blinded?: boolean;
  weakened?: boolean;
};

export type Hero = Actor & {
  isInventoryOpen: boolean;
};

export type Monster = Actor & {
  type: MonsterType;
  rangedWeapon?: Weapon;
};

export enum MonsterType {
  ORCH = 'Orch',
  TROLL = 'Troll',
  GREEN_DARK_LORD = 'Green Dark Lord',
  BLUE_DARK_LORD = 'Blue Dark Lord',
  RED_DARK_LORD = 'Red Dark Lord',
  YELLOW_DARK_LORD = 'Yellow Dark Lord',
}

export enum Level {
  APPRENTICE = 'apprentice',
  KNIGHT = 'knight',
  HERO = 'hero',
  LORD = 'lord',
  MASTER = 'master',
}

export type Dungeon = {
  name: string;
  layout: Layout;
  startingPositions: Position[];
  discoveredRooms: string[];
  winConditions: WinCondition[];
  beaten: boolean;
  nextDungeon?: Dungeon;
  killCount: number;
  events?: number[];
  collapsedCorridor?: string;
};

export type WinCondition = {
  type: ConditionType;
  targetCell?: Position;
  targetMonsterType?: MonsterType;
  killMinCount?: number;
  fulfilled: boolean;
  checkFulfilled?: string;
  additionalDescription?: string;
};

export enum ConditionType {
  KILL_ALL,
  KILL_ALL_OF_TYPE,
  REACH_CELL,
  OPEN_DOOR,
  KILL_AT_LEAST,
}

export type Layout = {
  grid: string[];
  doors: Door[];
  monsters: Monster[];
  secrets: Secret[];
  notes: Note[];
  items: ItemLocation[];
  corridors: string[];
  pillars?: Position[];
  pits?: Position[];
  corners: Corner[];
};

export type Corner = {
  position: Position;
  type: CornerType;
};

export enum CornerType {
  INNER_BOTTOM_RIGHT = 'IBR',
  INNER_TOP_RIGHT = 'ITR',
  INNER_BOTTOM_LEFT = 'IBL',
  INNER_TOP_LEFT = 'ITL',
  OUTER_BOTTOM_RIGHT = 'OBR',
  OUTER_TOP_RIGHT = 'OTR',
  OUTER_BOTTOM_LEFT = 'OBL',
  OUTER_TOP_LEFT = 'OTL',
  BOTTOM_END = 'BE',
  TOP_END = 'TE',
  LEFT_END = 'LE',
  RIGHT_END = 'RE',
  FOUR_WAY_INTERSECTION = 'I',
  THREE_WAY_INTERSECTION_UP_CLOSED = 'TUC',
  THREE_WAY_INTERSECTION_UP = 'TUO',
  THREE_WAY_INTERSECTION_DOWN = 'TD',
  THREE_WAY_INTERSECTION_LEFT = 'TL',
  THREE_WAY_INTERSECTION_RIGHT = 'TR',
  NOT_CORNER = 'NC',
}

export type ItemLocation = {
  item: Item;
  position: Position;
};

export type Note = {
  message: string;
  position: Position;
  found?: boolean;
  foundOn?: number;
};

export type Secret = {
  name: string;
  type: SecretType;
  position: Position;
  found: boolean;
  item?: Item;
};

export enum SecretType {
  EQUIPMENT = 'Equipment',
  MAGIC_ITEM = 'Magic Item',
  TRAP_DOOR = 'Trap Door',
  NOTE = 'Note',
}

export type Door = {
  locked: boolean;
  trapped: boolean;
  open: boolean;
  hidden: boolean;
  x: number;
  y: number;
  side: Side;
  trapAttacks: number;
};

export enum Side {
  LEFT = 'Left',
  RIGHT = 'Right',
  UP = 'Up',
  DOWN = 'Down',
}

export type Position = {
  x: number;
  y: number;
};

export enum ItemType {
  WEAPON,
  ARMOUR,
  SHIELD,
  MAGIC,
}

export type Item = {
  name: string;
  amountInDeck: number;
  type: ItemType;
  value: number;
  properties?: Record<string, string | number | boolean | string[]>;
  effect?: string;
  reset?: string;
  pickup?: string;
  drop?: string;
  disabled?: boolean;
};

export type Weapon = Item & {
  dice: number;
  range: number;
  twoHanded: boolean;
  useHearHeroes: boolean;
  ignoresShield: boolean;
  ignoresArmour: boolean;
  elemental?: boolean;
};

export type Shield = Item & {
  dice: number;
};

export type Armour = Item & {
  defense: number;
  magicProtection: boolean;
  movementReduction: number;
};

export type TurnEvent = {
  number: number;
  name: string;
  description: string;
  effect: string;
  used: boolean;
};
