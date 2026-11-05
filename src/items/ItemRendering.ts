import type { GameState } from '../types';
import type { SceneItemView } from '../scene/contracts';
import { buildItemViewModels } from '../scene/adapters';
import { drawSpriteFrame, drawTileFrame } from '../scene/ActorLayer';
import { renderTextBox } from '../notes/NotesRendering';

// Facade over the view-model renderer: the historical entry point keeps
// its GameState signature (callers and tests unchanged), resolves the
// state into scene view models, and leaves the drawing to the
// view-model core that moves with @hoard-engine/scene. Fully generic
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

const renderItemView = (
  ctx: CanvasRenderingContext2D,
  view: SceneItemView,
  cellSize: number,
) => {
  const { x, y } = view.position;
  // Item sprite sheet when the item defines one, the generic tileset item
  // tile otherwise (and while the sheet is still loading).
  if (view.sprite) {
    drawSpriteFrame(ctx, view.sprite, x, y, cellSize);
  } else {
    drawTileFrame(ctx, view.fallbackTile, x * cellSize, y * cellSize);
  }
  if (view.label) {
    renderTextBox(ctx, view.label, view.position, cellSize);
  }
};
