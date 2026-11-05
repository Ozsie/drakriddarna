// View-model draw primitives for the actor layer of the world canvas —
// the part of the renderer that consumes only the scene contracts
// (src/scene/contracts.ts) and can leave as @hoard-engine/scene material
// (docs/engine-packages.md, step 9): sprite frames and tile frames by
// plain rectangle, flash overlays, colour and health bars by value. No
// GameState, Actor or tile-name knowledge here.

import { drawCachedTile } from '../dungeon/TileTextureCache';
import type { SceneSpriteFrame, SceneTileFrame } from './contracts';

// Draws the resolved sprite-sheet frame into the cell at (x, y).
export const drawSpriteFrame = (
  ctx: CanvasRenderingContext2D,
  frame: SceneSpriteFrame,
  x: number,
  y: number,
  cellSize: number,
): void => {
  drawCachedTile(
    ctx,
    frame.image,
    frame.sx,
    frame.sy,
    frame.sw,
    frame.sh,
    x * cellSize,
    y * cellSize,
    cellSize,
    cellSize,
  );
};

// Draws the resolved fallback tile at (x, y). Actor fallback tiles draw
// at their native size, so the view model carries the destination size.
export const drawTileFrame = (
  ctx: CanvasRenderingContext2D,
  frame: SceneTileFrame,
  x: number,
  y: number,
): void => {
  drawCachedTile(
    ctx,
    frame.sheet,
    frame.sx,
    frame.sy,
    frame.size,
    frame.size,
    x,
    y,
    frame.drawSize,
    frame.drawSize,
  );
};

// White flash overlay for damage feedback, clipped to the sprite's 32px
// footprint so it covers the drawn actor only.
export const drawFlash = (
  ctx: CanvasRenderingContext2D,
  position: { x: number; y: number },
  intensity: number,
  cellSize: number,
): void => {
  if (intensity <= 0) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(position.x * cellSize, position.y * cellSize, 32, 32);
  ctx.clip();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = `rgba(255, 255, 255, ${intensity * 0.85})`;
  ctx.fillRect(position.x * cellSize, position.y * cellSize, 32, 32);
  ctx.restore();
};

// The actor's colour bar along the bottom of its cell.
export const drawColourBar = (
  ctx: CanvasRenderingContext2D,
  position: { x: number; y: number },
  colour: string,
  cellSize: number,
): void => {
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
  ctx.strokeStyle = 'black';
  ctx.fillStyle = 'black';
};

// The actor's health bar along the top of its cell: red capacity with the
// green fraction of remaining health.
export const drawHealthBar = (
  ctx: CanvasRenderingContext2D,
  position: { x: number; y: number },
  health: { current: number; max: number },
  cellSize: number,
): void => {
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
