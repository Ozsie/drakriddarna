import type { GameState } from '../types';
import type { SceneActorView, SceneHeroOverlayView } from '@hoard-engine/scene';
import { renderActorView, renderHeroOverlay } from '@hoard-engine/scene';
import {
  buildHeroOverlayViewModel,
  buildHeroViewModels,
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
  let hasActiveAnimation = false;
  views.forEach((view: SceneActorView) => {
    if (renderActorView(ctx, view, cellSize)) hasActiveAnimation = true;
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
  const view: SceneHeroOverlayView = buildHeroOverlayViewModel(
    state,
    currentTime,
  );
  renderHeroOverlay(ctx, view, cellSize);
};
