import { describe, expect, it, vi } from 'vitest';
import { renderDoors } from './DungeonRendering';
import type { GameState } from '../types';
import { Side } from '../types';

type Rect = { style: string; x: number; y: number; w: number; h: number };

const stateWithDoor = (locked: boolean): GameState =>
  ({
    dungeon: {
      name: 'Door Test',
      intro: 'test',
      discoveredRooms: ['A'],
      layout: {
        grid: ['#####', '#AAAB#', '#AAAB#', '#AAAB#', '#####'],
        doors: [
          {
            x: 3,
            y: 2,
            side: Side.RIGHT,
            open: false,
            locked,
            hidden: false,
            trapped: false,
            trapAttacks: 0,
            reinforced: false,
          },
        ],
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

const renderDoorRects = (state: GameState): Rect[] => {
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
  renderDoors(ctx, {} as CanvasImageSource, 48, state, false);
  return rects;
};

describe('closed door rendering', () => {
  it('draws a thick wooden leaf with a handle when unlocked', () => {
    const rects = renderDoorRects(stateWithDoor(false));

    // The door leaf: vertical strip on the shared edge, thick (8px at 48)
    const leaf = rects.find(
      (r) => r.style === '#8a5a2b' && r.w === 8 && r.h === 48,
    );
    expect(leaf).toBeDefined();
    expect(leaf?.x).toBe(3 * 48 + 48 - 4);

    // Textured with plank seams and shaded edges
    expect(rects.some((r) => r.style === '#6b4220')).toBe(true);
    expect(rects.some((r) => r.style === '#43290f')).toBe(true);

    // Brass ring handle in the middle of the leaf
    const handle = rects.find((r) => r.style === '#d9a83f');
    expect(handle).toBeDefined();
    expect(handle?.x).toBe(3 * 48 + 48 - 2);
    expect(handle?.y).toBe(2 * 48 + 24 - 2);

    // No iron lock colours on an unlocked door
    expect(rects.some((r) => r.style === '#5a5a66')).toBe(false);
  });

  it('draws an iron-bound leaf with a keyhole when locked', () => {
    const rects = renderDoorRects(stateWithDoor(true));

    // Iron leaf instead of wood
    const leaf = rects.find(
      (r) => r.style === '#5a5a66' && r.w === 8 && r.h === 48,
    );
    expect(leaf).toBeDefined();

    // Brass keyhole plate centred on the leaf
    const plate = rects.find((r) => r.style === '#d9a83f' && r.h === 12);
    expect(plate).toBeDefined();
    expect(plate?.y).toBe(2 * 48 + 24 - 6);

    // Dark keyhole: round chamber above a slot
    expect(rects.some((r) => r.style === '#1f1608')).toBe(true);

    // No wood colours on a locked door
    expect(rects.some((r) => r.style === '#8a5a2b')).toBe(false);
  });
});
