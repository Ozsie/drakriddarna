import type { Actor, GameState, Monster, Position } from '../types';
import { MonsterType } from '../types';
import {
  getActorVisualPosition,
  isActorAnimating,
  isRoomDiscovered,
  stepAlongLine,
} from '../core';
import { drawCachedTile } from '../dungeon/TileTextureCache';

export const renderMonsters = (
  ctx: CanvasRenderingContext2D,
  actors: CanvasImageSource,
  cellSize: number,
  state: GameState,
  debugMode: boolean,
  currentTime: number = Date.now(),
): boolean => {
  let hasActiveAnimation = false;
  state.dungeon.layout.monsters.forEach((monster) => {
    const isAnim = renderMonster(
      ctx,
      actors,
      state,
      monster,
      cellSize,
      debugMode,
      currentTime,
    );
    if (isAnim) hasActiveAnimation = true;
  });
  return hasActiveAnimation;
};

const renderMonster = (
  ctx: CanvasRenderingContext2D,
  actors: CanvasImageSource,
  state: GameState,
  monster: Monster,
  cellSize: number,
  debugMode: boolean,
  currentTime: number = Date.now(),
): boolean => {
  const cell =
    state.dungeon.layout.grid[monster.position.y][monster.position.x];
  if (monster && monster.health > 0 && isRoomDiscovered(state.dungeon, cell)) {
    const visualPos = getActorVisualPosition(monster, currentTime);
    const x = visualPos.x;
    const y = visualPos.y;
    switch (monster.type) {
      case MonsterType.ORC:
      case MonsterType.ORCH:
        renderOrch(ctx, actors, cellSize, x, y);
        break;
      case MonsterType.TROLL:
        renderTroll(ctx, actors, cellSize, x, y);
        break;
      default:
        renderDefaultMonster(ctx, actors, cellSize, x, y);
        break;
    }
    renderActorBar(ctx, monster, cellSize, x, y);
    renderHealthBar(ctx, monster, cellSize, x, y);
    renderLineOfSight(
      ctx,
      monster,
      state.heroes,
      state,
      cellSize,
      debugMode,
      x,
      y,
    );
    return isActorAnimating(monster, currentTime);
  }
  return false;
};

const renderOrch = (
  ctx: CanvasRenderingContext2D,
  actors: CanvasImageSource,
  cellSize: number,
  x: number,
  y: number,
) => {
  drawCachedTile(
    ctx,
    actors,
    11 * 32 - 16,
    8 * 32,
    32,
    32,
    x * cellSize,
    y * cellSize,
    32,
    32,
  );
};

const renderTroll = (
  ctx: CanvasRenderingContext2D,
  actors: CanvasImageSource,
  cellSize: number,
  x: number,
  y: number,
) => {
  drawCachedTile(
    ctx,
    actors,
    11 * 32 - 16,
    4 * 32,
    32,
    32,
    x * cellSize,
    y * cellSize,
    32,
    32,
  );
};

const renderDefaultMonster = (
  ctx: CanvasRenderingContext2D,
  actors: CanvasImageSource,
  cellSize: number,
  x: number,
  y: number,
) => {
  drawCachedTile(
    ctx,
    actors,
    11 * 32 - 16,
    2 * 32,
    32,
    32,
    x * cellSize,
    y * cellSize,
    32,
    32,
  );
};

const renderActorBar = (
  ctx: CanvasRenderingContext2D,
  monster: Monster,
  cellSize: number,
  x: number,
  y: number,
) => {
  ctx.beginPath();
  ctx.strokeStyle = monster.colour;
  ctx.fillStyle = monster.colour;
  ctx.fillRect(
    x * cellSize + 4,
    y * cellSize + (cellSize - 6),
    cellSize - 8,
    4,
  );
  ctx.stroke();
  ctx.strokeStyle = 'black';
  ctx.fillStyle = 'black';
};

const renderHealthBar = (
  ctx: CanvasRenderingContext2D,
  monster: Monster,
  cellSize: number,
  x: number,
  y: number,
) => {
  ctx.beginPath();
  ctx.strokeStyle = 'black';
  ctx.fillStyle = 'red';
  ctx.fillRect(x * cellSize + 4, y * cellSize, cellSize - 8, 4);
  ctx.fillStyle = 'green';
  ctx.fillRect(
    x * cellSize + 4,
    y * cellSize,
    (cellSize - 8) * (monster.health / monster.maxHealth),
    4,
  );
  ctx.rect(x * cellSize + 4, y * cellSize, cellSize - 8, 4);
  ctx.stroke();
  ctx.strokeStyle = 'black';
  ctx.fillStyle = 'black';
};

const renderLineOfSight = (
  ctx: CanvasRenderingContext2D,
  from: Monster,
  to: Actor[],
  state: GameState,
  cellSize: number,
  debugMode: boolean,
  x: number,
  y: number,
) => {
  if (debugMode) {
    to.forEach((target) => {
      const seenCells: Position[] = [];
      const startPixelPos = {
        x: x * 48 - 24,
        y: y * 48 - 24,
      };
      const targetPixelPos = {
        x: target.position.x * 48 - 24,
        y: target.position.y * 48 - 24,
      };
      const seen = stepAlongLine(
        startPixelPos,
        { x: Math.round(x), y: Math.round(y) },
        targetPixelPos,
        target.position,
        48,
        state,
        false,
        seenCells,
      );
      if (seen) {
        const sX = x;
        const sY = y;
        const eX = target.position.x;
        const eY = target.position.y;

        ctx.beginPath();
        ctx.strokeStyle = from.colour;
        ctx.lineWidth = 2;
        ctx.moveTo(sX * cellSize + cellSize / 2, sY * cellSize + cellSize / 2);
        ctx.lineTo(eX * cellSize + cellSize / 2, eY * cellSize + cellSize / 2);
        ctx.stroke();
        ctx.lineWidth = 1;
      }
    });
  }
};
