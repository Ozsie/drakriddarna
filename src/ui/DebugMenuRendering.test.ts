import { describe, expect, it, vi } from 'vitest';
import {
  getDebugMenuHit,
  getDebugMenuLayout,
  renderDebugMenuModal,
} from './DebugMenuRendering';
import { isPointInRect as isPointInBounds } from '@hoard-engine/primitives';
import { Colour, type GameState, type Hero, ItemType, Level } from '../types';

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

const createMockCtx = () =>
  ({
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
  }) as unknown as CanvasRenderingContext2D;

describe('DebugMenuRendering', () => {
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

  describe('getDebugMenuLayout', () => {
    it('returns empty layout when state or dimensions are invalid', () => {
      expect(getDebugMenuLayout(0, 600, createMockState())).toEqual({
        view: 'debug',
        panelBounds: { x: 0, y: 0, width: 0, height: 0 },
        headerBounds: { x: 0, y: 0, width: 0, height: 0, text: '' },
        items: [],
      });
      expect(getDebugMenuLayout(800, 0, createMockState())).toEqual({
        view: 'debug',
        panelBounds: { x: 0, y: 0, width: 0, height: 0 },
        headerBounds: { x: 0, y: 0, width: 0, height: 0, text: '' },
        items: [],
      });
      expect(getDebugMenuLayout(800, 600, null)).toEqual({
        view: 'debug',
        panelBounds: { x: 0, y: 0, width: 0, height: 0 },
        headerBounds: { x: 0, y: 0, width: 0, height: 0, text: '' },
        items: [],
      });
    });

    it('creates the menu layout positioned under the top bar with items and header', () => {
      const state = createMockState();
      const layout = getDebugMenuLayout(800, 600, state, {
        view: 'debug',
      });

      expect(layout.view).toBe('debug');
      expect(layout.panelBounds.x).toBe(8);
      expect(layout.panelBounds.y).toBe(44);
      expect(layout.panelBounds.width).toBe(240);
      expect(layout.headerBounds.text).toBeTruthy();
      expect(layout.items.length).toBeGreaterThan(0);

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

    it('creates the debug view layout with the debug actions', () => {
      const state = createMockState();
      const layout = getDebugMenuLayout(800, 600, state, {
        view: 'debug',
      });

      expect(layout.view).toBe('debug');
      expect(layout.items.some((i) => i.item.id === 'testing_grounds')).toBe(
        true,
      );
      expect(layout.items.some((i) => i.item.id === 'shuffle_deck')).toBe(true);
      expect(layout.items.some((i) => i.item.id === 'select_next_event')).toBe(
        true,
      );
    });

    it('creates the event view layout from the event deck', () => {
      const state = createMockState({
        eventDeck: [
          {
            id: 'e2',
            number: 2,
            name: 'Event Two',
            description: '',
          },
          {
            id: 'e1',
            number: 1,
            name: 'Event One',
            description: '',
          },
        ] as never,
      });
      const layout = getDebugMenuLayout(800, 600, state, {
        view: 'event',
      });

      expect(layout.view).toBe('event');
      expect(layout.items.map((i) => i.item.id)).toEqual([
        'event_e1',
        'event_e2',
        'event_back',
      ]);
    });
  });

  describe('getDebugMenuHit', () => {
    it('returns null when clicking outside canvas or invalid input', () => {
      const state = createMockState();
      expect(getDebugMenuHit(800, 600, state, undefined, -5, 10)).toBeNull();
      expect(getDebugMenuHit(800, 600, state, undefined, 900, 10)).toBeNull();
      expect(getDebugMenuHit(0, 600, state, undefined, 10, 10)).toBeNull();
    });

    it('returns item when clicking on an item button', () => {
      const state = createMockState();
      const layout = getDebugMenuLayout(800, 600, state, { view: 'debug' });
      const firstItem = layout.items[0];

      const hit = getDebugMenuHit(
        800,
        600,
        state,
        { view: 'debug' },
        firstItem.bounds.x + 5,
        firstItem.bounds.y + 5,
      );
      expect(hit?.type).toBe('item');
      expect(hit?.item?.id).toBe(firstItem.item.id);
    });

    it('returns panel when clicking inside panel padding / header area', () => {
      const state = createMockState();
      const layout = getDebugMenuLayout(800, 600, state, { view: 'debug' });

      // Click on header
      const hit = getDebugMenuHit(
        800,
        600,
        state,
        { view: 'debug' },
        layout.headerBounds.x + 5,
        layout.headerBounds.y + 5,
      );
      expect(hit).toEqual({
        type: 'panel',
      });
    });

    it('returns backdrop when clicking outside the panel', () => {
      const state = createMockState();
      const hit = getDebugMenuHit(800, 600, state, { view: 'debug' }, 500, 300);
      expect(hit).toEqual({
        type: 'backdrop',
      });
    });
  });

  describe('renderDebugMenuModal', () => {
    it('renders backdrop, panel, header and items onto the canvas context', () => {
      const state = createMockState();
      const ctx = createMockCtx();

      renderDebugMenuModal(ctx, 800, 600, state, {
        view: 'debug',
        hoveredItemId: 'testing_grounds',
      });

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 800, 600); // backdrop
      expect(ctx.fillText).toHaveBeenCalled(); // header and items
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('does nothing when canvas context or dimensions are missing', () => {
      const state = createMockState();
      const ctx = createMockCtx();

      renderDebugMenuModal(ctx, 0, 600, state);
      expect(ctx.save).not.toHaveBeenCalled();
    });
  });
});
