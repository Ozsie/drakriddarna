// Hero status facade tests: render and hit-test the full-screen status
// screen through the game-side facade, against hand-built GameState
// fixtures.

import { describe, it, expect, vi } from 'vitest';
import { renderHeroStatus, getHeroStatusHit } from './HeroStatusRendering';
import {
  Colour,
  Level,
  ItemType,
  type GameState,
  type Hero,
  type Item,
} from '../types';
import { ACTIVE, DESCRIPTION } from '../items/ItemLogic';
import {
  layoutHeroStatus,
  hitTestHeroStatus,
  defaultTheme,
} from '@hoard-engine/uikit';
import type { UiEnv } from '@hoard-engine/uikit';
import { toHeroStatusViewModel } from './viewmodels/heroStatus';

const identityT = (key: string) => key;
const viewBounds = { x: 0, y: 0, width: 600, height: 500 };
const env: UiEnv = {
  theme: defaultTheme,
  mode: 'regular',
  t: identityT,
  measure: { width: (text: string) => text.length * 6.5 },
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

  it('hit-tests slots, items, the close button and the backdrop', () => {
    const hero = createMockHero('Fearik', {
      isInventoryOpen: true,
      inventory: [potion],
    });
    const state = createMockState([hero]);
    const vm = toHeroStatusViewModel(state, null, identityT);
    expect(vm).not.toBeNull();
    const layout = layoutHeroStatus(vm!, viewBounds, env);
    expect(layout.hasContent).toBe(true);

    // Close button
    const closeHit = hitTestHeroStatus(layout, {
      x: layout.closeButtonBounds.x + 2,
      y: layout.closeButtonBounds.y + 2,
    });
    expect(closeHit).toEqual({ kind: 'close' });

    // Weapon slot
    const slotBounds = layout.slots[0].bounds;
    const slotHit = hitTestHeroStatus(layout, {
      x: slotBounds.x + 4,
      y: slotBounds.y + 4,
    });
    expect(slotHit).toEqual({ kind: 'slot', slotId: 'weapon' });

    // Inventory cell through the facade (resolves the hero and item)
    const cell = layout.inventoryGrid[0];
    const itemHit = getHeroStatusHit(
      600,
      500,
      state,
      null,
      cell.bounds.x + 2,
      cell.bounds.y + 2,
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
    const selectedVm = toHeroStatusViewModel(state, selection, identityT);
    const selectedLayout = layoutHeroStatus(selectedVm!, viewBounds, env);
    const useBounds = selectedLayout.detail?.useButtonBounds;
    expect(useBounds).toBeDefined();
    const useHit = getHeroStatusHit(
      600,
      500,
      state,
      selection,
      useBounds!.x + 2,
      useBounds!.y + 2,
    );
    expect(useHit).toMatchObject({ type: 'use', item: potion });

    // Without the selection the same point is inert panel space
    const noUseHit = getHeroStatusHit(
      600,
      500,
      state,
      null,
      useBounds!.x + 2,
      useBounds!.y + 2,
    );
    expect(noUseHit).toMatchObject({ type: 'panel' });
  });

  it('returns null hits while the screen is closed', () => {
    const hero = createMockHero('Fearik');
    const state = createMockState([hero]);
    expect(getHeroStatusHit(600, 500, state, null, 10, 10)).toBeNull();
  });
});
