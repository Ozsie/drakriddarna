# The UI kit

This document is the reference for `src/uikit/` — the game-agnostic canvas
UI kit: what it contains, the boundary that keeps it game-agnostic, the
component contract every widget follows, and the view models a consumer
builds to drive it. For the migration history and per-module status, see
[ui-kit-inventory.md](./ui-kit-inventory.md) and the spec under
[ui-kit-spec/](./ui-kit-spec/). For the hands-on integration story
(facades, adapters, actions), read this document together with
[TECHNICAL.md](../TECHNICAL.md).

## What the kit is

```
src/uikit/
  index.ts                   // the public surface — consume this
  theme/                     // UiTheme: the design tokens
  env.ts                     // UiEnv / UiContext contracts + shared constants
  primitives/                // text, geometry, rounded rect
  kit/                       // widgets: modalFrame, button, listRow, textInput, spriteFrame
  components/                // the 14 full components (cards, panels, dialogs, menus)
  testing/                   // repo-internal harness: recordingContext, sentinels, literalBudget
```

Everything the kit draws goes through the theme; every string arrives
through the translator port; images arrive through the asset port. The kit
holds **no game imports and no default strings** — it is plain TypeScript
with no Svelte, no `sveltekit-i18n`, no `$lib`/`$app` aliases. Two tests
and three lint rules enforce this (see [Boundary](#boundary) below).

The public surface is `src/uikit/index.ts`. If you need something it does
not export, that is a missing surface — add it there deliberately rather
than deep-importing. A completeness test
(`src/uikit/publicSurface.test.ts`) fails when a kit module the game
consumes is missing from the surface.

## Boundary

The boundary is tool-enforced, in both directions:

- **Kit side** — under `src/uikit/**`, lint errors on any import of game
  code, Svelte, SvelteKit aliases or i18n packages, and on color-like
  string literals outside the theme (converted modules hold zero style
  literals; the theme definition and the tests that exercise literals are
  exempt). `src/uikit/boundary.test.ts` walks the import graph as a
  second line of defense, catching paths lint misses.
- **Game side** — game-logic modules (`src/game.ts`, `src/core/`,
  `src/monsters/`, and so on) may not import the kit, so headless
  benchmarks never pull in canvas code. Only the UI layer
  (`src/ui/`, `src/components/`) and the kit's own tests cross the
  boundary.

Two sentinels prove the kit writes only what it is given: the **sentinel
theme** (every token is a unique marker; a leaked style literal fails)
and the **sentinel translator** (every drawn string is translated or a
documented allowance — the allowances are glyphs, data fragments,
player-typed names and game-side literal labels). Both run against every
render surface in `src/ui/sentinelTheme.test.ts`.

## The component contract

Every component follows the same three-function shape over a plain view
model. The signatures vary slightly per module (some take an `env`, some
take layout options), but the contract is fixed:

```
layout*(vm, viewBounds, [env], [options])  → layout   (pure; canvas-free)
hitTest*(layout, point)                    → semantic hit | null
render*(layout, [vm], ui, [options])      → void      (draws via ui.ctx)
```

- **View model** — a plain, serializable object; the only data a
  component reads. All texts are prebuilt strings; the component never
  calls a translator itself (the layout may ask `env.t` for a
  layout-dependent label, e.g. a "N more" overflow line).
- **Layout** — pure geometry over the view model and a `Rect` of the
  view. Text is measured through `env.measure` (or fixed geometry), so
  layouts stay testable without a canvas.
- **Hits** — semantic ids (`{ kind: 'card', cardId }`, hero ids, row
  indices, `'toggle'`/`'panel'`), never game objects. The caller maps ids
  back to game entities.
- **Render** — draws through `UiContext` (an env plus the canvas context
  and the asset port). Every color, font and stroke width comes from
  `ui.theme`.

### Environment

```ts
interface UiEnv {
  theme: UiTheme; // design tokens
  mode: 'regular' | 'compact'; // width-derived layout density
  t: Translator; // message key + params → string
  measure: TextMeasure; // canvas-free text measuring
}
interface UiContext extends UiEnv {
  ctx: CanvasRenderingContext2D;
  assets: AssetProvider; // AssetId → loaded image (or undefined)
}
```

The game side builds one env per update (`src/ui/env.ts`); a render
signature includes env identity, so locale or theme changes repaint. The
kit's `COMPACT_TOGGLE_SIZE` (the square a collapsed compact panel
collapses into) lives beside `LayoutMode` in `src/uikit/env.ts`.

### Assets

Components reference images by an opaque `AssetId` and draw sprite frames
through `SpriteRef` (`{ assetId, index, size }` — row-major square frames
on a sheet). `drawSpriteFrame` (`src/uikit/kit/spriteFrame.ts`) resolves
the sheet through the asset port and returns `false` while it loads, so
callers draw their icon fallback.

## The theme

`UiTheme` (in `src/uikit/theme/theme.ts`, defaults in
`defaultTheme.ts`) is the single style authority, organized as:

| Group               | Contents                                                            |
| :------------------ | :------------------------------------------------------------------ |
| `palette.text`      | Text colors by role (body, muted, bright, gold, dimmed, ...)        |
| `palette.surface`   | Fill colors by surface (panels, rows, buttons, inputs, sliders)     |
| `palette.border`    | Stroke colors by element (subtle, hairline, ring, selected, ...)    |
| `palette.overlay`   | Scrims and vignettes                                                |
| `palette.hover`     | Hover fills                                                         |
| `palette.status`    | Current/target actor markers                                        |
| `palette.actorDot`  | The four actor-dot colors (`red`, `blue`, `yellow`, `green`)        |
| `typography`        | `sizes`, `weights`, `families`; `composeFont(theme, size, weight?)` |
| `shape.strokeWidth` | `thin`, `regular`, `medium`, `thick`, `heavy`                       |
| `alpha`             | Dimming factors                                                     |

A second theme (`highContrastTheme` in `src/ui/theme.ts`) renders through
the same components without touching them — proof of parameterization.
Adding a style means adding a token; a hardcoded literal in a component
fails the boundary lint and both sentinels.

## Primitives and kit widgets

| Module                   | Provides                                                                                                     |
| :----------------------- | :----------------------------------------------------------------------------------------------------------- |
| `primitives/text`        | `composeFont`, `measureTextWidth`, `truncateText`, `wrapText`, `wrapTextMeasured`, `PER_CHAR_WIDTH_FALLBACK` |
| `primitives/geometry`    | `Rect`, `Point`, `isPointInRect`                                                                             |
| `primitives/roundedRect` | `drawRoundedRect` (quadratic corners), `roundRectPath` (native corners)                                      |
| `kit/modalFrame`         | `drawDialogScrim`, `drawModalFrame`, `drawModalHeader`                                                       |
| `kit/button`             | `drawButton` (primary/secondary variants with hover)                                                         |
| `kit/listRow`            | `drawListRow`, `listRowStyles`, `rowState`                                                                   |
| `kit/textInput`          | `drawTextInput`, `applyTextInputKey`, `clampTextInput`                                                       |
| `kit/spriteFrame`        | `spriteSourceRect`, `drawSpriteFrame`                                                                        |

## View model reference

Every component's view model is defined next to the component; this is
the consumer-facing summary. All fields are readonly strings, numbers or
nested view models — no game types.

| Component              | View model carries                                                                                                                                                                                | Semantic hits                                                                                       |
| :--------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------- |
| `topBar`               | Menu/debug labels, turn/score/timer texts, compact width reservations, log entries                                                                                                                | `'menu'`, `'debug'`, `'log'`, `'turn'`, `'logDropdown'`                                             |
| `heroCards`            | Party cards: title, HP/equipment texts, actor colour, current/target flags, open inventory (rows with use-button state and sprite refs, use/used labels)                                          | `inventoryButton`, `inventoryClose`, `inventoryUseItem` (hero id + item index), `inventory`, `card` |
| `monsterCards`         | Visible monsters: title, HP, weapon/armour/shield texts, ranged flag, actor colour                                                                                                                | `card` (card id)                                                                                    |
| `radialMenu`           | Ring origin (grid coords), buttons with label, icon, sprite ref                                                                                                                                   | `button` (button index)                                                                             |
| `dungeonIntro`         | Title, intro text, close label                                                                                                                                                                    | `close`, `panel`, `backdrop`                                                                        |
| `menu`                 | View name, header, item labels, footer                                                                                                                                                            | `item` (item id), `panel`, `backdrop`                                                               |
| `welcome`              | Header, three button labels, footer, background asset id                                                                                                                                          | button id (`newGame`, `loadGame`, `settings`)                                                       |
| `saveLoadDialog`       | Mode, title/subtitle, save rows, button labels                                                                                                                                                    | `row`, `action`, `secondary`, `input`, `panel`, `backdrop`                                          |
| `newGameDialog`        | Titles, campaign/game-master rows, checkbox and seed labels, button labels                                                                                                                        | `campaign`, `gameMaster`, `checkbox`, `seedInput`, `action`, `secondary`, `panel`, `backdrop`       |
| `heroSelection`        | Header, roster (ids, default names, colours), party limits, button labels                                                                                                                         | `checkbox`, `nameInput`, `row` (hero id), `start`, `back`, `panel`, `backdrop`                      |
| `settings` / `credits` | Settings rows (toggle/slider/button kinds, values, dimmed flags), credits rows with urls                                                                                                          | `toggle`, `slider`, `credits`, `back`, `panel`, `backdrop`; credits: `row`, `back`                  |
| `eventCard`            | Deck summary, active event texts, drawn-event titles                                                                                                                                              | `toggle`, `card`                                                                                    |
| `diary`                | Diary header, win-condition texts with fulfilled flags, found notes                                                                                                                               | `panel`, `toggle`                                                                                   |
| `betweenDungeons`      | Step (`levelUp`/`trade`/`campaignComplete`/`partyWipe`), title/subtitle, score texts, campaign statistics, wipe choices, ranked high scores, hero sections with tradable items, actor colour keys | `actionButton`, `secondaryButton`, `item`, `giveItem`, `wipeButton`, `panel`, `backdrop`            |

Selection and step state that the game owns (selected trade item,
speedrun mode, hovered rows) travels as layout/render **options**, not
view-model data; a view model plus options is a complete render input.

## Testing the kit

The repo-internal harness lives in `src/uikit/testing/` and is not part
of the public surface: `createRecordingContext` (deterministic call
log), `createSentinelTheme`, and the style-literal counter. The parity
snapshots (`src/ui/parity/`) pin the game's pixels: a refactor that only
moves code must reproduce the recorded call logs byte-identically.
`src/uikit/components/independence.test.ts` drives every component with
hand-built view models alone — the kit is usable without the game.

## Packaging readiness

The remaining work to publish is configuration only: the export map
(point it at `src/uikit/index.ts`, optionally exposing
`src/uikit/testing/` as a subpath), a build config, peer-dependency
decisions (none today — the kit has no runtime dependencies) and a
separate test setup. Everything else is enforced in this repo: zero game
imports (lint + boundary test), the complete public surface
(completeness test), and per-component theme/translator sentinels.
