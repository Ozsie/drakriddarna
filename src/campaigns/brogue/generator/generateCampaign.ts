import type { Dungeon } from '../../../types';
import { ConditionType } from '../../../types';
import { defineDungeon } from '../../../dungeon/dungeonParser';
import { hashSeed } from './rng';
import { CAMPAIGN_SEED, MAX_DEPTH, MIN_DEPTH, getDepthConfig } from './config';
import { generateLayout } from './layoutGenerator';
import { populate, type PopulationDecks } from './populationGenerator';

/**
 * Campaign assembly (docs/random-campaign-spec/02-generation-algorithm.md,
 * step 6): per-depth rejection sampling with a bounded retry loop and
 * checked-in fallback seeds, then the `nextDungeon` chain.
 */

/** Retry bound per depth; measured usage is 1-3 attempts (see tests). */
export const MAX_ATTEMPTS = 50;

/**
 * Known-good seeds per depth, verified by the tests so they cannot rot.
 * They are only reached if every regular attempt fails, which the property
 * sweep shows never happens for the fixed campaign seed.
 */
export const FALLBACK_SEEDS: Record<number, number> = {
  1: 1,
  2: 3,
  3: 1,
  4: 1,
  5: 1,
  6: 2,
  7: 1,
  8: 1,
  9: 1,
  10: 1,
};

export type DepthGenerationResult = {
  dungeon: Dungeon;
  /** Attempts spent before success (maxAttempts when the fallback ran). */
  attempts: number;
  /** True when the regular attempts all failed and the fallback seed ran. */
  usedFallback: boolean;
};

export type CampaignGenerationResult = {
  dungeons: Dungeon[];
  results: DepthGenerationResult[];
};

export type BuiltDungeon = {
  dungeon: Dungeon;
  /** Id of the magic item the floor placed (tracked for campaign uniqueness). */
  placedMagicItemId: string;
};

export const buildDungeon = (
  depth: number,
  seed: number,
  decks: PopulationDecks,
  placedMagicItems: string[] = [],
): BuiltDungeon => {
  const generated = generateLayout(seed, depth);
  const { layout, events, placedMagicItemId } = populate(
    generated,
    seed,
    depth,
    decks,
    placedMagicItems,
  );
  return {
    dungeon: defineDungeon({
      name: `campaign.brogue.floor${depth}.name`,
      intro: `campaign.brogue.floor${depth}.intro`,
      winConditions: [{ type: ConditionType.KILL_ALL, fulfilled: false }],
      startingPositions: generated.startingPositions,
      discoveredRooms: [generated.startRoom],
      ambientLight: getDepthConfig(depth).ambientLight,
      layout,
      events,
    }),
    placedMagicItemId,
  };
};

/**
 * Rejection sampling for one depth: try `maxAttempts` derived seeds, then
 * fall back to a checked-in known-good seed. `tryGenerate` is injectable so
 * tests can poison the regular path and exercise the fallback.
 */
export const generateDepthWithRetry = (
  depth: number,
  tryGenerate: (seed: number) => Dungeon,
  fallbackSeed: number,
  campaignSeed: number = CAMPAIGN_SEED,
  maxAttempts: number = MAX_ATTEMPTS,
): DepthGenerationResult => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const seed = hashSeed(campaignSeed, depth, attempt);
    try {
      return {
        dungeon: tryGenerate(seed),
        attempts: attempt + 1,
        usedFallback: false,
      };
    } catch {
      continue;
    }
  }
  return {
    dungeon: tryGenerate(fallbackSeed),
    attempts: maxAttempts,
    usedFallback: true,
  };
};

export const generateCampaign = (
  decks: PopulationDecks,
  campaignSeed: number = CAMPAIGN_SEED,
): CampaignGenerationResult => {
  const results: DepthGenerationResult[] = [];
  // Magic items are unique per campaign: each floor excludes the ones the
  // earlier floors already placed. The set is only updated after a depth
  // builds successfully, so a rejected attempt rolls its pick back.
  const placedMagicItems = new Set<string>();
  for (let depth = MIN_DEPTH; depth <= MAX_DEPTH; depth++) {
    results.push(
      generateDepthWithRetry(
        depth,
        (seed) => {
          const built = buildDungeon(depth, seed, decks, [...placedMagicItems]);
          placedMagicItems.add(built.placedMagicItemId);
          return built.dungeon;
        },
        FALLBACK_SEEDS[depth],
        campaignSeed,
      ),
    );
  }
  const dungeons = results.map((result) => result.dungeon);
  for (let i = 0; i < dungeons.length - 1; i++) {
    dungeons[i].nextDungeon = dungeons[i + 1];
  }
  return { dungeons, results };
};
