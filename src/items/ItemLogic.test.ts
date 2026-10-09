import { describe, it, expect, beforeEach } from 'vitest';
import type { GameState, Hero, Item } from '../types';
import { Colour, ItemType, Level } from '../types';
import {
  NEXT_DUNGEON,
  onReset,
  resetOnNextDungeon,
  USED,
  USED_HEROES,
  USED_ON,
  useItem,
} from './ItemLogic';
import { magicItems } from './magicItems';

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
    difficulty: {
      key: 'normal',
      modifiers: {
        attack: 0,
        defense: 0,
        movement: 0,
      },
    },
  }) as unknown as GameState;

describe('ItemLogic - Healing Herbs rework', () => {
  let hero1: Hero;
  let hero2: Hero;
  let hero3: Hero;
  let herbs: Item;
  let state: GameState;

  beforeEach(() => {
    hero1 = createHero('Fearik', 1, 1, 5, 10);
    hero2 = createHero('Helga', 1, 2, 4, 10);
    hero3 = createHero('Althea', 1, 3, 3, 10);

    const baseHerb = magicItems.find((i) => i.id === 'healing_herbs')!;
    herbs = JSON.parse(JSON.stringify(baseHerb)) as Item;
    hero1.inventory = [herbs];

    state = createGameState([hero1, hero2, hero3]);
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
});
