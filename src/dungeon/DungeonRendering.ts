import {
  CornerType,
  type Corner,
  type Door,
  type GameState,
  type Secret,
  SecretType,
  Side,
  type WallEdge,
} from '../types';
import { COLLAPSED, EMPTY, SEALED_DOOR, WALL } from '../core';
import {
  findCell,
  isDiscovered,
  isRoomDiscovered,
  isSamePosition,
  toArray,
} from '../core';
import { autoDetectCorners } from './cornerDetection';
import { drawCachedTile } from './TileTextureCache';

export const background = '#1E1C19';

export const renderDoors = (
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  cellSize: number,
  state: GameState,
  debugMode: boolean,
) => {
  state.dungeon.layout.doors.forEach((door) => {
    renderDoor(ctx, ground, cellSize, state, door, debugMode);
  });
};

// Default fill of an edge wall when neither the wall nor the layout
// specifies a colour.
export const DEFAULT_WALL_COLOUR = '#6e6a63';
const WALL_EDGE_COLOUR = '#4a4741';

// The flat strip an edge wall paints on the shared boundary between its two
// cells — same positioning and thickness as a closed door leaf. The geometry
// is kept separate from the painting so a tileset piece can replace the flat
// colour without touching the visibility rules.
export const edgeWallRect = (
  wall: WallEdge,
  cellSize: number,
): { x: number; y: number; w: number; h: number; vertical: boolean } => {
  const thickness = doorThickness(cellSize);
  const half = Math.floor(thickness / 2);
  const vertical = wall.side === Side.RIGHT || wall.side === Side.LEFT;
  const edgeX = wall.x * cellSize + (wall.side === Side.RIGHT ? cellSize : 0);
  const edgeY = wall.y * cellSize + (wall.side === Side.DOWN ? cellSize : 0);
  return {
    x: vertical ? edgeX - half : wall.x * cellSize,
    y: vertical ? wall.y * cellSize : edgeY - half,
    w: vertical ? thickness : cellSize,
    h: vertical ? cellSize : thickness,
    vertical,
  };
};

// A wall between two cells renders once at least one side is discovered.
// The validator rejects a wall sharing its edge with a door, so the wall
// never needs to yield to the door: it always paints, keeping the render
// consistent with movement, search and pathfinding even if validation was
// disabled.
const drawEdgeWall = (
  ctx: CanvasRenderingContext2D,
  wall: WallEdge,
  cellSize: number,
  state: GameState,
  debugMode: boolean,
) => {
  const layout = state.dungeon.layout;
  const farX = wall.side === Side.RIGHT ? 1 : wall.side === Side.LEFT ? -1 : 0;
  const farY = wall.side === Side.DOWN ? 1 : wall.side === Side.UP ? -1 : 0;
  const nearDiscovered = isDiscovered(state.dungeon, wall.x, wall.y);
  const farDiscovered = isDiscovered(
    state.dungeon,
    wall.x + farX,
    wall.y + farY,
  );
  if (!nearDiscovered && !farDiscovered && !debugMode) return;

  const rect = edgeWallRect(wall, cellSize);
  ctx.fillStyle = wall.colour ?? layout.wallColour ?? DEFAULT_WALL_COLOUR;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = WALL_EDGE_COLOUR;
  if (rect.vertical) {
    ctx.fillRect(rect.x, rect.y, 1, rect.h);
    ctx.fillRect(rect.x + rect.w - 1, rect.y, 1, rect.h);
  } else {
    ctx.fillRect(rect.x, rect.y, rect.w, 1);
    ctx.fillRect(rect.x, rect.y + rect.h - 1, rect.w, 1);
  }
};

export const renderWalls = (
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  state: GameState,
  debugMode: boolean,
) => {
  state.dungeon.layout.walls?.forEach((wall) => {
    drawEdgeWall(ctx, wall, cellSize, state, debugMode);
  });
};

export const renderGrid = (
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  cellSize: number,
  state: GameState,
  debugMode: boolean,
) => {
  state.dungeon.layout.grid.forEach((row, y) => {
    toArray(row).forEach((cell: string, x: number) => {
      renderFloor(ctx, ground, state, cell, x, y, cellSize);
      renderGridLines(ctx, cell, state, x, y, cellSize, debugMode);
    });
  });
  renderPits(ctx, ground, cellSize, state, debugMode);
};

export const renderSecrets = (
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  cellSize: number,
  state: GameState,
  debugMode: boolean,
) => {
  state.dungeon.layout.secrets
    .filter((secret) => secret.found)
    .forEach((secret) => {
      switch (secret.type) {
        case SecretType.TRAP_DOOR:
          renderTrapDoor(ctx, ground, cellSize, secret);
          break;
        default:
          renderFoundSecret(ctx, ground, cellSize, secret);
          break;
      }
    });
  state.dungeon.layout.secrets
    .filter((secret) => !secret.found)
    .forEach((secret) => {
      ctx.globalAlpha = 0.6;
      drawTile(
        ctx,
        ground,
        9,
        0,
        cellSize,
        secret.position.x,
        secret.position.y,
        state,
      );
      ctx.globalAlpha = 1;
      if (debugMode) {
        const secretText = `${secret.type}`;
        ctx.fillStyle = 'rgba(255, 50, 50, 0.28)';
        ctx.fillRect(
          secret.position.x * cellSize,
          secret.position.y * cellSize,
          cellSize,
          cellSize,
        );
        ctx.fillStyle = 'black';
        ctx.font = '12px Arial';
        ctx.fillText(
          secretText,
          secret.position.x * cellSize,
          secret.position.y * cellSize + 10,
        );
      }
    });
};

const drawTile = (
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  xPos: number,
  yPos: number,
  cellSize: number,
  x: number,
  y: number,
  state: GameState,
) => {
  if (
    state.dungeon.discoveredRooms.some((r) => neighbourOf(x, y, r, state)) ||
    neighbourOf(x, y, COLLAPSED, state)
  ) {
    drawCachedTile(
      ctx,
      ground,
      xPos * 48,
      yPos * 48,
      48,
      48,
      x * cellSize,
      y * cellSize,
      cellSize,
      cellSize,
    );
  } else {
    renderHiddenCell(ctx, x, y, cellSize);
  }
};

const drawCornerTile = (
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  corner: CornerType,
  cellSize: number,
  x: number,
  y: number,
  state: GameState,
) => {
  switch (corner) {
    case CornerType.INNER_BOTTOM_LEFT: {
      drawTile(ctx, ground, 0, 6, cellSize, x, y, state);
      break;
    }
    case CornerType.INNER_BOTTOM_RIGHT: {
      drawTile(ctx, ground, 4, 6, cellSize, x, y, state);
      break;
    }
    case CornerType.INNER_TOP_LEFT: {
      drawTile(ctx, ground, 0, 4, cellSize, x, y, state);
      break;
    }
    case CornerType.INNER_TOP_RIGHT: {
      drawTile(ctx, ground, 4, 4, cellSize, x, y, state);
      break;
    }
    case CornerType.OUTER_TOP_RIGHT: {
      drawTile(ctx, ground, 4, 0, cellSize, x, y, state);
      break;
    }
    case CornerType.OUTER_TOP_LEFT: {
      drawTile(ctx, ground, 0, 0, cellSize, x, y, state);
      break;
    }
    case CornerType.OUTER_BOTTOM_RIGHT:
    case CornerType.RIGHT_END: {
      drawTile(ctx, ground, 4, 2, cellSize, x, y, state);
      break;
    }
    case CornerType.OUTER_BOTTOM_LEFT:
    case CornerType.LEFT_END: {
      drawTile(ctx, ground, 0, 2, cellSize, x, y, state);
      break;
    }
    case CornerType.BOTTOM_END: {
      drawTile(ctx, ground, 2, 4, cellSize, x, y, state);
      break;
    }
    case CornerType.TOP_END: {
      drawTile(ctx, ground, 4, 7, cellSize, x, y, state);
      break;
    }
    case CornerType.THREE_WAY_INTERSECTION_UP: {
      drawTile(ctx, ground, 4, 8, cellSize, x, y, state);
      break;
    }
    default:
      drawTile(ctx, ground, 15, 0, cellSize, x, y, state);
      break;
  }
};

const renderPits = (
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  cellSize: number,
  state: GameState,
  debugMode: boolean,
) => {
  state.dungeon.layout.pits
    ?.filter((pit) => isDiscovered(state.dungeon, pit.x, pit.y) || debugMode)
    ?.forEach((pit) => {
      drawTile(ctx, ground, 13, 0, cellSize, pit.x, pit.y, state);
    });
};

export const renderPillars = (
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  cellSize: number,
  state: GameState,
  debugMode: boolean,
) => {
  state.dungeon.layout.pillars
    ?.filter(
      (pillar) => isDiscovered(state.dungeon, pillar.x, pillar.y) || debugMode,
    )
    ?.forEach((pillar) => {
      drawTile(ctx, ground, 7, 2, cellSize, pillar.x, pillar.y, state);
      ctx.globalAlpha = 0.4;
      drawTile(ctx, ground, 7, 1, cellSize, pillar.x, pillar.y - 1, state);
      ctx.globalAlpha = 1;
    });
};

export const renderPortal = (
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  state: GameState,
  debugMode: boolean,
) => {
  const portal = state.dungeon.portal;
  if (!portal) return;
  if (!isDiscovered(state.dungeon, portal.x, portal.y) && !debugMode) return;

  const centerX = portal.x * cellSize + cellSize / 2;
  const centerY = portal.y * cellSize + cellSize / 2;
  const radius = cellSize * 0.4;

  ctx.save();
  ctx.fillStyle = 'rgba(155, 89, 182, 0.35)';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(210, 170, 255, 0.9)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    const angle1 = (Math.PI / 3) * i - Math.PI / 2;
    const angle2 = (Math.PI / 3) * ((i + 2) % 6) - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(
      centerX + radius * Math.cos(angle1),
      centerY + radius * Math.sin(angle1),
    );
    ctx.lineTo(
      centerX + radius * Math.cos(angle2),
      centerY + radius * Math.sin(angle2),
    );
    ctx.stroke();
  }
  ctx.restore();
};

export const renderInteractables = (
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  cellSize: number,
  state: GameState,
  debugMode: boolean,
) => {
  state.dungeon.layout.interactables?.forEach((interactable) => {
    if (
      !isDiscovered(
        state.dungeon,
        interactable.position.x,
        interactable.position.y,
      ) &&
      !debugMode
    ) {
      return;
    }
    if (!interactable.secret) {
      ctx.fillStyle = 'rgba(50, 150, 255, 0.28)';
      ctx.fillRect(
        interactable.position.x * cellSize,
        interactable.position.y * cellSize,
        cellSize,
        cellSize,
      );
    }
    if (debugMode) {
      if (interactable.secret) {
        ctx.fillStyle = 'rgba(50, 150, 255, 0.28)';
        ctx.fillRect(
          interactable.position.x * cellSize,
          interactable.position.y * cellSize,
          cellSize,
          cellSize,
        );
      }
      ctx.fillStyle = 'cyan';
      ctx.font = '10px Arial';
      ctx.fillText(
        interactable.effect,
        interactable.position.x * cellSize + 2,
        interactable.position.y * cellSize + 12,
      );
    }
  });
};

const randomFloorTileCoordinates = (seed: number) => {
  let rndX: number;
  let rndY: number;
  if (seed / 100 > 2) {
    rndX = 1;
    rndY = 5;
  } else if (seed / 100 > 1.8) {
    rndX = 11;
    rndY = 0;
  } else if (seed / 100 > 1) {
    rndX = 10;
    rndY = 0;
  } else if (seed / 100 === 1) {
    rndX = 12;
    rndY = 0;
  } else {
    rndX = 8;
    rndY = 0;
  }
  return { rndX, rndY };
};

const renderFloor = (
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  state: GameState,
  cell: string,
  x: number,
  y: number,
  cellSize: number,
) => {
  if (notGround(cell, state)) {
    if (cell === COLLAPSED) {
      drawTile(ctx, ground, 0, 0, cellSize, x, y, state);
      drawTile(ctx, ground, 2, 0, cellSize, x, y, state);
    } else {
      const corner = isCornerWall(x, y, state);
      if (corner !== CornerType.NOT_CORNER) {
        drawCornerTile(ctx, ground, corner, cellSize, x, y, state);
      } else {
        const vertical = isVerticalWall(x, y, state);
        const horizontal = isHorizontalWall(x, y, state);
        if (horizontal !== 'none' && vertical === 'none') {
          if (horizontal === 'up') {
            drawTile(ctx, ground, 1, 0, cellSize, x, y, state);
          } else if (horizontal === 'down') {
            drawTile(ctx, ground, 2, 4, cellSize, x, y, state);
          } else {
            drawTile(ctx, ground, 0, 2, cellSize, x, y, state);
          }
        } else if (vertical !== 'none') {
          if (vertical === 'left') {
            drawTile(ctx, ground, 4, 5, cellSize, x, y, state);
          } else if (vertical === 'right') {
            drawTile(ctx, ground, 0, 5, cellSize, x, y, state);
          } else {
            drawTile(ctx, ground, 5, 7, cellSize, x, y, state);
          }
        }
      }
    }
  } else if (!isEmpty(cell, state)) {
    // Ordinary floor
    const seed = (x + y) * 10;
    const { rndX, rndY } = randomFloorTileCoordinates(seed);
    drawTile(ctx, ground, rndX, rndY, cellSize, x, y, state);
  } else {
    renderHiddenCell(ctx, x, y, cellSize);
  }
};

const isHorizontalWall = (x: number, y: number, state: GameState): string => {
  // Classify against the sealed grid: a hidden cell sealed behind a closed
  // door renders as a wall piece here, so it must classify as one
  const grid = sealedGrid(state);
  const cell = findCell(grid, x, y);
  if (cell !== WALL && cell !== SEALED_DOOR) {
    return 'none';
  }
  if (x === 0 || x === grid[0].length - 1) {
    return 'none';
  }
  const cellLeft = findCell(grid, x - 1, y);
  const cellRight = findCell(grid, x + 1, y);
  const isHorizontal =
    cellLeft === WALL ||
    isEmpty(cellLeft, state) ||
    cellRight === WALL ||
    isEmpty(cellRight, state);
  if (isHorizontal) {
    const cellAbove = findCell(grid, x, y - 1);
    const cellBelow = findCell(grid, x, y + 1);
    if (isRoom(cellAbove, state) && isRoom(cellBelow, state)) {
      return 'both';
    } else if (isRoom(cellAbove, state)) {
      return 'up';
    } else if (isRoom(cellBelow, state)) {
      return 'down';
    } else {
      return 'none';
    }
  } else {
    return 'none';
  }
};

const isVerticalWall = (x: number, y: number, state: GameState): string => {
  // Classify against the sealed grid: a hidden cell sealed behind a closed
  // door renders as a wall piece here, so it must classify as one
  const grid = sealedGrid(state);
  const cell = findCell(grid, x, y);
  if (cell !== WALL && cell !== SEALED_DOOR) {
    return 'none';
  }
  if (y === 0 || y === grid.length - 1) {
    return 'none';
  }

  const cellAbove = findCell(grid, x, y - 1);
  const cellBelow = findCell(grid, x, y + 1);
  const isVertical =
    cellAbove === WALL ||
    isEmpty(cellAbove, state) ||
    cellBelow === WALL ||
    isEmpty(cellBelow, state);
  if (isVertical) {
    const cellLeft = findCell(grid, x - 1, y);
    const cellRight = findCell(grid, x + 1, y);
    if (isRoom(cellLeft, state) && isRoom(cellRight, state)) {
      return 'both';
    } else if (isRoom(cellLeft, state)) {
      return 'left';
    } else if (isRoom(cellRight, state)) {
      return 'right';
    } else {
      return 'none';
    }
  } else {
    return 'none';
  }
};

// A closed door whose far side is undiscovered is drawn as wall pieces
// (renderClosedDoor / renderClosedHiddenDoor), sealing the passage until it
// is opened. The corner classifier must see the same sealed geometry: the far
// cell and the two cells flanking the doorway are replaced with the SEALED_DOOR
// marker wherever they are not discovered yet. Sealed cells count as wall for
// closed sides — a corridor end gets its corner caps exactly like a dead end,
// and the corner cells beside a door set in a solid wall render their caps too
// — but never as the stem of a junction, since a sealed doorway renders as a
// door rather than rock. Invisible sealed cells (no discovered floor bordering
// them) resolve to unknown during classification, so sealing never fabricates
// junction shapes on the wall pieces themselves.
export const sealedCornerGrid = (state: GameState): string[] => {
  const grid = [...state.dungeon.layout.grid];
  const sealable = (cell: string) =>
    Boolean(cell) &&
    cell !== WALL &&
    cell !== COLLAPSED &&
    !isRoomDiscovered(state.dungeon, cell);
  state.dungeon.layout.doors.forEach((door) => {
    if (door.open) return;
    const farX =
      door.side === Side.RIGHT
        ? door.x + 1
        : door.side === Side.LEFT
        ? door.x - 1
        : door.x;
    const farY =
      door.side === Side.DOWN
        ? door.y + 1
        : door.side === Side.UP
        ? door.y - 1
        : door.y;
    const farCell = findCell(grid, farX, farY);
    const farDiscovered = farCell !== '' && !isEmpty(farCell, state);
    if (farDiscovered) return;
    const flankX = door.side === Side.UP || door.side === Side.DOWN ? 1 : 0;
    const flankY = door.side === Side.LEFT || door.side === Side.RIGHT ? 1 : 0;
    [
      [farX, farY],
      [farX - flankX, farY - flankY],
      [farX + flankX, farY + flankY],
    ].forEach(([x, y]) => {
      if (!sealable(findCell(grid, x, y))) return;
      grid[y] = grid[y].slice(0, x) + SEALED_DOOR + grid[y].slice(x + 1);
    });
  });
  return grid;
};

// Everything that can change the visible corner classification or the sealed
// grid, hashed into a shared cache key.
const visibleStateKey = (state: GameState): string => {
  const doors = state.dungeon.layout.doors
    .map((door) => (door.open ? '1' : '0'))
    .join('');
  return `${state.dungeon.name}|${state.dungeon.discoveredRooms.join(
    ',',
  )}|${doors}`;
};

// The sealed classification grid, from cache when the visible state has not
// changed since it was last built.
let sealedGridCache: { key: string; grid: string[] } | null = null;

const sealedGrid = (state: GameState): string[] => {
  const key = visibleStateKey(state);
  if (!sealedGridCache || sealedGridCache.key !== key) {
    sealedGridCache = { key, grid: sealedCornerGrid(state) };
  }
  return sealedGridCache.grid;
};

// Corners are classified against the visible dungeon: an undiscovered room
// renders as solid rock, so corners on the fog-of-war boundary look different
// from their full-layout classification, and closed doors seal their doorway
// as wall. The visible corner set depends only on the grid, the discovered
// rooms, and the door open states, so it is cached until one of them changes
// instead of being re-detected on every render.
let visibleCornersCache: { key: string; corners: Corner[] } | null = null;

const visibleCorners = (state: GameState): Corner[] => {
  const key = visibleStateKey(state);
  if (!visibleCornersCache || visibleCornersCache.key !== key) {
    visibleCornersCache = {
      key,
      corners: autoDetectCorners(
        sealedGrid(state),
        state.dungeon.discoveredRooms,
      ),
    };
  }
  return visibleCornersCache.corners;
};

const isCornerWall = (x: number, y: number, state: GameState): CornerType => {
  const corner = visibleCorners(state).filter((corner) =>
    isSamePosition(corner.position, { x, y }),
  );
  if (corner.length === 1) {
    return corner[0].type;
  } else {
    return CornerType.NOT_CORNER;
  }
};

const notGround = (cell: string, state: GameState) =>
  isWall(cell) || (!isRoomDiscovered(state.dungeon, cell) && cell !== EMPTY);

const isRoom = (cell: string, state: GameState) =>
  state.dungeon.discoveredRooms.includes(cell);

const renderHiddenCell = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellSize: number,
) => {
  ctx.beginPath();
  ctx.strokeStyle = background;
  ctx.fillStyle = background;
  ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
  ctx.stroke();
};

const renderTrapDoor = (
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  cellSize: number,
  secret: Secret,
) => {
  const x = secret.position.x;
  const y = secret.position.y;
  drawCachedTile(
    ctx,
    ground,
    48 * 6,
    48 * 7,
    48,
    48,
    x * cellSize,
    y * cellSize,
    cellSize,
    cellSize,
  );
};

const renderFoundSecret = (
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  cellSize: number,
  secret: Secret,
) => {
  const x = secret.position.x;
  const y = secret.position.y;
  drawCachedTile(
    ctx,
    ground,
    4 * 48,
    0,
    48,
    48,
    x * cellSize,
    y * cellSize,
    cellSize,
    cellSize,
  );
};

const renderGridLines = (
  ctx: CanvasRenderingContext2D,
  cell: string,
  state: GameState,
  x: number,
  y: number,
  cellSize: number,
  debugMode: boolean,
) => {
  if (!debugMode && (isEmpty(cell, state) || cell === WALL)) return;
  ctx.beginPath();
  ctx.strokeStyle = 'black';
  ctx.rect(x * cellSize, y * cellSize, cellSize, cellSize);
  if (debugMode) {
    const horizontalWall = isHorizontalWall(x, y, state);
    const verticalWall = isVerticalWall(x, y, state);
    const isCorner = isCornerWall(x, y, state);
    let text = `${cell}: ${x},${y}`;
    if (isCorner !== CornerType.NOT_CORNER) {
      text += ` C ${isCorner.valueOf()}`;
    } else if (horizontalWall != 'none') {
      text += ' H ' + horizontalWall[0];
    } else if (verticalWall !== 'none') {
      text += ' V ' + verticalWall[0];
    }
    ctx.font = '7px Arial';
    ctx.fillText(text, x * cellSize + 3, y * cellSize + (cellSize - 3));
  }
  ctx.stroke();
};

// The sealed far side of a closed door renders as wall pieces. Where the
// corner classifier already renders a corner piece on such a cell (e.g. the
// cap of the wall run beside the door), the door paint must not overwrite
// it with the plain wall piece.
const drawDoorWallTile = (
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  tileX: number,
  tileY: number,
  cellSize: number,
  x: number,
  y: number,
  state: GameState,
) => {
  if (isCornerWall(x, y, state) !== CornerType.NOT_CORNER) return;
  drawTile(ctx, ground, tileX, tileY, cellSize, x, y, state);
};

const renderClosedHiddenDoor = (
  door: Door,
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  cellSize: number,
  state: GameState,
) => {
  switch (door.side) {
    case Side.RIGHT: {
      drawDoorWallTile(ctx, ground, 4, 5, cellSize, door.x + 1, door.y, state);
      drawDoorWallTile(
        ctx,
        ground,
        4,
        5,
        cellSize,
        door.x + 1,
        door.y - 1,
        state,
      );
      drawDoorWallTile(
        ctx,
        ground,
        4,
        5,
        cellSize,
        door.x + 1,
        door.y + 1,
        state,
      );
      break;
    }
    case Side.LEFT: {
      drawDoorWallTile(ctx, ground, 0, 5, cellSize, door.x - 1, door.y, state);
      drawDoorWallTile(
        ctx,
        ground,
        0,
        5,
        cellSize,
        door.x - 1,
        door.y - 1,
        state,
      );
      drawDoorWallTile(
        ctx,
        ground,
        0,
        5,
        cellSize,
        door.x - 1,
        door.y + 1,
        state,
      );
      break;
    }
    case Side.UP: {
      drawDoorWallTile(ctx, ground, 2, 4, cellSize, door.x, door.y - 1, state);
      drawDoorWallTile(
        ctx,
        ground,
        2,
        4,
        cellSize,
        door.x + 1,
        door.y - 1,
        state,
      );
      drawDoorWallTile(
        ctx,
        ground,
        2,
        4,
        cellSize,
        door.x - 1,
        door.y - 1,
        state,
      );
      break;
    }
    case Side.DOWN: {
      drawDoorWallTile(ctx, ground, 2, 6, cellSize, door.x, door.y + 1, state);
      drawDoorWallTile(
        ctx,
        ground,
        2,
        6,
        cellSize,
        door.x + 1,
        door.y + 1,
        state,
      );
      drawDoorWallTile(
        ctx,
        ground,
        2,
        6,
        cellSize,
        door.x - 1,
        door.y + 1,
        state,
      );
      break;
    }
  }
};

const renderClosedDoor = (
  door: Door,
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  cellSize: number,
  state: GameState,
) => {
  switch (door.side) {
    case Side.RIGHT: {
      drawDoorWallTile(ctx, ground, 4, 5, cellSize, door.x + 1, door.y, state);
      break;
    }
    case Side.LEFT: {
      drawDoorWallTile(ctx, ground, 0, 5, cellSize, door.x - 1, door.y, state);
      break;
    }
    case Side.UP: {
      drawDoorWallTile(ctx, ground, 2, 4, cellSize, door.x, door.y - 1, state);
      break;
    }
    case Side.DOWN: {
      drawDoorWallTile(ctx, ground, 2, 6, cellSize, door.x, door.y + 1, state);
      break;
    }
  }
};

// Door leaf palette: warm wood reads as an ordinary unlocked door, cold iron
// as a locked one, and brass fittings carry the lock detail.
const DOOR_WOOD = '#8a5a2b';
const DOOR_WOOD_SEAM = '#6b4220';
const DOOR_WOOD_EDGE = '#43290f';
const DOOR_LOCKED = '#5a5a66';
const DOOR_LOCKED_SEAM = '#43434e';
const DOOR_LOCKED_EDGE = '#2b2b34';
const DOOR_BRASS = '#d9a83f';
const DOOR_HOLE = '#1f1608';

const doorThickness = (cellSize: number): number =>
  Math.max(5, Math.round(cellSize / 6));

// The closed door leaf on the shared edge between the two door cells. The
// leaf is thick enough to read clearly, is textured with seams and shaded
// edges, and shows the lock state at a glance: iron with a brass keyhole
// plate when locked, wood with a brass handle when unlocked.
const drawClosedDoor = (
  ctx: CanvasRenderingContext2D,
  door: Door,
  cellSize: number,
) => {
  const thickness = doorThickness(cellSize);
  const half = Math.floor(thickness / 2);
  const vertical = door.side === Side.RIGHT || door.side === Side.LEFT;
  const edgeX = door.x * cellSize + (door.side === Side.RIGHT ? cellSize : 0);
  const edgeY = door.y * cellSize + (door.side === Side.DOWN ? cellSize : 0);
  const leafX = vertical ? edgeX - half : door.x * cellSize;
  const leafY = vertical ? door.y * cellSize : edgeY - half;
  const leafW = vertical ? thickness : cellSize;
  const leafH = vertical ? cellSize : thickness;
  const midX = door.x * cellSize + cellSize / 2;
  const midY = door.y * cellSize + cellSize / 2;

  // Leaf base and shaded long edges
  ctx.fillStyle = door.locked ? DOOR_LOCKED : DOOR_WOOD;
  ctx.fillRect(leafX, leafY, leafW, leafH);
  ctx.fillStyle = door.locked ? DOOR_LOCKED_EDGE : DOOR_WOOD_EDGE;
  if (vertical) {
    ctx.fillRect(leafX, leafY, 1, cellSize);
    ctx.fillRect(leafX + thickness - 1, leafY, 1, cellSize);
  } else {
    ctx.fillRect(leafX, leafY, cellSize, 1);
    ctx.fillRect(leafX, leafY + thickness - 1, cellSize, 1);
  }

  // Seam texture at every quarter along the leaf
  ctx.fillStyle = door.locked ? DOOR_LOCKED_SEAM : DOOR_WOOD_SEAM;
  for (let i = 1; i <= 3; i++) {
    const along = Math.round((i * cellSize) / 4);
    if (vertical) {
      ctx.fillRect(leafX, door.y * cellSize + along, thickness, 1);
    } else {
      ctx.fillRect(door.x * cellSize + along, leafY, 1, thickness);
    }
  }

  // Brass fitting in the middle of the leaf
  const fittingX = vertical ? edgeX : midX;
  const fittingY = vertical ? midY : edgeY;
  if (door.locked) {
    // Keyhole plate with a dark hole: a round chamber above a slot
    const plateLen = Math.max(10, Math.round(cellSize / 4));
    ctx.fillStyle = DOOR_BRASS;
    if (vertical) {
      ctx.fillRect(edgeX - half, midY - plateLen / 2, thickness, plateLen);
    } else {
      ctx.fillRect(midX - plateLen / 2, edgeY - half, plateLen, thickness);
    }
    ctx.fillStyle = DOOR_HOLE;
    if (vertical) {
      ctx.fillRect(fittingX - 1, midY - 3, 2, 2);
      ctx.fillRect(fittingX - 1, midY - 1, 2, 4);
    } else {
      ctx.fillRect(midX - 3, fittingY - 1, 2, 2);
      ctx.fillRect(midX - 1, fittingY - 1, 4, 2);
    }
  } else {
    // Ring handle: a brass plate with a dark centre
    ctx.fillStyle = DOOR_BRASS;
    ctx.fillRect(fittingX - 2, fittingY - 2, 4, 4);
    ctx.fillStyle = DOOR_HOLE;
    ctx.fillRect(fittingX - 1, fittingY - 1, 2, 2);
  }
};

const drawDoorEdgeStrip = (
  ctx: CanvasRenderingContext2D,
  door: Door,
  cellSize: number,
) => {
  const thickness = doorThickness(cellSize);
  const half = Math.floor(thickness / 2);
  switch (door.side) {
    case Side.RIGHT: {
      ctx.fillRect(
        door.x * cellSize + (cellSize - half),
        door.y * cellSize,
        thickness,
        cellSize,
      );
      break;
    }
    case Side.LEFT: {
      ctx.fillRect(
        door.x * cellSize - half,
        door.y * cellSize,
        thickness,
        cellSize,
      );
      break;
    }
    case Side.UP: {
      ctx.fillRect(
        door.x * cellSize,
        door.y * cellSize - half,
        cellSize,
        thickness,
      );
      break;
    }
    case Side.DOWN: {
      ctx.fillRect(
        door.x * cellSize,
        door.y * cellSize + (cellSize - 2),
        cellSize,
        4,
      );
      break;
    }
  }
};

const renderDoor = (
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  cellSize: number,
  state: GameState,
  door: Door,
  debugMode: boolean,
) => {
  const cell = state.dungeon.layout.grid[door.y][door.x];
  const farOffsetX =
    door.side === Side.RIGHT ? 1 : door.side === Side.LEFT ? -1 : 0;
  const farOffsetY =
    door.side === Side.DOWN ? 1 : door.side === Side.UP ? -1 : 0;
  const farCell = findCell(
    state.dungeon.layout.grid,
    door.x + farOffsetX,
    door.y + farOffsetY,
  );
  const nearDiscovered = !isEmpty(cell, state);
  const farDiscovered = farCell !== '' && !isEmpty(farCell, state);

  // The wall tiles are painted on the far side of the door edge. Only do so
  // while that side is undiscovered — otherwise they would cover floor the
  // player can already see and stand on. Once the far side is discovered the
  // door itself is drawn on the shared edge instead, so it renders correctly
  // from both sides.
  if (door && !door.open && !farDiscovered) {
    if (door.hidden) {
      renderClosedHiddenDoor(door, ctx, ground, cellSize, state);
    } else {
      renderClosedDoor(door, ctx, ground, cellSize, state);
    }
  }
  if (door && !door.hidden && !door.open && (nearDiscovered || farDiscovered)) {
    if (door.side === Side.UP && !farDiscovered) {
      drawTile(ctx, ground, 13, 1, cellSize, door.x, door.y - 1, state);
    }
    drawClosedDoor(ctx, door, cellSize);
    if (door.locked && debugMode) {
      ctx.fillStyle = 'grey';
      switch (door.side) {
        case Side.RIGHT: {
          ctx.fillRect(
            door.x * cellSize + (cellSize - 4),
            door.y * cellSize + (cellSize / 2 - 4),
            8,
            8,
          );
          break;
        }
        case Side.LEFT: {
          ctx.fillRect(
            door.x * cellSize - 4,
            door.y * cellSize + (cellSize / 2 - 4),
            8,
            8,
          );
          break;
        }
        case Side.UP: {
          ctx.fillRect(
            door.x * cellSize + (cellSize / 2 - 4),
            door.y * cellSize - 4,
            8,
            8,
          );
          break;
        }
        case Side.DOWN: {
          ctx.fillRect(
            door.x * cellSize + (cellSize / 2 - 4),
            door.y * cellSize + (cellSize - 4),
            8,
            8,
          );
          break;
        }
      }
    }
  }
  if (door && door.hidden && !door.open && nearDiscovered && farDiscovered) {
    // A hidden door between two discovered rooms would otherwise be
    // invisible while still blocking movement; mark the sealed edge.
    ctx.fillStyle = 'darkgrey';
    drawDoorEdgeStrip(ctx, door, cellSize);
  }
  if (debugMode && !isEmpty(cell, state)) {
    ctx.fillStyle = 'black';
    ctx.font = '12px Arial';
    ctx.fillText(
      `[${door.hidden ? 'H' : '-'}/${
        door.trapped ? `T${door.trapAttacks}` : '-'
      }/${door.locked ? 'L' : '-'}]`,
      door.x * cellSize,
      door.y * cellSize + 10,
    );
    ctx.fillStyle = 'rgba(50, 255, 255, 0.28)';
    ctx.fillRect(door.x * cellSize, door.y * cellSize, cellSize, cellSize);
  }
};

const isWall = (cell: string) => cell === WALL;

const isEmpty = (cell: string, state: GameState) =>
  cell === EMPTY || !isRoomDiscovered(state.dungeon, cell);

const neighbourOf = (x: number, y: number, value: string, state: GameState) => {
  if (!state) return;
  const xMin = Math.max(x - 1, 0);
  const yMin = Math.max(y - 1, 0);
  const yMax = Math.min(y + 1, state.dungeon.layout.grid.length - 1);
  const xMax = Math.min(x + 1, state.dungeon.layout.grid[0].length - 1);
  for (let pX = xMin; pX <= xMax; pX++) {
    for (let pY = yMin; pY <= yMax; pY++) {
      const row = state.dungeon.layout.grid[pY];
      const valueAt = toArray(row)[pX];
      if (valueAt === value) return true;
    }
  }
  return false;
};
