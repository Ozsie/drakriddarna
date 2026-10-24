import { describe, expect, it, vi } from 'vitest';
import { renderGrid, renderDoors, sealedCornerGrid } from './DungeonRendering';
import { autoDetectCorners } from './cornerDetection';
import type { Dungeon, GameState } from '../types';
import { SEALED_DOOR } from '../core';
import { CornerType } from '../types';
import { e1m0 } from '../campaigns/iceDragonTreasure/dungeons/e1m0';
import { e1m1 } from '../campaigns/iceDragonTreasure/dungeons/e1m1';

const stateFor = (
  discoveredRooms: string[],
  dungeon: Dungeon = e1m0,
): GameState => {
  const state = {
    dungeon: JSON.parse(JSON.stringify(dungeon)) as Dungeon,
    heroes: [],
    currentActor: undefined,
    actionLog: [],
    itemDeck: [],
    magicItemDeck: [],
    settings: { cellSize: 48 },
    eventDeck: [],
    reRender: false,
    drawEvents: true,
  } as unknown as GameState;
  state.dungeon.discoveredRooms = discoveredRooms;
  return state;
};

// Renders the static layers with a recording mock context and returns the
// final tile painted on each cell (the tile source coords divided by 48).
const renderTiles = (state: GameState): Map<string, string> => {
  const paints = new Map<string, string>();
  const ctx = {
    drawImage: (
      _img: unknown,
      sx: number,
      sy: number,
      _sw: number,
      _sh: number,
      dx: number,
      dy: number,
      w: number,
      h: number,
    ) => {
      paints.set(`${dx / w},${dy / h}`, `${sx / 48},${sy / 48}`);
    },
    fillRect: vi.fn(),
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
  const ground = {} as CanvasImageSource;
  renderGrid(ctx, ground, 48, state, false);
  renderDoors(ctx, ground, 48, state, false);
  return paints;
};

// e1m0 corridor D runs east (cells (4,9)-(6,9)) and ends at the door to room
// B between (6,9) and (7,9); room A's door to D sits mid-wall in the wall
// column x=4 between (3,9) and (4,9).
describe('sealed door corner classification', () => {
  it('seals a corridor-end doorway with hidden floor flanks', () => {
    const grid = sealedCornerGrid(stateFor(['A', 'D']));

    expect(grid[8][7]).toBe(SEALED_DOOR);
    expect(grid[9][7]).toBe(SEALED_DOOR);
    expect(grid[10][7]).toBe(SEALED_DOOR);
    // The opened A to D door is discovered on both sides: no sealing there
    expect(grid[9][4]).toBe('D');
  });

  it('seals a mid-wall door without disturbing its flat wall', () => {
    const state = stateFor(['A']);
    const grid = sealedCornerGrid(state);

    // The A to D door is set in the wall column x=4: the far cell is sealed
    expect(grid[9][4]).toBe(SEALED_DOOR);

    // No corners on the door flanks while D is undiscovered: the column
    // renders flat around the painted door piece
    const corners = autoDetectCorners(grid, state.dungeon.discoveredRooms);
    expect(
      corners.find((c) => c.position.x === 4 && c.position.y === 8),
    ).toBeUndefined();
    expect(
      corners.find((c) => c.position.x === 4 && c.position.y === 10),
    ).toBeUndefined();
  });

  it('caps the corner cells beside a sealed door in a solid wall', () => {
    // Room B discovered, corridor E beyond the door at (7,7) not: the corner
    // cell (6,6) between B's west wall and the door needs the sealed door
    // cell to confirm its closed east side
    const state = stateFor(['A', 'B', 'D']);
    const grid = sealedCornerGrid(state);
    expect(grid[6][7]).toBe(SEALED_DOOR);

    const corners = autoDetectCorners(grid, state.dungeon.discoveredRooms);
    expect(corners).toContainEqual({
      position: { x: 6, y: 6 },
      type: CornerType.INNER_TOP_LEFT,
    });
    // The mirrored corner on the other side of room B's north wall
    expect(corners).toContainEqual({
      position: { x: 9, y: 6 },
      type: CornerType.INNER_TOP_RIGHT,
    });
  });

  it('caps the sealed corridor end with corner pieces', () => {
    const state = stateFor(['A', 'D']);
    const corners = autoDetectCorners(
      sealedCornerGrid(state),
      state.dungeon.discoveredRooms,
    );

    expect(corners).toContainEqual({
      position: { x: 7, y: 8 },
      type: CornerType.INNER_TOP_RIGHT,
    });
    expect(corners).toContainEqual({
      position: { x: 7, y: 10 },
      type: CornerType.INNER_BOTTOM_RIGHT,
    });
  });

  it('keeps the corridor walls straight before the sealed corner caps', () => {
    const state = stateFor(['A', 'D']);
    const corners = autoDetectCorners(
      sealedCornerGrid(state),
      state.dungeon.discoveredRooms,
    );

    // The walls at (6,8) and (6,10) border the wall column at x=6 going
    // north/south, but that rock is invisible (no discovered floor borders
    // it), so no T-junction may be asserted over the fog there
    expect(
      corners.find((c) => c.position.x === 6 && c.position.y === 8),
    ).toBeUndefined();
    expect(
      corners.find((c) => c.position.x === 6 && c.position.y === 10),
    ).toBeUndefined();
  });

  it('gives the opened doorway jamb corners once discovered', () => {
    const state = stateFor(['A', 'B', 'C', 'D', 'E']);
    const corners = autoDetectCorners(
      sealedCornerGrid(state),
      state.dungeon.discoveredRooms,
    );

    expect(corners).toContainEqual({
      position: { x: 6, y: 8 },
      type: CornerType.OUTER_BOTTOM_RIGHT,
    });
    expect(corners).toContainEqual({
      position: { x: 6, y: 10 },
      type: CornerType.OUTER_TOP_RIGHT,
    });
  });

  it('does not let the hidden door paint overwrite the corner cap beside it', () => {
    // e1m1 room C with the unfound hidden door to corridor D at (10,4):
    // the cell (11,3) is the concave cap of C's north-east corner. The
    // hidden door paint covers the doorway (9,3)-(11,3) with plain wall
    // pieces, but must leave the corner cap at (11,3) alone.
    const state = stateFor(['A', 'B', 'C'], e1m1);
    const corners = autoDetectCorners(
      sealedCornerGrid(state),
      state.dungeon.discoveredRooms,
    );
    expect(corners).toContainEqual({
      position: { x: 11, y: 3 },
      type: CornerType.INNER_TOP_RIGHT,
    });

    const paints = renderTiles(state);
    // The corner cap tile survives the door painting
    expect(paints.get('11,3')).toBe('4,4');
    // The rest of the sealed doorway renders as plain wall pieces
    expect(paints.get('9,3')).toBe('2,4');
    expect(paints.get('10,3')).toBe('2,4');
  });

  it('renders the flanks of a found but still closed hidden door as wall', () => {
    // Once the hidden door is found it paints only its own far cell (with
    // the door frame art); the sealed flanks must render as ordinary wall
    // pieces instead of holes
    const state = stateFor(['A', 'B', 'C'], e1m1);
    state.dungeon.layout.doors.forEach((door) => {
      if (door.x === 10 && door.y === 4) door.hidden = false;
    });

    const paints = renderTiles(state);
    expect(paints.get('9,3')).toBe('2,4');
    // The door frame piece marks the found door in the sealed wall
    expect(paints.get('10,3')).toBe('13,1');
    expect(paints.get('11,3')).toBe('4,4');
  });

  it('renders the thick wall between corridors F and H as plain wall', () => {
    // Corridors F (y=6) and H (y=9) are separated by a two-row wall block
    // (x11-13). Each row must render as plain wall pieces with corner caps at
    // the block ends — the middle cells may not classify as junctions, which
    // have no tile art.
    const state = stateFor(['A', 'B', 'C', 'F', 'G', 'H'], e1m1);
    const corners = autoDetectCorners(
      sealedCornerGrid(state),
      state.dungeon.discoveredRooms,
    );
    expect(
      corners.find((c) => c.position.x === 12 && c.position.y === 7),
    ).toBeUndefined();
    expect(
      corners.find((c) => c.position.x === 12 && c.position.y === 8),
    ).toBeUndefined();

    const paints = renderTiles(state);
    // The block's middle cells render as plain wall pieces
    expect(paints.get('12,7')).toBe('1,0');
    expect(paints.get('12,8')).toBe('2,4');
    // No artless default junction tiles around the corridors
    expect([...paints.values()]).not.toContain('15,0');
  });

  it('caps the corner beside the sealed door to room I', () => {
    // With room I undiscovered, the cell (14,8) north of the sealed H to I
    // doorway sits between G's floor and the door. The sealed door cell is a
    // doorway, not rock, so it may not form a junction stem; the cell renders
    // as the corner cap of H's north-east instead.
    const state = stateFor(['A', 'B', 'C', 'F', 'G', 'H'], e1m1);
    const corners = autoDetectCorners(
      sealedCornerGrid(state),
      state.dungeon.discoveredRooms,
    );
    expect(corners).toContainEqual({
      position: { x: 14, y: 8 },
      type: CornerType.INNER_TOP_RIGHT,
    });

    const paints = renderTiles(state);
    expect(paints.get('14,8')).toBe('4,4');
  });

  it('caps the south-east cell of the thick wall block as room G corner', () => {
    // The cell (13,8) is the bottom-left corner cap of room G: G's floor at
    // (14,7) wraps the thick block between corridors F and H. Its north
    // neighbour (13,7) belongs to the block's own wall row, so the cell is
    // not a free-standing junction stem — it renders as the inner corner cap.
    const state = stateFor(['A', 'B', 'C', 'F', 'G', 'H'], e1m1);
    const corners = autoDetectCorners(
      sealedCornerGrid(state),
      state.dungeon.discoveredRooms,
    );
    expect(corners).toContainEqual({
      position: { x: 13, y: 8 },
      type: CornerType.INNER_BOTTOM_LEFT,
    });

    const paints = renderTiles(state);
    expect(paints.get('13,8')).toBe('0,6');
  });
});
