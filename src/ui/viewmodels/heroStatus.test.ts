// Hero status view model adapter tests: driven against hand-built
// GameState fixtures — every text is prebuilt here, the status effects are
// read from the hero's flags and the stat boxes from the hero's numbers.

import { describe, expect, it } from 'vitest';
import type { GameState, Hero, Item } from '../../types';
import { Colour, ItemType, Level } from '../../types';
import { ACTIVE, DESCRIPTION, USED } from '../../items/ItemLogic';
import {
  heroStatusEffects,
  heroWithOpenStatus,
  toHeroStatusViewModel,
} from './heroStatus';

const identityT = (key: string): string => key;
const effectT = (key: string): string =>
  key.endsWith('.effect') ? `translated:${key}` : key;

const sword: Hero['weapon'] = {
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
};

const chainMail: Hero['armour'] = {
  name: 'Chain mail',
  amountInDeck: 2,
  type: ItemType.ARMOUR,
  value: 2,
  defense: 1,
  magicProtection: false,
  movementReduction: 0,
};

const smallShield: Hero['shield'] = {
  name: 'Small shield',
  amountInDeck: 1,
  type: ItemType.SHIELD,
  value: 1,
  dice: 1,
};

const createHero = (name: string, overrides: Partial<Hero> = {}): Hero => ({
  name,
  actions: 2,
  movement: 3,
  maxMovement: 3,
  defense: 1,
  health: 6,
  maxHealth: 8,
  colour: Colour.Red,
  experience: 3,
  position: { x: 1, y: 1 },
  level: Level.APPRENTICE,
  weapon: { ...sword },
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

describe('hero status view model', () => {
  it('has no open hero without a state or an open flag', () => {
    expect(heroWithOpenStatus(null)).toBeNull();
    const closed = createState([createHero('Fearik')]);
    expect(heroWithOpenStatus(closed)).toBeNull();
  });

  it('builds nothing while the screen is closed', () => {
    const state = createState([createHero('Fearik')]);
    expect(toHeroStatusViewModel(state, null, identityT)).toBeNull();
  });

  it('opens for the hero carrying the flag', () => {
    const fearik = createHero('Fearik');
    const helbran = createHero('Helbran', { isInventoryOpen: true });
    const state = createState([fearik, helbran]);

    const vm = toHeroStatusViewModel(state, null, identityT);
    expect(vm?.heroId).toBe('Helbran');
    expect(vm?.headerText).toBe('content.inventory.label');
  });

  it('builds the equipment slots with names, effect numbers and empties', () => {
    const hero = createHero('Fearik', {
      isInventoryOpen: true,
      armour: { ...chainMail },
    });
    const vm = toHeroStatusViewModel(createState([hero]), null, identityT);

    expect(vm?.slots.map((slot) => slot.slotId)).toEqual([
      'weapon',
      'armour',
      'shield',
    ]);
    expect(vm?.slots[0]).toMatchObject({
      labelText: 'content.status.weapon',
      nameText: 'Long Sword',
      effectText: '(2)',
      isEmpty: false,
    });
    expect(vm?.slots[1]).toMatchObject({
      labelText: 'content.status.armour',
      nameText: 'Chain mail',
      effectText: '(1)',
      isEmpty: false,
    });
    expect(vm?.slots[2]).toMatchObject({
      labelText: 'content.status.shield',
      nameText: 'content.hero.none',
      effectText: '',
      isEmpty: true,
    });
  });

  it('builds stat boxes with current and max values', () => {
    const hero = createHero('Fearik', {
      isInventoryOpen: true,
      health: 5,
      maxHealth: 8,
      experience: 12,
      actions: 1,
      movement: 2,
    });
    const vm = toHeroStatusViewModel(createState([hero]), null, identityT);

    expect(vm?.stats).toEqual([
      {
        statId: 'health',
        labelText: 'content.status.health',
        valueText: '5',
        maxText: '8',
      },
      {
        statId: 'experience',
        labelText: 'content.status.experience',
        valueText: '12',
        maxText: '18',
      },
      {
        statId: 'actions',
        labelText: 'content.hero.actions',
        valueText: '1',
        maxText: '2',
      },
      {
        statId: 'steps',
        labelText: 'content.status.steps',
        valueText: '2',
        maxText: '3',
      },
    ]);
  });

  it('caps experience at the master level marker', () => {
    const hero = createHero('Fearik', {
      isInventoryOpen: true,
      experience: 28,
    });
    const vm = toHeroStatusViewModel(createState([hero]), null, identityT);
    const experience = vm?.stats.find((stat) => stat.statId === 'experience');
    expect(experience?.maxText).toBe('content.level.max');
  });

  it('lists the status effects applied by items and events', () => {
    const hero = createHero('Fearik', {
      isInventoryOpen: true,
      blinded: true,
      weakened: true,
      incapacitated: true,
      ignoredByMonsters: true,
    });
    hero.weapon.elemental = true;

    const vm = toHeroStatusViewModel(createState([hero]), null, identityT);
    expect(vm?.effects.map((effect) => effect.effectId)).toEqual([
      'blinded',
      'weakened',
      'incapacitated',
      'invisible',
      'elemental',
    ]);
    expect(vm?.effects.map((effect) => effect.labelText)).toEqual([
      'events.dragonsBreath.effect',
      'events.weakness.effect',
      'content.status.incapacitated',
      'content.indicators.invisible',
      'events.elementalWeapon.effect',
    ]);
    expect(vm?.effects[2].labelText).toBe('content.status.incapacitated');
    expect(heroStatusEffects(createHero('Fearik'), identityT)).toEqual([]);
  });

  it('lists passive effects from carried items', () => {
    const hero = createHero('Fearik', {
      isInventoryOpen: true,
      inventory: [
        {
          id: 'boots_of_speed',
          name: 'Thousand League Boots',
          nameTranslationKey: 'items.magicItems.boots.name',
          amountInDeck: 1,
          type: ItemType.MAGIC,
          value: 0,
          properties: {
            DESCRIPTION: 'items.magicItems.boots.description',
            MOVEMENT_BONUS: 1,
          },
        },
        {
          id: 'giants_glove',
          name: 'Giants Glove',
          nameTranslationKey: 'items.magicItems.giantsGlove.name',
          amountInDeck: 1,
          type: ItemType.MAGIC,
          value: 0,
          properties: {
            DESCRIPTION: 'items.magicItems.giantsGlove.description',
            ATTACK_BONUS: 1,
          },
        },
        {
          id: 'ring_of_precision',
          name: 'Ring of Precision',
          nameTranslationKey: 'items.magicItems.ringOfPrecision.name',
          amountInDeck: 1,
          type: ItemType.MAGIC,
          value: 0,
          properties: {
            DESCRIPTION: 'items.magicItems.ringOfPrecision.description',
            RE_ROLL_ATTACK: true,
            USED: true,
          },
        },
      ],
    });

    expect(heroStatusEffects(hero, effectT)).toEqual([
      {
        effectId: 'item:boots_of_speed',
        labelText: 'translated:items.magicItems.boots.effect',
      },
      {
        effectId: 'item:giants_glove',
        labelText: 'translated:items.magicItems.giantsGlove.effect',
      },
    ]);
  });

  it('lists effects from currently equipped items', () => {
    const hero = createHero('Fearik', {
      isInventoryOpen: true,
      armour: {
        ...chainMail,
        id: 'plate_mail',
        name: 'items.armour.plateMail.name',
        nameTranslationKey: 'items.armour.plateMail.name',
        movementReduction: 1,
      },
    });

    expect(heroStatusEffects(hero, effectT)).toContainEqual({
      effectId: 'equipment:plate_mail',
      labelText: 'translated:items.armour.plateMail.effect',
    });
  });

  it('lists current event effects using their translated effect labels', () => {
    const hero = createHero('Fearik', { isInventoryOpen: true });
    const state = createState([hero]);
    state.currentEvent = {
      id: 'time_portal',
      name: 'events.timePortal.name',
      nameTranslationKey: 'events.timePortal.name',
      number: 3,
      description: 'events.timePortal.description',
      descriptionTranslationKey: 'events.timePortal.description',
      effect: 'timePortal',
      used: true,
    };

    const vm = toHeroStatusViewModel(state, null, effectT);

    expect(vm?.effects).toContainEqual({
      effectId: 'event:time_portal',
      labelText: 'translated:events.timePortal.effect',
    });
  });

  it('includes the translated name of the item disabled by the magic storm', () => {
    const disabledItem: Item = {
      id: 'boots_of_speed',
      name: 'Boots',
      nameTranslationKey: 'items.magicItems.boots.name',
      amountInDeck: 1,
      type: ItemType.MAGIC,
      value: 0,
      disabled: true,
    };
    const hero = createHero('Fearik', {
      isInventoryOpen: true,
      inventory: [disabledItem],
    });
    const state = createState([hero]);
    state.currentEvent = {
      id: 'magic_storm',
      name: 'events.magicStorm.name',
      nameTranslationKey: 'events.magicStorm.name',
      number: 12,
      description: 'events.magicStorm.description',
      descriptionTranslationKey: 'events.magicStorm.description',
      effect: 'theMagicStorm',
      used: true,
    };
    const t = (
      key: string,
      params?: Record<string, string | number>,
    ): string => {
      if (key === 'events.magicStorm.effect') {
        return `${params?.item} cannot be used`;
      }
      if (key.endsWith('.name')) return `translated:${key}`;
      return key;
    };

    const vm = toHeroStatusViewModel(state, null, t);

    expect(vm?.effects).toContainEqual({
      effectId: 'event:magic_storm',
      labelText: 'translated:items.magicItems.boots.name cannot be used',
    });
    expect(vm?.inventory[0].isDisabled).toBe(true);
  });

  it('maps the inventory into grid-ready entries', () => {
    const potion: Item = {
      name: 'Health Potion',
      amountInDeck: 1,
      type: ItemType.MAGIC,
      value: 10,
      properties: { [ACTIVE]: true, [DESCRIPTION]: 'Restores HP' },
    };
    const gem: Item = {
      name: 'Gem',
      amountInDeck: 1,
      type: ItemType.MAGIC,
      value: 5,
      properties: {},
    };
    const hero = createHero('Fearik', {
      isInventoryOpen: true,
      inventory: [potion, gem],
    });

    const vm = toHeroStatusViewModel(createState([hero]), null, identityT);
    expect(vm?.inventory.map((item) => item.itemIndex)).toEqual([0, 1]);
    expect(vm?.inventory[1].nameText).toBe('Gem');
  });

  it('shows no detail while nothing is selected', () => {
    const hero = createHero('Fearik', { isInventoryOpen: true });
    const vm = toHeroStatusViewModel(createState([hero]), null, identityT);
    expect(vm?.detail).toBeNull();
  });

  it('details a selected equipped item without a use button', () => {
    const hero = createHero('Fearik', {
      isInventoryOpen: true,
      shield: { ...smallShield },
    });
    const vm = toHeroStatusViewModel(
      createState([hero]),
      { heroId: 'Fearik', source: { kind: 'shield' } },
      identityT,
    );

    expect(vm?.detail).toMatchObject({
      nameText: 'Small shield',
      effectText: '(1)',
      descriptionText: '',
      hasUse: false,
      isUsable: false,
    });
  });

  it('builds selected item details from effect, description and thematic translations', () => {
    const item: Item = {
      id: 'boots_of_speed',
      name: 'items.magicItems.boots.name',
      nameTranslationKey: 'items.magicItems.boots.name',
      amountInDeck: 1,
      type: ItemType.MAGIC,
      value: 0,
    };
    const hero = createHero('Fearik', {
      isInventoryOpen: true,
      inventory: [item],
    });
    const translations = new Map([
      ['items.magicItems.boots.name', 'Boots'],
      ['items.magicItems.boots.effect', 'Faster movement'],
      ['items.magicItems.boots.description', 'Move one extra step.'],
      ['items.magicItems.boots.thematicDescription', 'A gift from the wind.'],
    ]);

    const vm = toHeroStatusViewModel(
      createState([hero]),
      { heroId: 'Fearik', source: { kind: 'inventory', itemIndex: 0 } },
      (key) => translations.get(key) ?? key,
    );

    expect(vm?.detail).toMatchObject({
      nameText: 'Boots',
      effectText: 'Faster movement',
      descriptionText: 'Move one extra step.',
      thematicDescriptionText: 'A gift from the wind.',
    });
  });

  it('details a selected active inventory item with use and used state', () => {
    const potion: Item = {
      name: 'Health Potion',
      amountInDeck: 1,
      type: ItemType.MAGIC,
      value: 10,
      properties: { [ACTIVE]: true, [DESCRIPTION]: 'Restores HP' },
    };
    const spentScroll: Item = {
      name: 'Empty Scroll',
      amountInDeck: 1,
      type: ItemType.MAGIC,
      value: 0,
      properties: { [ACTIVE]: true, [USED]: true },
    };
    const disabledPotion: Item = {
      name: 'Disabled Potion',
      amountInDeck: 1,
      type: ItemType.MAGIC,
      value: 0,
      disabled: true,
      properties: { [ACTIVE]: true },
    };
    const hero = createHero('Fearik', {
      isInventoryOpen: true,
      inventory: [potion, spentScroll, disabledPotion],
    });
    const state = createState([hero]);

    const usable = toHeroStatusViewModel(
      state,
      { heroId: 'Fearik', source: { kind: 'inventory', itemIndex: 0 } },
      identityT,
    );
    expect(usable?.detail).toMatchObject({
      nameText: 'Health Potion',
      descriptionText: 'Restores HP',
      hasUse: true,
      isUsable: true,
      isUsed: false,
      useText: 'content.inventory.use',
    });

    const spent = toHeroStatusViewModel(
      state,
      { heroId: 'Fearik', source: { kind: 'inventory', itemIndex: 1 } },
      identityT,
    );
    expect(spent?.detail).toMatchObject({
      nameText: 'Empty Scroll',
      hasUse: true,
      isUsable: false,
      isUsed: true,
      usedText: 'content.inventory.used',
    });

    const disabled = toHeroStatusViewModel(
      state,
      { heroId: 'Fearik', source: { kind: 'inventory', itemIndex: 2 } },
      identityT,
    );
    expect(disabled?.detail).toMatchObject({
      hasUse: true,
      isUsable: false,
      isUsed: false,
    });

    // The selection highlights the picked cell and slot only.
    const selectedCell = toHeroStatusViewModel(
      state,
      { heroId: 'Fearik', source: { kind: 'inventory', itemIndex: 0 } },
      identityT,
    );
    expect(selectedCell?.inventory[0].isSelected).toBe(true);
    expect(selectedCell?.inventory[1].isSelected).toBe(false);

    // A selection for another hero is ignored.
    const foreign = toHeroStatusViewModel(
      state,
      { heroId: 'Helbran', source: { kind: 'inventory', itemIndex: 0 } },
      identityT,
    );
    expect(foreign?.detail).toBeNull();
  });

  it('does not present another hero’s item as usable on the current turn', () => {
    const potion: Item = {
      name: 'Health Potion',
      amountInDeck: 1,
      type: ItemType.MAGIC,
      value: 10,
      properties: { [ACTIVE]: true },
    };
    const currentActor = createHero('Fearik');
    const statusHero = createHero('Helbran', {
      isInventoryOpen: true,
      inventory: [potion],
    });
    const state = createState([currentActor, statusHero]);

    const vm = toHeroStatusViewModel(
      state,
      { heroId: 'Helbran', source: { kind: 'inventory', itemIndex: 0 } },
      identityT,
    );

    expect(vm?.detail).toMatchObject({
      hasUse: true,
      isUsable: false,
      isUsed: false,
    });
  });

  it('clears the detail when an empty slot is selected', () => {
    const hero = createHero('Fearik', { isInventoryOpen: true });
    const vm = toHeroStatusViewModel(
      createState([hero]),
      { heroId: 'Fearik', source: { kind: 'armour' } },
      identityT,
    );
    expect(vm?.detail).toBeNull();
  });
});
