# 01 — Architecture

Build a parameterized canvas UI kit inside the repository (`src/uikit/`) and
move game-specific knowledge into a thin adapter layer (`src/ui/`). Renderers
stop reading `GameState`, calling `i18n()`, importing Vite asset URLs and
hardcoding colors and fonts. Instead they receive three things: a **view
model** (what to show), a **theme** (how it looks) and a **UI context**
(translator, assets, layout mode).

This is the middle path from the extraction analysis: the game stays green at
every step, each conversion is a small reviewable change, and the work can
stop after any milestone with the value already banked. The package boundary
is not cut; the kit is _package-ready_ when nothing under `src/uikit/` imports
from game code and a lint rule proves it (see
[05-boundary-and-verification.md](./05-boundary-and-verification.md)).

## Goals and non-goals

**Goals**

- Every HUD, menu and dialog renderer is a function of (view model, bounds,
  theme, context). Nothing under `src/uikit/` imports `GameState`,
  `src/core`, stores, campaigns or `$lib`.
- All style literals (about 99 inline `fillStyle` values and 10 font strings)
  come from one theme object. A second theme can be dropped in without
  touching a component.
- Shared primitives (panel, button, list, text wrap, scroll, modal frame,
  text input, table) replace the per-module layout code.
- Pixel parity: with the default theme, output is identical to today's.
- The boundary is enforced by lint and tests, not by convention.

**Non-goals**

- Publishing or versioning a package.
- World rendering: tiles, lighting, fog, terrain, actors and particles stay
  where they are (see the scope decision in the
  [README](./README.md#scope-decisions-already-made--do-not-relitigate)).
- A DOM/ARIA mirror for accessibility. The view-model layer makes one
  possible later; it is not part of this work.
- A Svelte 5 / SvelteKit upgrade. The kit is plain TypeScript and does not
  depend on Svelte.
- Any visual redesign or new user-facing text.

## Constraints inherited from the repo

- Game logic is engine-agnostic and runs headless (the benchmark). Logic
  modules must never import the kit.
- UI is pure functions drawing onto a 2D context, tested with stubbed
  contexts. Keep that style: plain modules, no classes with hidden state, no
  Svelte in the kit.
- Layout functions are shared by drawing and hit-testing so the two cannot
  disagree (the compact-UI design). The kit generalizes this rule.
- Rendering is on-demand with dirty-check signatures per layer
  (`DungeonBoardSignatures.ts`) and an ordered hit cascade
  (`DungeonBoardUiHit.ts`). Both keep working throughout.
- Canvas-drawn text inputs are fed from key events; modal surfaces suppress
  game input.
- Strict TypeScript, no `any`, no `console`, `import type`, colocated tests;
  `npm run check`, `npm test` and `npm run lint` before done.
- All user-facing text goes through i18n and AI must not author source text.
  The kit ships with zero default strings.
- TECHNICAL.md and `docs/` are updated in the same change as the code they
  describe.

## Module layout

```
src/uikit/                     knows nothing about the game
  theme/                       UiTheme, defaultTheme, resolveTheme
  env.ts                       UiEnv, UiContext, Translator, AssetProvider, LayoutMode
  primitives/                  geometry, text measure/wrap, rounded rect, clip
  kit/                         panel, button, list, scroll, text, input, chip, bar, table, modalFrame
  components/                  heroCard, monsterCard, topBar, menu, dialogs, overlays
  testing/                     recording context, sentinel theme/translator, fixture helpers
  index.ts                     public surface

src/ui/                        game side (shrinks, then holds only glue)
  viewmodels/                  GameState -> view model adapters (only place importing types/core/stores)
  actions/                     semantic UI hit -> game action mapping
  assets.ts                    the only file with $lib/*.png imports
  i18nAdapter.ts               i18n store -> Translator
  theme.ts                     game theme overrides on top of defaultTheme
```

Dependency direction: `components -> kit -> primitives -> theme`. The game
side depends on the kit, never the reverse. Logic (`src/game.ts`, `src/core/`,
and so on) depends on neither.

During migration a renderer lives in `src/ui/` until converted. Moving a file
into `src/uikit/components/` is the act that proves it is clean: the lint
boundary starts applying at that moment.

## Performance requirements

- On-demand rendering and layered canvases are unchanged. The kit draws onto
  whichever canvas it is handed.
- View models are built when state changes, not every frame. Animation-only
  repaints reuse the last view model and layout.
- No per-frame allocation of themes, envs or closures. Env is rebuilt only
  when theme, locale or mode changes.
- `env.measure` caches by font and text, because layout now measures text.
- Signatures may key on view models (cheaper and more precise than hashing
  `GameState` slices), so view models stay flat and small.
- `npm run benchmark` must be unaffected, since logic never imports the kit.
