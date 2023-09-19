import type {
  GameState,
  Hero
} from "../routes/types";
import {
  isDiscovered,
  isWalkable
} from "../routes/game";
import {
  isBlockedByHero,
  isBlockedByMonster,
  liveHeroes
} from "./HeroLogic";

export const renderHeroes = (ctx: CanvasRenderingContext2D, actors: CanvasImageSource, cellSize: number, state: GameState, debugMode: boolean) => {
  const heroes = liveHeroes(state);
  heroes.forEach((hero) => {
    renderHero(ctx, hero, actors, cellSize);
  });
  renderWalkableArea(ctx, state, cellSize);
  renderCurrentActor(ctx, state, cellSize);
}

const renderHero = (ctx: CanvasRenderingContext2D, hero: Hero, actors: CanvasImageSource, cellSize: number) => {
  const x = hero.position.x;
  const y = hero.position.y;
  ctx.drawImage(actors, 4*16, 0, 16, 16, x*cellSize, y*cellSize, cellSize, cellSize);
  renderActionOnActor(ctx, hero, x, y, cellSize)
  renderActorBar(ctx, hero, x, y, cellSize);
  renderHealthBar(ctx, hero, x, y, cellSize);
}

const renderActionOnActor = (ctx: CanvasRenderingContext2D, hero: Hero,  x: number, y: number, cellSize: number) => {
  const prevFillStyle = ctx.fillStyle;
  const prevStrokeStyle = ctx.strokeStyle;

  ctx.strokeStyle = "#080808";
  ctx.fillStyle = "darkred";
  for (let index = 0; index < hero.actions; index++) {
    ctx.fillRect((x * cellSize + 4 + 6*index) , y*cellSize + cellSize - 12, 5, 5);
    ctx.rect((x * cellSize + 4 + 6*index) , y*cellSize + cellSize - 12, 5, 5);
    ctx.stroke();
  }

  ctx.fillStyle = "blue";
  for (let index = 0; index < hero.movement; index++) {
    ctx.fillRect((x * cellSize + cellSize - 22 + 6*index) , y*cellSize + cellSize - 12, 5, 5);
    ctx.rect((x * cellSize + cellSize - 22 + 6*index) , y*cellSize + cellSize - 12, 5, 5);
    ctx.stroke();
  }

  ctx.fillStyle = prevFillStyle;
  ctx.strokeStyle = prevStrokeStyle;
}

const renderHealthBar = (ctx: CanvasRenderingContext2D, hero: Hero,  x: number, y: number, cellSize: number) => {
  ctx.beginPath();
  ctx.strokeStyle = 'black';
  ctx.fillStyle = 'red';
  ctx.fillRect((x * cellSize) + 4, y*cellSize, (cellSize - 8), 4);
  ctx.fillStyle = 'green';
  ctx.fillRect((x * cellSize) + 4, y*cellSize, (cellSize - 8) * (hero.health/hero.maxHealth), 4);
  ctx.rect((x * cellSize) + 4, y*cellSize, (cellSize - 8), 4);
  ctx.stroke();
}

const renderActorBar = (ctx: CanvasRenderingContext2D, hero: Hero,  x: number, y: number, cellSize: number) => {
  ctx.beginPath();
  ctx.strokeStyle = hero.colour;
  ctx.fillStyle = hero.colour;
  ctx.fillRect((x * cellSize) + 4, (y * cellSize) + (cellSize - 6), cellSize - 8, 4);
  ctx.stroke();
}

const renderWalkableArea = (ctx: CanvasRenderingContext2D, state: GameState, cellSize: number) => {
  const hero = state.currentActor;
  if (hero) {
    for (let pX = hero.position.x - hero.movement; pX <= hero.position.x + hero.movement; pX++) {
      for (let pY = hero.position.y - hero.movement; pY <= hero.position.y + hero.movement; pY++) {
        const discovered = isDiscovered(state.dungeon, pX, pY);
        if (discovered) {
          const blockedByMonster = isBlockedByMonster(state, pX, pY);
          const blockedByHeroes = isBlockedByHero(state, pX, pY);
          const walkable = isWalkable(state.dungeon.layout, pX, pY);
          if (!blockedByHeroes && !blockedByMonster && walkable) {
            ctx.fillStyle = "rgba(50, 50, 255, 0.08)";
            ctx.fillRect((pX * cellSize), pY * cellSize, cellSize, cellSize);
            ctx.stroke();
          }
        }
      }
    }
  }
}

const renderCurrentActor = (ctx: CanvasRenderingContext2D, state: GameState, cellSize: number) => {
  const hero = state.currentActor
  if (hero) {
    ctx.beginPath();
    ctx.strokeStyle = 'lightblue';
    ctx.lineWidth = 2;

    ctx.moveTo(hero.position.x * cellSize, hero.position.y * cellSize);
    ctx.lineTo(hero.position.x * cellSize + (cellSize/3), hero.position.y * cellSize);
    ctx.moveTo(hero.position.x * cellSize, hero.position.y * cellSize);
    ctx.lineTo(hero.position.x * cellSize, hero.position.y * cellSize + (cellSize/3));

    ctx.moveTo(hero.position.x * cellSize + cellSize, hero.position.y * cellSize);
    ctx.lineTo(hero.position.x * cellSize + (cellSize/3)*2, hero.position.y * cellSize);
    ctx.moveTo(hero.position.x * cellSize + cellSize, hero.position.y * cellSize);
    ctx.lineTo(hero.position.x * cellSize + cellSize, hero.position.y * cellSize + (cellSize/3));

    ctx.moveTo(hero.position.x * cellSize, hero.position.y * cellSize + cellSize);
    ctx.lineTo(hero.position.x * cellSize, hero.position.y * cellSize + (cellSize/3)*2);
    ctx.moveTo(hero.position.x * cellSize, hero.position.y * cellSize + cellSize);
    ctx.lineTo(hero.position.x * cellSize + (cellSize/3), hero.position.y * cellSize + cellSize);

    ctx.moveTo(hero.position.x * cellSize + cellSize, hero.position.y * cellSize + cellSize);
    ctx.lineTo(hero.position.x * cellSize + cellSize, hero.position.y * cellSize + (cellSize/3)*2);
    ctx.moveTo(hero.position.x * cellSize + cellSize, hero.position.y * cellSize + cellSize);
    ctx.lineTo(hero.position.x * cellSize + (cellSize/3)*2, hero.position.y * cellSize + cellSize);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}
