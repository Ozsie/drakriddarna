// Game-side facade for the dungeon intro. The component (layout, hit
// test, render over the view model) lives in the kit; the adapter in
// ./viewmodels/dungeonIntro is the only place that reads GameState, and
// the dismiss side effect lives in ./actions/dismissDungeonIntro. This
// module keeps the historical entry points so the board controller, the
// hit cascade and existing tests work unchanged, with the exact same
// pixels: parity snapshots cover the whole chain.

import type { GameState } from '../types';
import type { UiEnv, UiContext } from '../uikit/env';
import type { Rect } from '../uikit/primitives/geometry';
import {
  hitTestDungeonIntro,
  layoutDungeonIntro,
  renderDungeonIntro as renderDungeonIntroComponent,
  type DungeonIntroLayout as KitLayout,
} from '../uikit/components/dungeonIntro';
import {
  shouldShowDungeonIntro as shouldShow,
  toDungeonIntroViewModel,
} from './viewmodels/dungeonIntro';
import { defaultTheme } from '../uikit/theme';
import { textMeasureFromCtx } from './env';
import { i18nTranslator } from './i18nAdapter';
import { uiAssetProvider } from './assets';

export { shouldShowDungeonIntro } from './viewmodels/dungeonIntro';
export { dismissDungeonIntro } from './actions/dismissDungeonIntro';

export interface DungeonIntroLayout extends KitLayout {
  backdropBounds: Rect;
  panelBounds: Rect;
  titleBounds: Rect;
  introTextBounds: Rect;
  closeButtonBounds: Rect;
}

export interface RenderDungeonIntroOptions {
  dismissed?: boolean;
  isCloseHovered?: boolean;
  env?: UiEnv;
}

export interface DungeonIntroHitResult {
  type: 'close' | 'panel' | 'backdrop';
}

// Per-character approximation when neither a context nor an env measure
// is available (the historical fallback of this module's wrap).
const perCharMeasure = (perChar: number) => ({
  width: (text: string) => text.length * perChar,
});

const legacyEnv = (
  viewWidth: number,
  env: UiEnv | undefined,
  ctx: CanvasRenderingContext2D | null | undefined,
): UiEnv => ({
  theme: env?.theme ?? defaultTheme,
  mode: env?.mode ?? (viewWidth > 0 && viewWidth < 700 ? 'compact' : 'regular'),
  t: env?.t ?? i18nTranslator,
  measure: ctx ? textMeasureFromCtx(ctx) : env?.measure ?? perCharMeasure(6.5),
});

const kitLayoutFor = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options: RenderDungeonIntroOptions | undefined,
  ctx: CanvasRenderingContext2D | null | undefined,
): KitLayout => {
  if (
    viewWidth <= 0 ||
    viewHeight <= 0 ||
    !shouldShow(state, options?.dismissed)
  ) {
    return layoutDungeonIntro(
      null,
      { x: 0, y: 0, width: 0, height: 0 },
      legacyEnv(viewWidth, options?.env, ctx),
    );
  }
  const env = legacyEnv(viewWidth, options?.env, ctx);
  const vm = toDungeonIntroViewModel(state, env.t);
  return layoutDungeonIntro(
    vm,
    { x: 0, y: 0, width: viewWidth, height: viewHeight },
    env,
  );
};

export const getDungeonIntroLayout = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options?: RenderDungeonIntroOptions,
  ctx?: CanvasRenderingContext2D | null,
): DungeonIntroLayout =>
  kitLayoutFor(viewWidth, viewHeight, state, options, ctx ?? null);

export const getDungeonIntroHit = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  x: number,
  y: number,
  options?: RenderDungeonIntroOptions,
  ctx?: CanvasRenderingContext2D | null,
): DungeonIntroHitResult | null => {
  const layout = kitLayoutFor(
    viewWidth,
    viewHeight,
    state,
    options,
    ctx ?? null,
  );
  const hit = hitTestDungeonIntro(layout, { x, y });
  return hit ? { type: hit.kind } : null;
};

export const renderDungeonIntro = (
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options?: RenderDungeonIntroOptions,
): void => {
  const layout = kitLayoutFor(viewWidth, viewHeight, state, options, ctx);
  if (!layout.hasContent) return;

  const ui: UiContext = {
    theme: options?.env?.theme ?? defaultTheme,
    mode: options?.env?.mode ?? 'regular',
    t: options?.env?.t ?? i18nTranslator,
    measure: textMeasureFromCtx(ctx),
    ctx,
    assets: uiAssetProvider,
  };
  renderDungeonIntroComponent(layout, ui, {
    isCloseHovered: options?.isCloseHovered,
  });
};
