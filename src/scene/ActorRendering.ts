// The board's single dynamic-layer actor pass: monsters and heroes
// together, in row order. Sprites taller than a cell overlap the actor on
// the cell above, so drawing the two families separately in fixed order
// (monsters, then heroes) would put a northerly hero's body over a
// southerly monster's head; the row sort keeps whoever stands south in
// front. Hero-only and monster-only facades remain for their historical
// entry points (see src/hero/HeroRendering.ts and
// src/monsters/MonsterRendering.ts).
import type { GameState } from '../types';
import {
  buildHeroViewModels,
  buildMonsterViewModels,
  renderActorViewWithSprite,
} from './adapters';

export const renderActors = (
  ctx: CanvasRenderingContext2D,
  actorsSheet: CanvasImageSource,
  cellSize: number,
  state: GameState,
  debugMode: boolean,
  currentTime: number = Date.now(),
): boolean => {
  const views = [
    ...buildMonsterViewModels(state, actorsSheet, debugMode, currentTime),
    ...buildHeroViewModels(state, actorsSheet, debugMode, currentTime),
  ];
  let hasActiveAnimation = false;
  views
    .sort((a, b) => a.position.y - b.position.y)
    .forEach((view) => {
      if (renderActorViewWithSprite(ctx, view, cellSize)) {
        hasActiveAnimation = true;
      }
    });
  return hasActiveAnimation;
};
