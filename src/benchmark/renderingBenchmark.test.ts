import { describe, it, expect, beforeAll } from 'vitest';
import { loadTranslations } from '$lib/translations';
import { e1m0 } from '../campaigns/iceDragonTreasure/dungeons/e1m0';
import { e1m5 } from '../campaigns/iceDragonTreasure/dungeons/e1m5';
import { testingGrounds } from '../dungeon/testingGrounds';
import {
  runDungeonRenderBenchmark,
  formatRenderingBenchmarkReport,
} from './renderingBenchmark';
import { writeBenchmarkReport } from './benchmark';

describe('Rendering benchmark', () => {
  beforeAll(async () => {
    try {
      await loadTranslations('en');
    } catch {
      // fallback
    }
  });

  it('measures static layer and light frame render passes on fully explored dungeons', () => {
    const results = [
      runDungeonRenderBenchmark('e1m0 (smallest ice dragon map)', e1m0),
      runDungeonRenderBenchmark('e1m5 (largest ice dragon map)', e1m5),
      runDungeonRenderBenchmark('testing grounds', testingGrounds),
    ];

    const report = formatRenderingBenchmarkReport(results);
    // eslint-disable-next-line no-console
    console.log(report);
    writeBenchmarkReport(report);

    results.forEach((result) => {
      expect(result.cells).toBeGreaterThan(0);
      expect(result.staticLayer.meanMs).toBeGreaterThan(0);
      expect(result.staticLayer.callsPerIteration.drawImage).toBeGreaterThan(0);
      expect(result.lightFrameFullView.meanMs).toBeGreaterThan(0);
      expect(result.lightFramePhoneView.meanMs).toBeGreaterThan(0);
      // Culling to a phone-sized viewport never draws more than the
      // full-dungeon pass.
      expect(result.lightFramePhoneView.meanMs).toBeLessThan(
        result.lightFrameFullView.meanMs * 2,
      );
      // Grades stay on the 1..10 scale and are consistent with their
      // inputs: the overall grade is the lower of the two sub-grades.
      expect(result.grade.timeScore).toBeGreaterThanOrEqual(1);
      expect(result.grade.timeScore).toBeLessThanOrEqual(10);
      expect(result.grade.callScore).toBeGreaterThanOrEqual(1);
      expect(result.grade.callScore).toBeLessThanOrEqual(10);
      expect(result.grade.overallScore).toBe(
        Math.min(result.grade.timeScore, result.grade.callScore),
      );
    });
  });
});
