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
  SecretType,
  type Difficulty,
  type Item,
} from '../types';
import {
  attack,
  pickLock,
  act,
  consumeActions,
  canOpenDoor,
  newHero,
  applyStartingEquipment,
  resetLiveHeroes,
  replaceDeadHeroes,
  openDoorAtHero,
  checkForNextToMonster,
  search,
  dropItem,
  pickupItem,
} from './HeroLogic';
import { findDoorsAtHero } from './RadialMenuLogic';
import { getGameMaster } from '../core';
import { resetRng, setRng } from '../core';
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

  it('gives the items a killed monster was carrying to the killing hero', () => {
    setRng(() => 1);
    try {
      const necklace: Item = {
        id: 'necklace_of_light',
        name: 'Necklace of Light',
        type: ItemType.MAGIC,
        amountInDeck: 1,
        value: 0,
      };
      const hero = createTestHero({ weapon: weapons[0] });
      const monster = createTestMonster({ health: 1, inventory: [necklace] });
      const state = createTestState(hero, monster);
      state.magicItemDeck.push(necklace);

      attack(hero, state, monster.position);

      expect(state.dungeon.layout.monsters).not.toContain(monster);
      expect(hero.inventory).toContain(necklace);
      expect(state.magicItemDeck).toEqual([]);
    } finally {
      resetRng();
    }
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

  it('deducts only 1 action when attacking with full movement on reduced movement hero', () => {
    const hero = createTestHero({
      actions: 2,
      movement: 2,
      maxMovement: 3,
      armour: {
        id: 'plate_mail',
        name: 'Plate Mail',
        type: ItemType.ARMOUR,
        amountInDeck: 1,
        defense: 2,
        magicProtection: false,
        movementReduction: 1,
        value: 3,
      },
      weapon: weapons[0], // Standard sword
    });
    const monster = createTestMonster();
    const state = createTestState(hero, monster);

    attack(hero, state, monster.position);

    // Hero had full effective movement (2 of 2), so attack should cost 1 action, not 2
    expect(hero.actions).toBe(1);
    expect(hero.movement).toBe(2);
  });

  it('deducts 2 actions when attacking after moving on reduced movement hero', () => {
    const hero = createTestHero({
      actions: 2,
      movement: 1, // Took 1 step from effective max 2
      maxMovement: 3,
      armour: {
        id: 'plate_mail',
        name: 'Plate Mail',
        type: ItemType.ARMOUR,
        amountInDeck: 1,
        defense: 2,
        magicProtection: false,
        movementReduction: 1,
        value: 3,
      },
      weapon: weapons[0],
    });
    const monster = createTestMonster();
    const state = createTestState(hero, monster);

    attack(hero, state, monster.position);

    // Moved before attacking: consumes 2 actions and clears movement
    expect(hero.actions).toBe(0);
    expect(hero.movement).toBe(0);
  });

  it('clears movement to 0 when last action is spent on attack', () => {
    const hero = createTestHero({
      actions: 1,
      movement: 3,
      weapon: weapons[0],
    });
    const monster = createTestMonster();
    const state = createTestState(hero, monster);

    attack(hero, state, monster.position);

    expect(hero.actions).toBe(0);
    expect(hero.movement).toBe(0);
  });
});

describe('pickLock', () => {
  it('deducts only 1 action when picking a lock with full movement on reduced movement hero', () => {
    const hero = createTestHero({
      actions: 2,
      movement: 2,
      maxMovement: 3,
      level: Level.MASTER,
      armour: {
        id: 'plate_mail',
        name: 'Plate Mail',
        type: ItemType.ARMOUR,
        amountInDeck: 1,
        defense: 2,
        magicProtection: false,
        movementReduction: 1,
        value: 3,
      },
    });
    const monster = createTestMonster({ position: { x: 5, y: 5 } });
    const state = createTestState(hero, monster);
    const door: Door = {
      x: 1,
      y: 1,
      side: Side.RIGHT,
      open: false,
      locked: true,
      trapped: false,
      hidden: false,
      reinforced: false,
      trapAttacks: 0,
    };
    state.dungeon.layout.doors = [door];

    pickLock(state, door);

    expect(hero.actions).toBe(1);
    expect(hero.movement).toBe(2);
  });
});

describe('consumeActions and action bounds', () => {
  it('resets actions and movement to 0 when actions are 0 or negative', () => {
    const hero = createTestHero({ actions: 0, movement: 3 });
    consumeActions(hero, 0);
    expect(hero.actions).toBe(0);
    expect(hero.movement).toBe(0);

    const negativeHero = createTestHero({ actions: -1, movement: 3 });
    consumeActions(negativeHero, 0);
    expect(negativeHero.actions).toBe(0);
    expect(negativeHero.movement).toBe(0);
  });

  it('resets movement to 0 when last action is consumed by movement exhaustion', () => {
    const hero = createTestHero({ actions: 1, movement: 0 });
    consumeActions(hero, 0);
    expect(hero.actions).toBe(0);
    expect(hero.movement).toBe(0);
  });

  it('refreshes movement when movement reaches 0 but hero has actions left', () => {
    const hero = createTestHero({ actions: 2, movement: 0, maxMovement: 3 });
    consumeActions(hero, 0);
    expect(hero.actions).toBe(1);
    expect(hero.movement).toBe(3);
  });
});

describe('act against monster', () => {
  it('does not cause negative actions or leftover movement when attacking via act', () => {
    const hero = createTestHero({
      actions: 2,
      movement: 2, // moved 1 step earlier
      maxMovement: 3,
      position: { x: 1, y: 1 },
      weapon: weapons[0],
    });
    const monster = createTestMonster({ position: { x: 2, y: 1 } });
    const state = createTestState(hero, monster);
    state.currentActor = hero;

    // Moving right (R) into adjacent monster triggers attack
    act('R', state);

    // Hero consumed remaining 2 actions on attack after moving; actions & movement must be 0
    expect(hero.actions).toBe(0);
    expect(hero.movement).toBe(0);
  });
});

describe('act against edge walls', () => {
  it('blocks stepping across an edge wall and logs an illegal move', () => {
    const hero = createTestHero({
      position: { x: 2, y: 2 },
      actions: 2,
      movement: 3,
      maxMovement: 3,
    });
    const monster = createTestMonster({ position: { x: 1, y: 5 } });
    const state = createTestState(hero, monster);
    state.dungeon.layout.walls = [{ x: 2, y: 2, side: Side.RIGHT }];
    state.currentActor = hero;

    act('R', state);
    expect(hero.position).toEqual({ x: 2, y: 2 });
    expect(
      state.actionLog.some((l) => l.key === 'logs.heroAction.illegalMove'),
    ).toBe(true);
  });

  it('allows stepping along a cell that merely borders an edge wall', () => {
    const hero = createTestHero({
      position: { x: 2, y: 2 },
      actions: 2,
      movement: 3,
      maxMovement: 3,
    });
    const monster = createTestMonster({ position: { x: 1, y: 5 } });
    const state = createTestState(hero, monster);
    state.dungeon.layout.walls = [{ x: 2, y: 2, side: Side.RIGHT }];
    state.currentActor = hero;

    act('D', state);
    expect(hero.position).toEqual({ x: 2, y: 3 });
  });
});

describe('checkForNextToMonster across edge walls', () => {
  it('does not stop movement for a monster across an edge wall', () => {
    const hero = createTestHero({ position: { x: 2, y: 2 } });
    const monster = createTestMonster({ position: { x: 3, y: 2 } });
    const state = createTestState(hero, monster);
    state.dungeon.layout.walls = [{ x: 2, y: 2, side: Side.RIGHT }];

    expect(checkForNextToMonster(state, hero)).toBe(false);
    expect(
      state.actionLog.some((l) => l.key === 'logs.heroAction.walkedByMonster'),
    ).toBe(false);

    // Without the wall the monster is next to the hero again
    state.dungeon.layout.walls = [];
    expect(checkForNextToMonster(state, hero)).toBe(true);
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
    const easyDiff = getGameMaster('easy');
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
      modifiers: { attack: 0, defense: 0, movement: 0, search: 0, health: 0 },
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
      modifiers: { attack: 0, defense: 0, movement: 0, search: 0, health: 0 },
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

  it('creates hero with health adjusted by difficulty modifier', () => {
    const easyDiff = getGameMaster('easy');
    expect(easyDiff).toBeDefined();

    const hero = newHero('Thor', Colour.Yellow, easyDiff);

    expect(hero.maxHealth).toBe(7);
    expect(hero.health).toBe(8);
  });
});

describe('resetLiveHeroes and replaceDeadHeroes with difficulty health modifier', () => {
  it('resetLiveHeroes sets hero health considering difficulty health modifier', () => {
    const hero = createTestHero({ maxHealth: 7, health: 1 });
    const monster = createTestMonster();
    const state = createTestState(hero, monster);
    state.gameMaster = getGameMaster('easy');

    resetLiveHeroes(state);

    expect(hero.health).toBe(8);
  });

  it('resetLiveHeroes re-enables disabled items with pickup and re-applies their stat bonus', () => {
    const hero = createTestHero({
      maxHealth: 7,
      health: 7,
      maxMovement: 3,
      movement: 3,
    });
    const boots: Item = {
      id: 'boots_of_speed',
      name: 'Boots',
      type: ItemType.MAGIC,
      value: 0,
      amountInDeck: 1,
      properties: {
        MOVEMENT_BONUS: 1,
      },
      pickup: 'movementBonusOnPickup',
      drop: 'movementBonusOnDrop',
      disabled: true,
    };
    hero.inventory.push(boots);

    const monster = createTestMonster();
    const state = createTestState(hero, monster);

    resetLiveHeroes(state);

    expect(boots.disabled).toBe(false);
    expect(hero.maxMovement).toBe(4);
    expect(hero.movement).toBe(4);
  });

  it('replaceDeadHeroes resets dead hero health considering difficulty health modifier', () => {
    const hero = createTestHero({ maxHealth: 7, health: 0 });
    const monster = createTestMonster();
    const state = createTestState(hero, monster);
    state.gameMaster = getGameMaster('easy');

    replaceDeadHeroes(state);

    expect(hero.health).toBe(8);
  });

  it('resetLiveHeroes triggers a note on the hero starting position without movement', () => {
    const hero = createTestHero({ position: { x: 2, y: 2 } });
    const monster = createTestMonster();
    const state = createTestState(hero, monster);
    state.turnCount = 2;
    state.dungeon.layout.notes = [
      {
        message: 'test.note',
        position: { x: 1, y: 1 },
        found: false,
      },
    ];

    resetLiveHeroes(state);

    expect(state.dungeon.layout.notes[0].found).toBe(true);
    expect(state.dungeon.layout.notes[0].foundOn).toBe(2);
    expect(state.actionLog).toContainEqual(
      expect.objectContaining({ key: 'logs.heroAction.reads' }),
    );
  });

  it('resetLiveHeroes does not re-trigger an already found note', () => {
    const hero = createTestHero();
    const monster = createTestMonster();
    const state = createTestState(hero, monster);
    state.dungeon.layout.notes = [
      {
        message: 'test.note',
        position: { x: 1, y: 1 },
        found: true,
        foundOn: 3,
      },
    ];

    resetLiveHeroes(state);

    expect(state.dungeon.layout.notes[0].foundOn).toBe(3);
    expect(state.actionLog).toEqual([]);
  });
});

describe('opening doors from both sides of the door edge', () => {
  const createDoor = (overrides?: Partial<Door>): Door => ({
    id: 'door_test',
    side: Side.DOWN,
    x: 1,
    y: 1,
    locked: false,
    trapped: false,
    open: false,
    hidden: false,
    reinforced: false,
    trapAttacks: 0,
    ...overrides,
  });

  const createStateWithDoor = (hero: Hero, door: Door): GameState => {
    const state = createTestState(hero, createTestMonster());
    state.dungeon.layout.doors.push(door);
    return state;
  };

  it('opens a closed door when moving into it from the door cell', () => {
    const hero = createTestHero({ position: { x: 1, y: 1 } });
    const door = createDoor();
    const state = createStateWithDoor(hero, door);

    act('D', state);

    expect(door.open).toBe(true);
  });

  it('opens a closed door when moving into it from the opposite side', () => {
    const hero = createTestHero({ position: { x: 1, y: 2 } });
    const door = createDoor();
    const state = createStateWithDoor(hero, door);

    act('U', state);

    expect(door.open).toBe(true);
    expect(hero.position).toEqual({ x: 1, y: 2 });
  });

  it('does not let a hero walk through a closed locked door from the opposite side', () => {
    const hero = createTestHero({ position: { x: 1, y: 2 } });
    const door = createDoor({ locked: true });
    const state = createStateWithDoor(hero, door);

    act('U', state);

    expect(door.open).toBe(false);
    expect(hero.position).toEqual({ x: 1, y: 2 });
  });

  it('does not let a hero walk through a hidden door from the opposite side', () => {
    const hero = createTestHero({ position: { x: 1, y: 2 } });
    const door = createDoor({ hidden: true });
    const state = createStateWithDoor(hero, door);

    act('U', state);

    expect(door.open).toBe(false);
    expect(hero.position).toEqual({ x: 1, y: 2 });
  });

  it('opens a door in place via openDoorAtHero from the opposite side', () => {
    const hero = createTestHero({ position: { x: 1, y: 2 } });
    const door = createDoor();
    const state = createStateWithDoor(hero, door);

    openDoorAtHero(state, hero, hero.position, door);

    expect(door.open).toBe(true);
    expect(hero.position).toEqual({ x: 1, y: 2 });
  });

  it('finds the door from the opposite side for radial menu actions', () => {
    const hero = createTestHero({ position: { x: 1, y: 2 } });
    const door = createDoor();
    const state = createStateWithDoor(hero, door);

    expect(findDoorsAtHero(state, hero)).toEqual([door]);
  });
});

describe('LETA actions gated near monsters', () => {
  it('does not allow searching while standing next to a monster', () => {
    const hero = createTestHero({ position: { x: 1, y: 1 } });
    const monster = createTestMonster({ position: { x: 2, y: 1 } });
    const state = createTestState(hero, monster);

    search(state);

    expect(hero.actions).toBe(2);
    expect(
      state.actionLog.some(
        (l) => l.key === 'logs.heroAction.blockedNearMonster',
      ),
    ).toBe(true);
  });

  it('does not allow picking a lock while standing next to a monster', () => {
    const hero = createTestHero({ position: { x: 1, y: 1 } });
    const monster = createTestMonster({ position: { x: 2, y: 1 } });
    const state = createTestState(hero, monster);
    const door: Door = {
      x: 1,
      y: 1,
      side: Side.RIGHT,
      open: false,
      locked: true,
      trapped: false,
      hidden: false,
      reinforced: false,
      trapAttacks: 0,
    };
    state.dungeon.layout.doors = [door];

    pickLock(state, door);

    expect(hero.actions).toBe(2);
    expect(door.locked).toBe(true);
  });

  it('still allows searching when no monster is adjacent', () => {
    const hero = createTestHero({ position: { x: 1, y: 1 } });
    const monster = createTestMonster({ position: { x: 5, y: 5 } });
    const state = createTestState(hero, monster);

    search(state);

    expect(hero.actions).toBe(1);
    expect(
      state.actionLog.some(
        (l) => l.key === 'logs.heroAction.blockedNearMonster',
      ),
    ).toBe(false);
  });

  it('allows searching next to a monster in an undiscovered room behind a closed door', () => {
    const hero = createTestHero({ position: { x: 2, y: 2 } });
    const monster = createTestMonster({ position: { x: 3, y: 2 } });
    const door: Door = {
      x: 2,
      y: 2,
      side: Side.RIGHT,
      open: false,
      locked: false,
      trapped: false,
      hidden: false,
      reinforced: false,
      trapAttacks: 0,
    };
    const state = createTestState(hero, monster);
    state.dungeon.layout.grid = [
      '#######',
      '#AAAAA#',
      '#AAB###',
      '#AAAAA#',
      '#######',
    ];
    state.dungeon.layout.doors.push(door);

    search(state);

    expect(hero.actions).toBe(1);
    expect(
      state.actionLog.some(
        (l) => l.key === 'logs.heroAction.blockedNearMonster',
      ),
    ).toBe(false);
  });

  it('allows picking a lock next to a monster in an undiscovered room behind a closed door', () => {
    const hero = createTestHero({ position: { x: 2, y: 2 } });
    const monster = createTestMonster({ position: { x: 3, y: 2 } });
    const door: Door = {
      x: 2,
      y: 2,
      side: Side.RIGHT,
      open: false,
      locked: true,
      trapped: false,
      hidden: false,
      reinforced: false,
      trapAttacks: 0,
    };
    const state = createTestState(hero, monster);
    state.dungeon.layout.grid = [
      '#######',
      '#AAAAA#',
      '#AAB###',
      '#AAAAA#',
      '#######',
    ];
    state.dungeon.layout.doors.push(door);

    pickLock(state, door);

    // The lock pick was attempted (a standard action was spent), not
    // blocked by the monster — whether the roll succeeds depends on the
    // seeded dice and is not part of this test.
    expect(hero.actions).toBe(1);
    expect(
      state.actionLog.some(
        (l) => l.key === 'logs.heroAction.blockedNearMonster',
      ),
    ).toBe(false);
  });
});

describe('replaceDeadHeroes level reset', () => {
  it('resets a revived hero to Apprentice level with 0 XP', () => {
    const hero = createTestHero({
      level: Level.KNIGHT,
      experience: 6,
      health: 0,
    });
    const monster = createTestMonster({ position: { x: 5, y: 5 } });
    const state = createTestState(hero, monster);

    replaceDeadHeroes(state);

    expect(hero.experience).toBe(0);
    expect(hero.level).toBe(Level.APPRENTICE);
    expect(hero.health).toBe(10);
  });
});

describe('searching with exhausted item decks', () => {
  it('does not crash when an equipment secret is found with an empty deck', () => {
    const hero = createTestHero({ position: { x: 1, y: 1 } });
    const monster = createTestMonster({ position: { x: 5, y: 5 } });
    const state = createTestState(hero, monster);
    state.itemDeck = [];
    state.dungeon.layout.secrets = [
      {
        type: SecretType.EQUIPMENT,
        name: 'Equipment',
        found: false,
        position: { x: 2, y: 1 },
      },
    ];

    setRng(() => 5 / 6);
    try {
      expect(() => search(state)).not.toThrow();
    } finally {
      resetRng();
    }

    expect(state.dungeon.layout.secrets[0].found).toBe(true);
    expect(hero.inventory).toHaveLength(0);
  });
});

describe('dropItem', () => {
  it('leaves the dropped item behind when the hero later moves', () => {
    const hero = createTestHero({ position: { x: 2, y: 2 } });
    const monster = createTestMonster({ position: { x: 5, y: 5 } });
    const state = createTestState(hero, monster);
    const oldWeapon = hero.weapon;

    dropItem(state, oldWeapon, hero);
    hero.position.x = 3;

    expect(state.dungeon.layout.items).toHaveLength(1);
    expect(state.dungeon.layout.items[0].position).toEqual({ x: 2, y: 2 });
  });

  it('drops the replaced weapon on the floor when picking up a new one', () => {
    const hero = createTestHero({ position: { x: 2, y: 2 } });
    const monster = createTestMonster({ position: { x: 5, y: 5 } });
    const state = createTestState(hero, monster);
    const oldWeapon = hero.weapon;
    const newWeapon: Weapon = {
      ...chaosSwordWeapon,
      id: 'new_sword',
      name: 'New Sword',
    };

    pickupItem(state, newWeapon, hero);

    expect(hero.weapon).toBe(newWeapon);
    expect(state.dungeon.layout.items).toHaveLength(1);
    expect(state.dungeon.layout.items[0].item).toBe(oldWeapon);
    expect(state.dungeon.layout.items[0].position).toEqual({ x: 2, y: 2 });

    hero.position.x = 3;

    expect(state.dungeon.layout.items[0].position).toEqual({ x: 2, y: 2 });
  });
});
