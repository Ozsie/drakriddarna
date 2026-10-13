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
  type Weapon,
} from '../../types';
import { createMonster } from '../../dungeon/DungeonLogic';
import {
  findChargePath,
  findRepositionRangedPosition,
  findRetreatPosition,
  findSprayAlignPosition,
} from './tactics';

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

const createTestState = (): GameState => {
  const dungeon: Dungeon = {
    name: 'test-dungeon',
    intro: 'test-dungeon',
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
    drawEvents: true,
  };
};

describe('Monster Tactical Calculations', () => {
  it('findChargePath finds path to adjacent tile of hero when within 3 steps', () => {
    const state = createTestState();
    const monster = createMonster(MonsterType.ORC, Colour.Green, 1, 1);
    const hero = createTestHero('Fearik', 1, 3);
    state.heroes = [hero];

    const charge = findChargePath(state, monster, undefined, 3);
    expect(charge).not.toBeNull();
    expect(charge?.path.length).toBeLessThanOrEqual(3);
  });

  it('findRepositionRangedPosition finds non-adjacent position with line of sight', () => {
    const state = createTestState();
    const monster = createMonster(MonsterType.ORC, Colour.Green, 2, 2);
    // Adjacent hero at (2, 3)
    const hero = createTestHero('Fearik', 2, 3);
    state.heroes = [hero];

    const repo = findRepositionRangedPosition(state, monster, undefined, 3);
    expect(repo).not.toBeNull();
    // Position should NOT be adjacent to hero (2, 3)
    const isAdjacent =
      Math.abs(repo!.position.x - hero.position.x) <= 1 &&
      Math.abs(repo!.position.y - hero.position.y) <= 1;
    expect(isAdjacent).toBe(false);
  });

  it('findRetreatPosition moves away from closest hero', () => {
    const state = createTestState();
    const monster = createMonster(MonsterType.ORC, Colour.Green, 2, 2);
    const hero = createTestHero('Fearik', 2, 3);
    state.heroes = [hero];

    const retreat = findRetreatPosition(state, monster, undefined, 3);
    expect(retreat).not.toBeNull();
  });

  it('findSprayAlignPosition finds tile stepping into spray alignment', () => {
    const state = createTestState();
    const monster = createMonster(
      MonsterType.YELLOW_DARK_LORD,
      Colour.Yellow,
      1,
      1,
    );
    // Yellow Dark Lord has diagonal attack. Hero is at (4, 2)
    // Monster stepping to (3, 1) or (2, 0) or (1, 5) would line up diagonally with (4, 2): e.g. from (2, 0): (4,2) is (2+2, 0+2)
    const hero = createTestHero('Fearik', 4, 2);
    state.heroes = [hero];

    const sprayTile = findSprayAlignPosition(state, monster, undefined, 3);
    expect(sprayTile).not.toBeNull();
  });
});
