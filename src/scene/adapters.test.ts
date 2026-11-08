import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderMonsterHealthBars } from './ActorRendering';
import {
  buildHeroViewModels,
  buildMonsterViewModels,
  buildHeroOverlayViewModel,
  buildItemViewModels,
  drawActorViewSprite,
  drawScaledHeroBar,
  renderActorViewWithSprite,
  type GameActorView,
} from './adapters';
import { clearActorAnimations, playActorDeath } from '../core';
import { weapons } from '../items/weapons';
import { ACTOR_TILES, ITEM_TILES } from '../dungeon/tiles';
import type { GameState, Hero, Monster } from '../types';
import {
  Colour,
  ItemType,
  Level,
  MonsterType,
  SecretType,
  Side,
} from '../types';

// The adapters resolve GameState into scene view models
// (@hoard-engine/scene); these tests pin the game-side rules that the
// plain data carries: visibility, lingering death animations, bar
// scaling and label resolution.

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

const monster = (name: string, x: number, y: number): Monster =>
  ({
    name,
    type: MonsterType.ORC,
    actions: 2,
    movement: 2,
    maxMovement: 2,
    defense: 0,
    health: 3,
    maxHealth: 4,
    colour: Colour.Green,
    experience: 1,
    position: { x, y },
    level: Level.APPRENTICE,
    inventory: [],
  }) as unknown as Monster;

const createState = (overrides: Partial<GameState> = {}): GameState => ({
  heroes: [],
  dungeon: {
    name: 'Test Dungeon',
    intro: '',
    discoveredRooms: ['A'],
    layout: {
      grid: ['AA', 'AB'],
      doors: [
        {
          x: 1,
          y: 0,
          side: Side.UP,
          open: false,
          locked: false,
          hidden: false,
          trapped: false,
          trapAttacks: 0,
          reinforced: false,
        },
      ],
      secrets: [
        {
          name: 'Trap',
          type: SecretType.TRAP_DOOR,
          position: { x: 1, y: 1 },
          found: true,
        },
      ],
      monsters: [],
      notes: [],
      items: [
        {
          item: {
            name: 'Potion',
            type: ItemType.MAGIC,
            value: 10,
            amountInDeck: 1,
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

const now = 1_000_000;

describe('buildHeroViewModels', () => {
  afterEach(() => {
    clearActorAnimations();
  });

  it('builds a view per live hero with the fallback tile and no actor-layer bars', () => {
    const state = createState({
      heroes: [hero('Fearik', 0, 0)],
    });
    const views = buildHeroViewModels(
      state,
      {} as CanvasImageSource,
      false,
      now,
    );

    expect(views).toHaveLength(1);
    expect(views[0].position).toEqual({ x: 0, y: 0 });
    expect(views[0].sprite).toBeNull();
    expect(views[0].tile).toMatchObject({
      sx: ACTOR_TILES.HERO.x,
      sy: ACTOR_TILES.HERO.y,
    });
    expect(views[0].colourBar).toBe('');
    expect(views[0].healthBar).toBeNull();
    expect(views[0].active).toBe(false);
  });

  it('keeps drawing a dead hero while its death animation plays, and drops sprite-less dead heroes', () => {
    const dying = hero('Dying', 0, 0);
    dying.health = 0;
    dying.sprite = {
      image: 'hero-sheet.png',
      frameWidth: 32,
      frameHeight: 32,
    };
    const silent = hero('Silent', 1, 0);
    silent.health = 0;
    playActorDeath(dying, 600, now - 100);
    const state = createState({ heroes: [dying, silent] });

    const views = buildHeroViewModels(
      state,
      {} as CanvasImageSource,
      false,
      now,
    );

    expect(views).toHaveLength(1);
    expect(views[0].active).toBe(true);
  });
});

describe('buildMonsterViewModels', () => {
  afterEach(() => {
    clearActorAnimations();
  });

  it('includes discovered monsters with a health bar and skips undiscovered ones', () => {
    const visible = monster('Orc', 0, 0);
    const hidden = monster('Hidden', 1, 1); // cell 'B' is undiscovered
    const state = createState({
      dungeon: {
        ...createState().dungeon,
        layout: {
          ...createState().dungeon.layout,
          monsters: [visible, hidden],
        },
      },
    });

    const views = buildMonsterViewModels(
      state,
      {} as CanvasImageSource,
      false,
      now,
    );

    expect(views).toHaveLength(1);
    // The monster colour bar is gone from the board; the view keeps the
    // health bar for the post-lighting pass.
    expect(views[0].colourBar).toBe('');
    expect(views[0].healthBar).toEqual({ current: 3, max: 4 });
  });

  it('lingers on dying monsters until their death animation finishes', () => {
    const dying = monster('Dying Orc', 0, 0);
    dying.health = 0;
    dying.sprite = {
      image: 'orc-sheet.png',
      frameWidth: 32,
      frameHeight: 32,
    };
    playActorDeath(dying, 600, now - 100);
    // Killed monsters are removed from the layout immediately; the dying
    // list carries them until the animation finishes.
    const state = createState({
      dungeon: {
        ...createState().dungeon,
        layout: {
          ...createState().dungeon.layout,
          monsters: [],
        },
      },
    });

    const views = buildMonsterViewModels(
      state,
      {} as CanvasImageSource,
      false,
      now,
    );

    expect(views).toHaveLength(1);
    expect(views[0].active).toBe(true);
  });

  it('never draws the same monster twice when a killed monster stays in the layout', () => {
    const zombie = monster('Lingering Zombie', 0, 0);
    zombie.health = 0;
    zombie.sprite = {
      image: 'zombie-sheet.png',
      frameWidth: 32,
      frameHeight: 32,
    };
    playActorDeath(zombie, 600, now - 100);
    // Unremoved from the layout, e.g. a future kill path that misses the
    // removal — the layout path draws it, the dying list must not.
    const state = createState({
      dungeon: {
        ...createState().dungeon,
        layout: {
          ...createState().dungeon.layout,
          monsters: [zombie],
        },
      },
    });

    const views = buildMonsterViewModels(
      state,
      {} as CanvasImageSource,
      false,
      now,
    );

    expect(views).toHaveLength(1);
  });
});

describe('buildHeroOverlayViewModel', () => {
  it('walkable cells exclude the hero cell and cells no game rule allows, and health is scaled by the game master', () => {
    const current = hero('Fearik', 0, 0);
    const state = createState({
      heroes: [current],
      currentActor: current,
      gameMaster: {
        id: 'test',
        modifiers: { health: 1 },
      } as GameState['gameMaster'],
    });

    const view = buildHeroOverlayViewModel(state, now);

    expect(view.walkableCells).not.toContainEqual({ x: 0, y: 0 });
    expect(view.walkableCells).toContainEqual({ x: 1, y: 0 });
    // The 'B' cell at (1, 1) is undiscovered and out of the movement range.
    expect(view.walkableCells).not.toContainEqual({ x: 1, y: 1 });
    expect(view.marker).toEqual({ x: 0, y: 0 });
    expect(view.bars).toHaveLength(1);
    expect(view.bars[0].health).toEqual({ current: 5, max: 6 });
    expect(view.bars[0].actionPips).toBe(2);
    expect(view.bars[0].movePips).toBe(2);
  });

  it('produces an empty overlay without a current actor', () => {
    const state = createState({ heroes: [hero('Fearik', 0, 0)] });
    const view = buildHeroOverlayViewModel(state, now);
    expect(view.walkableCells).toEqual([]);
    expect(view.marker).toBeNull();
    expect(view.bars).toHaveLength(1);
  });
});

describe('buildItemViewModels', () => {
  it('builds views for discovered items with the generic fallback tile', () => {
    const state = createState();
    const views = buildItemViewModels(
      state,
      {} as CanvasImageSource,
      48,
      false,
    );

    expect(views).toHaveLength(1);
    expect(views[0].position).toEqual({ x: 0, y: 0 });
    expect(views[0].sprite).toBeNull();
    expect(views[0].fallbackTile).toMatchObject({
      sx: ITEM_TILES.ITEM_GENERIC.x,
      sy: ITEM_TILES.ITEM_GENERIC.y,
      drawSize: 48,
    });
    expect(views[0].label).toBeNull();
  });

  it('labels the item the current hero stands on, resolved through i18n', () => {
    const current = hero('Fearik', 0, 0);
    const state = createState({
      heroes: [current],
      currentActor: current,
    });
    const views = buildItemViewModels(
      state,
      {} as CanvasImageSource,
      48,
      false,
    );

    expect(views[0].label).toBe('Potion');
  });
});

describe('scaled actor sprites', () => {
  const scaledHero = (name: string, x: number, y: number): Hero => ({
    ...hero(name, x, y),
    sprite: {
      frameWidth: 128,
      frameHeight: 128,
      frameDurationMs: 40,
      animations: { idle: 15, walk: 15, attack: 15, hurt: 15, death: 15 },
      animationImages: {
        idle: 'characters/knight/Idle.png',
        walk: 'characters/knight/Walk.png',
        attack: 'characters/knight/Melee.png',
        hurt: 'characters/knight/TakeDamage.png',
        death: 'characters/knight/Die.png',
      },
      drawScale: 2,
    },
  });

  it('carries the sprite draw scale on the view', () => {
    const state = createState({ heroes: [scaledHero('Big', 2, 3)] });
    const views = buildHeroViewModels(state, {} as CanvasImageSource, false);
    expect((views[0] as GameActorView).spriteDraw).toEqual({ scale: 2 });
  });

  it('leaves views without a scaled sprite untouched', () => {
    const state = createState({ heroes: [hero('Plain', 1, 1)] });
    const views = buildHeroViewModels(state, {} as CanvasImageSource, false);
    expect((views[0] as GameActorView).spriteDraw).toBeUndefined();
  });

  it('draws scaled sprites centered on the cell and anchored to its floor', () => {
    const image = {} as CanvasImageSource;
    const drawImage = vi.fn();
    const ctx = { drawImage } as unknown as CanvasRenderingContext2D;
    const view = {
      position: { x: 3, y: 2 },
      sprite: { image, sx: 100, sy: 200, sw: 70, sh: 70 },
      tile: null,
      flashIntensity: 0,
      active: false,
      colourBar: '',
      healthBar: null,
      debugLabel: null,
      debugLines: [],
      spriteDraw: { scale: 2 },
    } as unknown as GameActorView;
    const cellSize = 48;

    drawActorViewSprite(ctx, view, cellSize);

    expect(drawImage).toHaveBeenCalledTimes(1);
    // 96px draw box centered on the 48px cell: (48-96)/2 = -24 offset;
    // floor-anchored: the box bottom lands on the cell's bottom edge.
    expect(drawImage).toHaveBeenCalledWith(
      image,
      100,
      200,
      70,
      70,
      3 * cellSize - 24,
      (2 + 1) * cellSize - 96,
      96,
      96,
    );
  });

  it('draws through the facade helper and strips the sprite and tile for the package path', () => {
    const drawImage = vi.fn();
    const image = {} as CanvasImageSource;
    const ctx = { drawImage } as unknown as CanvasRenderingContext2D;
    const tile = {
      sheet: {} as CanvasImageSource,
      sx: 0,
      sy: 0,
      size: 32,
      drawSize: 32,
    };
    const view = {
      position: { x: 0, y: 0 },
      sprite: { image, sx: 0, sy: 0, sw: 70, sh: 70 },
      tile,
      flashIntensity: 0,
      active: false,
      colourBar: '',
      healthBar: null,
      debugLabel: null,
      debugLines: [],
      spriteDraw: { scale: 2 },
    } as unknown as GameActorView;

    expect(renderActorViewWithSprite(ctx, view, 48)).toBe(false);
    // Only the scaled sprite's own drawImage: the unscaled fallback tile
    // must not render a duplicate behind the larger figure.
    expect(drawImage).toHaveBeenCalledTimes(1);
  });

  it('keeps the fallback tile while the scaled sprite has not loaded', () => {
    const drawImage = vi.fn();
    const ctx = { drawImage } as unknown as CanvasRenderingContext2D;
    const tile = {
      sheet: {} as CanvasImageSource,
      sx: 0,
      sy: 0,
      size: 32,
      drawSize: 32,
    };
    const view = {
      position: { x: 0, y: 0 },
      sprite: null,
      tile,
      flashIntensity: 0,
      active: false,
      colourBar: '',
      healthBar: null,
      debugLabel: null,
      debugLines: [],
      spriteDraw: { scale: 2 },
    } as unknown as GameActorView;

    expect(renderActorViewWithSprite(ctx, view, 48)).toBe(false);
    // The tile draw falls through the package path (drawCachedTile ends
    // in a drawImage call under the test environment).
    expect(drawImage).toHaveBeenCalledTimes(1);
  });

  it('draws no health bar in the actor pass', () => {
    const fillRects: number[][] = [];
    const ctx = {
      drawImage: () => {},
      beginPath: () => {},
      rect: () => {},
      stroke: () => {},
      fillRect: (...args: number[]) => {
        fillRects.push(args);
      },
      fillStyle: 'black',
      strokeStyle: 'black',
    } as unknown as CanvasRenderingContext2D;
    const view = {
      position: { x: 2, y: 3 },
      sprite: { image: {} as CanvasImageSource, sx: 0, sy: 0, sw: 70, sh: 70 },
      tile: null,
      flashIntensity: 0,
      active: false,
      colourBar: '',
      healthBar: { current: 5, max: 10 },
      debugLabel: null,
      debugLines: [],
      spriteDraw: { scale: 2 },
    } as unknown as GameActorView;

    renderActorViewWithSprite(ctx, view, 48);

    // The scaled sprite's own drawImage is the only drawing: the health
    // bar belongs to the post-lighting pass, not the actor layer.
    expect(fillRects).toHaveLength(0);
  });
});

describe('renderMonsterHealthBars', () => {
  afterEach(() => {
    clearActorAnimations();
  });

  const barCtx = () => {
    const fillRects: number[][] = [];
    const ctx = {
      beginPath: () => {},
      rect: () => {},
      stroke: () => {},
      fillRect: (...args: number[]) => {
        fillRects.push(args);
      },
      fillStyle: 'black',
      strokeStyle: 'black',
    } as unknown as CanvasRenderingContext2D;
    return { ctx, fillRects };
  };

  const stateWithMonsters = (...monsters: Monster[]): GameState =>
    createState({
      dungeon: {
        ...createState().dungeon,
        layout: {
          ...createState().dungeon.layout,
          monsters,
        },
      },
    });

  it('draws each visible monster health bar at its cell top', () => {
    const { ctx, fillRects } = barCtx();
    const state = stateWithMonsters(monster('Orc', 1, 0)); // cell 'A'

    renderMonsterHealthBars(
      ctx,
      {} as CanvasImageSource,
      48,
      state,
      false,
      now,
    );

    // Capacity rect: red strip across the cell top.
    expect(fillRects).toContainEqual([48 + 4, 0, 48 - 8, 4]);
    // Fill rect scales with current health (3 of 4).
    expect(fillRects).toContainEqual([48 + 4, 0, (48 - 8) * (3 / 4), 4]);
  });

  it('lifts the health bar above a scaled sprite', () => {
    const { ctx, fillRects } = barCtx();
    const scaled = {
      ...monster('Big Orc', 0, 1), // cell 'A'
      sprite: {
        image: 'orc-sheet.png',
        frameWidth: 32,
        frameHeight: 32,
        drawScale: 2,
      },
    } as Monster;
    const state = stateWithMonsters(scaled);

    renderMonsterHealthBars(
      ctx,
      {} as CanvasImageSource,
      48,
      state,
      false,
      now,
    );

    // The red capacity bar draws at the top of the doubled sprite, one
    // cell above the actor's own cell, not at the cell top.
    expect(fillRects).toContainEqual([4, (1 - 1) * 48, 48 - 8, 4]);
    expect(fillRects).not.toContainEqual([4, 48, 48 - 8, 4]);
  });

  it('draws nothing for undiscovered monsters', () => {
    const { ctx, fillRects } = barCtx();
    const state = stateWithMonsters(monster('Hidden', 1, 1)); // cell 'B'

    renderMonsterHealthBars(
      ctx,
      {} as CanvasImageSource,
      48,
      state,
      false,
      now,
    );

    expect(fillRects).toHaveLength(0);
  });
});

describe('scaled hero bars', () => {
  const barCtx = () => {
    const fillRects: number[][] = [];
    const ctx = {
      beginPath: () => {},
      rect: () => {},
      stroke: () => {},
      fillRect: (...args: number[]) => {
        fillRects.push(args);
      },
      fillStyle: 'black',
      strokeStyle: 'black',
    } as unknown as CanvasRenderingContext2D;
    return { ctx, fillRects };
  };

  it('carries the sprite draw scale on the bars of scaled heroes', () => {
    const state = createState({
      heroes: [
        {
          ...hero('Big', 1, 2),
          sprite: { frameWidth: 128, frameHeight: 128, drawScale: 2 },
        },
      ],
    });
    const view = buildHeroOverlayViewModel(state);
    expect(view.bars[0].spriteDraw).toEqual({ scale: 2 });
  });

  it('leaves bars without a scaled sprite for the package path', () => {
    const state = createState({ heroes: [hero('Plain', 1, 1)] });
    const view = buildHeroOverlayViewModel(state);
    expect(view.bars[0].spriteDraw).toBeUndefined();
  });

  it('lifts the health bar above the sprite while the colour bar stays at the cell', () => {
    const { ctx, fillRects } = barCtx();
    drawScaledHeroBar(
      ctx,
      {
        position: { x: 2, y: 3 },
        colour: Colour.Red,
        health: { current: 5, max: 10 },
        actionPips: 0,
        movePips: 0,
        spriteDraw: { scale: 2 },
      },
      48,
    );

    // Health bar capacity rect: at the top of the doubled sprite, one
    // cell above the hero's own cell top.
    expect(fillRects).toContainEqual([2 * 48 + 4, (3 - 1) * 48, 48 - 8, 4]);
    // Colour bar: still at the hero's own cell floor.
    expect(fillRects).toContainEqual([2 * 48 + 4, 3 * 48 + 48 - 6, 48 - 8, 4]);
  });

  it('draws action and move pips at the hero cell floor', () => {
    const { ctx, fillRects } = barCtx();
    drawScaledHeroBar(
      ctx,
      {
        position: { x: 2, y: 3 },
        colour: Colour.Red,
        health: { current: 5, max: 10 },
        actionPips: 2,
        movePips: 1,
        spriteDraw: { scale: 2 },
      },
      48,
    );

    // Action pips line the cell bottom-left...
    expect(fillRects).toContainEqual([2 * 48 + 4, 3 * 48 + 48 - 12, 5, 5]);
    expect(fillRects).toContainEqual([2 * 48 + 4 + 6, 3 * 48 + 48 - 12, 5, 5]);
    // ...and the move pips the bottom-right, mirroring the package's
    // own pip rendering.
    expect(fillRects).toContainEqual([
      2 * 48 + 48 - 22,
      3 * 48 + 48 - 12,
      5,
      5,
    ]);
  });
});
