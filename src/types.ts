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
  music?: boolean;
  sound?: boolean;
  soundEffects?: boolean;
  [key: string]: string | number | boolean | undefined;
}

export type GameState = {
  campaignId?: string;
  gameMasterId?: string;
  gameMaster?: GameMaster;
  gameMasterState?: Record<string, unknown>;
  heroes: Actor[];
  dungeon: Dungeon;
  difficulty?: Difficulty;
  currentActor?: Hero;
  actionLog: LogEvent[];
  itemDeck: Item[];
  magicItemDeck: Item[];
  targetActor?: Actor;
  settings: GameSettings;
  eventDeck: TurnEvent[];
  reRender: boolean;
  currentEvent?: TurnEvent;
  previousEvent?: TurnEvent;
  turnCount?: number;
  damageIndicators?: DamageIndicator[];
  bloodSplatters?: BloodSplatter[];
  projectiles?: ProjectileAnimation[];
  flameEffects?: FlameEffect[];
  roundActionsDelta?: number;
  drawEvents: boolean;
  roundTargetCounts?: Record<string, number>;
  betweenDungeons?: BetweenDungeonsState;
};

export type BetweenDungeonsStep = 'levelUp' | 'trade';

export type TradeItemSlot = 'weapon' | 'armour' | 'shield' | number;

export interface HeroLevelUpInfo {
  heroName: string;
  heroColour: Colour;
  previousLevel: Level;
  newLevel: Level;
  previousExperience: number;
  newExperience: number;
  leveledUp: boolean;
  levelMeaning: string;
  xpToNextLevel?: number;
  nextLevel?: Level;
}

export interface BetweenDungeonsState {
  completedDungeonName: string;
  nextDungeon?: Dungeon;
  step: BetweenDungeonsStep;
  levelUps: HeroLevelUpInfo[];
  selectedTradeItem?: {
    heroIndex: number;
    slot: TradeItemSlot;
    itemIndex?: number;
  } | null;
}

export type IndicatorEffect = 'float' | 'bounce' | 'crit' | 'fade' | 'static';

export type DamageIndicator = {
  id: string;
  damage?: number;
  text?: string;
  position: Position;
  color?: string;
  effect?: IndicatorEffect;
  timestamp?: number;
  durationMs?: number;
  fontSizeScale?: number;
  offset?: { x?: number; y?: number };
};

export type FloatingIndicator = DamageIndicator;

export type BloodParticle = {
  angle: number;
  speed: number;
  radius: number;
  color: string;
  distance: number;
};

export type BloodSplatter = {
  id: string;
  position: Position;
  particles: BloodParticle[];
  timestamp?: number;
  durationMs?: number;
};

export type ProjectileAnimation = {
  id: string;
  from: Position;
  to: Position;
  timestamp?: number;
  durationMs?: number;
  color?: string;
};

export type FlameParticle = {
  offsetX: number;
  offsetY: number;
  speedY: number;
  driftX: number;
  radius: number;
  color: string;
  delay: number;
};

export type FlameEffect = {
  id: string;
  position: Position;
  particles: FlameParticle[];
  timestamp?: number;
  durationMs?: number;
};

export type LogEvent = {
  key: string;
  properties?: Record<string, string>;
  turn: number;
};

// The five supported actor sprite animations, in sprite-sheet row order.
export type ActorAnimationName = 'idle' | 'walk' | 'attack' | 'hurt' | 'death';

// A single sprite picked from a sprite sheet by zero-based index. Frames are
// square (`size` x `size`) and laid out row-major; the number of columns is
// derived from the image width divided by `size`, so single-row strips and
// rectangular grids both work.
export type ItemSprite = {
  image: string;
  size: number;
  index: number;
};

export type ActorSprite = {
  // URL of the sprite sheet: one row per animation, in the order defined by
  // ACTOR_SPRITE_ANIMATION_ORDER in src/core/ActorAnimation.ts
  // (idle, walk, attack, hurt, death), frames laid out horizontally.
  image: string;
  frameWidth: number;
  frameHeight: number;
  frameDurationMs?: number;
  // Optional explicit frame counts per animation; when omitted, the count is
  // derived from the image width divided by frameWidth.
  animations?: Partial<Record<ActorAnimationName, number>>;
};

export type Campaign = {
  id: string;
  name: string;
  nameTranslationKey?: string;
  dungeons: Dungeon[];
  heroes: Actor[];
  itemDeck: Item[];
  magicItemDeck: Item[];
  eventDeck?: TurnEvent[];
  tileset?: string;
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
  lastAttackedBy?: string;
  lastAttackedByHero?: Actor;
  roundTargetCount?: number;
  walkSound?: string;
  hurtSound?: string;
  deathSound?: string;
  sprite?: ActorSprite;
};

export type Hero = Actor & {
  isInventoryOpen: boolean;
};

export type Monster = Actor & {
  type: MonsterType;
  rangedWeapon?: Weapon;
  temperament?: 'bold' | 'wary';
  passiveStreak?: number;
  forgotBowThisTurn?: boolean;
  exhausted?: boolean;
  lastAttackedBy?: string;
  lastAttackedByHero?: Actor;
};

// `MonsterType` is intentionally not a closed `enum`: campaigns need to be
// able to introduce brand-new monster type identifiers (e.g. via their own
// monsters/*.ts file registering a template/abilities, see
// src/monsters/MonsterRegistry.ts and src/campaigns/README.md) without
// modifying this shared file. The known built-in types are still exposed as
// named constants for convenience and backwards compatibility.
export const MonsterType = {
  ORC: 'Orc',
  ORCH: 'Orc',
  TROLL: 'Troll',
  GREEN_DARK_LORD: 'Green Dark Lord',
  BLUE_DARK_LORD: 'Blue Dark Lord',
  RED_DARK_LORD: 'Red Dark Lord',
  YELLOW_DARK_LORD: 'Yellow Dark Lord',
} as const;
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type MonsterType =
  | (typeof MonsterType)[keyof typeof MonsterType]
  | string;

export enum Level {
  APPRENTICE = 'apprentice',
  KNIGHT = 'knight',
  HERO = 'hero',
  LORD = 'lord',
  MASTER = 'master',
}

export type Dungeon = {
  name: string;
  intro: string;
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
  portal?: Position;
  onRoomDiscovered?: Record<string, string>;
  music?: string;
  tileset?: string;
  // Base light level of the whole dungeon: 1 = fully lit (default), 0 =
  // pitch black. Light sources illuminate their surroundings.
  ambientLight?: number;
};

export type WinCondition = {
  type: ConditionType;
  targetCell?: Position;
  targetMonsterType?: MonsterType;
  targetSecretId?: string;
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
  SECRET_FOUND,
}

// Where inside its grid cell a light source sits. `CENTER` is the default.
export enum CellAlignment {
  TOP_LEFT = 'top-left',
  TOP_RIGHT = 'top-right',
  BOTTOM_LEFT = 'bottom-left',
  BOTTOM_RIGHT = 'bottom-right',
  CENTER = 'center',
}

export type LightSource = {
  id?: string;
  position: Position;
  alignment?: CellAlignment;
  // CSS color of the light glow.
  color?: string;
  // Reach of the light in grid cells (from its position).
  radius?: number;
  // 0..1 brightness at the light source, fading to 0 at the radius.
  intensity?: number;
  enabled?: boolean;
};

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
  interactables?: InteractableCell[];
  lights?: LightSource[];
};

export type InteractableCell = {
  id?: string;
  position: Position;
  effect: string;
  name?: string;
  nameTranslationKey?: string;
  description?: string;
  descriptionTranslationKey?: string;
  interacted?: boolean;
  oneTime?: boolean;
  args?: Record<string, unknown>;
  icon?: string;
  triggerOn?: 'interact' | 'step' | 'both';
  secret?: boolean;
  interactSound?: string;
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
  item?: Item;
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
  revealedBy?: string;
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
  reinforced: boolean;
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

export type ItemTarget =
  | 'SELF'
  | 'OWNER'
  | 'ANY_HERO'
  | 'ALL_HEROES'
  | 'HERO'
  | string;

export interface ItemProperties {
  USED?: boolean;
  USED_ON?: string[];
  USED_HEROES?: string[];
  ACTIVE?: boolean;
  TARGET?: ItemTarget;
  TARGET_TYPE?: ItemTarget;
  DESCRIPTION?: string;
  RESET_ON?: ResetTrigger[];
  MOVEMENT_BONUS?: number;
  ATTACK_BONUS?: number;
  SEARCH_BONUS?: number;
  ACTIONS_BONUS?: number;
  BREAK_DOOR?: boolean;
  BREAK_LOCK?: boolean;
  RE_ROLL_ATTACK?: boolean;
  ICON?: string;
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
  icon?: string;
  sprite?: ItemSprite;
  properties?: ItemProperties;
  effect?: ItemEffectKey;
  reset?: ItemResetKey;
  pickup?: ItemPickupKey;
  drop?: ItemDropKey;
  disabled?: boolean;
  useSound?: string;
};

export type Weapon = Item & {
  dice: number;
  range: number;
  twoHanded: boolean;
  useHearHeroes: boolean;
  ignoresShield: boolean;
  ignoresArmour: boolean;
  elemental?: boolean;
  attackSound?: string;
};

export type Shield = Item & {
  dice: number;
  blockSound?: string;
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
  | 'theHexagram'
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
  | 'SYMBOL_OF_WEAKNESS'
  | 'HEXAGRAM';

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
    }
  | {
      type: 'HEXAGRAM';
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
  eventSound?: string;
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
  | { type: 'SET_MUSIC'; music: boolean }
  | { type: 'SET_LOCALE'; locale: string }
  | { type: 'WIN_LEVEL' }
  | { type: 'RESET_LEVEL' }
  | { type: 'GO_TO_TESTING_GROUNDS' };

export function assertNever(x: never, message = 'Unexpected object'): never {
  throw new Error(`${message}: ${JSON.stringify(x)}`);
}

export type MonsterBehaviorDifficulty = {
  bowForgottenChance?: number;
  getDirectorState?: (context: {
    hasDeadHero: boolean;
    partyHpPercentage: number;
    aliveMonsterCount: number;
  }) => import('./monsters/behavior/types').DirectorState;
  calculateBehaviorWeight?: (
    behavior: import('./monsters/behavior/types').MonsterBehavior,
    context: import('./monsters/behavior/types').BehaviorContext,
    baseWeight: number,
  ) => number;
};

export type EventDifficulty = {
  minMonsterSpawnDistance?: number;
  minSpawnDistance?: number;
  earliestMonsterRound?: number;
  earliestRound?: number;
  skipHungryTrollBelowHalfHealth?: boolean;
  modifyEventDeck?: (deck: TurnEvent[], state: GameState) => TurnEvent[];
  onEventDrawn?: (event: TurnEvent, state: GameState) => TurnEvent | null;
};

export type StartingEquipment = {
  weapon?: Weapon;
  shield?: Shield;
  armour?: Armour;
  inventory?: Item[];
};

export type GameMasterModifiers = {
  attack: number;
  defense: number;
  movement: number;
  search: number;
  health: number;
};

export type GameMasterRules = {
  // Search Mechanics
  modifySearchRoll?: (baseRoll: number, hero: Hero, state: GameState) => number;
  onSearchFailed?: (hero: Hero, state: GameState) => void;

  // Combat Resolution
  modifyHeroDamageDealt?: (
    damage: number,
    attacker: Hero,
    defender: Monster,
    state: GameState,
  ) => number;
  modifyMonsterDamageDealt?: (
    damage: number,
    attacker: Monster,
    defender: Hero,
    state: GameState,
  ) => number;
  onHeroDowned?: (hero: Hero, state: GameState) => void;
};

export type GameMasterLifecycleHooks = {
  onGameInit?: (state: GameState) => void;
  onRoundStart?: (round: number, state: GameState) => void;
  onHeroTurnStart?: (hero: Hero, state: GameState) => void;
  onHeroPhaseEnd?: (state: GameState) => void;
  onMonsterPhaseEnd?: (state: GameState) => void;
  onPartyDefeat?: (state: GameState) => void;
  onDungeonComplete?: (state: GameState) => void;
};

export type GameMaster<TState = Record<string, unknown>> =
  GameMasterLifecycleHooks &
    GameMasterRules & {
      id: string;
      nameTranslationKey: string;
      descriptionTranslationKey?: string;
      initialState?: () => TState;
      modifiers: GameMasterModifiers;
      monsterBehavior?: MonsterBehaviorDifficulty;
      events?: EventDifficulty;
      startingEquipment?: StartingEquipment;
      rules?: GameMasterRules;
    };

export type Difficulty = GameMaster;
