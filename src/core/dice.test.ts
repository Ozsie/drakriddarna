import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { roll, shuffle, setRng, resetRng, createSeededRng } from './dice';
import { Level } from '../types';

describe('dice module', () => {
  beforeEach(() => {
    resetRng();
  });

  afterEach(() => {
    resetRng();
  });

  describe('roll', () => {
    it('apprentice level counts only 5s as successes', () => {
      // Mock RNG sequence returning 1, 2, 3, 4, 5, 6
      // Math.floor(rng * 6) + 1:
      // (0/6)->1, (1/6)->2, (2/6)->3, (3/6)->4, (4/6)->5, (5/6)->6
      const values = [0 / 6, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6];
      let idx = 0;
      setRng(() => values[idx++ % values.length]);

      const successes = roll(Level.APPRENTICE, 6);
      expect(successes).toBe(1); // only 5
    });

    it('knight and hero level counts 4, 5, 6 as successes', () => {
      const values = [0 / 6, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6];
      let idx = 0;
      setRng(() => values[idx++ % values.length]);

      const knightSuccesses = roll(Level.KNIGHT, 6);
      expect(knightSuccesses).toBe(3); // 4, 5, 6

      idx = 0;
      const heroSuccesses = roll(Level.HERO, 6);
      expect(heroSuccesses).toBe(3);
    });

    it('lord and master level counts 3, 4, 5, 6 as successes', () => {
      const values = [0 / 6, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6];
      let idx = 0;
      setRng(() => values[idx++ % values.length]);

      const lordSuccesses = roll(Level.LORD, 6);
      expect(lordSuccesses).toBe(4); // 3, 4, 5, 6

      idx = 0;
      const masterSuccesses = roll(Level.MASTER, 6);
      expect(masterSuccesses).toBe(4);
    });
  });

  describe('seeded RNG', () => {
    it('produces deterministic pseudo-random sequences', () => {
      const rng1 = createSeededRng(12345);
      const rng2 = createSeededRng(12345);

      const seq1 = [rng1(), rng1(), rng1(), rng1()];
      const seq2 = [rng2(), rng2(), rng2(), rng2()];

      expect(seq1).toEqual(seq2);
    });
  });

  describe('shuffle', () => {
    it('shuffles an array', () => {
      const array = [1, 2, 3, 4, 5];
      const copy = [...array];
      const result = shuffle(copy);
      expect(result).toHaveLength(5);
      expect(result.sort()).toEqual([1, 2, 3, 4, 5]);
    });
  });
});
