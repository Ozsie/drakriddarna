/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi } from 'vitest';
import {
  formatEventTitle,
  formatEventDescription,
  getEventCardLayout,
  getEventCardHit,
  renderEventCard,
} from './EventCardRendering';
import type { GameState, TurnEvent } from '../types';

const createMockCtx = (): CanvasRenderingContext2D => {
  const ctx = {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    rect: vi.fn(),
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
    turnCount: 5,
    eventDeck: [
      {
        id: 'event-1',
        number: 1,
        name: 'The Hungry Troll',
        description: 'You hear a roar echoing through the halls.',
        used: true,
      },
      {
        id: 'event-2',
        number: 2,
        name: 'The Sun Stone',
        description: 'You find a crystal radiating warm light.',
        used: false,
      },
      {
        id: 'event-3',
        number: 3,
        name: 'The Time Portal',
        description: 'Everything slows down.',
        used: false,
      },
    ] as TurnEvent[],
    currentEvent: {
      id: 'event-2',
      number: 2,
      name: 'The Sun Stone',
      description: 'You find a crystal radiating warm light.',
      used: false,
    } as TurnEvent,
    heroes: [],
    dungeon: {
      name: 'Test Dungeon',
      level: 1,
    },
    ...overrides,
  }) as unknown as GameState;

describe('EventCardRendering', () => {
  describe('formatting functions', () => {
    it('formats event title with number and name', () => {
      const event: TurnEvent = {
        id: 'test-1',
        number: 7,
        name: 'Magic Wave',
        description: 'A magical wave passes by.',
        effect: 'magicWave',
        used: false,
      };
      expect(formatEventTitle(event)).toBe('7. Magic Wave');
    });

    it('formats event description', () => {
      const event: TurnEvent = {
        id: 'test-1',
        number: 7,
        name: 'Magic Wave',
        description: 'A magical wave passes by.',
        effect: 'magicWave',
        used: false,
      };
      expect(formatEventDescription(event)).toBe('A magical wave passes by.');
    });
  });

  describe('getEventCardLayout', () => {
    it('returns empty layout when state is null or dimensions <= 0', () => {
      expect(getEventCardLayout(0, 0, null).hasContent).toBe(false);
      expect(getEventCardLayout(800, 600, null).hasContent).toBe(false);
    });

    it('returns empty layout when event deck is empty and no active event', () => {
      const emptyState = createMockState({
        eventDeck: [],
        currentEvent: undefined,
      });
      const layout = getEventCardLayout(800, 600, emptyState);
      expect(layout.hasContent).toBe(false);
    });

    it('calculates counts correctly for remaining, total, and drawn events', () => {
      const state = createMockState();
      const layout = getEventCardLayout(800, 600, state);
      expect(layout.hasContent).toBe(true);
      expect(layout.deckSummary.total).toBe(3);
      expect(layout.deckSummary.remaining).toBe(2);
      expect(layout.deckSummary.drawn).toBe(1);
      expect(layout.headerText).toBe('🎴 Events (2/3)');
    });

    it('creates active event layout when activeEvent is present', () => {
      const state = createMockState();
      const layout = getEventCardLayout(800, 600, state);
      expect(layout.activeEvent).toBeDefined();
      expect(layout.activeEvent?.title).toBe('2. The Sun Stone');
      expect(layout.activeEvent?.description).toBe(
        'You find a crystal radiating warm light.',
      );
    });

    it('lists drawn events', () => {
      const state = createMockState();
      const layout = getEventCardLayout(800, 600, state);
      expect(layout.drawnEvents.length).toBe(1);
      expect(layout.drawnEvents[0].number).toBe(1);
      expect(layout.drawnEvents[0].title).toBe('• 1. The Hungry Troll');
    });

    it('handles case when no events are drawn yet', () => {
      const state = createMockState({
        eventDeck: [
          {
            id: 'e1',
            number: 1,
            name: 'Event 1',
            description: 'Desc',
            used: false,
          },
        ] as TurnEvent[],
      });
      const layout = getEventCardLayout(800, 600, state);
      expect(layout.drawnEvents.length).toBe(1);
      expect(layout.drawnEvents[0].title).toBe('(None drawn yet)');
    });

    it('produces compact height when collapsed', () => {
      const state = createMockState();
      const layout = getEventCardLayout(800, 600, state, { isCollapsed: true });
      expect(layout.isCollapsed).toBe(true);
      expect(layout.bounds.height).toBe(28);
      expect(layout.drawnEvents.length).toBe(0);
      expect(layout.activeEvent).toBeUndefined();
    });
  });

  describe('getEventCardHit', () => {
    it('returns null when hitting outside panel', () => {
      const state = createMockState();
      const hit = getEventCardHit(800, 600, state, false, 500, 500);
      expect(hit).toBeNull();
    });

    it('returns toggle hit when clicking toggle button', () => {
      const state = createMockState();
      const layout = getEventCardLayout(800, 600, state, {
        isCollapsed: false,
      });
      const toggle = layout.toggleButtonBounds;
      const hit = getEventCardHit(
        800,
        600,
        state,
        false,
        toggle.x + toggle.width / 2,
        toggle.y + toggle.height / 2,
      );
      expect(hit).toEqual({ type: 'toggle' });
    });

    it('returns toggle hit when clicking anywhere on collapsed panel header', () => {
      const state = createMockState();
      const layout = getEventCardLayout(800, 600, state, { isCollapsed: true });
      const hit = getEventCardHit(
        800,
        600,
        state,
        true,
        layout.bounds.x + 20,
        layout.bounds.y + 10,
      );
      expect(hit).toEqual({ type: 'toggle' });
    });

    it('returns card hit when clicking inside expanded panel body', () => {
      const state = createMockState();
      const layout = getEventCardLayout(800, 600, state, {
        isCollapsed: false,
      });
      const hit = getEventCardHit(
        800,
        600,
        state,
        false,
        layout.bounds.x + 20,
        layout.bounds.y + 40,
      );
      expect(hit).toEqual({ type: 'card' });
    });
  });

  describe('renderEventCard', () => {
    it('renders on canvas when state has events', () => {
      const ctx = createMockCtx();
      const state = createMockState();
      renderEventCard(ctx, 800, 600, state, { isCollapsed: false });

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.fillText).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('renders collapsed state', () => {
      const ctx = createMockCtx();
      const state = createMockState();
      renderEventCard(ctx, 800, 600, state, { isCollapsed: true });

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.fillText).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('does not crash when state is null', () => {
      const ctx = createMockCtx();
      expect(() => renderEventCard(ctx, 800, 600, null)).not.toThrow();
    });
  });
});
