import type { GameState, Hero } from '../types';
import {
  getActorVisualPosition,
  hasLineOfSight,
  isActorAnimating,
  isDiscovered,
  isWalkable,
} from '../core';
import { isBlockedByHero, isBlockedByMonster, liveHeroes } from './HeroLogic';
import { drawCachedTile } from '../dungeon/TileTextureCache';

export const renderHeroes = (
  ctx: CanvasRenderingContext2D,
  actors: CanvasImageSource,
  cellSize: number,
  state: GameState,
  debugMode: boolean,
  currentTime: number = Date.now(),
): boolean => {
  const heroes = liveHeroes(state);
  let hasActiveAnimation = false;
  heroes.forEach((hero) => {
    const isAnim = renderHero(
      ctx,
      hero,
      actors,
      cellSize,
      debugMode,
      currentTime,
    );
    if (isAnim) hasActiveAnimation = true;
  });
  renderWalkableArea(ctx, state, cellSize);
  renderCurrentActor(ctx, state, cellSize, currentTime);
  return hasActiveAnimation;
};

const renderHero = (
  ctx: CanvasRenderingContext2D,
  hero: Hero,
  actors: CanvasImageSource,
  cellSize: number,
  debugMode: boolean,
  currentTime: number = Date.now(),
): boolean => {
  const visualPos = getActorVisualPosition(hero, currentTime);
  const x = visualPos.x;
  const y = visualPos.y;
  drawCachedTile(
    ctx,
    actors,
    0,
    2 * 32,
    32,
    32,
    x * cellSize,
    y * cellSize,
    32,
    32,
  );
  renderActionOnActor(ctx, hero, x, y, cellSize);
  renderActorBar(ctx, hero, x, y, cellSize);
  renderHealthBar(ctx, hero, x, y, cellSize);
  if (debugMode) {
    const debugText = `(${hero.position.x},${hero.position.y})`;
    ctx.fillStyle = 'black';
    ctx.font = '8px Arial';
    ctx.fillText(debugText, x * cellSize + 3, y * cellSize + 10);
  }
  return isActorAnimating(hero, currentTime);
};

const renderActionOnActor = (
  ctx: CanvasRenderingContext2D,
  hero: Hero,
  x: number,
  y: number,
  cellSize: number,
) => {
  const prevFillStyle = ctx.fillStyle;
  const prevStrokeStyle = ctx.strokeStyle;

  ctx.strokeStyle = '#080808';
  ctx.fillStyle = 'darkred';
  for (let index = 0; index < hero.actions; index++) {
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
  for (let index = 0; index < hero.movement; index++) {
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

const renderHealthBar = (
  ctx: CanvasRenderingContext2D,
  hero: Hero,
  x: number,
  y: number,
  cellSize: number,
) => {
  ctx.beginPath();
  ctx.strokeStyle = 'black';
  ctx.fillStyle = 'red';
  ctx.fillRect(x * cellSize + 4, y * cellSize, cellSize - 8, 4);
  ctx.fillStyle = 'green';
  ctx.fillRect(
    x * cellSize + 4,
    y * cellSize,
    (cellSize - 8) * (hero.health / hero.maxHealth),
    4,
  );
  ctx.rect(x * cellSize + 4, y * cellSize, cellSize - 8, 4);
  ctx.stroke();
};

const renderActorBar = (
  ctx: CanvasRenderingContext2D,
  hero: Hero,
  x: number,
  y: number,
  cellSize: number,
) => {
  ctx.beginPath();
  ctx.strokeStyle = hero.colour;
  ctx.fillStyle = hero.colour;
  ctx.fillRect(
    x * cellSize + 4,
    y * cellSize + (cellSize - 6),
    cellSize - 8,
    4,
  );
  ctx.stroke();
};

const renderWalkableArea = (
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cellSize: number,
) => {
  const hero = state.currentActor;
  if (hero) {
    for (
      let pX: number = hero.position.x - hero.movement;
      pX <= hero.position.x + hero.movement;
      pX++
    ) {
      for (
        let pY: number = hero.position.y - hero.movement;
        pY <= hero.position.y + hero.movement;
        pY++
      ) {
        const discovered = isDiscovered(state.dungeon, pX, pY);
        if (
          discovered &&
          !(pX === hero?.position.x && pY === hero?.position.y)
        ) {
          const blockedByMonster = isBlockedByMonster(state, pX, pY);
          const blockedByHeroes = isBlockedByHero(state, pX, pY);
          const walkable = isWalkable(state.dungeon.layout, pX, pY);
          const los = hasLineOfSight(
            hero.position,
            { x: pX, y: pY },
            2,
            state,
            true,
          );
          if (!blockedByHeroes && !blockedByMonster && walkable && los) {
            ctx.fillStyle = 'rgba(50, 50, 255, 0.08)';
            ctx.fillRect(pX * cellSize, pY * cellSize, cellSize, cellSize);
            ctx.stroke();
          }
        }
      }
    }
  }
};

const renderCurrentActor = (
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cellSize: number,
  currentTime: number = Date.now(),
) => {
  const hero = state.currentActor;
  if (hero) {
    const visualPos = getActorVisualPosition(hero, currentTime);
    const x = visualPos.x;
    const y = visualPos.y;
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
  }
};
