import { CornerType, type Corner } from '../types';
import { EMPTY, findCell, WALL } from '../core';

const isFloor = (cell: string): boolean =>
  Boolean(cell && cell !== EMPTY && cell !== WALL);

const isWall = (cell: string): boolean => cell === WALL;

const isEmpty = (cell: string): boolean => !cell || cell === EMPTY;

export const detectCornerType = (
  grid: string[],
  x: number,
  y: number,
): CornerType => {
  const currentCell = findCell(grid, x, y);
  if (currentCell !== WALL) {
    return CornerType.NOT_CORNER;
  }

  const N = findCell(grid, x, y - 1);
  const S = findCell(grid, x, y + 1);
  const W = findCell(grid, x - 1, y);
  const E = findCell(grid, x + 1, y);

  const NW = findCell(grid, x - 1, y - 1);
  const NE = findCell(grid, x + 1, y - 1);
  const SW = findCell(grid, x - 1, y + 1);
  const SE = findCell(grid, x + 1, y + 1);

  const fN = isFloor(N);
  const fS = isFloor(S);
  const fW = isFloor(W);
  const fE = isFloor(E);

  const fNW = isFloor(NW);
  const fNE = isFloor(NE);
  const fSW = isFloor(SW);
  const fSE = isFloor(SE);

  const wN = isWall(N);
  const wS = isWall(S);
  const wW = isWall(W);
  const wE = isWall(E);

  const eN = isEmpty(N);
  const eS = isEmpty(S);
  const eW = isEmpty(W);
  const eE = isEmpty(E);

  // 1. Four-Way Intersection
  if (wN && wS && wW && wE && (fNW || fNE || fSW || fSE)) {
    return CornerType.FOUR_WAY_INTERSECTION;
  }

  // 2. Three-Way Intersections (T-junctions)
  if (wN && wW && wE && !wS && ((fNW && fNE) || fS)) {
    return CornerType.THREE_WAY_INTERSECTION_UP;
  }
  if (wS && wW && wE && !wN && ((fSW && fSE) || fN)) {
    return CornerType.THREE_WAY_INTERSECTION_DOWN;
  }
  if (wW && wN && wS && !wE && ((fNW && fSW) || fE)) {
    return CornerType.THREE_WAY_INTERSECTION_LEFT;
  }
  if (wE && wN && wS && !wW && ((fNE && fSE) || fW)) {
    return CornerType.THREE_WAY_INTERSECTION_RIGHT;
  }

  // 3. Outer (Convex) Corners
  if (
    !fS &&
    !fW &&
    (wS || eS) &&
    (wW || eW) &&
    ((fN && fE) || (fN && fNE && !wE) || (fE && fNE && !wN))
  ) {
    return CornerType.OUTER_TOP_RIGHT;
  }
  if (
    !fS &&
    !fE &&
    (wS || eS) &&
    (wE || eE) &&
    ((fN && fW) || (fN && fNW && !wW) || (fW && fNW && !wN))
  ) {
    return CornerType.OUTER_TOP_LEFT;
  }
  if (
    !fN &&
    !fW &&
    (wN || eN) &&
    (wW || eW) &&
    ((fS && fE) || (fS && fSE && !wE) || (fE && fSE && !wS))
  ) {
    return CornerType.OUTER_BOTTOM_RIGHT;
  }
  if (
    !fN &&
    !fE &&
    (wN || eN) &&
    (wE || eE) &&
    ((fS && fW) || (fS && fSW && !wW) || (fW && fSW && !wS))
  ) {
    return CornerType.OUTER_BOTTOM_LEFT;
  }

  // 4. Wall Ends
  if (fW && !fE && !wN && !wS && (wE || eE) && ((fN && fS) || (fNW && fSW))) {
    return CornerType.LEFT_END;
  }
  if (fE && !fW && !wN && !wS && (wW || eW) && ((fN && fS) || (fNE && fSE))) {
    return CornerType.RIGHT_END;
  }
  if (fN && !fS && !wW && !wE && (wS || eS) && ((fW && fE) || (fNW && fNE))) {
    return CornerType.TOP_END;
  }
  if (fS && !fN && !wW && !wE && (wN || eN) && ((fW && fE) || (fSW && fSE))) {
    return CornerType.BOTTOM_END;
  }

  // 5. Inner (Concave) Corners
  if (fSE && !fS && !fE && (wE || eE) && (wS || eS)) {
    return CornerType.INNER_TOP_LEFT;
  }
  if (fSW && !fS && !fW && (wW || eW) && (wS || eS)) {
    return CornerType.INNER_TOP_RIGHT;
  }
  if (fNE && !fN && !fE && (wE || eE) && (wN || eN)) {
    return CornerType.INNER_BOTTOM_LEFT;
  }
  if (fNW && !fN && !fW && (wW || eW) && (wN || eN)) {
    return CornerType.INNER_BOTTOM_RIGHT;
  }

  return CornerType.NOT_CORNER;
};

export const autoDetectCorners = (grid: string[]): Corner[] => {
  const corners: Corner[] = [];
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y];
    for (let x = 0; x < row.length; x++) {
      const type = detectCornerType(grid, x, y);
      if (type !== CornerType.NOT_CORNER) {
        corners.push({
          position: { x, y },
          type,
        });
      }
    }
  }
  return corners;
};
