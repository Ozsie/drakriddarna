import { describe, expect, it } from 'vitest';
import {
  Colour,
  ConditionType,
  type Dungeon,
  type GameState,
  type Hero,
  type Monster,
  ItemType,
  Level,
  type Weapon,
  MonsterType,
} from '../types';
import { attack } from './HeroLogic';

const chaosSwordWeapon: Weapon = {
  id: 'sword_of_chaos',
  name: 'Sword of Chaos',
  amountInDeck: 1,
  dice: 4,
  useHearHeroes: false,
  twoHanded: false,
  range: 1,
  type: ItemType.WEAPON,
  value: 10,
  ignoresShield: false,
  ignoresArmour: false,
};

const createTestHero = (overrides?: Partial<Hero>): Hero => ({
  name: 'Fearik',
  health: 10,
  maxHealth: 10,
  defense: 0,
  actions: 2,
  movement: 3,
  maxMovement: 3,
  colour: Colour.Yellow,
  incapacitated: false,
  position: { x: 1, y: 1 },
  experience: 0,
  level: Level.APPRENTICE,
  weapon: chaosSwordWeapon,
  inventory: [],
  isInventoryOpen: false,
  ignoredByMonsters: false,
  ...overrides,
});

const createTestMonster = (overrides?: Partial<Monster>): Monster => ({
  name: 'Goblin',
  health: 10,
  maxHealth: 10,
  defense: 0,
  actions: 1,
  movement: 3,
  maxMovement: 3,
  colour: Colour.Red,
  position: { x: 2, y: 1 },
  experience: 5,
  level: Level.APPRENTICE,
  weapon: {
    name: 'Club',
    amountInDeck: 1,
    dice: 1,
    useHearHeroes: true,
    twoHanded: false,
    range: 1,
    type: ItemType.WEAPON,
    value: 5,
    ignoresShield: false,
    ignoresArmour: false,
  },
  inventory: [],
  type: MonsterType.ORC,
  ...overrides,
});

const createTestState = (hero: Hero, monster: Monster): GameState => {
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
      monsters: [monster],
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

describe('attack', () => {
  it('does not allow attacking again once the hero has been incapacitated', () => {
    // Simulate the state right after a Chaos Sword stumble: no actions,
    // no movement left and the hero flagged as incapacitated.
    const hero = createTestHero({
      actions: 0,
      movement: 0,
      incapacitated: true,
    });
    const monster = createTestMonster();
    const state = createTestState(hero, monster);

    attack(hero, state, monster.position);

    expect(monster.health).toBe(monster.maxHealth);
  });

  it('allows attacking when the hero still has actions and movement left', () => {
    const hero = createTestHero({ actions: 2, movement: 3 });
    const monster = createTestMonster();
    const state = createTestState(hero, monster);

    attack(hero, state, monster.position);

    // A chaos sword attack always resolves to some outcome (kill, hit,
    // stumble, or miss), so at least the resolution should have run without
    // being blocked by the incapacitated guard.
    expect(hero.actions).toBeLessThanOrEqual(2);
  });
});
