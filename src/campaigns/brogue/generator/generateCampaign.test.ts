import { describe, expect, it } from 'vitest';
import type { Dungeon, Item } from '../../../types';
import { ConditionType, ItemType } from '../../../types';
import { setRng, createSeededRng } from '../../../core/dice';
import { assertValidDungeon } from '../../../dungeon/dungeonValidator';
import { weapons } from '../../../items/weapons';
import { armour } from '../../../items/armours';
import { shields } from '../../../items/shields';
import { magicItems } from '../../../items/magicItems';
import {
  FALLBACK_SEEDS,
  MAX_ATTEMPTS,
  buildDungeon,
  generateCampaign,
  generateDepthWithRetry,
} from './generateCampaign';
import type { PopulationDecks } from './populationGenerator';
import { MAX_DEPTH, MIN_DEPTH, CONSUMABLE_MAGIC_ITEMS } from './config';

const decks: PopulationDecks = {
  equipment: [...weapons, ...armour, ...shields].filter(
    (item) => item.amountInDeck > 0,
  ),
  magicItems,
};

const generateWithFreshRng = (): Dungeon[] => {
  // createMonster draws each monster's temperament from the global rng,
  // so both passes must start from the same global rng state.
  setRng(createSeededRng(123456));
  return generateCampaign(decks).dungeons;
};

describe('generateCampaign', () => {
  it('builds a chain of 10 dungeons where each links to the next', () => {
    const dungeons = generateWithFreshRng();
    expect(dungeons.length).toBe(MAX_DEPTH);
    for (let i = 0; i < dungeons.length - 1; i++) {
      expect(dungeons[i].nextDungeon).toBe(dungeons[i + 1]);
    }
    expect(dungeons[MAX_DEPTH - 1].nextDungeon).toBeUndefined();
  });

  it('is deterministic: the same campaign seed yields deep-equal chains', () => {
    const a = generateWithFreshRng();
    const b = generateWithFreshRng();
    expect(a).toEqual(b);
  });

  it('produces dungeons that all pass validation', () => {
    for (const dungeon of generateWithFreshRng()) {
      expect(() => assertValidDungeon(dungeon)).not.toThrow();
    }
  });

  it('uses the per-floor translation keys and win condition', () => {
    const dungeons = generateWithFreshRng();
    for (let depth = MIN_DEPTH; depth <= MAX_DEPTH; depth++) {
      const dungeon = dungeons[depth - 1];
      expect(dungeon.name).toBe(`campaign.brogue.floor${depth}.name`);
      expect(dungeon.intro).toBe(`campaign.brogue.floor${depth}.intro`);
      expect(dungeon.winConditions).toEqual([
        { type: ConditionType.KILL_ALL, fulfilled: false },
      ]);
    }
  });

  it('places one magic item per floor, uniques at most once per campaign', () => {
    const dungeons = generateWithFreshRng();
    const magicIds: string[] = [];
    for (const dungeon of dungeons) {
      // Every floor places exactly one magic item.
      const magic = (dungeon.layout.items ?? [])
        .map((itemLocation) => itemLocation.item)
        .filter((item): item is Item => item?.type === ItemType.MAGIC);
      expect(magic.length).toBe(1);
      magicIds.push(magic[0]!.id!);
    }
    // The unique magic items are never repeated; only the consumables may
    // appear twice once the uniques are exhausted.
    const counts = new Map<string, number>();
    for (const id of magicIds) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    for (const [id, count] of counts) {
      if (count > 1) {
        expect(CONSUMABLE_MAGIC_ITEMS).toContain(id);
      }
    }
  });

  it('succeeds within a few attempts and never activates the fallback', () => {
    const { results } = generateCampaign(decks);
    for (const result of results) {
      expect(result.usedFallback).toBe(false);
      expect(result.attempts).toBeLessThanOrEqual(5);
    }
  });

  it('falls back to a known-good seed when every attempt is poisoned', () => {
    const depth = 4;
    const result = generateDepthWithRetry(
      depth,
      (seed) => {
        if (seed === FALLBACK_SEEDS[depth]) {
          return buildDungeon(depth, seed, decks).dungeon;
        }
        throw new Error('poisoned');
      },
      FALLBACK_SEEDS[depth],
    );
    expect(result.usedFallback).toBe(true);
    expect(result.attempts).toBe(MAX_ATTEMPTS);
    expect(() => assertValidDungeon(result.dungeon)).not.toThrow();
  });

  it('keeps every fallback seed green', () => {
    for (let depth = MIN_DEPTH; depth <= MAX_DEPTH; depth++) {
      const dungeon = buildDungeon(depth, FALLBACK_SEEDS[depth], decks).dungeon;
      expect(() => assertValidDungeon(dungeon)).not.toThrow();
    }
  });

  it('property sweep: 100 campaign seeds x 10 depths never fall back', () => {
    for (let i = 0; i < 100; i++) {
      const campaignSeed = 100000 + i;
      for (let depth = MIN_DEPTH; depth <= MAX_DEPTH; depth++) {
        const result = generateDepthWithRetry(
          depth,
          (seed) => buildDungeon(depth, seed, decks).dungeon,
          FALLBACK_SEEDS[depth],
          campaignSeed,
        );
        expect(result.usedFallback).toBe(false);
        expect(result.attempts).toBeLessThanOrEqual(MAX_ATTEMPTS);
        expect(() => assertValidDungeon(result.dungeon)).not.toThrow();
      }
    }
  });
});
