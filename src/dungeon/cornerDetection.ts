import { CornerType, type Corner } from '../types';
import { COLLAPSED, EMPTY, findCell, SEALED_DOOR, WALL } from '../core';

// Sentinel for what the player cannot see yet: an undiscovered room or
// corridor renders as solid rock, and so does a wall with no discovered
// floor next to it — the same visibility rule the renderer applies. Unknown
// is not floor and not wall, but unlike truly empty space it cannot confirm
// that a side is open either. Corner shapes may only be asserted from what
// is actually visible.
const UNKNOWN = '\u0000';

const isFloor = (cell: string): boolean =>
  Boolean(
    cell &&
      cell !== EMPTY &&
      cell !== WALL &&
      cell !== SEALED_DOOR &&
      cell !== UNKNOWN,
  );

const isWall = (cell: string): boolean => cell === WALL || cell === SEALED_DOOR;

const isEmpty = (cell: string): boolean => !cell || cell === EMPTY;

const isUnknown = (cell: string): boolean => cell === UNKNOWN;

// A wall renders when discovered floor or collapsed rubble borders it,
// mirroring the renderer's own visibility check.
const isWallVisible = (
  grid: string[],
  x: number,
  y: number,
  discoveredRooms: string[],
): boolean => {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cell = findCell(grid, x + dx, y + dy);
      if (cell === COLLAPSED) return true;
      if (isFloor(cell) && discoveredRooms.includes(cell)) return true;
    }
  }
  return false;
};

// Resolve a cell to what the player can actually see of it: hidden floor is
// unknown, and so are walls that do not border any discovered floor. Collapsed
// rubble is never unknown: it is not part of discoveredRooms but always
// renders as rubble once it borders a discovered room, so it counts as
// visible floor.
const visibleCell = (
  grid: string[],
  x: number,
  y: number,
  discoveredRooms?: string[],
): string => {
  const cell = findCell(grid, x, y);
  if (!discoveredRooms) return cell;
  if (cell === WALL || cell === SEALED_DOOR) {
    return isWallVisible(grid, x, y, discoveredRooms) ? cell : UNKNOWN;
  }
  if (isFloor(cell) && cell !== COLLAPSED && !discoveredRooms.includes(cell)) {
    return UNKNOWN;
  }
  return cell;
};

export const detectCornerType = (
  grid: string[],
  x: number,
  y: number,
  discoveredRooms?: string[],
): CornerType => {
  const currentCell = findCell(grid, x, y);
  if (currentCell !== WALL && currentCell !== SEALED_DOOR) {
    return CornerType.NOT_CORNER;
  }

  const N = visibleCell(grid, x, y - 1, discoveredRooms);
  const S = visibleCell(grid, x, y + 1, discoveredRooms);
  const W = visibleCell(grid, x - 1, y, discoveredRooms);
  const E = visibleCell(grid, x + 1, y, discoveredRooms);

  const NW = visibleCell(grid, x - 1, y - 1, discoveredRooms);
  const NE = visibleCell(grid, x + 1, y - 1, discoveredRooms);
  const SW = visibleCell(grid, x - 1, y + 1, discoveredRooms);
  const SE = visibleCell(grid, x + 1, y + 1, discoveredRooms);

  // Two cells out along each axis: whether a junction stem continues into
  // more wall (it is then part of a wall run, not a stub).
  const beyondN = findCell(grid, x, y - 2);
  const beyondS = findCell(grid, x, y + 2);
  const beyondW = findCell(grid, x - 2, y);
  const beyondE = findCell(grid, x + 2, y);

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

  const wNW = isWall(NW);
  const wNE = isWall(NE);
  const wSW = isWall(SW);
  const wSE = isWall(SE);

  const eN = isEmpty(N);
  const eS = isEmpty(S);
  const eW = isEmpty(W);
  const eE = isEmpty(E);

  const uN = isUnknown(N);
  const uS = isUnknown(S);
  const uW = isUnknown(W);
  const uE = isUnknown(E);

  // 1. Four-Way Intersection
  if (wN && wS && wW && wE && (fNW || fNE || fSW || fSE)) {
    return CornerType.FOUR_WAY_INTERSECTION;
  }

  // 2. Three-Way Intersections (T-junctions)
  // A T-junction is built entirely from real, terminating rock: the stem and
  // both arms must be real walls (a sealed doorway renders as a door, never
  // as crossbar or stub), the stem must be free-standing — touching a wall on
  // either lateral flank means it is embedded in a thicker wall mass — and it
  // must terminate, with no wall two cells out. Otherwise the cell renders as
  // a plain wall piece or as the corner cap of the floor wrapping the mass.
  if (
    N === WALL &&
    W === WALL &&
    E === WALL &&
    !wS &&
    !wNW &&
    !wNE &&
    beyondN !== WALL &&
    ((fNW && fNE) || fS)
  ) {
    return CornerType.THREE_WAY_INTERSECTION_UP;
  }
  if (
    S === WALL &&
    W === WALL &&
    E === WALL &&
    !wN &&
    !wSW &&
    !wSE &&
    beyondS !== WALL &&
    ((fSW && fSE) || fN)
  ) {
    return CornerType.THREE_WAY_INTERSECTION_DOWN;
  }
  if (
    W === WALL &&
    N === WALL &&
    S === WALL &&
    !wE &&
    !wNW &&
    !wSW &&
    beyondW !== WALL &&
    ((fNW && fSW) || fE)
  ) {
    return CornerType.THREE_WAY_INTERSECTION_LEFT;
  }
  if (
    E === WALL &&
    N === WALL &&
    S === WALL &&
    !wW &&
    !wNE &&
    !wSE &&
    beyondE !== WALL &&
    ((fNE && fSE) || fW)
  ) {
    return CornerType.THREE_WAY_INTERSECTION_RIGHT;
  }

  // 3. Outer (Convex) Corners
  // The open side of an outer corner must be confirmed open — visible floor
  // or truly empty space ((fX || eX), which for a fully discovered layout is
  // exactly the old !wX check). Hidden floor counts as neither, so no corner
  // shape is asserted over undiscovered space.
  if (
    !fS &&
    !fW &&
    (wS || eS) &&
    (wW || eW) &&
    ((fN && fE) || (fN && fNE && (fE || eE)) || (fE && fNE && (fN || eN)))
  ) {
    return CornerType.OUTER_TOP_RIGHT;
  }
  if (
    !fS &&
    !fE &&
    (wS || eS) &&
    (wE || eE) &&
    ((fN && fW) || (fN && fNW && (fW || eW)) || (fW && fNW && (fN || eN)))
  ) {
    return CornerType.OUTER_TOP_LEFT;
  }
  if (
    !fN &&
    !fW &&
    (wN || eN) &&
    (wW || eW) &&
    ((fS && fE) || (fS && fSE && (fE || eE)) || (fE && fSE && (fS || eS)))
  ) {
    return CornerType.OUTER_BOTTOM_RIGHT;
  }
  if (
    !fN &&
    !fE &&
    (wN || eN) &&
    (wE || eE) &&
    ((fS && fW) || (fS && fSW && (fW || eW)) || (fW && fSW && (fS || eS)))
  ) {
    return CornerType.OUTER_BOTTOM_LEFT;
  }

  // 4. Wall Ends
  // A wall stub visibly terminates against a wall, empty space, or hidden
  // floor; the end cap is drawn in all three cases so the stub does not
  // render one cell short at the fog boundary.
  if (
    fW &&
    !fE &&
    !wN &&
    !wS &&
    (wE || eE || uE) &&
    ((fN && fS) || (fNW && fSW))
  ) {
    return CornerType.LEFT_END;
  }
  if (
    fE &&
    !fW &&
    !wN &&
    !wS &&
    (wW || eW || uW) &&
    ((fN && fS) || (fNE && fSE))
  ) {
    return CornerType.RIGHT_END;
  }
  if (
    fN &&
    !fS &&
    !wW &&
    !wE &&
    (wS || eS || uS) &&
    ((fW && fE) || (fNW && fNE))
  ) {
    return CornerType.TOP_END;
  }
  if (
    fS &&
    !fN &&
    !wW &&
    !wE &&
    (wN || eN || uN) &&
    ((fW && fE) || (fSW && fSE))
  ) {
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

export const autoDetectCorners = (
  grid: string[],
  discoveredRooms?: string[],
): Corner[] => {
  const corners: Corner[] = [];
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y];
    for (let x = 0; x < row.length; x++) {
      const type = detectCornerType(grid, x, y, discoveredRooms);
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
