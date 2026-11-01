import { describe, expect, it } from 'vitest';
import { toMenuViewModel } from './menu';
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

describe('menu view model', () => {
  it('returns null without a game state', () => {
    expect(toMenuViewModel(null, 'main')).toBeNull();
  });

  it('carries the view, header and item labels of the main view', () => {
    const vm = toMenuViewModel(createMockState(), 'main');
    expect(vm?.view).toBe('main');
    expect(vm?.headerText).toBeTruthy();
    expect(vm?.items.length).toBeGreaterThan(0);
    expect(vm?.items.every((item) => item.id && item.label)).toBe(true);
  });

  it('includes the build-info footer only on the main view', () => {
    const buildInfo = { date: '2026-01-01', hash: 'abc123' };
    const main = toMenuViewModel(
      createMockState(),
      'main',
      undefined,
      false,
      buildInfo,
    );
    expect(main?.footerText).toBe('2026-01-01 - abc123');

    const other = toMenuViewModel(
      createMockState(),
      'event',
      undefined,
      false,
      buildInfo,
    );
    expect(other?.footerText).toBe('');
  });
});
