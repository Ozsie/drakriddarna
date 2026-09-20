import { describe, it, expect, beforeEach } from 'vitest';
import {
  doorAsActor,
  getDamageString,
  getEffectiveMaxMovement,
  takeDamage,
} from './combat';
import { setRng, resetRng } from './dice';
import { Colour, ItemType, Level, Side } from '../types';
import type { Actor, Dungeon, GameState } from '../types';

const dummyDungeon: Dungeon = {
  name: 'Test',
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
    });

    expect(doorActor.name).toBe('Door');
    expect(doorActor.weapon.dice).toBe(3);
    expect(doorActor.weapon.ignoresShield).toBe(true);
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
    };

    takeDamage(state, source, target, false);
    // 3 hits - 1 defense = 2 damage; health: 5 - 2 = 3
    expect(target.health).toBe(3);
    expect(state.actionLog.length).toBeGreaterThan(0);
  });
});
