import { SecretType, Side } from "../routes/types";
import type { Secret, GameState, Door } from "../routes/types";
import { EMPTY, WALL } from "../routes/dungeons";
import { toArray } from "../routes/game";

export const renderDoors = (ctx: CanvasRenderingContext2D, ground: CanvasImageSource, cellSize: number, state: GameState, debugMode: boolean) => {
  state.dungeon.layout.doors.forEach((door) => {
    renderDoor(ctx, ground, cellSize, state, door, debugMode);
  });
}

export const renderGrid = (ctx: CanvasRenderingContext2D, ground: CanvasImageSource, cellSize: number, state: GameState, debugMode: boolean) => {
  state.dungeon.layout.grid.forEach((row, y) => {
    toArray(row).forEach((cell: string, x: number) => {
      renderFloor(ctx, ground, state, cell, x, y, cellSize, debugMode);
      renderGridLines(ctx, cell, state, x, y, cellSize, debugMode);
    });
  });
}

export const renderSecrets = (ctx: CanvasRenderingContext2D, ground: CanvasImageSource, cellSize: number, state: GameState) => {
  state.dungeon.layout.secrets
    .filter((secret) => secret.found)
    .forEach((secret) => {
      switch (secret.type) {
        case SecretType.TRAP_DOOR: renderTrapDoor(ctx, ground, cellSize, secret); break;
        default: renderFoundSecret(ctx, ground, cellSize, secret); break;
      }
    });
}

const renderFloor = (ctx: CanvasRenderingContext2D, ground: CanvasImageSource, state: GameState, cell: string, x: number, y: number, cellSize: number) => {
  if (isWall(cell) || !state.dungeon.discoveredRooms.includes(cell) && cell !== EMPTY) {
    if (state.dungeon.discoveredRooms.some((r) => neighbourOf(x, y, r, state))) {
      ctx.drawImage(ground, 48, 0, 48, 48, x * cellSize, y * cellSize, cellSize, cellSize);
    } else {
      renderHiddenCell(ctx, x, y, cellSize);
    }
  } else if (!isEmpty(cell, state)) {
    ctx.drawImage(ground, 0, 0, 48, 48, x*cellSize, y*cellSize, cellSize, cellSize);
  } else {
    renderHiddenCell(ctx, x, y, cellSize);
  }
}

const renderHiddenCell = (ctx: CanvasRenderingContext2D, x: number, y: number, cellSize: number) => {
  ctx.beginPath();
  ctx.strokeStyle = "black";
  ctx.fillStyle = "black";
  ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
  ctx.stroke();
}

const renderTrapDoor = (ctx: CanvasRenderingContext2D, ground: CanvasImageSource, cellSize: number, secret: Secret) => {
  const x = secret.position.x;
  const y = secret.position.y;
  ctx.drawImage(ground, 3*48, 0, 48, 48, x*cellSize, y*cellSize, cellSize, cellSize);
}

const renderFoundSecret = (ctx: CanvasRenderingContext2D, ground: CanvasImageSource, cellSize: number, secret: Secret) => {
  const x = secret.position.x;
  const y = secret.position.y;
  ctx.drawImage(ground, 4*48, 0, 48, 48, x*cellSize, y*cellSize, cellSize, cellSize);
}

const renderGridLines = (ctx: CanvasRenderingContext2D, cell: string, state: GameState, x: number, y: number, cellSize: number, debugMode: boolean) => {
  if (!debugMode && (isEmpty(cell, state) || cell === WALL)) return;
  ctx.beginPath();
  ctx.strokeStyle = 'black';
  ctx.rect(x * cellSize, y * cellSize, cellSize, cellSize);
  if (debugMode) {
    ctx.font = "7px Arial";
    ctx.fillText(x + "," + y, (x * cellSize) + 3, (y * cellSize) + (cellSize - 3));
  }
  ctx.stroke();
}

const renderDoor = (ctx: CanvasRenderingContext2D, ground: CanvasImageSource, cellSize: number, state: GameState, door: Door, debugMode: boolean) => {
  const cell = state.dungeon.layout.grid[door.y][door.x]
  if (door && !door.hidden && !door.open && !isEmpty(cell, state)) {
    ctx.fillStyle = 'brown';
    switch (door.side) {
      case Side.RIGHT: {
        ctx.fillRect((door.x * cellSize) + (cellSize - 2), door.y * cellSize, 4, cellSize);
        if (door.locked && debugMode) {
          ctx.fillStyle = 'grey'
          ctx.fillRect((door.x*cellSize) + (cellSize - 4), (door.y*cellSize)+((cellSize/2) - 4), 8, 8)
        }
        break;
      }
      case Side.LEFT: {
        ctx.fillRect((door.x * cellSize)-2, door.y * cellSize, 4, cellSize);
        if (door.locked && debugMode) {
          ctx.fillStyle = 'grey'
          ctx.fillRect((door.x*cellSize)-4, (door.y*cellSize)+((cellSize/2) - 4), 8, 8)
        }
        break;
      }
      case Side.UP: {
        ctx.fillRect(door.x * cellSize, (door.y * cellSize) - 2, cellSize, 4);
        if (door.locked && debugMode) {
          ctx.fillStyle = 'grey'
          ctx.fillRect((door.x*cellSize)+((cellSize/2) - 4), (door.y*cellSize)-4, 8, 8)
        }
        break;
      }
      case Side.DOWN: {
        ctx.fillRect(door.x * cellSize, (door.y * cellSize) + (cellSize - 2), cellSize, 4);
        if (door.locked && debugMode) {
          ctx.fillStyle = 'grey'
          ctx.fillRect((door.x*cellSize)+((cellSize/2) - 4), (door.y*cellSize)+(cellSize - 4), 8, 8)
        }
        break;
      }
    }
  }
  if (debugMode && !isEmpty(cell, state)) {
    ctx.fillStyle = 'black';
    ctx.font = "12px Arial";
    ctx.fillText(`[${door.hidden ? 'H' : '-'}/${door.trapped ? 'T'+door.trapAttacks : '-'}/${door.locked ? 'L' : '-'}]`, door.x*cellSize, door.y*cellSize + 10);
    ctx.fillStyle = "rgba(50, 255, 255, 0.28)";
    ctx.fillRect(door.x*cellSize, door.y*cellSize, cellSize, cellSize);
  }
}

const isWall = (cell: string) => cell === WALL;

const isEmpty = (cell: string, state: GameState) => cell === EMPTY || !state.dungeon.discoveredRooms.includes(cell);

const neighbourOf = (x: number, y: number, value: string, state: GameState) => {
  if (!state) return;
  const xMin = Math.max(x-1, 0);
  const yMin = Math.max(y-1, 0);
  const xMax = Math.min(x+1, state.dungeon.layout.grid.length)
  const yMax = Math.min(y+1, state.dungeon.layout.grid[0].length)
  for (let pX = xMin; pX <= xMax; pX++) {
    for (let pY = yMin; pY <= yMax; pY++) {
      const row = state.dungeon.layout.grid[pY];
      const valueAt = toArray(row)[pX];
      if (valueAt === value) return true;
    }
  }
  return false;
}
