/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi } from 'vitest';
import {
  renderDamageIndicators,
  renderFloatingIndicators,
  DAMAGE_INDICATOR_DURATION_MS,
  EFFECT_TRANSFORMS,
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
    globalAlpha: 1,
    fillStyle: '',
    strokeStyle: '',
    font: '',
    lineWidth: 1,
    lineJoin: '',
    textAlign: '',
    textBaseline: '',
  }) as unknown as CanvasRenderingContext2D;

const createMockState = (
  damageIndicators?: GameState['damageIndicators'],
): GameState => ({
  dungeon: {
    name: 'Test Dungeon',
    intro: 'test-dungeon',
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
      pits: [],
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
  drawEvents: true,
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

  it('renders custom text, custom color, custom offset, and font scale', () => {
    const ctx = createMockCtx();
    const now = 1000000;
    const state = createMockState([
      {
        id: '1',
        text: 'POISON',
        color: '#9933ff',
        fontSizeScale: 1.5,
        offset: { x: 5, y: -10 },
        position: { x: 1, y: 2 },
        timestamp: now - 100,
      },
    ]);

    const hasActive = renderFloatingIndicators(ctx, 48, state, now);
    expect(hasActive).toBe(true);
    expect(ctx.fillStyle).toBe('#9933ff');
    expect(ctx.fillText).toHaveBeenCalledWith(
      'POISON',
      1 * 48 + 24 + 5,
      expect.any(Number),
    );
  });

  it('supports static effect for standing in a cell without movement or fade', () => {
    const ctx = createMockCtx();
    const now = 1000000;
    const state = createMockState([
      {
        id: 'static-1',
        text: 'ALTAR',
        color: '#ffff00',
        effect: 'static',
        position: { x: 3, y: 4 },
        timestamp: now - 500,
        durationMs: 2000,
      },
    ]);

    const hasActive = renderDamageIndicators(ctx, 48, state, now);
    expect(hasActive).toBe(true);
    expect(ctx.globalAlpha).toBe(1);
    expect(ctx.fillText).toHaveBeenCalledWith(
      'ALTAR',
      3 * 48 + 24,
      4 * 48, // yOffset = 0 for static
    );
  });

  it('supports infinite duration indicators', () => {
    const ctx = createMockCtx();
    const now = 1000000;
    const state = createMockState([
      {
        id: 'inf-1',
        text: 'TRAP',
        effect: 'static',
        position: { x: 0, y: 0 },
        timestamp: now - 999999,
        durationMs: Infinity,
      },
    ]);

    const hasActive = renderDamageIndicators(ctx, 48, state, now);
    expect(hasActive).toBe(true);
    expect(ctx.fillText).toHaveBeenCalledWith('TRAP', 24, 0);
  });

  it('computes correct effect transforms for all effect types', () => {
    const floatRes = EFFECT_TRANSFORMS.float(0.5, 48);
    expect(floatRes.yOffset).toBeLessThan(0);
    expect(floatRes.alpha).toBe(1);

    const bounceRes = EFFECT_TRANSFORMS.bounce(0.5, 48);
    expect(bounceRes.yOffset).toBeDefined();

    const critRes = EFFECT_TRANSFORMS.crit(0.1, 48);
    expect(critRes.scale).toBeGreaterThan(1);

    const fadeRes = EFFECT_TRANSFORMS.fade(0.5, 48);
    expect(fadeRes.alpha).toBe(0.5);
    expect(fadeRes.yOffset).toBe(0);

    const staticRes = EFFECT_TRANSFORMS.static(0.5, 48);
    expect(staticRes.alpha).toBe(1);
    expect(staticRes.xOffset).toBe(0);
    expect(staticRes.yOffset).toBe(0);
    expect(staticRes.scale).toBe(1);
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
