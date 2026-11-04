// Game-side facade for the dungeon intro. The component (layout, hit
// test, render over the view model) lives in the kit; the adapter in
// ./viewmodels/dungeonIntro is the only place that reads GameState, and
// the dismiss side effect lives in ./actions/dismissDungeonIntro. This
// module keeps the historical entry points so the board controller, the
// hit cascade and existing tests work unchanged, with the exact same
// pixels: parity snapshots cover the whole chain.

import type { GameState } from '../types';
import type { UiEnv } from '../uikit/env';
import type { Rect } from '@hoard-engine/primitives';
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
import { legacyUiContext, legacyUiEnv } from './env';

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
      legacyUiEnv(options?.env, { viewWidth, ctx }),
    );
  }
  const env = legacyUiEnv(options?.env, { viewWidth, ctx });
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

  renderDungeonIntroComponent(
    layout,
    legacyUiContext(ctx, options?.env, { ctx }),
    {
      isCloseHovered: options?.isCloseHovered,
    },
  );
};
