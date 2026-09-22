import type {
  Actor,
  Dungeon,
  GameState,
  Hero,
  Layout,
  Position,
} from '../types';

export const EMPTY = ' ';
export const COLLAPSED = '?';
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

export const getDist = (a: Position, b: Position): number =>
  Math.sqrt(Math.pow(a.x - b?.x, 2) + Math.pow(a.y - b?.y, 2));

export const isRoomDiscovered = (dungeon: Dungeon, cell: string): boolean =>
  dungeon.discoveredRooms.includes(cell);

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
  const monster = state.dungeon.layout.monsters.some((monster) =>
    isSamePosition(monster.position, nextCellPosition),
  );
  const hero = state.heroes
    .filter((hero) => hero.health > 0)
    .filter((hero) => !isSamePosition(hero.position, source))
    .some((hero) => isSamePosition(hero.position, nextCellPosition));
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
    if (!(nextCellPosition.x === source.x && nextCellPosition.y === source.y)) {
      if (
        !seenCells.some(
          (c) => c.x === nextCellPosition.x && c.y === nextCellPosition.y,
        )
      ) {
        seenCells.push(nextCellPosition);
      }
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
    );
  }
};

const cellsAlongLine = (source: Position, target: Position): Position[] => {
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
  const hero = state.heroes.some(
    (hero) => hero.health > 0 && isSamePosition(hero.position, position),
  );
  return Boolean(
    pit || pillar || monster || hero || cell === WALL || cell === COLLAPSED,
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
    return cells.slice(0, -1).every((cell) => !isBlockingCell(state, cell));
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

export const findNeighbouringHeroes = (
  state: GameState,
  actor: Actor,
): Hero[] =>
  state.heroes
    .filter((hero) => hero.health > 0)
    .filter((hero: Actor) =>
      isNeighbouring(actor.position, hero.position.x, hero.position.y),
    ) as Hero[];
