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

    expect(report).toContain('Bot Playstyle:');
    expect(report).toContain('Avg Casualties (±SD)');
    expect(report).toContain('Win Rem HP');
    expect(report).toContain('Min Party HP');
    expect(report).toContain('Near Death');
    expect(report).toContain('Wasted Search');
    expect(report).toContain('Spawns');
    expect(report).toContain('Spawns by Game Master (Round & Monster):');
  });
});

describe('Benchmark Metrics Verification', () => {
  beforeAll(async () => {
    try {
      await loadTranslations('en');
    } catch {
      // fallback
    }
  });

  it('tracks all required benchmark metrics accurately in single game and summary', async () => {
    const singleResult = await runSingleGame({
      dungeon: e1m0,
      gameMasterId: 'storyTeller',
      seed: 1234,
      maxTurns: 50,
    });

    expect(typeof singleResult.lowestPartyHp).toBe('number');
    expect(singleResult.lowestPartyHp).toBeGreaterThanOrEqual(0);
    expect(typeof singleResult.nearDeathCount).toBe('number');
    expect(singleResult.nearDeathCount).toBeGreaterThanOrEqual(0);
    expect(typeof singleResult.wastedSearches).toBe('number');
    expect(singleResult.wastedSearches).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(singleResult.spawns)).toBe(true);

    const summary = await runGameMasterBenchmark({
      dungeon: e1m0,
      gameMasterId: 'storyTeller',
      runs: 5,
      startSeed: 200,
      maxTurns: 50,
    });

    expect(typeof summary.stdDevHeroCasualties).toBe('number');
    expect(summary.stdDevHeroCasualties).toBeGreaterThanOrEqual(0);
    expect(typeof summary.avgWinRemainingHealth).toBe('number');
    expect(summary.avgWinRemainingHealth).toBeGreaterThanOrEqual(0);
    expect(typeof summary.lowestPartyHp).toBe('number');
    expect(summary.lowestPartyHp).toBeGreaterThanOrEqual(0);
    expect(typeof summary.totalNearDeathCount).toBe('number');
    expect(typeof summary.avgNearDeathCount).toBe('number');
    expect(typeof summary.totalWastedSearches).toBe('number');
    expect(typeof summary.avgWastedSearches).toBe('number');
    expect(typeof summary.totalSpawns).toBe('number');
    expect(Array.isArray(summary.spawns)).toBe(true);

    const formatted = formatBenchmarkReport([summary], 'Test Benchmark');
    expect(formatted).toContain('Bot Playstyle:');
    expect(formatted).toContain('Avg Casualties (±SD)');
    expect(formatted).toContain('Win Rem HP');
    expect(formatted).toContain('Min Party HP');
    expect(formatted).toContain('Near Death');
    expect(formatted).toContain('Wasted Search');
    expect(formatted).toContain('Spawns by Game Master (Round & Monster):');
  });
});
