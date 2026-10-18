import { describe, it, expect, vi } from 'vitest';
import {
  getBetweenDungeonsLayout,
  getBetweenDungeonsHit,
  renderBetweenDungeons,
} from './BetweenDungeonsRendering';
import { openBetweenDungeons, setBetweenDungeonsStep } from '../dungeon/BetweenDungeonsLogic';
import { init } from '../game';

const createMockCtx = () => {
  const ctx = {
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    textAlign: 'left',
    textBaseline: 'alphabetic',
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    fillRect: vi.fn(),
    arc: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 8 })),
  } as unknown as CanvasRenderingContext2D;
  return ctx;
};

describe('BetweenDungeonsRendering', () => {
  it('returns empty layout if betweenDungeons is not present', () => {
    const state = init();
    state.betweenDungeons = undefined;
    const layout = getBetweenDungeonsLayout(800, 600, state);
    expect(layout.hasContent).toBe(false);
  });

  it('computes levelUp layout when step is levelUp', () => {
    const state = init();
    openBetweenDungeons(state);

    const layout = getBetweenDungeonsLayout(800, 600, state);
    expect(layout.hasContent).toBe(true);
    expect(layout.step).toBe('levelUp');
    expect(layout.heroes.length).toBeGreaterThan(0);
    expect(layout.actionButtonLabel).toBeDefined();
    expect(layout.secondaryButtonBounds).toBeUndefined();
  });

  it('computes trade layout when step is trade', () => {
    const state = init();
    openBetweenDungeons(state);
    setBetweenDungeonsStep(state, 'trade');

    const layout = getBetweenDungeonsLayout(800, 600, state);
    expect(layout.hasContent).toBe(true);
    expect(layout.step).toBe('trade');
    expect(layout.heroes.length).toBeGreaterThan(0);
    expect(layout.actionButtonLabel).toBeDefined();
    expect(layout.secondaryButtonBounds).toBeDefined();
  });

  it('handles hit testing on action and secondary buttons', () => {
    const state = init();
    openBetweenDungeons(state);
    setBetweenDungeonsStep(state, 'trade');

    const layout = getBetweenDungeonsLayout(800, 600, state);
    const actionHit = getBetweenDungeonsHit(
      800,
      600,
      state,
      layout.actionButtonBounds.x + 10,
      layout.actionButtonBounds.y + 10,
    );
    expect(actionHit?.type).toBe('actionButton');

    if (layout.secondaryButtonBounds) {
      const secHit = getBetweenDungeonsHit(
        800,
        600,
        state,
        layout.secondaryButtonBounds.x + 10,
        layout.secondaryButtonBounds.y + 10,
      );
      expect(secHit?.type).toBe('secondaryButton');
    }
  });

  it('renders between dungeons without crashing', () => {
    const state = init();
    openBetweenDungeons(state);

    const ctx = createMockCtx();

    expect(() => {
      renderBetweenDungeons(ctx, 800, 600, state);
    }).not.toThrow();

    setBetweenDungeonsStep(state, 'trade');
    expect(() => {
      renderBetweenDungeons(ctx, 800, 600, state);
    }).not.toThrow();
  });
});
