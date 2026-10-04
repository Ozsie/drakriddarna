import type { RadialMenuState } from '../store/radialMenuStore';
import type { GameState } from '../types';
import { renderRadialMenu } from './RadialMenuRendering';
import { renderTopBar, type RenderTopBarOptions } from './TopBarRendering';

export const renderUI = (
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  radialMenu?: RadialMenuState | null,
  hoveredRadialIndex?: number | null,
  state?: GameState | null,
  viewWidth?: number,
  options?: RenderTopBarOptions,
) => {
  if (state && viewWidth && viewWidth > 0) {
    renderTopBar(ctx, viewWidth, state, options);
  }
  if (radialMenu) {
    renderRadialMenu(ctx, cellSize, radialMenu, hoveredRadialIndex);
  }
};

export * from './RadialMenuRendering';
export * from './TopBarRendering';
