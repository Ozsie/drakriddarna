import { describe, expect, it } from 'vitest';
import type { GameState, Hero } from '../types';
import { Side } from '../types';
import {
  getDynamicSignature,
  getOverlaySignature,
  getStaticSignature,
} from './DungeonBoardSignatures';

const createState = (overrides?: Partial<GameState>): GameState =>
  ({
    heroes: [],
    dungeon: {
      name: 'test-dungeon',
      layout: {
        grid: ['#AA#'],
        doors: [],
        monsters: [],
        secrets: [],
        notes: [],
        items: [],
        corridors: [],
        corners: [],
      },
      discoveredRooms: ['A'],
      startingPositions: [{ x: 1, y: 0 }],
      winConditions: [],
      beaten: false,
      killCount: 0,
    },
    actionLog: [],
    itemDeck: [],
    magicItemDeck: [],
    settings: {},
    eventDeck: [],
    reRender: false,
    drawEvents: true,
    ...overrides,
  }) as GameState;

describe('DungeonBoardSignatures', () => {
  it('static signature changes when a door opens', () => {
    const state = createState();
    const before = getStaticSignature(state, false, 48);
    state.dungeon.layout.doors = [
      {
        locked: false,
        open: true,
        trapped: false,
        hidden: false,
        x: 0,
        y: 0,
        side: Side.RIGHT,
        trapAttacks: 0,
        reinforced: false,
      },
    ];
    const after = getStaticSignature(state, false, 48);
    expect(after).not.toBe(before);
  });

  it('dynamic signature changes when a hero moves', () => {
    const state = createState();
    const hero = {
      name: 'Fearik',
      position: { x: 1, y: 0 },
      health: 7,
      actions: 2,
      movement: 3,
      incapacitated: false,
    } as Hero;
    state.heroes = [hero];
    const before = getDynamicSignature(state, false, 48);
    hero.position = { x: 2, y: 0 };
    const after = getDynamicSignature(state, false, 48);
    expect(after).not.toBe(before);
  });

  it('overlay signature changes when damage indicators appear', () => {
    const state = createState();
    const before = getOverlaySignature(state, false, 48);
    state.damageIndicators = [
      {
        id: 'd1',
        damage: 1,
        position: { x: 0, y: 0 },
        timestamp: 0,
      },
    ];
    const after = getOverlaySignature(state, false, 48);
    expect(after).not.toBe(before);
  });

  it('signatures are stable for unchanged state', () => {
    const state = createState();
    expect(getStaticSignature(state, false, 48)).toBe(
      getStaticSignature(state, false, 48),
    );
    expect(getDynamicSignature(state, false, 48)).toBe(
      getDynamicSignature(state, false, 48),
    );
    expect(getOverlaySignature(state, false, 48)).toBe(
      getOverlaySignature(state, false, 48),
    );
  });
});
