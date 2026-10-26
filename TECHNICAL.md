# Drakriddarna — Technical Write-Up

A technical overview of how this project is built, aimed at developers and
developer-adjacent professionals who do **not** work in the games industry.
Where a game-development concept appears, it is explained in general software
terms.

For the game's rules and how to play, see [README.md](./README.md) and
[RULES.md](./RULES.md). For working in this repo, see [AGENTS.md](./AGENTS.md).

## What the project is

Drakriddarna is a browser game that contains a complete tabletop rules engine,
an opponent AI, and a custom 2D renderer — all in plain TypeScript, with no
game engine — deployed as a fully static web page with no server.

Specifically, it is an adaptation of the
[Drakriddarna / Dragonfire](https://boardgamegeek.com/image/4326455/dragonfire)
tactical board game: a turn-based dungeon crawler where a party of heroes
explores a grid dungeon, fights monsters, discovers secrets and treasure, and
works through a chain of scenarios ("dungeons") forming a campaign.

## Tech stack at a glance

| Layer         | Technology                                   | Notes                                                   |
| ------------- | -------------------------------------------- | ------------------------------------------------------- |
| App framework | SvelteKit 1.30 + Svelte 4.2 (static adapter) | Renders to static files; no server at runtime           |
| Language      | TypeScript (strict mode)                     | No `any`, no console, enforced by ESLint                |
| Rendering     | Custom Canvas 2D code                        | No game engine (no Phaser/Three.js), no DOM-based tiles |
| State         | Svelte stores + `localStorage`               | Single serializable `GameState`                         |
| i18n          | sveltekit-i18n (English/Swedish)             | Translation files auto-discovered at build time         |
| Content       | TypeScript-as-data                           | Dungeons, campaigns and AI opponents are code modules   |
| Testing       | Vitest, colocated tests                      | 54 test files, plus headless game benchmarks            |
| Tooling       | Vite, ESLint, Prettier, svelte-check         |                                                         |
| CI/CD         | GitHub Actions → GitHub Pages                | Deploy on push to `main`                                |

The only runtime dependency is `sveltekit-i18n`. Everything else is dev
tooling. (Framework versions above are the locked versions, not the ranges in
`package.json`.)

## Architecture: logic engine behind a thin UI

The single most important architectural rule in this codebase: **game logic is
engine-agnostic TypeScript; the UI is a thin layer on top.**

```
├── src/core/          shared primitives: dice, grid geometry, combat math, logging
├── src/game.ts        central game-logic hub (init, turn flow, save/load)
├── src/dungeon/       dungeon parsing/validation, rendering, lighting
├── src/hero/          hero turn logic and input handling
├── src/monsters/      monster AI: pathfinding, behavior registry, tactics
├── src/items/         item definitions and inventory logic
├── src/events/        event deck (card draw effects)
├── src/campaigns/     campaign content (auto-discovered)
├── src/gameMasters/   difficulty "personalities" (auto-discovered)
├── src/store/         Svelte stores wrapping the game state
├── src/ui/            pure functions that draw UI panels onto canvases
├── src/components/    Dungeon.svelte — the one big canvas component
└── src/audio/         sound effect and music managers
```

The logic modules import nothing from Svelte's rendering side. That separation
is what makes two unusual things possible:

1. **Headless simulation.** The whole game can run with no DOM at all — the
   balance benchmark (see below) plays ~900 complete games in about half a
   minute.
2. **Colocated unit tests.** Most logic modules have a `*.test.ts` next to
   them, testing rules (dice odds, line of sight, monster targeting)
   directly, the way you would test any other business logic.

The UI layer is deliberately thin. Only three `.svelte` components exist; the
game view (`Dungeon.svelte`) owns the canvases and wires input to store calls,
while all actual drawing lives in plain `.ts` modules (`DungeonRendering.ts`,
`MonsterRendering.ts`, `TopBarRendering.ts`, …) that take a canvas 2D context
and the game state as arguments. The same functions are unit-tested by giving
them a stubbed context.

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
cell) plus declarative lists of doors, monsters, items, secrets and lights:

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
the bundle. Because authoring TypeScript modules by hand is a programmer-only
activity, a separate visual Campaign Editor (a Kotlin Multiplatform desktop
app specified in [docs/editor-spec/](./docs/editor-spec/)) is planned to
_generate_ these modules; the game repo requires no changes to consume them.

## Determinism: a seeded RNG everywhere it matters

Gameplay-affecting randomness never calls `Math.random()` directly. All dice
rolls and shuffles go through a swappable RNG in `src/core/dice.ts`
(`setRng` / `createSeededRng`, a small stateful generator in the mulberry32
family). The dice mechanic itself is board-game specific, but the engineering
point is simple: an actor's skill sets the _threshold_ a die must beat, not
the number of dice — so difficulty tuning is a parameter, not a code path.

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

- **Pathfinding** — A\* over the passable grid, 8 directions, Chebyshev
  heuristic, with the goal condition relaxed to "reach a cell adjacent to the
  target hero" rather than the hero's own (occupied) cell
  (`src/monsters/pathfinding.ts`).
- **Line of sight** — ray stepping along the grid
  (`stepAlongLine` / `hasLineOfSight` in `src/core/grid.ts`); ranged attacks
  and sight are blocked by walls, closed doors and (for attacks) figures.
- **Target scoring** — each monster scores every visible hero
  (`behavior/scoring.ts`): expected damage from its dice, path distance,
  "did this hero just attack me", "did I already target them" (spreading
  pressure), and a small random jitter so playthroughs differ.
- **Behavior registry** — monsters pick from named behaviors (aggressive
  charge, defensive hold, ranged kite, …) via eligibility checks and weights
  (`behavior/registry.ts`, definitions in `behavior/definitions/` for orcs,
  trolls, and the four Dark Lords with their distinct fire-spray attacks).
  The board game gives each monster two actions per turn, so every behavior
  is a pair of slots, e.g. `['move', 'melee']` or `['shoot', 'move_away']`.

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

There is no render loop in the classic sense. Rendering is **event-driven and
on-demand**: the canvas repaints when the game state changes or an animation
is active, not every frame. Idle dungeons cost zero CPU.

The scene is composed from several stacked `<canvas>` elements
(ground/tiles, actors, UI overlays) plus offscreen canvases that are never in
the DOM:

- **Tile texture cache** (`TileTextureCache.ts`) — pre-rasterizes tile
  variants once instead of re-drawing sprites every paint.
- **Light mask canvas** — the lighting system (below) composites into an
  offscreen canvas, which is then masked over the scene.
- **Static light layer cache** — lights that never move (fixed torches,
  braziers) are rendered once and cached; only dynamic lights (swaying
  chandeliers, carried items) recompute per animation frame.

Tall props fake height by splitting across layers: a pillar's base tile is
static, while its shaft tile is drawn on the actor layer after monsters and
heroes — so a figure standing in the cell behind a pillar is occluded by the
rising shaft — but before the ambient darkness veil, so unlit shafts darken
with the rest of the scene.

The lighting (`src/dungeon/LightRendering.ts`) is the most graphics-heavy
code in the repo: a 2D visibility technique where each light source casts a
fan of rays (120 per source) that walk the grid cell by cell — jumping from
one boundary crossing to the next, gated by a 1/6-cell sampling resolution
so a cell the ray merely clips never blocks — and stop at opaque cells,
producing a visibility polygon; a radial gradient fills the polygon, with
tunable radius, softness, intensity and colour per source. Per-cell blocking
(walls, pillars, actors, fog of war) is precomputed into an occlusion map
shared by every ray of every light and rebuilt only when the occlusion
state changes; the render loop likewise computes the active light list and
the occlusion cache key once per frame and shares them across its lighting
calls. Lights have effects (`SWAY` — a pendulum-arced moving glow for
chandeliers), alignment (a ceiling light illuminates figures without them
casting shadows), and each dungeon sets an ambient darkness level.
Conceptually this is the same ray-casting idea used in 2D shadow algorithms
generally.

Animations (actor movement, projectiles, damage indicators) are managed as
small state machines in `core/ActorAnimation.ts`, driven by
`requestAnimationFrame` only while an animation is in flight.

## State, persistence and save migration

The entire game lives in one `GameState` object, held in a Svelte `writable`
store (`src/store/gameStateStore.ts`) that also owns input handling glue and
persistence. Saving is `JSON.stringify(state)` to `localStorage`, plus a
separate "reload guard" key that restores an in-progress game across page
reloads.

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
   they cover — dice distributions, LOS edge cases, combat resolution, target
   scoring, store behavior, and even rendering modules against stubbed canvas
   contexts.
2. **Headless game benchmark** (`src/benchmark/`). A bot
   (`benchmark/bot.ts`) plays the hero side with a fixed aggressive policy
   while monster turns run with animation delays disabled. The suite plays
   each benchmarked dungeon against all three Game Masters with 100 seeded
   runs each — 900 complete games — which completes in about 30 seconds on a
   dev laptop (~1,800 games per minute). This is simulation testing applied
   to game _design_, not just code: it answers "is this scenario beatable,
   and do the difficulty tiers actually feel different" with numbers instead
   of vibes. Two caveats keep those numbers honest:

   - The run count is a parameter (`runGameMasterBenchmark({ runs })`); at
     100 runs per cell, a win rate carries roughly ±10 percentage points of
     sampling noise, so treat the table as evidence that the tiers are
     distinct rather than precise absolutes.
   - The bot plays a fixed aggressive policy that no human plays exactly, so
     read the win rates as relative difficulty between tiers, not predicted
     human win rates.

   Win rates measured with `npm run benchmark` at the time of writing
   (re-run it for current numbers):

   | Dungeon                          | StoryTeller (easy) | Tactician (normal) | BrutalOverlord (hard) |
   | -------------------------------- | ------------------ | ------------------ | --------------------- |
   | e1m0 — Troll Cave                | 87%                | 66%                | 34%                   |
   | e1m1 — The Three Gates of Power  | 98%                | 83%                | 72%                   |
   | e2m1 — The Five Mounds of Terror | 95%                | 89%                | 72%                   |

   The same reports include average turn counts, hero casualties (with
   standard deviation), monsters killed, remaining party HP and monster spawn
   counts per Game Master — enough to confirm that the tiers are distinct
   (casualties on e1m0 rise from 0.5 on easy to 2.6 on hard) and to catch a
   tuning change that silently shifts difficulty.

3. **Balance analysis** (`npm run balanceAnalysis`) plus a tuning test that
   pins the BrutalOverlord's numbers.

## Build, CI and deployment

- `npm run build` produces a fully static site via SvelteKit's static adapter
  (all routes prerendered). There is no server component.
- PR checks (`.github/workflows/pr.yaml`): build, lint, type-check
  (`svelte-check`), and unit tests as separate CI jobs.
- Deploys (`.github/workflows/deploy.yaml`): on push to `main` touching
  `src/**`, stamp a `buildInfo.json` (date + commit hash, shown in-game),
  build, and publish to GitHub Pages via `gh-pages`. Deploy to Pages is the
  only side-effecting pipeline step.

## Tradeoffs and known limits

The sections above read like a feature tour, so for balance, here is what the
current design costs:

- **Canvas-only UI and accessibility.** Everything the player sees — the
  dungeon, the hero and monster cards, the event log, even menus — is drawn
  pixels. There is no DOM for screen readers to walk, and beyond the keyboard
  shortcuts for movement there is no keyboard-driven navigation of the
  interface. This is the biggest structural tradeoff in the project: proper
  accessibility would require a parallel DOM representation of the game state
  (at minimum for logs, cards and menus), which the current rendering
  architecture does not provide. No accessibility work has been done yet.
- **One big `GameState`.** A single serializable object makes save/load and
  headless replay trivial, but it has real costs: exactly one save slot,
  no schema versioning (migration is shape-sniffing in `loadState()`), and any
  structural change ripples through every module that takes the state.
  Multiple saves and versioned saves are both on the wishlist.
- **TypeScript-as-data cuts both ways.** Authoring dungeons in TypeScript gets
  you type-checking, refactoring and validation for free — the usual
  config-as-code argument — but it makes content authoring a
  programmer-only activity. That is precisely why the Campaign Editor exists:
  it is a concession that the content pipeline needs a GUI, implemented as a
  code generator rather than a runtime content format.
- **`Dungeon.svelte` is 2,100+ lines.** The "thin UI" rule is honored by the
  rendering modules but the component that wires input, canvases and stores
  has grown into the repo's acknowledged hot spot; splitting it is tracked in
  the README refactor list.
- **Determinism gaps.** A few peripheral random paths are still unseeded (see
  [Determinism](#determinism-a-seeded-rng-everywhere-it-matters)); until
  they are routed through the seeded RNG, only the benchmark's games are
  exactly reproducible, not every real playthrough.
- **Aging framework line.** The project is on SvelteKit 1.x and Svelte 4.
  That is well off the current major versions; an upgrade (Svelte 5 runes in
  particular would change how the store wiring works) is unprioritized work
  with real migration cost.

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
