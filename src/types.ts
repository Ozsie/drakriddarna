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
  // Save format version; undefined means a pre-versioning save (version 0)
  // and is migrated up to CURRENT_SAVE_VERSION on load
  // (see src/saveMigration.ts).
  saveVersion?: number;
  // The selected game master (difficulty). The single source of truth:
  // legacy saves carrying `difficulty`/`gameMasterId` are migrated onto
  // this field in `loadState`.
  gameMaster?: GameMaster;
  gameMasterState?: Record<string, unknown>;
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
  previousEvent?: TurnEvent;
  turnCount?: number;
  damageIndicators?: DamageIndicator[];
  bloodSplatters?: BloodSplatter[];
  projectiles?: ProjectileAnimation[];
  flameEffects?: FlameEffect[];
  // Screen shakes active or recently expired; the renderer prunes them.
  shakeEffects?: ShakeEffect[];
  roundActionsDelta?: number;
  // Transient light sources spawned by events, cleared at round reset.
  eventLights?: LightSource[];
  drawEvents: boolean;
  roundTargetCounts?: Record<string, number>;
  betweenDungeons?: BetweenDungeonsState;
  // Running campaign score: the sum of every completed scenario's score
  // (see src/core/scoring.ts). Undefined/0 until the first scenario is
  // beaten.
  score?: number;
  // Per-scenario score records, appended when each scenario is first
  // beaten; the campaign-complete screen shows them as statistics.
  scenarioScores?: ScenarioScoreRecord[];
};

export type BetweenDungeonsStep = 'levelUp' | 'trade' | 'campaignComplete';

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
  // Campaign name, set only on the campaignComplete step (the final
  // screen after the last dungeon).
  completedCampaignName?: string;
  nextDungeon?: Dungeon;
  step: BetweenDungeonsStep;
  levelUps: HeroLevelUpInfo[];
  // Score breakdown of the scenario just completed, for the results view.
  scenarioScore?: ScenarioScore;
  // Running campaign score after adding the completed scenario.
  campaignScore?: number;
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

// A screen shake, usually spawned by a dramatic event: a landslide, a
// lava burst. Purely visual — jitter applied to the world canvases for a
// short time, stronger near the epicenter.
export type ShakeEffect = {
  id: string;
  // World cell the shake emanates from; omit for a screen-wide shake.
  epicenter?: Position;
  // Max jitter in pixels at the epicenter (default: 6).
  amplitude?: number;
  // Reach of the shake in cells from the epicenter (default: 8); the
  // jitter fades linearly to zero at the edge.
  radius?: number;
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
  // Monsters slain by this hero over the campaign, counted in
  // `killMonster`. Replacement heroes start again from zero.
  kills?: number;
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

export type CollapsedCorridor = {
  // Room/corridor letter the collapsed cells will be restored to.
  letter: string;
  // The exact cells that were collapsed, so several independent collapses
  // can coexist and be restored without touching each other.
  cells: Position[];
};

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
  collapsedCorridors?: CollapsedCorridor[];
  portal?: Position;
  onRoomDiscovered?: Record<string, string>;
  music?: string;
  // Alternative track played when monsters are near the heroes. Falls back
  // to the global default tension track when omitted.
  musicTension?: string;
  tileset?: string;
  // Base light level of the whole dungeon: 1 = fully lit (default), 0 =
  // pitch black. Light sources illuminate their surroundings.
  ambientLight?: number;
  // Score tracking for the current scenario: the summed experience of
  // monsters killed by the heroes (snapshotted at kill time, independent
  // of hero XP which is spent on levels) and the points from items picked
  // up during the scenario.
  killedMonsterXp?: number;
  pickedUpItemPoints?: number;
  // Score breakdown, computed once when the scenario is first beaten
  // (see src/core/scoring.ts).
  score?: ScenarioScore;
};

export type ScenarioScore = {
  // 50 points per remaining hero health point at victory
  // (SCORE_POINTS_PER_HP).
  healthPoints: number;
  // 30 points per experience point of monsters killed
  // (SCORE_POINTS_PER_MONSTER_XP).
  killPoints: number;
  // Points from items picked up during the scenario (item values and a
  // flat magic-item bonus).
  itemPoints: number;
  // 50 points per secret found (SCORE_POINTS_PER_SECRET).
  secretPoints: number;
  // -2 points per round played (SCORE_PENALTY_PER_ROUND).
  roundPenalty: number;
  total: number;
};

// One entry per completed scenario, kept as campaign statistics for the
// final campaign-complete screen.
export type ScenarioScoreRecord = {
  dungeonName: string;
  score: ScenarioScore;
  rounds: number;
  kills: number;
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
// `CEILING` simulates a fixture in the ceiling above the cell: it renders
// the same light pool but shines down on the actors, so they neither block
// its light nor cast shadows in it.
export enum CellAlignment {
  TOP_LEFT = 'top-left',
  TOP_RIGHT = 'top-right',
  BOTTOM_LEFT = 'bottom-left',
  BOTTOM_RIGHT = 'bottom-right',
  CENTER = 'center',
  CEILING = 'ceiling',
}

// Light animation effects: 'static' (no animation, the default), 'pulse'
// (breathing glow), 'flicker' (torch-like jitter), 'sweep' (rotating beam),
// 'sway' (pendulum swing, e.g. a chandelier), 'blink' (on/off), 'sparkle'
// (colored twinkles inside the light's own cell), 'aura' (a glowing ring
// around a soft center glow, filling only its own cell) and 'gas' (an
// even, gently undulating cloud, e.g. the sleeping gas). Intentionally
// open-ended: unknown effect strings fall back to 'static' at render time.
export const LightEffect = {
  STATIC: 'static',
  PULSE: 'pulse',
  FLICKER: 'flicker',
  SWEEP: 'sweep',
  SWAY: 'sway',
  BLINK: 'blink',
  SPARKLE: 'sparkle',
  AURA: 'aura',
  GAS: 'gas',
} as const;
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type LightEffect =
  | (typeof LightEffect)[keyof typeof LightEffect]
  | string;

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
  // 0..1 softness of the light's shadow edges: 0 = hard edges, 1 = up to
  // half a cell of blur. Softens both the glow and the darkness hole.
  softness?: number;
  // Animation effect, see `LightEffect` (default: 'static').
  effect?: LightEffect;
  // How many times per second the effect loops (default 1).
  rate?: number;
  enabled?: boolean;
};

// Terrain cell types. 'water' and 'lava' are the built-ins; the set is
// intentionally open-ended like `LightEffect`: unknown type strings keep
// their configured colour and effects but get no default styling.
export const TerrainType = {
  WATER: 'water',
  LAVA: 'lava',
} as const;
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type TerrainType =
  | (typeof TerrainType)[keyof typeof TerrainType]
  | string;

// Configuration of a terrain cell. Everything except the type is optional:
// a cell can be purely decorative, purely gameplay-affecting, or both.
export type TerrainOptions = {
  type: TerrainType;
  // Base fill colour of the cell.
  color?: string;
  // 0..1 transparency of the base fill (default: 0.6).
  opacity?: number;
  // Flat damage taken when a hero or monster enters the cell.
  damageOnEnter?: number;
  // Flat damage taken when a hero or monster ends its turn on the cell.
  damageOnTurnEnd?: number;
  // Movement points a step onto this cell costs instead of 1.
  movementCost?: number;
  // Light emitted by the cell, e.g. the glow of lava.
  light?: ItemLight;
  // How many times per second the animated overlay loops (default: per
  // terrain type).
  rate?: number;
};

export type TerrainCell = TerrainOptions & {
  position: Position;
};

// Atmospheric fog filling every cell of a room or corridor, declared per
// grid letter. Purely visual by default, but can be configured to damage
// actors that enter or end their turn in the room, e.g. poison gas.
export type RoomFogOptions = {
  // Colour of the fog cloud (default: grey blue).
  color?: string;
  // 0..1 transparency of the fog cloud (default: 0.35).
  opacity?: number;
  // How many times per second the cloud undulates (default: 0.3).
  rate?: number;
  // 0..1 softness of the cloud's edges (default: 0.6): 0 keeps hard cell
  // edges, 1 feathers the cloud about half a cell into its surroundings.
  softness?: number;
  // 0..1 how much of the light inside the room the cloud absorbs, dimming
  // the glow of lights shining into or standing in the fog and letting
  // the ambient darkness veil close in (default: 0.3).
  density?: number;
  // When true, no light passes through the fog at all: like fog of war,
  // light rays stop at the room's boundary.
  blocksLight?: boolean;
  // Flat damage taken when a hero or monster enters the room.
  damageOnEnter?: number;
  // Flat damage taken when a hero or monster ends its turn in the room.
  damageOnTurnEnd?: number;
  // Translation key of the fog's display name, used in the damage log
  // (default: 'content.fog.name').
  nameTranslationKey?: string;
};

export type Layout = {
  grid: string[];
  doors: Door[];
  monsters: Monster[];
  secrets: Secret[];
  notes: Note[];
  items: ItemLocation[];
  corridors: string[];
  // Cells inside a room letter that are corridors without a door between
  // them and the room (e.g. a corridor stub opening straight into a room).
  // They keep the room's letter so they are discovered together with the
  // room, but corridor-specific functionality treats them as corridor
  // cells (see `isCorridorCell` in src/core/grid.ts).
  corridorCells?: Position[];
  pillars?: Position[];
  pits?: Position[];
  // Terrain cells: floor cells with a material (water, lava, ...) that
  // tints the floor and can hurt or slow actors that enter or stand on
  // them, and can emit light.
  terrain?: TerrainCell[];
  // Fog filling whole rooms or corridors, keyed by grid letter.
  roomFog?: Record<string, RoomFogOptions>;
  corners: Corner[];
  interactables?: InteractableCell[];
  lights?: LightSource[];
  // Walls that sit on the edge between two floor cells instead of occupying
  // a full grid cell — for rooms that are not separated by a whole cell of
  // rock. A wall on (x, y, Side.RIGHT) blocks between (x, y) and (x+1, y).
  walls?: WallEdge[];
  // Fill colour of edge walls (default: grey). Per-edge overrides win.
  wallColour?: string;
};

export type WallEdge = {
  x: number;
  y: number;
  side: Side;
  colour?: string;
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
  // Light source attached to this interactable cell. It renders at the
  // interactable's position while enabled; the built-in `toggleLight`
  // effect flips it.
  light?: ItemLight;
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

// A light source attached to an item. It has no position of its own: while
// the item sits in a living actor's inventory, the light renders at the
// carrying actor's position.
export type ItemLight = Omit<LightSource, 'position'>;

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
  light?: ItemLight;
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
  | 'theDragonsBreath'
  | 'landslide'
  | 'foresight'
  | 'earthquake'
  | 'theMagicStorm'
  | 'theElementalWeapon'
  | 'theOrchDrums'
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
  earliestMonsterRound?: number;
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
