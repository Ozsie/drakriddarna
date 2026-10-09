/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi } from 'vitest';
import {
  getMenuLayout,
  getMenuHit,
  renderMenuModal,
  isPointInBounds,
} from './MenuRendering';
import { Colour, ItemType, Level, type GameState, type Hero } from '../types';

const createMockHero = (name = 'Hero1'): Hero => ({
  name,
  actions: 2,
  movement: 4,
  maxMovement: 4,
  defense: 1,
  health: 6,
  maxHealth: 6,
  colour: Colour.Red,
  experience: 0,
  position: { x: 1, y: 1 },
  level: Level.APPRENTICE,
  weapon: {
    name: 'Sword',
    dice: 2,
    amountInDeck: 1,
    twoHanded: false,
    range: 1,
    type: ItemType.WEAPON,
    value: 10,
    ignoresShield: false,
    ignoresArmour: false,
    useHearHeroes: true,
  },
  inventory: [],
  isInventoryOpen: false,
});

const createMockState = (overrides: Partial<GameState> = {}): GameState => ({
  heroes: [createMockHero()],
  dungeon: {
    name: 'Test Dungeon',
    beaten: false,
    winConditions: [],
    events: [],
    intro: '',
    killCount: 0,
    discoveredRooms: ['A'],
    layout: {
      grid: ['AAA'],
      doors: [],
      monsters: [],
      secrets: [],
      interactables: [],
      items: [],
      pillars: [],
      pits: [],
      notes: [],
      corridors: [],
      corners: [],
    },
    startingPositions: [{ x: 1, y: 1 }],
  },
  actionLog: [],
  itemDeck: [],
  magicItemDeck: [],
  settings: {},
  eventDeck: [],
  reRender: false,
  drawEvents: false,
  ...overrides,
});

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
    arcTo: vi.fn(),
    rect: vi.fn(),
    roundRect: vi.fn(),
    quadraticCurveTo: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 7 })),
  } as unknown as CanvasRenderingContext2D;
  return ctx;
};

describe('MenuRendering', () => {
  describe('isPointInBounds', () => {
    it('accurately tests if point is within bounds', () => {
      const bounds = { x: 10, y: 20, width: 100, height: 50 };
      expect(isPointInBounds(10, 20, bounds)).toBe(true);
      expect(isPointInBounds(60, 45, bounds)).toBe(true);
      expect(isPointInBounds(110, 70, bounds)).toBe(true);
      expect(isPointInBounds(9, 20, bounds)).toBe(false);
      expect(isPointInBounds(10, 19, bounds)).toBe(false);
      expect(isPointInBounds(111, 50, bounds)).toBe(false);
      expect(isPointInBounds(50, 71, bounds)).toBe(false);
    });
  });

  describe('getMenuLayout', () => {
    it('returns empty layout when state or dimensions are invalid', () => {
      expect(getMenuLayout(0, 600, createMockState())).toEqual({
        view: 'main',
        panelBounds: { x: 0, y: 0, width: 0, height: 0 },
        headerBounds: { x: 0, y: 0, width: 0, height: 0, text: '' },
        items: [],
      });
      expect(getMenuLayout(800, 0, createMockState())).toEqual({
        view: 'main',
        panelBounds: { x: 0, y: 0, width: 0, height: 0 },
        headerBounds: { x: 0, y: 0, width: 0, height: 0, text: '' },
        items: [],
      });
      expect(getMenuLayout(800, 600, null)).toEqual({
        view: 'main',
        panelBounds: { x: 0, y: 0, width: 0, height: 0 },
        headerBounds: { x: 0, y: 0, width: 0, height: 0, text: '' },
        items: [],
      });
    });

    it('creates menu layout positioned under top bar with items and header', () => {
      const state = createMockState();
      const layout = getMenuLayout(800, 600, state, {
        view: 'main',
        buildInfo: { date: '2026-10-06', hash: 'abc1234' },
      });

      expect(layout.view).toBe('main');
      expect(layout.panelBounds.x).toBe(8);
      expect(layout.panelBounds.y).toBe(44);
      expect(layout.panelBounds.width).toBe(240);
      expect(layout.headerBounds.text).toBeTruthy();
      expect(layout.items.length).toBeGreaterThan(0);
      expect(layout.footerBounds?.text).toBe('2026-10-06 - abc1234');

      // Check item bounds are arranged vertically
      for (let i = 0; i < layout.items.length; i++) {
        const item = layout.items[i];
        expect(item.bounds.x).toBe(8 + 10);
        expect(item.bounds.width).toBe(240 - 20);
        expect(item.bounds.height).toBe(30);
        if (i > 0) {
          expect(item.bounds.y).toBeGreaterThan(
            layout.items[i - 1].bounds.y + layout.items[i - 1].bounds.height,
          );
        }
      }
    });

    it('creates debug view layout with debug actions', () => {
      const state = createMockState();
      const layout = getMenuLayout(800, 600, state, {
        view: 'debug',
      });

      expect(layout.view).toBe('debug');
      expect(layout.headerBounds.text).toBe('Debug');
      expect(layout.items.some((i) => i.item.id === 'testing_grounds')).toBe(
        true,
      );
      expect(layout.items.some((i) => i.item.id === 'shuffle_deck')).toBe(true);
      expect(layout.items.some((i) => i.item.id === 'select_next_event')).toBe(
        true,
      );
    });

    it('shows debug status label in main menu layout', () => {
      const state = createMockState();
      const layoutWithoutDebug = getMenuLayout(800, 600, state, {
        view: 'main',
        debugMode: false,
      });
      const layoutWithDebug = getMenuLayout(800, 600, state, {
        view: 'main',
        debugMode: true,
      });

      const debugItemOff = layoutWithoutDebug.items.find(
        (i) => i.item.id === 'debug',
      );
      const debugItemOn = layoutWithDebug.items.find(
        (i) => i.item.id === 'debug',
      );

      expect(debugItemOff?.item.label).toBe('Debug: Off');
      expect(debugItemOn?.item.label).toBe('Debug: On');
      expect(
        layoutWithDebug.items.some((i) => i.item.id === 'testing_grounds'),
      ).toBe(false);
    });
  });

  describe('getMenuHit', () => {
    it('returns null when clicking outside canvas or invalid input', () => {
      const state = createMockState();
      expect(getMenuHit(800, 600, state, undefined, -5, 10)).toBeNull();
      expect(getMenuHit(800, 600, state, undefined, 900, 10)).toBeNull();
      expect(getMenuHit(0, 600, state, undefined, 10, 10)).toBeNull();
    });

    it('returns item when clicking on an item button', () => {
      const state = createMockState();
      const layout = getMenuLayout(800, 600, state, { view: 'main' });
      const firstItem = layout.items[0];

      const hit = getMenuHit(
        800,
        600,
        state,
        { view: 'main' },
        firstItem.bounds.x + 5,
        firstItem.bounds.y + 5,
      );
      expect(hit?.type).toBe('item');
      expect(hit?.item?.id).toBe(firstItem.item.id);
    });

    it('returns panel when clicking inside panel padding / header area', () => {
      const state = createMockState();
      const layout = getMenuLayout(800, 600, state, { view: 'main' });

      // Click on header
      const hit = getMenuHit(
        800,
        600,
        state,
        { view: 'main' },
        layout.headerBounds.x + 5,
        layout.headerBounds.y + 5,
      );
      expect(hit).toEqual({
        type: 'panel',
      });
    });

    it('returns backdrop when clicking outside the panel', () => {
      const state = createMockState();
      const hit = getMenuHit(800, 600, state, { view: 'main' }, 500, 300);
      expect(hit).toEqual({
        type: 'backdrop',
      });
    });
  });

  describe('renderMenuModal', () => {
    it('renders backdrop, panel, header, items and footer onto canvas context', () => {
      const state = createMockState();
      const ctx = createMockCtx();

      renderMenuModal(ctx, 800, 600, state, {
        view: 'main',
        hoveredItemId: 'new_game',
        buildInfo: { date: '2026-10-06', hash: 'abc1234' },
      });

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 800, 600); // backdrop
      expect(ctx.fillText).toHaveBeenCalled(); // header, items, footer
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('does nothing when canvas context or dimensions are missing', () => {
      const state = createMockState();
      const ctx = createMockCtx();

      renderMenuModal(ctx, 0, 600, state);
      expect(ctx.save).not.toHaveBeenCalled();
    });
  });
});
