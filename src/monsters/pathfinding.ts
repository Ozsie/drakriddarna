import type { GameState, Hero, Monster, Position } from '../types';
import { Side } from '../types';
import { getDist, isDiscovered, isNeighbouring, isWalkable } from '../core';
import { liveHeroes } from '../hero/HeroLogic';

export interface PassableGrid {
  width: number;
  height: number;
  isWalkableTile: (x: number, y: number) => boolean;
  isDoorBlocked: (
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
  ) => boolean;
  isPassableStep: (
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
  ) => boolean;
}

export const createPassableGrid = (state: GameState): PassableGrid => {
  const layout = state.dungeon.layout;
  const height = layout.grid.length;
  const width = layout.grid[0]?.length ?? 0;

  const walkableGrid: boolean[][] = [];
  for (let y = 0; y < height; y++) {
    walkableGrid[y] = [];
    for (let x = 0; x < width; x++) {
      walkableGrid[y][x] =
        isWalkable(layout, x, y) && isDiscovered(state.dungeon, x, y);
    }
  }

  const isWalkableTile = (x: number, y: number): boolean => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    return walkableGrid[y]?.[x] ?? false;
  };

  const closedDoorEdges = new Set<string>();
  const addEdge = (x1: number, y1: number, x2: number, y2: number) => {
    closedDoorEdges.add(`${x1},${y1}->${x2},${y2}`);
    closedDoorEdges.add(`${x2},${y2}->${x1},${y1}`);
  };

  layout.doors?.forEach((door) => {
    if (!door.open) {
      switch (door.side) {
        case Side.RIGHT:
          addEdge(door.x, door.y, door.x + 1, door.y);
          break;
        case Side.LEFT:
          addEdge(door.x, door.y, door.x - 1, door.y);
          break;
        case Side.UP:
          addEdge(door.x, door.y, door.x, door.y - 1);
          break;
        case Side.DOWN:
          addEdge(door.x, door.y, door.x, door.y + 1);
          break;
      }
    }
  });

  const isDoorBlocked = (
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
  ): boolean => closedDoorEdges.has(`${fromX},${fromY}->${toX},${toY}`);

  const isPassableStep = (
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
  ): boolean => {
    if (!isWalkableTile(toX, toY)) return false;

    const dx = toX - fromX;
    const dy = toY - fromY;
    if (dx === 0 && dy === 0) return false;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) return false;

    // Orthogonal step
    if (dx === 0 || dy === 0) {
      return !isDoorBlocked(fromX, fromY, toX, toY);
    }

    // Diagonal step
    const i1X = fromX + dx;
    const i1Y = fromY;
    const path1Clear =
      isWalkableTile(i1X, i1Y) &&
      !isDoorBlocked(fromX, fromY, i1X, i1Y) &&
      !isDoorBlocked(i1X, i1Y, toX, toY);

    const i2X = fromX;
    const i2Y = fromY + dy;
    const path2Clear =
      isWalkableTile(i2X, i2Y) &&
      !isDoorBlocked(fromX, fromY, i2X, i2Y) &&
      !isDoorBlocked(i2X, i2Y, toX, toY);

    return path1Clear || path2Clear;
  };

  return {
    width,
    height,
    isWalkableTile,
    isDoorBlocked,
    isPassableStep,
  };
};

interface PathNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent?: PathNode;
}

const chebyshevDistance = (a: Position, b: Position): number =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

export const findPath = (
  start: Position,
  targetHero: Hero,
  passableGrid: PassableGrid,
  occupiedPositions: Set<string>,
): Position[] | null => {
  const targetPos = targetHero.position;

  if (isNeighbouring(start, targetPos.x, targetPos.y)) {
    return [];
  }

  const openSet: PathNode[] = [];
  const closedSet = new Map<string, number>();

  const startNode: PathNode = {
    x: start.x,
    y: start.y,
    g: 0,
    h: chebyshevDistance(start, targetPos),
    f: chebyshevDistance(start, targetPos),
  };

  openSet.push(startNode);
  closedSet.set(`${start.x},${start.y}`, 0);

  const DIRECTIONS: Position[] = [
    { x: -1, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: -1 },
    { x: 1, y: -1 },
    { x: -1, y: 1 },
    { x: 1, y: 1 },
  ];

  while (openSet.length > 0) {
    // Pick node with lowest f (and lowest h on tie)
    let bestIndex = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (
        openSet[i].f < openSet[bestIndex].f ||
        (openSet[i].f === openSet[bestIndex].f &&
          openSet[i].h < openSet[bestIndex].h)
      ) {
        bestIndex = i;
      }
    }

    const current = openSet.splice(bestIndex, 1)[0];
    const currentKey = `${current.x},${current.y}`;

    if (current.g > (closedSet.get(currentKey) ?? Infinity)) {
      continue;
    }

    // Goal condition: adjacent to target hero
    if (
      !(current.x === start.x && current.y === start.y) &&
      isNeighbouring(current, targetPos.x, targetPos.y)
    ) {
      const path: Position[] = [];
      let curr: PathNode | undefined = current;
      while (curr && curr.parent) {
        path.unshift({ x: curr.x, y: curr.y });
        curr = curr.parent;
      }
      return path;
    }

    for (const dir of DIRECTIONS) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;
      const neighborKey = `${nx},${ny}`;

      if (!passableGrid.isPassableStep(current.x, current.y, nx, ny)) {
        continue;
      }

      if (occupiedPositions.has(neighborKey)) {
        continue;
      }

      const tentativeG = current.g + 1;
      const existingG = closedSet.get(neighborKey);

      if (existingG === undefined || tentativeG < existingG) {
        closedSet.set(neighborKey, tentativeG);
        const h = chebyshevDistance({ x: nx, y: ny }, targetPos);
        const neighborNode: PathNode = {
          x: nx,
          y: ny,
          g: tentativeG,
          h,
          f: tentativeG + h,
          parent: current,
        };
        openSet.push(neighborNode);
      }
    }
  }

  return null;
};

export const findBestPathToHeroes = (
  state: GameState,
  monster: Monster,
  passableGrid: PassableGrid,
): { hero: Hero; path: Position[] } | null => {
  const heroes = liveHeroes(state).filter((hero) => !hero.ignoredByMonsters);
  if (heroes.length === 0) return null;

  const occupiedPositions = new Set<string>();

  // Monsters occupy positions
  state.dungeon.layout.monsters.forEach((m) => {
    if (m !== monster && m.health > 0) {
      occupiedPositions.add(`${m.position.x},${m.position.y}`);
    }
  });

  // Heroes occupy positions
  liveHeroes(state).forEach((h) => {
    occupiedPositions.add(`${h.position.x},${h.position.y}`);
  });

  type Candidate = {
    hero: Hero;
    path: Position[];
    dist: number;
  };

  const candidates: Candidate[] = [];

  for (const hero of heroes) {
    const path = findPath(
      monster.position,
      hero,
      passableGrid,
      occupiedPositions,
    );
    if (path && path.length > 0) {
      candidates.push({
        hero,
        path,
        dist: getDist(monster.position, hero.position),
      });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    // Shorter path first
    if (a.path.length !== b.path.length) {
      return a.path.length - b.path.length;
    }
    // Lower health hero on tie
    if (a.hero.health !== b.hero.health) {
      return a.hero.health - b.hero.health;
    }
    // Euclidean distance
    return a.dist - b.dist;
  });

  return {
    hero: candidates[0].hero,
    path: candidates[0].path,
  };
};
