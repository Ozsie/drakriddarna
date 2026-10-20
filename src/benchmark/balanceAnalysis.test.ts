import { describe, it, expect, beforeAll } from 'vitest';
import { e1m0 } from '../campaigns/iceDragonTreasure/dungeons/e1m0';
import { e1m1 } from '../campaigns/iceDragonTreasure/dungeons/e1m1';
import { loadTranslations } from '$lib/translations';
import { runGameMasterBenchmark, formatBenchmarkReport } from './benchmark';

const GMS = ['storyTeller', 'tactician', 'brutalOverlord'];

describe('Balance analysis: e1m0 vs e1m1', () => {
  beforeAll(async () => {
    try {
      await loadTranslations('en');
    } catch {
      // fallback
    }
  });

  const run = async (dungeon: typeof e1m0, label: string) => {
    const summaries = [];
    for (const gm of GMS) {
      summaries.push(
        await runGameMasterBenchmark({
          dungeon,
          gameMasterId: gm,
          runs: 100,
          startSeed: 1000,
          maxTurns: 100,
        }),
      );
    }
    const report = formatBenchmarkReport(
      summaries,
      `Balance analysis - ${label}`,
    );
    // eslint-disable-next-line no-console
    console.log('\n' + report + '\n');
    for (const s of summaries) expect(s.totalRuns).toBe(100);
  };

  it('benchmarks e1m0 (Troll Cave)', async () => {
    await run(e1m0, 'e1m0 (Troll Cave)');
  });

  it('benchmarks e1m1 (Mines of Evil)', async () => {
    await run(e1m1, 'e1m1 (Mines of Evil)');
  });
});
