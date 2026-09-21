/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi } from 'vitest';
import {
  renderDamageIndicators,
  DAMAGE_INDICATOR_DURATION_MS,
} from './DamageIndicatorRendering';
import type { GameState } from '../types';

const createMockCtx = () =>
  ({
    save: vi.fn(),
    restore: vi.fn(),
    strokeText: vi.fn(),
    fillText: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
  }) as unknown as CanvasRenderingContext2D;

const createMockState = (
  damageIndicators?: GameState['damageIndicators'],
): GameState => ({
  dungeon: {
    name: 'Test Dungeon',
    discoveredRooms: ['A'],
    layout: {
      grid: ['AAA'],
      doors: [],
      secrets: [],
      monsters: [],
      notes: [],
      items: [],
      corridors: [],
      corners: [],
      pillars: [],
    },
    startingPositions: [{ x: 0, y: 0 }],
    winConditions: [],
    beaten: false,
    killCount: 0,
  },
  heroes: [],
  actionLog: [],
  itemDeck: [],
  magicItemDeck: [],
  settings: { cellSize: 48 },
  eventDeck: [],
  reRender: false,
  damageIndicators,
});

describe('DamageIndicatorRendering', () => {
  it('returns false when no indicators exist', () => {
    const ctx = createMockCtx();
    const state = createMockState();
    const hasActive = renderDamageIndicators(ctx, 48, state, Date.now());
    expect(hasActive).toBe(false);
    expect(ctx.fillText).not.toHaveBeenCalled();
  });

  it('renders active indicator with text outline and fill', () => {
    const ctx = createMockCtx();
    const now = 1000000;
    const state = createMockState([
      {
        id: '1',
        damage: 5,
        position: { x: 2, y: 3 },
        timestamp: now - 200,
      },
    ]);

    const hasActive = renderDamageIndicators(ctx, 48, state, now);
    expect(hasActive).toBe(true);
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.strokeText).toHaveBeenCalledWith(
      '5',
      2 * 48 + 24,
      expect.any(Number),
    );
    expect(ctx.fillText).toHaveBeenCalledWith(
      '5',
      2 * 48 + 24,
      expect.any(Number),
    );
    expect(ctx.restore).toHaveBeenCalled();
  });

  it('ignores expired indicators past duration', () => {
    const ctx = createMockCtx();
    const now = 1000000;
    const state = createMockState([
      {
        id: '1',
        damage: 5,
        position: { x: 2, y: 3 },
        timestamp: now - DAMAGE_INDICATOR_DURATION_MS - 50,
      },
    ]);

    const hasActive = renderDamageIndicators(ctx, 48, state, now);
    expect(hasActive).toBe(false);
    expect(ctx.fillText).not.toHaveBeenCalled();
  });
});
