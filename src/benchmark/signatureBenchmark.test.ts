import { describe, it, expect, beforeAll, vi } from 'vitest';
import { loadTranslations } from '#lib/translations/index.js';
import e1m0 from '../campaigns/iceDragonTreasure/dungeons/e1m0';
import { e1m5 } from '../campaigns/iceDragonTreasure/dungeons/e1m5';
import { testingGrounds } from '../dungeon/testingGrounds';
import {
  formatSignatureBenchmarkReport,
  runSignatureBenchmark,
} from './signatureBenchmark';
import { writeBenchmarkReport } from './benchmark';

// Runs only under BENCHMARK=true (npm run benchmark:signatures).
vi.setConfig({ testTimeout: 60000 });

describe('Signature benchmark', () => {
  beforeAll(async () => {
    try {
      await loadTranslations('en');
    } catch {
      // fallback
    }
  });

  it('measures layer signature construction on unchanged explored dungeons', () => {
    const results = [
      runSignatureBenchmark('e1m0 (smallest ice dragon map)', e1m0),
      runSignatureBenchmark('e1m5 (largest ice dragon map)', e1m5),
      runSignatureBenchmark('testing grounds', testingGrounds),
    ];
    const report = formatSignatureBenchmarkReport(results);
    // eslint-disable-next-line no-console
    console.log(report);
    writeBenchmarkReport(report);

    results.forEach((result) => {
      result.timings.forEach((timing) => {
        expect(timing.meanUs).toBeGreaterThan(0);
      });
      expect(result.isometricFrameUs).toBeGreaterThanOrEqual(
        result.topDownFrameUs * 0.5,
      );
    });
  });
});
