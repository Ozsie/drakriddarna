import type { GameState } from '../types';
import {
  buildDecoratorViewModels,
  buildItemViewModels,
  buildLightSpriteViewModels,
  renderItemViewWithSprite,
} from '../scene/adapters';

// Facade over the view-model renderer: the historical entry point keeps
// its GameState signature (callers and tests unchanged), resolves the
// state into scene view models, and leaves the drawing to the
// view-model cores — the game-side scaled-sprite helper in the adapters
// (item sprites shrink to 75% of the cell), the rest in the
// @hoard-engine/scene package. Fully generic items define no special
// handling today — the case switch collapsed into the shared
// sprite-or-tile draw.

export const renderItems = (
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  cellSize: number,
  state: GameState,
  debugMode: boolean,
) => {
  const views = buildItemViewModels(state, ground, cellSize, debugMode);
  views.forEach((view) => renderItemViewWithSprite(ctx, view, cellSize));
};

export const renderDecorators = (
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  cellSize: number,
  state: GameState,
) => {
  const views = buildDecoratorViewModels(state, ground, cellSize);
  views.forEach((view) => renderItemViewWithSprite(ctx, view, cellSize));
};

export const renderLightSprites = (
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  cellSize: number,
  state: GameState,
  debugMode = false,
  timeMs = Date.now(),
) => {
  const views = buildLightSpriteViewModels(
    state,
    ground,
    cellSize,
    debugMode,
    timeMs,
  );
  views.forEach((view) => renderItemViewWithSprite(ctx, view, cellSize));
};
