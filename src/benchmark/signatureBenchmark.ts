import type { Dungeon, GameState } from '../types';
import {
  getAnimatedLightSpriteSignature,
  getDynamicSignature,
  getIsometricLightMaskSignature,
  getItemAuraSignature,
  getOverlaySignature,
  getPortalAuraSignature,
  getStaticSignature,
} from '../components/DungeonBoardSignatures';
import { createIsometricCameraView } from '../camera/IsometricCamera';
import {
  activeLights,
  animatedLightsSignature,
} from '../dungeon/LightRendering';
import { createExploredState } from './exploredState';

// Measures what the Dungeon board's layer signatures cost on frames where
// nothing changed: the controller rebuilds them on every layer render
// request (and every animated dynamic frame) only to compare them with
// the previous string. Node timings exclude the browser, but the string
// work is plain JS, so they transfer to the main thread closely.

export interface SignatureTiming {
  name: string;
  meanUs: number;
  length: number;
  // Rough allocation signal: positive heap growth per call measured with
  // a GC beforehand when `global.gc` is exposed. Without it the value
  // includes collection noise and is reported as `null`.
  heapBytesPerCall: number | null;
}

export interface SignatureBenchmarkResult {
  name: string;
  timings: SignatureTiming[];
  // Signatures the controller computes on one unchanged dynamic frame.
  topDownFrameUs: number;
  isometricFrameUs: number;
}

const maybeGc = (): (() => void) | null => {
  const gc = (globalThis as { gc?: () => void }).gc;
  return typeof gc === 'function' ? gc : null;
};

const measure = (
  name: string,
  iterations: number,
  warmup: number,
  run: (i: number) => string,
): SignatureTiming => {
  let length = 0;
  for (let i = 0; i < warmup; i++) length = run(i).length;
  const gc = maybeGc();
  // Keep the results reachable so the heap delta reflects them.
  const sink: string[] = new Array<string>(iterations);
  gc?.();
  const heapBefore = process.memoryUsage().heapUsed;
  const start = performance.now();
  for (let i = 0; i < iterations; i++) sink[i] = run(i);
  const totalMs = performance.now() - start;
  const heapAfter = process.memoryUsage().heapUsed;
  length = sink[iterations - 1]?.length ?? length;
  return {
    name,
    meanUs: (totalMs * 1000) / iterations,
    length,
    heapBytesPerCall: gc
      ? Math.max(0, heapAfter - heapBefore) / iterations
      : null,
  };
};

export interface SignatureBenchmarkOptions {
  cellSize?: number;
  iterations?: number;
  warmupIterations?: number;
}

export const runSignatureBenchmark = (
  name: string,
  dungeon: Dungeon,
  options: SignatureBenchmarkOptions = {},
): SignatureBenchmarkResult => {
  const cellSize = options.cellSize ?? 48;
  const iterations = options.iterations ?? 2000;
  const warmup = options.warmupIterations ?? 200;
  const state: GameState = createExploredState(dungeon);
  const time = (i: number) => i * 16.7;
  const frameLights = activeLights(state, 0);
  const lightSig = animatedLightsSignature(
    state,
    false,
    0,
    undefined,
    frameLights,
  );
  const isometricView = createIsometricCameraView({
    width: 1440,
    height: 960,
    center: { x: 720, y: 480 },
    cellSize,
    panX: 0,
    panY: 0,
    zoom: 1,
  });

  const timings = [
    measure('static', iterations, warmup, () =>
      getStaticSignature(state, false, cellSize),
    ),
    measure('dynamic (top-down)', iterations, warmup, () =>
      getDynamicSignature(state, false, cellSize),
    ),
    measure('dynamic (isometric, embeds static)', iterations, warmup, () =>
      getDynamicSignature(
        state,
        false,
        cellSize,
        getStaticSignature(state, false, cellSize),
      ),
    ),
    measure('isometric light-mask key', iterations, warmup, () =>
      getIsometricLightMaskSignature(
        state,
        false,
        lightSig,
        frameLights,
        isometricView,
        1,
        [1440, 960],
        [1440, 960],
      ),
    ),
    measure('overlay', iterations, warmup, () =>
      getOverlaySignature(state, false, cellSize),
    ),
    measure('animated light sprites', iterations, warmup, (i) =>
      getAnimatedLightSpriteSignature(state, false, time(i)),
    ),
    measure('item auras', iterations, warmup, (i) =>
      getItemAuraSignature(state, time(i)),
    ),
    measure('portal aura', iterations, warmup, (i) =>
      getPortalAuraSignature(state.dungeon, time(i)),
    ),
  ];
  const byName = (n: string) => timings.find((t) => t.name === n)?.meanUs ?? 0;
  const ambient =
    byName('animated light sprites') +
    byName('item auras') +
    byName('portal aura');
  return {
    name,
    timings,
    topDownFrameUs: byName('dynamic (top-down)') + ambient,
    isometricFrameUs:
      byName('dynamic (isometric, embeds static)') +
      byName('isometric light-mask key') +
      ambient,
  };
};

export const formatSignatureBenchmarkReport = (
  results: SignatureBenchmarkResult[],
): string => {
  const lines: string[] = [
    'Signature benchmark (Node)',
    'Cost of rebuilding the Dungeon board layer signatures on unchanged',
    'state, i.e. the work every skipped repaint still pays. Heap bytes are',
    'shown only when Node exposes gc (--expose-gc).',
    '',
  ];
  results.forEach((result) => {
    lines.push(`--- ${result.name} ---`);
    result.timings.forEach((t) => {
      lines.push(
        `${t.name.padEnd(36)} ${t.meanUs.toFixed(2).padStart(8)} us  ${String(
          t.length,
        ).padStart(6)} chars${
          t.heapBytesPerCall === null
            ? ''
            : `  ~${Math.round(t.heapBytesPerCall)} B/call`
        }`,
      );
    });
    lines.push(
      `unchanged dynamic frame: top-down ${result.topDownFrameUs.toFixed(
        2,
      )} us, isometric ${result.isometricFrameUs.toFixed(2)} us`,
    );
    lines.push('');
  });
  return lines.join('\n');
};
