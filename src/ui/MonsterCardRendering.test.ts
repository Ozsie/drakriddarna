/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi } from 'vitest';
import {
  getMonsterCardsLayout,
  renderMonsterCards,
  getMonsterCardsHit,
} from './MonsterCardRendering';
import {
  Colour,
  Level,
  ItemType,
  MonsterType,
  type GameState,
  type Hero,
  type Monster,
} from '../types';

const createMockMonster = (
  name: string,
  colour = Colour.Green,
  overrides: Partial<Monster> = {},
): Monster => ({
  name,
  type: MonsterType.ORC,
  actions: 1,
  movement: 3,
  maxMovement: 3,
  defense: 1,
  health: 4,
  maxHealth: 4,
  colour,
  experience: 1,
  position: { x: 1, y: 1 },
  level: Level.APPRENTICE,
  weapon: {
    name: 'Club',
    dice: 1,
    amountInDeck: 1,
    twoHanded: false,
    range: 1,
    type: ItemType.WEAPON,
    value: 5,
    ignoresShield: false,
    ignoresArmour: false,
    useHearHeroes: false,
  },
  armour: {
    name: 'Leather Armour',
    defense: 1,
    amountInDeck: 1,
    type: ItemType.ARMOUR,
    value: 10,
    magicProtection: false,
    movementReduction: 0,
  },
  shield: {
    name: 'Wooden Shield',
    dice: 1,
    amountInDeck: 1,
    type: ItemType.SHIELD,
    value: 8,
  },
  inventory: [],
  ...overrides,
});

const createMockState = (monsters: Monster[] = []): GameState => {
  const hero: Hero = {
    name: 'Hero1',
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
  };

  return {
    heroes: [hero],
    dungeon: {
      name: 'Test Dungeon',
      beaten: false,
      winConditions: [],
      events: [],
      intro: '',
      killCount: 0,
      discoveredRooms: ['A'],
      layout: {
        grid: ['AAA', 'AAA', 'AAA'],
        doors: [],
        monsters,
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
  };
};

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
    measureText: vi.fn((text: string) => ({ width: text.length * 5 })),
  } as unknown as CanvasRenderingContext2D;
  return ctx;
};

describe('MonsterCardRendering', () => {
  describe('getMonsterCardsLayout', () => {
    it('returns empty layout when state is null or dimensions are 0', () => {
      expect(getMonsterCardsLayout(1000, 800, null)).toEqual({
        containerBounds: { x: 0, y: 0, width: 0, height: 0 },
        cards: [],
      });
      expect(getMonsterCardsLayout(0, 800, createMockState([]))).toEqual({
        containerBounds: { x: 0, y: 0, width: 0, height: 0 },
        cards: [],
      });
      expect(getMonsterCardsLayout(1000, 0, createMockState([]))).toEqual({
        containerBounds: { x: 0, y: 0, width: 0, height: 0 },
        cards: [],
      });
    });

    it('returns empty layout when no monsters are visible or alive', () => {
      const state = createMockState([
        createMockMonster('Dead Orc', Colour.Green, { health: 0 }),
      ]);
      const layout = getMonsterCardsLayout(1000, 800, state);
      expect(layout.cards).toHaveLength(0);
      expect(layout.containerBounds).toEqual({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      });
    });

    it('creates layout for 1 visible monster in the bottom right corner', () => {
      const monster = createMockMonster('Orc 1', Colour.Green, { health: 5 });
      const state = createMockState([monster]);

      const layout = getMonsterCardsLayout(1000, 800, state);
      expect(layout.cards).toHaveLength(1);

      const card = layout.cards[0];
      expect(card.monster).toBe(monster);
      expect(card.row).toBe(0);
      expect(card.col).toBe(0);
      expect(card.title).toBe('Orc 1');
      expect(card.hpText).toBe('HP: 5');
      expect(card.weaponText).toBe('🗡 Club (1)');
      expect(card.armourText).toBe('🥋 Leather Armour (1)');
      expect(card.shieldText).toBe('🛡 Wooden Shield (1)');

      // Positioned near bottom right (right margin 8, bottom margin 8)
      expect(card.bounds.x + card.bounds.width).toBe(1000 - 8);
      expect(card.bounds.y + card.bounds.height).toBe(800 - 8);
    });

    it('creates 1 row for <= 6 monsters starting from bottom right', () => {
      const monsters = [
        createMockMonster('Orc 1'),
        createMockMonster('Orc 2'),
        createMockMonster('Orc 3'),
      ];
      const state = createMockState(monsters);

      const layout = getMonsterCardsLayout(1200, 800, state);
      expect(layout.cards).toHaveLength(3);

      // All cards in row 0
      expect(layout.cards[0].row).toBe(0);
      expect(layout.cards[1].row).toBe(0);
      expect(layout.cards[2].row).toBe(0);

      // Ordered from right to left
      expect(layout.cards[0].bounds.x).toBeGreaterThan(
        layout.cards[1].bounds.x,
      );
      expect(layout.cards[1].bounds.x).toBeGreaterThan(
        layout.cards[2].bounds.x,
      );

      // Bottom alignment
      expect(layout.cards[0].bounds.y).toBe(layout.cards[1].bounds.y);
      expect(layout.cards[1].bounds.y).toBe(layout.cards[2].bounds.y);
    });

    it('creates 2 rows when there are more than 6 visible monsters', () => {
      const monsters = Array.from({ length: 8 }, (_, i) =>
        createMockMonster(`Orc ${i + 1}`),
      );
      const state = createMockState(monsters);

      const layout = getMonsterCardsLayout(1200, 800, state);
      expect(layout.cards).toHaveLength(8);

      // First 6 in bottom row (row 0)
      for (let i = 0; i < 6; i++) {
        expect(layout.cards[i].row).toBe(0);
        expect(layout.cards[i].col).toBe(i);
      }

      // Next 2 in top row (row 1)
      expect(layout.cards[6].row).toBe(1);
      expect(layout.cards[6].col).toBe(0);
      expect(layout.cards[7].row).toBe(1);
      expect(layout.cards[7].col).toBe(1);

      // Row 1 is placed above Row 0
      expect(layout.cards[6].bounds.y).toBeLessThan(layout.cards[0].bounds.y);
      expect(
        layout.cards[6].bounds.y + layout.cards[6].bounds.height,
      ).toBeLessThan(layout.cards[0].bounds.y);
    });

    it('formats fallback strings for monster without armor or shield', () => {
      const monster = createMockMonster('Naked Orc', Colour.Red, {
        armour: undefined,
        shield: undefined,
      });
      const state = createMockState([monster]);

      const layout = getMonsterCardsLayout(1000, 800, state);
      const card = layout.cards[0];
      expect(card.armourText).toBe('🥋 None (0)');
      expect(card.shieldText).toBe('🛡 None (0)');
    });

    it('marks targeted monster with asterisk in title and isTarget flag', () => {
      const monster = createMockMonster('Boss Orc');
      const state = createMockState([monster]);
      state.targetActor = monster;

      const layout = getMonsterCardsLayout(1000, 800, state);
      expect(layout.cards[0].isTarget).toBe(true);
      expect(layout.cards[0].title).toBe('*Boss Orc');
    });
  });

  describe('getMonsterCardsHit', () => {
    it('returns null when clicking outside bounds', () => {
      const monster = createMockMonster('Orc');
      const state = createMockState([monster]);

      expect(getMonsterCardsHit(1000, 800, state, 10, 10)).toBeNull();
      expect(getMonsterCardsHit(1000, 800, null, 10, 10)).toBeNull();
    });

    it('returns the monster when clicking inside its card bounds', () => {
      const monster1 = createMockMonster('Orc 1');
      const monster2 = createMockMonster('Orc 2');
      const state = createMockState([monster1, monster2]);

      const layout = getMonsterCardsLayout(1000, 800, state);
      const card1 = layout.cards[0];
      const card2 = layout.cards[1];

      const hit1 = getMonsterCardsHit(
        1000,
        800,
        state,
        card1.bounds.x + 10,
        card1.bounds.y + 10,
      );
      expect(hit1).toEqual({ type: 'card', monster: monster1 });

      const hit2 = getMonsterCardsHit(
        1000,
        800,
        state,
        card2.bounds.x + 10,
        card2.bounds.y + 10,
      );
      expect(hit2).toEqual({ type: 'card', monster: monster2 });
    });
  });

  describe('renderMonsterCards', () => {
    it('renders cards with proper background, border and text', () => {
      const monster = createMockMonster('Orc Leader', Colour.Green, {
        health: 7,
      });
      const state = createMockState([monster]);
      const ctx = createMockCtx();

      renderMonsterCards(ctx, 1000, 800, state);

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();

      // Check text rendering
      const renderedTexts = (
        ctx.fillText as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.map((call) => call[0]);

      expect(renderedTexts).toContain('Orc Leader');
      expect(renderedTexts).toContain('HP: 7');
      expect(renderedTexts).toContain('🗡 Club (1)');
      expect(renderedTexts).toContain('🥋 Leather Armour (1)');
      expect(renderedTexts).toContain('🛡 Wooden Shield (1)');
    });

    it('handles null state and dimensions gracefully', () => {
      const ctx = createMockCtx();
      renderMonsterCards(ctx, 1000, 800, null);
      renderMonsterCards(ctx, 0, 800, createMockState([]));
      renderMonsterCards(ctx, 1000, 0, createMockState([]));
      expect(ctx.fillText).not.toHaveBeenCalled();
    });

    it('renders current actor and hovered monster with distinct borders', () => {
      const monsterCurrent = createMockMonster('Orc Current', Colour.Green);
      const monsterHovered = createMockMonster('Orc Hovered', Colour.Red, {
        id: 'orc-hover',
      });
      const state = createMockState([monsterCurrent, monsterHovered]);
      state.currentActor =
        monsterCurrent as unknown as typeof state.currentActor;

      const ctx = createMockCtx();
      renderMonsterCards(ctx, 1000, 800, state, {
        hoveredMonsterId: 'orc-hover',
      });

      expect(ctx.stroke).toHaveBeenCalledTimes(2);
    });
  });
});
