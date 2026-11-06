# The HOARD engine

This document is the spec for extracting the game-agnostic parts of this
codebase into HOARD — a modular engine set of standalone packages, alongside
the existing UI kit. HOARD stands for either 'Hackable Open Architecture for
Reusable Dragonfire-games' or 'Heroic Objects, Actions, Rules and Data'. The
packages are published under the `@hoard-engine/*` scope. The spec defines the target
package map, the dependency rules that keep the packages independent,
per-package extraction requirements, and the order of work. The packages are
genre-neutral: pure computation (grid,
lighting, dice), pure I/O abstractions (audio, saves), and pure rendering
(primitives, UI chrome, scene). Everything genre- or content-specific stays in
this repository.

The target architecture has now been reached: all nine packages are
published and consumed as dependencies, and what remains in `src/` is
the game — the turn pipeline, the content and the adapters/facades that
resolve game state into the packages' contracts. The remaining coupling
is deliberate game knowledge: the shared `GameState` type, the
`#lib/translations/index.js` i18n singleton, and the world-rendering
adapters and facades — the
audio inversion is done: logic modules emit sound-cue data that the game's
adapter maps to samples, and no logic module imports the
`soundEffectManager` facade. Each package section
names the coupling its extraction removed. (The extractions are done:
`@hoard-engine/rng`,
`@hoard-engine/grid`, `@hoard-engine/primitives`,
`@hoard-engine/audio`, `@hoard-engine/lighting`,
`@hoard-engine/saves`, `@hoard-engine/directors`,
`@hoard-engine/uikit` and `@hoard-engine/scene` are published on
npm and consumed as dependencies — see their sections below for the
layout and tooling pattern.)

## Package map

```
@hoard-engine/rng        seedable RNG + dice
@hoard-engine/grid       cells, line of sight, doors, pathfinding (callback-driven)
@hoard-engine/lighting   light sources, propagation, light maps
@hoard-engine/audio      sample playback + intensity-driven crossfade
@hoard-engine/saves      versioned save framework + migration registry
@hoard-engine/directors  hook/dispatch framework for game-master-style directors
@hoard-engine/time       day/cycle/season calendar (future; see Future candidates)
@hoard-engine/input      key bindings, action dispatch, touch gestures (future; see Future candidates)
@hoard-engine/primitives text, geometry, clipping, theme tokens
@hoard-engine/uikit      UI chrome: widgets, components       (source: src/uikit/)
@hoard-engine/scene      world canvas: tiles, walls, light composite, sprites, VFX
game              logic + content + adapters             (this repo)
```

Dependency graph — nine leaves, one composition root:

```
@hoard-engine/rng        (deps: none)
@hoard-engine/grid       (deps: none)
@hoard-engine/lighting   (deps: none; takes a blocker callback)
@hoard-engine/audio      (deps: none)
@hoard-engine/saves      (deps: none; game registers migrators)
@hoard-engine/directors  (deps: none)
@hoard-engine/primitives (deps: none)
@hoard-engine/uikit      (deps: @hoard-engine/primitives)
@hoard-engine/scene      (deps: @hoard-engine/primitives)
game              (deps: all — the only node with edges)
```

The only inter-package edges are the deliberate ones into `@hoard-engine/primitives`,
extracted under the two-consumer rule (uikit and scene both draw). Do not add
edges between the other leaves.

## Dependency rules

1. **Consumer-defined contracts.** Packages never import each other. Each
   package declares the minimal input interface it accepts, and TypeScript's
   structural typing keeps producers compatible without a shared import. `scene`
   does not import `@hoard-engine/lighting` — it declares its light-map input type;
   `@hoard-engine/grid` pathfinding takes injected passability callbacks (a
   `PassableGrid`) instead of a grid import. Producers and consumers share data
   shapes, not dependency edges.
2. **The game is the only composition root.** Only the game knows that
   lighting feeds scene, that grid feeds pathfinding, and which logic events
   emit which audio cues. Engine packages are leaves; they never know who
   calls them.
3. **No shared types hub.** Do not extract `Position`, `Actor`, etc. into a
   common package everyone imports — that recreates the current
   956-line `types.ts` god object as a dependency hub. Each package defines the
   tiny shape it consumes; duplicate two-field interfaces are cheaper than a
   hub.
4. **Enforcement.** Each package gets the same tooling uikit has: a boundary
   test asserting its external import set is exactly `{@hoard-engine/primitives}` (or
   empty), a completeness test on its public surface, and sentinel tests
   against leaked i18n literals and browser/global APIs.
5. **Self-sufficient packages.** Each package folder carries its own
   tooling and docs: a `build` script, a publishing workflow
   (`prepublishOnly`), `test`, `lint` and `prettier` scripts, plus its own
   `AGENTS.md` and `README.md` — the package can be developed, checked,
   formatted and published standalone, lifted out of the repo as is.

## Package documentation

Rule 5 makes the docs part of the package tooling: `AGENTS.md` and
`README.md` are contract, not afterthought. They serve different
audiences — `AGENTS.md` is written for an agent working in the package
folder, `README.md` for a consumer browsing npm — but both open with the
same statement of design goals, and their layouts are fixed so any HOARD
package is recognizable from any other. When writing either file for a
new package, copy the shared blocks verbatim from an existing one (rng
is the reference extraction) instead of paraphrasing them.

The design goals, stated in both files and in this order:

- **Pluggable.** Adopt a package on its own, or swap it out, without
  touching the rest of the engine — no central engine object to install
  and no package that owns the others.
- **Interoperable.** Packages compose with each other and with consumer
  code through data: minimal shapes, callback seams and plain values —
  never through shared state or a common framework.
- **As standalone as possible.** Each package is usable as-is in any
  project, HOARD-based or not; the leaf packages carry no dependencies
  and import no siblings.

Both files treat a new dependency or a sibling import as a design
regression, not an optimization.

### README.md

Seven sections, in this order:

1. **Title + intro.** `# <package name>`, then one paragraph naming what
   the package does and what it contains, ending with the
   dependency-free-leaf framing.
2. **`## Pluggable, interoperable, standalone`.** The design-goals block
   verbatim, identical in every package, closed by the line "This
   package meets all three by construction."
3. **`## Install`.** An `npm install <name>` fence, followed by
   "Requires Node 18+ (ESM only)." — matching the `engines` field every
   package publishes.
4. **`## Usage`.** One commented code sample showing the main flow, game
   knowledge injected; closes with the paragraph naming what the package
   never asks for — world state, framework, asset paths — and what the
   consumer therefore injects.
5. **`## API`.** A reference table — `| Export | Description |` — with
   one row per public export: everything `src/index.ts` re-exports and
   nothing else, so the table and the completeness test hold the same
   list. Rows in capability order, descriptions derived from the source,
   pipe-aligned cells.
6. **`## Design notes`.** Behavior a consumer cannot see from the
   signatures: semantics, rules and caveats, one subject per bullet.
7. **`## Development`.** The same command block in every package:

   ```bash
   npm test          # vitest
   npm run check     # tsc --noEmit
   npm run lint      # eslint over src
   npm run prettier  # prettier --check (fix via prettier:format)
   npm run build     # tsc declarations + esbuild ESM bundle to dist/
   npm publish       # prepublishOnly runs check + build + test first
   ```

### AGENTS.md

Two layouts are in use: the long form (rng, grid, lighting, saves —
`## What this package is`, `## Hard boundaries`, `## Commands`,
`## Conventions`) and the short form (primitives, audio — `## Rules`,
`## Commands`). Either is acceptable; the required content is the same
in both:

- **Identity.** The package name and what it is — what was extracted
  from the game and what kind of leaf it is.
- **The design goals.** The same three goals, stated as rules: long form
  as a bullet under "What this package is", short form as the lead rule,
  before the boundary rules.
- **Hard boundaries.** Relative imports only — no game, framework or
  sibling code, no content; the public surface is exactly `src/index.ts`;
  game knowledge arrives as data. Rule decisions belong to the game:
  point at RULES.md and instruct to ask before "fixing" either side.
- **Commands.** The check, test, lint, prettier and build script set with
  the instruction to run check, test and lint before considering work
  done.
- **Conventions.** Prettier and strict-TypeScript settings, colocated
  tests, `dist/` as never-edited build output, and the publishing
  workflow — `prepublishOnly` runs check + build + test, the version is
  bumped first, and no license field is added unilaterally (that is the
  repo owner's decision).

Formatting for both files: prose wrapped at the repository print width
(80 columns), sentence-case headings, fenced `bash` blocks with aligned
comments.

## Package specifications

### @hoard-engine/rng — source: `src/core/dice.ts` — EXTRACTED

Seedable RNG + dice rolls, deterministic and testable. Coupling: imports only
the `Level` enum. Extraction is near-free: accept difficulty as a value instead.
This is the reference extraction — do it first to establish the package layout,
boundary-test pattern, and publishing workflow.

**Current state:** published on npm as `@hoard-engine/rng` (v0.1.0) and
consumed by the game as a dependency; its source folder has left this repo.
It was developed in-repo as `packages/rng/` — the layout later packages
follow:

- Self-contained package folder: `package.json` (name `@hoard-engine/rng`,
  publishes the built `dist/` entry, `prepublishOnly` runs check + build +
  tests), strict `tsconfig.json` plus `tsconfig.build.json` (declaration
  emit) and its own `vitest.config.ts` — the folder can be lifted out of
  the repo as is. The JS entry is an esbuild ESM bundle so the published
  artifact also loads under plain Node.
- Game-agnostic API: the d6 success roll takes a numeric `successThreshold`;
  the `Level`-to-threshold mapping is game knowledge and lives in the
  `src/core/dice.ts` facade, which re-exports the package.
- Consumed as an npm dependency (`@hoard-engine/rng` in the game's
  `package.json`).
- Boundary test (`src/boundary.test.ts`: only relative imports inside the
  package), public-surface completeness test (`src/publicSurface.test.ts`)
  and colocated unit tests — mirroring the uikit tooling; an eslint
  `no-restricted-syntax` override blocks non-relative imports in package
  sources, and while a package is developed in-repo the root tsconfig
  include covers `packages/*/src/**` so `check` and `lint` type-check
  package code, and the root vitest include runs its tests.
- Own `AGENTS.md` and `README.md` — the package documents itself, per the
  self-sufficient-package rule; its script set covers build, publishing,
  testing, lint and prettier.

### @hoard-engine/audio — source: `src/audio/` — EXTRACTED

`SoundEffectManager` (sample playback, volume) and `MusicManager` +
`MusicIntensity` (crossfade between tracks driven by an intensity value).
Coupling: `$app/paths` (inject the asset base path, as uikit does with `UiEnv`)
and type-only imports. The game keeps the sound-cue table (which event plays
which sample) and any intensity heuristic. Extraction forced the broader
inversion, now done: logic modules emit sound-cue data and the game's
adapter maps cues to samples (see the current-state bullets below).

**Current state:** published on npm as `@hoard-engine/audio` (v0.1.0) and
consumed by the game as a dependency; its source folder has left this
repo and lives next to the hoard `audio`/`rng`/`grid`/`primitives`
packages. It follows the established package layout: self-contained
folder with build, publishing, testing, lint and prettier scripts, its
own `AGENTS.md` and `README.md`, boundary and public-surface tests plus
colocated unit tests that stub the global `Audio`, so the suite runs in
plain Node. The coupling removals the extraction performed:

- `$app/paths` left the engine code: the package `MusicManager` takes its
  fallback tracks as injected `MusicManagerOptions`; the game facade
  (`src/audio/MusicManager.ts`) resolves them through `asset(...)`, keeps
  the `musicManager` singleton and re-exports the class for tests.
- The sound-cue table is game knowledge and stayed here:
  `src/audio/SoundEffectManager.ts` is a facade subclassing the package
  class with the game's `play*` cue methods and the `soundEffectManager`
  singleton; the game's types reach the engine as plain asset URLs.
- The intensity heuristic stayed here: `selectMusicIntensity`, the
  tension enter/exit ranges and its tests remain in
  `src/audio/MusicIntensity.ts`, which re-exports the package's
  `MusicIntensity` type; the crossfade itself moved with the package.
- The sound-cue inversion is done: logic modules never import the
  manager singleton — they append `SoundCue` data to
  `state.soundCues` via `emitSoundCue`
  (`src/core/soundCues.ts`), and the game's adapter
  (`src/audio/SoundCueAdapter.ts`) drains the queue in emission
  order on every store publish (`src/store/gameStateStore.ts`)
  and maps each cue to a `play*` facade method. The cue
  discriminants live in `src/types.ts`; the adapter is the only
  consumer of the facade besides the UI shell (button clicks,
  volume/mute wiring in `AppSettings`). Headless consumers
  (benchmarks, logic tests) see cue data on the state and stay
  silent.

### @hoard-engine/primitives — source: `src/uikit/primitives/` +

`src/uikit/theme/` — EXTRACTED

The shared drawing layer (text, geometry, clipping) plus the theme-token
contracts. Both `uikit` and (eventually) `scene` draw and theme, which is
the two-consumer pair that justifies the package.

**Current state:** published on npm as `@hoard-engine/primitives`
(v0.1.0) and consumed by the game as a dependency; its source folder has
left this repo. It was developed in-repo as `packages/primitives/`,
following the rng/grid layout — self-contained folder with build,
publishing, testing, lint and prettier scripts, its own `AGENTS.md` and
`README.md`, boundary test (only relative imports inside the package) and
a public-surface completeness test on `src/index.ts`, plus colocated unit
tests that run canvas-free. Contents:

- The theme-token contract (`UiTheme`, `DeepPartial`), the default token
  values and the deep-merge `resolveTheme` — the whole former
  `src/uikit/theme/` moved into the package; the kit re-exports it
  through its index instead of holding its own copy.
- The text primitives (`composeFont`, `measureTextWidth`, `truncateText`,
  `wrapText`, `wrapTextMeasured`), geometry (`Rect`, `Point`,
  `isPointInRect`) and rounded-rect clipping (`drawRoundedRect`,
  `roundRectPath`) — the former `src/uikit/primitives/` verbatim.

`src/uikit` re-exports the package's surface through its index; the game
consumes it as a registry dependency in `package.json`, exactly like rng
and grid before it.

### @hoard-engine/grid — source: `src/core/grid.ts`,

`src/dungeon/cornerDetection.ts`, `src/monsters/pathfinding.ts` — EXTRACTED

Cells, line of sight, door blocking, corner detection, pathfinding. The
package holds the pure computation; every piece of game knowledge is
injected (the `pathfinding.ts` hero logic and behavior scoring stayed in
the game, as planned):

- Cell and edge helpers work on plain string grids and minimal shapes:
  the tile alphabet (`EMPTY`/`COLLAPSED`/`SEALED_DOOR`/`WALL`), position
  helpers, and door/wall edges typed as `Direction`/`DoorEdge`/`WallEdge`
  — the game's `Side` enum and `Door`/`WallEdge` types are structurally
  compatible, and `isDoorEdge`/`isWallEdge` are generic so consumers keep
  their own element types.
- Line of sight walks rays with an injected `LineOfSightEnv`: which cells
  block a line or a corner pinch (with the sight-ray exception for
  pits), which cells stop the line (a hero stops sight, a pit stops
  walking) and which edges are closed.
- Pathfinding is callback-driven: the A\*, its Chebyshev heuristic and the
  diagonal step rules take a `PassableGrid` built from injected
  walkability and collected blocked edges; the target is a plain
  position and the goal is adjacency to it.
- Corner classification owns `CornerType` (a const object plus derived
  union, re-exported by `src/types.ts`) and works on plain string grids
  with an optional discovered-rooms list for fog. The former
  `sealedCornerGrid.ts` source no longer exists — its logic had already
  been folded into corner detection.

The game keeps the facades at their historical paths: `src/core/grid.ts`
(walkability, discovery and corridor letters, the actor-blocking
predicates, `findNeighbouringHeroes`), `src/dungeon/cornerDetection.ts`
(pure re-export) and `src/monsters/pathfinding.ts`
(`createPassableGrid` from state, hero-target `findPath`, scored target
selection).

**Current state:** published on npm as `@hoard-engine/grid` (v0.1.0) and
consumed by the game as a dependency; its source folder has left this
repo. It was developed in-repo as `packages/grid/` following the rng
layout — self-contained folder with build, publishing, testing, lint and
prettier scripts, its own `AGENTS.md` and `README.md`, boundary and
public-surface tests plus colocated unit tests on synthetic grids
(campaign-layout corner tests stay in the game: campaign content is game
content).

### @hoard-engine/lighting — source: `src/dungeon/LightSources.ts` + the computation

half of `src/dungeon/LightRendering.ts` — EXTRACTED

Light sources on a tile grid, propagation, falloff, per-cell light level,
blockers via a callback. The roughly 2,000 lines of gradient/canvas compositing
in `LightRendering.ts` move to `scene` instead — the engine package outputs a
light map that `scene` renders.

**Current state:** published on npm as `@hoard-engine/lighting` (v0.1.0)
and consumed by the game as a dependency; its source folder has left this
repo and lives next to the hoard `audio`/`rng`/`grid`/`primitives`
packages. It follows the established package layout: self-contained
folder with build, publishing, testing, lint and prettier scripts, its
own `AGENTS.md` and `README.md`, boundary and public-surface tests plus
colocated unit tests on synthetic environments, so the suite runs in
plain Node. The compute/render split the extraction performed:

- The computation half of `LightRendering.ts` moved with the package:
  the default light values and the `createLight` factory (re-exported
  by `src/dungeon/DungeonLogic.ts`), the alignment/ceiling center
  geometry, the animation effects (pulse, flicker, blink, sway, sweep,
  sparkle, aura, gas) with the quantized repaint signature, and the
  ray-marched visibility polygons with their caches.
- Blockers arrive via a callback: the package computes against an
  injected `LightingEnv` — per-cell occlusion facts (`opaque`, `fog`,
  `actor`, `open`), a step-blocked callback (closed doors and wall
  edges, with the grid pinch rule) and a region lookup that contains
  gas lights — a sibling of `@hoard-engine/grid`'s `LineOfSightEnv`.
  Its caches key on the caller's opaque occlusion key plus the
  environment identity, mirroring the historical per-state caches.
- The game keeps the knowledge: `src/dungeon/LightRendering.ts` builds
  the environment from the state (walls, pillars, fog of war, blocking
  room fog, living actors) with the historical precedence, hashes
  everything that can change occlusion into the occlusion key, owns the
  active-light catalogue (`activeLights`: event lights, door glows,
  hero torches, projectiles, dark lord flames, carried items,
  interactables, terrain lights), the renderability rules, the ambient
  level and all canvas compositing (gradients, sprites, the darkness
  veil) — until the scene package takes the rendering over. The
  state-based facades keep the historical signatures, so renderers and
  tests are unchanged.
- `src/dungeon/LightSources.ts` stayed with the game: the light presets
  (brazier, torch, ember, ...) are dungeon-authoring vocabulary and
  thus game content — the packages contain no game content by
  construction.

### @hoard-engine/saves — source: `src/saveMigration.ts`, `src/saves/` — EXTRACTED

Versioned save schema and ordered migrations. Coupling: migrations currently
resolve monster templates directly; replace with a migrator-registry interface
the game populates. The package ships the framework (version stamps, ordered
migration pipeline, validation); the game ships its migrators.

**Current state:** published on npm as `@hoard-engine/saves` (v0.1.0)
and consumed by the game as a dependency; its source folder lives next
to the hoard `audio`/`rng`/`grid`/`primitives`/`lighting` packages. It
follows the established package layout: self-contained
folder with build, publishing, testing, lint and
prettier scripts, its own `AGENTS.md` and `README.md`, boundary and
public-surface tests plus colocated unit tests over an in-memory
storage stub (and a sentinel against browser-global references — the
package never touches `localStorage` itself), so the suite runs in
plain Node. The framework/migrator split the extraction performed:

- The migration pipeline moved with the package:
  `createSaveMigrations` builds the registry the game populates —
  `register` takes one step per schema version, in order, and rejects
  gaps, duplicates and out-of-order registration; `migrateSave` runs
  every step the save has not seen, in version order, and stamps the
  current version (a pre-versioning save reads as version 0, a
  current-version save passes through untouched).
- The named-save slot store moved with the package as the pure I/O
  half of `src/saves/SavesLogic.ts`: `createSaveSlots` operates on an
  injected `KeyValueStorage` (or `null` when persistence is
  unavailable), owning the metadata-index round trip, the newest-first
  listing, the blob reads and the legacy single-slot import. The keys
  (`saves`, `save_`, the legacy `state`) are the persisted format and
  stay caller-supplied.
- Validation moved with the package: `parseSaveBlob` treats JSON that
  does not decode to a plain object as corrupt (used by the autosave
  hint path and the legacy import, which leaves a corrupt legacy blob
  untouched instead of importing it).
- The game keeps the knowledge: `src/saveMigration.ts` keeps the three
  migrators (game master resolution via `getGameMaster`, the collapsed
  corridor conversion, the monster-name translation keys via the
  monster registry and the `Colour` enumeration) and registers them
  into the package pipeline, re-exporting `CURRENT_SAVE_VERSION` and
  `migrateSaveState`; `src/saves/SavesLogic.ts` keeps the i18n labels
  (default save name, the "Manual Save" import label), the
  campaign/dungeon hints via the campaigns registry, the id and
  timestamp rules, and the save-name capping. The facade signatures
  are unchanged, so callers and tests are unchanged.
- `src/saves/HighScoresLogic.ts` stayed with the game: the high-score
  entries and their top-10-per-campaign semantics are game data
  models, not save-framework mechanics.

### @hoard-engine/directors — source: `src/gameMasters/` (types, hook dispatch, alias

resolution) — EXTRACTED

The hook/dispatch shell for director-style systems: hook types, an event
dispatcher, id/alias resolution. The concrete game masters and all their texts
are game content and stay in the game. The framework is cadence-agnostic: this
game uses turn-bound hooks; a real-time consumer would register interval-based
ones.

**Current state:** published on npm as `@hoard-engine/directors`
(v0.1.0) and consumed by the game as a dependency; its source folder
has left this repo and lives next to the hoard `audio`/`rng`/
`grid`/`primitives`/`lighting`/`saves` packages. It follows the
established package layout: self-contained folder with build,
publishing, testing, lint and prettier scripts, its own `AGENTS.md`
and `README.md`, boundary and public-surface tests plus colocated
unit tests over synthetic directors and hook maps, so the suite runs
in plain Node. The framework/content split the extraction performed:

- The director identity contract moved with the package: `Director` —
  an id plus an optional `initialState` factory — which the game's
  `GameMaster` type satisfies structurally, without an import.
- Hook dispatch moved with the package: `dispatchDirectorEvent`
  emits a named event to an optional hook on a plain object host
  (a director or one of its hook groups) and returns the hook's
  result, or `undefined` when absent. Hosts may carry data members;
  only their function-typed members are events
  (`DirectorEventNames`). The game's turn flow (`src/game.ts`), the
  event draw (`src/events/EventsLogic.ts`) and the benchmark event
  deck emit through it at their historical call sites.
- Override resolution moved with the package: `resolveDirectorHook`
  picks the first group defining an event over the base host — the
  former `gm.rules?.x ?? gm.x` dual form in `src/core/combat.ts` and
  `src/secrets/SecretsLogic.ts`.
- Id/alias resolution moved with the package:
  `createDirectorRegistry` resolves an injected, live directors
  record through the historical chain — alias, then id, then the
  default, then the first registered. The game keeps the knowledge:
  `src/gameMasters/index.ts` keeps the `import.meta.glob` discovery
  and the content of `GAME_MASTER_ALIASES`/`DEFAULT_GAME_MASTER_ID`
  (difficulty words and spelling variants are game content) and
  delegates `getGameMaster`/`isKnownGameMaster` to the registry,
  signatures unchanged.
- The concrete game masters, their tuned values, their translations
  and the hook maps (`GameMasterLifecycleHooks`,
  `GameMasterRules`, `EventDifficulty` on `GameState`-typed
  signatures) stayed with the game: personalities and texts are
  game content, and the hook signatures carry game types, per the
  consumer-defined-contract rule.

### @hoard-engine/uikit — source: `src/uikit/` — EXTRACTED

The game-agnostic canvas UI kit, lifted into a package once its
prerequisites were already in place from the earlier lifts: the theme
tokens and drawing primitives live in `@hoard-engine/primitives` (its
single deliberate dependency, per the two-consumer rule — the future
`scene` package consumes primitives directly, never this package), the
component contract (`UiEnv`/`UiContext`, layout → hitTest → render over
plain view models) had been enforced in-repo for the full migration.

**Current state:** published on npm as `@hoard-engine/uikit` (v0.1.0)
and consumed by the game as a dependency; its source folder has left
this repo and lives next to the other hoard packages. The kit/package
split the lift performed:

- The whole former `src/uikit/` moved with the package: the `env.ts`
  environment contracts (`UiEnv`, `UiContext`, `Translator`,
  `AssetProvider`, `SpriteRef`), the five kit widgets (modalFrame,
  button, listRow, textInput, spriteFrame), the 14 components (topBar,
  heroCards, monsterCards, radialMenu, dungeonIntro, menu, welcome,
  saveLoadDialog, newGameDialog, heroSelection, settings/credits,
  eventCard, diary, betweenDungeons) and the test harness.
- The export map has two entries: `.` (the built index — the primitives
  surface re-exported, the contracts, the widgets, the components) and
  the **required** `./testing` subpath (the recording context, the
  sentinel theme, the literal-budget counter), so the game keeps its
  parity and sentinel suites unchanged: they import
  `@hoard-engine/uikit/testing` where they used to import
  `src/uikit/testing/*`.
- The kit-side tooling moved with the package: the boundary test
  (module-relative now; the external import set is exactly
  `{@hoard-engine/primitives}`), the public-surface completeness test
  (now package-internal — the index re-exports every source module) and
  the error-side lint rules (the kit import restriction and the color
  literal sentinel). The package carries its own build (tsc
  declarations plus esbuild ESM bundles for both entries, primitives
  external), its own AGENTS.md and README.md, and its longer consumer
  reference (`ui-kit.md`, the former `docs/ui-kit.md` with its paths
  rewritten).
- The game keeps the knowledge: `src/ui/viewmodels/` (the GameState
  adapters), `src/ui/env.ts` (theme, layout mode, translator, measure),
  `src/ui/i18nAdapter.ts`, `src/ui/assets.ts` (the asset port), the
  `*Rendering.ts` facades with their historical entry points, the parity
  snapshots and the sentinels — all unchanged, importing through
  `@hoard-engine/uikit`. The game-side completeness net is re-scoped
  (`src/ui/publicSurface.test.ts`): the game imports the kit only
  through the package entry points, and the reverse lint rule
  (game-logic modules cannot import the kit) now targets the package
  specifier.

### scene — source: the world-rendering files scattered today:

`src/dungeon/DungeonRendering.ts`, `TileTextureCache.ts`, `TilesetLogic.ts`,
`WallRendering`/`DoorRendering`/`TerrainRendering`, the render half of
`LightRendering.ts`, `src/core/ImageCache.ts`, `src/core/ActorAnimation.ts`, `src/monsters/MonsterRendering.ts`, the actor/prop
sprite renderers (`src/hero/HeroRendering.ts`,
`src/items/ItemRendering.ts`), `src/combat/DamageIndicatorRendering.ts`.
`ImageCache.ts` — the
per-URL image cache shared by actor sheets, item sheets and the UI asset
port — is generic but browser-bound by nature; it folds into `scene`
rather than standing as its own package. The sprite renderers
(`HeroRendering`, `ItemRendering`) import `GameState` and draw named
game tiles, so like the other scene sources they arrive as view models
under adapters, with the tile references staying game content — the
actor/item/effect plane is done this way already (see the current-state
note below; the former `src/core/ActorSpriteRendering.ts` and
`src/items/ItemSpriteRendering.ts` folded into the scene adapters and
helpers).

The world canvas renderer: draw-ordered layer compositing (terrain →
walls/doors → actors → light → VFX), tileset handling with texture caching and
corner rules, sprite animation timelines, and effect lifecycles driven by
effect descriptors. Consumes only plain view models — tile grids, light maps,
actor sprites, effect descriptors — never `GameState`, `Monster`, or any game
type. The game keeps the adapters (today's `src/ui/viewmodels/` role) and all
assets. `scene` and `uikit` are siblings: neither imports the other, and nothing
engine-side imports either, keeping headless benchmarks canvas-free.

**Current state: view-model contracts, first plane in place.** The
step-9 gate ("view-model contracts in place") is being built under
`src/scene/`, staged plane by plane:

- `src/scene/contracts.ts` — the view-model types the future package
  consumes: `SceneActorView` (sprite frame or fallback tile, visual
  position, flash intensity, active flag, bars, debug data),
  `SceneHeroOverlayView` (walkable-area cells, per-hero bars/pips,
  current-actor marker), `SceneItemView` (sprite frame, generic tile,
  resolved i18n label) and `SceneFloatingText` (structurally compatible
  with the game's `DamageIndicator`, so indicator data passes by data).
  No game types: positions are two-field `ScenePoint`s, tiles and
  frames are plain rectangles plus sheet images.
- `src/scene/adapters.ts` — the GameState → view-model builders, the
  game-side half that stays when the renderers leave: animation-timeline
  resolution (current sprite frame), dying-actor visibility (lingering
  death animations), monster discovery filtering, walkable-area rules
  (discovery, blocking, line of sight), difficulty-scaled health bars,
  named-tile resolution (`ACTOR_TILES.HERO`, the monster type switch is
  game knowledge) and the i18n item labels.
- `src/scene/ActorLayer.ts` / `spriteSheets.ts` — the view-model draw
  primitives and sprite-sheet source-rect math (package material).
- Converted, facades unchanged: `HeroRendering`, `MonsterRendering`,
  `ItemRendering` and `DamageIndicatorRendering` keep their historical
  signatures and now resolveGameState → view models → view-typed cores.
  The superseded `src/core/ActorSpriteRendering.ts` and
  `src/items/ItemSpriteRendering.ts` are folded into the adapters and
  scene helpers (their tests moved with the math).
- Dungeon plane, stages A+B done: every `DungeonRendering` entry point
  (`renderGrid`/`renderWalls`/`renderDoors`/`renderSecrets`/`renderTerrain`
  /`renderTerrainAnimation`/`renderRoomFog`/`renderFogLightDim`/
  `renderPillars`/`renderPillarTops`/`renderPortal`/`renderInteractables`,
  `hasAnimatedTerrainEffects`, `sealedCornerGrid`, `edgeWallRect`) now
  consumes the `SceneDungeonView` contract
  (`src/scene/dungeon.ts`): plain shapes — string grid rows, doors and
  edge walls with a literal side union, secrets/terrain/fog/corner
  descriptors with open string types, the portal and the
  discovered-room set. The game's `Dungeon` satisfies the contract
  structurally (its `Side`/`SecretType` enums carry the contract's
  literal strings), pinned by a compile-time sentinel test
  (`src/scene/dungeon.test.ts`); callers pass their own `Dungeon` data.
  Discovery resolves inside the renderer against grid rows and the
  discovered-room set (two-field duplicate, no game helper import). The
  vocabulary imports that remain until the adapter resolves them at
  lift: the corner-type string list (`CornerType`, a const-object data
  vocabulary re-exported from the grid engine), `TerrainType`'s open
  union, TerrainLogic's default styling, the `autoDetectCorners`
  re-export (corner data will arrive in the view at lift) and the
  grid-string helpers `findCell`/`toArray`.
- Light plane, view-model seam done: the compositing half of
  `LightRendering` draws only `SceneLightView` descriptors
  (`src/scene/lights.ts`) — resolved center (alignment, ceiling, sway,
  sweep), defaulted colour/intensity/radius, per-frame brightness, blur,
  open effect name, occlusion polygon, sparkles and sprite-cache
  tokens. A `buildLightViews` pass inside the facade resolves every
  `@hoard-engine/lighting` engine computation the renderer used to call
  (`lightCenter`, `lightIntensityScale`, `lightBlurPx`,
  `computeSparkles`, `lightPolygonFor`, `isAnimatedLight`/
  `isBakeableLight` classification) and applies the game knowledge
  (renderability, viewport culling, one occlusion key per pass), so the
  compositing — gradients, polygons, aura rings, gas clouds, baked
  sprites, the darkness veil — never sees `GameState` or the engine
  package. Facade signatures are unchanged; the 100-test light suite
  pins the pixel behaviour.
- The two remaining bookkeeping moves, decided rather than pending:
  `ImageCache` and the `ActorAnimation` timeline stay with the game.
  `ImageCache` folds into the scene package at lift as its internal
  per-URL cache; the adapter may keep calling the game-side facade
  (the game imports its packages — nothing forbids that direction).
  `ActorAnimation` was listed as scene source before the view-model
  contracts existed; with the contracts, its rendering half is the
  adapter's frame/position resolution (game side) and its recording
  half is logic (game side) — nothing of it moves.
- What remains for step 9 was the lift itself: the view-typed
  compositing cores have moved into the `@hoard-engine/scene` package
  (sibling folder in the hoard root, `../scene`), with the
  boundary/completeness tooling and its own AGENTS/README; the game
  keeps the facades and the adapters. **Done:** published as
  `@hoard-engine/scene` (v0.1.0), consumed as a dependency like every
  other engine package.

## Prerequisites (cross-cutting)

These apply to most packages and are the bulk of the real work. They mirror
what uikit already did with `UiEnv.t`:

- **Split `GameState`.** Separate engine-level state (grid, actors, turn
  counter, RNG seed, timers) from game data (heroes, items, dungeon content).
  Each package then consumes only its own slice, passed in by the game.
- **Inject i18n.** Largely done: combat, monster and terrain logic now emit
  message data through `addLog` instead of importing the singleton. The
  remaining direct imports of `#lib/translations/index.js` outside routes
  and tests are `core/logger.ts` (the `i18n()` lookup helper forming the
  seam) and the locale lifecycle (`menu/MenuLogic.ts`,
  `store/gameStateStore.ts`, `components/DungeonBoardController.ts`) —
  app-shell seams, not engine seams.
- **Invert audio.** Done: direct `soundEffectManager` imports in logic are
  replaced by sound-cue data on the state plus a game-side adapter (see the
  audio section).
- **Separate compute from render.** Rendering files colocated in logic
  directories move to `scene`; logic emits data (animation/sound/effect events)
  that presentation consumes. In progress: the actor/item/effect rendering
  plane consumes view models built by `src/scene/adapters.ts` (see the scene
  section); the dungeon and light planes still read `GameState` directly.

## Extraction order

Ordered by how clean the split already is — clean splits first, inversions
later:

1. `@hoard-engine/rng` — near-free; establishes the package pattern and tooling.
   **Done:** published as `@hoard-engine/rng` (v0.1.0), consumed as a
   dependency (see the package section above).
2. `@hoard-engine/primitives` — exists already as `uikit/primitives/`;
   mechanical. **Done:** published as `@hoard-engine/primitives`
   (v0.1.0), consumed as a dependency (see the package section above).
3. `@hoard-engine/audio` — small files; requires the asset-path injection. Also
   unlocks the audio-cue inversion across the 12 importing modules.
   **Done:** published as `@hoard-engine/audio` (v0.1.0), consumed as a
   dependency (see the package section above).
4. `@hoard-engine/grid` — clean once pathfinding takes callbacks.
   **Done:** published as `@hoard-engine/grid` (v0.1.0), consumed as a
   dependency (see the package section above).
5. `@hoard-engine/lighting` — requires the compute/render split of `LightRendering.ts`.
   **Done:** published as `@hoard-engine/lighting` (v0.1.0), consumed as a
   dependency (see the package section above).
6. `@hoard-engine/saves` — requires the migrator registry.
   **Done:** published as `@hoard-engine/saves` (v0.1.0), consumed as a
   dependency (see the package section above).
7. `@hoard-engine/directors` — framework only; content stays.
   **Done:** published as `@hoard-engine/directors` (v0.1.0), consumed
   as a dependency (see the package section above).
8. `@hoard-engine/uikit` — the in-repo kit was already an isolated leaf
   over `@hoard-engine/primitives`; the lift is a package move plus the
   `./testing` subpath export (see the package section above).
   **Done:** published as `@hoard-engine/uikit` (v0.1.0), consumed as
   a dependency; `src/uikit/` has left this repo.
9. `scene` — last and largest: needs the render/logic separation complete and
   view-model contracts in place. Camera/viewport and map streaming are
   out-of-scope extensions for a future consumer, not part of the extraction.
   **Done:** published as `@hoard-engine/scene` (v0.1.0), consumed as a
   dependency, with the consumer-defined contract drains the spec named —
   corner data and the sealed grid arrive in the view
   (`layout.corners`/`layout.sealedGrid`, resolved by `src/scene/adapters.ts`
   with the grid engine's classifier), terrain styling resolves in the
   adapter, and the vocabulary lists (cell tokens, corner types, light
   effects) are package-local const duplicates behind structural
   compatibility. The engine knowledge that is composition glue (the
   corner/sealed derivation, the light view builder) stays in the game.

## What stays in the game

Turn pipeline, combat, hero/item/event/secret/interactable logic, the dungeon
authoring DSL and its parser/validator, all campaigns, game masters, monsters,
and every user-facing string and asset. Content is human-authored per the AI
policy; the packages contain no game content by construction.

## Future candidates

- `@hoard-engine/time` — a game clock/calendar leaf (day length, cycles, seasons) that
  feeds lighting levels and audio intensity. It now has source to seed it:
  the wall-clock timing in `src/core/timer.ts` is generic machinery under
  game vocabulary — an accumulated-elapsed-plus-`runningFrom` segment
  accumulator updated without per-frame writes, the
  `checkpointDungeonTimer`/`resumeDungeonTimer` rebase pair around
  serialize/deserialize (so an offline gap is not counted), and the pure
  `formatDuration`. A calendar and run timing are distinct features; if
  both extract they would be two exports of one leaf, not two packages.
  Low priority: the machinery is small and works fine behind its
  `GameState`-typed facade, and the timer's dungeon/campaign semantics
  stay with the game regardless.
- `@hoard-engine/input` — the framework half of `src/input/`. The
  `InputManager` class is a generic leaf in game costume: a rebindable
  key-binding registry (bind/unbind/set/query, guarded against
  re-entrancy by cloning), an action-to-handlers dispatcher with
  enable/disable, a key handler that ignores text-field targets, and a
  swipe classifier (distance/time thresholds, octant angles, optional
  diagonals). `TouchPanLogic.ts` is already pure: the two-finger-centroid
  pan state machine has no imports at all. The extraction has the same
  shape as audio's: the `InputAction` enum values and default key
  bindings are game vocabulary, `registerDefaultDispatchers` wires the
  store actions, and `$app/env` supplies the browser flag. The package
  would be generic over the action type with injected bindings and
  dispatch; the game keeps the enum, the defaults, the dispatchers, the
  `$app` seam and the singleton, mirroring the `SoundEffectManager`
  facade pattern. Like uikit it is browser-bound by nature
  (Keyboard/Touch events); its tests run in plain Node over stub events.
  Two-consumer check: weaker than most — the second consumer is the
  benchmark's `bot.ts` turn injector, which currently builds its own
  DIRECTIONS table.

## Evaluated and rejected (November 2026 review)

A November 2026 review pass compared this spec with what remains in
`src/`. The published packages and their facades match the spec above,
including the open-item ledger: the sound-cue inversion is done (logic
emits cue data; only the adapter, the UI shell and `AppSettings` import
the `soundEffectManager` facade) and the scene extraction (step 9) is
complete — published as `@hoard-engine/scene`, with the game keeping
the adapters and the render facades (see the scene section). Besides
the two future candidates
above, these framework-looking modules were examined and stay in the
game:

- `src/dungeon/dungeonParser.ts` + `dungeonValidator.ts` (~1,500 lines)
  — the authoring-DSL parser and validator look engine-shaped, but every
  declared type is game vocabulary (`DeclarativeDoor`,
  `Level`-conditioned options, monster factories) and they emit `Dungeon`
  directly. The parser is the strongest non-candidate on size alone.
- `src/components/DungeonBoardSignatures.ts` — the layer-signature
  change-detection pattern (redraw a layer only when its stringified
  signature changes) is generic and should inform `scene`'s layer
  compositing contract; but the signatures themselves are stringified
  `GameState` slices, i.e. per-game adapter material, and stay.
- `src/core/scoring.ts` — the point constants and weights are tuned
  game content by construction.
- `src/core/logger.ts` (including the reloadGuard and its debounce) —
  debounced `localStorage` snapshotting of the whole state plus the
  `actionLog` format; the game-mechanics half is tiny behind app-shell
  coupling, and the saves package already owns the storage abstraction
  this would use instead of `localStorage` directly.
- `src/benchmark/` — the harness wraps the concrete `init`/`next` turn
  flow and `bot.ts` imports hero logic; the generic parts (win/loss and
  std-dev summaries) are thin and would need a turn-flow contract first.
  Not worth an extraction; keeping the benchmarks in-repo also keeps
  the headless, canvas-free property this spec relies on.
- `src/settings/AppSettings.ts` — parse/clamp/persist settings with
  live mirrors into the audio managers and `GameState.settings`:
  app-shell wiring around a svelte store and one `localStorage` key.
- `src/store/` — svelte stores of `GameState` and app phase; the
  composition root's own state, not engine material.
