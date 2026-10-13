/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi } from 'vitest';
import {
  getHeroCardsLayout,
  renderHeroCards,
  getHeroCardsHit,
  measureTextWidth,
  truncateText,
  isPointInBounds,
  drawRoundedRect,
} from './HeroCardRendering';
import {
  Colour,
  Level,
  ItemType,
  type GameState,
  type Hero,
  type Item,
} from '../types';
import { ACTIVE, DESCRIPTION, USED } from '../items/ItemLogic';

const createMockHero = (
  name: string,
  colour = Colour.Red,
  overrides: Partial<Hero> = {},
): Hero => ({
  name,
  actions: 2,
  movement: 4,
  maxMovement: 4,
  defense: 1,
  health: 6,
  maxHealth: 6,
  colour,
  experience: 0,
  position: { x: 1, y: 1 },
  level: Level.APPRENTICE,
  weapon: {
    name: 'Long Sword',
    dice: 2,
    amountInDeck: 2,
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
  ...overrides,
});

const createMockState = (
  heroes: Hero[] = [createMockHero('Fearik')],
): GameState => ({
  heroes,
  currentActor: heroes[0],
  dungeon: {
    name: 'Test Dungeon',
    beaten: false,
    winConditions: [],
    events: [],
    intro: '',
    killCount: 0,
    discoveredRooms: [],
    layout: {
      grid: ['###', '#.#', '###'],
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
    quadraticCurveTo: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 8 })),
  } as unknown as CanvasRenderingContext2D;
  return ctx;
};

describe('HeroCardRendering', () => {
  describe('measureTextWidth and truncateText', () => {
    it('measures text width using canvas context', () => {
      const ctx = createMockCtx();
      const w = measureTextWidth(ctx, 'Fearik');
      expect(w).toBe(6 * 8);
    });

    it('falls back to approximation when ctx is not provided', () => {
      const w = measureTextWidth(null, 'Fearik');
      expect(w).toBeGreaterThan(0);
    });

    it('returns empty string for empty text or zero maxWidth', () => {
      expect(truncateText(null, '', 100)).toBe('');
      expect(truncateText(null, 'Fearik', 0)).toBe('');
    });

    it('truncates text with ellipsis when width exceeds maxWidth', () => {
      const ctx = createMockCtx();
      const result = truncateText(
        ctx,
        'Very Long Hero Title That Exceeds Width',
        50,
      );
      expect(result.endsWith('...')).toBe(true);
    });
  });

  describe('isPointInBounds and drawRoundedRect', () => {
    it('correctly checks point inclusion', () => {
      const bounds = { x: 10, y: 10, width: 50, height: 50 };
      expect(isPointInBounds(20, 20, bounds)).toBe(true);
      expect(isPointInBounds(5, 20, bounds)).toBe(false);
      expect(isPointInBounds(20, 65, bounds)).toBe(false);
    });

    it('draws rounded rectangle path on context', () => {
      const ctx = createMockCtx();
      drawRoundedRect(ctx, 10, 10, 100, 50, 5);
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.moveTo).toHaveBeenCalled();
      expect(ctx.quadraticCurveTo).toHaveBeenCalled();
      expect(ctx.closePath).toHaveBeenCalled();
    });
  });

  describe('getHeroCardsLayout', () => {
    it('returns empty layout for invalid state or dimensions', () => {
      const layout = getHeroCardsLayout(0, 0, null);
      expect(layout.cards).toHaveLength(0);
      expect(layout.containerBounds.width).toBe(0);
    });

    it('places hero cards at bottom-left and fills no more than half the space', () => {
      const hero1 = createMockHero('Fearik', Colour.Yellow);
      const hero2 = createMockHero('Helbran', Colour.Red);
      const hero3 = createMockHero('Siedel', Colour.Green);
      const state = createMockState([hero1, hero2, hero3]);

      const viewWidth = 800;
      const viewHeight = 600;
      const layout = getHeroCardsLayout(viewWidth, viewHeight, state);

      expect(layout.cards).toHaveLength(3);
      // Total width must not exceed half the view width (400px)
      expect(layout.containerBounds.width).toBeLessThanOrEqual(viewWidth * 0.5);
      // Left coordinate starts at margin (e.g. 8)
      expect(layout.containerBounds.x).toBe(8);
      // Bottom coordinate aligns near bottom of screen
      expect(
        layout.containerBounds.y + layout.containerBounds.height,
      ).toBeLessThanOrEqual(viewHeight);
    });

    it('allocates larger height for active actor and smaller height for inactive actor', () => {
      const activeHero = createMockHero('Fearik', Colour.Yellow);
      const inactiveHero = createMockHero('Helbran', Colour.Red);
      const state = createMockState([activeHero, inactiveHero]);
      state.currentActor = activeHero;

      const layout = getHeroCardsLayout(600, 500, state);
      const activeCard = layout.cards.find((c) => c.hero.name === 'Fearik')!;
      const inactiveCard = layout.cards.find((c) => c.hero.name === 'Helbran')!;

      expect(activeCard.isCurrent).toBe(true);
      expect(inactiveCard.isCurrent).toBe(false);
      expect(activeCard.bounds.height).toBeGreaterThan(
        inactiveCard.bounds.height,
      );
      expect(activeCard.weaponText).toBeDefined();
      expect(activeCard.armourText).toBeDefined();
      expect(activeCard.shieldText).toBeDefined();
    });

    it('positions open inventory above the corresponding hero card', () => {
      const hero = createMockHero('Fearik', Colour.Yellow, {
        isInventoryOpen: true,
        inventory: [
          {
            name: 'Health Potion',
            amountInDeck: 1,
            type: ItemType.MAGIC,
            value: 10,
            properties: {
              [ACTIVE]: true,
              [DESCRIPTION]: 'Restores 4 HP',
            },
          },
        ],
      });
      const state = createMockState([hero]);

      const layout = getHeroCardsLayout(600, 500, state);
      expect(layout.inventories).toHaveLength(1);

      const inv = layout.inventories[0];
      const card = layout.cards[0];

      expect(inv.hero.name).toBe('Fearik');
      // Must be positioned above the card
      expect(inv.bounds.y + inv.bounds.height).toBeLessThan(card.bounds.y);
      expect(inv.items).toHaveLength(1);
      expect(inv.items[0].isUsable).toBe(true);
      expect(inv.items[0].useButtonBounds).toBeDefined();
    });
  });

  describe('getHeroCardsHit', () => {
    it('detects click on backpack button', () => {
      const hero = createMockHero('Fearik');
      const state = createMockState([hero]);

      const layout = getHeroCardsLayout(600, 500, state);
      const btn = layout.cards[0].inventoryButtonBounds;

      const hit = getHeroCardsHit(600, 500, state, btn.x + 2, btn.y + 2);
      expect(hit).toEqual({
        type: 'inventoryButton',
        hero,
      });
    });

    it('detects click on card body', () => {
      const hero = createMockHero('Fearik');
      const state = createMockState([hero]);

      const layout = getHeroCardsLayout(600, 500, state);
      const card = layout.cards[0].bounds;

      const hit = getHeroCardsHit(600, 500, state, card.x + 10, card.y + 25);
      expect(hit).toEqual({
        type: 'card',
        hero,
      });
    });

    it('detects click on inventory close button and use item button', () => {
      const potion: Item = {
        name: 'Health Potion',
        amountInDeck: 1,
        type: ItemType.MAGIC,
        value: 10,
        properties: {
          [ACTIVE]: true,
          [DESCRIPTION]: 'Restores HP',
        },
      };
      const hero = createMockHero('Fearik', Colour.Yellow, {
        isInventoryOpen: true,
        inventory: [potion],
      });
      const state = createMockState([hero]);

      const layout = getHeroCardsLayout(600, 500, state);
      const inv = layout.inventories[0];

      // Test close button
      const closeBtn = inv.closeButtonBounds;
      const closeHit = getHeroCardsHit(
        600,
        500,
        state,
        closeBtn.x + 2,
        closeBtn.y + 2,
      );
      expect(closeHit).toEqual({
        type: 'inventoryClose',
        hero,
      });

      // Test use button
      const useBtn = inv.items[0].useButtonBounds!;
      const useHit = getHeroCardsHit(
        600,
        500,
        state,
        useBtn.x + 2,
        useBtn.y + 2,
      );
      expect(useHit).toEqual({
        type: 'inventoryUseItem',
        hero,
        item: potion,
        itemIndex: 0,
      });
    });

    it('returns null when clicking outside hero cards', () => {
      const hero = createMockHero('Fearik');
      const state = createMockState([hero]);

      const hit = getHeroCardsHit(600, 500, state, 400, 200);
      expect(hit).toBeNull();
    });
  });

  describe('renderHeroCards', () => {
    it('renders hero cards and equipment onto canvas context', () => {
      const hero1 = createMockHero('Fearik', Colour.Yellow);
      const hero2 = createMockHero('Helbran', Colour.Red);
      const state = createMockState([hero1, hero2]);
      const ctx = createMockCtx();

      renderHeroCards(ctx, 600, 500, state, {
        hoveredInventoryHeroName: 'Fearik',
      });

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
      expect(ctx.fillText).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('renders open inventory popover with used and unused items', () => {
      const usableItem: Item = {
        name: 'Health Potion',
        amountInDeck: 1,
        type: ItemType.MAGIC,
        value: 10,
        properties: { [ACTIVE]: true, [DESCRIPTION]: 'Restores HP' },
      };
      const usedItem: Item = {
        name: 'Empty Scroll',
        amountInDeck: 1,
        type: ItemType.MAGIC,
        value: 0,
        properties: { [ACTIVE]: true, [USED]: true },
      };
      const hero = createMockHero('Fearik', Colour.Yellow, {
        isInventoryOpen: true,
        inventory: [usableItem, usedItem],
      });
      const state = createMockState([hero]);
      const ctx = createMockCtx();

      renderHeroCards(ctx, 600, 500, state, {
        hoveredCloseHeroName: 'Fearik',
        hoveredUseItem: { heroName: 'Fearik', itemIndex: 0 },
      });

      expect(ctx.fillText).toHaveBeenCalled();
    });
  });
});
