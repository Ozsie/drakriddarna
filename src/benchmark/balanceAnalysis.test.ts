import { describe, it, expect, beforeAll } from 'vitest';
import { e1m0 } from '../campaigns/iceDragonTreasure/dungeons/e1m0';
import { e1m1 } from '../campaigns/iceDragonTreasure/dungeons/e1m1';
import { campaigns } from '../campaigns';
import { allDepthConfigs } from '../campaigns/brogue/generator/config';
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

describe('Balance analysis: brogue campaign floors', () => {
  // The generated campaign floors are meant for a party that has already
  // cleared the earlier floors, so each floor is benchmarked with the
  // experience those floors yield: the summed monster budget of all
  // earlier depths split evenly over the four heroes.
  const configs = allDepthConfigs();
  const dungeons = campaigns['brogue'].dungeons;
  const xpBefore = (depth: number): number =>
    Math.floor(
      configs
        .slice(0, depth - 1)
        .reduce((sum, config) => sum + config.monsterBudget, 0) / 4,
    );

  const run = async (depth: number) => {
    const summaries = [];
    for (const gm of GMS) {
      summaries.push(
        await runGameMasterBenchmark({
          campaignId: 'brogue',
          dungeon: dungeons[depth - 1],
          gameMasterId: gm,
          runs: 50,
          startSeed: 1000,
          maxTurns: 100,
          heroExperience: xpBefore(depth),
        }),
      );
    }
    const report = formatBenchmarkReport(
      summaries,
      `Balance analysis - brogue floor ${depth} (hero xp ${xpBefore(depth)})`,
    );
    // eslint-disable-next-line no-console
    console.log('\n' + report + '\n');
    for (const s of summaries) expect(s.totalRuns).toBe(50);
  };

  for (let depth = 1; depth <= 10; depth++) {
    it(`benchmarks brogue floor ${depth}`, async () => {
      await run(depth);
    });
  }
});
