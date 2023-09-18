import type { Hero, GameState, Monster, Position } from "../routes/types";
import { MonsterType } from "../routes/types";
import { findCell, normaliseVector } from "../routes/game";
import { PILLAR, WALL } from "../routes/dungeons";

export const renderMonsters = (ctx: CanvasRenderingContext2D, actors: CanvasImageSource, cellSize: number, state: GameState, debugMode: boolean) => {
  state.dungeon.layout.monsters.forEach((monster) => {
    renderMonster(ctx, actors, state, monster, cellSize, debugMode);
  });
}

const renderMonster = (ctx: CanvasRenderingContext2D, actors: CanvasImageSource, state: GameState, monster: Monster, cellSize: number, debugMode: boolean) => {
  const cell = state.dungeon.layout.grid[monster.position.y][monster.position.x]
  if (monster && monster.health > 0 && isInDiscoveredRoom(cell, state)) {
    switch (monster.type) {
      case MonsterType.ORCH: renderOrch(ctx, actors, cellSize, monster); break;
      case MonsterType.TROLL: renderTroll(ctx, actors, cellSize, monster); break;
      default: renderDefaultMonster(ctx, actors, cellSize, monster); break;
    }
    renderActorBar(ctx, monster, cellSize);
    renderHealthBar(ctx, monster, cellSize);
    renderLineOfSight(ctx, monster, state.heroes, state, cellSize, debugMode);
  }
}

const renderOrch = (ctx: CanvasRenderingContext2D, actors: CanvasImageSource, cellSize: number, monster: Monster) => {
  ctx.drawImage(actors, cellSize, 16, 16, 16, monster.position.x * cellSize, monster.position.y * cellSize, cellSize, cellSize);
}

const renderTroll = (ctx: CanvasRenderingContext2D, actors: CanvasImageSource, cellSize: number, monster: Monster) => {
  ctx.drawImage(actors, cellSize, 16, 16, 16, monster.position.x * cellSize, monster.position.y * cellSize, cellSize, cellSize);
}

const renderDefaultMonster = (ctx: CanvasRenderingContext2D, actors: CanvasImageSource, cellSize: number, monster: Monster) => {
  ctx.drawImage(actors, 16, 16, 16, 16, monster.position.x * cellSize, monster.position.y * cellSize, cellSize, cellSize);
}

const renderActorBar = (ctx: CanvasRenderingContext2D, monster: Monster, cellSize: number) => {
  ctx.beginPath();
  ctx.strokeStyle = monster.colour;
  ctx.fillStyle = monster.colour;
  ctx.fillRect((monster.position.x * cellSize) + 4, (monster.position.y * cellSize) + (cellSize - 6), cellSize - 8, 4);
  ctx.stroke();
}

const renderHealthBar = (ctx: CanvasRenderingContext2D, monster: Monster, cellSize: number) => {
  ctx.beginPath();
  ctx.strokeStyle = 'black';
  ctx.fillStyle = 'red';
  ctx.fillRect((monster.position.x * cellSize) + 4, monster.position.y*cellSize, (cellSize - 8), 4);
  ctx.fillStyle = 'green';
  ctx.fillRect((monster.position.x * cellSize) + 4, monster.position.y*cellSize, (cellSize - 8) * (monster.health/monster.maxHealth), 4);
  ctx.rect((monster.position.x * cellSize) + 4, monster.position.y*cellSize, (cellSize - 8), 4);
  ctx.stroke();
}

const renderLineOfSight = (ctx: CanvasRenderingContext2D, from: Monster, to: Hero[], state: GameState, cellSize: number, debugMode: boolean) => {
  if (debugMode) {
    to.forEach((target) => {
      const sX = from.position.x;
      const sY = from.position.y;
      const eX = target.position.x;
      const eY = target.position.y;


      ctx.strokeStyle = from.colour;
      ctx.beginPath();
      ctx.moveTo(sX * cellSize + (cellSize / 2), sY * cellSize + (cellSize / 2));
      ctx.lineTo(eX * cellSize + (cellSize / 2), eY * cellSize + (cellSize / 2));
      ctx.stroke();

      const seenCells: Position[] = [];
      const startPixelPos = { x: (from.position.x * 48) - 24, y: (from.position.y * 48) - 24 };
      const targetPixelPos = { x: (target.position.x * 48) - 24, y: (target.position.y * 48) - 24 };
      stepAlongLine(startPixelPos, from.position, targetPixelPos, target.position, state, seenCells);

      seenCells.forEach((cell) => {
        ctx.fillStyle = "rgba(255, 50, 255, 0.09)";
        ctx.fillRect((cell.x * cellSize), cell.y * cellSize, cellSize, cellSize);
        ctx.stroke();
      })
    });
  }
}

const isInDiscoveredRoom = (cell: string, state: GameState) => state.dungeon.discoveredRooms.includes(cell);

const stepAlongLine = (startPixelPos: Position, source: Position, targetPixelPos: Position, target: Position, state: GameState, seenCells: Position[]): void => {
  const nextPixelPosition = normaliseVector(startPixelPos, targetPixelPos);
  const nextCellPosition = { x: Math.round((nextPixelPosition.x + 24)/48), y: Math.round((nextPixelPosition.y + 24) / 48) };
  const nextCell = findCell(state.dungeon.layout.grid, nextCellPosition.x, nextCellPosition.y);
  if (nextCellPosition.x === target.x && nextCellPosition.y === target.y) {
    seenCells.push(nextCellPosition);
    return;
  } else if (nextCell === WALL || nextCell === PILLAR) {
    return;
  } else {
    if (!(nextCellPosition.x === source.x && nextCellPosition.y === source.y)) {
      seenCells.push(nextCellPosition);
    }
    return stepAlongLine(nextPixelPosition, source, targetPixelPos, target, state, seenCells);
  }
}
