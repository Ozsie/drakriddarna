import { describe, expect, it } from 'vitest';
import { itemSpriteRef, toHeroCardsViewModel } from './heroCards';
import type { GameState, Hero } from '../../types';
import { Colour, ItemType, Level } from '../../types';

const identityT = (key: string) => key;

const createHero = (name: string, overrides: Partial<Hero> = {}): Hero => ({
  name,
  actions: 2,
  movement: 4,
  maxMovement: 4,
  defense: 1,
  health: 6,
  maxHealth: 6,
  colour: Colour.Red,
  experience: 3,
  position: { x: 1, y: 1 },
  level: Level.APPRENTICE,
  weapon: {
    name: 'Long Sword',
    dice: 2,
    amountInDeck: 2,
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
  ...overrides,
});

const createState = (heroes: Hero[]): GameState =>
  ({
    heroes,
    currentActor: heroes[0],
    dungeon: { layout: { grid: [] }, startingPositions: [{ x: 0, y: 0 }] },
  }) as unknown as GameState;

describe('hero cards view model', () => {
  it('returns no cards for dead parties', () => {
    const state = createState([createHero('Fearik', { health: 0 })]);
    const vm = toHeroCardsViewModel(state, identityT, false);
    expect(vm.cards).toHaveLength(0);
  });

  it('keys each card on the hero name and flags the current hero', () => {
    const fearik = createHero('Fearik');
    const helbran = createHero('Helbran');
    const state = createState([fearik, helbran]);
    state.targetActor = helbran;

    const vm = toHeroCardsViewModel(state, identityT, false);

    expect(vm.cards.map((card) => card.heroId)).toEqual(['Fearik', 'Helbran']);
    const current = vm.cards[0];
    const target = vm.cards[1];
    expect(current.isCurrent).toBe(true);
    expect(current.isTarget).toBe(false);
    expect(target.isTarget).toBe(true);
    expect(target.title.startsWith('*')).toBe(true);
    // Only the current hero carries the equipment lines.
    expect(current.weaponText).toBeDefined();
    expect(current.actionsText).toBeDefined();
    expect(target.weaponText).toBeUndefined();
  });

  it('keeps only the current and target heroes in compact mode', () => {
    const fearik = createHero('Fearik');
    const helbran = createHero('Helbran');
    const siedel = createHero('Siedel');
    const state = createState([fearik, helbran, siedel]);
    state.currentActor = helbran;
    state.targetActor = siedel;

    const vm = toHeroCardsViewModel(state, identityT, true);

    expect(vm.cards.map((card) => card.heroId)).toEqual(['Helbran', 'Siedel']);
  });

  it('maps item sprites to asset ids', () => {
    const state = createState([
      createHero('Fearik', {
        inventory: [
          {
            name: 'Gem',
            amountInDeck: 1,
            type: ItemType.MAGIC,
            value: 5,
            properties: {},
            sprite: { image: '/images/gems.png', index: 3, size: 32 },
          },
        ],
      }),
    ]);

    const gem = (state.heroes[0]?.inventory ?? [])[0];
    expect(gem).toBeDefined();
    expect(itemSpriteRef(gem)).toEqual({
      assetId: '/images/gems.png',
      index: 3,
      size: 32,
    });
  });
});
