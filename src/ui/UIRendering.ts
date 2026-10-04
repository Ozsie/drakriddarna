import type { RadialMenuState } from '../store/radialMenuStore';
import { renderRadialMenu } from './RadialMenuRendering';

export const renderUI = (
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  radialMenu: RadialMenuState,
  hoveredRadialIndex?: number | null,
) => {
  if (radialMenu) {
    renderRadialMenu(ctx, cellSize, radialMenu, hoveredRadialIndex);
  }
};

export * from './RadialMenuRendering';
