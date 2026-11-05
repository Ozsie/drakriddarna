import { describe, it, expect, afterEach } from 'vitest';
import {
  buildHeroViewModels,
  buildMonsterViewModels,
  buildHeroOverlayViewModel,
  buildItemViewModels,
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
// (src/scene/contracts.ts); these tests pin the game-side rules that the
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

  it('includes discovered monsters with bars and skips undiscovered ones', () => {
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
    expect(views[0].colourBar).toBe(Colour.Green);
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
