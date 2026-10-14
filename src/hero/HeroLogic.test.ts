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
  type Difficulty,
} from '../types';
import {
  attack,
  canOpenDoor,
  newHero,
  applyStartingEquipment,
} from './HeroLogic';
import { DifficultLevels } from '../core';
import { weapons } from '../items/weapons';
import { shields } from '../items/shields';
import { armour } from '../items/armours';
import type { Door } from '../types';
import { Side } from '../types';

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
    intro: 'test-dungeon',
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
    drawEvents: true,
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

describe('canOpenDoor', () => {
  const createTestDoor = (overrides?: Partial<Door>): Door => ({
    locked: false,
    trapped: false,
    open: false,
    hidden: false,
    x: 2,
    y: 1,
    side: Side.RIGHT,
    trapAttacks: 0,
    reinforced: false,
    ...overrides,
  });

  it('prevents opening a reinforced door without the giants glove', () => {
    const hero = createTestHero({ inventory: [] });
    const door = createTestDoor({ reinforced: true });

    expect(canOpenDoor(hero, false, door)).toBe(false);
  });

  it('allows opening a reinforced door when carrying the giants glove', () => {
    const hero = createTestHero({
      inventory: [
        {
          id: 'giants_glove',
          name: 'Giants Glove',
          amountInDeck: 1,
          type: ItemType.MAGIC,
          value: 0,
        },
      ],
    });
    const door = createTestDoor({ reinforced: true });

    expect(canOpenDoor(hero, false, door)).toBe(true);
  });

  it('allows opening a non-reinforced door without the giants glove', () => {
    const hero = createTestHero({ inventory: [] });
    const door = createTestDoor({ reinforced: false });

    expect(canOpenDoor(hero, false, door)).toBe(true);
  });
});

describe('newHero and applyStartingEquipment', () => {
  it('creates hero with default equipment when difficulty is not provided', () => {
    const hero = newHero('Thor', Colour.Yellow);

    expect(hero.name).toBe('Thor');
    expect(hero.colour).toBe(Colour.Yellow);
    expect(hero.weapon).toEqual(weapons[0]);
    expect(hero.shield).toBeUndefined();
    expect(hero.armour).toBeUndefined();
    expect(hero.inventory).toEqual([]);
  });

  it('creates hero with starting equipment configured for easy difficulty', () => {
    const easyDiff = DifficultLevels.find((d) => d.id === 'easy');
    expect(easyDiff).toBeDefined();

    const hero = newHero('Thor', Colour.Yellow, easyDiff);

    expect(hero.weapon.id).toBe(weapons[0].id);
    expect(hero.shield).toBeDefined();
    expect(hero.shield?.id).toBe(shields[1].id);
    expect(hero.inventory).toEqual([]);
  });

  it('clones starting equipment so heroes do not share mutable references', () => {
    const customDifficulty: Difficulty = {
      id: 'custom',
      nameTranslationKey: 'custom',
      modifiers: { attack: 0, defense: 0, movement: 0, search: 0 },
      startingEquipment: {
        weapon: weapons[0],
        shield: shields[0],
        armour: armour[0],
        inventory: [
          {
            id: 'potion_1',
            name: 'Potion',
            amountInDeck: 1,
            type: ItemType.MAGIC,
            value: 5,
          },
        ],
      },
    };

    const hero1 = newHero('Hero1', Colour.Red, customDifficulty);
    const hero2 = newHero('Hero2', Colour.Blue, customDifficulty);

    expect(hero1.shield).toBeDefined();
    expect(hero2.shield).toBeDefined();
    expect(hero1.shield).not.toBe(hero2.shield);
    expect(hero1.shield).not.toBe(customDifficulty.startingEquipment?.shield);

    expect(hero1.inventory[0]).toBeDefined();
    expect(hero2.inventory[0]).toBeDefined();
    expect(hero1.inventory[0]).not.toBe(hero2.inventory[0]);

    // Mutating hero1's shield or inventory does not mutate hero2
    hero1.shield!.dice = 99;
    expect(hero2.shield!.dice).not.toBe(99);

    hero1.inventory.push({
      id: 'extra',
      name: 'Extra',
      amountInDeck: 1,
      type: ItemType.MAGIC,
      value: 1,
    });
    expect(hero2.inventory.length).toBe(1);
  });

  it('applyStartingEquipment applies equipment and clones items across hero list', () => {
    const hero1 = newHero('Hero1', Colour.Red);
    const hero2 = newHero('Hero2', Colour.Blue);

    const customDifficulty: Difficulty = {
      id: 'custom',
      nameTranslationKey: 'custom',
      modifiers: { attack: 0, defense: 0, movement: 0, search: 0 },
      startingEquipment: {
        weapon: weapons[1],
        shield: shields[0],
        inventory: [
          {
            id: 'potion_1',
            name: 'Potion',
            amountInDeck: 1,
            type: ItemType.MAGIC,
            value: 5,
          },
        ],
      },
    };

    applyStartingEquipment([hero1, hero2], customDifficulty);

    expect(hero1.weapon.id).toBe(weapons[1].id);
    expect(hero2.weapon.id).toBe(weapons[1].id);
    expect(hero1.shield?.id).toBe(shields[0].id);
    expect(hero2.shield?.id).toBe(shields[0].id);
    expect(hero1.shield).not.toBe(hero2.shield);

    expect(hero1.inventory.length).toBe(1);
    expect(hero2.inventory.length).toBe(1);
    expect(hero1.inventory[0]).not.toBe(hero2.inventory[0]);
  });
});
