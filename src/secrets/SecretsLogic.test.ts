import { describe, it, expect, afterEach } from 'vitest';
import type { Door, GameState, Hero, Secret } from '../types';
import { Colour, ItemType, Level, SecretType, Side } from '../types';
import { checkForTrapDoor, searchForSecret } from './SecretsLogic';
import { getGameMaster, resetRng, setRng } from '../core';
import { armour } from '../items/armours';
import { shields } from '../items/shields';

const createHero = (): Hero => ({
  name: 'Fearik',
  health: 10,
  maxHealth: 10,
  defense: 0,
  actions: 2,
  movement: 3,
  maxMovement: 3,
  colour: Colour.Yellow,
  incapacitated: false,
  position: { x: 2, y: 2 },
  experience: 0,
  level: Level.APPRENTICE,
  weapon: {
    name: 'Sword',
    amountInDeck: 1,
    dice: 2,
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
  // Plate mail (defense 2) and a shield (2 dice): the pitfall must
  // ignore both
  armour: armour[1],
  shield: shields[0],
  walkSound: '',
  hurtSound: '',
  deathSound: '',
});

const createState = (
  hero: Hero,
  secrets: Secret[],
  doors: Door[] = [],
): GameState =>
  ({
    dungeon: {
      name: 'Test Dungeon',
      history: [],
      deck: [],
      killCount: 0,
      layout: {
        grid: ['   ', '   ', '   '],
        doors,
        monsters: [],
        items: [],
        secrets,
      },
    },
    heroes: [hero],
    currentActor: hero,
    targetActor: undefined,
    actionLog: [],
    eventDeck: [],
    events: [],
    gameMaster: getGameMaster('normal'),
  }) as unknown as GameState;

describe('trap door pitfall', () => {
  afterEach(() => {
    resetRng();
  });

  it('falls for 3 white dice ignoring armour and shield', () => {
    // 5/6 rolls a 6 on every die: 3 attack successes, and the shield
    // would have rolled 2 successes had it not been ignored
    setRng(() => 5 / 6);
    const hero = createHero();
    const trap: Secret = {
      type: SecretType.TRAP_DOOR,
      position: { x: 2, y: 2 },
      found: false,
    } as Secret;
    const state = createState(hero, [trap]);

    const triggered = checkForTrapDoor(state);

    expect(triggered).toBe(true);
    expect(trap.found).toBe(true);
    // 3 hits, reduced by neither armour (2) nor shield (2): full 3 damage
    expect(hero.health).toBe(7);
    expect(hero.incapacitated).toBe(true);
    expect(hero.movement).toBe(0);
    expect(hero.actions).toBe(0);
  });

  it('does nothing without an unfound trap door under the hero', () => {
    setRng(() => 5 / 6);
    const hero = createHero();
    const foundTrap: Secret = {
      type: SecretType.TRAP_DOOR,
      position: { x: 2, y: 2 },
      found: true,
    } as Secret;
    const elsewhere: Secret = {
      type: SecretType.TRAP_DOOR,
      position: { x: 1, y: 1 },
      found: false,
    } as Secret;
    const state = createState(hero, [foundTrap, elsewhere]);

    expect(checkForTrapDoor(state)).toBe(false);
    expect(hero.health).toBe(10);
    expect(hero.incapacitated).toBe(false);
  });
});

describe('searching for hidden doors', () => {
  afterEach(() => {
    resetRng();
  });

  const makeDoor = (side: Side): Door => ({
    side,
    x: 2,
    y: 2,
    locked: false,
    trapped: false,
    open: false,
    hidden: true,
    trapAttacks: 0,
    reinforced: false,
  });

  it('finds a right facing door from the square above its opening squares', () => {
    // 5/6 rolls a 6: the search succeeds for the apprentice hero
    setRng(() => 5 / 6);
    const hero = createHero();
    hero.position = { x: 2, y: 1 };
    const door = makeDoor(Side.RIGHT);
    const state = createState(hero, [], [door]);

    searchForSecret(state);

    expect(door.hidden).toBe(false);
  });

  it('finds a down facing door from the square right of its opening squares', () => {
    setRng(() => 5 / 6);
    const hero = createHero();
    hero.position = { x: 3, y: 3 };
    const door = makeDoor(Side.DOWN);
    const state = createState(hero, [], [door]);

    searchForSecret(state);

    expect(door.hidden).toBe(false);
  });

  it('does not find a door from a square beyond the searchable ones', () => {
    setRng(() => 5 / 6);
    const hero = createHero();
    hero.position = { x: 2, y: 0 };
    const door = makeDoor(Side.RIGHT);
    const state = createState(hero, [], [door]);

    searchForSecret(state);

    expect(door.hidden).toBe(true);
  });
});
