import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { GameState, Hero, Item } from '../types';
import { Colour, ItemType, Level } from '../types';
import {
  NEXT_DUNGEON,
  onReset,
  resetOnNextDungeon,
  resolveChaosSwordAttack,
  USED,
  USED_HEROES,
  USED_ON,
  useItem,
} from './ItemLogic';
import { magicItems } from './magicItems';
import { getGameMaster, resetRng, setRng } from '../core';

const createHero = (
  name: string,
  x: number,
  y: number,
  health = 5,
  maxHealth = 10,
): Hero => ({
  name,
  health,
  maxHealth,
  defense: 0,
  actions: 2,
  movement: 5,
  maxMovement: 5,
  colour: Colour.Yellow,
  incapacitated: false,
  position: { x, y },
  experience: 0,
  level: Level.APPRENTICE,
  weapon: {
    name: 'Dagger',
    amountInDeck: 1,
    dice: 1,
    useHearHeroes: true,
    twoHanded: false,
    range: 1,
    type: ItemType.WEAPON,
    value: 0,
    ignoresShield: false,
    ignoresArmour: false,
  },
  inventory: [],
  isInventoryOpen: false,
  ignoredByMonsters: false,
  walkSound: 'sfx/walk_knight.wav',
  hurtSound: 'sfx/hurt_knight.wav',
  deathSound: 'sfx/die_knight.wav',
});

const createGameState = (heroes: Hero[]): GameState =>
  ({
    dungeon: {
      name: 'Test Dungeon',
      history: [],
      deck: [],
      killCount: 0,
      layout: {
        grid: ['   ', '   ', '   '],
        doors: [],
        monsters: [],
        items: [],
      },
    },
    heroes,
    currentActor: heroes[0],
    targetActor: undefined,
    actionLog: [],
    eventDeck: [],
    events: [],
    gameMaster: getGameMaster('normal'),
  }) as unknown as GameState;

describe('ItemLogic - Healing Herbs rework', () => {
  let hero1: Hero;
  let hero2: Hero;
  let hero3: Hero;
  let herbs: Item;
  let state: GameState;

  beforeEach(() => {
    // Math.floor((5/6) * 6) + 1 = 6 (guarantees Apprentice success)
    setRng(() => 5 / 6);
    hero1 = createHero('Fearik', 1, 1, 5, 10);
    hero2 = createHero('Helga', 1, 2, 4, 10);
    hero3 = createHero('Althea', 1, 3, 3, 10);

    const baseHerb = magicItems.find((i) => i.id === 'healing_herbs')!;
    herbs = JSON.parse(JSON.stringify(baseHerb)) as Item;
    hero1.inventory = [herbs];

    state = createGameState([hero1, hero2, hero3]);
  });

  afterEach(() => {
    resetRng();
  });

  it('healing_herbs definition in magicItems does not reset on TRADE and only on NEXT_DUNGEON', () => {
    const herbDef = magicItems.find((i) => i.id === 'healing_herbs')!;
    expect(herbDef.properties?.RESET_ON).toEqual([NEXT_DUNGEON]);
  });

  it('heals target hero and records the hero in USED_ON', () => {
    state.currentActor = hero1;
    state.targetActor = hero2;

    useItem(state, herbs);

    expect(hero2.health).toBeGreaterThan(4);
    expect(herbs.properties?.[USED_ON]).toContain('Helga');
    expect(herbs.properties?.[USED_HEROES]).toContain('Helga');
    expect(herbs.properties?.[USED]).toBe(false);
    expect(hero1.actions).toBe(1);
  });

  it('allows healing each hero once and marks USED true when all heroes have been healed', () => {
    state.currentActor = hero1;

    // Heal Helga
    state.targetActor = hero2;
    useItem(state, herbs);
    expect(herbs.properties?.[USED]).toBe(false);

    // Heal Fearik (self)
    hero1.actions = 2;
    state.targetActor = hero1;
    useItem(state, herbs);
    expect(herbs.properties?.[USED]).toBe(false);

    // Try healing Helga again -> should fail / not heal further
    const helgaHpBefore = hero2.health;
    hero1.actions = 2;
    state.targetActor = hero2;
    useItem(state, herbs);
    expect(hero2.health).toBe(helgaHpBefore);
    expect(hero1.actions).toBe(2);

    // Heal Althea (the last hero)
    state.targetActor = hero3;
    useItem(state, herbs);
    expect(herbs.properties?.[USED_ON]).toEqual(['Helga', 'Fearik', 'Althea']);
    expect(herbs.properties?.[USED]).toBe(true);

    // After USED is true, cannot use on anyone
    hero1.actions = 2;
    state.targetActor = hero1;
    useItem(state, herbs);
    expect(hero1.actions).toBe(2);
  });

  it('magicHerbsOnReset clears USED and USED_ON array', () => {
    herbs.properties![USED] = true;
    herbs.properties![USED_ON] = ['Fearik', 'Helga'];
    herbs.properties![USED_HEROES] = ['Fearik', 'Helga'];

    onReset.magicHerbsOnReset(state, herbs);

    expect(herbs.properties![USED]).toBe(false);
    expect(herbs.properties![USED_ON]).toEqual([]);
    expect(herbs.properties![USED_HEROES]).toEqual([]);
  });

  it('resetOnNextDungeon triggers magicHerbsOnReset for healing herbs in inventory', () => {
    herbs.properties![USED] = true;
    herbs.properties![USED_ON] = ['Fearik', 'Helga'];

    resetOnNextDungeon(state);

    expect(herbs.properties![USED]).toBe(false);
    expect(herbs.properties![USED_ON]).toEqual([]);
  });

  it('caps healing herbs recovery to max health adjusted by difficulty modifier', () => {
    state.gameMaster = getGameMaster('easy'); // easy has health modifier +1

    hero2.health = 10;
    hero2.maxHealth = 10; // Effective max health is 11 (10 + 1)
    state.currentActor = hero1;
    state.targetActor = hero2;

    useItem(state, herbs);

    // Roll gave 3 hits, but max health is 11, so health becomes 11, not 12 or 13
    expect(hero2.health).toBe(11);
  });
});

describe('chaos sword kills', () => {
  it("transfers the slain monster's inventory to the killer", () => {
    const hero = createHero('Fearik', 1, 1);
    const state = createGameState([hero]);
    const carriedItem: Item = {
      id: 'giants_glove',
      name: "Giant's Glove",
      type: ItemType.MAGIC,
      amountInDeck: 1,
      value: 0,
    };
    const monster = {
      name: 'Troll',
      type: 'Troll',
      health: 3,
      maxHealth: 3,
      defense: 1,
      actions: 1,
      movement: 3,
      maxMovement: 3,
      colour: Colour.Red,
      position: { x: 2, y: 1 },
      experience: 2,
      level: Level.KNIGHT,
      inventory: [carriedItem],
      weapon: {
        name: 'Club',
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
    };
    state.dungeon.layout.monsters = [monster];
    state.dungeon.killCount = 0;
    state.itemDeck = [];
    state.magicItemDeck = [];

    // Force the instant-kill branch: 0 hits on the chaos sword kills outright
    setRng(() => 1 / 6);
    try {
      resolveChaosSwordAttack(state, hero, monster as never);
    } finally {
      resetRng();
    }

    expect(state.dungeon.layout.monsters).toHaveLength(0);
    expect(state.dungeon.killCount).toBe(1);
    expect(hero.experience).toBe(2);
    expect(hero.inventory).toContain(carriedItem);
  });
});
