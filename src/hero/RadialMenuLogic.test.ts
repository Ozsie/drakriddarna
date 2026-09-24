import { describe, expect, it } from 'vitest';
import {
  Colour,
  ConditionType,
  Side,
  type Dungeon,
  type GameState,
  type Hero,
  ItemType,
  Level,
  type Weapon,
} from '../types';
import { getAvailableRadialActions, RadialAction } from './RadialMenuLogic';

const defaultWeapon: Weapon = {
  name: 'Sword',
  amountInDeck: 1,
  dice: 2,
  useHearHeroes: false,
  twoHanded: false,
  range: 1,
  type: ItemType.WEAPON,
  value: 10,
  ignoresShield: false,
  ignoresArmour: false,
};

const createTestHero = (x: number, y: number): Hero => ({
  name: 'Fearik',
  health: 10,
  maxHealth: 10,
  defense: 0,
  actions: 2,
  movement: 5,
  maxMovement: 5,
  colour: Colour.Yellow,
  incapacitated: false,
  position: { x, y },
  experience: 0,
  level: Level.APPRENTICE,
  weapon: defaultWeapon,
  inventory: [],
  isInventoryOpen: false,
  ignoredByMonsters: false,
});

const createTestState = (
  hero: Hero,
  overrides?: Partial<Dungeon>,
): GameState => {
  const dungeon: Dungeon = {
    name: 'test-dungeon',
    beaten: false,
    winConditions: [{ type: ConditionType.KILL_ALL, fulfilled: false }],
    startingPositions: [{ x: 1, y: 1 }],
    discoveredRooms: ['A'],
    layout: {
      grid: [
        '#######',
        '#AAAAA#',
        '#AAAAA#',
        '#AAAAA#',
        '#AAAAA#',
        '#AAAAA#',
        '#######',
      ],
      doors: [],
      monsters: [],
      secrets: [],
      notes: [],
      items: [],
      corridors: [],
      corners: [],
      pits: [],
      pillars: [],
    },
    killCount: 0,
    events: [],
    ...overrides,
  };

  return {
    heroes: [hero],
    dungeon,
    currentActor: hero,
    actionLog: [],
    itemDeck: [],
    magicItemDeck: [],
    eventDeck: [],
    settings: {},
    reRender: false,
  };
};

describe('getAvailableRadialActions', () => {
  it('returns only SEARCH when hero has full action, no door or item', () => {
    const hero = createTestHero(1, 1);
    const state = createTestState(hero);

    const actions = getAvailableRadialActions(state, hero);

    expect(actions).toEqual([RadialAction.SEARCH]);
  });

  it('returns PICK_LOCK and SEARCH when standing on a locked door with full action', () => {
    const hero = createTestHero(1, 1);
    const state = createTestState(hero);
    state.dungeon.layout.doors = [
      {
        x: 1,
        y: 1,
        side: Side.RIGHT,
        open: false,
        locked: true,
        hidden: false,
        trapped: false,
        trapAttacks: 0,
      },
    ];

    const actions = getAvailableRadialActions(state, hero);

    expect(actions).toContain(RadialAction.PICK_LOCK);
    expect(actions).toContain(RadialAction.SEARCH);
  });

  it('returns OPEN_DOOR only when hero has half action left (movement>0 but no full action)', () => {
    const hero = createTestHero(1, 1);
    hero.movement = 1;
    hero.maxMovement = 5;
    const state = createTestState(hero);
    state.dungeon.layout.doors = [
      {
        x: 1,
        y: 1,
        side: Side.RIGHT,
        open: false,
        locked: false,
        hidden: false,
        trapped: false,
        trapAttacks: 0,
      },
    ];

    const actions = getAvailableRadialActions(state, hero);

    expect(actions).toContain(RadialAction.OPEN_DOOR);
  });

  it('returns PICK_UP_ITEM when standing on an item', () => {
    const hero = createTestHero(1, 1);
    const state = createTestState(hero);
    state.dungeon.layout.items = [
      {
        position: { x: 1, y: 1 },
      },
    ];

    const actions = getAvailableRadialActions(state, hero);

    expect(actions).toContain(RadialAction.PICK_UP_ITEM);
  });

  it('returns no actions when hero has no full action, no movement, no door and no item', () => {
    const hero = createTestHero(1, 1);
    hero.actions = 0;
    hero.movement = 0;
    const state = createTestState(hero);

    const actions = getAvailableRadialActions(state, hero);

    expect(actions).toEqual([]);
  });
});
