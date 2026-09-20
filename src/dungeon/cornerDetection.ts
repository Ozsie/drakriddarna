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
    (fN && fE && !fW && !fS) ||
    (fN && fNE && (fE || !wE) && !fNW && (wW || eW)) ||
    (fE && fNE && (fN || !wN) && !fSE && (wS || eS))
  ) {
    return CornerType.OUTER_TOP_RIGHT;
  }
  if (
    (fN && fW && !fE && !fS) ||
    (fN && fNW && (fW || !wW) && !fNE && (wE || eE)) ||
    (fW && fNW && (fN || !wN) && !fSW && (wS || eS))
  ) {
    return CornerType.OUTER_TOP_LEFT;
  }
  if (
    (fS && fE && !fW && !fN) ||
    (fS && fSE && (fE || !wE) && !fSW && (wW || eW)) ||
    (fE && fSE && (fS || !wS) && !fNE && (wN || eN))
  ) {
    return CornerType.OUTER_BOTTOM_RIGHT;
  }
  if (
    (fS && fW && !fE && !fN) ||
    (fS && fSW && (fW || !wW) && !fSE && (wE || eE)) ||
    (fW && fSW && (fS || !wS) && !fNW && (wN || eN))
  ) {
    return CornerType.OUTER_BOTTOM_LEFT;
  }

  // 4. Wall Ends
  if (fW && !fE && fN && fS) {
    return CornerType.LEFT_END;
  }
  if (fE && !fW && fN && fS) {
    return CornerType.RIGHT_END;
  }
  if (fN && fS && wW && (wE || eE)) {
    return CornerType.RIGHT_END;
  }
  if (fN && !fS && wS && (fW || fE || (!wW && !wE))) {
    return CornerType.TOP_END;
  }
  if (fS && !fN && wN && (fW || fE || (!wW && !wE))) {
    return CornerType.BOTTOM_END;
  }
  if (fS && !fN && !fW && !fE && wN && (wW || wE) && (fSW || fSE)) {
    return CornerType.BOTTOM_END;
  }
  if (fN && !fS && !fW && !fE && wS && (wW || wE) && (fNW || fNE)) {
    return CornerType.TOP_END;
  }

  // 5. Inner (Concave) Corners
  if (fSE && !fN && !fW && !fS && !fE && !fNW) {
    return CornerType.INNER_TOP_LEFT;
  }
  if (fSW && !fN && !fE && !fS && !fW && !fNE) {
    return CornerType.INNER_TOP_RIGHT;
  }
  if (fNE && !fS && !fW && !fN && !fE && !fSW) {
    return CornerType.INNER_BOTTOM_LEFT;
  }
  if (fNW && !fS && !fE && !fN && !fW && !fSE) {
    return CornerType.INNER_BOTTOM_RIGHT;
  }

  // Edge boundary inner corners (borders of map / void)
  if (
    fSE &&
    (eN || wN) &&
    (eW || wW) &&
    !fN &&
    !fW &&
    !fNW &&
    (!fS || (eN && eW)) &&
    (!fE || (eN && eW))
  ) {
    return CornerType.INNER_TOP_LEFT;
  }
  if (
    fSW &&
    (eN || wN) &&
    (eE || wE) &&
    !fN &&
    !fE &&
    !fNE &&
    (!fS || (eN && eE)) &&
    (!fW || (eN && eE))
  ) {
    return CornerType.INNER_TOP_RIGHT;
  }
  if (
    fNE &&
    (eS || wS) &&
    (eW || wW) &&
    !fS &&
    !fW &&
    !fSW &&
    (!fN || (eS && eW)) &&
    (!fE || (eS && eW))
  ) {
    return CornerType.INNER_BOTTOM_LEFT;
  }
  if (
    fNW &&
    (eS || wS) &&
    (eE || wE) &&
    !fS &&
    !fE &&
    !fSE &&
    (!fN || (eS && eE)) &&
    (!fW || (eS && eE))
  ) {
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
