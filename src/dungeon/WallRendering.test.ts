import { describe, expect, it, vi } from 'vitest';
import { renderWalls, DEFAULT_WALL_COLOUR } from './DungeonRendering';
import type { GameState, WallEdge } from '../types';
import { Side } from '../types';

type Rect = { style: string; x: number; y: number; w: number; h: number };

const stateWithWalls = (
  walls: WallEdge[],
  doors: GameState['dungeon']['layout']['doors'] = [],
  discoveredRooms = ['A'],
  wallColour?: string,
): GameState =>
  ({
    dungeon: {
      name: 'Wall Test',
      intro: 'test',
      discoveredRooms,
      layout: {
        grid: ['#####', '#AAB#', '#AAB#', '#####'],
        doors,
        walls,
        ...(wallColour ? { wallColour } : {}),
        monsters: [],
        secrets: [],
        notes: [],
        items: [],
        corridors: [],
        corners: [],
      },
      startingPositions: [{ x: 1, y: 1 }],
      winConditions: [],
      beaten: false,
      killCount: 0,
    },
    heroes: [],
    currentActor: undefined,
    actionLog: [],
    itemDeck: [],
    magicItemDeck: [],
    settings: { cellSize: 48 },
    eventDeck: [],
    reRender: false,
    drawEvents: true,
  }) as unknown as GameState;

const renderWallRects = (state: GameState, debugMode = false): Rect[] => {
  const rects: Rect[] = [];
  const ctx = {
    fillStyle: '',
    fillRect: (x: number, y: number, w: number, h: number) => {
      rects.push({ style: String(ctx.fillStyle), x, y, w, h });
    },
    drawImage: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    rect: vi.fn(),
    roundRect: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 50 }),
    save: vi.fn(),
    restore: vi.fn(),
    setTransform: vi.fn(),
    scale: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
  renderWalls(ctx, 48, state, debugMode);
  return rects;
};

describe('edge wall rendering', () => {
  it('draws a grey strip on the shared edge when a side is discovered', () => {
    const rects = renderWallRects(
      stateWithWalls([{ x: 2, y: 1, side: Side.RIGHT }]),
    );

    // Wall between (2, 1) 'A' and (3, 1) 'B': vertical strip on the boundary
    const strip = rects.find(
      (r) => r.style === DEFAULT_WALL_COLOUR && r.w === 8 && r.h === 48,
    );
    expect(strip).toBeDefined();
    expect(strip?.x).toBe(2 * 48 + 48 - 4);
    expect(strip?.y).toBe(48);

    // Shaded long edges alongside the strip
    expect(
      rects.some(
        (r) =>
          r.style === '#4a4741' &&
          r.x === strip?.x &&
          r.y === strip?.y &&
          r.w === 1,
      ),
    ).toBe(true);
  });

  it('draws a horizontal wall strip on a down edge', () => {
    const rects = renderWallRects(
      stateWithWalls([{ x: 1, y: 1, side: Side.DOWN }]),
    );

    const strip = rects.find(
      (r) => r.style === DEFAULT_WALL_COLOUR && r.w === 48 && r.h === 8,
    );
    expect(strip).toBeDefined();
    expect(strip?.x).toBe(48);
    expect(strip?.y).toBe(48 + 48 - 4);
  });

  it('hides the wall while both sides are undiscovered', () => {
    // Wall between 'B' and beyond, with only 'A' discovered
    const rects = renderWallRects(
      stateWithWalls([{ x: 3, y: 1, side: Side.RIGHT }]),
    );

    expect(rects.some((r) => r.style === DEFAULT_WALL_COLOUR)).toBe(false);
  });

  it('draws undiscovered walls in debug mode', () => {
    const rects = renderWallRects(
      stateWithWalls([{ x: 3, y: 1, side: Side.RIGHT }]),
      true,
    );

    expect(rects.some((r) => r.style === DEFAULT_WALL_COLOUR)).toBe(true);
  });

  it('still draws the wall when a door shares its edge (validation disabled)', () => {
    // The validator rejects a door on the same edge as a wall; if one is
    // present anyway, the wall paints so the render stays consistent with
    // the movement rules — the door leaf draws on top of it afterwards.
    const makeStateWithDoor = (open: boolean, hidden = false) =>
      stateWithWalls(
        [{ x: 2, y: 1, side: Side.RIGHT }],
        [
          {
            x: 2,
            y: 1,
            side: Side.RIGHT,
            open,
            locked: false,
            hidden,
            trapped: false,
            trapAttacks: 0,
            reinforced: false,
          },
        ],
      );

    for (const state of [
      makeStateWithDoor(true),
      makeStateWithDoor(false),
      makeStateWithDoor(false, true),
    ]) {
      const rects = renderWallRects(state);
      expect(rects.some((r) => r.style === DEFAULT_WALL_COLOUR)).toBe(true);
    }
  });

  it('uses the wall colour override from the wall and from the layout', () => {
    const fromWall = renderWallRects(
      stateWithWalls([{ x: 2, y: 1, side: Side.RIGHT, colour: '#123456' }]),
    );
    expect(fromWall.some((r) => r.style === '#123456')).toBe(true);

    const fromLayout = renderWallRects(
      stateWithWalls([{ x: 2, y: 1, side: Side.RIGHT }], [], ['A'], '#654321'),
    );
    expect(fromLayout.some((r) => r.style === '#654321')).toBe(true);
  });
});
