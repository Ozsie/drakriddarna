import { describe, expect, it } from 'vitest';
import type { Dungeon, GameState, Hero, Monster } from '../types';
import { Colour, ConditionType, ItemType, Level, Side } from '../types';
import { DEFAULT_ACTOR_SPRITE_FACING, getActorFacing } from './ActorAnimation';
import {
  faceHeroesTowardClosestRoomDoor,
  faceRevealedMonsters,
} from './facing';

const createHero = (x: number, y: number, overrides?: Partial<Hero>): Hero => ({
  name: 'Fearik',
  health: 7,
  maxHealth: 7,
  defense: 0,
  actions: 2,
  movement: 3,
  maxMovement: 3,
  colour: Colour.Yellow,
  incapacitated: false,
  position: { x, y },
  experience: 0,
  level: Level.APPRENTICE,
  weapon: {
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
  },
  inventory: [],
  isInventoryOpen: false,
  ...overrides,
});

const createMonster = (
  x: number,
  y: number,
  overrides?: Partial<Monster>,
): Monster => ({
  name: 'Orc',
  type: 'Orc',
  health: 2,
  maxHealth: 2,
  defense: 0,
  actions: 2,
  movement: 3,
  maxMovement: 3,
  colour: Colour.Green,
  incapacitated: false,
  position: { x, y },
  experience: 0,
  level: Level.APPRENTICE,
  weapon: {
    name: 'Axe',
    amountInDeck: 1,
    dice: 2,
    useHearHeroes: false,
    twoHanded: false,
    range: 1,
    type: ItemType.WEAPON,
    value: 10,
    ignoresShield: false,
    ignoresArmour: false,
  },
  inventory: [],
  ...overrides,
});

interface TestStateOptions {
  heroes: Hero[];
  monsters: Monster[];
  doors?: Dungeon['layout']['doors'];
  discoveredRooms: string[];
}

const createState = ({
  heroes,
  monsters,
  doors = [],
  discoveredRooms,
}: TestStateOptions): GameState => {
  const dungeon: Dungeon = {
    name: 'test-dungeon',
    intro: 'test-dungeon',
    beaten: false,
    winConditions: [{ type: ConditionType.KILL_ALL, fulfilled: false }],
    startingPositions: [{ x: 1, y: 1 }],
    discoveredRooms,
    layout: {
      grid: [
        '#######',
        '#AAAAA#',
        '#AAAAA#',
        '#BBBBB#',
        '#BBBBB#',
        '#BBBBB#',
        '#######',
      ],
      doors,
      monsters,
      secrets: [],
      notes: [],
      items: [],
      interactables: [],
      corridors: [],
      corners: [],
      pits: [],
      pillars: [],
    },
    killCount: 0,
    events: [],
  };

  return {
    heroes,
    dungeon,
    currentActor: heroes[0],
    actionLog: [],
    itemDeck: [],
    magicItemDeck: [],
    eventDeck: [],
    settings: {},
    reRender: false,
    drawEvents: true,
  };
};

const closedDoor = (x: number, y: number, side: Side) => ({
  x,
  y,
  side,
  locked: false,
  trapped: false,
  open: false,
  hidden: false,
  reinforced: false,
  trapAttacks: 0,
});

describe('faceRevealedMonsters', () => {
  it('faces a monster in a revealed room toward the closest live hero', () => {
    const heroNear = createHero(4, 5);
    const heroFar = createHero(2, 1);
    const monster = createMonster(2, 4);
    const state = createState({
      heroes: [heroFar, heroNear],
      monsters: [monster],
      discoveredRooms: ['A'],
    });

    faceRevealedMonsters(state, ['B']);

    expect(getActorFacing(monster)).toBe('southEast');
  });

  it('ignores monsters outside the revealed rooms', () => {
    const hero = createHero(2, 1);
    const monster = createMonster(2, 4);
    const state = createState({
      heroes: [hero],
      monsters: [monster],
      discoveredRooms: ['A'],
    });

    faceRevealedMonsters(state, ['C']);

    expect(getActorFacing(monster)).toBe(DEFAULT_ACTOR_SPRITE_FACING);
  });

  it('ignores dead monsters and dead heroes', () => {
    const heroDead = createHero(2, 1, { health: 0 });
    const heroAlive = createHero(4, 5);
    const monsterDead = createMonster(1, 4, { health: 0 });
    const monster = createMonster(3, 5);
    const state = createState({
      heroes: [heroDead, heroAlive],
      monsters: [monsterDead, monster],
      discoveredRooms: [],
    });

    faceRevealedMonsters(state, ['B']);

    expect(getActorFacing(monsterDead)).toBe(DEFAULT_ACTOR_SPRITE_FACING);
    expect(getActorFacing(monster)).toBe('east');
  });

  it('skips the facings when no live heroes remain', () => {
    const monster = createMonster(2, 4);
    const state = createState({
      heroes: [createHero(2, 1, { health: 0 })],
      monsters: [monster],
      discoveredRooms: [],
    });

    expect(() => faceRevealedMonsters(state, ['B'])).not.toThrow();
    expect(getActorFacing(monster)).toBe(DEFAULT_ACTOR_SPRITE_FACING);
  });
});

describe('faceHeroesTowardClosestRoomDoor', () => {
  it('faces each hero toward the closest door of their starting room', () => {
    const hero = createHero(1, 1);
    const state = createState({
      heroes: [hero],
      monsters: [],
      // Between A (rows 1-2) and B (rows 3-5): the near door is right
      // below the hero, the far door at the room's far end.
      doors: [closedDoor(1, 2, Side.DOWN), closedDoor(4, 2, Side.DOWN)],
      discoveredRooms: ['A'],
    });

    faceHeroesTowardClosestRoomDoor(state);

    expect(getActorFacing(hero)).toBe('south');
  });

  it('faces toward the far door when it is the closest of the room', () => {
    const hero = createHero(4, 1);
    const state = createState({
      heroes: [hero],
      monsters: [],
      doors: [closedDoor(1, 2, Side.DOWN), closedDoor(4, 1, Side.RIGHT)],
      discoveredRooms: ['A'],
    });

    faceHeroesTowardClosestRoomDoor(state);

    expect(getActorFacing(hero)).toBe('east');
  });

  it('takes the other room-side cell of a door into account', () => {
    // The door tuple addresses cell (x, y) with its side; a door listed
    // from the B side still belongs to the adjacent A room.
    const hero = createHero(1, 1);
    const state = createState({
      heroes: [hero],
      monsters: [],
      doors: [closedDoor(1, 3, Side.UP)],
      discoveredRooms: ['A'],
    });

    faceHeroesTowardClosestRoomDoor(state);

    expect(getActorFacing(hero)).toBe('south');
  });

  it('never faces a hidden door', () => {
    const hero = createHero(1, 1);
    const state = createState({
      heroes: [hero],
      monsters: [],
      doors: [{ ...closedDoor(1, 2, Side.DOWN), hidden: true }],
      discoveredRooms: ['A'],
    });

    faceHeroesTowardClosestRoomDoor(state);

    expect(getActorFacing(hero)).toBe(DEFAULT_ACTOR_SPRITE_FACING);
  });

  it('leaves heroes of doorless rooms at the default facing', () => {
    const hero = createHero(1, 1);
    const state = createState({
      heroes: [hero],
      monsters: [],
      doors: [closedDoor(3, 5, Side.DOWN)],
      discoveredRooms: ['A'],
    });

    faceHeroesTowardClosestRoomDoor(state);

    expect(getActorFacing(hero)).toBe(DEFAULT_ACTOR_SPRITE_FACING);
  });
});
