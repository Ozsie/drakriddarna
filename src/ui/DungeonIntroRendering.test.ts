/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi } from 'vitest';
import {
  shouldShowDungeonIntro,
  dismissDungeonIntro,
  getDungeonIntroLayout,
  getDungeonIntroHit,
  renderDungeonIntro,
} from './DungeonIntroRendering';
import type { Dungeon, GameState } from '../types';

const createMockCtx = (): CanvasRenderingContext2D => {
  const ctx = {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    rect: vi.fn(),
    fillRect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    clip: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arcTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn((text: string) => ({
      width: text.length * 8,
    })),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
  } as unknown as CanvasRenderingContext2D;
  return ctx;
};

const createMockState = (overrides?: Partial<GameState>): GameState =>
  ({
    turnCount: 0,
    actionLog: [],
    dungeon: {
      name: 'The Icy Caverns',
      level: 1,
      intro:
        'A bitter cold draft chills your spine as you step into the darkness.',
      layout: {
        grid: [],
        doors: [],
        interactables: [],
        secrets: [],
        traps: [],
        notes: [],
      },
    },
    heroes: [],
    ...overrides,
  }) as unknown as GameState;

describe('DungeonIntroRendering', () => {
  describe('shouldShowDungeonIntro', () => {
    it('returns false for null or undefined state', () => {
      expect(shouldShowDungeonIntro(null)).toBe(false);
      expect(shouldShowDungeonIntro(undefined)).toBe(false);
    });

    it('returns false when dismissed is true', () => {
      const state = createMockState();
      expect(shouldShowDungeonIntro(state, true)).toBe(false);
    });

    it('returns false when dungeon or intro is missing or empty', () => {
      expect(
        shouldShowDungeonIntro(createMockState({ dungeon: undefined })),
      ).toBe(false);
      expect(
        shouldShowDungeonIntro(
          createMockState({
            dungeon: {
              name: 'D1',
              level: 1,
              intro: '',
            } as unknown as Dungeon,
          }),
        ),
      ).toBe(false);
      expect(
        shouldShowDungeonIntro(
          createMockState({
            dungeon: {
              name: 'D1',
              level: 1,
              intro: '   ',
            } as unknown as Dungeon,
          }),
        ),
      ).toBe(false);
    });

    it('returns false when turn count > 0', () => {
      const state = createMockState({ turnCount: 1 });
      expect(shouldShowDungeonIntro(state)).toBe(false);
    });

    it('returns true on round 0/first round with valid intro', () => {
      const state = createMockState({ turnCount: 0 });
      expect(shouldShowDungeonIntro(state)).toBe(true);
    });
  });

  describe('dismissDungeonIntro', () => {
    it('returns false when state or intro is missing', () => {
      expect(dismissDungeonIntro(null)).toBe(false);
      expect(dismissDungeonIntro(createMockState({ dungeon: undefined }))).toBe(
        false,
      );
    });

    it('adds log and creates note entry in dungeon layout', () => {
      const state = createMockState();
      const result = dismissDungeonIntro(state);

      expect(result).toBe(true);
      expect(state.actionLog.length).toBeGreaterThan(0);
      expect(state.actionLog[0].key).toBe(
        'A bitter cold draft chills your spine as you step into the darkness.',
      );

      const notes = state.dungeon.layout.notes;
      expect(notes.length).toBe(1);
      expect(notes[0].found).toBe(true);
      expect(notes[0].foundOn).toBe(0);
      expect(notes[0].message).toBe(state.dungeon.intro);
    });

    it('does not duplicate note if already present', () => {
      const state = createMockState();
      state.dungeon.layout.notes = [
        {
          found: true,
          foundOn: 0,
          message: state.dungeon.intro,
          position: { x: 0, y: 0 },
        },
      ];

      dismissDungeonIntro(state);
      expect(state.dungeon.layout.notes.length).toBe(1);
    });
  });

  describe('getDungeonIntroLayout', () => {
    it('returns empty layout when dimensions <= 0 or intro should not show', () => {
      const state = createMockState();
      expect(getDungeonIntroLayout(0, 0, state).hasContent).toBe(false);
      expect(getDungeonIntroLayout(800, 600, null).hasContent).toBe(false);
      expect(
        getDungeonIntroLayout(800, 600, state, { dismissed: true }).hasContent,
      ).toBe(false);
    });

    it('calculates centered layout with wrapped text and close button', () => {
      const state = createMockState();
      const layout = getDungeonIntroLayout(800, 600, state);

      expect(layout.hasContent).toBe(true);
      expect(layout.backdropBounds).toEqual({
        x: 0,
        y: 0,
        width: 800,
        height: 600,
      });

      expect(layout.panelBounds.width).toBeLessThanOrEqual(480);
      expect(layout.panelBounds.width).toBeGreaterThan(200);
      expect(layout.panelBounds.x).toBeGreaterThan(0);
      expect(layout.panelBounds.y).toBeGreaterThan(0);

      expect(layout.titleText).toBe('The Icy Caverns');
      expect(layout.introLines.length).toBeGreaterThan(0);
      expect(layout.closeButtonBounds.width).toBeGreaterThan(0);
      expect(layout.closeButtonBounds.height).toBe(32);
    });
  });

  describe('getDungeonIntroHit', () => {
    it('returns null when intro is not shown', () => {
      const state = createMockState({ turnCount: 5 });
      expect(getDungeonIntroHit(800, 600, state, 400, 300)).toBeNull();
    });

    it('returns close hit when clicking close button', () => {
      const state = createMockState();
      const layout = getDungeonIntroLayout(800, 600, state);
      const btn = layout.closeButtonBounds;
      const hit = getDungeonIntroHit(
        800,
        600,
        state,
        btn.x + btn.width / 2,
        btn.y + btn.height / 2,
      );
      expect(hit).toEqual({ type: 'close' });
    });

    it('returns panel hit when clicking inside panel outside close button', () => {
      const state = createMockState();
      const layout = getDungeonIntroLayout(800, 600, state);
      const panel = layout.panelBounds;
      const hit = getDungeonIntroHit(
        800,
        600,
        state,
        panel.x + 20,
        panel.y + 20,
      );
      expect(hit).toEqual({ type: 'panel' });
    });

    it('returns backdrop hit when clicking outside panel', () => {
      const state = createMockState();
      const hit = getDungeonIntroHit(800, 600, state, 10, 10);
      expect(hit).toEqual({ type: 'backdrop' });
    });
  });

  describe('renderDungeonIntro', () => {
    it('renders dialog elements onto canvas', () => {
      const ctx = createMockCtx();
      const state = createMockState();

      renderDungeonIntro(ctx, 800, 600, state, { isCloseHovered: false });

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 800, 600);
      expect(ctx.fillText).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('renders hover state for close button', () => {
      const ctx = createMockCtx();
      const state = createMockState();

      renderDungeonIntro(ctx, 800, 600, state, { isCloseHovered: true });

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('does nothing when shouldShowDungeonIntro is false', () => {
      const ctx = createMockCtx();
      const state = createMockState({ turnCount: 2 });

      renderDungeonIntro(ctx, 800, 600, state);

      expect(ctx.save).not.toHaveBeenCalled();
      expect(ctx.fillRect).not.toHaveBeenCalled();
    });
  });
});
