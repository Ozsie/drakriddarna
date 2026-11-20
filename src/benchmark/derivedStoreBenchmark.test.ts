import { describe, it, expect, beforeAll, vi } from 'vitest';
import { loadTranslations } from '#lib/translations/index.js';
import e1m0 from '../campaigns/iceDragonTreasure/dungeons/e1m0';
import { e1m5 } from '../campaigns/iceDragonTreasure/dungeons/e1m5';
import { testingGrounds } from '../dungeon/testingGrounds';
import {
  formatDerivedStoreBenchmarkReport,
  runDerivedStoreBenchmark,
} from './derivedStoreBenchmark';
import { writeBenchmarkReport } from './benchmark';

// Runs only under BENCHMARK=true (npm run benchmark:derived-stores).
vi.setConfig({ testTimeout: 60000 });

describe('Derived-store recomputation benchmark', () => {
  beforeAll(async () => {
    try {
      await loadTranslations('en');
    } catch {
      // fallback
    }
  });

  it('measures derived recomputation and publication costs on unchanged explored dungeons', () => {
    const results = [
      runDerivedStoreBenchmark('e1m0 (smallest ice dragon map)', e1m0),
      runDerivedStoreBenchmark('e1m5 (largest ice dragon map)', e1m5),
      runDerivedStoreBenchmark('testing grounds', testingGrounds),
    ];
    const report = formatDerivedStoreBenchmarkReport(results);
    // eslint-disable-next-line no-console
    console.log(report);
    writeBenchmarkReport(report);

    results.forEach((result) => {
      result.timings.forEach((timing) => {
        expect(timing.meanUs).toBeGreaterThan(0);
      });
      expect(result.publishNoDerivedSubscribersUs).toBeGreaterThan(0);
      expect(result.publishAllDerivedSubscribersUs).toBeGreaterThan(0);
      // The published timings only cover the recomputation work when the
      // derived propagation completes synchronously inside set().
      expect(result.synchronousSubscribersPerPublish).toBe(1);
    });
  });
});
