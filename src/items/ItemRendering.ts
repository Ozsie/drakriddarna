import type { GameState } from '../types';
import { buildItemViewModels } from '../scene/adapters';
import { renderItemView } from '@hoard-engine/scene';

// Facade over the view-model renderer: the historical entry point keeps
// its GameState signature (callers and tests unchanged), resolves the
// state into scene view models, and leaves the drawing to the
// view-model core in the @hoard-engine/scene package. Fully generic
// items define no special handling today — the case switch collapsed
// into the shared sprite-or-tile draw.

export const renderItems = (
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  cellSize: number,
  state: GameState,
  debugMode: boolean,
) => {
  const views = buildItemViewModels(state, ground, cellSize, debugMode);
  views.forEach((view) => renderItemView(ctx, view, cellSize));
};
