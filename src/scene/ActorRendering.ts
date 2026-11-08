// The board's single dynamic-layer actor pass: corpses, monsters and
// heroes together, in row order. Sprites taller than a cell overlap the
// actor on the cell above, so drawing the two families separately in
// fixed order (monsters, then heroes) would put a northerly hero's body
// over a southerly monster's head; the row sort keeps whoever stands
// south in front. Corpses lead the list so, on equal rows, whatever
// still stands draws over whatever already lies. This pass never draws
// health bars; renderMonsterHealthBars draws them above the lighting
// (see below). Hero-only and monster-only facades remain for their
// historical entry points (see src/hero/HeroRendering.ts and
// src/monsters/MonsterRendering.ts).
import type { GameState } from '../types';
import {
  buildCorpseViewModels,
  buildHeroViewModels,
  buildMonsterViewModels,
  renderActorViewWithSprite,
  type GameActorView,
} from './adapters';
import { drawHealthBar } from '@hoard-engine/scene';

export const renderActors = (
  ctx: CanvasRenderingContext2D,
  actorsSheet: CanvasImageSource,
  cellSize: number,
  state: GameState,
  debugMode: boolean,
  currentTime: number = Date.now(),
): boolean => {
  const views = [
    ...buildCorpseViewModels(state, currentTime),
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

// Monster health bars, drawn above the lighting and the darkness veil so
// they stay fully readable in unlit rooms (the actor pass draws below the
// veil). The package anchors the bar to the cell top, which on a scaled
// sprite sits mid-figure; lift it to the sprite's top edge, one cell above
// the actor's own cell per extra scale step, like the hero overlay bars.
export const renderMonsterHealthBars = (
  ctx: CanvasRenderingContext2D,
  actorsSheet: CanvasImageSource,
  cellSize: number,
  state: GameState,
  debugMode: boolean,
  currentTime: number = Date.now(),
): void => {
  buildMonsterViewModels(state, actorsSheet, debugMode, currentTime).forEach(
    (view) => {
      if (!view.healthBar) return;
      const scale = (view as GameActorView).spriteDraw?.scale ?? 1;
      drawHealthBar(
        ctx,
        { x: view.position.x, y: view.position.y - (scale - 1) },
        view.healthBar,
        cellSize,
      );
    },
  );
};
