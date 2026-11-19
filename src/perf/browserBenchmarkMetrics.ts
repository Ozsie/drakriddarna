export interface FrameTimeSummary {
  samples: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  longFrames: number;
}

export interface BrowserTraceEvent {
  name: string;
  dur?: number;
  args?: {
    data?: Record<string, unknown>;
  };
}

export interface TraceSummary {
  eventCounts: Record<string, number>;
  rasterTaskMs: number;
  paintMs: number;
  blinkPaintMs: number;
  compositeLayersMs: number;
  imageDecodeMs: number;
  gpuTaskMs: number;
  minorGcCount: number;
  majorGcCount: number;
  gcDurationMs: number;
  reclaimedBytes: number;
}

export interface BudgetRegression {
  metric: string;
  actual: number;
  budget: number;
}

export const percentile = (values: number[], percentage: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (sorted.length - 1) * Math.max(0, Math.min(1, percentage));
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  const fraction = rank - lower;
  return sorted[lower] + (sorted[upper] - sorted[lower]) * fraction;
};

export const summarizeFrameIntervals = (
  intervalsMs: number[],
): FrameTimeSummary => ({
  samples: intervalsMs.length,
  p50Ms: percentile(intervalsMs, 0.5),
  p95Ms: percentile(intervalsMs, 0.95),
  p99Ms: percentile(intervalsMs, 0.99),
  maxMs: intervalsMs.length > 0 ? Math.max(...intervalsMs) : 0,
  longFrames: intervalsMs.filter((interval) => interval > 50).length,
});

const eventDurationMs = (event: BrowserTraceEvent): number =>
  typeof event.dur === 'number' ? event.dur / 1000 : 0;

const numberFrom = (
  data: Record<string, unknown>,
  key: string,
): number | undefined => {
  const value = data[key];
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
};

export const summarizeTraceEvents = (
  events: BrowserTraceEvent[],
): TraceSummary => {
  const summary: TraceSummary = {
    eventCounts: {},
    rasterTaskMs: 0,
    paintMs: 0,
    blinkPaintMs: 0,
    compositeLayersMs: 0,
    imageDecodeMs: 0,
    gpuTaskMs: 0,
    minorGcCount: 0,
    majorGcCount: 0,
    gcDurationMs: 0,
    reclaimedBytes: 0,
  };

  events.forEach((event) => {
    summary.eventCounts[event.name] =
      (summary.eventCounts[event.name] ?? 0) + 1;
    const durationMs = eventDurationMs(event);
    if (event.name === 'RasterTask') summary.rasterTaskMs += durationMs;
    if (event.name === 'Paint') summary.paintMs += durationMs;
    if (event.name === 'Blink.Paint.UpdateTime') {
      summary.blinkPaintMs += durationMs;
    }
    if (
      event.name === 'CompositeLayers' ||
      event.name === 'LayerTreeHostImpl::CalculateRenderPasses'
    ) {
      summary.compositeLayersMs += durationMs;
    }
    if (event.name === 'Decode Image' || event.name === 'ImageDecodeTask') {
      summary.imageDecodeMs += durationMs;
    }
    if (event.name === 'GPUTask') summary.gpuTaskMs += durationMs;

    const isMinorGc = event.name === 'MinorGC';
    const isMajorGc = event.name === 'MajorGC';
    if (isMinorGc || isMajorGc) {
      if (isMinorGc) summary.minorGcCount++;
      if (isMajorGc) summary.majorGcCount++;
      summary.gcDurationMs += durationMs;

      const data = event.args?.data;
      if (data) {
        const before = numberFrom(data, 'usedHeapSizeBefore');
        const after = numberFrom(data, 'usedHeapSizeAfter');
        const reclaimed = numberFrom(data, 'bytesReclaimed');
        summary.reclaimedBytes +=
          reclaimed ??
          (before !== undefined && after !== undefined
            ? Math.max(0, before - after)
            : 0);
      }
    }
  });

  return summary;
};

export const compareMetricBudgets = (
  metrics: Record<string, number>,
  budgets: Record<string, number>,
): BudgetRegression[] =>
  Object.entries(budgets).flatMap(([metric, budget]) => {
    const actual = metrics[metric];
    return typeof actual === 'number' && actual > budget
      ? [{ metric, actual, budget }]
      : [];
  });
