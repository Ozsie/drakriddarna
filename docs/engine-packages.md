# The HOARD engine

This document is the spec for extracting the game-agnostic parts of this
codebase into HOARD — a modular engine set of standalone packages, alongside
the existing UI kit. HOARD stands for either 'Hackable Open Architecture for
Reusable Dragonfire-games' or 'Heroic Objects, Actions, Rules and Data'. The
packages are published under the `@hoard/*` scope. The spec defines the target
package map, the dependency rules that keep the packages independent,
per-package extraction requirements, and the order of work. The packages are
genre-neutral: pure computation (grid,
lighting, dice), pure I/O abstractions (audio, saves), and pure rendering
(primitives, UI chrome, scene). Everything genre- or content-specific stays in
this repository.

This is a target architecture, not a description of current state: today
everything lives in `src/`, coupled through the shared `GameState` type, the
`$lib/translations` i18n singleton, direct audio imports, and colocated
rendering. Each package section names the coupling that must be removed first.

## Package map

```
@hoard/rng        seedable RNG + dice
@hoard/grid       cells, line of sight, doors, pathfinding (callback-driven)
@hoard/lighting   light sources, propagation, light maps
@hoard/audio      sample playback + intensity-driven crossfade
@hoard/saves      versioned save framework + migration registry
@hoard/directors  hook/dispatch framework for game-master-style directors
@hoard/time       day/cycle/season calendar (future; see Future candidates)
@hoard/primitives text, geometry, clipping, theme tokens
@hoard/uikit      UI chrome: widgets, components       (exists as src/uikit/)
@hoard/scene      world canvas: tiles, walls, light composite, sprites, VFX
game              logic + content + adapters             (this repo)
```

Dependency graph — nine leaves, one composition root:

```
@hoard/rng        (deps: none)
@hoard/grid       (deps: none)
@hoard/lighting   (deps: none; takes a blocker callback)
@hoard/audio      (deps: none)
@hoard/saves      (deps: none; game registers migrators)
@hoard/directors  (deps: none)
@hoard/primitives (deps: none)
@hoard/uikit      (deps: @hoard/primitives)
@hoard/scene      (deps: @hoard/primitives)
game              (deps: all — the only node with edges)
```

The only inter-package edges are the deliberate ones into `@hoard/primitives`,
extracted under the two-consumer rule (uikit and scene both draw). Do not add
edges between the other leaves.

## Dependency rules

1. **Consumer-defined contracts.** Packages never import each other. Each
   package declares the minimal input interface it accepts, and TypeScript's
   structural typing keeps producers compatible without a shared import. `scene`
   does not import `@hoard/lighting` — it declares its light-map input type;
   `@hoard/grid`-based pathfinding takes a `canPass(x, y)` callback instead of a
   grid import. Producers and consumers share data shapes, not dependency
   edges.
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
   test asserting its external import set is exactly `{@hoard/primitives}` (or
   empty), a completeness test on its public surface, and sentinel tests
   against leaked i18n literals and browser/global APIs.

## Package specifications

### @hoard/rng — source: `src/core/dice.ts`

Seedable RNG + dice rolls, deterministic and testable. Coupling: imports only
the `Level` enum. Extraction is near-free: accept difficulty as a value instead.
This is the reference extraction — do it first to establish the package layout,
boundary-test pattern, and publishing workflow.

### @hoard/audio — source: `src/audio/`

`SoundEffectManager` (sample playback, volume) and `MusicManager` +
`MusicIntensity` (crossfade between tracks driven by an intensity value).
Coupling: `$app/paths` (inject the asset base path, as uikit does with `UiEnv`)
and type-only imports. The game keeps the sound-cue table (which event plays
which sample) and any intensity heuristic. Extraction forces the broader
inversion: today 12 logic modules import the `soundEffectManager` singleton
directly; logic should emit sound-cue data and the game's adapter maps cues to
samples.

### @hoard/primitives — source: `src/uikit/primitives/`

The shared drawing layer (text, geometry, clipping) plus the theme-token
contracts. Kept in-repo under the two-consumer rule until `scene` exists;
scene's extraction is the second consumer that justifies it.

### @hoard/grid — source: `src/core/grid.ts`, `src/dungeon/cornerDetection.ts`,

`src/dungeon/sealedCornerGrid.ts`, `src/monsters/pathfinding.ts`

Cells, line of sight, door blocking, corner detection. `grid.ts` is close to
clean (one type import). `pathfinding.ts` is not: it imports hero logic and
behavior scoring, so the pure pathfinder must accept injected cost/targeting
callbacks. Split it: algorithm in the package, game-specific scoring stays in
the game and is injected.

### @hoard/lighting — source: `src/dungeon/LightSources.ts` + the computation

half of `src/dungeon/LightRendering.ts`

Light sources on a tile grid, propagation, falloff, per-cell light level,
blockers via a callback. The roughly 2,000 lines of gradient/canvas compositing
in `LightRendering.ts` move to `scene` instead — the engine package outputs a
light map that `scene` renders.

### @hoard/saves — source: `src/saveMigration.ts`, `src/saves/`

Versioned save schema and ordered migrations. Coupling: migrations currently
resolve monster templates directly; replace with a migrator-registry interface
the game populates. The package ships the framework (version stamps, ordered
migration pipeline, validation); the game ships its migrators.

### @hoard/directors — source: `src/gameMasters/` (types, hook dispatch, alias

resolution)

The hook/dispatch shell for director-style systems: hook types, an event
dispatcher, id/alias resolution. The concrete game masters and all their texts
are game content and stay in the game. The framework is cadence-agnostic: this
game uses turn-bound hooks; a real-time consumer would register interval-based
ones.

### scene — source: the world-rendering files scattered today:

`src/dungeon/DungeonRendering.ts`, `TileTextureCache.ts`, `TilesetLogic.ts`,
`WallRendering`/`DoorRendering`/`TerrainRendering`, the render half of
`LightRendering.ts`, `src/core/ActorSpriteRendering.ts` +
`ActorAnimation.ts`, `src/monsters/MonsterRendering.ts`,
`src/combat/DamageIndicatorRendering.ts`

The world canvas renderer: draw-ordered layer compositing (terrain →
walls/doors → actors → light → VFX), tileset handling with texture caching and
corner rules, sprite animation timelines, and effect lifecycles driven by
effect descriptors. Consumes only plain view models — tile grids, light maps,
actor sprites, effect descriptors — never `GameState`, `Monster`, or any game
type. The game keeps the adapters (today's `src/ui/viewmodels/` role) and all
assets. `scene` and `uikit` are siblings: neither imports the other, and nothing
engine-side imports either, keeping headless benchmarks canvas-free.

## Prerequisites (cross-cutting)

These apply to most packages and are the bulk of the real work. They mirror
what uikit already did with `UiEnv.t`:

- **Split `GameState`.** Separate engine-level state (grid, actors, turn
  counter, RNG seed, timers) from game data (heroes, items, dungeon content).
  Each package then consumes only its own slice, passed in by the game.
- **Inject i18n.** `$lib/translations` is imported by logic modules
  (`core/logger.ts`, `core/combat.ts`, `MonsterLogic`, `TerrainLogic`, ...).
  Logic emits message data through an injected log/message provider.
- **Invert audio.** Replace direct `soundEffectManager` imports in logic with
  sound-cue data plus a game-side adapter.
- **Separate compute from render.** Rendering files colocated in logic
  directories move to `scene`; logic emits data (animation/sound/effect events)
  that presentation consumes.

## Extraction order

Ordered by how clean the split already is — clean splits first, inversions
later:

1. `@hoard/rng` — near-free; establishes the package pattern and tooling.
2. `@hoard/primitives` — exists already as `uikit/primitives/`; mechanical.
3. `@hoard/audio` — small files; requires the asset-path injection. Also
   unlocks the audio-cue inversion across the 12 importing modules.
4. `@hoard/grid` — clean once pathfinding takes callbacks.
5. `@hoard/lighting` — requires the compute/render split of `LightRendering.ts`.
6. `@hoard/saves` — requires the migrator registry.
7. `@hoard/directors` — framework only; content stays.
8. `scene` — last and largest: needs the render/logic separation complete and
   view-model contracts in place. Camera/viewport and map streaming are
   out-of-scope extensions for a future consumer, not part of the extraction.

## What stays in the game

Turn pipeline, combat, hero/item/event/secret/interactable logic, the dungeon
authoring DSL and its parser/validator, all campaigns, game masters, monsters,
and every user-facing string and asset. Content is human-authored per the AI
policy; the packages contain no game content by construction.

## Future candidates

- `@hoard/time` — a game clock/calendar leaf (day length, cycles, seasons) that
  feeds lighting levels and audio intensity. Listed as a candidate, not part of
  the initial set; it has no source code to extract yet.
