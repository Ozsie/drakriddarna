import type { GameState } from '../types';
import type { SceneActorView } from '@hoard-engine/scene';
import { renderHeroOverlay } from '@hoard-engine/scene';
import {
  buildHeroOverlayViewModel,
  buildHeroViewModels,
  drawScaledHeroBar,
  renderActorViewWithSprite,
} from '../scene/adapters';

// Facades over the view-model renderers: the historical entry points
// keep their GameState signatures (callers and tests unchanged), resolve
// the state into scene view models, and leave the drawing to the
// view-typed cores in the @hoard-engine/scene package.

export const renderHeroes = (
  ctx: CanvasRenderingContext2D,
  actors: CanvasImageSource,
  cellSize: number,
  state: GameState,
  debugMode: boolean,
  currentTime: number = Date.now(),
): boolean => {
  const views = buildHeroViewModels(state, actors, debugMode, currentTime);
  // Sprites taller than a cell overlap the actor on the cell above, so
  // heroes draw in row order: a southerly hero's head correctly covers
  // the hero standing north of them.
  views.sort((a, b) => a.position.y - b.position.y);
  let hasActiveAnimation = false;
  views.forEach((view: SceneActorView) => {
    if (renderActorViewWithSprite(ctx, view, cellSize)) {
      hasActiveAnimation = true;
    }
  });
  return hasActiveAnimation;
};

// Draws the hero turn UI — the walkable area outline, action and step
// markers, the hero colour bar, health bars and the current actor
// reticule. Called by the renderer after the light mask and the ambient
// darkness veil, so these stay fully visible even on unlit cells.
export const renderHeroOverlays = (
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  state: GameState,
  currentTime: number = Date.now(),
) => {
  const view = buildHeroOverlayViewModel(state, currentTime);
  // Bars of scaled-sprite heroes draw game-side (their health bar lifts
  // to the sprite's top edge); the rest render through the package.
  const scaledBars = view.bars.filter((bar) => bar.spriteDraw);
  const plainBars = view.bars.filter((bar) => !bar.spriteDraw);
  renderHeroOverlay(ctx, { ...view, bars: plainBars }, cellSize);
  scaledBars.forEach((bar) => {
    drawScaledHeroBar(ctx, bar, cellSize);
  });
};
