import { Side } from '../../../types';
import type {
  DeclarativeDoor,
  DeclarativeLayout,
} from '../../../dungeon/dungeonParser';
import { createRig, type Rig } from './rng';
import { getDepthConfig, STARTING_POSITIONS } from './config';

/**
 * Layout generator (docs/random-campaign-spec/02-generation-algorithm.md).
 *
 * Grows each room as an organic blob with a one-cell rock gap between
 * rooms, then carves doorways: the wall cell between two rooms becomes a
 * floor cell of one room with the door on its edge toward the other room.
 * Doors are edge-based between two floor cells — a door on a `#` cell could
 * never be crossed (`isWalkable` rejects rock), which is why the carve
 * exists (see the spec, step 4).
 *
 * Every function here is a pure function of `(seed, depth)`; all
 * randomness flows through the deterministic rig.
 */

export class LayoutGenerationError extends Error {}

const ROOM_LETTERS = 'ABCDEFGHIJ';

const ORTHOGONAL: { dx: number; dy: number; side: Side }[] = [
  { dx: 0, dy: -1, side: Side.UP },
  { dx: 0, dy: 1, side: Side.DOWN },
  { dx: -1, dy: 0, side: Side.LEFT },
  { dx: 1, dy: 0, side: Side.RIGHT },
];

type Grid = string[][];

export type GeneratedLayout = {
  /** The declarative layout: grid strings and door tuples only. */
  layout: DeclarativeLayout;
  /** The largest room; heroes start here and it is discovered at start. */
  startRoom: string;
  /** Distinct floor cells of the start room, one per hero. */
  startingPositions: { x: number; y: number }[];
  /** Cells a door sits on (the carved doorway cell and its target); population keeps them free. */
  doorCells: { x: number; y: number }[];
};

const isFloor = (cell: string): boolean =>
  cell !== ' ' && cell !== '#' && cell !== '';

const cellAt = (grid: Grid, x: number, y: number): string => grid[y]?.[x] ?? '';

/** Floor cells stay off the outermost ring so rock always frames the dungeon. */
const inFloorBounds = (size: number, x: number, y: number): boolean =>
  x >= 1 && x <= size - 2 && y >= 1 && y <= size - 2;

const setCell = (grid: Grid, x: number, y: number, value: string): void => {
  grid[y][x] = value;
};

// ---------------------------------------------------------------------------
// Step 1 — room seeding on a jittered lattice
// ---------------------------------------------------------------------------

const seedRooms = (
  rig: Rig,
  size: number,
  roomCount: number,
): { x: number; y: number }[] => {
  const lattice = Math.ceil(Math.sqrt(roomCount));
  const cellSize = Math.floor((size - 2) / lattice);
  const cells: { cx: number; cy: number }[] = [];
  for (let cy = 0; cy < lattice; cy++) {
    for (let cx = 0; cx < lattice; cx++) {
      cells.push({ cx, cy });
    }
  }
  const chosen = rig.shuffle(cells).slice(0, roomCount);
  const seeds = chosen.map(({ cx, cy }) => ({
    x: 1 + cx * cellSize + rig.intInRange(0, cellSize - 1),
    y: 1 + cy * cellSize + rig.intInRange(0, cellSize - 1),
  }));
  // Jitter can place two seeds in neighbouring lattice cells right next to
  // each other; without the rock gap the rooms would touch, so reject.
  for (let i = 0; i < seeds.length; i++) {
    for (let j = i + 1; j < seeds.length; j++) {
      const dx = Math.abs(seeds[i].x - seeds[j].x);
      const dy = Math.abs(seeds[i].y - seeds[j].y);
      if (dx + dy <= 1) {
        throw new LayoutGenerationError('Room seeds too close together');
      }
    }
  }
  return seeds;
};

// ---------------------------------------------------------------------------
// Step 2 — blob growth (random walk, one-cell gap between rooms)
// ---------------------------------------------------------------------------

const canGrowInto = (
  grid: Grid,
  size: number,
  x: number,
  y: number,
  ownLetter: string,
): boolean => {
  if (!inFloorBounds(size, x, y)) return false;
  if (isFloor(cellAt(grid, x, y))) return false;
  for (const { dx, dy } of ORTHOGONAL) {
    const neighbour = cellAt(grid, x + dx, y + dy);
    if (isFloor(neighbour) && neighbour !== ownLetter) return false;
  }
  return true;
};

const growBlobs = (
  rig: Rig,
  grid: Grid,
  size: number,
  letters: string[],
  seeds: { x: number; y: number }[],
  areaMin: number,
  areaMax: number,
): void => {
  const blobs = letters.map((letter, index) => ({
    letter,
    cells: [seeds[index]],
    target: rig.intInRange(areaMin, areaMax),
  }));
  blobs.forEach((blob) =>
    setCell(grid, blob.cells[0].x, blob.cells[0].y, blob.letter),
  );

  const tryGrow = (blob: (typeof blobs)[number]): boolean => {
    for (let attempt = 0; attempt < 10; attempt++) {
      const from = rig.pick(blob.cells);
      const direction = ORTHOGONAL[rig.intInRange(0, ORTHOGONAL.length - 1)];
      const x = from.x + direction.dx;
      const y = from.y + direction.dy;
      if (canGrowInto(grid, size, x, y, blob.letter)) {
        setCell(grid, x, y, blob.letter);
        blob.cells.push({ x, y });
        return true;
      }
    }
    return false;
  };

  // Round-robin growth so no room can box the others in by going first.
  for (;;) {
    let grew = false;
    let allDone = true;
    for (const blob of blobs) {
      if (blob.cells.length >= blob.target) continue;
      allDone = false;
      if (tryGrow(blob)) {
        grew = true;
      }
    }
    if (allDone) return;
    if (!grew) {
      throw new LayoutGenerationError(
        'A room could not reach its target area (boxed in by neighbours)',
      );
    }
  }
};

/** Fills single-cell holes so a blob reads as a cave; unfilled holes stay as rock pillars. */
const smoothHoles = (grid: Grid, size: number, areaMax: number): void => {
  const roomSizes = new Map<string, number>();
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cell = grid[y][x];
      if (isFloor(cell)) {
        roomSizes.set(cell, (roomSizes.get(cell) ?? 0) + 1);
      }
    }
  }
  for (;;) {
    let filled = false;
    for (let y = 1; y < size - 1 && !filled; y++) {
      for (let x = 1; x < size - 1 && !filled; x++) {
        if (isFloor(grid[y][x])) continue;
        const counts = new Map<string, number>();
        for (const { dx, dy } of ORTHOGONAL) {
          const neighbour = cellAt(grid, x + dx, y + dy);
          if (isFloor(neighbour)) {
            counts.set(neighbour, (counts.get(neighbour) ?? 0) + 1);
          }
        }
        if (counts.size !== 1) continue;
        const [letter, count] = [...counts.entries()][0];
        if (count < 3) continue;
        if ((roomSizes.get(letter) ?? 0) >= areaMax) continue;
        setCell(grid, x, y, letter);
        roomSizes.set(letter, (roomSizes.get(letter) ?? 0) + 1);
        filled = true;
      }
    }
    if (!filled) return;
  }
};

// ---------------------------------------------------------------------------
// Step 3 — walls
// ---------------------------------------------------------------------------

const carveWalls = (grid: Grid, size: number): void => {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (isFloor(grid[y][x])) continue;
      let touchesFloor = false;
      for (let dy = -1; dy <= 1 && !touchesFloor; dy++) {
        for (let dx = -1; dx <= 1 && !touchesFloor; dx++) {
          if (isFloor(cellAt(grid, x + dx, y + dy))) {
            touchesFloor = true;
          }
        }
      }
      grid[y][x] = touchesFloor ? '#' : ' ';
    }
  }
};

// ---------------------------------------------------------------------------
// Step 2b — connectivity tendrils
// ---------------------------------------------------------------------------

const roomCellList = (
  grid: Grid,
  letter: string,
): { x: number; y: number }[] => {
  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x] === letter) cells.push({ x, y });
    }
  }
  return cells;
};

const chebyshev = (
  a: { x: number; y: number },
  b: { x: number; y: number },
): number => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

const minDistanceToRoom = (
  from: { x: number; y: number },
  targets: { x: number; y: number }[],
): number => Math.min(...targets.map((target) => chebyshev(from, target)));

/**
 * Whether any wall cell around the given cell yields a door candidate
 * between the two rooms (a new floor cell can only create candidates at
 * its own sides).
 */
const hasDoorCandidateBetween = (
  grid: Grid,
  size: number,
  cell: { x: number; y: number },
  letterA: string,
  letterB: string,
): boolean => {
  for (const { dx, dy } of ORTHOGONAL) {
    const candidate = asDoorCandidate(grid, size, cell.x + dx, cell.y + dy);
    if (
      candidate &&
      ((candidate.owner === letterA && candidate.targetLetter === letterB) ||
        (candidate.owner === letterB && candidate.targetLetter === letterA))
    ) {
      return true;
    }
  }
  return false;
};

/**
 * Grows a directed tendril of `letterA` cells toward the nearest cell of
 * `letterB` until a door candidate exists between the two rooms. The
 * one-cell gap rule stops the tendril right where a doorway can be carved.
 * Returns false when no progress is possible.
 */
const growTendril = (
  rig: Rig,
  grid: Grid,
  size: number,
  letterA: string,
  letterB: string,
): boolean => {
  const bCells = roomCellList(grid, letterB);
  if (bCells.length === 0) return false;
  const maxSteps = size;
  for (let step = 0; step < maxSteps; step++) {
    const aCells = roomCellList(grid, letterA);
    const bestDistance = Math.min(
      ...aCells.map((cell) => minDistanceToRoom(cell, bCells)),
    );
    if (bestDistance <= 1) {
      // Already as close as the gap rule allows; a candidate must exist
      // or the approach is blocked for good.
      return aCells.some((cell) =>
        hasDoorCandidateBetween(grid, size, cell, letterA, letterB),
      );
    }
    const frontier: { x: number; y: number; distance: number }[] = [];
    for (const cell of aCells) {
      for (const { dx, dy } of ORTHOGONAL) {
        const x = cell.x + dx;
        const y = cell.y + dy;
        if (!canGrowInto(grid, size, x, y, letterA)) continue;
        const distance = minDistanceToRoom({ x, y }, bCells);
        if (distance < bestDistance) {
          frontier.push({ x, y, distance });
        }
      }
    }
    if (frontier.length === 0) {
      return aCells.some((cell) =>
        hasDoorCandidateBetween(grid, size, cell, letterA, letterB),
      );
    }
    const best = Math.min(...frontier.map((cell) => cell.distance));
    const choices = frontier.filter((cell) => cell.distance === best);
    const next = rig.pick(choices);
    setCell(grid, next.x, next.y, letterA);
    if (hasDoorCandidateBetween(grid, size, next, letterA, letterB)) {
      return true;
    }
  }
  return false;
};

/**
 * Phase 2 of growth: while the candidate-adjacency graph is disconnected,
 * the two closest yet-unconnected rooms grow a tendril toward each other.
 * This keeps the organic blobs but makes connectivity the common case
 * instead of a lucky accident. No corridors are ever carved — tendril
 * cells belong to the growing room's own letter.
 */
const connectRooms = (
  rig: Rig,
  grid: Grid,
  size: number,
  letters: string[],
): void => {
  const failedPairs = new Set<string>();
  for (;;) {
    const byPair = collectCandidates(grid, size);
    const adjacency = buildAdjacency(letters, [...byPair.keys()]);
    const components = new Map<string, number>();
    let componentCount = 0;
    for (const letter of letters) {
      if (components.has(letter)) continue;
      componentCount++;
      const queue = [letter];
      components.set(letter, componentCount);
      while (queue.length > 0) {
        const current = queue.pop() as string;
        for (const neighbour of adjacency.get(current) ?? []) {
          if (!components.has(neighbour)) {
            components.set(neighbour, componentCount);
            queue.push(neighbour);
          }
        }
      }
    }
    if (componentCount === 1) return;

    let bestPair: { a: string; b: string; distance: number } | undefined;
    for (const a of letters) {
      for (const b of letters) {
        if (a >= b) continue;
        if (components.get(a) === components.get(b)) continue;
        if (failedPairs.has(pairKey(a, b))) continue;
        const aCells = roomCellList(grid, a);
        const bCells = roomCellList(grid, b);
        let distance = Infinity;
        for (const cell of aCells) {
          distance = Math.min(distance, minDistanceToRoom(cell, bCells));
        }
        if (!bestPair || distance < bestPair.distance) {
          bestPair = { a, b, distance };
        }
      }
    }
    if (!bestPair) {
      throw new LayoutGenerationError(
        'Rooms could not be connected by tendrils',
      );
    }
    const grew =
      growTendril(rig, grid, size, bestPair.a, bestPair.b) ||
      growTendril(rig, grid, size, bestPair.b, bestPair.a);
    if (!grew) {
      failedPairs.add(pairKey(bestPair.a, bestPair.b));
    }
    carveWalls(grid, size);
  }
};

// ---------------------------------------------------------------------------
// Step 4 — door candidates and carving
// ---------------------------------------------------------------------------

type DoorCandidate = {
  x: number;
  y: number;
  owner: string;
  targetLetter: string;
  targetX: number;
  targetY: number;
  side: Side;
};

/**
 * A cell can host a doorway when its orthogonal floor neighbours are
 * cells of exactly one room plus exactly one cell of a second room: carved
 * into the first room's letter, it touches the second room on a single
 * edge, which is where the door goes. Any other pattern would open an
 * uncontrolled gap between rooms. When the wall cell touches one cell of
 * each room (the common case, because of the one-cell gap rule), either
 * room may own the doorway — both orientations are returned so the door
 * can be carved into whichever room is on the already-discovered side.
 */
const asDoorCandidates = (
  grid: Grid,
  size: number,
  x: number,
  y: number,
): DoorCandidate[] => {
  if (!inFloorBounds(size, x, y)) return [];
  if (isFloor(grid[y][x])) return [];
  const counts = new Map<string, number>();
  for (const { dx, dy } of ORTHOGONAL) {
    const neighbour = cellAt(grid, x + dx, y + dy);
    if (isFloor(neighbour)) {
      counts.set(neighbour, (counts.get(neighbour) ?? 0) + 1);
    }
  }
  if (counts.size !== 2) return [];
  const [[letterA, countA], [letterB, countB]] = [...counts.entries()];
  if (countA !== 1 && countB !== 1) return [];
  const oriented = (owner: string, target: string): DoorCandidate | null => {
    for (const { dx, dy, side } of ORTHOGONAL) {
      if (cellAt(grid, x + dx, y + dy) === target) {
        return {
          x,
          y,
          owner,
          targetLetter: target,
          targetX: x + dx,
          targetY: y + dy,
          side,
        };
      }
    }
    return null;
  };
  if (countA === 1 && countB === 1) {
    return [oriented(letterA, letterB), oriented(letterB, letterA)].filter(
      (candidate): candidate is DoorCandidate => candidate !== null,
    );
  }
  const single =
    countA === 1 ? oriented(letterB, letterA) : oriented(letterA, letterB);
  return single ? [single] : [];
};

const asDoorCandidate = (
  grid: Grid,
  size: number,
  x: number,
  y: number,
): DoorCandidate | undefined => asDoorCandidates(grid, size, x, y)[0];

const pairKey = (a: string, b: string): string =>
  a < b ? `${a}${b}` : `${b}${a}`;

const collectCandidates = (
  grid: Grid,
  size: number,
): Map<string, DoorCandidate[]> => {
  const byPair = new Map<string, DoorCandidate[]>();
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      for (const candidate of asDoorCandidates(grid, size, x, y)) {
        const key = pairKey(candidate.owner, candidate.targetLetter);
        const list = byPair.get(key) ?? [];
        list.push(candidate);
        byPair.set(key, list);
      }
    }
  }
  return byPair;
};

const buildAdjacency = (
  letters: string[],
  pairKeys: string[],
): Map<string, string[]> => {
  const adjacency = new Map<string, string[]>(
    letters.map((letter) => [letter, []]),
  );
  for (const key of pairKeys) {
    const [a, b] = key.split('');
    adjacency.get(a)?.push(b);
    adjacency.get(b)?.push(a);
  }
  return adjacency;
};

const assertConnectedAdjacency = (
  letters: string[],
  byPair: Map<string, DoorCandidate[]>,
): void => {
  const adjacency = buildAdjacency(letters, [...byPair.keys()]);
  const seen = new Set<string>([letters[0]]);
  const queue = [letters[0]];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const neighbour of adjacency.get(current) ?? []) {
      if (!seen.has(neighbour)) {
        seen.add(neighbour);
        queue.push(neighbour);
      }
    }
  }
  if (seen.size !== letters.length) {
    throw new LayoutGenerationError('Room adjacency graph is not connected');
  }
};

export type TreeEdge = {
  /** The room already connected to the start when the edge is added. */
  parent: string;
  /** The room the edge discovers. */
  child: string;
};

/**
 * Prim-style spanning tree grown from the start room. Every tree edge must
 * have a doorway candidate whose carved cell belongs to the parent room:
 * the door then sits on the already-discovered side and opens into the
 * child room, so it is crossable on first contact (the benchmark bot's
 * crossing model, and the convention of the hand-authored dungeons).
 */
const spanningTreeFrom = (
  rig: Rig,
  startRoom: string,
  letters: string[],
  byPair: Map<string, DoorCandidate[]>,
): TreeEdge[] => {
  const adjacency = buildAdjacency(letters, [...byPair.keys()]);
  const seen = new Set<string>([startRoom]);
  const tree: TreeEdge[] = [];
  while (seen.size < letters.length) {
    const options: TreeEdge[] = [];
    for (const parent of seen) {
      for (const child of adjacency.get(parent) ?? []) {
        if (seen.has(child)) continue;
        const parentOwned = (byPair.get(pairKey(parent, child)) ?? []).some(
          (candidate) => candidate.owner === parent,
        );
        if (parentOwned) options.push({ parent, child });
      }
    }
    if (options.length === 0) {
      throw new LayoutGenerationError(
        'No doorway opens from a discovered room into an undiscovered one',
      );
    }
    const edge = rig.pick(options);
    seen.add(edge.child);
    tree.push(edge);
  }
  return tree;
};

type PlacedDoor = {
  side: Side;
  x: number;
  y: number;
  from: string;
  to: string;
};

// ---------------------------------------------------------------------------
// Bridge detection on the final door graph (locked doors never on a bridge)
// ---------------------------------------------------------------------------

export type RoomEdge = { from: string; to: string };

/** Edges of the room graph implied by a layout's door tuples. */
export const getRoomEdges = (
  grid: string[],
  doors: DeclarativeDoor[] | undefined,
): RoomEdge[] =>
  (doors ?? []).map((door) => {
    if (Array.isArray(door)) {
      const [side, x, y] = door;
      const direction = ORTHOGONAL.find(({ side: s }) => s === side);
      return {
        from: grid[y]?.[x] ?? '',
        to: direction ? grid[y + direction.dy]?.[x + direction.dx] ?? '' : '',
      };
    }
    const direction = ORTHOGONAL.find(({ side: s }) => s === door.side);
    return {
      from: grid[door.y]?.[door.x] ?? '',
      to: direction
        ? grid[door.y + direction.dy]?.[door.x + direction.dx] ?? ''
        : '',
    };
  });

/** Indices of door-graph edges whose removal disconnects the room graph. */
export const bridgeEdgeIndices = (
  letters: string[],
  edges: RoomEdge[],
): Set<number> => {
  const adjacency = new Map<string, { to: string; edgeIndex: number }[]>(
    letters.map((letter) => [letter, []]),
  );
  edges.forEach((edge, index) => {
    adjacency.get(edge.from)?.push({ to: edge.to, edgeIndex: index });
    adjacency.get(edge.to)?.push({ to: edge.from, edgeIndex: index });
  });
  const bridges = new Set<number>();
  const visited = new Set<string>();
  const depth = new Map<string, number>();
  const low = new Map<string, number>();

  const dfs = (
    node: string,
    parentEdge: number | undefined,
    currentDepth: number,
  ): void => {
    visited.add(node);
    depth.set(node, currentDepth);
    low.set(node, currentDepth);
    for (const { to, edgeIndex } of adjacency.get(node) ?? []) {
      if (edgeIndex === parentEdge) continue;
      if (visited.has(to)) {
        low.set(
          node,
          Math.min(
            low.get(node) ?? currentDepth,
            depth.get(to) ?? currentDepth,
          ),
        );
      } else {
        dfs(to, edgeIndex, currentDepth + 1);
        low.set(
          node,
          Math.min(low.get(node) ?? currentDepth, low.get(to) ?? currentDepth),
        );
        if ((low.get(to) ?? currentDepth) > currentDepth) {
          bridges.add(edgeIndex);
        }
      }
    }
  };

  for (const letter of letters) {
    if (!visited.has(letter)) {
      dfs(letter, undefined, 0);
    }
  }
  return bridges;
};

/** BFS hop distances in the door graph from a start room (unreachable rooms omitted). */
export const roomDistancesFrom = (
  letters: string[],
  edges: RoomEdge[],
  start: string,
): Map<string, number> => {
  const adjacency = new Map<string, string[]>(
    letters.map((letter) => [letter, []]),
  );
  for (const edge of edges) {
    adjacency.get(edge.from)?.push(edge.to);
    adjacency.get(edge.to)?.push(edge.from);
  }
  const distances = new Map<string, number>([[start, 0]]);
  const queue = [start];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const neighbour of adjacency.get(current) ?? []) {
      if (!distances.has(neighbour)) {
        distances.set(neighbour, (distances.get(current) ?? 0) + 1);
        queue.push(neighbour);
      }
    }
  }
  return distances;
};

// ---------------------------------------------------------------------------
// Steps 1-5 — the layout generator
// ---------------------------------------------------------------------------

export const generateLayout = (
  seed: number,
  depth: number,
): GeneratedLayout => {
  const config = getDepthConfig(depth);
  const rig = createRig(seed);
  const size = config.gridSize;
  const letters = ROOM_LETTERS.slice(0, config.rooms).split('');

  const grid: Grid = Array.from({ length: size }, () =>
    Array<string>(size).fill(' '),
  );

  const seeds = seedRooms(rig, size, config.rooms);
  growBlobs(
    rig,
    grid,
    size,
    letters,
    seeds,
    config.blobAreaMin,
    config.blobAreaMax,
  );
  smoothHoles(grid, size, config.blobAreaMax);
  carveWalls(grid, size);
  connectRooms(rig, grid, size, letters);

  const byPair = collectCandidates(grid, size);
  assertConnectedAdjacency(letters, byPair);

  // The start room (largest room, ties broken by letter order) must be
  // known before doors are carved: every tree doorway is oriented so it
  // opens from the room discovered first toward the room discovered next.
  const roomCells = new Map<string, { x: number; y: number }[]>(
    letters.map((letter) => [letter, []]),
  );
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cell = grid[y][x];
      if (isFloor(cell)) {
        roomCells.get(cell)?.push({ x, y });
      }
    }
  }
  const startRoom = letters.reduce((best, letter) =>
    (roomCells.get(letter) ?? []).length > (roomCells.get(best) ?? []).length
      ? letter
      : best,
  );

  const tree = spanningTreeFrom(rig, startRoom, letters, byPair);
  const treeKeys = new Set(
    tree.map((edge) => pairKey(edge.parent, edge.child)),
  );
  const extraPairs = [...byPair.keys()]
    .sort()
    .filter((pair) => !treeKeys.has(pair))
    .filter(() => rig.chance(config.extraDoorChance));

  const placed: PlacedDoor[] = [];
  const carvePair = (
    key: string,
    owner: string | undefined,
    mandatory: boolean,
  ): void => {
    const valid = (byPair.get(key) ?? []).filter(
      (candidate) =>
        asDoorCandidates(grid, size, candidate.x, candidate.y).some(
          (current) =>
            current.owner === candidate.owner &&
            current.targetLetter === candidate.targetLetter,
        ) &&
        (owner === undefined || candidate.owner === owner),
    );
    if (valid.length === 0) {
      if (mandatory) {
        throw new LayoutGenerationError(
          `No carveable doorway left for room pair ${key}`,
        );
      }
      return;
    }
    const candidate = rig.pick(valid);
    setCell(grid, candidate.x, candidate.y, candidate.owner);
    placed.push({
      side: candidate.side,
      x: candidate.x,
      y: candidate.y,
      from: candidate.owner,
      to: candidate.targetLetter,
    });
  };

  for (const edge of tree) {
    carvePair(pairKey(edge.parent, edge.child), edge.parent, true);
  }
  for (const key of extraPairs) {
    carvePair(key, undefined, false);
  }

  // Door options: hidden/trapped only on loop doors (a hidden or trapped
  // tree door could gate the only path), locked only off the bridges of
  // the final door graph so no locked door can gate the only path.
  const edges = placed.map((door) => ({ from: door.from, to: door.to }));
  const bridges = bridgeEdgeIndices(letters, edges);
  const doors: DeclarativeDoor[] = placed.map((door, index) => {
    const options: { hidden?: boolean; trapped?: boolean; locked?: boolean } =
      {};
    const isTreeDoor = treeKeys.has(pairKey(door.from, door.to));
    if (!isTreeDoor && rig.chance(config.hiddenDoorChance)) {
      options.hidden = true;
    }
    if (!isTreeDoor && rig.chance(config.trappedDoorChance)) {
      options.trapped = true;
    }
    if (
      !isTreeDoor &&
      !bridges.has(index) &&
      rig.chance(config.lockedDoorChance)
    ) {
      options.locked = true;
    }
    return Object.keys(options).length > 0
      ? [door.side, door.x, door.y, options]
      : [door.side, door.x, door.y];
  });

  // Cells a door sits on stay free of heroes, monsters and loot.
  const doorCells = placed.flatMap((door) => {
    const direction = ORTHOGONAL.find(({ side }) => side === door.side);
    return [
      { x: door.x, y: door.y },
      ...(direction
        ? [{ x: door.x + direction.dx, y: door.y + direction.dy }]
        : []),
    ];
  });
  const isDoorCell = (cell: { x: number; y: number }): boolean =>
    doorCells.some(
      (doorCell) => doorCell.x === cell.x && doorCell.y === cell.y,
    );

  const freeStartCells = (roomCells.get(startRoom) ?? []).filter(
    (cell) => !isDoorCell(cell),
  );
  const startCandidates =
    freeStartCells.length >= STARTING_POSITIONS
      ? freeStartCells
      : roomCells.get(startRoom) ?? [];
  const startingPositions = rig
    .shuffle(startCandidates)
    .slice(0, STARTING_POSITIONS);

  return {
    layout: {
      grid: grid.map((row) => row.join('')),
      doors,
    },
    startRoom,
    startingPositions,
    doorCells,
  };
};
