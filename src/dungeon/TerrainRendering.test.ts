/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi } from 'vitest';
import type { GameState, TerrainCell } from '../types';
import { TerrainType } from '../types';
import {
  hasAnimatedTerrainEffects,
  renderTerrainAnimation,
  renderRoomFog,
  renderFogLightDim,
} from './DungeonRendering';

const makeState = (
  terrain: TerrainCell[],
  roomFog?: Record<string, Record<string, number | boolean | string>>,
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
    rect: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    filter: 'none',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
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
  it('fills the fogged room as one whole-room shape', () => {
    const ctx = createMockCtx();
    renderRoomFog(ctx, 48, makeState([], { A: { opacity: 0.4 } }), false, 1000);
    // Every discovered cell of the 3x2 'A' grid is traced, then filled as
    // a single batch so the blur softens only the room's boundary.
    expect(ctx.rect).toHaveBeenCalledTimes(6);
    expect(ctx.fill).toHaveBeenCalledTimes(1);
  });

  it('blurs the cloud edges by the configured softness', () => {
    const ctx = createMockCtx();
    renderRoomFog(
      ctx,
      48,
      makeState([], { A: { opacity: 0.4, softness: 0.8 } }),
      false,
      1000,
    );
    expect(ctx.filter).toContain('blur');
  });

  it('keeps hard cell edges with softness 0', () => {
    const ctx = createMockCtx();
    renderRoomFog(
      ctx,
      48,
      makeState([], { A: { opacity: 0.4, softness: 0 } }),
      false,
      1000,
    );
    expect(ctx.filter).toBe('none');
    expect(ctx.fill).toHaveBeenCalledTimes(1);
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
    expect(ctx.rect).toHaveBeenCalledTimes(1);
  });

  it('draws nothing without fog', () => {
    const ctx = createMockCtx();
    renderRoomFog(ctx, 48, makeState([]), false, 1000);
    expect(ctx.fill).not.toHaveBeenCalled();
  });
});

describe('renderFogLightDim', () => {
  it('dims the light mask inside the fogged room', () => {
    const ctx = createMockCtx();
    renderFogLightDim(
      ctx,
      48,
      makeState([], { A: { density: 0.6, softness: 0 } }),
      false,
    );
    // The dimming ran once for the room, wrapped in save/restore so the
    // erase and blur settings never leak to other draws.
    expect(ctx.fill).toHaveBeenCalledTimes(1);
    expect(ctx.save).toHaveBeenCalledTimes(1);
    expect(ctx.restore).toHaveBeenCalledTimes(1);
  });

  it('applies the default density to fog that configures none', () => {
    const ctx = createMockCtx();
    renderFogLightDim(ctx, 48, makeState([], { A: { softness: 0 } }), false);
    expect(ctx.fill).toHaveBeenCalledTimes(1);
  });

  it('skips fog configured without light absorption', () => {
    const ctx = createMockCtx();
    renderFogLightDim(
      ctx,
      48,
      makeState([], { A: { density: 0, softness: 0 } }),
      false,
    );
    expect(ctx.fill).not.toHaveBeenCalled();
  });

  it('skips fog that blocks light, which the ray cast handles instead', () => {
    const ctx = createMockCtx();
    renderFogLightDim(
      ctx,
      48,
      makeState([], { A: { blocksLight: true, density: 0.9 } }),
      false,
    );
    expect(ctx.fill).not.toHaveBeenCalled();
  });
});
