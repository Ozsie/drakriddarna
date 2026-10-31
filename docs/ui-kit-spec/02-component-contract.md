# 02 — Component Contract

Every kit component is a module exporting three functions over the same
layout data. Everything a component needs arrives through its parameters:
the view model carries the data, the environment carries the theme and
ports, and the layout object carries the geometry.

## Environment and context

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

- `mode` replaces the width-derived `isCompactUi` reading inside layout
  functions. The game side keeps computing it from view width and passes it
  in, so compact UI becomes a parameter instead of a hidden global rule.
- Time-dependent visuals (pulsing, timers) receive time through the view
  model or options. The kit never reads a clock.
- `Translator` is built by the game-side adapter from the current
  sveltekit-i18n value. Its identity changes with the locale, which must also
  invalidate the affected render signatures.
- Images are referenced by `AssetId`, never by URL. `src/ui/assets.ts` owns
  the Vite imports and asks the controller for a repaint when an image
  finishes loading.

## The contract

```ts
export interface UiComponent<VM, Opts, L, Hit> {
  layout(vm: VM, bounds: Rect, env: UiEnv, opts?: Opts): L;
  hitTest(layout: L, point: Point): Hit | null;
  render(layout: L, vm: VM, ui: UiContext): void;
}
```

1. `render` and `hitTest` consume the same `layout` object. Geometry is never
   recomputed in either.
2. `layout` is pure and canvas-free (text size comes from `env.measure`), so
   it is unit-testable without a context.
3. Components are modules exporting these three functions. No classes, no
   module-level mutable state.
4. Hits are discriminated unions of semantic ids
   (`{ kind: 'button', id: 'confirm' }`). The kit never calls game code;
   `src/ui/actions/` maps hits to actions.
5. Hover, pressed, disabled and focus state is passed in. The existing pure
   reducers in `DungeonBoardHover.ts` keep owning it.

## View models

- Plain, readonly, JSON-like data. No functions or callbacks, which keeps
  them comparable for dirty checks.
- Text is a `Label`: `{ key, params? }` for translated text, or `{ literal }`
  for text that must display as typed, such as renamed hero names.
- Images are `AssetId`. Interactive things carry opaque `actionId` strings.
- A view model contains only the fields the renderer actually reads. The M1
  inventory lists these per renderer (see
  [06-milestones.md](./06-milestones.md)).

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
