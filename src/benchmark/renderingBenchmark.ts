import type { Dungeon, GameState, Hero } from '../types';
import { toArray } from '../core';
import { createSeededRng, resetRng, setRng } from '../core';
import { init } from '../game';
import { resetLiveHeroes } from '../hero/HeroLogic';
import { renderItems } from '../items/ItemRendering';
import {
  renderGrid,
  renderTerrain,
  renderSecrets,
  renderInteractables,
  renderWalls,
  renderDoors,
  renderPillars,
  renderPortal,
} from '../dungeon/DungeonRendering';
import {
  activeLights,
  renderStaticLights,
  renderAnimatedLights,
  type LightViewport,
} from '../dungeon/LightRendering';
import { DEFAULT_CAMPAIGN_ID } from '../campaigns';
import { DEFAULT_GAME_MASTER_ID } from '../gameMasters';

// A no-op 2D context that counts every method call by name. The render
// functions run their full JS pass — path building, gradients, per-cell
// logic — but nothing is rasterized, so the benchmark measures the JS
// side of a repaint plus the canvas call volume. In this Node
// environment there is no DOM, so sprite baking and tile textures fall
// back to their direct paths: light timings here are an upper bound
// relative to the browser, and the call counts are the stable metric
// to compare across code changes.
export const createCountingCtx = (): {
  ctx: CanvasRenderingContext2D;
  counts: Record<string, number>;
} => {
  const counts: Record<string, number> = {};
  const store: Record<string, unknown> = {};
  const gradient = { addColorStop: () => undefined };
  const ctx = new Proxy(store, {
    get(target, prop) {
      if (typeof prop !== 'string') return undefined;
      if (prop in target) return target[prop];
      switch (prop) {
        case 'measureText':
          counts[prop] = (counts[prop] ?? 0) + 1;
          return () => ({ width: 0 });
        case 'createRadialGradient':
        case 'createLinearGradient':
          return () => {
            counts[prop] = (counts[prop] ?? 0) + 1;
            return gradient;
          };
        default:
          return () => {
            counts[prop] = (counts[prop] ?? 0) + 1;
          };
      }
    },
    set(target, prop, value) {
      if (typeof prop === 'string') target[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, counts };
};

// A minimal stand-in for the loaded tileset / actor sheet images: the
// render code only needs the image-like fields, and the mock context
// accepts it as a drawImage source.
const fakeImage = (): CanvasImageSource =>
  ({
    complete: true,
    naturalWidth: 512,
    naturalHeight: 512,
  }) as unknown as CanvasImageSource;

// A GameState for `dungeon` with everything explored: every room letter
// in the grid revealed, every secret and note found. Heroes are placed
// at their starting positions (matching what the benchmark game runner
// does when overriding a dungeon).
export const createExploredState = (dungeon: Dungeon): GameState => {
  setRng(createSeededRng(42));
  try {
    const state = init(DEFAULT_CAMPAIGN_ID, DEFAULT_GAME_MASTER_ID);
    state.dungeon = structuredClone(dungeon);
    resetLiveHeroes(state);
    state.currentActor = state.heroes[0] as Hero | undefined;

    const rooms = new Set<string>();
    state.dungeon.layout.grid.forEach((row) => {
      toArray(row).forEach((cell) => {
        if (cell) rooms.add(cell);
      });
    });
    state.dungeon.discoveredRooms = [...rooms];
    state.dungeon.layout.secrets?.forEach((secret) => {
      secret.found = true;
    });
    state.dungeon.layout.notes?.forEach((note) => {
      note.found = true;
    });
    return state;
  } finally {
    resetRng();
  }
};

// The exact draw sequence of the controller's `renderStaticLayer`, minus
// the canvas housekeeping: this is the per-repaint cost of the cached
// static world layer.
const renderStaticScene = (
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  cellSize: number,
  state: GameState,
): void => {
  const debugMode = false;
  renderGrid(ctx, ground, cellSize, state, debugMode);
  renderTerrain(ctx, cellSize, state, debugMode);
  renderSecrets(ctx, ground, cellSize, state, debugMode);
  renderItems(ctx, ground, cellSize, state, debugMode);
  renderInteractables(ctx, ground, cellSize, state, debugMode);
  renderWalls(ctx, cellSize, state, debugMode);
  renderDoors(ctx, ground, cellSize, state, debugMode);
  renderPillars(ctx, ground, cellSize, state, debugMode);
  renderPortal(ctx, cellSize, state, debugMode);
};

// The per-frame light mask work: the (caller-cached) static light layer
// recompose plus the animated lights, over the given viewport.
const renderLightFrame = (
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  state: GameState,
  viewport: LightViewport,
  timeMs: number,
): void => {
  const debugMode = false;
  const frameLights = activeLights(state);
  renderStaticLights(ctx, cellSize, state, debugMode, viewport, frameLights);
  renderAnimatedLights(
    ctx,
    cellSize,
    state,
    debugMode,
    timeMs,
    viewport,
    frameLights,
  );
};

interface TimingResult {
  meanMs: number;
  iterations: number;
  callsPerIteration: Record<string, number>;
}

const timeIterations = (
  iterations: number,
  warmup: number,
  run: (ctx: CanvasRenderingContext2D, iteration: number) => void,
): TimingResult => {
  {
    const { ctx } = createCountingCtx();
    for (let i = 0; i < warmup; i++) run(ctx, i);
  }
  const { ctx, counts } = createCountingCtx();
  const start = performance.now();
  for (let i = 0; i < iterations; i++) run(ctx, i);
  const totalMs = performance.now() - start;
  const callsPerIteration: Record<string, number> = {};
  Object.entries(counts).forEach(([name, count]) => {
    callsPerIteration[name] = count / iterations;
  });
  return { meanMs: totalMs / iterations, iterations, callsPerIteration };
};

export interface DungeonRenderBenchmarkResult {
  name: string;
  gridCols: number;
  gridRows: number;
  cells: number;
  activeLights: number;
  staticLayer: TimingResult;
  lightFrameFullView: TimingResult;
  lightFramePhoneView: TimingResult;
  grade: DungeonRenderGrade;
}

// --- Grading ---------------------------------------------------------------

// A 60 Hz frame is 16.7 ms, and render JS that leaves room for the
// browser's rasterization should sit near a tenth of that. The time
// anchors score 10 at a tenth of the budget and 1 at the full budget.
// The mock context undercharges per canvas call, though, so Node time
// is optimistic; the call-volume anchors compensate, being set where
// the per-call cost (~2-3 us each) lands at the same fractions: 500
// calls per frame scores 10, 5000 scores 1. The overall grade is the
// lower of the two — the worst aspect defines the grade.
const FRAME_BUDGET_MS = 1000 / 60;
const TIME_SCORE_TEN_MS = FRAME_BUDGET_MS / 10;
const TIME_SCORE_ONE_MS = FRAME_BUDGET_MS;
const CALLS_SCORE_TEN = 500;
const CALLS_SCORE_ONE = 5000;

export interface DungeonRenderGrade {
  // Estimated per-pan-frame JS work: the static repaint plus a
  // viewport-sized light frame, both of which happen in a pan frame.
  panFrameJsMs: number;
  // Total canvas calls for the same estimate.
  panFrameCalls: number;
  // 1..10, linear from the anchors above.
  timeScore: number;
  callScore: number;
  overallScore: number;
}

const scoreFromAnchors = (
  value: number,
  score10: number,
  score1: number,
): number => {
  const raw = 1 + (9 * (score1 - value)) / (score1 - score10);
  return Math.round(Math.min(10, Math.max(1, raw)) * 10) / 10;
};

const totalCalls = (timing: TimingResult): number =>
  Object.values(timing.callsPerIteration).reduce(
    (sum, count) => sum + count,
    0,
  );

const gradeDungeon = (
  result: Omit<DungeonRenderBenchmarkResult, 'grade'>,
): DungeonRenderGrade => {
  const panFrameJsMs =
    result.staticLayer.meanMs + result.lightFramePhoneView.meanMs;
  const panFrameCalls =
    totalCalls(result.staticLayer) + totalCalls(result.lightFramePhoneView);
  const timeScore = scoreFromAnchors(
    panFrameJsMs,
    TIME_SCORE_TEN_MS,
    TIME_SCORE_ONE_MS,
  );
  const callScore = scoreFromAnchors(
    panFrameCalls,
    CALLS_SCORE_TEN,
    CALLS_SCORE_ONE,
  );
  return {
    panFrameJsMs,
    panFrameCalls,
    timeScore,
    callScore,
    overallScore: Math.min(timeScore, callScore),
  };
};

export interface RenderingBenchmarkOptions {
  cellSize?: number;
  staticIterations?: number;
  lightIterations?: number;
  warmupIterations?: number;
}

// Benchmarks the render passes of one fully explored dungeon:
// - the static world layer repaint (what a pan frame or state change
//   forces today), and
// - one light frame over the whole dungeon and over a phone-sized
//   viewport, to show what viewport culling buys.
export const runDungeonRenderBenchmark = (
  name: string,
  dungeon: Dungeon,
  options: RenderingBenchmarkOptions = {},
): DungeonRenderBenchmarkResult => {
  const cellSize = options.cellSize ?? 48;
  const staticIterations = options.staticIterations ?? 500;
  const lightIterations = options.lightIterations ?? 500;
  const warmup = options.warmupIterations ?? 100;

  const state = createExploredState(dungeon);
  const ground = fakeImage();
  const gridRows = state.dungeon.layout.grid.length;
  const gridCols = Math.max(
    ...state.dungeon.layout.grid.map((row) => row.length),
  );

  const staticLayer = timeIterations(staticIterations, warmup, (ctx) =>
    renderStaticScene(ctx, ground, cellSize, state),
  );

  const fullView: LightViewport = {
    x: 0,
    y: 0,
    width: gridCols,
    height: gridRows,
  };
  const lightFrameFullView = timeIterations(lightIterations, warmup, (ctx, i) =>
    renderLightFrame(ctx, cellSize, state, fullView, i * 16.7),
  );

  // A phone-sized view in the middle of the map: what a small screen
  // actually asks the light pass to draw.
  const phoneView: LightViewport = {
    x: Math.max(0, Math.floor(gridCols / 2 - 4)),
    y: Math.max(0, Math.floor(gridRows / 2 - 7)),
    width: 8,
    height: 14,
  };
  const lightFramePhoneView = timeIterations(
    lightIterations,
    warmup,
    (ctx, i) => renderLightFrame(ctx, cellSize, state, phoneView, i * 16.7),
  );

  const partial = {
    name,
    gridCols,
    gridRows,
    cells: gridCols * gridRows,
    activeLights: activeLights(state).length,
    staticLayer,
    lightFrameFullView,
    lightFramePhoneView,
  };
  return { ...partial, grade: gradeDungeon(partial) };
};

const formatCalls = (calls: Record<string, number>): string => {
  const total = Object.values(calls).reduce((sum, n) => sum + n, 0);
  const interesting = [
    'drawImage',
    'fill',
    'stroke',
    'fillRect',
    'clearRect',
    'createRadialGradient',
    'createLinearGradient',
    'fillText',
  ]
    .filter((name) => calls[name])
    .map((name) => `${name}=${Math.round(calls[name])}`)
    .join(' ');
  return `total=${Math.round(total)}${interesting ? ` (${interesting})` : ''}`;
};

export const formatRenderingBenchmarkReport = (
  results: DungeonRenderBenchmarkResult[],
): string => {
  const lines: string[] = [
    'Rendering benchmark (Node, no DOM)',
    'JS-side render pass against a no-op canvas: absolute times are not',
    'browser paint times; canvas call volumes are the comparable metric',
    'across code changes. Lights run the direct path (sprite baking needs',
    'a DOM), so light timings are an upper bound vs. the browser.',
    '',
    'Grade 1-10 per dungeon, from an estimated pan frame (static repaint',
    '+ viewport-sized light frame): time scores 10 at <=1.7 ms and 1 at',
    '>=16.7 ms (a 60 Hz frame budget and a tenth of it); canvas calls',
    'score 10 at <=500 and 1 at >=5000. The overall grade is the lower',
    'of the two — the worst aspect defines the grade.',
    '',
  ];
  results.forEach((result) => {
    lines.push(
      `--- ${result.name}: ${result.gridCols}x${result.gridRows} = ${result.cells} cells, ${result.activeLights} active lights ---`,
    );
    lines.push(
      `grade: ${result.grade.overallScore.toFixed(
        1,
      )}/10  (time ${result.grade.timeScore.toFixed(
        1,
      )}, calls ${result.grade.callScore.toFixed(1)})`,
    );
    lines.push(
      `  estimated pan frame: ${result.grade.panFrameJsMs.toFixed(
        3,
      )} ms JS, ${Math.round(result.grade.panFrameCalls)} canvas calls`,
    );
    lines.push(
      `static layer repaint : mean ${result.staticLayer.meanMs.toFixed(
        3,
      )} ms (${result.staticLayer.iterations} runs) | calls ${formatCalls(
        result.staticLayer.callsPerIteration,
      )}`,
    );
    lines.push(
      `light frame, full view: mean ${result.lightFrameFullView.meanMs.toFixed(
        3,
      )} ms (${
        result.lightFrameFullView.iterations
      } runs) | calls ${formatCalls(
        result.lightFrameFullView.callsPerIteration,
      )}`,
    );
    lines.push(
      `light frame, phone view (${
        result.lightFramePhoneView.iterations
      } runs): mean ${result.lightFramePhoneView.meanMs.toFixed(
        3,
      )} ms | calls ${formatCalls(
        result.lightFramePhoneView.callsPerIteration,
      )}`,
    );
    lines.push('');
  });
  return lines.join('\n');
};
