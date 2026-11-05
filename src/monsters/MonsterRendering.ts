import type { GameState } from '../types';
import type { SceneActorView } from '../scene/contracts';
import { buildMonsterViewModels } from '../scene/adapters';
import {
  drawColourBar,
  drawFlash,
  drawHealthBar,
  drawSpriteFrame,
  drawTileFrame,
} from '../scene/ActorLayer';

// Facade over the view-model renderer: the historical entry point keeps
// its GameState signature (callers and tests unchanged), resolves the
// state into scene view models, and leaves the drawing to the
// view-model core that moves with @hoard-engine/scene.

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
    if (renderMonsterView(ctx, view, cellSize)) hasActiveAnimation = true;
  });
  return hasActiveAnimation;
};

const renderMonsterView = (
  ctx: CanvasRenderingContext2D,
  view: SceneActorView,
  cellSize: number,
): boolean => {
  const { x, y } = view.position;
  if (view.sprite) {
    drawSpriteFrame(ctx, view.sprite, x, y, cellSize);
  } else if (view.tile) {
    drawTileFrame(ctx, view.tile, x * cellSize, y * cellSize);
  }
  drawFlash(ctx, view.position, view.flashIntensity, cellSize);
  if (view.colourBar) {
    drawColourBar(ctx, view.position, view.colourBar, cellSize);
  }
  if (view.healthBar) {
    drawHealthBar(ctx, view.position, view.healthBar, cellSize);
  }
  view.debugLines.forEach((line) => {
    ctx.beginPath();
    ctx.strokeStyle = line.colour;
    ctx.lineWidth = 2;
    ctx.moveTo(
      line.from.x * cellSize + cellSize / 2,
      line.from.y * cellSize + cellSize / 2,
    );
    ctx.lineTo(
      line.to.x * cellSize + cellSize / 2,
      line.to.y * cellSize + cellSize / 2,
    );
    ctx.stroke();
    ctx.lineWidth = 1;
  });
  if (view.debugLabel) {
    ctx.fillStyle = 'black';
    ctx.font = '8px Arial';
    ctx.fillText(view.debugLabel, x * cellSize + 3, y * cellSize + 10);
  }
  return view.active;
};
