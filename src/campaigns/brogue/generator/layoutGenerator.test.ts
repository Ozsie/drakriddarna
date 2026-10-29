import { describe, expect, it } from 'vitest';
import { ConditionType, Side } from '../../../types';
import type { DeclarativeDoor } from '../../../dungeon/dungeonParser';
import { defineDungeon } from '../../../dungeon/dungeonParser';
import {
  bridgeEdgeIndices,
  generateLayout,
  getRoomEdges,
  roomDistancesFrom,
  type GeneratedLayout,
} from './layoutGenerator';
import { getDepthConfig } from './config';
import { hashSeed } from './rng';

const FLOOR = /[A-J]/;
const ALLOWED = /^[A-J# ]+$/;

// The same bounded rejection sampling the campaign generator uses: a raw
// attempt can legitimately reject (boxed-in room, blocked tendril), the
// seed derivation guarantees a fresh layout per attempt.
const generateWithRetry = (
  seedBase: number,
  depth: number,
  maxAttempts = 50,
): GeneratedLayout => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return generateLayout(hashSeed(seedBase, depth, attempt), depth);
    } catch {
      continue;
    }
  }
  throw new Error(
    `generateWithRetry: no valid layout for seedBase ${seedBase} depth ${depth}`,
  );
};

const doorCellsOf = (grid: string[], doors: DeclarativeDoor[] | undefined) => {
  const cells = new Set<string>();
  const offsets: Record<string, [number, number]> = {
    [Side.UP]: [0, -1],
    [Side.DOWN]: [0, 1],
    [Side.LEFT]: [-1, 0],
    [Side.RIGHT]: [1, 0],
  };
  for (const door of doors ?? []) {
    const [side, x, y] = door as [Side, number, number];
    cells.add(`${x},${y}`);
    const [dx, dy] = offsets[side];
    cells.add(`${x + dx},${y + dy}`);
  }
  return cells;
};

const roomLetters = (grid: string[]): Set<string> => {
  const letters = new Set<string>();
  for (const row of grid) {
    for (const char of row) {
      if (FLOOR.test(char)) letters.add(char);
    }
  }
  return letters;
};

const roomCellList = (grid: string[], letter: string) => {
  const cells: { x: number; y: number }[] = [];
  grid.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === letter) cells.push({ x, y });
    }
  });
  return cells;
};

describe('generateLayout', () => {
  it('is deterministic: the same (seed, depth) yields a deep-equal layout', () => {
    const a = generateWithRetry(123456, 5);
    const b = generateWithRetry(123456, 5);
    expect(a).toEqual(b);
  });

  it('diverges for different seeds', () => {
    const a = generateWithRetry(123456, 5);
    const b = generateWithRetry(654321, 5);
    expect(a.layout).not.toEqual(b.layout);
  });

  it('snapshots a representative depth', () => {
    const { layout, startRoom, startingPositions } = generateWithRetry(
      987654321,
      3,
    );
    expect(layout.grid).toMatchInlineSnapshot(`
      [
        "    #####         ",
        "  ###BBBB### #####",
        "  #BBB##DDD###CCC#",
        "  #BBB##DDDDCCCCC#",
        "  #BBB##DDD###CCC#",
        "  ######DDD# #####",
        "       ###D###    ",
        "         #EEE##   ",
        "         ##EEE#   ",
        "      #####EE##   ",
        "      #AAAA#E#    ",
        "      ####AAE#    ",
        "        ##AA#     ",
        "        #AA##     ",
        "        ####      ",
        "                  ",
        "                  ",
        "                  ",
      ]
    `);
    expect(startRoom).toMatchInlineSnapshot('"B"');
    expect(startingPositions).toMatchInlineSnapshot(`
      [
        {
          "x": 5,
          "y": 2,
        },
        {
          "x": 3,
          "y": 2,
        },
        {
          "x": 4,
          "y": 4,
        },
        {
          "x": 5,
          "y": 1,
        },
      ]
    `);
  });

  it('emits uniform rows of the configured size with only expected characters', () => {
    for (let depth = 1; depth <= 10; depth++) {
      const config = getDepthConfig(depth);
      const { layout } = generateWithRetry(987654321 + depth, depth);
      expect(layout.grid.length).toBe(config.gridSize);
      for (const row of layout.grid) {
        expect(row.length).toBe(config.gridSize);
        expect(row).toMatch(ALLOWED);
      }
    }
  });

  it('connects every room through doors for a sweep of seeds on every depth', () => {
    for (let depth = 1; depth <= 10; depth++) {
      const config = getDepthConfig(depth);
      for (let i = 0; i < 100; i++) {
        const { layout } = generateWithRetry(1000 * i + depth, depth);
        const letters = [...roomLetters(layout.grid)];
        expect(letters.length).toBe(config.rooms);
        const edges = getRoomEdges(layout.grid, layout.doors);
        const distances = roomDistancesFrom(letters, edges, letters[0]);
        expect(distances.size).toBe(config.rooms);
      }
    }
  });

  it('gives every room letter at least one door', () => {
    for (let depth = 1; depth <= 10; depth++) {
      for (let i = 0; i < 20; i++) {
        const { layout } = generateWithRetry(777 * i + depth, depth);
        const edges = getRoomEdges(layout.grid, layout.doors);
        const doored = new Set<string>();
        for (const edge of edges) {
          doored.add(edge.from);
          doored.add(edge.to);
        }
        expect(doored).toEqual(roomLetters(layout.grid));
      }
    }
  });

  it('never locks a door on an articulation point of the door graph', () => {
    for (let depth = 5; depth <= 10; depth++) {
      for (let i = 0; i < 50; i++) {
        const { layout } = generateWithRetry(31337 * i + depth, depth);
        const letters = [...roomLetters(layout.grid)];
        const edges = getRoomEdges(layout.grid, layout.doors);
        const bridges = bridgeEdgeIndices(letters, edges);
        (layout.doors ?? []).forEach((door, index) => {
          const options = Array.isArray(door) ? door[3] : undefined;
          if (options && 'locked' in options && options.locked) {
            expect(bridges.has(index)).toBe(false);
          }
        });
      }
    }
  });

  it('opens every tree doorway from the already-discovered side', () => {
    // The benchmark bot crosses a closed door only by standing on the door
    // tile and stepping to its target, so a room is only discoverable if
    // some door into it has its tile in an earlier-discovered room. This
    // mirrors that model: flood the door graph from the start room through
    // visible, unlocked doors only.
    const offsets: Record<string, [number, number]> = {
      [Side.UP]: [0, -1],
      [Side.DOWN]: [0, 1],
      [Side.LEFT]: [-1, 0],
      [Side.RIGHT]: [1, 0],
    };
    for (let depth = 1; depth <= 10; depth++) {
      for (let i = 0; i < 50; i++) {
        const { layout, startRoom } = generateWithRetry(909 * i + depth, depth);
        const discovered = new Set<string>([startRoom]);
        let grew = true;
        while (grew) {
          grew = false;
          for (const door of layout.doors ?? []) {
            const tuple = door as [Side, number, number, unknown];
            const options = tuple[3] as
              | { hidden?: boolean; locked?: boolean }
              | undefined;
            if (options?.hidden || options?.locked) continue;
            const [side, x, y] = tuple;
            const tileLetter = layout.grid[y][x];
            const [dx, dy] = offsets[side];
            const targetLetter = layout.grid[y + dy][x + dx];
            if (discovered.has(tileLetter) && !discovered.has(targetLetter)) {
              discovered.add(targetLetter);
              grew = true;
            }
          }
        }
        expect(discovered).toEqual(roomLetters(layout.grid));
      }
    }
  });

  it('places doors on floor cells that face another room across the edge', () => {
    for (let depth = 1; depth <= 10; depth++) {
      for (let i = 0; i < 20; i++) {
        const { layout } = generateWithRetry(4242 * i + depth, depth);
        const offsets: Record<string, [number, number]> = {
          [Side.UP]: [0, -1],
          [Side.DOWN]: [0, 1],
          [Side.LEFT]: [-1, 0],
          [Side.RIGHT]: [1, 0],
        };
        for (const door of layout.doors ?? []) {
          const [side, x, y] = door as [Side, number, number];
          const [dx, dy] = offsets[side];
          const from = layout.grid[y][x];
          const to = layout.grid[y + dy][x + dx];
          expect(FLOOR.test(from)).toBe(true);
          expect(FLOOR.test(to)).toBe(true);
          expect(from).not.toBe(to);
        }
      }
    }
  });

  it('keeps rooms separated by rock except at carved doorways', () => {
    for (let depth = 1; depth <= 10; depth++) {
      for (let i = 0; i < 20; i++) {
        const { layout } = generateWithRetry(555 * i + depth, depth);
        const doorCells = doorCellsOf(layout.grid, layout.doors);
        // Any two orthogonally adjacent floor cells of different letters
        // must be a door edge; blobs themselves never touch.
        layout.grid.forEach((row, y) => {
          for (let x = 0; x < row.length; x++) {
            const cell = row[x];
            if (!FLOOR.test(cell)) continue;
            for (const [dx, dy] of [
              [1, 0],
              [0, 1],
            ] as const) {
              const neighbour = layout.grid[y + dy]?.[x + dx];
              if (FLOOR.test(neighbour ?? ' ') && neighbour !== cell) {
                expect(
                  doorCells.has(`${x},${y}`) ||
                    doorCells.has(`${x + dx},${y + dy}`),
                ).toBe(true);
              }
            }
          }
        });
      }
    }
  });

  it('starts heroes on distinct floor cells of the largest room, never on door cells', () => {
    for (let depth = 1; depth <= 10; depth++) {
      const { layout, startRoom, startingPositions, doorCells } =
        generateWithRetry(987654321, depth);
      // The start room is the largest room before doorways are carved
      // (carving adds doorway stub cells to rooms), so discount the carved
      // doorway tiles when reconstructing the pre-carve sizes.
      const tileCount = new Map<string, number>();
      for (const door of layout.doors ?? []) {
        const [, x, y] = door as [Side, number, number];
        const letter = layout.grid[y][x];
        tileCount.set(letter, (tileCount.get(letter) ?? 0) + 1);
      }
      const sizes = new Map<string, number>();
      for (const letter of roomLetters(layout.grid)) {
        sizes.set(
          letter,
          roomCellList(layout.grid, letter).length -
            (tileCount.get(letter) ?? 0),
        );
      }
      const largest = [...sizes.entries()].sort(
        ([letterA, a], [letterB, b]) => b - a || (letterA < letterB ? -1 : 1),
      )[0][0];
      expect(startRoom).toBe(largest);
      expect(startingPositions.length).toBe(4);
      const seen = new Set<string>();
      for (const position of startingPositions) {
        expect(layout.grid[position.y][position.x]).toBe(startRoom);
        expect(
          doorCells.some(
            (cell) => cell.x === position.x && cell.y === position.y,
          ),
        ).toBe(false);
        seen.add(`${position.x},${position.y}`);
      }
      expect(seen.size).toBe(startingPositions.length);
    }
  });
});

describe('defineDungeon accepts generated layouts', () => {
  for (const depth of [1, 5, 10]) {
    it(`validates depth ${depth} with default validation`, () => {
      const { layout, startRoom, startingPositions } = generateWithRetry(
        987654321,
        depth,
      );
      const dungeon = defineDungeon({
        name: `test.brogue.d${depth}.name`,
        intro: `test.brogue.d${depth}.intro`,
        winConditions: [{ type: ConditionType.KILL_ALL, fulfilled: false }],
        startingPositions: startingPositions.map((cell) => [cell.x, cell.y]),
        discoveredRooms: [startRoom],
        layout,
      });
      expect(dungeon.layout.doors.length).toBeGreaterThan(0);
    });
  }
});
