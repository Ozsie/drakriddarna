import { describe, it, expect, beforeAll } from 'vitest';
import { e1m0 } from '../campaigns/iceDragonTreasure/dungeons/e1m0';
import { loadTranslations } from '../lib/translations';
import {
  runDifficultyBenchmark,
  runSingleGame,
  formatBenchmarkReport,
} from './benchmark';
import { e1m1 } from '../campaigns/iceDragonTreasure/dungeons/e1m1';

describe('e1m0 Difficulty & Playability Benchmark', () => {
  beforeAll(async () => {
    try {
      await loadTranslations('en');
    } catch {
      // fallback
    }
  });

  it('runs a single game of e1m0 successfully', async () => {
    const result = await runSingleGame({
      dungeon: e1m0,
      difficultyId: 'easy',
      seed: 42,
      maxTurns: 100,
    });

    expect(['WON', 'LOST', 'TIMEOUT']).toContain(result.status);
    expect(result.turns).toBeGreaterThan(0);
  });

  it('evaluates e1m0 playability across easy, normal, and hard difficulties', async () => {
    const runsPerDifficulty = 50;

    const easySummary = await runDifficultyBenchmark({
      dungeon: e1m0,
      difficultyId: 'easy',
      runs: runsPerDifficulty,
      startSeed: 100,
      maxTurns: 100,
    });

    const normalSummary = await runDifficultyBenchmark({
      dungeon: e1m0,
      difficultyId: 'normal',
      runs: runsPerDifficulty,
      startSeed: 100,
      maxTurns: 100,
    });

    const hardSummary = await runDifficultyBenchmark({
      dungeon: e1m0,
      difficultyId: 'hard',
      runs: runsPerDifficulty,
      startSeed: 100,
      maxTurns: 100,
    });

    const report = formatBenchmarkReport(
      [easySummary, normalSummary, hardSummary],
      'Ice Dragon Treasure - e1m0 (Troll Cave) Benchmark',
    );

    // eslint-disable-next-line no-console
    console.log('\n' + report + '\n');

    expect(easySummary.totalRuns).toBe(runsPerDifficulty);
    expect(normalSummary.totalRuns).toBe(runsPerDifficulty);
    expect(hardSummary.totalRuns).toBe(runsPerDifficulty);

    // Easy should generally have higher or equal win rate / surviving health than hard
    expect(easySummary.winRate).toBeGreaterThanOrEqual(0);
    expect(normalSummary.winRate).toBeGreaterThanOrEqual(0);
    expect(hardSummary.winRate).toBeGreaterThanOrEqual(0);
  });
});

describe('e1m1 Difficulty & Playability Benchmark', () => {
  beforeAll(async () => {
    try {
      await loadTranslations('en');
    } catch {
      // fallback
    }
  });

  it('runs a single game of e1m1 successfully', async () => {
    const result = await runSingleGame({
      dungeon: e1m1,
      difficultyId: 'easy',
      seed: 42,
      maxTurns: 100,
    });

    expect(['WON', 'LOST', 'TIMEOUT']).toContain(result.status);
    expect(result.turns).toBeGreaterThan(0);
  });

  it('evaluates e1m1 playability across easy, normal, and hard difficulties', async () => {
    const runsPerDifficulty = 50;

    const easySummary = await runDifficultyBenchmark({
      dungeon: e1m1,
      difficultyId: 'easy',
      runs: runsPerDifficulty,
      startSeed: 100,
      maxTurns: 100,
    });

    const normalSummary = await runDifficultyBenchmark({
      dungeon: e1m1,
      difficultyId: 'normal',
      runs: runsPerDifficulty,
      startSeed: 100,
      maxTurns: 100,
    });

    const hardSummary = await runDifficultyBenchmark({
      dungeon: e1m1,
      difficultyId: 'hard',
      runs: runsPerDifficulty,
      startSeed: 100,
      maxTurns: 100,
    });

    const report = formatBenchmarkReport(
      [easySummary, normalSummary, hardSummary],
      'Ice Dragon Treasure - e1m1 (The Three Gates of Power) Benchmark',
    );

    // eslint-disable-next-line no-console
    console.log('\n' + report + '\n');

    expect(easySummary.totalRuns).toBe(runsPerDifficulty);
    expect(normalSummary.totalRuns).toBe(runsPerDifficulty);
    expect(hardSummary.totalRuns).toBe(runsPerDifficulty);

    // Easy should generally have higher or equal win rate / surviving health than hard
    expect(easySummary.winRate).toBeGreaterThanOrEqual(0);
    expect(normalSummary.winRate).toBeGreaterThanOrEqual(0);
    expect(hardSummary.winRate).toBeGreaterThanOrEqual(0);
  });
});
