# Browser rendering performance baseline

This baseline measures the browser work that the no-op canvas benchmark cannot
observe. It was established before changing render invalidation or derived-store
caching; it records current behavior and does not apply either optimization.
The existing JavaScript/draw-call benchmark in
`src/benchmark/renderingBenchmark.ts` remains useful and complementary.

## Run

The driver uses Node's built-in WebSocket and TypeScript type stripping; Node
22.19 was used for the recorded run. It builds the static site, starts
`vite preview` at `/drakriddarna/`, launches Chrome/Chromium with a temporary
profile, and drives the page over Chrome DevTools Protocol. Set `CHROME_PATH`
when the browser executable is not at a detected default path.

```bash
npm run benchmark:browser -- --out /tmp/drakriddarna-browser
```

The output path is a prefix: the driver writes `<prefix>.json` and `<prefix>.txt`.
To compare a full run with the checked-in budgets:

```bash
npm run benchmark:browser -- \
  --out /tmp/drakriddarna-browser \
  --baseline docs/browser-performance-baseline.json
```

The process exits non-zero when a metric exceeds a budget or a baseline
scenario/iteration is missing. To deliberately replace the recorded baseline,
add `--record-baseline docs/browser-performance-baseline.json`; this writes
measured values, environment metadata, and the derived budgets. Do that only
after reviewing the conditions and results. `BENCHMARK_REPORT_FILE` can also
append the text report and write a JSON companion, following the other
benchmark scripts. `--headed` runs a visible browser; use it for observation,
not direct comparison with the headless baseline. `--url URL` can target an
already-running production preview whose base path is `/drakriddarna/`.

For a quick driver smoke test, restrict the matrix with `--dprs 1
--projections topDown --dungeons e1m5`, lower `--idle-ms` and
`--interaction-ms`, and reduce `--churn`. Such a subset is not comparable to
the full baseline. The full default matrix is both scenes (`e1m5` and Testing
Grounds) × both projections × DPR 1, 2, and 3.

The app's browser harness is dynamically imported only when
`localStorage.perfHarness` is exactly `1`; the driver sets that opt-in in its
isolated browser profile. It loads existing authored dungeons with fixed seeds
(`42` for `e1m5`, `314159` for Testing Grounds), fully reveals their existing
content, sets `turnCount` to keep the introduction hidden, and disables music
and sound effects. It adds no game content or player-facing strings. Each case
records a cold-cache page load and a warm reload, samples idle animation, then
dispatches the same right-button drag and wheel-zoom sequence.

## Measurements

- Frame intervals are sampled with `requestAnimationFrame` and summarized as
  p50, p95, p99, maximum, sample count, and frames longer than 50 ms.
- Chrome trace durations include raster tasks, `Paint`, Blink paint updates,
  composite/render-pass work, GPU tasks, and image decoding. The JSON also
  keeps event-name counts, plus minor/major GC counts, GC duration, and any
  reclaimed-byte information present in trace arguments. Trace durations are
  event totals and can overlap; a zero value means that event or data was not
  reported for that phase, not that the work is universally free.
- Cold and warm load-to-board-ready time includes application boot, state
  construction, and two render frames. Cold passes clear the browser cache and
  bypass it on navigation; warm passes reload without clearing it. Image decode
  totals come from the corresponding Chrome traces.
- Dungeon churn alternates 10 times between the two existing scenes, forces
  garbage collection after each load, and records post-GC JS heap, DOM-node
  count, and browser-enumerated listeners on `window` and the document subtree.
  It also records the positive net heap change from before load to before GC
  (`allocationBytes`) and the measured pre/post-GC heap reduction
  (`reclaimedBytes`). A negative net change is reported as zero allocation
  delta because it can include an automatic collection. These heap deltas are
  not a complete allocation profile;
  GC trace counts and duration provide a separate allocation-pressure signal.

## Recorded baseline

The detailed values and per-scenario budgets are in
[`browser-performance-baseline.json`](./browser-performance-baseline.json).
The run was recorded at `2026-11-19T20:08:22.822Z` on Chrome `157.0.8103.79`,
headless, on macOS `darwin 25.6.0` (`arm64`), Apple M3 Pro, 12 logical CPUs,
with a `1440 × 960` viewport. Chrome reported ANGLE Metal on the Apple M3 Pro
with the Graphite/Dawn Metal backend and GPU compositing enabled. This is a
headless, hardware-accelerated baseline, not the software-GL condition that
some headless environments use. The baseline records base commit `559ebb9e`
and `workingTreeDirty: true` because the benchmark changes were not committed
yet.

The browser board measured `1426 × 946` CSS pixels; backing canvases were
`1426 × 946`, `2852 × 1892`, and `4278 × 2838` at DPR 1, 2, and 3. Across the
12 cases, idle frame p95 was `16.70–16.80 ms` and p99 was `16.80 ms`; pan p95
was `16.70–16.80 ms` and p99 ranged up to `33.40 ms`; zoom p95 was
`16.70–16.80 ms` and p99 ranged up to `17.79 ms`. The largest observed pan and
zoom intervals were `33.40 ms` and `33.30 ms`, respectively, in isolated
isometric samples. Do not interpret these single-sample outliers as a change in
the frame-rate target.

Cold load-to-ready ranged from `236–748 ms` and warm reload from
`261–615 ms`. Trace totals ranged from `1.03–5.54 ms` for raster tasks,
`0.60–1.52 ms` for `Paint`, and `2.54–7.65 ms` for compositing/render-pass
events. These totals cover both load passes and the three sampled phases; they
are not per-frame costs. Warm decode varied with the image set used by each
case and should be compared by scenario, not collapsed into a single average.

After the 10 forced-GC scene changes, post-GC heap ranged from `6.19–6.51 MB`,
with `43` DOM nodes and `31` enumerated event listeners at every sample. Net
heap growth during a load ranged from `0.76–3.79 MB`; measured heap reduction
after forced GC ranged from `0.72–16.31 MB`. The stable DOM/listener counts are
the useful lifecycle checks here; heap deltas vary with cache and collection
timing.

## Regression budgets and interpretation

The JSON baseline stores the measured metrics and a screening budget for each
scenario and churn iteration. To account for the observed variability, the
budgets use different margins: load-to-ready is `150%` of the measurement plus
`100 ms`; image decode is `150%` plus `5 ms`; other duration totals and frame
percentiles are `125%` plus `2 ms`; byte metrics are `125%` plus `256 KiB`; and
counts are `125%` plus `1`. Values are rounded to two decimal places. This
deliberately leaves headroom for a single local baseline run and should not be
treated as a cross-device service-level target. Compare only runs with the same
browser mode, viewport, projection, DPR, scene, seed, and broadly similar
graphics backend. Re-record budgets only after a deliberate baseline review;
do not update them merely to silence a regression.

Use the results with the existing lighting and pan follow-ups in
[`TODO.md`](../TODO.md#performance-improvements). They establish reference
measurements, not a second list of rendering optimizations. In particular,
profile signature construction and derived-store recomputation against these
conditions before changing invalidation or caching behavior.
