import { createSeededRng } from '../../../core/dice';

/**
 * Deterministic rng rig for the campaign generator.
 *
 * All generator randomness flows through here, seeded per dungeon as
 * `hashSeed(CAMPAIGN_SEED, depth, attempt)` (see docs/random-campaign-spec/
 * 02-generation-algorithm.md). The underlying stream is the seedable rng
 * from `src/core/dice.ts` — the generator never calls `Math.random()`.
 */

/** Derives the per-dungeon seed from the fixed campaign seed, the depth and the retry attempt. */
export const hashSeed = (
  campaignSeed: number,
  depth: number,
  attempt: number,
): number => {
  let h = campaignSeed >>> 0;
  h = Math.imul(h ^ (depth + 0x9e3779b9), 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h ^ (attempt + 0x165667b1), 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
};

export type Rig = {
  /** The raw seeded stream in [0, 1). */
  next: () => number;
  /** A random integer in [min, max] (inclusive). */
  intInRange: (min: number, max: number) => number;
  /** True with the given probability (0 = never, 1 = always). */
  chance: (probability: number) => boolean;
  /** A uniformly random element (throws on an empty list). */
  pick: <T>(items: readonly T[]) => T;
  /** A random element with probability proportional to its weight. */
  weightedPick: <T>(items: readonly T[], weights: readonly number[]) => T;
  /** A shuffled copy of the input (the input is not mutated). */
  shuffle: <T>(items: readonly T[]) => T[];
};

export const createRig = (seed: number): Rig => {
  const rng = createSeededRng(seed);

  const next = (): number => rng();

  const intInRange = (min: number, max: number): number =>
    min + Math.floor(rng() * (max - min + 1));

  const chance = (probability: number): boolean => rng() < probability;

  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) {
      throw new Error('pick called with an empty list');
    }
    return items[Math.floor(rng() * items.length)];
  };

  const weightedPick = <T>(
    items: readonly T[],
    weights: readonly number[],
  ): T => {
    if (items.length === 0) {
      throw new Error('weightedPick called with an empty list');
    }
    if (items.length !== weights.length) {
      throw new Error('weightedPick called with mismatched lengths');
    }
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    if (total <= 0) {
      throw new Error('weightedPick called with non-positive total weight');
    }
    let roll = rng() * total;
    for (let i = 0; i < items.length; i++) {
      roll -= weights[i];
      if (roll < 0) {
        return items[i];
      }
    }
    return items[items.length - 1];
  };

  const shuffle = <T>(items: readonly T[]): T[] => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  return { next, intInRange, chance, pick, weightedPick, shuffle };
};
