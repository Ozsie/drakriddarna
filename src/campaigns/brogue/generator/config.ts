/**
 * The depth 1-10 progression table (docs/random-campaign-spec/
 * 03-difficulty-curve.md). These are the starting points, tuned against
 * `npm run balanceAnalysis` in milestone M5 — the seed never changes, only
 * these values.
 */

import { MonsterType } from '../../../types';
import type { Item } from '../../../types';
import { MID_TIER_MONSTER_A, MID_TIER_MONSTER_B } from '../monsters/templates';

/** The fixed campaign seed; every per-dungeon seed derives from it. */
export const CAMPAIGN_SEED = 987654321;

/** Heroes in the campaign; one starting position per hero is generated. */
export const STARTING_POSITIONS = 4;

export type DepthConfig = {
  /** Square grid size (gridSize x gridSize cells). */
  gridSize: number;
  /** Number of room blobs seeded on the jittered lattice. */
  rooms: number;
  /** Target blob area in cells, drawn uniformly in [min, max]. */
  blobAreaMin: number;
  blobAreaMax: number;
  /** Summed monster experience placed on the floor (boss cost included). */
  monsterBudget: number;
  /** Probability a non-spanning-tree door is hidden. */
  hiddenDoorChance: number;
  /** Probability a non-spanning-tree door is trapped. */
  trappedDoorChance: number;
  /** Probability a door that is not an articulation point is locked. */
  lockedDoorChance: number;
  /** Probability an extra adjacency (beyond the spanning tree) gets a door. */
  extraDoorChance: number;
  /** Base light level of the dungeon (1 = fully lit, 0 = pitch black). */
  ambientLight: number;
  /** Number of secrets placed, drawn uniformly in [min, max]. */
  secretsMin: number;
  secretsMax: number;
  /** Number of floor items placed in non-start rooms. */
  items: number;
  /** Per-room monster cap. */
  maxMonstersPerRoom: number;
};

const DEPTH_CONFIGS: Record<number, DepthConfig> = {
  1: {
    gridSize: 16,
    rooms: 4,
    blobAreaMin: 6,
    blobAreaMax: 10,
    monsterBudget: 4,
    hiddenDoorChance: 0,
    trappedDoorChance: 0,
    lockedDoorChance: 0,
    extraDoorChance: 0.1,
    ambientLight: 1,
    secretsMin: 0,
    secretsMax: 1,
    items: 2,
    maxMonstersPerRoom: 2,
  },
  2: {
    gridSize: 17,
    rooms: 4,
    blobAreaMin: 6,
    blobAreaMax: 11,
    monsterBudget: 6,
    hiddenDoorChance: 0.05,
    trappedDoorChance: 0,
    lockedDoorChance: 0,
    extraDoorChance: 0.12,
    ambientLight: 0.9,
    secretsMin: 1,
    secretsMax: 1,
    items: 2,
    maxMonstersPerRoom: 2,
  },
  3: {
    gridSize: 18,
    rooms: 5,
    blobAreaMin: 7,
    blobAreaMax: 12,
    monsterBudget: 6,
    hiddenDoorChance: 0.05,
    trappedDoorChance: 0.05,
    lockedDoorChance: 0,
    extraDoorChance: 0.15,
    ambientLight: 0.8,
    secretsMin: 1,
    secretsMax: 1,
    items: 3,
    maxMonstersPerRoom: 2,
  },
  4: {
    gridSize: 19,
    rooms: 5,
    blobAreaMin: 7,
    blobAreaMax: 13,
    monsterBudget: 8,
    hiddenDoorChance: 0.1,
    trappedDoorChance: 0.05,
    lockedDoorChance: 0,
    extraDoorChance: 0.18,
    ambientLight: 0.7,
    secretsMin: 1,
    secretsMax: 2,
    items: 3,
    maxMonstersPerRoom: 2,
  },
  5: {
    gridSize: 20,
    rooms: 6,
    blobAreaMin: 8,
    blobAreaMax: 14,
    monsterBudget: 5,
    hiddenDoorChance: 0.1,
    trappedDoorChance: 0.1,
    lockedDoorChance: 0.05,
    extraDoorChance: 0.2,
    ambientLight: 0.6,
    secretsMin: 2,
    secretsMax: 2,
    items: 3,
    maxMonstersPerRoom: 3,
  },
  6: {
    gridSize: 21,
    rooms: 6,
    blobAreaMin: 8,
    blobAreaMax: 15,
    monsterBudget: 11,
    hiddenDoorChance: 0.1,
    trappedDoorChance: 0.1,
    lockedDoorChance: 0.05,
    extraDoorChance: 0.22,
    ambientLight: 0.5,
    secretsMin: 2,
    secretsMax: 2,
    items: 4,
    maxMonstersPerRoom: 3,
  },
  7: {
    gridSize: 22,
    rooms: 7,
    blobAreaMin: 9,
    blobAreaMax: 16,
    monsterBudget: 7,
    hiddenDoorChance: 0.15,
    trappedDoorChance: 0.1,
    lockedDoorChance: 0.1,
    extraDoorChance: 0.25,
    ambientLight: 0.4,
    secretsMin: 2,
    secretsMax: 3,
    items: 4,
    maxMonstersPerRoom: 3,
  },
  8: {
    gridSize: 23,
    rooms: 7,
    blobAreaMin: 9,
    blobAreaMax: 17,
    monsterBudget: 16,
    hiddenDoorChance: 0.15,
    trappedDoorChance: 0.15,
    lockedDoorChance: 0.1,
    extraDoorChance: 0.28,
    ambientLight: 0.3,
    secretsMin: 3,
    secretsMax: 3,
    items: 4,
    maxMonstersPerRoom: 3,
  },
  9: {
    gridSize: 24,
    rooms: 8,
    blobAreaMin: 10,
    blobAreaMax: 18,
    monsterBudget: 13,
    hiddenDoorChance: 0.15,
    trappedDoorChance: 0.15,
    lockedDoorChance: 0.15,
    extraDoorChance: 0.3,
    ambientLight: 0.2,
    secretsMin: 3,
    secretsMax: 3,
    items: 5,
    maxMonstersPerRoom: 3,
  },
  10: {
    gridSize: 26,
    rooms: 9,
    blobAreaMin: 10,
    blobAreaMax: 20,
    monsterBudget: 10,
    hiddenDoorChance: 0.2,
    trappedDoorChance: 0.15,
    lockedDoorChance: 0.15,
    extraDoorChance: 0.35,
    ambientLight: 0.1,
    secretsMin: 3,
    secretsMax: 4,
    items: 5,
    maxMonstersPerRoom: 3,
  },
};

export const MIN_DEPTH = 1;
export const MAX_DEPTH = 10;

// ---------------------------------------------------------------------------
// Monster pool and budget system (03-difficulty-curve.md)
// ---------------------------------------------------------------------------

export type MonsterPoolEntry = {
  /** Registered monster type identifier. */
  type: string;
  /** Experience cost against the floor's monster budget. */
  xp: number;
  /** First depth the monster can appear on. */
  minDepth: number;
  /** Base weight for the weighted pick; weight rises with depth. */
  baseWeight: number;
};

export const MONSTER_POOL: MonsterPoolEntry[] = [
  { type: MonsterType.ORC, xp: 1, minDepth: 1, baseWeight: 3 },
  { type: MonsterType.TROLL, xp: 2, minDepth: 3, baseWeight: 2 },
  { type: MID_TIER_MONSTER_A, xp: 3, minDepth: 5, baseWeight: 1.5 },
  { type: MID_TIER_MONSTER_B, xp: 4, minDepth: 7, baseWeight: 1 },
];

/** Weight of a pool entry at the given depth: higher tiers rise with depth. */
export const monsterWeight = (entry: MonsterPoolEntry, depth: number): number =>
  entry.baseWeight * (1 + 0.1 * Math.max(0, depth - entry.minDepth));

/** Boss floors: one dark lord mid-campaign, the final boss on the last floor. */
export const BOSS_FLOORS: Record<number, string> = {
  5: MonsterType.YELLOW_DARK_LORD,
  10: MonsterType.BLUE_DARK_LORD,
};

/** Dark lords use the default master stat block, whose experience is 4. */
export const BOSS_XP = 4;

/** Probability a placed monster carries an item from the campaign deck. */
export const inventoryChance = (depth: number): number =>
  Math.min(0.25, 0.04 * depth);

/** Total event numbers in the shared world event pool. */
export const WORLD_EVENT_COUNT = 16;

// ---------------------------------------------------------------------------
// Loot progression (03-difficulty-curve.md): equipment quality rises with
// depth and healing magic items are biased to the early floors.
// ---------------------------------------------------------------------------

/** Lowest and highest equipment `value` the loot weighting sweeps over depth. */
const LOOT_VALUE_MIN = 1;
const LOOT_VALUE_MAX = 4;

/**
 * Equipment `value` the floor loot is weighted toward: 1 at depth 1 rising
 * linearly to 4 at depth 10.
 */
export const lootTargetValue = (depth: number): number =>
  LOOT_VALUE_MIN +
  ((LOOT_VALUE_MAX - LOOT_VALUE_MIN) * (depth - MIN_DEPTH)) /
    (MAX_DEPTH - MIN_DEPTH);

/** Weight of an equipment item at the given depth (by its `value`). */
export const equipmentLootWeight = (item: Item, depth: number): number =>
  1 / (1 + Math.abs((item.value ?? 0) - lootTargetValue(depth)));

/**
 * Magic items and the depth their placement is weighted toward — the
 * campaign's power curve: healing first, the sword of chaos last. Each
 * unique magic item is placed at most once per campaign; once all are
 * placed the deepest floors repeat the consumables.
 */
export const MAGIC_ITEM_TARGET_DEPTH: Record<string, number> = {
  healing_herbs: 1,
  boots_of_speed: 3,
  crown_of_wisdom: 4,
  necklace_of_light: 5,
  ring_of_precision: 6,
  giants_glove: 7,
  potion_of_speed: 8,
  sword_of_chaos: 10,
};

/** Consumable magic items — the only ones repeated once the uniques run out. */
export const CONSUMABLE_MAGIC_ITEMS = ['healing_herbs', 'potion_of_speed'];

/** Weight of a magic item at the given depth (by its target depth). */
export const magicItemLootWeight = (item: Item, depth: number): number =>
  1 / (1 + Math.abs((MAGIC_ITEM_TARGET_DEPTH[item.id ?? ''] ?? depth) - depth));

export const getDepthConfig = (depth: number): DepthConfig => {
  const config = DEPTH_CONFIGS[depth];
  if (!config) {
    throw new Error(`No depth config for depth ${depth}`);
  }
  return config;
};

export const allDepthConfigs = (): DepthConfig[] =>
  Array.from({ length: MAX_DEPTH }, (_, i) => getDepthConfig(i + MIN_DEPTH));
