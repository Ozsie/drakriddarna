import type { Dungeon, GameState } from '../types';
import { liveHeroes } from '../hero/HeroLogic';
import { findVisibleMonsters } from '../monsters/MonsterLogic';
import { createExploredState } from './exploredState';
import {
  gameStateStore,
  currentHero,
  liveHeroesStore,
  visibleMonsters,
  actionLogs,
  dungeonStore,
  winConditionsStore,
  isDungeonBeaten,
  isGameOver,
  currentEventStore,
  turnCountStore,
  damageIndicatorsStore,
  debugModeStore,
  musicModeStore,
} from '../store/gameStateStore';

// Measures what the gameStateStore deriveds cost during repeated state
// publication. Every publish wraps the state in a fresh top-level envelope
// (in-place mutation contract), so every subscribed derived re-derives on
// each publication even when nothing changed. The predicates are node-side
// plain JS, so their timings transfer to the browser main thread closely;
// subscriber notification cost is measured through real svelte/store
// subscriptions.

export interface DerivedStoreTiming {
  name: string;
  meanUs: number;
  // Result size for the array/object derivations, characters otherwise.
  length: number | null;
  // Rough allocation signal: positive heap growth per call measured with
  // a GC beforehand when Node exposes gc. Otherwise null.
  heapBytesPerCall: number | null;
}

export interface DerivedStoreBenchmarkResult {
  name: string;
  heroCount: number;
  monsterCount: number;
  timings: DerivedStoreTiming[];
  // One gameStateStore.set() publication, only the module-level
  // subscriber drain attached.
  publishNoDerivedSubscribersUs: number;
  // One publication with every exported derived store subscribed.
  publishAllDerivedSubscribersUs: number;
  // Derived subscriber notifications observed inside one synchronous
  // gameStateStore.set() call; timings are only representative when the
  // derived recomputation and notification happen inside set().
  synchronousSubscribersPerPublish: number;
}

const maybeGc = (): (() => void) | null => {
  const gc = (globalThis as { gc?: () => void }).gc;
  return typeof gc === 'function' ? gc : null;
};

const EXPOSED_DERIVED_STORES = [
  currentHero,
  liveHeroesStore,
  visibleMonsters,
  actionLogs,
  dungeonStore,
  winConditionsStore,
  isDungeonBeaten,
  isGameOver,
  currentEventStore,
  turnCountStore,
  damageIndicatorsStore,
  debugModeStore,
  musicModeStore,
] as const;

// The remaining derived predicates are field reads on the envelope; they
// are measured as one combined workload rather than individually.
const remainingPredicates = (state: GameState): number => {
  let length = 0;
  length += currentHero === undefined ? 0 : 1;
  length += (state.actionLog ?? []).length > 0 ? 1 : 0;
  length += state.dungeon.winConditions.length;
  length += state.dungeon.beaten ? 1 : 0;
  length += state.currentEvent ? 1 : 0;
  length += state.turnCount ?? 0;
  length += (state.damageIndicators ?? []).length;
  length += state.settings?.['debug'] ? 1 : 0;
  length += state.settings?.['music'] !== false ? 1 : 0;
  length += state.dungeon.name.length;
  return length;
};

const measure = (
  name: string,
  iterations: number,
  warmup: number,
  run: (i: number) => number | null,
): DerivedStoreTiming => {
  let length: number | null = null;
  for (let i = 0; i < warmup; i++) length = run(i);
  const gc = maybeGc();
  // Keep the results reachable so the heap delta reflects them.
  const sink: (number | null)[] = new Array<number | null>(iterations);
  gc?.();
  const heapBefore = process.memoryUsage().heapUsed;
  const start = performance.now();
  for (let i = 0; i < iterations; i++) sink[i] = run(i);
  const totalMs = performance.now() - start;
  const heapAfter = process.memoryUsage().heapUsed;
  length = sink[iterations - 1] ?? length;
  return {
    name,
    meanUs: (totalMs * 1000) / iterations,
    length,
    heapBytesPerCall: gc
      ? Math.max(0, heapAfter - heapBefore) / iterations
      : null,
  };
};

const measurePublish = (
  state: GameState,
  iterations: number,
  warmup: number,
  withDerivedSubscribers: boolean,
  subscriberHits: { count: number } | null,
): number => {
  const unsubscribe: Array<() => void> = [];
  if (withDerivedSubscribers) {
    EXPOSED_DERIVED_STORES.forEach((store) => {
      unsubscribe.push(store.subscribe(() => {}));
    });
  }
  try {
    for (let i = 0; i < warmup; i++) gameStateStore.set(state);
    if (subscriberHits) subscriberHits.count = 0;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) gameStateStore.set(state);
    const totalMs = performance.now() - start;
    return (totalMs * 1000) / iterations;
  } finally {
    unsubscribe.forEach((off) => off());
  }
};

export interface DerivedStoreBenchmarkOptions {
  iterations?: number;
  warmupIterations?: number;
  publishIterations?: number;
  publishWarmupIterations?: number;
}

export const runDerivedStoreBenchmark = (
  name: string,
  dungeon: Dungeon,
  options: DerivedStoreBenchmarkOptions = {},
): DerivedStoreBenchmarkResult => {
  const iterations = options.iterations ?? 2000;
  const warmup = options.warmupIterations ?? 200;
  const publishIterations = options.publishIterations ?? 2000;
  const publishWarmup = options.publishWarmupIterations ?? 200;
  const state: GameState = createExploredState(dungeon);

  const timings = [
    measure('liveHeroes (liveHeroesStore)', iterations, warmup, () => {
      const heroes = liveHeroes(state);
      return heroes.length * 1000 + (heroes[0]?.name.length ?? 0);
    }),
    measure('findVisibleMonsters (visibleMonsters)', iterations, warmup, () => {
      const monsters = findVisibleMonsters(state);
      return monsters.length * 1000 + (monsters[0]?.name.length ?? 0);
    }),
    measure('remaining derived predicates combined', iterations, warmup, () =>
      remainingPredicates(state),
    ),
  ];

  const publishNoDerivedSubscribersUs = measurePublish(
    state,
    publishIterations,
    publishWarmup,
    false,
    null,
  );

  // The subscriber-hit counter verifies in the benchmark test that derived
  // subscribers are notified synchronously inside set(), so the publish
  // timing above includes the recomputation and notification work.
  // Subscribing notifies immediately, so the counter is zeroed first.
  const subscriberHits = { count: 0 };
  const unsubHit = liveHeroesStore.subscribe(() => subscriberHits.count++);
  subscriberHits.count = 0;
  gameStateStore.set(state);
  const synchronousHits = subscriberHits.count;
  unsubHit();

  const publishAllDerivedSubscribersUs = measurePublish(
    state,
    publishIterations,
    publishWarmup,
    true,
    null,
  );

  return {
    name,
    heroCount: state.heroes.length,
    monsterCount: state.dungeon.layout.monsters.length,
    timings,
    publishNoDerivedSubscribersUs,
    publishAllDerivedSubscribersUs,
    synchronousSubscribersPerPublish: synchronousHits,
  };
};

export const formatDerivedStoreBenchmarkReport = (
  results: DerivedStoreBenchmarkResult[],
): string => {
  const lines: string[] = [
    'Derived-store recomputation benchmark (Node)',
    'Cost of the gameStateStore deriveds per publication on unchanged',
    'explored state. Publish timings are one gameStateStore.set() call;',
    'heap bytes are shown only when Node exposes gc (--expose-gc).',
    '',
  ];
  results.forEach((result) => {
    lines.push(
      `--- ${result.name} (${result.heroCount} heroes, ${result.monsterCount} monsters) ---`,
    );
    result.timings.forEach((t) => {
      lines.push(
        `${t.name.padEnd(42)} ${t.meanUs.toFixed(2).padStart(8)} us` +
          `  len ${String(t.length ?? '-').padStart(6)}` +
          `${
            t.heapBytesPerCall === null
              ? ''
              : `  ~${Math.round(t.heapBytesPerCall)} B/call`
          }`,
      );
    });
    lines.push(
      `publish, module subscriber only: ${result.publishNoDerivedSubscribersUs.toFixed(2)} us`,
    );
    lines.push(
      `publish, all deriveds subscribed: ${result.publishAllDerivedSubscribersUs.toFixed(2)} us`,
    );
    lines.push(
      `derived notifications inside set(): ${result.synchronousSubscribersPerPublish}`,
    );
    lines.push('');
  });
  return lines.join('\n');
};
