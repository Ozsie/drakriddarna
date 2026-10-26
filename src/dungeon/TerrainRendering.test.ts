/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi } from 'vitest';
import type { GameState, TerrainCell } from '../types';
import { TerrainType } from '../types';
import {
  hasAnimatedTerrainEffects,
  renderTerrainAnimation,
  renderRoomFog,
} from './DungeonRendering';

const makeState = (
  terrain: TerrainCell[],
  roomFog?: Record<string, { opacity?: number }>,
  grid: string[] = ['AAA', 'AAA'],
  discoveredRooms: string[] = ['A'],
): GameState =>
  ({
    dungeon: {
      layout: {
        grid,
        terrain,
        roomFog,
      },
      discoveredRooms,
    },
  }) as unknown as GameState;

const createMockCtx = () =>
  ({
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
  }) as unknown as CanvasRenderingContext2D;

const waterCell = (x: number, y: number): TerrainCell => ({
  position: { x, y },
  type: TerrainType.WATER,
});

const lavaCell = (x: number, y: number): TerrainCell => ({
  position: { x, y },
  type: TerrainType.LAVA,
});

describe('renderTerrainAnimation', () => {
  it('draws the water shimmer with wave strokes', () => {
    const ctx = createMockCtx();
    renderTerrainAnimation(ctx, 48, makeState([waterCell(0, 0)]), false, 1000);
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('draws the lava pulse with a fill and drifting hotspots', () => {
    const ctx = createMockCtx();
    renderTerrainAnimation(ctx, 48, makeState([lavaCell(0, 0)]), false, 1000);
    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.arc).toHaveBeenCalled();
  });

  it('skips cells outside the viewport', () => {
    const ctx = createMockCtx();
    renderTerrainAnimation(ctx, 48, makeState([waterCell(5, 5)]), false, 1000, {
      x: 0,
      y: 0,
      width: 2,
      height: 2,
    });
    expect(ctx.stroke).not.toHaveBeenCalled();
  });

  it('does not animate unknown terrain types', () => {
    const ctx = createMockCtx();
    renderTerrainAnimation(
      ctx,
      48,
      makeState([{ position: { x: 0, y: 0 }, type: 'mud' }]),
      false,
      1000,
    );
    expect(ctx.stroke).not.toHaveBeenCalled();
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });
});

describe('hasAnimatedTerrainEffects', () => {
  it('is true for visible water or lava', () => {
    expect(hasAnimatedTerrainEffects(makeState([waterCell(0, 0)]), false)).toBe(
      true,
    );
    expect(hasAnimatedTerrainEffects(makeState([lavaCell(0, 0)]), false)).toBe(
      true,
    );
  });

  it('is false without animated terrain or fog', () => {
    expect(hasAnimatedTerrainEffects(makeState([]), false)).toBe(false);
    expect(
      hasAnimatedTerrainEffects(
        makeState([{ position: { x: 0, y: 0 }, type: 'mud' }]),
        false,
      ),
    ).toBe(false);
  });

  it('is false when the animated terrain is outside the viewport', () => {
    expect(
      hasAnimatedTerrainEffects(makeState([waterCell(9, 9)]), false, {
        x: 0,
        y: 0,
        width: 2,
        height: 2,
      }),
    ).toBe(false);
  });

  it('is true when a fogged room has discovered cells', () => {
    expect(
      hasAnimatedTerrainEffects(makeState([], { A: { opacity: 0.4 } }), false),
    ).toBe(true);
  });

  it('is false when the fogged room has not been discovered', () => {
    const state = makeState([], { B: { opacity: 0.4 } }, ['AAA', 'ABB'], ['A']);
    expect(hasAnimatedTerrainEffects(state, false)).toBe(false);
    expect(hasAnimatedTerrainEffects(state, true)).toBe(true);
  });
});

describe('renderRoomFog', () => {
  it('fills every discovered cell of the fogged room', () => {
    const ctx = createMockCtx();
    renderRoomFog(ctx, 48, makeState([], { A: { opacity: 0.4 } }), false, 1000);
    // Every cell of the 3x2 'A' grid is discovered and fogged.
    expect(ctx.fillRect).toHaveBeenCalledTimes(6);
  });

  it('skips cells outside the viewport', () => {
    const ctx = createMockCtx();
    renderRoomFog(
      ctx,
      48,
      makeState([], { A: { opacity: 0.4 } }),
      false,
      1000,
      {
        x: 0,
        y: 0,
        width: 1,
        height: 1,
      },
    );
    expect(ctx.fillRect).toHaveBeenCalledTimes(1);
  });

  it('draws nothing without fog', () => {
    const ctx = createMockCtx();
    renderRoomFog(ctx, 48, makeState([]), false, 1000);
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });
});
