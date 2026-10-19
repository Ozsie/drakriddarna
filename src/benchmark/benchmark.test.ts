import { describe, it, expect, beforeAll } from 'vitest';
import { e1m0 } from '../campaigns/iceDragonTreasure/dungeons/e1m0';
import { loadTranslations } from '$lib/translations';
import {
  runGameMasterBenchmark,
  runSingleGame,
  formatBenchmarkReport,
} from './benchmark';
import { e1m1 } from '../campaigns/iceDragonTreasure/dungeons/e1m1';
import { e2m1 } from '../campaigns/earthHour/dungeons/e2m1';

describe('e1m0 Game Master & Playability Benchmark', () => {
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
      gameMasterId: 'storyTeller',
      seed: 42,
      maxTurns: 100,
    });

    expect(['WON', 'LOST', 'TIMEOUT']).toContain(result.status);
    expect(result.turns).toBeGreaterThan(0);
  });

  it('evaluates e1m0 playability across storyTeller, tactician, and brutalOverlord game masters', async () => {
    const runsPerGameMaster = 100;

    const storyTellerSummary = await runGameMasterBenchmark({
      dungeon: e1m0,
      gameMasterId: 'storyTeller',
      runs: runsPerGameMaster,
      startSeed: 100,
      maxTurns: 100,
    });

    const tacticianSummary = await runGameMasterBenchmark({
      dungeon: e1m0,
      gameMasterId: 'tactician',
      runs: runsPerGameMaster,
      startSeed: 100,
      maxTurns: 100,
    });

    const brutalOverlordSummary = await runGameMasterBenchmark({
      dungeon: e1m0,
      gameMasterId: 'brutalOverlord',
      runs: runsPerGameMaster,
      startSeed: 100,
      maxTurns: 100,
    });

    const report = formatBenchmarkReport(
      [storyTellerSummary, tacticianSummary, brutalOverlordSummary],
      'Ice Dragon Treasure - e1m0 (Troll Cave) Benchmark',
    );

    // eslint-disable-next-line no-console
    console.log('\n' + report + '\n');

    expect(storyTellerSummary.totalRuns).toBe(runsPerGameMaster);
    expect(tacticianSummary.totalRuns).toBe(runsPerGameMaster);
    expect(brutalOverlordSummary.totalRuns).toBe(runsPerGameMaster);

    expect(storyTellerSummary.winRate).toBeGreaterThanOrEqual(0);
    expect(tacticianSummary.winRate).toBeGreaterThanOrEqual(0);
    expect(brutalOverlordSummary.winRate).toBeGreaterThanOrEqual(0);
  });
});

describe('e1m1 Game Master & Playability Benchmark', () => {
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
      gameMasterId: 'storyTeller',
      seed: 42,
      maxTurns: 100,
    });

    expect(['WON', 'LOST', 'TIMEOUT']).toContain(result.status);
    expect(result.turns).toBeGreaterThan(0);
  });

  it('evaluates e1m1 playability across storyTeller, tactician, and brutalOverlord game masters', async () => {
    const runsPerGameMaster = 100;

    const storyTellerSummary = await runGameMasterBenchmark({
      dungeon: e1m1,
      gameMasterId: 'storyTeller',
      runs: runsPerGameMaster,
      startSeed: 100,
      maxTurns: 100,
    });

    const tacticianSummary = await runGameMasterBenchmark({
      dungeon: e1m1,
      gameMasterId: 'tactician',
      runs: runsPerGameMaster,
      startSeed: 100,
      maxTurns: 100,
    });

    const brutalOverlordSummary = await runGameMasterBenchmark({
      dungeon: e1m1,
      gameMasterId: 'brutalOverlord',
      runs: runsPerGameMaster,
      startSeed: 100,
      maxTurns: 100,
    });

    const report = formatBenchmarkReport(
      [storyTellerSummary, tacticianSummary, brutalOverlordSummary],
      'Ice Dragon Treasure - e1m1 (The Three Gates of Power) Benchmark',
    );

    // eslint-disable-next-line no-console
    console.log('\n' + report + '\n');

    expect(storyTellerSummary.totalRuns).toBe(runsPerGameMaster);
    expect(tacticianSummary.totalRuns).toBe(runsPerGameMaster);
    expect(brutalOverlordSummary.totalRuns).toBe(runsPerGameMaster);

    expect(storyTellerSummary.winRate).toBeGreaterThanOrEqual(0);
    expect(tacticianSummary.winRate).toBeGreaterThanOrEqual(0);
    expect(brutalOverlordSummary.winRate).toBeGreaterThanOrEqual(0);
  });
});

describe('e2m1 Game Master & Playability Benchmark', () => {
  beforeAll(async () => {
    try {
      await loadTranslations('en');
    } catch {
      // fallback
    }
  });

  it('runs a single game of e2m1 successfully', async () => {
    const result = await runSingleGame({
      dungeon: e2m1,
      gameMasterId: 'storyTeller',
      seed: 42,
      maxTurns: 100,
    });

    expect(['WON', 'LOST', 'TIMEOUT']).toContain(result.status);
    expect(result.turns).toBeGreaterThan(0);
  });

  it('evaluates e2m1 playability across storyTeller, tactician, and brutalOverlord game masters', async () => {
    const runsPerGameMaster = 100;

    const storyTellerSummary = await runGameMasterBenchmark({
      dungeon: e2m1,
      gameMasterId: 'storyTeller',
      runs: runsPerGameMaster,
      startSeed: 100,
      maxTurns: 100,
    });

    const tacticianSummary = await runGameMasterBenchmark({
      dungeon: e2m1,
      gameMasterId: 'tactician',
      runs: runsPerGameMaster,
      startSeed: 100,
      maxTurns: 100,
    });

    const brutalOverlordSummary = await runGameMasterBenchmark({
      dungeon: e2m1,
      gameMasterId: 'brutalOverlord',
      runs: runsPerGameMaster,
      startSeed: 100,
      maxTurns: 100,
    });

    const report = formatBenchmarkReport(
      [storyTellerSummary, tacticianSummary, brutalOverlordSummary],
      'Parlours of Malice - e2m1 (The Five Mounds of Terror) Benchmark',
    );

    // eslint-disable-next-line no-console
    console.log('\n' + report + '\n');

    expect(storyTellerSummary.totalRuns).toBe(runsPerGameMaster);
    expect(tacticianSummary.totalRuns).toBe(runsPerGameMaster);
    expect(brutalOverlordSummary.totalRuns).toBe(runsPerGameMaster);

    expect(storyTellerSummary.winRate).toBeGreaterThanOrEqual(0);
    expect(tacticianSummary.winRate).toBeGreaterThanOrEqual(0);
    expect(brutalOverlordSummary.winRate).toBeGreaterThanOrEqual(0);
  });
});
