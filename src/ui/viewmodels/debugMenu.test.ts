import { describe, expect, it } from 'vitest';
import { toDebugMenuViewModel } from './debugMenu';
import {
  Colour,
  type GameState,
  type Hero,
  ItemType,
  Level,
} from '../../types';

const createMockHero = (name = 'Hero1'): Hero => ({
  name,
  actions: 2,
  movement: 4,
  maxMovement: 4,
  defense: 1,
  health: 6,
  maxHealth: 6,
  colour: Colour.Red,
  experience: 0,
  position: { x: 1, y: 1 },
  level: Level.APPRENTICE,
  weapon: {
    name: 'Sword',
    dice: 2,
    amountInDeck: 1,
    twoHanded: false,
    range: 1,
    type: ItemType.WEAPON,
    value: 10,
    ignoresShield: false,
    ignoresArmour: false,
    useHearHeroes: true,
  },
  inventory: [],
  isInventoryOpen: false,
});

const createMockState = (): GameState =>
  ({
    heroes: [createMockHero()],
    dungeon: {
      name: 'Test Dungeon',
      layout: { grid: ['AAA'] },
      startingPositions: [{ x: 1, y: 1 }],
    },
    actionLog: [],
    settings: {},
  }) as unknown as GameState;

describe('debug menu view model', () => {
  it('returns null without a game state', () => {
    expect(toDebugMenuViewModel(null, 'debug')).toBeNull();
  });

  it('carries the view, header and item labels of the debug view', () => {
    const vm = toDebugMenuViewModel(createMockState(), 'debug');
    expect(vm?.view).toBe('debug');
    expect(vm?.headerText).toBeTruthy();
    expect(vm?.items.length).toBeGreaterThan(0);
    expect(vm?.items.every((item) => item.id && item.label)).toBe(true);
  });

  it('carries no build-info footer (that belongs to the welcome screen)', () => {
    const vm = toDebugMenuViewModel(createMockState(), 'debug');
    expect(vm?.footerText).toBe('');
  });
});
