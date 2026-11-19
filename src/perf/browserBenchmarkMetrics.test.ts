import { describe, expect, it } from 'vitest';
import {
  compareMetricBudgets,
  percentile,
  summarizeFrameIntervals,
  summarizeTraceEvents,
} from './browserBenchmarkMetrics';

describe('browser benchmark metrics', () => {
  it('calculates interpolated percentiles and long-frame counts', () => {
    expect(percentile([40, 10, 30, 20], 0.5)).toBe(25);
    expect(summarizeFrameIntervals([16, 20, 55])).toEqual({
      samples: 3,
      p50Ms: 20,
      p95Ms: 51.5,
      p99Ms: 54.3,
      maxMs: 55,
      longFrames: 1,
    });
    expect(summarizeFrameIntervals([]).samples).toBe(0);
  });

  it('summarizes paint, raster, decode, GPU, and reclaimed GC bytes', () => {
    expect(
      summarizeTraceEvents([
        { name: 'RasterTask', dur: 1500 },
        { name: 'Paint', dur: 500 },
        { name: 'Blink.Paint.UpdateTime', dur: 250 },
        { name: 'CompositeLayers', dur: 250 },
        { name: 'LayerTreeHostImpl::CalculateRenderPasses', dur: 500 },
        { name: 'ImageDecodeTask', dur: 750 },
        { name: 'GPUTask', dur: 1000 },
        {
          name: 'MinorGC',
          dur: 300,
          args: { data: { usedHeapSizeBefore: 1000, usedHeapSizeAfter: 600 } },
        },
        { name: 'V8.GC_SCAVENGER', dur: 300 },
        { name: 'MajorGC', dur: 700, args: { data: { bytesReclaimed: 900 } } },
      ]),
    ).toEqual({
      eventCounts: {
        RasterTask: 1,
        Paint: 1,
        'Blink.Paint.UpdateTime': 1,
        CompositeLayers: 1,
        'LayerTreeHostImpl::CalculateRenderPasses': 1,
        ImageDecodeTask: 1,
        GPUTask: 1,
        MinorGC: 1,
        'V8.GC_SCAVENGER': 1,
        MajorGC: 1,
      },
      rasterTaskMs: 1.5,
      paintMs: 0.5,
      blinkPaintMs: 0.25,
      compositeLayersMs: 0.75,
      imageDecodeMs: 0.75,
      gpuTaskMs: 1,
      minorGcCount: 1,
      majorGcCount: 1,
      gcDurationMs: 1,
      reclaimedBytes: 1300,
    });
  });

  it('reports only measured values above their regression budgets', () => {
    expect(
      compareMetricBudgets(
        { 'idle.p95Ms': 18, 'pan.p95Ms': 40 },
        { 'idle.p95Ms': 17, 'pan.p95Ms': 40, 'missing.maxMs': 10 },
      ),
    ).toEqual([{ metric: 'idle.p95Ms', actual: 18, budget: 17 }]);
  });
});
