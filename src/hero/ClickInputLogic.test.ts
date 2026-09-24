import { describe, expect, it } from 'vitest';
import {
  Colour,
  ConditionType,
  type Dungeon,
  type GameState,
  type Hero,
  ItemType,
  Level,
  SecretType,
  type Weapon,
} from '../types';
import { onTargetCell } from './ClickInputLogic';

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

const createTestHero = (name: string, x: number, y: number): Hero => ({
  name,
  health: 10,
  maxHealth: 10,
  defense: 0,
  actions: 2,
  movement: 5,
  maxMovement: 5,
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

  const hero = createTestHero('Fearik', 1, 1);

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

describe('onTargetCell traps triggered while passing through', () => {
  it('triggers a trap door on a cell the hero moves through, not only the destination', () => {
    const state = createTestState();
    const hero = state.currentActor as Hero;
    // Place a trap door directly between hero's start (1,1) and target (4,1)
    state.dungeon.layout.secrets = [
      {
        id: 'trap1',
        type: SecretType.TRAP_DOOR,
        name: 'Trap Door',
        found: false,
        position: { x: 2, y: 1 },
      },
    ];

    onTargetCell(state, { x: 4, y: 1 });

    // Hero should have stopped at the trap cell, not continued to target
    expect(hero.position).toEqual({ x: 2, y: 1 });
    expect(hero.incapacitated).toBe(true);
    const trap = state.dungeon.layout.secrets[0];
    expect(trap.found).toBe(true);
  });
});
