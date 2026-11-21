# Architecture, performance and implementation todo

Complementary to [TODO.md](TODO.md). This checklist records the project review and the follow-up review of candidates for existing HOARD packages. It does not replace the feature backlog or its existing performance tasks.

All items are proposals, not completed work. Performance concerns are hypotheses until measured; the review did not run tests or benchmarks. Revalidate each finding against the current implementation before changing it.

## Priorities and sequencing

- [x] Start with deployment inputs, Svelte lint coverage and documentation accuracy.
- [x] Define and test asynchronous action locking before changing turn orchestration or state restoration.
- [x] Extract the gesture modules into `input`, then add policy-free zoom support to `camera`.
- [x] Split board-controller responsibilities and browser effects out of game logic incrementally.
- [x] Establish browser performance baselines before changing invalidation or derived-store caching.
- [x] Extract generic isometric helpers into `scene` with parity coverage; evaluate aura rendering and the frame-rate governor separately.

## Delivery and tooling

### Deployment coverage — high priority

- [x] Review `.github/workflows/deploy.yaml` path filters: automatic deployment currently covers `src/**`, but must also cover production assets, dependency manifests/lockfiles and relevant build configuration.
- [x] Enumerate actual deployment inputs and include the workflow itself where appropriate; avoid triggering production deployment for unrelated documentation changes.
- [x] Verify asset-only, dependency-only and build-configuration-only changes are covered by the resulting trigger policy.

### Component lint coverage — high priority

- [x] Extend `eslint.config.js` so `.svelte` scripts receive the applicable recommended TypeScript and Svelte rule sets, not just parser configuration.
- [x] Confirm lint file selection includes Svelte components, including `src/routes/editor/+page.svelte`.
- [x] Resolve newly exposed violations without disabling or weakening rules to make the check pass.
- [x] Align supported CI action and runtime versions across `.github/workflows/pr.yaml` and `.github/workflows/deploy.yaml`.
- [x] Verify linting catches representative script errors in both `.ts` and `.svelte` files.

## State lifecycle and game logic

### Action execution and turn locking — high priority

Relevant file: `src/store/gameStateStore.ts`.

- [x] Inventory every store action and explicitly classify whether it may run during an asynchronous turn; distinguish settings and visual cleanup from gameplay mutations.
- [x] Decide whether reset, restart, win and other lifecycle actions are blocked, serialized or cancel the current operation.
- [x] Centralize state lookup, guarded mutation and publication while preserving each action's intentional behavior.
- [x] Centralize asynchronous lock acquisition and release, including exception paths; use one authoritative lock state rather than independent flags that can drift.
- [x] Review both branches of `endHeroAction` before changing their locking behavior.
- [x] Prevent an old asynchronous operation from publishing stale state or invoking callbacks after a lifecycle transition.
- [x] Add regression tests for reset and other gameplay actions attempted during awaited monster actions, permitted settings changes, duplicate turn requests and lock release after errors.

Lifecycle cancellation invalidates the turn's lock and drops later store publications and callbacks, but it does not abort an already-running game operation or rewind consumed RNG. `winLevel` and `goToTestingGrounds` retain the same state object, so the cancelled operation may finish mutating that object in the background; game logic currently has no abort hook.

### Persistence and restoration boundaries — high priority

Relevant files: `src/game.ts`, `src/saves/SavesLogic.ts`, `src/store/gameStateStore.ts`.

- [x] Move direct autosave/checkpoint storage access behind a game-side persistence adapter and centralize storage keys.
- [x] Keep the dungeon-start checkpoint and reload guard distinct unless their intended semantics explicitly justify unification.
- [x] Share appropriate campaign fallback, seeded-random-state restoration and timer restoration steps between loading and resetting.
- [x] Preserve the differences between loading saved progress, restarting a dungeon and restarting after a party wipe, including reset failure behavior.
- [x] Test absent/malformed checkpoints, unavailable storage, missing campaigns and restoration of random state and timer behavior.
- [x] Reuse `@hoard-engine/saves` storage/slot mechanisms first; propose a package addition only if a genuinely reusable operation is missing.
- [x] Keep campaign fallback, checkpoint timing, timer restoration and game random-state policy in the game.

### Browser effects outside game logic — high priority

- [x] Trace callers of `scrollTo` in `src/game.ts`: the reset path was its only caller; dungeon changes already re-center through camera handling, while same-dungeon resets were unaffected by this inert call.
- [x] Move required DOM scrolling/focus effects to the UI boundary or an injected adapter, rather than accessing the document from game logic: remove the obsolete reset scroll helper; no required game-logic DOM scrolling or focus effect remains.
- [x] Verify the existing scroll calculation against actual container/canvas dimensions before treating its apparent pixel-ratio issue as a confirmed bug: `Dungeon.svelte` gives the container and canvases matching 100% dimensions with `overflow: hidden`, so there is no scroll range and the calculation was not an active pixel-ratio bug.
- [x] Add focused coverage for the retained behavior and confirm headless game execution does not need browser globals: click handling receives canvas-relative coordinates and both it and `resetLevel` are tested with `document` unavailable.

### Turn orchestration — medium priority

- [x] Refactor `next()` in `src/game.ts` into explicit turn-end, hero-selection, round-end, event-draw and turn-start operations.
- [x] Replace duplicated round-end sequences with one operation while preserving hook and reset ordering.
- [x] Review repeated `liveHeroes()` evaluation and the bounded guard loop; cache only within intervals where the hero set cannot change.
- [x] Preserve captured-index semantics when a hero is downed and test round rollover and no-eligible-hero cases.
- [x] Check regression expectations against [RULES.md](RULES.md); ask for clarification if implementation and rules disagree.
- [x] Preserve Game Master lifecycle ordering and update the game-master specification/how-to if documented behavior changes.

### Smaller implementation follow-ups

These observations need targeted validation before implementation.

- [ ] Replace remaining diagnostic `console.warn` bypasses in game/store code with the existing logger where its contract is appropriate.
- [ ] Review the partial `GameState` assertion used for the event-deck modification hook; provide a valid state or a deliberately narrower hook contract rather than exposing missing fields.
- [ ] Review unknown `onCheckFulfilled` registry keys and choose explicit validation/error behavior consistent with content validation.
- [ ] Consider separating win-condition checking from scoring/logging if it improves clarity without changing evaluation order or side effects.
- [ ] Consolidate repeated imports and move mid-file imports when touching the affected module; avoid a separate broad formatting refactor.

## Board controller and rendering boundaries

### Controller decomposition — high priority

Relevant file: `src/components/DungeonBoardController.ts`.

- [x] Map ownership of layer scheduling, rendering, camera handling, dialogs, input dispatch, audio integration and state publication.
- [x] Extract modal-state gating and keyboard-target priority into the pure `src/components/DungeonBoardModal.ts` collaborator; handlers and actions remain controller-owned.
- [x] Extract the remaining layer-scheduling and input-dispatch collaborators, leaving the controller responsible for orchestration.
- [x] Build on `DungeonBoardSignatures`, `DungeonBoardUiHit` and `DungeonBoardHover` rather than duplicating their responsibilities.
- [x] Preserve listener/subscription cleanup and animation-frame lifecycle across mount, unmount and dungeon changes.
- [x] Add or retain regression coverage for modal priority, input arbitration, render invalidation and teardown.
- [x] Keep dialog selection, action effects and game-specific hit priority in the game; put reusable chrome/layout/render/hit mechanics in `uikit` only.

## Performance: establish evidence, then optimize

### Real-browser baseline — high priority

- [x] Complement `src/benchmark/renderingBenchmark.ts` with repeatable real-browser scenarios; retain its no-op canvas benchmark for JavaScript and draw-call regression coverage.
- [x] Cover both projections, pan/zoom, heavy lighting and high device-pixel ratios using existing human-authored content and repeatable inputs.
- [x] Measure frame-time percentiles, allocation pressure and memory after repeated dungeon changes, not just average frame rate.
- [x] Capture rasterization/compositing and image-decoding costs that the no-op context cannot measure.
- [x] Record browser/device conditions, warm/cold-cache conditions and seeds where applicable; define regression budgets from measured baselines.
- [x] Coordinate results with the existing lighting and pan tasks in [TODO.md](TODO.md) rather than creating duplicate optimizations.

### Render invalidation — profile first

Relevant file: `src/components/DungeonBoardSignatures.ts`.

- [x] Measure string construction, serialization and allocation costs even on frames where signatures report no change; the unchanged isometric signature workload measured 46–95 µs per frame including the mask key, with the key itself at 22–49 µs.
- [x] Inventory which mutations invalidate geometry, discovery, actors, items and lighting; record signature dependencies and mutation owners in `docs/render-invalidation.md`.
- [x] Evaluate explicit revision counters against the measurements; do not add them because the largest measured workload is under 0.6% of a 16.7 ms frame and mutation points are distributed across roughly ten modules.
- [x] Retain game-specific dependency knowledge in game adapters; do not move field-level signatures into an engine package.
- [x] Test in-place nested invalidation paths and confirm reverted mutations restore the original signatures; record the measured baseline without claiming an optimization gain.
- [x] Do not substitute reference-only caching: nested state is intentionally mutated in place.

### Derived-store recomputation — investigate

Relevant file: `src/store/gameStateStore.ts`. The measured baseline is recorded in [docs/derived-store-recomputation.md](docs/derived-store-recomputation.md) (run with `npm run benchmark:derived-stores`).

- [x] Measure recomputation/subscriber costs for visibility, live heroes and other array/object derived values during repeated state publication: the array derivations cost 0.06–0.77 µs per call, publishing to every subscribed derived at most 2.29 µs on the largest authored map — about 0.014% of a 16.7 ms frame.
- [x] Check actual subscribers and existing subscription laziness before adding caching: no production component subscribes to the derived stores (the board reads `gameStateStore` directly); the only always-on subscription is the sound-cue drain, and deriveds are lazy, so unsubscribed deriveds never recompute.
- [x] Consider deriving game-over state from the existing live-hero result rather than computing it twice: `isGameOver` now derives from `liveHeroesStore`'s result plus the raw-store guard that keeps the no-active-run value false.
- [x] If worthwhile, cache expensive derivations against complete explicit dependencies/revisions, not object identity or turn count alone: not worthwhile — the all-subscribed worst case is three orders of magnitude below the frame budget and only tests/benchmarks subscribe, and revision instrumentation would spread across the same distributed mutation owners the render-invalidation review declined to instrument.
- [x] Preserve the state-envelope publication behavior needed for in-place mutations; test visibility changes within a turn and subscriber updates: covered by the recomputation tests in `src/store/gameStateStore.test.ts` (derived laziness, in-place room-discovery reveals, hero deaths/revivals, mid-turn publications from an asynchronous turn, null-state welcome phase).

### Translation loading — small concrete improvement

Relevant file: `src/lib/translations/index.ts`.

- [ ] Load independent discovered translation modules concurrently.
- [ ] Merge resolved modules in their original order to preserve override semantics regardless of completion order.
- [ ] Test ordering, overlapping keys and load failures; compare cold-cache loading traces before/after.
- [ ] Do not rewrite or add source in-game text as part of this implementation change.

## Existing HOARD package candidates

Extraction improves ownership and reuse; performance benefits must be demonstrated separately. Implement package changes in their owning repositories, publish through the normal release process, then update game dependencies and facades. Do not edit installed `node_modules` sources.

### `@hoard-engine/input` — high priority

- [x] Move the pure gesture state machines in `src/input/PinchZoomLogic.ts`, `TouchHoldPanLogic.ts` and `WheelGestureLogic.ts` into the package.
- [x] Carry their colocated tests over and expose the supported contracts through the package entry point.
- [x] Preserve pinch anchoring, touch-hold transitions/cancellation and wheel-burst classification behavior.
- [x] Keep browser listeners, game-action arbitration and camera updates in game-side adapters/facades.
- [x] Update game imports/dependencies and verify mouse, trackpad and touch integration: the game consumes published `@hoard-engine/input` v0.2.0 through `package.json`/lockfile with the tuning thresholds in `src/input/GestureTuning.ts`; behavior parity against the removed local modules was confirmed by diff (only comment removal and the constants-to-config refactor, no functional changes).

Verification record: the published package source matches the removed game modules except for the config-injection API, all tuning values (hold-pan delay 250 ms, move slop 10 px, wheel burst reset 120 ms, discrete notch threshold 50 px) are preserved in `GestureTuning.ts`, and the package's tests pass (57/57). Real-Chrome checks against the production build covered both projections: trackpad-fractional wheel streams pan (exact expected camera vector), discrete mouse-wheel notches and ctrl+wheel streams zoom, touch hold-then-drag pans after the delay without moving during the hold, two-finger pinch zooms with release-synthesized clicks suppressed, quick taps fall through to a synthesized click, and one-finger swipes reach the move action. Remaining limitations: Firefox line-mode wheel deltas, real trackpad momentum and real hardware touch synthesis are not drivable through CDP input dispatch; those paths remain covered by the package unit tests only.

### `@hoard-engine/camera` — high priority, deliberate API expansion

- [x] Add policy-free zoom-aware transforms and anchor-preserving zoom mathematics based on `src/camera/ZoomLogic.ts`; document that this expands the package's current no-zoom scope.
- [x] Keep zoom limits, keyboard step and sensitivity in the game facade.
- [x] Port mathematical tests and cover clamping, anchor preservation and inverse transforms where applicable.
- [x] Split `src/camera/IsometricCamera.ts` rather than moving it unchanged: projection-specific transforms belong in `scene`, projection-independent mechanics in `camera`, and composition in the game.
- [x] Avoid introducing a `camera` dependency on `scene`; consider injected projection callbacks only if they simplify an actual consumer need.

Verification record: the isometric projection transforms were already owned by `@hoard-engine/scene` (the previous extraction item moved them); the remaining split separates the projection-independent anchor-preserving zoom mechanic, which moved into `@hoard-engine/camera` v0.3.0 as `zoomAnchorPan` over an injected `AnchorProjection` seam (with `zoomAtAnchor` refactored onto it, so the axis-aligned and isometric paths share one mechanic with no `camera`→`scene` dependency). `src/camera/IsometricCamera.ts` keeps only composition — the zoom-scaled projection, the center-minus-pan camera binding and the projection-seam adapters — and zoom limits/clamping stay in `src/camera/ZoomLogic.ts`. Package tests pin equivalence with `zoomAtAnchor` on the linear viewport and anchor preservation under a skewed isometric-style projection (23/23 pass with check/lint/prettier clean); the game's tests pin the clamp short-circuit alongside the existing round-trip and anchor cases (1811 pass, svelte-check/lint/prettier clean, lint warnings unchanged from the pre-existing six). Pending release: `npm publish` in the `camera` repository is blocked on the account's npm 2FA; after publishing, run `npm install` in the game to move the lockfile from 0.2.0 to 0.3.0 before the next push (the manifest already targets `^0.3.0` and CI installs with `npm ci`).

### `@hoard-engine/scene`: isometric helpers — high priority, selective

- [x] Separate generic drawing/projection mechanics in `src/dungeon/IsometricDungeonRendering.ts` from game and asset adaptation; do not relocate the entire module.
- [x] Extract `getIsometricTileDimensions` and `renderIsometricFogLightDim` through plain scene view contracts.
- [x] Keep discovery decisions, tile selection, authored asset measurements and `GameState` conversion in game adapters.
- [x] Add rendering parity coverage for the extracted paths, including fog boundaries, zoom and projection behavior.

### Wall topology: `grid` versus `scene` — conditional

- [x] Inspect `getIsometricWallShape` and separate neighbor topology from visible-face selection and sprite rendering.
- [x] If a reusable topology operation is justified, place it in `grid` with caller-provided predicates instead of game-specific wall/floor/door tokens.
- [x] Keep face presentation, sprite orientation and drawing in `scene`; keep fog-of-war policy in the game.
- [x] Choose one owner for each concern rather than implementing overlapping geometry in both packages.

Verification record: the neighbour lookup moved into `@hoard-engine/grid` v0.2.0 as `matchNeighbourSides` — which orthogonal sides of a cell hold a neighbour satisfying a caller-provided predicate (out-of-grid cells read as `''` to it), with no wall/floor/door tokens in the package; every tile semantic, the two-phase face-selection rule (openings first, wall-mass fallback), the door-counts-as-opening policy and the fog-sealed `worldRows` stay in the game. Face presentation, sprite orientation and drawing were already owned by `scene` (it performs no neighbour classification); the face-key/tile-id resolution stays game-side in `IsometricGraphics.ts`. Consumers of the op are the wall-shape and wall-corner-shape face selections, which now share one viewer-direction mapping (`openingFaces`); source-grid corner topology remains `grid`'s `detectCornerType`, so no concern is implemented in both packages. Package tests (50/50 pass with check/lint/prettier clean; the only prettier warning is the pre-existing untracked `TODO.md`) cover per-side flags, out-of-grid/beyond-row behaviour as `''` and caller-owned predicates; the game suite passes unchanged (1812 tests, svelte-check clean, prettier clean, the six pre-existing lint warnings unchanged) plus a new regression test pinning the wall-mass fallback inversion, and the rewritten `getIsometricWallShape` preserves both phase mappings exactly (floor-phase `n←S, e←W, s←N, w←E`; mass-phase `n←N, e←E, s←S, w←W`). Pending release: `npm publish` of grid 0.2.0 is blocked on the account's npm 2FA, as with the camera 0.3.0 release; the game's manifest already targets `^0.2.0` and local runs resolve the package through a `node_modules` symlink — after both packages publish, run `npm install` to move the lockfiles before the next push (CI installs with `npm ci`). No browser check was run for the game change: it is a behaviour-preserving refactor pinned by unit parity, not a rendering-behaviour change.

### `@hoard-engine/scene`: aura rendering — medium priority

- [x] Evaluate whether the existing procedural effect belongs in the shared renderer; keep its seeded visual generation and sprite-cache lifecycle in the game rather than expanding generic scene compositing.
- [x] Leave `src/scene/aura.ts` and `AuraRendering.ts` in the game; no aura visuals or package API were changed.
- [x] Keep item eligibility, seed selection and `buildItemAuraViews` in the game.
- [x] Keep existing visual output and cache behavior unchanged by making no aura implementation changes.

### `@hoard-engine/scene`: frame-rate governor — conditional, lower priority

- [x] Evaluate and extract the pure moving-average/hysteresis utility in `src/components/DungeonBoardFrameRate.ts` into `scene`; it consumes caller-measured cost and leaves scheduling to the application.
- [x] Keep actual frame scheduling, component lifecycle and animated-layer policy in the application.
- [x] Preserve threshold/hysteresis behavior with deterministic tests.

## Documentation and completion gates

- [ ] Update `TECHNICAL.md` to describe the actual `@hoard-engine/i18n` dependency and editor-inclusive UI architecture; remove brittle exact component counts.
- [x] Update `docs/engine-packages.md` to reflect published `input` and `camera` dependencies rather than obsolete local/unpublished status.
- [x] Update technical documentation alongside changes to architecture, persistence, rendering, benchmarks and CI/build behavior.
- [ ] Update relevant content-definition specs and authoring READMEs whenever documented types, validation, defaults or hook behavior change.
- [ ] For package work, update public exports, package documentation, completeness/boundary tests and release integration; preserve dependency boundaries and game-free contracts.
- [ ] For any canvas UI changes, use the `uikit` component/view-model/facade pattern and update its view-model table; extract shared primitives only with a second consumer.
- [x] Keep gameplay sequencing/locking, render dependency lists, view-model adapters, authored content and game-specific policy out of engine packages.
- [x] Preserve seedable gameplay randomness and the human-authored-content policy throughout all work.
- [x] For implementation changes, run targeted regressions plus `npm run check`, `npm test` and `npm run lint`; run relevant benchmarks explicitly because normal tests exclude `src/benchmark/**`.
- [ ] Use actual browser checks for rendering/interaction changes and production-build checks for deployment changes; record results and any remaining limitations before marking tasks complete.
