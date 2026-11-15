// Hero status facade tests: render and hit-test the full-screen status
// screen through the game-side facade, against hand-built GameState
// fixtures.

import { describe, it, expect, vi } from 'vitest';
import { renderHeroStatus, getHeroStatusHit } from './HeroStatusRendering';
import { defaultUiEnv } from './env';
import {
  Colour,
  Level,
  ItemType,
  type GameState,
  type Hero,
  type Item,
} from '../types';
import { ACTIVE, DESCRIPTION } from '../items/ItemLogic';

const hitPoints = {
  close: { x: 546, y: 34 },
  weapon: { x: 50, y: 79 },
  item: { x: 363, y: 99 },
  use: { x: 251, y: 223 },
};

const createMockHero = (name: string, overrides: Partial<Hero> = {}): Hero => ({
  name,
  actions: 2,
  movement: 3,
  maxMovement: 3,
  defense: 1,
  health: 6,
  maxHealth: 8,
  colour: Colour.Red,
  experience: 3,
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

const potion: Item = {
  name: 'Health Potion',
  amountInDeck: 1,
  type: ItemType.MAGIC,
  value: 10,
  properties: { [ACTIVE]: true, [DESCRIPTION]: 'Restores HP' },
};

const createMockState = (heroes: Hero[]): GameState => ({
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
    fillRect: vi.fn(),
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

describe('HeroStatusRendering', () => {
  it('renders nothing while the screen is closed', () => {
    const ctx = createMockCtx();
    const hero = createMockHero('Fearik');
    renderHeroStatus(ctx, 600, 500, createMockState([hero]));
    expect(ctx.save).not.toHaveBeenCalled();
    expect(ctx.fill).not.toHaveBeenCalled();
  });

  it('renders the modal for the hero with the open flag', () => {
    const ctx = createMockCtx();
    const hero = createMockHero('Fearik', {
      isInventoryOpen: true,
      inventory: [potion],
    });
    renderHeroStatus(ctx, 600, 500, createMockState([hero]));

    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });

  it('renders item details in order with thematic text italicized and line spacing', () => {
    const ctx = createMockCtx();
    const renderedText: { text: string; y: number; font: string }[] = [];
    ctx.fillText = vi.fn((text: string, _x: number, y: number) => {
      renderedText.push({ text, y, font: ctx.font });
    });
    const item: Item = {
      name: 'items.magicItems.boots.name',
      nameTranslationKey: 'items.magicItems.boots.name',
      amountInDeck: 1,
      type: ItemType.MAGIC,
      value: 0,
    };
    const hero = createMockHero('Fearik', {
      isInventoryOpen: true,
      inventory: [item],
    });
    const translations = new Map([
      ['items.magicItems.boots.name', 'Boots'],
      ['items.magicItems.boots.effect', 'Effect line'],
      ['items.magicItems.boots.description', 'Description line'],
      ['items.magicItems.boots.thematicDescription', 'Thematic line'],
    ]);

    renderHeroStatus(ctx, 600, 500, createMockState([hero]), {
      selection: {
        heroId: 'Fearik',
        source: { kind: 'inventory', itemIndex: 0 },
      },
      env: {
        ...defaultUiEnv,
        t: (key) => translations.get(key) ?? key,
      },
    });

    const detailText = renderedText.filter(({ text }) =>
      ['Boots', 'Effect line', 'Description line', 'Thematic line'].includes(
        text,
      ),
    );
    expect(detailText.map(({ text }) => text)).toEqual([
      'Boots',
      'Effect line',
      'Description line',
      'Thematic line',
    ]);
    expect(detailText[0].font).toContain('bold');
    expect(detailText[2].y - detailText[1].y).toBeGreaterThan(16);
    expect(detailText[3].y - detailText[2].y).toBeGreaterThan(16);
    expect(detailText[3].font).toContain('italic');
  });

  it('draws a strike-through over disabled inventory items', () => {
    const renderItem = (disabled: boolean) => {
      const ctx = createMockCtx();
      const lineTo = vi.spyOn(ctx, 'lineTo');
      const hero = createMockHero('Fearik', {
        isInventoryOpen: true,
        inventory: [{ ...potion, disabled }],
      });
      renderHeroStatus(ctx, 600, 500, createMockState([hero]));
      return lineTo;
    };

    const enabledItemLineTo = renderItem(false);
    const disabledItemLineTo = renderItem(true);

    expect(disabledItemLineTo.mock.calls).toHaveLength(
      enabledItemLineTo.mock.calls.length + 1,
    );
  });

  it('renders status effects in left-aligned columns, filling the first before the second', () => {
    const ctx = createMockCtx();
    const effectLabels = new Map([
      ['events.dragonsBreath.effect', 'Blinded'],
      ['events.weakness.effect', 'Weakened'],
      ['content.status.incapacitated', 'Down'],
      ['content.indicators.invisible', 'Invisible'],
      ['events.elementalWeapon.effect', 'Elemental'],
      ['items.magicItems.boots.effect', 'Boots'],
      ['items.magicItems.giantsGlove.effect', 'Gloves'],
    ]);
    const renderedText: {
      text: string;
      x: number;
      y: number;
      align: string;
    }[] = [];
    ctx.fillText = vi.fn((text: string, x: number, y: number) => {
      renderedText.push({
        text,
        x,
        y,
        align: ctx.textAlign,
      });
    });
    const hero = createMockHero('Fearik', {
      isInventoryOpen: true,
      blinded: true,
      weakened: true,
      incapacitated: true,
      ignoredByMonsters: true,
      inventory: [
        {
          id: 'boots_of_speed',
          name: 'Boots',
          nameTranslationKey: 'items.magicItems.boots.name',
          amountInDeck: 1,
          type: ItemType.MAGIC,
          value: 0,
          properties: { MOVEMENT_BONUS: 1 },
        },
        {
          id: 'giants_glove',
          name: 'Glove',
          nameTranslationKey: 'items.magicItems.giantsGlove.name',
          amountInDeck: 1,
          type: ItemType.MAGIC,
          value: 0,
          properties: { ATTACK_BONUS: 1 },
        },
      ],
    });
    hero.weapon.elemental = true;

    renderHeroStatus(ctx, 600, 500, createMockState([hero]), {
      env: {
        ...defaultUiEnv,
        t: (key) => effectLabels.get(key) ?? key,
      },
    });

    const effectTexts = [...effectLabels.values()];
    const effects = renderedText.filter(({ text }) =>
      effectTexts.includes(text),
    );

    expect(effects.map(({ text }) => text)).toEqual(effectTexts);
    expect(effects.map(({ align }) => align)).toEqual(
      effectTexts.map(() => 'left'),
    );
    const secondColumnStart = effects.findIndex(({ x }) => x > effects[0].x);
    expect(secondColumnStart).toBeGreaterThan(0);
    expect(secondColumnStart).toBeLessThan(effects.length);
    expect(
      effects.slice(0, secondColumnStart).every(({ x }) => x === effects[0].x),
    ).toBe(true);
    expect(effects[1].y).toBeGreaterThan(effects[0].y);
    expect(
      effects.slice(secondColumnStart).every(({ x }) => x > effects[0].x),
    ).toBe(true);
  });

  it('hit-tests slots, items, the close button and the backdrop', () => {
    const hero = createMockHero('Fearik', {
      isInventoryOpen: true,
      inventory: [potion],
    });
    const state = createMockState([hero]);

    // Close button
    expect(
      getHeroStatusHit(
        600,
        500,
        state,
        null,
        hitPoints.close.x,
        hitPoints.close.y,
      ),
    ).toMatchObject({ type: 'close' });

    // Weapon slot
    expect(
      getHeroStatusHit(
        600,
        500,
        state,
        null,
        hitPoints.weapon.x,
        hitPoints.weapon.y,
      ),
    ).toMatchObject({ type: 'slot', slotId: 'weapon', item: hero.weapon });

    // Inventory cell through the facade (resolves the hero and item)
    const itemHit = getHeroStatusHit(
      600,
      500,
      state,
      null,
      hitPoints.item.x,
      hitPoints.item.y,
    );
    expect(itemHit).toMatchObject({
      type: 'item',
      item: potion,
      itemIndex: 0,
    });

    // Backdrop outside the panel dismisses
    const backdropHit = getHeroStatusHit(600, 500, state, null, 2, 2);
    expect(backdropHit).toMatchObject({ type: 'backdrop' });

    // A use hit requires a selected inventory item
    const selection = {
      heroId: 'Fearik',
      source: { kind: 'inventory', itemIndex: 0 },
    } as const;
    const useHit = getHeroStatusHit(
      600,
      500,
      state,
      selection,
      hitPoints.use.x,
      hitPoints.use.y,
    );
    expect(useHit).toMatchObject({ type: 'use', item: potion });

    // Without the selection the same point is inert panel space
    const noUseHit = getHeroStatusHit(
      600,
      500,
      state,
      null,
      hitPoints.use.x,
      hitPoints.use.y,
    );
    expect(noUseHit).toMatchObject({ type: 'panel' });
  });

  it('returns null hits while the screen is closed', () => {
    const hero = createMockHero('Fearik');
    const state = createMockState([hero]);
    expect(getHeroStatusHit(600, 500, state, null, 10, 10)).toBeNull();
  });
});
