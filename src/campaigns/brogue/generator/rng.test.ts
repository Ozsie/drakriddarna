import { describe, expect, it } from 'vitest';
import { createRig, hashSeed } from './rng';
import { CAMPAIGN_SEED } from './config';

const drawSequence = (
  seed: number,
  draws = 50,
): (number | number[] | boolean | string)[] => {
  const rig = createRig(seed);
  const values: (number | number[] | boolean | string)[] = [];
  for (let i = 0; i < draws; i++) {
    values.push(rig.next());
    values.push(rig.intInRange(3, 7));
    values.push(rig.chance(0.5));
    values.push(rig.pick(['a', 'b', 'c']));
    values.push(rig.weightedPick(['x', 'y'], [1, 3]));
    values.push(rig.shuffle([1, 2, 3, 4, 5]).join(''));
  }
  return values;
};

describe('createRig', () => {
  it('produces the same draw sequence for the same seed', () => {
    expect(drawSequence(12345)).toEqual(drawSequence(12345));
  });

  it('diverges for different seeds', () => {
    expect(drawSequence(12345)).not.toEqual(drawSequence(54321));
  });

  it('produces values in [0, 1)', () => {
    const rig = createRig(999);
    for (let i = 0; i < 1000; i++) {
      const value = rig.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('keeps intInRange draws inside the inclusive bounds', () => {
    const rig = createRig(4242);
    for (let i = 0; i < 1000; i++) {
      const value = rig.intInRange(-3, 5);
      expect(value).toBeGreaterThanOrEqual(-3);
      expect(value).toBeLessThanOrEqual(5);
    }
  });

  it('hits both bounds of intInRange over many draws', () => {
    const rig = createRig(77);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      seen.add(rig.intInRange(1, 4));
    }
    expect(seen).toEqual(new Set([1, 2, 3, 4]));
  });

  it('never mutates the input of shuffle and keeps all elements', () => {
    const rig = createRig(31337);
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = rig.shuffle(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(input);
  });

  it('respects weights in weightedPick', () => {
    const rig = createRig(2024);
    const counts = { x: 0, y: 0 };
    for (let i = 0; i < 2000; i++) {
      counts[rig.weightedPick(['x', 'y'] as const, [1, 3])]++;
    }
    // y should land near 75% of draws; allow generous slack for a
    // deterministic but untested seed.
    expect(counts.y).toBeGreaterThan(counts.x);
  });

  it('throws on empty or mismatched inputs', () => {
    const rig = createRig(1);
    expect(() => rig.pick([])).toThrow();
    expect(() => rig.weightedPick(['a'], [1, 2])).toThrow();
    expect(() => rig.weightedPick([], [])).toThrow();
  });
});

describe('hashSeed', () => {
  it('differs per depth', () => {
    const seeds = new Set<number>();
    for (let depth = 1; depth <= 10; depth++) {
      seeds.add(hashSeed(CAMPAIGN_SEED, depth, 0));
    }
    expect(seeds.size).toBe(10);
  });

  it('differs per attempt', () => {
    const seeds = new Set<number>();
    for (let attempt = 0; attempt < 10; attempt++) {
      seeds.add(hashSeed(CAMPAIGN_SEED, 5, attempt));
    }
    expect(seeds.size).toBe(10);
  });

  it('differs per campaign seed', () => {
    expect(hashSeed(1, 3, 2)).not.toBe(hashSeed(2, 3, 2));
  });

  it('is stable across calls (pure function)', () => {
    expect(hashSeed(CAMPAIGN_SEED, 7, 4)).toBe(hashSeed(CAMPAIGN_SEED, 7, 4));
  });
});
