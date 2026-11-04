// Game-side facade for the top bar. The component (layout, hit test,
// render) lives in the kit; the adapter in ./viewmodels/topBar is the
// only place that reads GameState. This module keeps the historical
// entry points — layout/render/hit in the pre-kit shapes — so the board
// controller, the hit cascade and existing tests work unchanged, with
// the exact same pixels: parity snapshots cover the whole chain.

import type { GameState } from '../types';
import type { UiEnv, UiContext } from '../uikit/env';
import type { Rect } from '@hoard-engine/primitives';
import { defaultTheme } from '@hoard-engine/primitives';
import {
  hitTestTopBar,
  layoutTopBar,
  renderTopBar as renderTopBarComponent,
  type RenderTopBarOptions as ComponentRenderOptions,
  type TopBarHitElement,
  type TopBarLayout,
} from '../uikit/components/topBar';
import { toTopBarViewModel } from './viewmodels/topBar';
import { textMeasureFromCtx } from './env';
import { i18nTranslator } from './i18nAdapter';
import { uiAssetProvider } from './assets';

export type {
  TopBarElementBounds,
  TopBarHitElement,
  TopBarLayout,
} from '../uikit/components/topBar';
export {
  formatLatestLog,
  formatTurnCounter,
  formatScoreCounter,
} from './viewmodels/topBar';

export interface TopBarLayoutOptions {
  debugMode?: boolean;
  env?: UiEnv;
}

export interface RenderTopBarOptions {
  isMenuHovered?: boolean;
  isDebugHovered?: boolean;
  isLogHovered?: boolean;
  isLogOpen?: boolean;
  debugMode?: boolean;
  env?: UiEnv;
}

// Fallback approximation (avg ~8px per char for monospace/standard), as
// this module's helpers have always used without a context.
const FALLBACK_PER_CHAR = 8;

/** The env a legacy call implies: given overrides or the width-derived defaults. */
const legacyEnv = (
  viewWidth: number,
  ctx: CanvasRenderingContext2D | null | undefined,
  env?: UiEnv,
): UiEnv => ({
  theme: env?.theme ?? defaultTheme,
  mode: env?.mode ?? (viewWidth > 0 && viewWidth < 700 ? 'compact' : 'regular'),
  t: env?.t ?? i18nTranslator,
  measure: ctx
    ? textMeasureFromCtx(ctx)
    : { width: (text) => text.length * FALLBACK_PER_CHAR },
});

const viewBounds = (viewWidth: number): Rect => ({
  x: 0,
  y: 0,
  width: viewWidth,
  height: 40,
});

export const getTopBarLayout = (
  viewWidth: number,
  state?: GameState | null,
  ctx?: CanvasRenderingContext2D | null,
  options?: TopBarLayoutOptions,
): TopBarLayout => {
  const env = legacyEnv(viewWidth, ctx, options?.env);
  const vm = toTopBarViewModel(state, env.t, env.mode === 'compact', {
    debugMode: options?.debugMode,
  });
  return layoutTopBar(vm, viewBounds(viewWidth), env);
};

export const renderTopBar = (
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  state: GameState | null | undefined,
  options?: RenderTopBarOptions,
) => {
  if (!ctx || viewWidth <= 0) return;

  const env = legacyEnv(viewWidth, ctx, options?.env);
  const vm = toTopBarViewModel(state, env.t, env.mode === 'compact', {
    debugMode: options?.debugMode,
  });
  const layout = layoutTopBar(vm, viewBounds(viewWidth), env);

  const ui: UiContext = {
    theme: env.theme,
    mode: env.mode,
    t: env.t,
    measure: env.measure,
    ctx,
    assets: uiAssetProvider,
  };
  const renderOptions: ComponentRenderOptions = {
    isMenuHovered: options?.isMenuHovered,
    isDebugHovered: options?.isDebugHovered,
    isLogHovered: options?.isLogHovered,
    isLogOpen: options?.isLogOpen,
  };
  renderTopBarComponent(layout, vm, ui, renderOptions);
};

export const getTopBarHit = (
  viewWidth: number,
  state: GameState | null | undefined,
  x: number,
  y: number,
  ctx?: CanvasRenderingContext2D | null,
  options?: { isLogOpen?: boolean; debugMode?: boolean },
): TopBarHitElement => {
  const env = legacyEnv(viewWidth, ctx);
  const vm = toTopBarViewModel(state, env.t, env.mode === 'compact', {
    debugMode: options?.debugMode,
  });
  const layout = layoutTopBar(vm, viewBounds(viewWidth), env);
  return hitTestTopBar(layout, { x, y }, options?.isLogOpen);
};
