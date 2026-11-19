import { afterEach, describe, expect, it } from 'vitest';
import type { Actor, GameState, Item } from '../types';
import { clearActorAnimations } from '../core';
import { buildItemAuraViews } from './ItemAuraViews';

const auraItem = (id: string, disabled = false): Item =>
  ({ id, disabled, generatedAura: true }) as Item;

const carrier = (x: number, y: number, inventory: Item[], health = 5): Actor =>
  ({ health, position: { x, y }, inventory }) as Actor;

const createState = (): GameState => ({
  heroes: [],
  dungeon: {
    name: 'test-dungeon',
    intro: '',
    layout: {
      grid: ['AA#'],
      doors: [],
      monsters: [],
      secrets: [],
      notes: [],
      items: [],
      corridors: [],
      corners: [],
    },
    discoveredRooms: ['A'],
    startingPositions: [{ x: 0, y: 0 }],
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
});

describe('buildItemAuraViews', () => {
  afterEach(() => clearActorAnimations());

  it('builds auras for living heroes and monsters, excluding disabled and dead carriers', () => {
    const state = createState();
    state.heroes = [
      carrier(0, 0, [
        auraItem('boots_of_speed'),
        auraItem('giants_glove', true),
      ]),
      carrier(1, 0, [auraItem('ring_of_precision')]),
      carrier(0, 0, [auraItem('crown_of_wisdom')], 0),
    ];
    state.dungeon.layout.monsters = [
      carrier(1, 0, [
        auraItem('giants_glove'),
      ]) as GameState['dungeon']['layout']['monsters'][number],
      carrier(
        0,
        0,
        [auraItem('boots_of_speed')],
        0,
      ) as GameState['dungeon']['layout']['monsters'][number],
    ];

    expect(buildItemAuraViews(state, 0)).toEqual([
      { seed: 'boots_of_speed', position: { x: 0, y: 0 } },
      { seed: 'ring_of_precision', position: { x: 1, y: 0 } },
      { seed: 'giants_glove', position: { x: 1, y: 0 } },
    ]);
  });

  it('hides carriers in undiscovered rooms and outside the viewport', () => {
    const state = createState();
    state.heroes = [carrier(2, 0, [auraItem('crown_of_wisdom')])];
    state.dungeon.layout.grid = ['AAB'];
    expect(buildItemAuraViews(state, 0)).toEqual([]);

    state.heroes = [carrier(0, 0, [auraItem('crown_of_wisdom')])];
    expect(
      buildItemAuraViews(state, 0, { x: 3, y: 0, width: 1, height: 1 }),
    ).toEqual([]);
  });

  it('follows the carrier’s interpolated movement position', () => {
    const state = createState();
    const hero = carrier(0, 0, [auraItem('boots_of_speed')]);
    state.heroes = [hero];

    expect(buildItemAuraViews(state, 1000)[0]?.position).toEqual({
      x: 0,
      y: 0,
    });
    hero.position = { x: 1, y: 0 };

    expect(buildItemAuraViews(state, 1100)[0]?.position).toEqual({
      x: 0.5,
      y: 0,
    });
  });
});
