import type {
  Actor,
  Dungeon,
  GameState,
  Hero,
  Layout,
  Position,
  WallEdge,
} from '../types';
import { Side } from '../types';

export const EMPTY = ' ';
export const COLLAPSED = '?';
// Marker for the sealed far side of a closed door with an undiscovered far
// side. It renders as wall, but unlike real rock it is a doorway — corner
// classification treats it as wall for closed sides yet never as the
// protruding stem of a junction.
export const SEALED_DOOR = '+';
export const WALL = '#';

export const toArray = (row: string): string[] => {
  const array: string[] = [];
  for (let i = 0; i < row.length; i++) {
    array.push(row[i]);
  }
  return array;
};

export const findCell = (grid: string[], x: number, y: number): string =>
  grid[y]?.[x] ?? '';

export const isSamePosition = (a: Position, b: Position): boolean =>
  a.x === b.x && a.y === b.y;

export const isNeighbouring = (
  position: Position,
  x: number,
  y: number,
): boolean =>
  (position.x === x && position.y === y) ||
  (position.x === x - 1 && position.y === y) ||
  (position.x === x - 1 && position.y === y - 1) ||
  (position.x === x && position.y === y - 1) ||
  (position.x === x + 1 && position.y === y - 1) ||
  (position.x === x + 1 && position.y === y) ||
  (position.x === x + 1 && position.y === y + 1) ||
  (position.x === x && position.y === y + 1) ||
  (position.x === x - 1 && position.y === y + 1);

// Grid offset of the cell a door/wall side points at, e.g. side RIGHT on
// (x, y) targets (x + 1, y).
export const sideOffset = (side: Side): [number, number] => {
  switch (side) {
    case Side.RIGHT:
      return [1, 0];
    case Side.LEFT:
      return [-1, 0];
    case Side.DOWN:
      return [0, 1];
    default:
      return [0, -1];
  }
};

export const isDoorEdge = (
  layout: Layout,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
) =>
  layout.doors?.find((door) => {
    const [dx, dy] = sideOffset(door.side);
    return (
      (door.x === fromX &&
        door.y === fromY &&
        door.x + dx === toX &&
        door.y + dy === toY) ||
      (door.x === toX &&
        door.y === toY &&
        door.x + dx === fromX &&
        door.y + dy === fromY)
    );
  });

export const isWallEdge = (
  layout: Layout,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): WallEdge | undefined =>
  layout.walls?.find((wall) => {
    const [dx, dy] = sideOffset(wall.side);
    return (
      (wall.x === fromX &&
        wall.y === fromY &&
        wall.x + dx === toX &&
        wall.y + dy === toY) ||
      (wall.x === toX &&
        wall.y === toY &&
        wall.x + dx === fromX &&
        wall.y + dy === fromY)
    );
  });

// Whether a step between two adjacent cells crosses an edge wall. Orthogonal
// steps cross one edge. Diagonal steps pass the pinch point of four cells
// and are blocked only when both routes around the pinch cross a wall.
export const crossesWallEdge = (
  layout: Layout,
  from: Position,
  to: Position,
): boolean => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return false;
  if (Math.abs(dx) > 1 || Math.abs(dy) > 1) return false;
  if (dx !== 0 && dy !== 0) {
    const via1: Position = { x: from.x + dx, y: from.y };
    const via2: Position = { x: from.x, y: from.y + dy };
    const route1 =
      crossesWallEdge(layout, from, via1) || crossesWallEdge(layout, via1, to);
    const route2 =
      crossesWallEdge(layout, from, via2) || crossesWallEdge(layout, via2, to);
    return route1 && route2;
  }
  return Boolean(isWallEdge(layout, from.x, from.y, to.x, to.y));
};

// Any closed door or edge wall standing between two adjacent cells blocks
// sight, searching and movement beyond it.
export const isEdgeBlocked = (
  layout: Layout,
  from: Position,
  to: Position,
): boolean => {
  const door = isDoorEdge(layout, from.x, from.y, to.x, to.y);
  return Boolean((door && !door.open) || crossesWallEdge(layout, from, to));
};

export const canSearchThrough = (
  layout: Layout,
  from: Position,
  to: Position,
): boolean => {
  if (isSamePosition(from, to)) return true;
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  // Diagonal: block if either flanking cell is a wall (no cutting corners)
  if (dx !== 0 && dy !== 0) {
    if (
      !isWalkable(layout, from.x + dx, from.y) ||
      !isWalkable(layout, from.x, from.y + dy)
    ) {
      return false;
    }
  }

  // Any closed door or edge wall standing on this route blocks searching
  // beyond it
  return !isEdgeBlocked(layout, from, to);
};

export const getDist = (a: Position, b: Position): number =>
  Math.sqrt(Math.pow(a.x - b?.x, 2) + Math.pow(a.y - b?.y, 2));

export const distanceInGrid = (a: Position, b: Position): number => {
  const dx = Math.abs(b.x - a.x);
  const dy = Math.abs(b.y - a.y);

  const min = Math.min(dx, dy);
  const max = Math.max(dx, dy);

  const diagonalSteps = min;
  const straightSteps = max - min;
  let factor = Math.sqrt(2);
  if (straightSteps === 0) {
    factor = 1;
  }

  return Math.floor(factor * diagonalSteps + straightSteps);
};

export const isRoomDiscovered = (dungeon: Dungeon, cell: string): boolean =>
  dungeon.discoveredRooms.includes(cell);

export const findRoomCells = (grid: string[], room: string): Position[] => {
  const cells: Position[] = [];
  grid.forEach((row, y) => {
    toArray(row).forEach((cell, x) => {
      if (cell === room) cells.push({ x, y });
    });
  });
  return cells;
};

// Whether a grid cell belongs to a corridor: either its room letter is
// listed in `layout.corridors` (the whole letter is one corridor) or it is
// one of the `layout.corridorCells` — cells of a room letter that are
// corridors without a door separating them from the room.
export const isCorridorCell = (
  layout: Layout,
  x: number,
  y: number,
): boolean => {
  const cell = findCell(layout.grid, x, y);
  if (!cell) return false;
  if (layout.corridors.includes(cell)) return true;
  return Boolean(
    layout.corridorCells?.some((pos) => isSamePosition(pos, { x, y })),
  );
};

export const isDiscovered = (
  dungeon: Dungeon,
  x: number,
  y: number,
): boolean => {
  const cell = findCell(dungeon.layout.grid, x, y);
  if (!cell) return false;
  else return isRoomDiscovered(dungeon, cell);
};

export const isWalkable = (layout: Layout, x: number, y: number): boolean => {
  let walkable = true;
  if (x < 0 || x >= layout.grid[0].length || y < 0 || y >= layout.grid.length) {
    walkable = false;
  } else {
    const pit = layout.pits?.some((pit) => isSamePosition(pit, { x, y }));
    const pillar = layout.pillars?.some((pit) => isSamePosition(pit, { x, y }));
    const cell = findCell(layout.grid, x, y);
    if (pit || pillar || cell === EMPTY || cell === WALL) {
      walkable = false;
    }
  }
  return walkable;
};

export const normaliseVector = (
  start: Position,
  target: Position,
): Position => {
  const xOffset = start.x;
  const yOffset = start.y;
  const x = target.x - xOffset;
  const y = target.y - yOffset;
  const nX = x / Math.pow(Math.pow(x, 2) + Math.pow(y, 2), 1 / 2);
  const nY = y / Math.pow(Math.pow(x, 2) + Math.pow(y, 2), 1 / 2);

  const newX = Math.round(nX + xOffset);
  const newY = Math.round(nY + yOffset);

  return { x: newX, y: newY };
};

export const stepAlongLine = (
  startPixelPos: Position,
  source: Position,
  targetPixelPos: Position,
  target: Position,
  resolution: number,
  state: GameState,
  walking: boolean,
  seenCells: Position[],
  lastCell: Position = source,
): boolean => {
  if (isNaN(startPixelPos.x) || isNaN(startPixelPos.y)) {
    return false;
  }
  const nextPixelPosition = normaliseVector(startPixelPos, targetPixelPos);
  const nextCellPosition = {
    x: Math.round(
      (nextPixelPosition.x + Math.floor(resolution / 2)) / resolution,
    ),
    y: Math.round(
      (nextPixelPosition.y + Math.floor(resolution / 2)) / resolution,
    ),
  };
  if (
    isNaN(nextCellPosition.x) ||
    isNaN(nextCellPosition.y) ||
    isNaN(nextPixelPosition.x) ||
    isNaN(nextPixelPosition.y)
  ) {
    return false;
  }
  const nextCell = findCell(
    state.dungeon.layout.grid,
    nextCellPosition.x,
    nextCellPosition.y,
  );
  const pit = state.dungeon.layout.pits?.some((pit) =>
    isSamePosition(pit, nextCellPosition),
  );
  const pillar = state.dungeon.layout.pillars?.some((pit) =>
    isSamePosition(pit, nextCellPosition),
  );
  const monster = state.dungeon.layout.monsters
    .filter((monster) => !isSamePosition(monster.position, source))
    .some((monster) => isSamePosition(monster.position, nextCellPosition));
  const hero = state.heroes
    .filter((hero) => hero.health > 0)
    .filter((hero) => !isSamePosition(hero.position, source))
    .some((hero) => isSamePosition(hero.position, nextCellPosition));

  // Diagonal step between grid cells: block cutting through a corner
  // formed by two walls (no squeezing through a diagonal wall pinch point)
  const cornerDx = nextCellPosition.x - lastCell.x;
  const cornerDy = nextCellPosition.y - lastCell.y;
  if (cornerDx !== 0 && cornerDy !== 0) {
    const flank1: Position = { x: lastCell.x + cornerDx, y: lastCell.y };
    const flank2: Position = { x: lastCell.x, y: lastCell.y + cornerDy };
    const flank1Blocked = isBlockingCell(state, flank1);
    const flank2Blocked = isBlockingCell(state, flank2);
    const flank1Walled =
      isEdgeBlocked(state.dungeon.layout, lastCell, flank1) ||
      isEdgeBlocked(state.dungeon.layout, flank1, nextCellPosition);
    const flank2Walled =
      isEdgeBlocked(state.dungeon.layout, lastCell, flank2) ||
      isEdgeBlocked(state.dungeon.layout, flank2, nextCellPosition);
    if ((flank1Blocked || flank1Walled) && (flank2Blocked || flank2Walled)) {
      return false;
    }
  } else if (isEdgeBlocked(state.dungeon.layout, lastCell, nextCellPosition)) {
    // Orthogonal step across an edge wall or closed door
    return false;
  }

  if (nextCellPosition.x === target.x && nextCellPosition.y === target.y) {
    seenCells.push(nextCellPosition);
    return true;
  } else if (
    pillar ||
    monster ||
    (!walking && hero) ||
    nextCell === WALL ||
    nextCell === COLLAPSED ||
    (walking && (pit || nextCell === EMPTY))
  ) {
    return false;
  } else {
    let nextLastCell = lastCell;
    if (!(nextCellPosition.x === source.x && nextCellPosition.y === source.y)) {
      if (
        !seenCells.some(
          (c) => c.x === nextCellPosition.x && c.y === nextCellPosition.y,
        )
      ) {
        seenCells.push(nextCellPosition);
      }
      nextLastCell = nextCellPosition;
    }
    return stepAlongLine(
      nextPixelPosition,
      source,
      targetPixelPos,
      target,
      resolution,
      state,
      walking,
      seenCells,
      nextLastCell,
    );
  }
};

export const cellsAlongLine = (
  source: Position,
  target: Position,
): Position[] => {
  const cells: Position[] = [];
  let x = source.x;
  let y = source.y;
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const stepX = Math.sign(dx);
  const stepY = Math.sign(dy);
  let progressX = Math.abs(dx) === 0 ? Infinity : 0.5 / Math.abs(dx);
  let progressY = Math.abs(dy) === 0 ? Infinity : 0.5 / Math.abs(dy);
  const incrementX = Math.abs(dx) === 0 ? Infinity : 1 / Math.abs(dx);
  const incrementY = Math.abs(dy) === 0 ? Infinity : 1 / Math.abs(dy);

  while (x !== target.x || y !== target.y) {
    if (progressX < progressY) {
      x += stepX;
      progressX += incrementX;
    } else if (progressY < progressX) {
      y += stepY;
      progressY += incrementY;
    } else {
      x += stepX;
      y += stepY;
      progressX += incrementX;
      progressY += incrementY;
    }
    cells.push({ x, y });
  }
  return cells;
};

const isBlockingCell = (state: GameState, position: Position): boolean => {
  const cell = findCell(state.dungeon.layout.grid, position.x, position.y);
  const pit = state.dungeon.layout.pits?.some((pit) =>
    isSamePosition(pit, position),
  );
  const pillar = state.dungeon.layout.pillars?.some((pillar) =>
    isSamePosition(pillar, position),
  );
  const monster = state.dungeon.layout.monsters.some((monster) =>
    isSamePosition(monster.position, position),
  );
  return Boolean(
    pit || pillar || monster || cell === WALL || cell === COLLAPSED,
  );
};

export const hasLineOfSight = (
  startPosition: Position,
  targetPosition: Position,
  resolution: number,
  state: GameState,
  walking: boolean,
): boolean => {
  if (walking) {
    const cells = cellsAlongLine(startPosition, targetPosition);
    let prev = startPosition;
    for (const cell of cells) {
      const dx = cell.x - prev.x;
      const dy = cell.y - prev.y;
      if (dx !== 0 && dy !== 0) {
        // Diagonal step: block cutting through a corner formed by two walls
        // or two edge walls at the pinch point
        const flank1: Position = { x: prev.x + dx, y: prev.y };
        const flank2: Position = { x: prev.x, y: prev.y + dy };
        const flank1Blocked = isBlockingCell(state, flank1);
        const flank2Blocked = isBlockingCell(state, flank2);
        const flank1Walled =
          isEdgeBlocked(state.dungeon.layout, prev, flank1) ||
          isEdgeBlocked(state.dungeon.layout, flank1, cell);
        const flank2Walled =
          isEdgeBlocked(state.dungeon.layout, prev, flank2) ||
          isEdgeBlocked(state.dungeon.layout, flank2, cell);
        if (
          (flank1Blocked || flank1Walled) &&
          (flank2Blocked || flank2Walled)
        ) {
          return false;
        }
      } else if (isEdgeBlocked(state.dungeon.layout, prev, cell)) {
        // Orthogonal step across an edge wall or closed door
        return false;
      }
      if (
        !isSamePosition(cell, targetPosition) &&
        isBlockingCell(state, cell)
      ) {
        return false;
      }
      prev = cell;
    }
    return true;
  }
  // Adjacent figures always have combat line of sight to each other unless
  // an edge wall or closed door separates them. In particular a diagonally
  // adjacent figure across a wall corner is reachable: their squares touch
  // at the corner point and the game treats them as adjacent (the same
  // isNeighbouring + edge rule as melee engagement), so the pixel
  // walk must not lose them to the corner-point rounding artifact.
  if (
    isNeighbouring(startPosition, targetPosition.x, targetPosition.y) &&
    !isEdgeBlocked(state.dungeon.layout, startPosition, targetPosition)
  ) {
    return true;
  }
  const startPixelPos = {
    x: startPosition.x * resolution - Math.floor(resolution / 2),
    y: startPosition.y * resolution - Math.floor(resolution / 2),
  };
  const targetPixelPos = {
    x: targetPosition.x * resolution - Math.floor(resolution / 2),
    y: targetPosition.y * resolution - Math.floor(resolution / 2),
  };
  return stepAlongLine(
    startPixelPos,
    startPosition,
    targetPixelPos,
    targetPosition,
    resolution,
    state,
    walking,
    [],
  );
};

// Gameplay adjacency: a hero counts as neighbouring only when no edge wall
// stands between them — adjacency drives attack targeting and the
// movement-stopping "walked by a monster" check, which a wall must gate.
export const findNeighbouringHeroes = (
  state: GameState,
  actor: Actor,
): Hero[] =>
  state.heroes
    .filter((hero) => hero.health > 0)
    .filter(
      (hero: Actor) =>
        isNeighbouring(actor.position, hero.position.x, hero.position.y) &&
        !crossesWallEdge(state.dungeon.layout, actor.position, hero.position),
    ) as Hero[];
