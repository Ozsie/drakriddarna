// Game-side facade over the @hoard-engine/grid engine package
// (published on npm, consumed as a dependency). The package is
// game-agnostic: it works on plain positions, edge shapes and injected
// callbacks. Everything that knows game types stays here — walkability
// (pits, pillars, room letters), discovery, corridor letters and the
// actors that block or stop a line (see docs/engine-packages.md).
import {
  COLLAPSED,
  EMPTY,
  SEALED_DOOR,
  WALL,
  canSearchThrough as packageCanSearchThrough,
  cellsAlongLine,
  crossesWallEdge as packageCrossesWallEdge,
  distanceInGrid,
  findCell,
  findRoomCells,
  getDist,
  hasLineOfSight as packageHasLineOfSight,
  isDoorEdge as packageIsDoorEdge,
  isDoorSearchableFrom,
  isEdgeBlocked as packageIsEdgeBlocked,
  isNeighbouring,
  isSamePosition,
  isWallEdge as packageIsWallEdge,
  normaliseVector,
  sideOffset,
  stepAlongLine as packageStepAlongLine,
  toArray,
  type LineOfSightEnv,
} from '@hoard-engine/grid';
import type {
  Actor,
  Door,
  Dungeon,
  GameState,
  Hero,
  Layout,
  Position,
  WallEdge,
} from '../types';

export {
  COLLAPSED,
  EMPTY,
  SEALED_DOOR,
  WALL,
  cellsAlongLine,
  distanceInGrid,
  findCell,
  findRoomCells,
  getDist,
  isDoorSearchableFrom,
  isNeighbouring,
  isSamePosition,
  normaliseVector,
  sideOffset,
  toArray,
};

export const isDoorEdge = (
  layout: Layout,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): Door | undefined =>
  packageIsDoorEdge<Door>(layout.doors, fromX, fromY, toX, toY);

export const isWallEdge = (
  layout: Layout,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): WallEdge | undefined =>
  packageIsWallEdge<WallEdge>(layout.walls, fromX, fromY, toX, toY);

export const crossesWallEdge = (
  layout: Layout,
  from: Position,
  to: Position,
): boolean => packageCrossesWallEdge(layout.walls, from, to);

// Any closed door or edge wall standing between two adjacent cells blocks
// sight, searching and movement beyond it.
export const isEdgeBlocked = (
  layout: Layout,
  from: Position,
  to: Position,
): boolean =>
  packageIsEdgeBlocked({ doors: layout.doors, walls: layout.walls }, from, to);

export const canSearchThrough = (
  layout: Layout,
  from: Position,
  to: Position,
): boolean =>
  packageCanSearchThrough(
    { doors: layout.doors, walls: layout.walls },
    from,
    to,
    (x, y) => isWalkable(layout, x, y),
  );

export const isRoomDiscovered = (dungeon: Dungeon, cell: string): boolean =>
  dungeon.discoveredRooms.includes(cell);

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

// The game knowledge the package's line walker consumes, injected per
// line: which cells block a walking line or a ray at a corner pinch (pits
// never cut a sight ray there), which cells terminate the line before the
// target, and which edges are closed.
const lineOfSightEnv = (
  state: GameState,
  source: Position,
): LineOfSightEnv => ({
  isBlockedCell: (position) => isBlockingCell(state, position),
  isFlankPassable: (position) =>
    Boolean(
      state.dungeon.layout.pits?.some((pit) => isSamePosition(pit, position)),
    ),
  stopsLine: (position, walking) => {
    const layout = state.dungeon.layout;
    const cell = findCell(layout.grid, position.x, position.y);
    const pit = layout.pits?.some((pit) => isSamePosition(pit, position));
    const pillar = layout.pillars?.some((pillar) =>
      isSamePosition(pillar, position),
    );
    const monster = layout.monsters
      .filter((monster) => !isSamePosition(monster.position, source))
      .some((monster) => isSamePosition(monster.position, position));
    const hero = state.heroes
      .filter((hero) => hero.health > 0)
      .filter((hero) => !isSamePosition(hero.position, source))
      .some((hero) => isSamePosition(hero.position, position));
    return Boolean(
      pillar ||
        monster ||
        (!walking && hero) ||
        cell === WALL ||
        cell === COLLAPSED ||
        (walking && (pit || cell === EMPTY)),
    );
  },
  isEdgeBlocked: (from, to) => isEdgeBlocked(state.dungeon.layout, from, to),
});

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
): boolean =>
  packageStepAlongLine(
    startPixelPos,
    source,
    targetPixelPos,
    target,
    resolution,
    lineOfSightEnv(state, source),
    walking,
    seenCells,
    lastCell,
  );

export const hasLineOfSight = (
  startPosition: Position,
  targetPosition: Position,
  resolution: number,
  state: GameState,
  walking: boolean,
): boolean =>
  packageHasLineOfSight(
    startPosition,
    targetPosition,
    resolution,
    lineOfSightEnv(state, startPosition),
    walking,
  );

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
