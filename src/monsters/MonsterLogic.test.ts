import { describe, expect, it } from 'vitest';
import {
  Colour,
  ConditionType,
  type Dungeon,
  type GameState,
  type Hero,
  ItemType,
  Level,
  MonsterType,
  Side,
  type Weapon,
} from '../types';
import { createDoor, createMonster } from '../dungeon/DungeonLogic';
import { monsterActions, monsterMove } from './MonsterLogic';
import { createPassableGrid } from './pathfinding';

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

const createTestHero = (
  name: string,
  x: number,
  y: number,
  health = 10,
): Hero => ({
  name,
  health,
  maxHealth: health,
  defense: 0,
  actions: 2,
  movement: 3,
  maxMovement: 3,
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

const createTestState = (overrides?: Partial<GameState>): GameState => {
  const dungeon: Dungeon = {
    name: 'test-dungeon',
    beaten: false,
    winConditions: [{ type: ConditionType.KILL_ALL, fulfilled: false }],
    startingPositions: [{ x: 1, y: 1 }],
    discoveredRooms: ['A', 'B'],
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
  };

  const hero = createTestHero('Fearik', 1, 5);

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
    ...overrides,
  };
};

describe('Monster Pathfinding & AI (A* and Door Collision)', () => {
  it('moves directly towards hero when clear path exists and stops when adjacent', () => {
    const state = createTestState();
    const monster = createMonster(MonsterType.ORC, Colour.Green, 1, 1);
    monster.movement = 4;
    state.dungeon.layout.monsters = [monster];

    // Hero is at (1, 5)
    monsterMove(state, monster);

    // Monster should move along (1, 2) -> (1, 3) -> (1, 4), which is adjacent to (1, 5)
    expect(monster.position).toEqual({ x: 1, y: 4 });
    expect(
      state.actionLog.some((l) => l.key === 'logs.monsterAction.movedTowards'),
    ).toBe(true);
    expect(monster.actions).toBe(1); // Consumed 1 action
  });

  it('navigates around walls and corners without getting trapped', () => {
    const state = createTestState();
    // Grid with a wall protruding:
    // Row 0: #######
    // Row 1: #A#AAA#
    // Row 2: #A#AAA#
    // Row 3: #A#AAA#
    // Row 4: #AAAAA#
    // Row 5: #AAAAA#
    // Row 6: #######
    state.dungeon.layout.grid = [
      '#######',
      '#A#AAA#',
      '#A#AAA#',
      '#A#AAA#',
      '#AAAAA#',
      '#AAAAA#',
      '#######',
    ];
    // Monster at (1, 1), Hero at (3, 1)
    // Direct path is blocked by wall at (2, 1), (2, 2), (2, 3)
    const monster = createMonster(MonsterType.ORC, Colour.Green, 1, 1);
    monster.movement = 6;
    state.dungeon.layout.monsters = [monster];
    state.heroes = [createTestHero('Fearik', 3, 1)];

    monsterMove(state, monster);

    // Monster routes down around wall at (1, 4) -> (2, 4) -> (3, 4) or similar and reaches hero
    expect(monster.position.x).toBeGreaterThanOrEqual(2);
    expect(
      state.actionLog.some((l) => l.key === 'logs.monsterAction.movedTowards'),
    ).toBe(true);
  });

  it('navigates around pillars and pits safely', () => {
    const state = createTestState();
    // Monster at (1, 2), Hero at (3, 2). Pillar at (2, 2).
    state.dungeon.layout.pillars = [{ x: 2, y: 2 }];
    const monster = createMonster(MonsterType.ORC, Colour.Green, 1, 2);
    monster.movement = 3;
    state.dungeon.layout.monsters = [monster];
    state.heroes = [createTestHero('Fearik', 3, 2)];

    monsterMove(state, monster);

    // Monster should not step on pillar (2, 2) and should reach cell adjacent to (3, 2)
    expect(monster.position).not.toEqual({ x: 2, y: 2 });
    expect(
      Math.max(
        Math.abs(monster.position.x - 3),
        Math.abs(monster.position.y - 2),
      ),
    ).toBe(1);
  });

  it('pit obstacle is avoided by pathfinder', () => {
    const state = createTestState();
    // Monster at (1, 2), Hero at (3, 2). Pit at (2, 2).
    state.dungeon.layout.pits = [{ x: 2, y: 2 }];
    const monster = createMonster(MonsterType.ORC, Colour.Green, 1, 2);
    monster.movement = 3;
    state.dungeon.layout.monsters = [monster];
    state.heroes = [createTestHero('Fearik', 3, 2)];

    monsterMove(state, monster);

    // Monster should not step on pit (2, 2)
    expect(monster.position).not.toEqual({ x: 2, y: 2 });
    expect(
      Math.max(
        Math.abs(monster.position.x - 3),
        Math.abs(monster.position.y - 2),
      ),
    ).toBe(1);
  });

  it('door collision: closed door completely blocks monster movement', () => {
    const state = createTestState();
    // Two rooms A (left) and B (right) separated by closed door at (3, 3) facing RIGHT to (4, 3)
    state.dungeon.layout.grid = [
      '#########',
      '#AAA#BBB#',
      '#AAA#BBB#',
      '#AAABBBB#',
      '#AAA#BBB#',
      '#AAA#BBB#',
      '#########',
    ];
    const door = createDoor(Side.RIGHT, 3, 3);
    door.open = false;
    state.dungeon.layout.doors = [door];

    const monster = createMonster(MonsterType.ORC, Colour.Green, 2, 3);
    monster.movement = 4;
    state.dungeon.layout.monsters = [monster];
    state.heroes = [createTestHero('Fearik', 6, 3)];

    monsterMove(state, monster);

    // Monster should NOT pass through closed door
    expect(monster.position).toEqual({ x: 2, y: 3 });
    expect(
      state.actionLog.some((l) => l.key === 'logs.monsterAction.couldNotMove'),
    ).toBe(true);
  });

  it('door collision: open door allows monster movement through doorway', () => {
    const state = createTestState();
    state.dungeon.layout.grid = [
      '#########',
      '#AAA#BBB#',
      '#AAA#BBB#',
      '#AAABBBB#',
      '#AAA#BBB#',
      '#AAA#BBB#',
      '#########',
    ];
    const door = createDoor(Side.RIGHT, 3, 3);
    door.open = true; // OPEN door
    state.dungeon.layout.doors = [door];

    const monster = createMonster(MonsterType.ORC, Colour.Green, 2, 3);
    monster.movement = 4;
    state.dungeon.layout.monsters = [monster];
    state.heroes = [createTestHero('Fearik', 6, 3)];

    monsterMove(state, monster);

    // Monster should pass through open door towards hero
    expect(monster.position.x).toBeGreaterThan(3);
    expect(
      state.actionLog.some((l) => l.key === 'logs.monsterAction.movedTowards'),
    ).toBe(true);
  });

  it('diagonal move cannot squeeze through closed door boundary', () => {
    const state = createTestState();
    // Closed door at (2, 2) facing RIGHT to (3, 2). Wall at (2, 1) and (3, 1).
    state.dungeon.layout.grid = [
      '#######',
      '##AA###',
      '#AAAAA#',
      '#AAAAA#',
      '#######',
    ];
    const door = createDoor(Side.RIGHT, 2, 2);
    door.open = false;
    state.dungeon.layout.doors = [door];

    const grid = createPassableGrid(state);
    // (2, 2) to (3, 2) is blocked by door
    expect(grid.isDoorBlocked(2, 2, 3, 2)).toBe(true);
    expect(grid.isPassableStep(2, 2, 3, 2)).toBe(false);
  });

  it('routes around other monsters without stepping on them', () => {
    const state = createTestState();
    const monster1 = createMonster(MonsterType.ORC, Colour.Green, 1, 1);
    const monster2 = createMonster(MonsterType.ORC, Colour.Red, 1, 2); // Directly in monster1's straight path
    monster1.movement = 3;
    state.dungeon.layout.monsters = [monster1, monster2];
    state.heroes = [createTestHero('Fearik', 1, 4)];

    monsterMove(state, monster1);

    // monster1 should route via x=2 instead of stepping on monster2 at (1, 2)
    expect(monster1.position).not.toEqual({ x: 1, y: 2 });
    expect(monster1.position.y).toBeGreaterThan(1);
  });

  it('chooses the closest reachable hero among multiple heroes', () => {
    const state = createTestState();
    const monster = createMonster(MonsterType.ORC, Colour.Green, 1, 1);
    monster.movement = 2;
    state.dungeon.layout.monsters = [monster];

    const closeHero = createTestHero('Fearik', 1, 3);
    const farHero = createTestHero('Helbran', 5, 5);
    state.heroes = [closeHero, farHero];

    monsterMove(state, monster);

    // Monster moves towards closeHero
    expect(monster.position).toEqual({ x: 1, y: 2 });
  });

  it('chooses reachable hero when closer hero is behind a closed door', () => {
    const state = createTestState();
    state.dungeon.layout.grid = [
      '#########',
      '#AAA#BBB#',
      '#AAA#BBB#',
      '#AAABBBB#',
      '#AAA#BBB#',
      '#AAA#BBB#',
      '#########',
    ];
    const door = createDoor(Side.RIGHT, 3, 3);
    door.open = false;
    state.dungeon.layout.doors = [door];

    const monster = createMonster(MonsterType.ORC, Colour.Green, 1, 1);
    monster.movement = 2;
    state.dungeon.layout.monsters = [monster];

    // heroBehindDoor is closer in Euclidean dist (x: 5, y: 1) but behind closed door
    const heroBehindDoor = createTestHero('Fearik', 5, 1);
    // heroInSameRoom is further (x: 1, y: 4) but reachable
    const heroInSameRoom = createTestHero('Helbran', 1, 4);
    state.heroes = [heroBehindDoor, heroInSameRoom];

    monsterMove(state, monster);

    // Monster should move towards reachable hero in same room
    expect(monster.position.x).toBe(1);
    expect(monster.position.y).toBeGreaterThan(1);
  });

  it('monsterActions executes full turn with pathfinding movement then attack', async () => {
    const state = createTestState();
    const monster = createMonster(MonsterType.ORC, Colour.Green, 1, 1);
    monster.actions = 2;
    monster.movement = 3;
    state.dungeon.layout.monsters = [monster];

    const hero = createTestHero('Fearik', 1, 3, 10);
    state.heroes = [hero];

    // Monster is at (1, 1), Hero at (1, 3).
    // Action 1: Move to (1, 2) which is adjacent to Hero.
    // Action 2: Melee attack Hero!
    await monsterActions(state, {
      delayBetweenMonsters: 0,
      delayBetweenActions: 0,
      delayAfterAttack: 0,
      waitForMovement: false,
    });

    expect(monster.position).toEqual({ x: 1, y: 2 });
    expect(
      state.actionLog.some((l) => l.key === 'logs.takeDamage.attackedWith'),
    ).toBe(true);
  });

  it('monsterActions executes multiple monsters sequentially with callbacks and delays', async () => {
    const state = createTestState();
    const monster1 = createMonster(MonsterType.ORC, Colour.Green, 1, 1);
    monster1.actions = 2;
    monster1.movement = 3;

    const monster2 = createMonster(MonsterType.ORC, Colour.Red, 2, 1);
    monster2.actions = 2;
    monster2.movement = 3;

    state.dungeon.layout.monsters = [monster1, monster2];

    const hero = createTestHero('Fearik', 1, 3, 20);
    state.heroes = [hero];

    const callbackHistory: number[] = [];
    const callbackTimes: number[] = [];

    await monsterActions(state, {
      delayBetweenMonsters: 20,
      delayBetweenActions: 10,
      delayAfterAttack: 10,
      waitForMovement: false,
      onActionCallback: (st) => {
        callbackHistory.push(st.actionLog.length);
        callbackTimes.push(Date.now());
      },
    });

    // Both monsters should have acted sequentially
    expect(monster1.position.y).toBeGreaterThan(1);
    expect(monster2.position.y).toBeGreaterThan(1);
    expect(callbackHistory.length).toBeGreaterThan(2);
    expect(
      state.actionLog.some(
        (l) =>
          l.key === 'logs.monsterAction.acted' &&
          l.properties?.monster === monster1.name,
      ),
    ).toBe(true);
    expect(
      state.actionLog.some(
        (l) =>
          l.key === 'logs.monsterAction.acted' &&
          l.properties?.monster === monster2.name,
      ),
    ).toBe(true);
  });

  it('monsterActions logs when no visible monsters are found', async () => {
    const state = createTestState();
    state.dungeon.layout.monsters = [];
    state.heroes = [createTestHero('Fearik', 1, 1)];

    await monsterActions(state, {
      delayBetweenMonsters: 0,
      delayBetweenActions: 0,
      delayAfterAttack: 0,
      waitForMovement: false,
    });

    expect(
      state.actionLog.some((l) => l.key === 'logs.monsterAction.noMonsterAct'),
    ).toBe(true);
  });
});
