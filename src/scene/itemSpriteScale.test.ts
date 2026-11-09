import { describe, it, expect, vi } from 'vitest';
import {
  buildItemViewModels,
  drawItemViewSprite,
  renderItemViewWithSprite,
  ITEM_SPRITE_SCALE,
} from './adapters';
import type { GameState, Hero } from '../types';
import { Colour, ItemType, Level } from '../types';
import { weapons } from '../items/weapons';

// Item sprite frames need a loaded sheet to resolve, which never happens
// in the test environment; this suite mocks the image cache with a ready
// 128px-wide image so the game-side shrink (the view's spriteDraw demand,
// the centered 75% cell draw) can be pinned (discovery, fallback-tile and
// label resolution rules are covered in adapters.test.ts).

vi.mock('../core/ImageCache', () => ({
  getReadyImage: (url: string): HTMLImageElement | null =>
    ({
      naturalWidth: 128,
      naturalHeight: 128,
      width: 128,
      height: 128,
      src: url,
    }) as HTMLImageElement,
}));

const hero = (name: string, x: number, y: number): Hero => ({
  name,
  actions: 2,
  movement: 2,
  maxMovement: 2,
  defense: 0,
  health: 5,
  maxHealth: 5,
  colour: Colour.Red,
  experience: 0,
  position: { x, y },
  level: Level.APPRENTICE,
  weapon: weapons[0],
  inventory: [],
  isInventoryOpen: false,
});

const createState = (overrides: Partial<GameState> = {}): GameState => ({
  heroes: [],
  dungeon: {
    name: 'Test Dungeon',
    intro: '',
    discoveredRooms: ['A'],
    layout: {
      grid: ['AA'],
      doors: [],
      secrets: [],
      monsters: [],
      notes: [],
      items: [
        {
          item: {
            name: 'Potion',
            type: ItemType.MAGIC,
            value: 10,
            amountInDeck: 1,
            sprite: { image: 'items/potions.png', size: 32, index: 5 },
          },
          position: { x: 0, y: 0 },
        },
      ],
      corridors: [],
      corners: [],
      pillars: [],
      pits: [],
    },
    startingPositions: [{ x: 0, y: 0 }],
    winConditions: [],
    beaten: false,
    killCount: 0,
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

const fakeContext = () =>
  ({
    drawImage: vi.fn(),
    beginPath: vi.fn(),
    roundRect: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
  }) as unknown as CanvasRenderingContext2D;

describe('item sprite scale', () => {
  it('carries the shrink on views with a resolved sprite frame', () => {
    const views = buildItemViewModels(
      createState(),
      {} as CanvasImageSource,
      48,
      false,
    );

    expect(views).toHaveLength(1);
    const view = views[0];
    expect(view.sprite).toMatchObject({ sx: 32, sy: 32, sw: 32, sh: 32 });
    expect(view.spriteDraw).toEqual({ scale: ITEM_SPRITE_SCALE });
  });

  it('leaves views without a resolved sprite untouched', () => {
    // A sprite-less item keeps the plain package path: no game-side
    // draw scale, so the generic fallback tile fills the cell.
    const state = createState();
    delete state.dungeon.layout.items[0].item?.sprite;
    const views = buildItemViewModels(
      state,
      {} as CanvasImageSource,
      48,
      false,
    );

    expect(views[0].spriteDraw).toBeUndefined();
  });

  it('draws the sprite centered in the cell at the shrink scale', () => {
    const [view] = buildItemViewModels(
      createState(),
      {} as CanvasImageSource,
      48,
      false,
    );
    const ctx = fakeContext();
    const image = view.sprite?.image;

    expect(drawItemViewSprite(ctx, view, 48)).toBe(true);
    // 36px draw box (75% of 48) centered on the cell: (48-36)/2 = 6 offset.
    expect(ctx.drawImage).toHaveBeenCalledWith(
      image,
      32,
      32,
      32,
      32,
      6,
      6,
      36,
      36,
    );
  });

  it('draws no fallback tile duplicate behind the scaled sprite', () => {
    const [view] = buildItemViewModels(
      createState(),
      {} as CanvasImageSource,
      48,
      false,
    );
    const ctx = fakeContext();

    renderItemViewWithSprite(ctx, view, 48);

    // Only the scaled sprite's own drawImage: the fallback tile must not
    // render a duplicate behind the shrunken frame.
    expect(ctx.drawImage).toHaveBeenCalledTimes(1);
  });

  it('keeps drawing the label box with the scaled sprite', () => {
    const current = hero('Fearik', 0, 0);
    const [view] = buildItemViewModels(
      createState({ heroes: [current], currentActor: current }),
      {} as CanvasImageSource,
      48,
      false,
    );
    const ctx = fakeContext();

    renderItemViewWithSprite(ctx, view, 48);

    expect(ctx.drawImage).toHaveBeenCalledTimes(1);
    // The label box anchors below the cell: y = 0*48 + 48 + 14.
    expect(ctx.fillText).toHaveBeenCalledWith('Potion', 10, 62);
  });

  it('falls back to the plain package path without a sprite', () => {
    // While the sheet is still loading (no resolved frame), the view
    // draws through the package: the generic tile fills the cell.
    const ctx = fakeContext();
    const view = {
      ...buildItemViewModels(
        createState(),
        {} as CanvasImageSource,
        48,
        false,
      )[0],
      sprite: null,
    };
    delete view.spriteDraw;

    renderItemViewWithSprite(ctx, view, 48);

    // The tile draw falls through the package path (drawCachedTile ends
    // in a drawImage call under the test environment).
    expect(ctx.drawImage).toHaveBeenCalledTimes(1);
  });
});
