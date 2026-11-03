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

| Layer         | Technology                           | Notes                                                   |
| ------------- | ------------------------------------ | ------------------------------------------------------- |
| App framework | SvelteKit + Svelte (static adapter)  | Renders to static files; no server at runtime           |
| Language      | TypeScript (strict mode)             | No `any`, no console, enforced by ESLint                |
| Rendering     | Custom Canvas 2D code                | No game engine (no Phaser/Three.js), no DOM-based tiles |
| State         | Svelte stores + `localStorage`       | Single serializable `GameState`                         |
| i18n          | sveltekit-i18n (English/Swedish)     | Translation files auto-discovered at build time         |
| Content       | TypeScript-as-data                   | Dungeons, campaigns and AI opponents are code modules   |
| Testing       | Vitest, colocated tests              | Plus headless game benchmarks and balance analysis      |
| Tooling       | Vite, ESLint, Prettier, svelte-check |                                                         |
| CI/CD         | GitHub Actions → GitHub Pages        | Deploy on push to `main`                                |

The only runtime dependency is `sveltekit-i18n`. Everything else is dev
tooling.

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
├── src/saves/         named-save storage (index + blobs in localStorage)
├── src/store/         Svelte stores wrapping the game state and the app phase
├── src/settings/      app-level audio settings (persistence + live application)
├── src/uikit/         game-agnostic canvas UI kit (theme tokens, primitives, kit widgets, components; publishes through index.ts)
├── src/ui/            pure functions that draw UI panels onto canvases
├── src/components/    Dungeon.svelte (thin shell) + DungeonBoardController
└── src/audio/         sound effect and music managers
```

The logic modules import nothing from Svelte's rendering side. That separation
is what makes two unusual things possible:

1. **Headless simulation.** The whole game can run with no DOM at all — the
   balance benchmark (see below) plays hundreds of complete games in about
   half a minute.
2. **Colocated unit tests.** Most logic modules have a `*.test.ts` next to
   them, testing rules (dice odds, line of sight, monster targeting)
   directly, the way you would test any other business logic.

The UI layer is deliberately thin. Only three `.svelte` components exist; the
game view (`Dungeon.svelte`) is pure reactive glue — it derives state from the
stores and forwards it to `DungeonBoardController`, a colocated plain-TS class
that owns the canvases, the layered render loop, pan/drag/touch handling and
all pointer/keyboard dispatch. The controller's pure decision parts are
extracted into colocated modules with their own tests
(`DungeonBoardSignatures.ts` — dirty-check keys gating each render layer,
`DungeonBoardUiHit.ts` — the ordered "which UI element is under the pointer"
cascade with injectable hit-testers, `DungeonBoardHover.ts` — the hover state
machine as pure reducers). All actual drawing lives in plain `.ts` modules
(`DungeonRendering.ts`, `MonsterRendering.ts`, `TopBarRendering.ts`, …) that
take a canvas 2D context and the game state as arguments; the same functions
are unit-tested by giving them a stubbed context.

One consequence of this split deserves emphasis: Svelte's reactivity cannot
see mutations of controller state, so everything the template renders is
either a DOM binding or set directly by the controller. Anything that looks
like interpolated controller state in the template is computed once and
silently goes stale — the mouse cursor is the canonical example: the
controller writes it onto the canvas element itself, and the template carries
only a static initial value.

The canvas HUD also adapts to narrow screens (phones) through a "compact UI"
mode (`src/ui/UiMode.ts`): the corner panels collapse into small square
buttons that open the full panel on press, and of the hero and monster card
rows only the active actor's card is drawn. The open/closed state of the
compact panels lives in the board controller, which passes the effective
collapsed flag to the same layout functions used for hit-testing, so drawing
and input can never disagree.

## The welcome screen and the app phase

The app does not boot straight into a campaign. A tiny store outside
`GameState` (`src/store/appPhaseStore.ts`) holds the **app phase** —
`'welcome'` or `'game'` — plus the welcome screen's active sub view. On boot,
`getInitialState()` either resumes the reload guard (phase `'game'`) or leaves
the game state store holding `null` with the phase at `'welcome'`: no campaign
is initialized until the player starts or loads one. The phase itself is
never persisted, so a fresh visit always starts at the welcome screen; the
reload guard remains the only thing that resumes a run automatically.

The welcome screen follows the same layered-canvas pattern as the game UI:
pure layout/hit/render modules (`src/ui/WelcomeRendering.ts`,
`SettingsRendering.ts`, `HeroSelectionRendering.ts`) draw the background and
panels, and while the phase is `'welcome'` the board controller renders these
instead of any gameplay UI and routes all pointer/keyboard input to them —
board input, the HUD and gameplay handlers are fully gated off.

The New Game flow gains a **hero-selection step**: the player picks
1–`Campaign.maxHeroes` heroes from the campaign roster (the `maxHeroes` field
is optional and defaults to the roster size) and can rename them. Renamed
heroes keep the roster `id` (so saves keep resolving) and display the typed
name; the selection reaches `init()` as an optional `heroes` override, and the
registered campaign singletons are never mutated.

The welcome screen is also the main menu: the top bar's Menu button opens
it (the run stays in the store, so its Continue button — shown only while a
run is ongoing, like the Save button — returns to the game), the campaign
end screen dismisses into it, and it owns the former menu items (new game,
save/load, language, the debug on/off switch and the credits). The canvas
menu that remains is the **debug menu** (its event-picker sub view
included), opened from the top bar's Debug button. Debug mode is a
development tool gated by `isDebugModeAvailable()`
(`src/settings/debugMode.ts`, built on `$app/environment`'s compile-time
`dev` flag): production builds hide the settings toggle and the Debug
button — and never activate debug mode from a save or persisted setting —
so the debug menu cannot be used to cheat on a deployed build.

App-level settings (music and sound effects on/off plus their volumes, and
the debug on/off switch) live in `src/settings/AppSettings.ts`, persisted
under `localStorage['appSettings']` and applied live to the audio managers.
The `musicOn` and `debugOn` settings are the single source of truth for
music and debug mode: each mirrors into its `GameState.settings` field
one-directionally whenever a game state exists — so loading a save never
overwrites the app setting — which keeps saves self-contained while the
welcome screen's settings rows simply flip the app settings. A run started
or loaded while debug is toggled on runs in debug mode.

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
cell) plus declarative lists of doors, monsters, items, secrets, lights and
terrain cells:

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

The full authoring reference for both content types lives in
[docs/campaign-definition.md](./docs/campaign-definition.md) (the
`Campaign` type, campaign folders, shared vs. campaign-owned content) and
[docs/dungeon-definition.md](./docs/dungeon-definition.md) (the `Dungeon`
type, the `defineDungeon`/`defineLayout`/`parseTileMap` DSL, win conditions
and validation rules).

There is no runtime loading of external data files: content is compiled into
the bundle. Because authoring TypeScript modules by hand is a programmer-only
activity, a separate visual Campaign Editor (a Kotlin Multiplatform desktop
app specified in [docs/editor-spec/](./docs/editor-spec/)) is planned to
_generate_ these modules; the game repo requires no changes to consume them.

One campaign breaks the "authored by hand" rule on purpose: `brogue` is
_generated at load time_ by a deterministic, Brogue-inspired dungeon
generator (`src/campaigns/brogue/generator/`, specified in
[docs/random-campaign-spec/](./docs/random-campaign-spec/)). A fixed campaign
seed drives a rejection-sampling loop that grows organic room blobs on a
jittered lattice, carves a spanning tree of doorways, and populates each floor
from a depth table — monster XP budgets shaped to the hero level curve,
progressively better loot, one light per room on floors that get strictly
darker every level, and thematic blockers placed so they never wall in a
monster, item or hero. A checked-in fallback seed, verified by tests, means
app start can never throw. Same auto-discovery, same validation — the
generator is just another campaign folder whose dungeons happen to be built
by code.

## Determinism: a seeded RNG everywhere it matters

Gameplay-affecting randomness never calls `Math.random()` directly. All dice
rolls and shuffles go through a swappable RNG that lives in the first
extracted HOARD engine package, `@hoard-engine/rng` (published on npm and
consumed as a dependency): `setRng` / `createSeededRng`, a small stateful
generator in the mulberry32 family, plus a d6 success roll that takes the
success threshold as a plain number. `src/core/dice.ts` is a thin game-side
facade that maps the hero `Level` enum to that threshold and re-exports the
package. The dice mechanic itself is board-game specific, but the engineering
point is simple: an actor's skill sets the _threshold_ a die must beat, not
the number of dice — so difficulty tuning is a parameter, not a code path.

Two payoffs of that discipline:

- **Tests are deterministic.** Tests seed the RNG and assert exact outcomes.
- **Balance is measurable.** The benchmark suite replays identical games and
  compares results across runs, which only means something if the simulation
  is deterministic.

Every gameplay-affecting random path — dice, shuffles, behavior selection,
spawn and event-effect picks, monster temperament — runs through the seeded
rng; only visual effects (particles) and DOM element ids still use unseeded
randomness, and they have no gameplay effect. Note the limit of that claim: a
seed reproduces the _random sequence_, not the playthrough. Reproducing a
full human playthrough additionally requires recording and replaying its
input events — the benchmark achieves this by driving the game from code,
while a browser session records nothing.

The seeded rng is also exposed to players as a feature: the new-game dialog
has a **speedrunner mode** checkbox with an rng seed input. Ticking it stores
the seed in `state.speedrunSeed` and `init()` swaps the rng to a seeded
generator before the first shuffle, so two runs with the same seed deal the
same decks; loading a save re-applies its seed, and a normal (unseeded) run
resets the rng to fresh randomness.

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
difficulty multiplier. The full field-by-field reference for the `GameMaster`
type lives in [docs/gameMaster-definition.md](./docs/gameMaster-definition.md).

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

Terrain cells (water, lava, …) are declarative floor materials: each cell
tints the floor, can carry a light (lava glows through the same lighting
system as torches), and can be configured with gameplay effects — damage on
entering the cell, damage on ending a turn standing in it, and a per-cell
movement cost (`src/dungeon/TerrainLogic.ts`). The damage is environmental,
bypassing the armour and shield rolls of combat, and applies to heroes and
monsters alike. Built-in materials also animate (drifting wave crests on
water, a pulsing glow on lava), drawn on the dynamic layer above the lit
scene but below the actors, so figures wading stand on top of the shimmer.

Rooms and corridors can be filled with atmospheric fog (`roomFog`,
`src/dungeon/RoomFogLogic.ts`), declared per grid letter: an undulating
translucent cloud over every discovered cell of the room, drawn above actors
and pillar shafts but below the darkness veil. Fog is visual by default but
can be configured to damage actors entering or ending their turn in the room
(e.g. poison gas), reusing the same environmental damage path as terrain. It
also interacts with lighting in two configurable ways: a `density` erases that
fraction of the light mask inside the fog, dimming glows that shine into the
room and letting the ambient darkness veil close in, while `blocksLight` fog
instead marks the room's cells as fog in the occlusion map — no light enters
the room at all, exactly like undiscovered fog of war.

Performance of the always-animating effects gets the same treatment
everywhere: expensive output is rasterized once and only blitted afterwards.
The blurred fog cloud and light-dim mask of every fogged room are rasterized
once per fog state; every light whose glow geometry is fixed is baked into a
small offscreen sprite at full resolution and per frame is a single
alpha-scaled `drawImage`; and the visibility-polygon cache underneath is keyed
by the light's stable geometry rather than object identity, so recreating
derived lights as fresh objects every pass stays cheap. Ambient redraws are
driven by a quantized animation signature instead of the frame clock: each
animated effect contributes its stepped visible output, and the dynamic layer
only clears and repaints when the signature actually changes — a flickering
brazier repaints only a handful of times per second. Continuous effects
(sweeping beams, twinkling sparkles) are capped below display rate by a
minimum-interval gate, while actor-driven frames (movement, projectiles)
always run at full rate.

The lighting (`src/dungeon/LightRendering.ts`) is the most graphics-heavy
code in the repo: a 2D visibility technique where each light source casts a
fan of rays that walk the grid cell by cell — jumping from one boundary
crossing to the next, gated by a sampling resolution so a cell the ray merely
clips never blocks — and stop at opaque cells, producing a visibility
polygon; a radial gradient fills the polygon, with tunable radius, softness,
intensity and colour per source. Per-cell blocking (walls, pillars, actors,
fog of war) is precomputed into an occlusion map shared by every ray of every
light and rebuilt only when the occlusion state changes. Lights have effects
(`SWAY` — a pendulum-arced moving glow for chandeliers), alignment (a ceiling
light illuminates figures without them casting shadows), and each dungeon sets
an ambient darkness level. Two kinds are derived at runtime from the game
state — every living hero carries a torch at the belt, and every closed,
non-hidden door casts a faint glow onto the floor in front of it — both riding
the same pipeline as placed lights. Conceptually this is the same
ray-casting idea used in 2D shadow algorithms generally.

Animations (actor movement, projectiles, damage indicators) are managed as
small state machines in `core/ActorAnimation.ts`, driven by
`requestAnimationFrame` only while an animation is in flight. Screen shakes
(`shakeEffects`, `src/combat/CombatEffects.ts`) are transient state effects,
but render differently: the board controller jitters the world canvases with a
CSS `translate` per frame while a shake runs — cached layers are never redrawn
for it, and the UI canvas stays steady.

## Adaptive music

Music intensity is derived from the game state, not baked into the game
logic. A pure selector (`src/audio/MusicIntensity.ts`) computes the current
intensity — 'explore' or 'tension' — from the distance between the nearest
alive monster in a discovered room and the heroes, comparing against an
enter and an exit range. The gap between those ranges is hysteresis: the
music does not flip back and forth on every monster step. The board
controller calls the selector on each state update and hands the result to
`MusicManager`, which crossfades between the dungeon's registered explore and
tension tracks — `music` and `musicTension` on the dungeon, with global
defaults when omitted. Since the selector is pure and deterministic, it is
unit-tested like any other logic module while the manager stays a thin
browser-side effect.

## Scenario scoring

On top of the win conditions sits a small scoring meta-game
(`src/core/scoring.ts`): when a dungeon's win conditions are first
fulfilled, the state is snapshotted into a score breakdown — remaining hero
health, the experience of monsters the heroes killed, points for items
picked up, secrets found, minus a per-round penalty — and added to a running
campaign total. Two details make it deterministic and double-count-proof:
monster kills and item pickups accumulate on the dungeon _as they happen_
(hero XP is spent on levels, so it cannot serve as the source), and the award
is guarded by the dungeon's `beaten` flag, so re-checking an already-won
scenario or reloading a save never adds the score twice. The breakdown is
shown on the between-dungeons screen and the campaign total as a chip in the
top bar; both are plain `GameState`/`Dungeon` fields, so they persist in
saves without a migration.

When the _last_ dungeon of a campaign is beaten, the same overlay opens on a
`campaignComplete` step instead of the between-dungeons progression: the
campaign score, aggregate statistics, and a table with one row per completed
scenario and one row per hero, built from per-scenario score records appended
to the state as each scenario ends.

The same overlay also serves as the **party-wipe screen** (`partyWipe` step):
when every hero falls, the turn flow opens it instead of silently resetting,
and the player picks between restarting the campaign from scratch, retrying
the dungeon — which rewinds to the last autosave and zeroes the whole party's
XP and levels, per the official defeat rules — or loading a save. The wipe
screen also shows the campaign's **high score list**
(`src/saves/HighScoresLogic.ts`): a per-campaign top 10 persisted under its
own `localStorage` key, recorded whenever a campaign is completed.

Next to the score sits a wall-clock **campaign timer**
(`src/core/timer.ts`, kept in `state.timer`): each dungeon's timer starts when
its intro screen is closed and stops when the between-dungeons overlay opens,
and the accumulated campaign time is shown on the campaign-complete screen.
Like the score it is pure presentation data — nothing in the game logic
reads it — and it persists in saves without a migration; serialization
points checkpoint the running segment into the accumulated time, and loading
rebases it, so the offline gap between saving and loading is never counted.
In speedrunner mode the top bar also shows the live dungeon time as a chip
next to the score.

## State, persistence and save migration

The entire game lives in one `GameState` object, held in a Svelte `writable`
store (`src/store/gameStateStore.ts`) that also owns input handling glue and
persistence. While the welcome screen is up the store holds `null` — no game
exists yet (see "The welcome screen and the app phase" above). Manual saves
are user-named and unlimited: canvas-drawn centered modal dialogs open with a
name input on save and a list of saves on load, and starting a new game uses
a sibling dialog with selectable campaign and game-master columns plus the
speedrunner checkbox and its seed input. While any of these modal surfaces
is open — the canvas debug menu, the save/load or new-game dialog, the dungeon
intro, or the between-dungeons overlay (party wipe and campaign win
included) — gameplay keyboard/touch input is suppressed through the input
manager, so no keystroke reaches the heroes. Storage lives in
`src/saves/SavesLogic.ts` — a JSON index of save metadata under one
`localStorage` key plus one full `GameState` blob per save, so listing saves
never parses the blobs. Alongside the manual saves, an `autosave` key is
refreshed on turn transitions and a separate "reload guard" key restores an
in-progress game across page reloads.

Save migration is treated as a real concern and is versioned: the state
schema carries a `saveVersion`, and `loadState()` runs the ordered,
individually unit-tested migration steps in `saveMigration.ts` (e.g.
collapsing the legacy `difficulty`/`gameMasterId` fields into today's single
`gameMaster` object) before falling back to the default campaign if the saved
`campaignId` no longer exists. Backwards compatibility with existing saves is
maintained in code rather than by an export/import cycle.

## Internationalization

All user-facing strings — including every log line the game emits — go
through sveltekit-i18n with both English and Swedish. Shared strings live in
`src/lib/translations/{en,sv}/`; campaign- and Game-Master-specific strings
live next to their content and are globbed in automatically. Hardcoding
user-visible text is a lint-enforced no. Campaigns can even append their own
log-message keys to the shared namespace.

Monster display names are translation keys composed per type and colour: the
monster template registry carries each type's base key and `createMonster`
appends the instance colour. Built-in monsters resolve against the shared
`monsters` namespace (`monsters.orc.green` in
`src/lib/translations/{en,sv}/monsters.json`), campaign-defined monsters
against their own translation files. The four dark lord types share a single
`monsters.darkLord` base key — the colour suffix already distinguishes them.
Legacy saves carrying raw English names are rewritten to keys by a save
migration on load.

## Testing, benchmarks and balance analysis

Three layers of verification:

1. **Colocated unit tests** (Vitest). `*.test.ts` files next to the code they
   cover — dice distributions, LOS edge cases, combat resolution, target
   scoring, store behavior, rendering modules against stubbed canvas
   contexts, and the board's extracted UI decision logic (render dirty-check
   signatures, the hit-test cascade, the hover state machine).
2. **Headless game benchmark** (`src/benchmark/`). A bot
   (`benchmark/bot.ts`) plays the hero side with a fixed aggressive policy
   while monster turns run with animation delays disabled. The suite plays
   each benchmarked dungeon against all three Game Masters with seeded runs —
   hundreds of complete games in about half a minute on a dev laptop. This is
   simulation testing applied to game _design_, not just code: it answers "is
   this scenario beatable, and do the difficulty tiers actually feel
   different" with numbers instead of vibes. Two caveats keep those numbers
   honest:

   - At any practical run count the win rates carry meaningful sampling
     noise, so treat the table as evidence that the tiers are distinct
     rather than precise absolutes.
   - The bot plays a fixed aggressive policy that no human plays exactly, so
     read the win rates as relative difficulty between tiers, not predicted
     human win rates.

   The same reports include average turn counts, hero casualties, monsters
   killed, remaining party HP and monster spawn counts per Game Master —
   enough to catch a tuning change that silently shifts difficulty. Run
   `npm run benchmark` for current numbers.

3. **Balance analysis** (`npm run balanceAnalysis`) plus a tuning test that
   pins the BrutalOverlord's numbers. The harness also models mid-campaign
   parties: `runSingleGame({ heroExperience })` grants every hero the exact
   XP earlier floors would have yielded before levelling them, so the
   generated campaign's 10 floors can each be benchmarked as floor N of a
   run rather than as a first dungeon.

## The canvas UI kit

The in-project canvas UI kit (`src/uikit/`, reference for consumers in
[docs/ui-kit.md](./docs/ui-kit.md), migration history in
[docs/ui-kit-inventory.md](./docs/ui-kit-inventory.md)) is a game-agnostic
layer — theme tokens, primitives, kit widgets and components — extracted
from the game's chrome rendering. The boundary is enforced in both
directions by lint and an import-graph test: the kit imports no game code,
no Svelte and no i18n packages, and game-logic modules never import the kit,
so headless benchmarks stay canvas-free.

Components are driven by plain view models: the component in
`src/uikit/components/` does layout, semantic hit testing and rendering, the
adapter in `src/ui/viewmodels/` is the only GameState/AppSettings/campaign
reader, and a game-side facade keeps the historical entry points so the
controller and hit cascade work unchanged. The kit ships no default strings
and no style literals — labels arrive through a `UiEnv` translator, colors
and fonts through theme tokens — and `src/uikit/index.ts` is its deliberate
public surface, checked by a completeness test.

A verification net guards the extraction: a recording context (a stub
`CanvasRenderingContext2D` that logs every call with a deterministic
`measureText`), parity snapshots that render every chrome renderer against
real seeded `init()` game states and pin the recorded call log
byte-identically, a ratcheting style-literal budget, and a sentinel-theme
test that fails on any color or font not coming from a token.

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
  headless replay trivial, but it has real costs: the saved blob is large, and
  any structural change ripples through every module that takes the state.
  Migration is versioned and tested now, but the single object still couples
  everything that touches it.
- **TypeScript-as-data cuts both ways.** Authoring dungeons in TypeScript gets
  you type-checking, refactoring and validation for free — the usual
  config-as-code argument — but it makes content authoring a
  programmer-only activity. That is precisely why the Campaign Editor exists:
  it is a concession that the content pipeline needs a GUI, implemented as a
  code generator rather than a runtime content format.
- **The board's DOM glue is concentrated in one class.** `Dungeon.svelte`
  was once a monolith and is now a thin reactive shell, but the extracted
  `DungeonBoardController` still bundles the render loop, canvas setup, pan
  handling and input dispatch. Its pure decision parts (hover state,
  hit-test cascade, render signatures) are extracted into colocated modules
  and unit-tested; the glue itself needs a real DOM and remains untested.
- **Determinism only as deep as the state.** All gameplay randomness is
  seeded, but a real playthrough is still not bit-reproducible end to end
  unless every input event is also recorded and replayed — the benchmark
  achieves it by driving the game from code, a human session does not.
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
