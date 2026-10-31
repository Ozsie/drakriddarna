# In-Project Parameterized UI System

Specification · Drakriddarna · Draft v1 · 30 October 2026

## 1. Summary

Build a parameterized canvas UI kit inside the repository (`src/uikit/`) and move game-specific knowledge into a thin adapter layer (`src/ui/`). Renderers stop reading `GameState`, calling `i18n()`, importing Vite asset URLs and hardcoding colors and fonts. Instead they receive three things: a **view model** (what to show), a **theme** (how it looks) and a **UI context** (translator, assets, layout mode).

This is the middle path from the extraction analysis. The game stays green at every step, each conversion is a small reviewable change, and the work can stop after any phase with the value already banked. The package boundary is not cut. The kit is _package-ready_ when nothing under `src/uikit/` imports from game code and a lint rule proves it.

## 2. Goals and non-goals

**Goals**

- Every HUD, menu and dialog renderer is a function of (view model, bounds, theme, context). Nothing under `src/uikit/` imports `GameState`, `src/core`, stores, campaigns or `$lib`.
- All style literals (about 99 inline `fillStyle` values and 10 font strings) come from one theme object. A second theme can be dropped in without touching a component.
- Shared primitives (panel, button, list, text wrap, scroll, modal frame, text input, table) replace the per-module layout code.
- Pixel parity: with the default theme, output is identical to today's.
- The boundary is enforced by lint and tests, not by convention.

**Non-goals**

- Publishing or versioning a package.
- World rendering: tiles, lighting, fog, terrain, actors and particles stay where they are (see D1).
- A DOM/ARIA mirror for accessibility. The view-model layer makes one possible later; it is not part of this work.
- A Svelte 5 / SvelteKit upgrade. The kit is plain TypeScript and does not depend on Svelte.
- Any visual redesign or new user-facing text.

## 3. Constraints inherited from the repo

- Game logic is engine-agnostic and runs headless (the benchmark). Logic modules must never import the kit.
- UI is pure functions drawing onto a 2D context, tested with stubbed contexts. Keep that style: plain modules, no classes with hidden state, no Svelte in the kit.
- Layout functions are shared by drawing and hit-testing so the two cannot disagree (the compact-UI design). The kit generalizes this rule.
- Rendering is on-demand with dirty-check signatures per layer (`DungeonBoardSignatures.ts`) and an ordered hit cascade (`DungeonBoardUiHit.ts`). Both keep working throughout.
- Canvas-drawn text inputs are fed from key events; modal surfaces suppress game input.
- Strict TypeScript, no `any`, no `console`, `import type`, colocated tests; `npm run check`, `npm test` and `npm run lint` before done.
- All user-facing text goes through i18n and AI must not author source text. The kit ships with zero default strings.
- TECHNICAL.md and `docs/` are updated in the same change as the code they describe.

## 4. Architecture

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

Dependency direction: `components -> kit -> primitives -> theme`. The game side depends on the kit, never the reverse. Logic (`src/game.ts`, `src/core/`, and so on) depends on neither.

During migration a renderer lives in `src/ui/` until converted. Moving a file into `src/uikit/components/` is the act that proves it is clean: the lint boundary starts applying at that moment.

### 4.1 Environment and context

```ts
export type LayoutMode = 'regular' | 'compact';
export type Translator = (
  key: string,
  params?: Record<string, string | number>,
) => string;
export type AssetId = string;

export interface TextMeasure {
  width(text: string, font: string): number;
}

/** Everything a pure layout function needs. No canvas. */
export interface UiEnv {
  readonly theme: UiTheme;
  readonly mode: LayoutMode;
  readonly t: Translator;
  readonly measure: TextMeasure;
}

/** Everything a render function needs. */
export interface UiContext extends UiEnv {
  readonly ctx: CanvasRenderingContext2D;
  readonly assets: AssetProvider;
}

export interface AssetProvider {
  /** Undefined until loaded; components draw a themed fallback. */
  get(id: AssetId): CanvasImageSource | undefined;
}
```

- `mode` replaces the width-derived `isCompactUi` reading inside layout functions. The game side keeps computing it from view width and passes it in, so compact UI becomes a parameter instead of a hidden global rule.
- Time-dependent visuals (pulsing, timers) receive time through the view model or options. The kit never reads a clock.
- `Translator` is built by the game-side adapter from the current sveltekit-i18n value. Its identity changes with the locale, which must also invalidate the affected render signatures.
- Images are referenced by `AssetId`, never by URL. `src/ui/assets.ts` owns the Vite imports and asks the controller for a repaint when an image finishes loading.

### 4.2 Component contract

```ts
export interface UiComponent<VM, Opts, L, Hit> {
  layout(vm: VM, bounds: Rect, env: UiEnv, opts?: Opts): L;
  hitTest(layout: L, point: Point): Hit | null;
  render(layout: L, vm: VM, ui: UiContext): void;
}
```

1. `render` and `hitTest` consume the same `layout` object. Geometry is never recomputed in either.
2. `layout` is pure and canvas-free (text size comes from `env.measure`), so it is unit-testable without a context.
3. Components are modules exporting these three functions. No classes, no module-level mutable state.
4. Hits are discriminated unions of semantic ids (`{ kind: 'button', id: 'confirm' }`). The kit never calls game code; `src/ui/actions/` maps hits to actions.
5. Hover, pressed, disabled and focus state is passed in. The existing pure reducers in `DungeonBoardHover.ts` keep owning it.

### 4.3 Theme

Tokens, not per-component styles.

| Group      | Contents                                                                                                                    |
| ---------- | --------------------------------------------------------------------------------------------------------------------------- |
| palette    | surface, surfaceRaised, overlayScrim, border, borderStrong, text, textMuted, textOnAccent, accent, danger, success, warning |
| status     | hp good/low/critical, disabled, hover, pressed, selected                                                                    |
| typography | font families; size scale xs to xl; weights; line-height factors                                                            |
| spacing    | a small scale used for padding and gaps                                                                                     |
| shape      | radii, stroke widths                                                                                                        |
| alpha      | scrim, shadow and tint opacities                                                                                            |

```ts
export interface UiTheme {
  /* groups above, all readonly */
}
export const defaultTheme: UiTheme; // values copied verbatim from today's literals
export function resolveTheme(overrides: DeepPartial<UiTheme>): UiTheme; // deep-merged, frozen
```

- `defaultTheme` reproduces current output exactly. Phase 1 clusters the roughly 99 literals by value and by role. The same value used in different roles becomes separate tokens, so a theme can split them later.
- Per-component theme slots (`theme.components.heroCard`) are added only when a real second theme needs one. Default: none.
- The theme object is created once and is identity-stable, so it is safe in cache keys and signatures.

### 4.4 View models

- Plain, readonly, JSON-like data. No functions or callbacks, which keeps them comparable for dirty checks.
- Text is a `Label`: `{ key, params? }` for translated text, or `{ literal }` for text that must display as typed, such as renamed hero names.
- Images are `AssetId`. Interactive things carry opaque `actionId` strings.
- A view model contains only the fields the renderer actually reads. The Phase 0 inventory lists these per renderer.

Example (illustrative; real field names follow the code):

```ts
export interface HeroCardViewModel {
  readonly id: string;
  readonly name: Label;
  readonly portrait: AssetId;
  readonly hp: { current: number; max: number };
  readonly stats: ReadonlyArray<{ icon: AssetId; label: Label; value: number }>;
  readonly state: 'active' | 'idle' | 'down';
  readonly actionId: string;
}

// game side: the only code allowed to read GameState
export function toHeroCardViewModel(
  state: GameState,
  heroId: string,
): HeroCardViewModel;
```

## 5. Parameterization model

Three channels, one rule each.

| Channel    | Use for                                                                                              | Not for                |
| ---------- | ---------------------------------------------------------------------------------------------------- | ---------------------- |
| Theme      | Anything visual and global: color, font, radius, spacing                                             | Per-instance structure |
| Options    | Per-instance structural choices: density, which sections show, alignment, max rows, animation on/off | Data, colors           |
| View model | Data and text                                                                                        | Style, structure       |

A thing becomes an option only when a call site needs it. Otherwise it is a theme token or a constant. This keeps "configurable" from turning into speculative generality.

Compact UI becomes one `LayoutMode` value plus per-component rules for what collapses (corner panels to buttons, only the active card, shrunken chips), documented next to each component.

## 6. Boundary enforcement

1. **Lint override** for `src/uikit/**` with `no-restricted-imports` covering `**/types`, `**/core/**`, `**/store/**`, `**/campaigns/**`, `**/game`, `**/items/**`, `**/saves/**`, `$lib/**`, `$app/**`, `svelte`, `svelte/*` and `sveltekit-i18n`. If the kit needs rect or grid math it owns its own in `primitives/geometry.ts`.
2. **Reverse rule**: logic modules (`src/game.ts`, `src/core/`, `src/monsters/`, and so on) may not import `src/uikit/**`, so the headless benchmark never pulls in canvas code.
3. **Literal budget**: a Vitest test counts color and font literals in `src/ui/**` against a stored number that may only go down. Under `src/uikit/**` a `no-restricted-syntax` rule on color-like string literals holds converted modules at zero.
4. **Boundary test**: a small test walks the import graph of `src/uikit/**` as a second line of defense, catching dynamic and re-exported paths that lint misses.

## 7. Verification harness

Built in Phase 0 and used by every later phase.

- **Recording context**: a stub `CanvasRenderingContext2D` that logs method calls and property writes. Existing tests already stub contexts; this consolidates the pattern in `src/uikit/testing/`.
- **Parity snapshots**: each in-scope renderer runs against fixtures from real game states (early game, mid-campaign with injured heroes, compact mode, Swedish locale, overlays open) and its call log is snapshotted before any refactor. A step that only moves literals into the theme must produce an identical log. Intentional differences need an explicit snapshot update called out in the PR.
- **Sentinel theme**: every token is a unique marker value. Render each component and assert every color and font set on the context is a sentinel. A leftover literal fails.
- **Sentinel translator**: `t = key => '«' + key + '»'`. Assert every drawn string is wrapped or comes from a `literal` label. Hardcoded text fails.
- **Independence test**: components are exercised with hand-built view models only, never `GameState` fixtures.
- **Layout/hit consistency**: for every interactive region, hit-testing its center returns that region's hit, and the rect drawn is the rect tested.
- **Adapter tests**: `GameState` fixture in, view model out, asserted exactly. This is where game rules that used to hide inside renderers become testable.

Call-log snapshots are brittle against harmless reordering. That is fine for literal-only changes. Primitive consolidation (Phase 3) will legitimately change the logs, so those steps use pixel comparison (decision D2).

## 8. Phased plan

| Phase | Deliverable                                                    | Exit criteria                                                                      | Estimate     |
| ----- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------ |
| 0     | Inventory, recording context, parity snapshots, literal budget | Snapshots and inventory committed; CI green                                        | 2–3 days     |
| 1     | Theme and shared draw primitives                               | Literal budget 0 in converted modules; parity unchanged; second theme renders      | 3–5 days     |
| 2     | `UiEnv`/`UiContext`, translator and asset ports                | No i18n or `$lib` imports in converted modules; compact mode passed as a parameter | 2–3 days     |
| 3     | Component kit                                                  | Each primitive has at least two consumers and tests                                | about 1 week |
| 4     | View-model conversion of all in-scope renderers                | Each module moved to `src/uikit/components/` and clean                             | 2–3 weeks    |
| 5     | Hardening and package-readiness                                | Boundary lint is an error everywhere; docs updated; readiness checklist passes     | 2–3 days     |

Estimates assume someone who knows the code and are derived from the original 4–8 week analysis, not measured. Phases 0–3 (about two weeks) deliver most of the theming and de-duplication value on their own.

### Phase 0: Inventory and safety net

- Classify every renderer under `src/ui/`, `src/components/` and the domain folders as chrome (in scope) or world (out of scope).
- Write `docs/ui-kit-inventory.md`: per module, the `GameState` fields read, logic modules imported, `i18n()` calls, asset imports, style-literal count, and how input and hit-testing are coupled.
- Build the harness from section 7 and snapshot current behavior.
- Add the literal-budget test with today's number.

### Phase 1: Theme and primitives

- Cluster literals into tokens; define `UiTheme`; make `defaultTheme` equal current values.
- Thread `theme` through renderers as an added parameter. Modules stay in `src/ui/`. Mechanical and low risk, one module per PR.
- Move `drawRoundedRect` and other repeated draw helpers into `primitives/`.
- Prove parameterization with a second theme (for example high contrast) through the sentinel test and a gallery (D4).

### Phase 2: Context and ports

- Introduce `UiEnv`/`UiContext`; the board controller builds them once per update.
- Replace `i18n()` imports with `env.t` and `$lib/*.png` imports with `AssetId`s resolved by `src/ui/assets.ts`.
- Replace width-derived compact detection inside layout functions with `env.mode`.
- Include env identity (locale, theme, mode) in render signatures so a locale or theme change repaints.

### Phase 3: Component kit

Build a primitive only when a second consumer exists.

| Primitive     | Notes                                              | Proving consumers                                    |
| ------------- | -------------------------------------------------- | ---------------------------------------------------- |
| modalFrame    | dim scrim, centered panel, title, close behavior   | save/load, new game, dungeon intro, between-dungeons |
| panel, button | states: normal, hover, pressed, disabled, selected | everywhere                                           |
| text          | measure, wrap, ellipsize, align, line height       | cards, diary, event card                             |
| list          | selectable rows, scroll, selection                 | save/load, new-game columns, hero selection          |
| scroll        | clip, offset, scrollbar, wheel and touch hooks     | diary, lists                                         |
| input         | canvas-drawn text input with caret and max length  | save name, hero rename, speedrun seed                |
| chip, bar     | emoji-plus-number chip, HP bar                     | top bar, cards                                       |
| table         | header, rows, column widths                        | campaign-complete tables, high scores                |

### Phase 4: View-model conversion

Ordered by risk, easiest first, so the recipe is proven before the heavy modules.

- **Tier A, leaf widgets**: top bar, hero card, monster card, compact-UI helpers.
- **Tier B, menus and dialogs**: welcome, settings, hero selection, save/load dialog, new-game dialog, canvas menu, dungeon intro.
- **Tier C, rule-heavy**: event card, diary, between-dungeons (with its `campaignComplete` and `partyWipe` steps and the high score list). These encode the most game rules. Split each into "decide what to show" (a game-side adapter tested with `GameState`) and "how to show it" (kit components). Between-dungeons becomes a union view model composed of generic parts (stat grid, table, action row) rather than one bespoke component.

Per-module recipe, one PR each:

1. Read the renderer and list exactly which fields it reads. Define the view model from that list.
2. Write the adapter and its tests against `GameState` fixtures.
3. Change the signature to `(vm, bounds, env/ctx, opts)`; replace inline layout with kit primitives where it is a 1:1 swap.
4. Make hit tests return semantic hits; add the mapping in `src/ui/actions/`.
5. Update the matching entries in `DungeonBoardUiHit` and `DungeonBoardSignatures` (signatures key on the view model).
6. Parity snapshots unchanged or deliberately updated; sentinel and independence tests pass; move the file into `src/uikit/components/`.

### Phase 5: Hardening

- Boundary lint is an error across `src/uikit/**`; the reverse rule is on.
- `src/uikit/index.ts` exports a deliberate public surface.
- Write `docs/ui-kit.md` (tokens, view model reference, component contract) in the style of the existing content-definition specs; add an AGENTS.md section on the boundary; update the architecture and rendering sections of TECHNICAL.md.
- Run the readiness checklist (section 11).

## 9. Input and hit testing

- Components return semantic hits. The controller's ordered cascade (`DungeonBoardUiHit`) keeps its order and injectable hit-testers; each tester now calls a component's `hitTest(layout, point)`.
- The mapping from hit to behavior lives in `src/ui/actions/`, the only place that calls game logic in response to UI.
- Keyboard bindings and modal input suppression stay in the controller and input manager. The kit exposes no key handling except the text input's pure edit reducer (insert, delete, caret, max length).
- Because view models and layouts are plain data, a future DOM mirror could be generated from them. That is a benefit, not a deliverable.

## 10. Performance requirements

- On-demand rendering and layered canvases are unchanged. The kit draws onto whichever canvas it is handed.
- View models are built when state changes, not every frame. Animation-only repaints reuse the last view model and layout.
- No per-frame allocation of themes, envs or closures. Env is rebuilt only when theme, locale or mode changes.
- `env.measure` caches by font and text, because layout now measures text.
- Signatures may key on view models (cheaper and more precise than hashing `GameState` slices), so view models stay flat and small.
- `npm run benchmark` must be unaffected, since logic never imports the kit.

## 11. Policy and process

- **AI policy**: the kit ships no default strings. Fixtures and the gallery use existing translation keys. Any new label needs human-authored source text; AI may only translate it afterward.
- **Docs**: each phase updates TECHNICAL.md where it changes architecture or rendering; `docs/ui-kit.md` and the inventory are maintained alongside the code.
- **Style**: strict TypeScript, no `any`, no `console` (use the logger), `import type`, colocated `*.test.ts`.
- **PRs**: one module or primitive per PR, with `npm run check`, `npm test` and `npm run lint` green on each.

**Package-readiness checklist** (the decision gate for ever cutting the package):

- Zero imports from game code under `src/uikit/**`, enforced by lint and test.
- Sentinel theme and translator tests pass for every component.
- Every component is usable with hand-built view models.
- No `$lib`, Svelte or `sveltekit-i18n` imports in the kit.
- `docs/ui-kit.md` complete; public surface only through `index.ts`.
- Remaining work to publish is limited to the export map, build config, peer-dependency decisions and a separate test setup.

## 12. Risks

| Risk                                           | Mitigation                                                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Consolidating primitives subtly changes pixels | Pixel comparison for Phase 3 (D2); literal-only steps use exact call-log parity                        |
| Kit becomes over-general                       | Two-consumer rule; options only on demand; theme slots only for a real second theme                    |
| Adapters misread state and change behavior     | Adapter tests on `GameState` fixtures; keep `ItemLogic`, `campaigns` and similar reads inside adapters |
| Stale visuals after a locale or theme change   | Env identity is part of render signatures; test switching locale mid-session                           |
| Long-lived refactor branch                     | One module per PR; trunk stays releasable; stop after any phase                                        |
| Tier C modules dominate the schedule           | Do them last; split decide/show; deferring them still leaves a valuable kit                            |
| Future Svelte 5 upgrade                        | Kit is plain TS; only adapters touching stores are affected                                            |

## 13. Definition of done

- All in-scope renderers live in `src/uikit/components/` and take view models.
- The theme literal budget is zero; two themes exist (default and one alternate) and pass the sentinel test.
- Parity snapshots pass for the default theme.
- Boundary lint and test pass; readiness checklist complete.
- Docs updated; benchmark and full test suite green.

## 14. Open decisions

- **D1, scope line (decided).** Decision: chrome only (HUD, cards, menus, dialogs, overlays). World rendering (tiles, lighting, fog, terrain, actors, particles) is out. Hero and monster cards are UI, so they are in scope: they move out of the domain folders (hero/, monsters/) into src/uikit/components/.
- **D2, pixel parity tooling.** Recommendation: add a dev-only Node canvas (for example `@napi-rs/canvas`) so primitive consolidation can be verified by pixel diff. Alternative: manual visual review through a gallery.
- **D3, location and name.** `src/uikit/` versus `src/ui/kit/`. Recommendation: a separate top-level folder, so the lint override and any later extraction are trivial.
- **D4, gallery.** A dev-only gallery route (guarded so it is absent from the production build) versus Vitest-only fixtures. Recommendation: the gallery, because theming is only convincing when seen.
- **D5, stopping point.** Phases 0–3 are independently valuable. Decide after Phase 3 whether Tier C of Phase 4 is worth the cost.

## Appendix: basis of this spec

Written from the repository's README, TECHNICAL.md and AGENTS.md, plus the extraction analysis supplied with the request. The counts (35 `../types` imports, 99 `fillStyle` literals, 10 font literals, about 4,900 LOC of canvas renderers) come from that analysis and were not re-verified. The contents of `src/ui/` and `src/components/` were not reviewed, so module names beyond those mentioned in TECHNICAL.md and the analysis, the exact field lists, and the `HeroCardViewModel` example are illustrative. Phase 0 replaces them with a real inventory.
