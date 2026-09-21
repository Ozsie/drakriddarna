export enum Colour {
  Red = '#CD5C5C',
  Blue = '#1E90FF',
  Green = '#90EE90',
  Yellow = '#FCFF4F',
}

export interface GameSettings {
  cellSize?: number;
  debug?: boolean;
  locale?: string;
  [key: string]: string | number | boolean | undefined;
}

export type GameState = {
  heroes: Actor[];
  dungeon: Dungeon;
  currentActor?: Hero;
  actionLog: LogEvent[];
  itemDeck: Item[];
  magicItemDeck: Item[];
  targetActor?: Actor;
  settings: GameSettings;
  eventDeck: TurnEvent[];
  reRender: boolean;
  currentEvent?: TurnEvent;
  turnCount?: number;
  damageIndicators?: DamageIndicator[];
};

export type DamageIndicator = {
  id: string;
  damage: number;
  position: Position;
  timestamp?: number;
};

export type LogEvent = {
  key: string;
  properties?: Record<string, string>;
  turn: number;
};

export type Campaign = {
  name: string;
  nameTranslationKey?: string;
  dungeons: Dungeon[];
  heroes: Actor[];
  itemDeck: Item[];
  magicItemDeck: Item[];
};

export type Actor = {
  id?: string;
  name: string;
  nameTranslationKey?: string;
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
  ORC = 'Orc',
  ORCH = 'Orc',
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
  nameTranslationKey?: string;
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
  id?: string;
  message: string;
  position: Position;
  found?: boolean;
  foundOn?: number;
};

export type Secret = {
  id?: string;
  name: string;
  nameTranslationKey?: string;
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
  id?: string;
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

export type ResetTrigger = 'TRADE' | 'NEXT_SCENARIO' | 'NEXT_TURN' | string;

export interface ItemProperties {
  USED?: boolean;
  ACTIVE?: boolean;
  DESCRIPTION?: string;
  RESET_ON?: ResetTrigger[];
  MOVEMENT_BONUS?: number;
  ATTACK_BONUS?: number;
  SEARCH_BONUS?: number;
  ACTIONS_BONUS?: number;
  BREAK_DOOR?: boolean;
  BREAK_LOCK?: boolean;
  RE_ROLL_ATTACK?: boolean;
  [key: string]: string | number | boolean | string[] | undefined;
}

export type ItemEffectKey =
  | 'magicHerbsOnUse'
  | 'chaosSwordOnUse'
  | 'potionOfSpeedOnUse'
  | 'necklaceOfLightOnUse'
  | string;

export type ItemResetKey =
  | 'magicHerbsOnReset'
  | 'necklaceOfLightOnReset'
  | 'necklaceOfLightOnUse'
  | string;

export type ItemPickupKey = 'movementBonusOnPickup' | string;

export type ItemDropKey = 'movementBonusOnDrop' | string;

export type Item = {
  id?: string;
  name: string;
  nameTranslationKey?: string;
  amountInDeck: number;
  type: ItemType;
  value: number;
  properties?: ItemProperties;
  effect?: ItemEffectKey;
  reset?: ItemResetKey;
  pickup?: ItemPickupKey;
  drop?: ItemDropKey;
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

export type TurnEventEffect =
  | 'sunStone'
  | 'theHungryTroll'
  | 'timePortal'
  | 'fountainOfYouth'
  | 'sleepingGasCloud'
  | 'theLostOrch'
  | 'theLostOrc'
  | 'theDragonsBreath'
  | 'landslide'
  | 'foresight'
  | 'foreSight'
  | 'earthquake'
  | 'theMagicStorm'
  | 'theElementalWeapon'
  | 'theOrchDrums'
  | 'theOrcDrums'
  | 'theSymbolOfWeakness'
  | string;

export type GameEventType =
  | 'SUN_STONE'
  | 'HUNGRY_TROLL'
  | 'TIME_PORTAL'
  | 'FOUNTAIN_OF_YOUTH'
  | 'SLEEPING_GAS_CLOUD'
  | 'LOST_ORC'
  | 'DRAGONS_BREATH'
  | 'LANDSLIDE'
  | 'MAGIC_NODE'
  | 'FORESIGHT'
  | 'EARTHQUAKE'
  | 'MAGIC_STORM'
  | 'ELEMENTAL_WEAPON'
  | 'ORC_DRUMS'
  | 'SYMBOL_OF_WEAKNESS';

export type GameEvent =
  | {
      type: 'SUN_STONE';
      number: number;
      name: string;
      description: string;
      effect: TurnEventEffect;
      used: boolean;
    }
  | {
      type: 'HUNGRY_TROLL';
      number: number;
      name: string;
      description: string;
      effect: TurnEventEffect;
      used: boolean;
    }
  | {
      type: 'TIME_PORTAL';
      number: number;
      name: string;
      description: string;
      effect: TurnEventEffect;
      used: boolean;
    }
  | {
      type: 'FOUNTAIN_OF_YOUTH';
      number: number;
      name: string;
      description: string;
      effect: TurnEventEffect;
      used: boolean;
    }
  | {
      type: 'SLEEPING_GAS_CLOUD';
      number: number;
      name: string;
      description: string;
      effect: TurnEventEffect;
      used: boolean;
    }
  | {
      type: 'LOST_ORC';
      number: number;
      name: string;
      description: string;
      effect: TurnEventEffect;
      used: boolean;
    }
  | {
      type: 'DRAGONS_BREATH';
      number: number;
      name: string;
      description: string;
      effect: TurnEventEffect;
      used: boolean;
    }
  | {
      type: 'LANDSLIDE';
      number: number;
      name: string;
      description: string;
      effect: TurnEventEffect;
      used: boolean;
    }
  | {
      type: 'MAGIC_NODE';
      number: number;
      name: string;
      description: string;
      effect: TurnEventEffect;
      used: boolean;
    }
  | {
      type: 'FORESIGHT';
      number: number;
      name: string;
      description: string;
      effect: TurnEventEffect;
      used: boolean;
    }
  | {
      type: 'EARTHQUAKE';
      number: number;
      name: string;
      description: string;
      effect: TurnEventEffect;
      used: boolean;
    }
  | {
      type: 'MAGIC_STORM';
      number: number;
      name: string;
      description: string;
      effect: TurnEventEffect;
      used: boolean;
    }
  | {
      type: 'ELEMENTAL_WEAPON';
      number: number;
      name: string;
      description: string;
      effect: TurnEventEffect;
      used: boolean;
    }
  | {
      type: 'ORC_DRUMS';
      number: number;
      name: string;
      description: string;
      effect: TurnEventEffect;
      used: boolean;
    }
  | {
      type: 'SYMBOL_OF_WEAKNESS';
      number: number;
      name: string;
      description: string;
      effect: TurnEventEffect;
      used: boolean;
    };

export type TurnEvent = {
  id?: string;
  type?: GameEventType;
  number: number;
  name: string;
  nameTranslationKey?: string;
  description: string;
  descriptionTranslationKey?: string;
  effect: TurnEventEffect;
  used: boolean;
};

export type MoveDirection = 'UL' | 'U' | 'UR' | 'L' | 'R' | 'DL' | 'D' | 'DR';

export type GameAction =
  | { type: 'MOVE'; direction: MoveDirection }
  | { type: 'PICK_LOCK' }
  | { type: 'SEARCH' }
  | { type: 'USE_ITEM'; item: Item }
  | { type: 'SELECT_TARGET'; target?: Hero }
  | { type: 'TOGGLE_INVENTORY'; hero: Hero }
  | { type: 'END_ACTION' }
  | { type: 'NEXT_TURN' }
  | { type: 'INIT_GAME' }
  | { type: 'LOAD_GAME'; state: GameState }
  | { type: 'SAVE_GAME' }
  | { type: 'SET_DEBUG'; debug: boolean }
  | { type: 'SET_LOCALE'; locale: string }
  | { type: 'WIN_LEVEL' }
  | { type: 'RESET_LEVEL' }
  | { type: 'GO_TO_TESTING_GROUNDS' };

export function assertNever(x: never, message = 'Unexpected object'): never {
  throw new Error(`${message}: ${JSON.stringify(x)}`);
}
