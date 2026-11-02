import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createDamageIndicator,
  createIndicator,
  doorAsActor,
  getDamageString,
  getEffectiveMaxMovement,
  getEffectiveMaxHealth,
  processActorDowned,
  removeDamageIndicator,
  takeDamage,
} from './combat';
import { setRng, resetRng } from './dice';
import { Colour, ItemType, Level, MonsterType, Side } from '../types';
import type {
  Actor,
  Dungeon,
  GameState,
  Hero,
  Item,
  Monster,
  Weapon,
} from '../types';

const dummyDungeon: Dungeon = {
  name: 'Test',
  intro: 'test-dungeon',
  layout: {
    grid: [],
    corridors: [],
    doors: [],
    items: [],
    monsters: [],
    notes: [],
    pillars: [],
    pits: [],
    secrets: [],
    corners: [],
  },
  startingPositions: [],
  discoveredRooms: [],
  winConditions: [],
  beaten: false,
  killCount: 0,
};

describe('combat module', () => {
  beforeEach(() => {
    resetRng();
  });

  afterEach(() => {
    resetRng();
  });

  it('getEffectiveMaxMovement accounts for armour reduction', () => {
    const actor: Actor = {
      name: 'Hero',
      actions: 2,
      movement: 3,
      maxMovement: 3,
      defense: 0,
      health: 7,
      maxHealth: 7,
      colour: Colour.Blue,
      experience: 0,
      position: { x: 0, y: 0 },
      level: Level.APPRENTICE,
      weapon: {
        name: 'Sword',
        dice: 2,
        amountInDeck: 1,
        range: 1,
        twoHanded: false,
        useHearHeroes: true,
        type: ItemType.WEAPON,
        value: 10,
        ignoresArmour: false,
        ignoresShield: false,
      },
      inventory: [],
      armour: {
        name: 'Heavy Armour',
        defense: 2,
        magicProtection: false,
        movementReduction: 1,
        amountInDeck: 1,
        type: ItemType.ARMOUR,
        value: 15,
      },
    };

    expect(getEffectiveMaxMovement(actor)).toBe(2);
  });

  it('getEffectiveMaxHealth applies health modifier to maxHealth', () => {
    const actor: Actor = {
      name: 'Hero',
      actions: 2,
      movement: 3,
      maxMovement: 3,
      defense: 0,
      health: 7,
      maxHealth: 7,
      colour: Colour.Blue,
      experience: 0,
      position: { x: 0, y: 0 },
      level: Level.APPRENTICE,
      weapon: {
        name: 'Sword',
        dice: 2,
        amountInDeck: 1,
        range: 1,
        twoHanded: false,
        useHearHeroes: true,
        type: ItemType.WEAPON,
        value: 10,
        ignoresArmour: false,
        ignoresShield: false,
      },
      inventory: [],
    };

    expect(getEffectiveMaxHealth(actor, 0)).toBe(7);
    expect(getEffectiveMaxHealth(actor, -1)).toBe(6);
    expect(getEffectiveMaxHealth(actor, 2)).toBe(9);
  });

  it('doorAsActor converts door trap into actor', () => {
    const doorActor = doorAsActor({
      side: Side.UP,
      x: 1,
      y: 2,
      locked: false,
      trapped: true,
      open: false,
      hidden: false,
      trapAttacks: 3,
      reinforced: false,
    });

    expect(doorActor.name).toBe('Door');
    expect(doorActor.weapon.dice).toBe(3);
    expect(doorActor.weapon.ignoresShield).toBe(true);
    expect(doorActor.level).toBe(Level.APPRENTICE);
  });

  it('doorAsActor uses the door level as the trap dice', () => {
    const doorActor = doorAsActor({
      side: Side.UP,
      x: 1,
      y: 2,
      locked: false,
      trapped: true,
      open: false,
      hidden: false,
      trapAttacks: 2,
      reinforced: false,
      level: Level.LORD,
    });

    expect(doorActor.level).toBe(Level.LORD);
  });

  it('sprung trap rolls the door level dice', () => {
    // 3.5/6 gives a die roll of 4: a hit for knight dice (4+), a miss for
    // the default apprentice dice (5+)
    setRng(() => 3.5 / 6);
    const hero = {
      name: 'Fearik',
      health: 10,
      maxHealth: 10,
      defense: 0,
      level: Level.APPRENTICE,
      position: { x: 1, y: 2 },
      inventory: [],
    } as unknown as Hero;
    const state: GameState = {
      heroes: [hero],
      dungeon: dummyDungeon,
      actionLog: [],
      itemDeck: [],
      magicItemDeck: [],
      settings: {},
      eventDeck: [],
      reRender: false,
      drawEvents: true,
    };
    const door = {
      side: Side.UP,
      x: 1,
      y: 2,
      locked: false,
      trapped: true,
      open: false,
      hidden: false,
      trapAttacks: 1,
      reinforced: false,
    };

    takeDamage(state, doorAsActor(door), hero, false);
    expect(hero.health).toBe(10);

    takeDamage(
      state,
      doorAsActor({ ...door, level: Level.KNIGHT }),
      hero,
      false,
    );
    expect(hero.health).toBe(9);
  });

  it('getDamageString formats breakdown string', () => {
    const target: Actor = {
      name: 'Target',
      actions: 1,
      movement: 2,
      maxMovement: 2,
      defense: 1,
      health: 5,
      maxHealth: 5,
      colour: Colour.Red,
      experience: 0,
      position: { x: 0, y: 0 },
      level: Level.APPRENTICE,
      weapon: {
        name: 'Club',
        dice: 1,
        amountInDeck: 1,
        range: 1,
        twoHanded: false,
        useHearHeroes: true,
        type: ItemType.WEAPON,
        value: 5,
        ignoresArmour: false,
        ignoresShield: false,
      },
      inventory: [],
    };

    const str = getDamageString(2, 3, 0, target);
    expect(str).toBe('2 damage (3-(1+0)=2)');
  });

  it('takeDamage resolves damage, updates health, and logs event', () => {
    // 5/6 gives dice roll 6 (success for KNIGHT)
    setRng(() => 5 / 6);

    const source: Actor = {
      name: 'Attacker',
      actions: 2,
      movement: 3,
      maxMovement: 3,
      defense: 0,
      health: 7,
      maxHealth: 7,
      colour: Colour.Blue,
      experience: 0,
      position: { x: 0, y: 0 },
      level: Level.KNIGHT,
      weapon: {
        name: 'Sword',
        dice: 3,
        amountInDeck: 1,
        range: 1,
        twoHanded: false,
        useHearHeroes: true,
        type: ItemType.WEAPON,
        value: 10,
        ignoresArmour: false,
        ignoresShield: false,
      },
      inventory: [],
    };

    const target: Actor = {
      name: 'Defender',
      actions: 1,
      movement: 2,
      maxMovement: 2,
      defense: 1,
      health: 5,
      maxHealth: 5,
      colour: Colour.Red,
      experience: 0,
      position: { x: 1, y: 0 },
      level: Level.APPRENTICE,
      weapon: {
        name: 'Club',
        dice: 1,
        amountInDeck: 1,
        range: 1,
        twoHanded: false,
        useHearHeroes: true,
        type: ItemType.WEAPON,
        value: 5,
        ignoresArmour: false,
        ignoresShield: false,
      },
      inventory: [],
    };

    const state: GameState = {
      heroes: [source],
      dungeon: dummyDungeon,
      actionLog: [],
      itemDeck: [],
      magicItemDeck: [],
      settings: {},
      eventDeck: [],
      reRender: false,
      drawEvents: true,
    };

    takeDamage(state, source, target, false);
    // 3 hits - 1 defense = 2 damage; health: 5 - 2 = 3
    expect(target.health).toBe(3);
    expect(state.actionLog.length).toBeGreaterThan(0);
    expect(state.damageIndicators).toBeDefined();
    expect(state.damageIndicators?.length).toBe(1);
    expect(state.damageIndicators?.[0].damage).toBe(2);
    expect(state.damageIndicators?.[0].position).toEqual({ x: 1, y: 0 });
  });

  describe('monster deaths by non-hero damage (hazard kills)', () => {
    const weapon = (name: string, overrides: Partial<Weapon> = {}): Weapon => ({
      name,
      dice: 3,
      amountInDeck: 1,
      range: 1,
      twoHanded: false,
      useHearHeroes: true,
      type: ItemType.WEAPON,
      value: 0,
      ignoresArmour: false,
      ignoresShield: false,
      ...overrides,
    });

    const createHazard = (): Actor => ({
      name: 'Earthquake',
      actions: 0,
      movement: 0,
      maxMovement: 0,
      defense: 0,
      health: 1,
      maxHealth: 1,
      colour: Colour.Red,
      experience: 0,
      position: { x: 0, y: 0 },
      level: Level.KNIGHT,
      weapon: weapon('boulder'),
      inventory: [],
    });

    const createHero = (): Hero => ({
      name: 'Fearik',
      actions: 2,
      movement: 5,
      maxMovement: 5,
      defense: 0,
      health: 5,
      maxHealth: 10,
      colour: Colour.Yellow,
      incapacitated: false,
      position: { x: 0, y: 1 },
      experience: 0,
      level: Level.KNIGHT,
      weapon: weapon('Sword'),
      inventory: [],
      isInventoryOpen: false,
      ignoredByMonsters: false,
      walkSound: '',
      hurtSound: '',
      deathSound: '',
    });

    const createMonster = (carried: Item[]): Monster =>
      ({
        name: 'Troll',
        type: MonsterType.TROLL,
        health: 1,
        maxHealth: 1,
        defense: 0,
        actions: 0,
        movement: 0,
        maxMovement: 0,
        colour: Colour.Red,
        position: { x: 2, y: 0 },
        experience: 2,
        level: Level.APPRENTICE,
        inventory: carried,
        weapon: weapon('Club'),
      }) as unknown as Monster;

    const createState = (hero: Hero, monster: Monster): GameState => ({
      heroes: [hero],
      dungeon: {
        ...dummyDungeon,
        killCount: 0,
        layout: {
          ...dummyDungeon.layout,
          monsters: [monster],
          items: [],
        },
      },
      actionLog: [],
      itemDeck: [],
      magicItemDeck: [],
      settings: {},
      eventDeck: [],
      reRender: false,
      drawEvents: true,
    });

    const carriedItem: Item = {
      id: 'giants_glove',
      name: "Giant's Glove",
      type: ItemType.MAGIC,
      amountInDeck: 1,
      value: 0,
    };

    it('removes the monster, drops its inventory where it stood and grants no XP or killCount credit', () => {
      // 5/6 gives dice roll 6 (success for KNIGHT): 3 hits, 1 health monster dies
      setRng(() => 5 / 6);
      const hero = createHero();
      const monster = createMonster([carriedItem]);
      const state = createState(hero, monster);

      takeDamage(state, createHazard(), monster, false);

      expect(state.dungeon.layout.monsters).not.toContain(monster);
      expect(state.dungeon.layout.items).toEqual([
        { item: carriedItem, position: { x: 2, y: 0 } },
      ]);
      expect(monster.inventory).toEqual([]);
      expect(state.dungeon.killCount).toBe(0);
      expect(hero.experience).toBe(0);
      expect(monster.health).toBe(0);
    });

    it('keeps a hero-killed monster in the layout for the shared killMonster path', () => {
      setRng(() => 5 / 6);
      const hero = createHero();
      const monster = createMonster([carriedItem]);
      const state = createState(hero, monster);

      takeDamage(state, hero, monster, false);

      expect(monster.health).toBe(0);
      expect(state.dungeon.layout.monsters).toContain(monster);
      expect(state.dungeon.layout.items).toEqual([]);
      expect(monster.inventory).toEqual([carriedItem]);
    });
  });

  it('takeDamage paralyzes surviving target hit by green_dark_lord_sword', () => {
    // 5/6 gives dice roll 6 (success for KNIGHT)
    setRng(() => 5 / 6);

    const source: Actor = {
      name: 'Attacker',
      actions: 2,
      movement: 3,
      maxMovement: 3,
      defense: 0,
      health: 7,
      maxHealth: 7,
      colour: Colour.Blue,
      experience: 0,
      position: { x: 0, y: 0 },
      level: Level.KNIGHT,
      weapon: {
        id: 'green_dark_lord_sword',
        name: 'Green Dark Lord Sword',
        dice: 1,
        amountInDeck: 1,
        range: 1,
        twoHanded: false,
        useHearHeroes: true,
        type: ItemType.WEAPON,
        value: 0,
        ignoresArmour: false,
        ignoresShield: false,
      },
      inventory: [],
    };

    const target: Actor = {
      name: 'Defender',
      actions: 2,
      movement: 3,
      maxMovement: 3,
      defense: 0,
      health: 20,
      maxHealth: 20,
      colour: Colour.Red,
      experience: 0,
      position: { x: 1, y: 0 },
      level: Level.APPRENTICE,
      weapon: {
        name: 'Club',
        dice: 1,
        amountInDeck: 1,
        range: 1,
        twoHanded: false,
        useHearHeroes: true,
        type: ItemType.WEAPON,
        value: 5,
        ignoresArmour: false,
        ignoresShield: false,
      },
      inventory: [],
    };

    const state: GameState = {
      heroes: [source],
      dungeon: dummyDungeon,
      actionLog: [],
      itemDeck: [],
      magicItemDeck: [],
      settings: {},
      eventDeck: [],
      reRender: false,
      drawEvents: true,
    };

    takeDamage(state, source, target, false);

    expect(target.health).toBeGreaterThan(0);
    expect(target.movement).toBe(0);
    expect(target.actions).toBe(0);
    expect(target.incapacitated).toBe(true);
  });

  it('createDamageIndicator and removeDamageIndicator manage indicator state', () => {
    const indicator = createDamageIndicator(4, { x: 3, y: 5 });
    expect(indicator.damage).toBe(4);
    expect(indicator.text).toBe('4');
    expect(indicator.position).toEqual({ x: 3, y: 5 });
    expect(indicator.id).toBeDefined();

    const state: GameState = {
      heroes: [],
      dungeon: dummyDungeon,
      actionLog: [],
      itemDeck: [],
      magicItemDeck: [],
      settings: {},
      eventDeck: [],
      reRender: false,
      damageIndicators: [indicator],
      drawEvents: true,
    };

    removeDamageIndicator(state, indicator.id);
    expect(state.damageIndicators).toEqual([]);
  });

  it('createIndicator supports string, custom color, effects, and options', () => {
    const indicator = createIndicator(
      'HEAL +3',
      { x: 2, y: 4 },
      {
        color: '#33ff33',
        effect: 'bounce',
        durationMs: 1500,
        fontSizeScale: 1.2,
        offset: { y: 10 },
      },
    );
    expect(indicator.text).toBe('HEAL +3');
    expect(indicator.color).toBe('#33ff33');
    expect(indicator.effect).toBe('bounce');
    expect(indicator.durationMs).toBe(1500);
    expect(indicator.fontSizeScale).toBe(1.2);
    expect(indicator.offset).toEqual({ y: 10 });
    expect(indicator.position).toEqual({ x: 2, y: 4 });
  });
});

describe('Ring of Precision re-roll', () => {
  const ringItem = (): Item => ({
    id: 'ring_of_precision',
    name: 'Ring of Precision',
    type: ItemType.MAGIC,
    amountInDeck: 1,
    value: 0,
    properties: { RE_ROLL_ATTACK: true, USED: false },
  });

  const attacker = (inventory: Item[]): Actor => ({
    name: 'Attacker',
    actions: 2,
    movement: 3,
    maxMovement: 3,
    defense: 0,
    health: 7,
    maxHealth: 7,
    colour: Colour.Blue,
    experience: 0,
    position: { x: 0, y: 0 },
    level: Level.KNIGHT,
    weapon: {
      name: 'Sword',
      dice: 2,
      amountInDeck: 1,
      range: 1,
      twoHanded: false,
      useHearHeroes: true,
      type: ItemType.WEAPON,
      value: 10,
      ignoresArmour: false,
      ignoresShield: false,
    },
    inventory,
  });

  const target = (): Actor => ({
    name: 'Defender',
    actions: 1,
    movement: 2,
    maxMovement: 2,
    defense: 0,
    health: 5,
    maxHealth: 5,
    colour: Colour.Red,
    experience: 0,
    position: { x: 1, y: 0 },
    level: Level.APPRENTICE,
    weapon: {
      name: 'Club',
      dice: 1,
      amountInDeck: 1,
      range: 1,
      twoHanded: false,
      useHearHeroes: true,
      type: ItemType.WEAPON,
      value: 5,
      ignoresArmour: false,
      ignoresShield: false,
    },
    inventory: [],
  });

  const stateFor = (source: Actor): GameState => ({
    heroes: [source],
    dungeon: dummyDungeon,
    actionLog: [],
    itemDeck: [],
    magicItemDeck: [],
    settings: {},
    eventDeck: [],
    reRender: false,
    drawEvents: true,
  });

  it('re-rolls the attack dice when a miss would deal no damage', () => {
    let call = 0;
    setRng(() => {
      call++;
      return call <= 2 ? 1 / 6 : 5 / 6;
    });
    const ring = ringItem();
    const source = attacker([ring]);
    const defender = target();
    const state = stateFor(source);

    takeDamage(state, source, defender, false);

    // First roll misses (2 dice at 1/6), re-roll succeeds: 2 hits, 2 damage
    expect(defender.health).toBe(3);
    expect(ring.properties?.USED).toBe(true);
    expect(
      state.actionLog.some((l) => l.key === 'logs.takeDamage.reRoll'),
    ).toBe(true);
  });

  it('does not re-roll again in the same combat round', () => {
    setRng(() => 1 / 6);
    const ring = ringItem();
    ring.properties = { RE_ROLL_ATTACK: true, USED: true };
    const source = attacker([ring]);
    const defender = target();
    const state = stateFor(source);

    takeDamage(state, source, defender, false);

    expect(defender.health).toBe(5);
    expect(
      state.actionLog.some((l) => l.key === 'logs.takeDamage.reRoll'),
    ).toBe(false);
  });

  it('does not re-roll while the item is disabled', () => {
    setRng(() => 1 / 6);
    const ring = ringItem();
    ring.disabled = true;
    const source = attacker([ring]);
    const defender = target();
    const state = stateFor(source);

    takeDamage(state, source, defender, false);

    expect(defender.health).toBe(5);
    expect(
      state.actionLog.some((l) => l.key === 'logs.takeDamage.reRoll'),
    ).toBe(false);
  });

  it('does not log a used-effect entry for passive attack bonuses', () => {
    setRng(() => 5 / 6);
    const glove: Item = {
      id: 'giants_glove',
      name: "Giant's Glove",
      type: ItemType.MAGIC,
      amountInDeck: 1,
      value: 0,
      properties: { ATTACK_BONUS: 1 },
    };
    const source = attacker([glove]);
    const defender = target();
    const state = stateFor(source);

    takeDamage(state, source, defender, false);

    expect(defender.health).toBe(2);
    expect(
      state.actionLog.some((l) => l.key === 'logs.takeDamage.usedEffect'),
    ).toBe(false);
  });
});

describe('secret-reveal items drop from downed heroes', () => {
  const necklace: Item = {
    id: 'necklace_of_light',
    name: 'Necklace of Light',
    type: ItemType.MAGIC,
    amountInDeck: 1,
    value: 0,
  };
  const sword: Item = {
    id: 'some_sword',
    name: 'Sword',
    type: ItemType.WEAPON,
    amountInDeck: 1,
    value: 0,
  };
  const stairSecret = (found: boolean) =>
    ({
      id: 'secret_stair',
      name: 'Stair',
      type: 'Note',
      position: { x: 16, y: 11 },
      found,
      revealedBy: 'necklace_of_light',
    }) as never;

  const createHero = (inventory: Item[]): Hero => ({
    name: 'Fearik',
    health: 5,
    maxHealth: 10,
    defense: 0,
    actions: 2,
    movement: 5,
    maxMovement: 5,
    colour: Colour.Yellow,
    incapacitated: false,
    position: { x: 2, y: 2 },
    experience: 0,
    level: Level.KNIGHT,
    weapon: {
      name: 'Dagger',
      dice: 1,
      amountInDeck: 1,
      range: 1,
      twoHanded: false,
      useHearHeroes: true,
      type: ItemType.WEAPON,
      value: 0,
      ignoresShield: false,
      ignoresArmour: false,
    },
    inventory,
    isInventoryOpen: false,
    ignoredByMonsters: false,
  });

  const createState = (hero: Hero, secrets: never[]): GameState => ({
    heroes: [hero],
    dungeon: {
      ...dummyDungeon,
      killCount: 0,
      layout: {
        ...dummyDungeon.layout,
        monsters: [],
        items: [],
        secrets,
      },
    },
    actionLog: [],
    itemDeck: [],
    magicItemDeck: [],
    settings: {},
    eventDeck: [],
    reRender: false,
    drawEvents: true,
  });

  it('drops the item an unfound secret needs where the hero fell', () => {
    const hero = createHero([necklace, sword]);
    const state = createState(hero, [stairSecret(false)]);

    processActorDowned(state, hero);

    expect(hero.health).toBe(0);
    // Only the necklace left the corpse; the sword waits for the revive
    expect(hero.inventory).toEqual([sword]);
    expect(state.dungeon.layout.items).toEqual([
      { item: necklace, position: { x: 2, y: 2 } },
    ]);
  });

  it('keeps the inventory once the needing secret has been found', () => {
    const hero = createHero([necklace, sword]);
    const state = createState(hero, [stairSecret(true)]);

    processActorDowned(state, hero);

    expect(hero.inventory).toEqual([necklace, sword]);
    expect(state.dungeon.layout.items).toEqual([]);
  });

  it('keeps the inventory when no secret needs an item', () => {
    const hero = createHero([necklace, sword]);
    const state = createState(hero, []);

    processActorDowned(state, hero);

    expect(hero.inventory).toEqual([necklace, sword]);
    expect(state.dungeon.layout.items).toEqual([]);
  });
});
