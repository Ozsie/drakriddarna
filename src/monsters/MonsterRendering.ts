import type { Hero, GameState, Monster, Position } from "../types";
import { MonsterType } from "../types";
import { stepAlongLine } from "../game";

export const renderMonsters = (
  ctx: CanvasRenderingContext2D,
  actors: CanvasImageSource,
  cellSize: number,
  state: GameState,
  debugMode: boolean,
) => {
  state.dungeon.layout.monsters.forEach((monster) => {
    renderMonster(ctx, actors, state, monster, cellSize, debugMode);
  });
};

const renderMonster = (
  ctx: CanvasRenderingContext2D,
  actors: CanvasImageSource,
  state: GameState,
  monster: Monster,
  cellSize: number,
  debugMode: boolean,
) => {
  const cell =
    state.dungeon.layout.grid[monster.position.y][monster.position.x];
  if (monster && monster.health > 0 && isInDiscoveredRoom(cell, state)) {
    switch (monster.type) {
      case MonsterType.ORCH:
        renderOrch(ctx, actors, cellSize, monster);
        break;
      case MonsterType.TROLL:
        renderTroll(ctx, actors, cellSize, monster);
        break;
      default:
        renderDefaultMonster(ctx, actors, cellSize, monster);
        break;
    }
    renderActorBar(ctx, monster, cellSize);
    renderHealthBar(ctx, monster, cellSize);
    renderLineOfSight(ctx, monster, state.heroes, state, cellSize, debugMode);
  }
};

const renderOrch = (
  ctx: CanvasRenderingContext2D,
  actors: CanvasImageSource,
  cellSize: number,
  monster: Monster,
) => {
  ctx.drawImage(
    actors,
    cellSize,
    16,
    16,
    16,
    monster.position.x * cellSize,
    monster.position.y * cellSize,
    cellSize,
    cellSize,
  );
};

const renderTroll = (
  ctx: CanvasRenderingContext2D,
  actors: CanvasImageSource,
  cellSize: number,
  monster: Monster,
) => {
  ctx.drawImage(
    actors,
    cellSize,
    16,
    16,
    16,
    monster.position.x * cellSize,
    monster.position.y * cellSize,
    cellSize,
    cellSize,
  );
};

const renderDefaultMonster = (
  ctx: CanvasRenderingContext2D,
  actors: CanvasImageSource,
  cellSize: number,
  monster: Monster,
) => {
  ctx.drawImage(
    actors,
    16,
    16,
    16,
    16,
    monster.position.x * cellSize,
    monster.position.y * cellSize,
    cellSize,
    cellSize,
  );
};

const renderActorBar = (
  ctx: CanvasRenderingContext2D,
  monster: Monster,
  cellSize: number,
) => {
  ctx.beginPath();
  ctx.strokeStyle = monster.colour;
  ctx.fillStyle = monster.colour;
  ctx.fillRect(
    monster.position.x * cellSize + 4,
    monster.position.y * cellSize + (cellSize - 6),
    cellSize - 8,
    4,
  );
  ctx.stroke();
  ctx.strokeStyle = "black";
  ctx.fillStyle = "black";
};

const renderHealthBar = (
  ctx: CanvasRenderingContext2D,
  monster: Monster,
  cellSize: number,
) => {
  ctx.beginPath();
  ctx.strokeStyle = "black";
  ctx.fillStyle = "red";
  ctx.fillRect(
    monster.position.x * cellSize + 4,
    monster.position.y * cellSize,
    cellSize - 8,
    4,
  );
  ctx.fillStyle = "green";
  ctx.fillRect(
    monster.position.x * cellSize + 4,
    monster.position.y * cellSize,
    (cellSize - 8) * (monster.health / monster.maxHealth),
    4,
  );
  ctx.rect(
    monster.position.x * cellSize + 4,
    monster.position.y * cellSize,
    cellSize - 8,
    4,
  );
  ctx.stroke();
  ctx.strokeStyle = "black";
  ctx.fillStyle = "black";
};

const renderLineOfSight = (
  ctx: CanvasRenderingContext2D,
  from: Monster,
  to: Hero[],
  state: GameState,
  cellSize: number,
  debugMode: boolean,
) => {
  if (debugMode) {
    to.forEach((target) => {
      const seenCells: Position[] = [];
      const startPixelPos = {
        x: from.position.x * 48 - 24,
        y: from.position.y * 48 - 24,
      };
      const targetPixelPos = {
        x: target.position.x * 48 - 24,
        y: target.position.y * 48 - 24,
      };
      const seen = stepAlongLine(
        startPixelPos,
        from.position,
        targetPixelPos,
        target.position,
        state,
        false,
        seenCells,
      );
      if (seen) {
        const sX = from.position.x;
        const sY = from.position.y;
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

const isInDiscoveredRoom = (cell: string, state: GameState) =>
  state.dungeon.discoveredRooms.includes(cell);
