import type { GameState } from '../types';
import { buildMonsterViewModels } from '../scene/adapters';
import { renderActorView } from '@hoard-engine/scene';

// Facade over the view-model renderer: the historical entry point keeps
// its GameState signature (callers and tests unchanged), resolves the
// state into scene view models, and leaves the drawing to the
// view-typed core in the @hoard-engine/scene package.

export const renderMonsters = (
  ctx: CanvasRenderingContext2D,
  actors: CanvasImageSource,
  cellSize: number,
  state: GameState,
  debugMode: boolean,
  currentTime: number = Date.now(),
): boolean => {
  const views = buildMonsterViewModels(state, actors, debugMode, currentTime);
  let hasActiveAnimation = false;
  views.forEach((view) => {
    if (renderActorView(ctx, view, cellSize)) hasActiveAnimation = true;
  });
  return hasActiveAnimation;
};
