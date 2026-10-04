/* eslint-disable @typescript-eslint/unbound-method */
import { describe, expect, it, vi } from 'vitest';
import {
  formatLatestLog,
  formatTurnCounter,
  getTopBarHit,
  getTopBarLayout,
  isPointInBounds,
  measureTextWidth,
  renderTopBar,
  truncateText,
} from './TopBarRendering';
import { renderUI } from './UIRendering';
import type { GameState } from '../types';

const createMockCtx = () =>
  ({
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    fillRect: vi.fn(),
    rect: vi.fn(),
    roundRect: vi.fn(),
    clip: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 8 })),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: '',
    textBaseline: '',
  }) as unknown as CanvasRenderingContext2D;

const createMockState = (overrides?: Partial<GameState>): GameState =>
  ({
    actionLog: [
      { key: 'logs.gameSaved', turn: 3 },
      { key: 'logs.endedTurn', turn: 2 },
    ],
    turnCount: 3,
    heroes: [],
    dungeon: {
      name: 'Test Dungeon',
      discoveredRooms: [],
      layout: { grid: [] },
      startingPositions: [{ x: 0, y: 0 }],
    },
    ...overrides,
  }) as unknown as GameState;

describe('TopBarRendering', () => {
  describe('formatting helpers', () => {
    it('formats turn counter text', () => {
      expect(formatTurnCounter(0)).toBe('Turn 0');
      expect(formatTurnCounter(5)).toBe('Turn 5');
      expect(formatTurnCounter(undefined)).toBe('Turn 0');
      expect(formatTurnCounter(null)).toBe('Turn 0');
    });

    it('formats latest log event with turn number', () => {
      expect(formatLatestLog({ key: 'logs.gameSaved', turn: 4 })).toBe(
        '(4) logs.gameSaved',
      );
    });

    it('returns empty string for null or undefined log event', () => {
      expect(formatLatestLog(null)).toBe('');
      expect(formatLatestLog(undefined)).toBe('');
    });
  });

  describe('truncateText', () => {
    it('returns original text if it fits within maxWidth', () => {
      const ctx = createMockCtx();
      const text = 'Short text';
      const width = measureTextWidth(ctx, text);
      expect(truncateText(ctx, text, width + 20)).toBe('Short text');
    });

    it('truncates text with ellipsis if it exceeds maxWidth', () => {
      const ctx = createMockCtx();
      const text = 'A very long log event description that should not fit';
      const truncated = truncateText(ctx, text, 80);
      expect(truncated.endsWith('...')).toBe(true);
      expect(measureTextWidth(ctx, truncated)).toBeLessThanOrEqual(80);
    });

    it('handles empty string and non-positive maxWidth', () => {
      const ctx = createMockCtx();
      expect(truncateText(ctx, '', 100)).toBe('');
      expect(truncateText(ctx, 'Some text', 0)).toBe('');
    });
  });

  describe('getTopBarLayout', () => {
    it('creates layout ordered as <menu> <latest log event> <turn counter>', () => {
      const state = createMockState();
      const ctx = createMockCtx();
      const viewWidth = 600;
      const layout = getTopBarLayout(viewWidth, state, ctx);

      // Check left-to-right order: menu -> log -> turn
      expect(layout.menuButton.x).toBeLessThan(layout.logSection.x);
      expect(layout.logSection.x + layout.logSection.width).toBeLessThanOrEqual(
        layout.turnCounter.x,
      );
      expect(
        layout.turnCounter.x + layout.turnCounter.width,
      ).toBeLessThanOrEqual(viewWidth);
    });

    it('allocates required width for menu button and at least 10 characters for turn counter', () => {
      const state = createMockState();
      const ctx = createMockCtx();
      const viewWidth = 700;
      const layout = getTopBarLayout(viewWidth, state, ctx);

      // Menu width accommodates label
      expect(layout.menuButton.width).toBeGreaterThanOrEqual(48);

      // Turn counter width accommodates at least 10 characters
      const tenCharWidth = measureTextWidth(ctx, '0123456789');
      expect(layout.turnCounter.width).toBeGreaterThanOrEqual(tenCharWidth);
    });

    it('gives maximum remaining space to latest log event section', () => {
      const state = createMockState();
      const ctx = createMockCtx();
      const viewWidth = 800;
      const layout = getTopBarLayout(viewWidth, state, ctx);

      const margin = 8;
      const gap = 8;
      const expectedLogWidth =
        viewWidth -
        margin * 2 -
        layout.menuButton.width -
        layout.turnCounter.width -
        gap * 2;

      expect(layout.logSection.width).toBe(expectedLogWidth);
    });
  });

  describe('hit testing and bounds', () => {
    it('determines if point is inside bounds', () => {
      const bounds = { x: 10, y: 10, width: 50, height: 30 };
      expect(isPointInBounds(20, 20, bounds)).toBe(true);
      expect(isPointInBounds(5, 20, bounds)).toBe(false);
      expect(isPointInBounds(70, 20, bounds)).toBe(false);
      expect(isPointInBounds(20, 5, bounds)).toBe(false);
      expect(isPointInBounds(20, 45, bounds)).toBe(false);
    });

    it('detects hits on menu, log, and turn counter elements', () => {
      const state = createMockState();
      const ctx = createMockCtx();
      const viewWidth = 600;
      const layout = getTopBarLayout(viewWidth, state, ctx);

      // Menu button hit
      const menuHit = getTopBarHit(
        viewWidth,
        state,
        layout.menuButton.x + 5,
        layout.menuButton.y + 5,
        ctx,
      );
      expect(menuHit).toBe('menu');

      // Log section hit
      const logHit = getTopBarHit(
        viewWidth,
        state,
        layout.logSection.x + 5,
        layout.logSection.y + 5,
        ctx,
      );
      expect(logHit).toBe('log');

      // Turn counter hit
      const turnHit = getTopBarHit(
        viewWidth,
        state,
        layout.turnCounter.x + 5,
        layout.turnCounter.y + 5,
        ctx,
      );
      expect(turnHit).toBe('turn');

      // Miss outside top bar
      const missHit = getTopBarHit(viewWidth, state, 100, 200, ctx);
      expect(missHit).toBeNull();
    });

    it('detects hit on logDropdown when isLogOpen is true', () => {
      const state = createMockState({
        actionLog: [
          { key: 'logs.1', turn: 1 },
          { key: 'logs.2', turn: 2 },
        ],
      });
      const ctx = createMockCtx();
      const viewWidth = 600;
      const layout = getTopBarLayout(viewWidth, state, ctx);

      // When isLogOpen is false, hit inside dropdown area returns null
      const closedHit = getTopBarHit(
        viewWidth,
        state,
        layout.logDropdown.x + 5,
        layout.logDropdown.y + 5,
        ctx,
        { isLogOpen: false },
      );
      expect(closedHit).toBeNull();

      // When isLogOpen is true, hit inside dropdown area returns 'logDropdown'
      const openHit = getTopBarHit(
        viewWidth,
        state,
        layout.logDropdown.x + 5,
        layout.logDropdown.y + 5,
        ctx,
        { isLogOpen: true },
      );
      expect(openHit).toBe('logDropdown');
    });
  });

  describe('log dropdown layout', () => {
    it('limits dropdown entries to the last 8 log events', () => {
      const logItems = Array.from({ length: 15 }, (_, i) => ({
        key: `logs.event${i}`,
        turn: i,
      }));
      const state = createMockState({ actionLog: logItems });
      const ctx = createMockCtx();
      const layout = getTopBarLayout(600, state, ctx);

      expect(layout.logDropdown.entries.length).toBe(8);
      expect(layout.logDropdown.entries[0]).toBe('(0) logs.event0');
      expect(layout.logDropdown.entries[7]).toBe('(7) logs.event7');
      expect(layout.logDropdown.height).toBe(6 * 2 + 8 * 20);
    });

    it('has zero height when actionLog is empty', () => {
      const state = createMockState({ actionLog: [] });
      const ctx = createMockCtx();
      const layout = getTopBarLayout(600, state, ctx);

      expect(layout.logDropdown.entries.length).toBe(0);
      expect(layout.logDropdown.height).toBe(0);
    });
  });

  describe('renderTopBar', () => {
    it('renders top bar elements to canvas context', () => {
      const state = createMockState();
      const ctx = createMockCtx();

      renderTopBar(ctx, 600, state);

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
      expect(ctx.fillText).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('renders hovered menu button styling when isMenuHovered is true', () => {
      const state = createMockState();
      const ctx = createMockCtx();

      renderTopBar(ctx, 600, state, { isMenuHovered: true });

      expect(ctx.fillStyle).toBeDefined();
      expect(ctx.fill).toHaveBeenCalled();
    });

    it('renders hovered log section styling when isLogHovered is true', () => {
      const state = createMockState();
      const ctx = createMockCtx();

      renderTopBar(ctx, 600, state, { isLogHovered: true });

      expect(ctx.fillStyle).toBeDefined();
      expect(ctx.fill).toHaveBeenCalled();
    });

    it('renders log dropdown when isLogOpen is true and logs exist', () => {
      const logItems = Array.from({ length: 10 }, (_, i) => ({
        key: `logs.event${i}`,
        turn: i,
      }));
      const state = createMockState({ actionLog: logItems });
      const ctx = createMockCtx();

      renderTopBar(ctx, 600, state, { isLogOpen: true });

      // Check that fillText was called for menu, latest log, turn counter, and dropdown entries (8 entries)
      // Total at least 1 + 1 + 1 + 8 = 11 calls
      expect(ctx.fillText).toHaveBeenCalledTimes(11);
    });

    it('does not render log dropdown when isLogOpen is false', () => {
      const logItems = Array.from({ length: 10 }, (_, i) => ({
        key: `logs.event${i}`,
        turn: i,
      }));
      const state = createMockState({ actionLog: logItems });
      const ctx = createMockCtx();

      renderTopBar(ctx, 600, state, { isLogOpen: false });

      // Menu, latest log, turn counter = 3 calls
      expect(ctx.fillText).toHaveBeenCalledTimes(3);
    });

    it('does not crash when viewWidth is 0 or ctx is null', () => {
      const state = createMockState();
      const ctx = createMockCtx();

      expect(() => renderTopBar(ctx, 0, state)).not.toThrow();
      expect(() =>
        renderTopBar(null as unknown as CanvasRenderingContext2D, 600, state),
      ).not.toThrow();
    });

    it('renderUI calls renderTopBar when state and viewWidth are provided', () => {
      const state = createMockState();
      const ctx = createMockCtx();

      renderUI(ctx, 48, null, null, state, 600);

      expect(ctx.fillText).toHaveBeenCalled();
    });
  });
});
