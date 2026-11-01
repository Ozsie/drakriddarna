# UI Kit Inventory (M1)

The module-by-module inventory behind the UI-kit migration
([spec](./ui-kit-spec/)), produced by milestone M1. It records, for every
renderer, what game knowledge it holds today: the `GameState` fields it
reads, the logic modules it imports, its `i18n()` calls, asset imports and
style-literal counts, and how its layout, hit-testing and input are
coupled. The migration (M2–M5) drains exactly these columns, one module per
PR.

Style-literal counts come from the budget test
(`src/ui/literalBudget.test.ts`, scanner in
`src/uikit/testing/literalBudget.ts`): color literals and font literals in
plain string literals, non-test files.

## Classification

### Chrome — in scope

Everything the player reads as interface: the top bar, cards, corner
panels, menus, dialogs and full-screen flows. These move into
`src/uikit/components/` over M5.

| Module                                    | GameState reads                                                                                                                                                                     | Logic imports                                                                                                                                             | `i18n()`                 | Assets / notes                                                      | Colors / fonts | Input & hit coupling                                                                                                                                                |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/ui/TopBarRendering.ts`               | `turnCount`, `score`, `actionLog`, `speedrunSeed`, `timer` (via `getCurrentDungeonTimeMs`)                                                                                          | `core` (i18n, formatDuration, timer), `UiMode`                                                                                                            | 5                        | none                                                                | 30 / 2         | layout + hit + render triple; compact chips                                                                                                                         |
| `src/ui/HeroCardRendering.ts`             | `currentActor`, `targetActor`, heroes via `liveHeroes`; hero: `actions armour colour equipment experience health inventory isInventoryOpen level movement moves name shield weapon` | `hero/HeroLogic`, `core` (i18n), `items/ItemLogic`, `items/ItemSpriteRendering` (drawItemSprite), `UiMode`                                                | 16                       | item sprites via `drawItemSprite`                                   | 27 / 11        | triple; owns shared helpers `drawRoundedRect`, `measureTextWidth`, `truncateText`, `isPointInBounds`                                                                |
| `src/ui/MonsterCardRendering.ts`          | `currentActor`, `targetActor`, monsters via `findVisibleMonsters` (`dungeon.layout.monsters`, `discoveredRooms`)                                                                    | `monsters/MonsterLogic`, `core` (i18n), `UiMode`                                                                                                          | 6                        | none                                                                | 9 / 3          | triple; compact mode keeps only the active actor's card                                                                                                             |
| `src/ui/DiaryAndWinConditionRendering.ts` | `dungeon.winConditions`, `dungeon.killCount`, `dungeon.layout.notes`, `turnCount`                                                                                                   | `types` (ConditionType), `core` (i18n), `HeroCardRendering` (drawRoundedRect), `UiMode`                                                                   | 10                       | none                                                                | 21 / 5         | triple; owns shared `wrapText`; collapses to a corner square in compact mode                                                                                        |
| `src/ui/EventCardRendering.ts`            | `currentEvent`, `eventDeck`                                                                                                                                                         | `core` (i18n), `HeroCardRendering` (drawRoundedRect), `DiaryAndWinConditionRendering` (wrapText), `UiMode`                                                | 6                        | none                                                                | 22 / 7         | triple; compact collapse like the diary                                                                                                                             |
| `src/ui/BetweenDungeonsRendering.ts`      | `betweenDungeons` (all fields incl. steps, `scenarioScore`, `campaignScore`, `wipeHighScores`), `heroes`, `scenarioScores`                                                          | `types`, `core` (i18n, formatDuration, SCORE_POINTS_PER_SECRET), `saves/HighScoresLogic`, `dungeon/BetweenDungeonsLogic` (getHeroTradableItems), wrapText | 57                       | none                                                                | 80 / 11        | triple; union of steps (levelUp, trade, campaignComplete, partyWipe); the most rule-heavy module (M5 Tier C)                                                        |
| `src/ui/DungeonIntroRendering.ts`         | `dungeon.intro`, `dungeon.name`, `dungeon.layout.notes`, `turnCount`                                                                                                                | `core` (i18n, addLog, startDungeonTimer), wrapText                                                                                                        | 3                        | none                                                                | 11 / 3         | triple; `dismissDungeonIntro` has side effects (log + timer start) — becomes an action                                                                              |
| `src/ui/MenuRendering.ts`                 | none directly (items come from `menu/MenuLogic` per view)                                                                                                                           | `menu/MenuLogic`                                                                                                                                          | 0 (labels via MenuLogic) | none                                                                | 11 / 3         | triple; generic item list                                                                                                                                           |
| `src/ui/RadialMenuRendering.ts`           | none (takes `RadialMenuState`)                                                                                                                                                      | `hero/RadialMenuLogic` (actions, icons, labels), `core` (i18n), `items/ItemSpriteRendering`                                                               | 4                        | item sprites                                                        | 8 / 1          | circular layout; hit via `findHoveredRadialButton`; hovered index passed in                                                                                         |
| `src/ui/SaveLoadDialogRendering.ts`       | none directly (delegates save listing to `menu/MenuLogic`, which reads `localStorage`)                                                                                              | `core` (i18n), `menu/MenuLogic` (getSavedGameMenuItems), `HeroCardRendering` helpers                                                                      | 8                        | none                                                                | 28 / 7         | triple; save-name text input (key events via controller)                                                                                                            |
| `src/ui/NewGameDialogRendering.ts`        | none (options object in, campaign list out)                                                                                                                                         | `core` (DifficultLevels, i18n), `campaigns`                                                                                                               | 9                        | none                                                                | 34 / 7         | triple; campaign/game-master lists, speedrun seed input                                                                                                             |
| `src/ui/SettingsRendering.ts`             | none (takes `AppSettings`)                                                                                                                                                          | `core` (i18n)                                                                                                                                             | 10                       | none                                                                | 20 / 3         | triple; sliders (value from x), credits view                                                                                                                        |
| `src/ui/HeroSelectionRendering.ts`        | none (takes campaign id + selection options)                                                                                                                                        | `core` (i18n), `campaigns` (getCampaign)                                                                                                                  | 5                        | none                                                                | 26 / 4         | triple; hero rename text input (`clampHeroName`, `applyHeroRenameKey` — the pure edit reducer the kit input primitive will absorb); names are player-typed literals |
| `src/ui/WelcomeRendering.ts`              | none                                                                                                                                                                                | `$app/paths` (base), `core` (i18n), `core/ImageCache` (getReadyImage)                                                                                     | 4                        | `WELCOME_BACKGROUND_IMAGE` URL built from `base`; fallback gradient | 13 / 3         | triple; drawn on the welcome layer                                                                                                                                  |
| `src/ui/DebugOverlayRendering.ts`         | `gameMasterState` (director), `timer`                                                                                                                                               | `core` (formatDuration, timer), `HeroCardRendering` (getHeroCardsLayout)                                                                                  | 0                        | none                                                                | 1 / 1          | render only; dev-only. Excluded from parity snapshots (wall-clock time and device pixel ratio)                                                                      |
| `src/ui/UIRendering.ts`                   | `betweenDungeons` (gate)                                                                                                                                                            | composite dispatcher over the modules above                                                                                                               | 0                        | none                                                                | 0 / 0          | calls the per-module hit/layout/render entries                                                                                                                      |
| `src/ui/UiMode.ts`                        | none                                                                                                                                                                                | none                                                                                                                                                      | 0                        | none                                                                | 0 / 0          | compact threshold + collapsed panel size constants; becomes `LayoutMode` in `UiEnv`                                                                                 |

Total budget at M1: **341 color literals, 71 font literals** (stored in
`src/ui/literalBudget.test.ts`; may only go down).

**M2 status: budget 0/0.** Every renderer above now takes its colors,
fonts, stroke widths and dimming from `src/uikit/theme` (`UiTheme` +
`defaultTheme` with the values copied verbatim), arriving as an
optional `theme` parameter that defaults to `defaultTheme`; the parity
snapshots stayed byte-identical throughout. A second theme
(`src/ui/theme.ts`, `highContrastTheme`) renders without touching a
component, proven by the sentinel theme test
(`src/ui/sentinelTheme.test.ts` + `src/uikit/testing/sentinelTheme.ts`)
which fails on any style write that is not a theme token (the only
allowed exceptions: gradients and the actor's own `Colour` fill, which
is game data, not a style).

**M3 status: ports in place.** `src/uikit/env.ts` defines `UiEnv`
(theme, layout mode, translator, measure) and `UiContext`; the game side
provides the implementations — `src/ui/i18nAdapter.ts` (Translator over
sveltekit-i18n), `src/ui/env.ts` (env construction and layout-mode
resolution) and `src/ui/assets.ts` (the AssetId registry; the only
`$app`/`$lib` import under `src/ui`). Every renderer now receives an
optional `env` through its options: `i18n()` calls became `env.t`, the
`isCompactUi` reads inside layouts became `env.mode` (width-derived
only as a fallback for legacy test callers), and theme access flows
through `env.theme`. The board controller builds one env per update and
the UI-layer render signature includes env identity, so a locale or
theme change repaints.

**M4 status: primitives with real consumers.** `src/uikit/kit/` holds the
component primitives — `modalFrame`, `button`, `listRow`, `textInput` —
each with kit-level tests; the two-consumer rule was applied (a
primitive was only extracted once a second consumer existed).

**M5 status: Tier A and Tier B complete.** All three in-board card
modules and all seven menu/dialog modules follow the kit component
contract: `src/uikit/components/` holds `topBar`, `monsterCards`,
`heroCards`, `dungeonIntro`, `menu`, `welcome`, `saveLoadDialog`,
`newGameDialog`, `heroSelection` and `settings` — layout (canvas-free,
measuring through `env.measure` or fixed geometry), hit testing
(semantic ids) and rendering over a plain view model. The adapters in
`src/ui/viewmodels/` are the only GameState/AppSettings/campaign
readers, and the one side-effecting chrome action (dismissing the
dungeon intro) lives in `src/ui/actions/`. The game-side facades keep
the historical entry points (including the shared helper re-exports the
sibling chrome modules still import) so the controller and hit cascade
work unchanged. The hero-card inventory sprites and the welcome
background travel through the asset port (registry ids first, raw URLs
for content sprite sheets, resolved in `src/ui/assets.ts`). Parity
snapshots stayed byte-identical through the chain.

Remaining for M5: Tier C — the event card, the diary/win-condition
panel and between-dungeons (the rule-heavy union of steps with the
high-score list).

### World — out of scope

Board-space rendering stays where it is (scope decision in the spec README):

- `src/dungeon/DungeonRendering.ts` (tiles, walls, doors, corners),
  `src/dungeon/LightRendering.ts`, `src/dungeon/TerrainRendering.ts`,
  `src/dungeon/TileTextureCache.ts`
- `src/hero/HeroRendering.ts`, `src/monsters/MonsterRendering.ts`,
  `src/items/ItemRendering.ts`, `src/notes/NotesRendering.ts`
- `src/core/ActorSpriteRendering.ts`, `src/combat/DamageIndicatorRendering.ts`

`src/items/ItemSpriteRendering.ts` blits item sprites from the shared
spritesheet and is used by both world item rendering and chrome (hero-card
inventory, radial menu). It stays game-side: in M5 its chrome callers get
their sprites through the kit's asset port, with the id-to-sprite mapping
living in `src/ui/assets.ts`.

### Controller and plumbing — stays, adapts

- `src/components/DungeonBoardController.ts` — the integration point: owns
  the layered canvases, builds the render options, dispatches input through
  the hit cascade, holds the only `$lib/*.png` imports (actor sprites,
  buildInfo.json) and the locale/appSettings store reads. Calls game logic
  (`useItem`, `restartDungeonAfterWipe`, …) in response to UI hits — this
  is what `src/ui/actions/` will isolate.
- `src/components/DungeonBoardSignatures.ts` — per-layer dirty checks;
  will key on view models after M5.
- `src/components/DungeonBoardUiHit.ts` — the ordered hit cascade with
  injectable testers; each tester becomes a component `hitTest` call.
- `src/components/DungeonBoardHover.ts` — pure hover/pressed state
  reductions; stays the owner of interaction state.
- `src/menu/MenuLogic.ts` — menu items, labels and callbacks; becomes
  view-model/adapter material plus `src/ui/actions/` mapping.
- `src/components/Dungeon.svelte` — canvas lifecycle, ground sprite import,
  store subscriptions.

## Verification harness (built in M1)

- **Recording context**: `src/uikit/testing/recordingContext.ts` — a stub
  `CanvasRenderingContext2D` logging every method call and style property
  write; deterministic `measureText` (8 px per character).
- **Parity snapshots**: `src/ui/parity/` — real game states from
  `init('iceDragonTreasure', 'tactician', 20261031)` mutated into the
  situations that matter (early game, mid-campaign with injured heroes,
  inventory popover open, compact width, collapsed corner panels,
  between-dungeons level-up and campaign-complete, save and load dialogs,
  hero selection with a typed rename, welcome screen, Swedish locale).
  Snapshots live in `src/ui/parity/__snapshots__/`. A literal-only change
  must leave them byte-identical.
- **Literal budget**: `src/ui/literalBudget.test.ts` — 341 colors / 71
  fonts, may only go down, and the stored budget must be updated in the
  same change as any drop.
- **Boundary test**: `src/uikit/boundary.test.ts` — walks the import graph
  of `src/uikit/**` and fails on any import from outside the kit. Trivially
  green today; the lint override that makes it an authoring-time error
  lands in M6.
