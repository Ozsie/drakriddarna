# Drakriddarna — Technical Write-Up

A technical overview of how this project is built, aimed at developers and
developer-adjacent professionals who do **not** work in the games industry.
Where a game-development concept appears, it is explained in general software
terms.

For the game's rules and how to play, see [README.md](./README.md) and
[RULES.md](./RULES.md). For working in this repo, see [AGENTS.md](./AGENTS.md).

## What the project is

Drakriddarna ("The Dragon Riders") is a browser adaptation of the
[Drakriddarna / Dragonfire](https://boardgamegeek.com/image/4326455/dragonfire)
tactical board game: a turn-based dungeon crawler where a party of heroes
explores a grid dungeon, fights monsters, discovers secrets and treasure, and
works through a chain of scenarios ("dungeons") forming a campaign.

The interesting engineering part: it is a complete tabletop rules engine, an
opponent AI, and a custom 2D renderer — all in plain TypeScript, with no game
engine, deployed as a fully static web page.

## Tech stack at a glance

| Layer         | Technology                           | Notes                                                   |
| ------------- | ------------------------------------ | ------------------------------------------------------- |
| App framework | SvelteKit 1.x (static adapter)       | Renders to static files; no server at runtime           |
| Language      | TypeScript (strict mode)             | No `any`, no console, enforced by ESLint                |
| Rendering     | Custom Canvas 2D code                | No game engine (no Phaser/Three.js), no DOM-based tiles |
| State         | Svelte stores + `localStorage`       | Single serializable `GameState`                         |
| i18n          | sveltekit-i18n (English/Swedish)     | Translation files auto-discovered at build time         |
| Content       | TypeScript-as-data                   | Dungeons, campaigns and AI opponents are code modules   |
| Testing       | Vitest, colocated tests              | 54 test files, plus headless game benchmarks           |
| Tooling       | Vite, ESLint, Prettier, svelte-check |                                                         |
| CI/CD         | GitHub Actions → GitHub Pages        | Deploy on push to `main`                                |

The only runtime dependency is `sveltekit-i18n`. Everything else is dev
tooling.

## Architecture: logic engine behind a thin UI

The single most important architectural rule in this codebase: **game logic is
engine-agnostic TypeScript; the UI is a thin layer on top.**

```
├── src/core/          shared primitives: dice, grid geometry, combat math, logging, actor animations
├── src/game.ts        central game-logic hub (init, turn flow, save/load)
├── src/dungeon/       dungeon parsing/validation, rendering, lighting, tile texture cache
├── src/hero/          hero turn logic and input handling
├── src/monsters/      monster AI: pathfinding, behavior registry, tactics
├── src/items/         item definitions and inventory logic
├── src/events/        event deck (card draw effects)
├── src/campaigns/     campaign content (auto-discovered)
├── src/gameMasters/   difficulty "personalities" (auto-discovered)
├── src/store/         Svelte stores wrapping the game state
├── src/ui/            pure functions that draw UI panels onto canvases
├── src/components/    Dungeon.svelte — the one big canvas component
├── src/audio/         sound effect and music managers
├── src/combat/        combat effects: damage indicators, blood splatters, projectiles, flames
├── src/input/         input management: touch pan, click handling
├── src/interactables/ interactable objects (braziers, altars, etc.)
├── src/notes/         in-game note taking
├── src/secrets/       secret discovery logic
└── src/menu/          menu system
```

The logic modules import nothing from Svelte's rendering side. That separation
is what makes two unusual things possible:

1. **Headless simulation.** The whole game can run with no DOM at all — the
   balance benchmark (see below) plays hundreds of full games per minute.
2. **Colocated unit tests.** Most logic modules have a `*.test.ts` next to it,
   testing rules (dice odds, line of sight, monster targeting, pathfinding,
   combat resolution) directly, the way you would test any other business logic.
   UI rendering modules are similarly tested with stubbed canvas contexts.

The UI layer is deliberately thin. Only three `.svelte` components exist:
`Dungeon.svelte` (the main game view in `src/components/`), `+layout.svelte`
and `+page.svelte` (SvelteKit route components). `Dungeon.svelte` owns the
layered canvases and wires input to store calls. All actual drawing lives in
plain `.ts` modules (`DungeonRendering.ts`, `MonsterRendering.ts`,
`TopBarRendering.ts`, etc.) that take a canvas 2D context and the game state
as arguments. The same functions are unit-tested by giving them a stubbed
context.

## The domain model

If you have never worked on a grid game, the two ideas that unlock this
codebase are:

**Cells and edge-based walls.** The dungeon is a 2D array of cells. Walls are
not cells; they sit on the _edges between_ cells. This is how the original
board game works (walls printed on tile edges), and it maps to the classic
roguelike representation. Consequence: "is this square passable" and "can you
see from A to B" are two different questions — a diagonal move may be illegal
because two wall segments meet at the corner, and a door blocks sight but not
movement once opened.

**Information hiding (fog of war).** Like most dungeon crawlers, the player
only sees explored areas. Internally this is just flags: rooms and cells are
`discovered` or not, doors can be `hidden` until searched for, monsters in
undiscovered areas exist in state but are not rendered. Exploration is a
first-class game mechanic, not a graphics trick.

Everything else — heroes, monsters, items, doors, secrets, traps, light
sources, event cards — is a plain typed object in a single `GameState`
(`src/types.ts`). The state is fully JSON-serializable, which is what makes
saving, loading and headless replay trivial.

## Content as code, discovered automatically

Campaigns are self-contained folders (`src/campaigns/<id>/`) that define
heroes, a chain of dungeons, an event deck, and their own translation files.
They are registered by a build-time plugin-registry pattern using Vite's
`import.meta.glob`:

```ts
// src/campaigns/index.ts
const campaignModules = import.meta.glob('./*/campaign.ts', { eager: true });
```

Drop a folder in, and it becomes a playable campaign with translations — no
core-code changes, no registration list. The same auto-discovery covers Game
Masters (`src/gameMasters/*/gameMaster.ts`) and all English/Swedish
translation JSON, which are globbed in `src/lib/translations/index.ts` and
deep-merged into i18n namespaces.

Dungeons themselves are authored in a declarative DSL built on plain
TypeScript helpers. A layout is an ASCII string matrix (one character per
cell) plus declarative lists of doors, monsters, items, secrets, lights,
interactables, and pits:

```ts
export const e1m1: Dungeon = defineDungeon({
  name: 'campaign.iceDragon.e1m1.name',
  winConditions: [{ type: ConditionType.KILL_ALL, fulfilled: false }, …],
  layout: {
    grid: [
      '            ######',
      '            #EEEE#',
      …
    ],
    doors: [[Side.UP, 16, 2, { trapped: 2 }], …],
  },
});
```

`src/dungeon/dungeonParser.ts` turns that into the runtime `Dungeon` object,
runs structural validation (`dungeonValidator.ts` — rooms are sealed, doors
sit on walls, win conditions reference real cells), and auto-detects wall
corners so they render correctly without being authored by hand.

There is no runtime loading of external data files: content is compiled into
the bundle. A separate project, the **Drakriddarna Campaign Editor**
(specified in [docs/editor-spec/](./docs/editor-spec/)), is being built as a
Kotlin Multiplatform desktop app that will _generate these TypeScript modules_
from a visual editor — the game repo requires no changes to consume them. A
catalog of the game's shared types is exported for that purpose by
`scripts/export-editor-catalog.ts`.

## Determinism: a seeded RNG everywhere it matters

Gameplay-affecting randomness never calls `Math.random()` directly. All dice
rolls and shuffles go through a swappable RNG in `src/core/dice.ts`
(`setRng` / `createSeededRng`, a small stateful generator in the mulberry32
family). The dice mechanics themselves are board-game specific: a "roll" is
N six-sided dice, filtered by the actor's level (an Apprentice only counts
5s and 6s; a Master counts 3s and above) — i.e. skill changes the _hit
threshold_, not the dice count.

Two payoffs of that discipline:

- **Tests are deterministic.** Tests seed the RNG and assert exact outcomes.
- **Balance is measurable.** The benchmark suite replays identical games and
  compares results across runs, which only means something if the simulation
  is deterministic.

A known gap, tracked in README.md: a few peripheral paths (event deck shuffle
at init, some spawn picks) still use unseeded randomness.

## The opponent: monster AI and "Game Masters"

The monster AI (`src/monsters/`) is worth reading even outside a games
context, because it is a compact example of a **weighted strategy-selection
system**:

- **Pathfinding** — A* over the passable grid, 8 directions, Chebyshev
  heuristic, with the goal condition relaxed to "reach a cell *adjacent to\*
  the target hero" rather than the hero's own (occupied) cell
  (`src/monsters/pathfinding.ts`).
- **Line of sight** — ray stepping along the grid at sub-cell resolution
  (`stepAlongLine` / `hasLineOfSight` in `src/core/grid.ts`); ranged attacks
  and sight are blocked by walls, closed doors and (for attacks) figures.
- **Target scoring** — each monster scores every visible hero
  (`behavior/scoring.ts`): expected damage from its dice, path distance,
  "did this hero just attack me", "did I already target them" (spreading
  pressure), and a small random jitter so playthroughs differ.
- **Behavior registry** — monsters pick from named behaviors (aggressive
  charge, defensive hold, ranged kite, …) via eligibility checks and weights
  (`src/monsters/behavior/registry.ts`, definitions in
  `src/monsters/behavior/definitions/` for orcs, trolls, and the four Dark
  Lords with their distinct fire-spray attacks). Each behavior yields a
  pair of "slots" — **every monster acts twice per turn** —
  e.g. `['move', 'melee']` or `['shoot', 'move_away']`.

On top of that sits the **Game Master** system — the game's name for what
other products call a difficulty director, in the spirit of Left 4 Dead's AI
Director. A Game Master (`src/gameMasters/`) is a data-plus-hooks object that
modifies dice odds, monster AI weights, event deck composition and pacing, and
starting equipment. Three ship with the game: StoryTeller (easy), Tactician
(default), BrutalOverlord (hard). Like campaigns, they are auto-discovered,
and they carry per-monster _director states_ (`EASE`/`PUSH`/`NEUTRAL`) that
shift monster aggression based on party HP — rubber-banding rather than a flat
difficulty multiplier.

## Rendering: hand-rolled 2D, layered and on-demand

There is no traditional 60fps render loop. Rendering is **event-driven and
on-demand**: the canvas repaints when the game state changes, and only uses
`requestAnimationFrame` when animations (actor movement, projectiles, damage
indicators, flame effects, blood splatters, or dynamic lights) are active. A
completely idle dungeon with no animations costs zero CPU.

The scene is composed from several stacked `<canvas>` elements
(ground/tiles, actors, effects, UI overlays) plus offscreen canvases that are never in
the DOM:

- **Tile texture cache** (`TileTextureCache.ts`) — pre-rasterizes tile
  variants (sub-rectangles from sprite sheets) once instead of re-drawing sprites
  every paint.
- **Light mask canvas** — the lighting system (below) composites into an
  offscreen canvas, which is then masked over the scene.
- **Static light layer cache** — lights that never move (fixed torches,
  braziers) are rendered once and cached; only dynamic lights (swaying
  chandeliers, carried items) recompute per animation frame.
- **Multiple render layers** — static geometry, dynamic actors, effect overlays
  (damage indicators, projectiles, flames, blood), and UI are all separate
  canvases, allowing each to redraw independently when its dependencies change.

The lighting (`src/dungeon/LightRendering.ts`) is the most graphics-heavy
code in the repo: a 2D visibility technique where each light source casts a
fan of rays (120 per source, stepped at 1/6-cell resolution) that stop at
opaque cells, producing a visibility polygon; a radial gradient fills the
polygon, with tunable radius, softness, intensity and colour per source.
Lights have effects (`SWAY` — a pendulum-arced moving glow for chandeliers,
`FLICKER` — subtle random brightness variation for torches),
alignment (a ceiling light illuminates figures without them casting
shadows), and each dungeon sets an ambient darkness level. Preset light
configurations (`LightSources.ts`) include `brazier`, `chandelier`, `torch`,
`ember`, and `iceBrazier` for consistent theming. Conceptually this is the
same ray-casting idea used in 2D shadow algorithms generally.

Animations (actor movement, projectiles, damage indicators) are managed as
small state machines in `core/ActorAnimation.ts`, driven by
`requestAnimationFrame` only while an animation is in flight.

## State, persistence and save migration

The entire game lives in one `GameState` object, held in a Svelte `writable`
store (`src/store/gameStateStore.ts`) that also owns input handling glue and
persistence. Saving is `JSON.stringify(state)` to `localStorage`, plus a
separate "reload guard" (`autosave`) key that restores an in-progress game
across page reloads. The state includes heroes, dungeon, monsters, items,
secrets, event deck state, and transient visual effects (damage indicators,
blood splatters, projectiles, flame effects) that are serialized and
cleared on reload.

Save migration is treated as a real concern: `loadState()` rewrites older
save shapes (e.g. it collapses the legacy `difficulty`/`gameMasterId` fields
into today's single `gameMaster` object, and falls back to the default
campaign if the saved `campaignId` no longer exists). Backwards compatibility
with existing saves is maintained in code rather than by versioning saves.

## Internationalization

All user-facing strings — including every log line the game emits — go
through sveltekit-i18n with both English and Swedish. Shared strings live in
`src/lib/translations/{en,sv}/`; campaign- and Game-Master-specific strings
live next to their content and are globbed in automatically. Hardcoding
user-visible text is a lint-enforced no. Campaigns can even append their own
log-message keys to the shared namespace.

## Testing, benchmarks and balance analysis

Three layers of verification:

1. **Colocated unit tests** (Vitest). 54 `*.test.ts` files next to the code
   they cover — dice distributions, grid math, LOS edge cases, combat
   resolution, pathfinding, target scoring, store behavior, dungeon parsing
   and validation, rendering modules against stubbed canvas contexts, and
   all UI rendering modules.
2. **Headless game benchmark** (`src/benchmark/`). A bot
   (`benchmark/bot.ts`) plays the hero side with a fixed aggressive policy
   while monster turns run with animation delays disabled. The suite plays
   each benchmarked dungeon against all three Game Masters, 500 seeded runs
   each, and prints win/loss rates, turn counts, casualties, monsters killed
   and party HP — a statistically meaningful answer to "is this scenario
   beatable, and do the difficulty tiers actually feel different". This is
   simulation testing applied to game _design_, not just code.
3. **Balance analysis** (`npm run balanceAnalysis`) plus a tuning test that
   pins the BrutalOverlord's numbers, ensuring AI changes that silently shift
   difficulty fail CI.

## Build, CI and deployment

- `npm run build` produces a fully static site via SvelteKit's static adapter
  (all routes prerendered). There is no server component.
- PR checks (`.github/workflows/pr.yaml`): build, lint, type-check
  (`svelte-check`), and unit tests as separate CI jobs.
- Deploys (`.github/workflows/deploy.yaml`): on push to `main` touching
  `src/**`, stamp a `buildInfo.json` (date + commit hash, shown in-game),
  build, and publish to GitHub Pages via `gh-pages`. Deploy to Pages is the
  only side-effecting pipeline step.

## Local development

```bash
npm install
npm run dev              # dev server
npm run check            # type-check (svelte-check)
npm test                 # vitest (benchmarks excluded)
npm run benchmark        # headless playability benchmarks
npm run lint             # eslint
npm run prettier:format  # formatting
```

See [AGENTS.md](./AGENTS.md) for the authoritative command list and repo
conventions.

## Worth stealing

Even if you never touch games, a few techniques here generalize well:

- **Deterministic core, seeded RNG injection** — makes simulation logic
  testable and lets you build replay/benchmark tooling on the same code that
  ships.
- **Auto-discovery registries via `import.meta.glob`** — drop-in extension
  folders (content + translations together) without maintaining registration
  lists; the plugin pattern without a plugin loader.
- **Headless benchmarking as a design tool** — running hundreds of simulated
  sessions to validate tunable parameters is applicable to any system with
  emergent behavior (load tests, pricing simulators, agent systems).
- **Save migration in the loader** — a practical pattern for evolving a
  client-side persisted schema with zero infrastructure.
- **On-demand rendering** — composited layered canvases that repaint only on
  change; a reminder that a 60fps loop is not a requirement for interactive
  graphics.
