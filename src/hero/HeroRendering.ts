import type { GameState } from '../types';
import type { SceneActorView, SceneHeroOverlayView } from '../scene/contracts';
import {
  buildHeroOverlayViewModel,
  buildHeroViewModels,
} from '../scene/adapters';
import { drawFlash, drawSpriteFrame, drawTileFrame } from '../scene/ActorLayer';

// Facades over the view-model renderers: the historical entry points
// keep their GameState signatures (callers and tests unchanged), resolve
// the state into scene view models, and leave the drawing to the
// view-model core that moves with @hoard-engine/scene.

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
  views.forEach((view) => {
    if (renderHeroView(ctx, view, cellSize)) hasActiveAnimation = true;
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
  renderWalkableArea(ctx, view, cellSize);
  view.bars.forEach((bar) => {
    renderActionPips(ctx, bar, cellSize);
    renderColourBar(ctx, bar.position, bar.colour, cellSize);
    renderHealthBar(ctx, bar.position, bar.health, cellSize);
  });
  renderCurrentActorMarker(ctx, view.marker, cellSize);
};

const renderHeroView = (
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
  if (view.debugLabel) {
    ctx.fillStyle = 'black';
    ctx.font = '8px Arial';
    ctx.fillText(view.debugLabel, x * cellSize + 3, y * cellSize + 10);
  }
  return view.active;
};

const renderWalkableArea = (
  ctx: CanvasRenderingContext2D,
  view: SceneHeroOverlayView,
  cellSize: number,
) => {
  // An outline rather than a tint: it marks the cell without covering
  // the floor and lighting beneath it.
  ctx.strokeStyle = 'rgb(10 115 69 / 0.65)';
  ctx.lineWidth = 1;
  view.walkableCells.forEach((cell) => {
    ctx.strokeRect(cell.x * cellSize, cell.y * cellSize, cellSize, cellSize);
  });
};

const renderActionPips = (
  ctx: CanvasRenderingContext2D,
  bar: SceneHeroOverlayView['bars'][number],
  cellSize: number,
) => {
  const { position, actionPips, movePips } = bar;
  const x = position.x;
  const y = position.y;
  const prevFillStyle = ctx.fillStyle;
  const prevStrokeStyle = ctx.strokeStyle;

  ctx.strokeStyle = '#080808';
  ctx.fillStyle = 'darkred';
  for (let index = 0; index < (actionPips ?? 0); index++) {
    ctx.fillRect(
      x * cellSize + 4 + 6 * index,
      y * cellSize + cellSize - 12,
      5,
      5,
    );
    ctx.rect(x * cellSize + 4 + 6 * index, y * cellSize + cellSize - 12, 5, 5);
    ctx.stroke();
  }

  ctx.fillStyle = 'blue';
  for (let index = 0; index < (movePips ?? 0); index++) {
    ctx.fillRect(
      x * cellSize + cellSize - 22 + 6 * index,
      y * cellSize + cellSize - 12,
      5,
      5,
    );
    ctx.rect(
      x * cellSize + cellSize - 22 + 6 * index,
      y * cellSize + cellSize - 12,
      5,
      5,
    );
    ctx.stroke();
  }

  ctx.fillStyle = prevFillStyle;
  ctx.strokeStyle = prevStrokeStyle;
};

const renderColourBar = (
  ctx: CanvasRenderingContext2D,
  position: { x: number; y: number },
  colour: string,
  cellSize: number,
) => {
  ctx.beginPath();
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.fillRect(
    position.x * cellSize + 4,
    position.y * cellSize + (cellSize - 6),
    cellSize - 8,
    4,
  );
  ctx.stroke();
};

const renderHealthBar = (
  ctx: CanvasRenderingContext2D,
  position: { x: number; y: number },
  health: { current: number; max: number },
  cellSize: number,
) => {
  ctx.beginPath();
  ctx.strokeStyle = 'black';
  ctx.fillStyle = 'red';
  ctx.fillRect(
    position.x * cellSize + 4,
    position.y * cellSize,
    cellSize - 8,
    4,
  );
  ctx.fillStyle = 'green';
  ctx.fillRect(
    position.x * cellSize + 4,
    position.y * cellSize,
    (cellSize - 8) * (health.current / health.max),
    4,
  );
  ctx.rect(position.x * cellSize + 4, position.y * cellSize, cellSize - 8, 4);
  ctx.stroke();
};

const renderCurrentActorMarker = (
  ctx: CanvasRenderingContext2D,
  marker: SceneHeroOverlayView['marker'],
  cellSize: number,
) => {
  if (!marker) return;
  const x = marker.x;
  const y = marker.y;
  ctx.beginPath();
  ctx.strokeStyle = 'lightblue';
  ctx.lineWidth = 2;

  ctx.moveTo(x * cellSize, y * cellSize);
  ctx.lineTo(x * cellSize + cellSize / 3, y * cellSize);
  ctx.moveTo(x * cellSize, y * cellSize);
  ctx.lineTo(x * cellSize, y * cellSize + cellSize / 3);

  ctx.moveTo(x * cellSize + cellSize, y * cellSize);
  ctx.lineTo(x * cellSize + (cellSize / 3) * 2, y * cellSize);
  ctx.moveTo(x * cellSize + cellSize, y * cellSize);
  ctx.lineTo(x * cellSize + cellSize, y * cellSize + cellSize / 3);

  ctx.moveTo(x * cellSize, y * cellSize + cellSize);
  ctx.lineTo(x * cellSize, y * cellSize + (cellSize / 3) * 2);
  ctx.moveTo(x * cellSize, y * cellSize + cellSize);
  ctx.lineTo(x * cellSize + cellSize / 3, y * cellSize + cellSize);

  ctx.moveTo(x * cellSize + cellSize, y * cellSize + cellSize);
  ctx.lineTo(x * cellSize + cellSize, y * cellSize + (cellSize / 3) * 2);
  ctx.moveTo(x * cellSize + cellSize, y * cellSize + cellSize);
  ctx.lineTo(x * cellSize + (cellSize / 3) * 2, y * cellSize + cellSize);
  ctx.stroke();
  ctx.lineWidth = 1;
};
