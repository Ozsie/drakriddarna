import { describe, expect, it } from 'vitest';
import {
  Colour,
  ConditionType,
  Side,
  type Dungeon,
  type GameState,
  type Hero,
  ItemType,
  Level,
  type Weapon,
} from '../types';
import {
  getAvailableRadialActions,
  getAvailableRadialActionsForTarget,
  RadialAction,
} from './RadialMenuLogic';

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

const createTestHero = (x: number, y: number): Hero => ({
  name: 'Fearik',
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

const createTestState = (
  hero: Hero,
  overrides?: Partial<Dungeon>,
): GameState => {
  const dungeon: Dungeon = {
    name: 'test-dungeon',
    intro: 'test',
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
    ...overrides,
  };

  return {
    heroes: [hero],
    dungeon,
    currentActor: hero,
    actionLog: [],
    itemDeck: [],
    magicItemDeck: [],
    eventDeck: [],
    settings: {},
    drawEvents: true,
    reRender: false,
  };
};

describe('getAvailableRadialActions', () => {
  it('returns only SEARCH when hero has full action, no door or item', () => {
    const hero = createTestHero(1, 1);
    const state = createTestState(hero);

    const entries = getAvailableRadialActions(state, hero);

    expect(entries.map((e) => e.action)).toEqual([
      RadialAction.SEARCH,
      RadialAction.NEXT,
    ]);
  });

  it('returns PICK_LOCK and SEARCH when standing on a locked door with full action', () => {
    const hero = createTestHero(1, 1);
    const state = createTestState(hero);
    state.dungeon.layout.doors = [
      {
        x: 1,
        y: 1,
        side: Side.RIGHT,
        open: false,
        locked: true,
        hidden: false,
        trapped: false,
        trapAttacks: 0,
        reinforced: false,
      },
    ];

    const entries = getAvailableRadialActions(state, hero);
    const actions = entries.map((e) => e.action);

    expect(actions).toContain(RadialAction.PICK_LOCK);
    expect(actions).toContain(RadialAction.SEARCH);
  });

  it('returns one OPEN_DOOR/PICK_LOCK entry per door when multiple doors are on the same cell', () => {
    const hero = createTestHero(1, 1);
    const state = createTestState(hero);
    const rightDoor = {
      x: 1,
      y: 1,
      side: Side.RIGHT,
      open: false,
      locked: true,
      hidden: false,
      trapped: false,
      reinforced: false,
      trapAttacks: 0,
    };
    const downDoor = {
      x: 1,
      y: 1,
      side: Side.DOWN,
      open: false,
      locked: false,
      hidden: false,
      trapped: false,
      reinforced: false,
      trapAttacks: 0,
    };
    state.dungeon.layout.doors = [rightDoor, downDoor];

    const entries = getAvailableRadialActions(state, hero);

    const openDoorEntries = entries.filter(
      (e) => e.action === RadialAction.OPEN_DOOR,
    );
    const pickLockEntries = entries.filter(
      (e) => e.action === RadialAction.PICK_LOCK,
    );

    expect(openDoorEntries).toHaveLength(1);
    expect(openDoorEntries.map((e) => e.door)).toEqual(
      expect.arrayContaining([downDoor]),
    );
    expect(pickLockEntries).toHaveLength(1);
    expect(pickLockEntries[0].door).toEqual(rightDoor);
  });

  it('returns OPEN_DOOR only when hero has half action left (movement>0 but no full action)', () => {
    const hero = createTestHero(1, 1);
    hero.movement = 1;
    hero.maxMovement = 5;
    const state = createTestState(hero);
    state.dungeon.layout.doors = [
      {
        x: 1,
        y: 1,
        side: Side.RIGHT,
        open: false,
        locked: false,
        hidden: false,
        trapped: false,
        trapAttacks: 0,
        reinforced: false,
      },
    ];

    const entries = getAvailableRadialActions(state, hero);
    const actions = entries.map((e) => e.action);

    expect(actions).toContain(RadialAction.OPEN_DOOR);
  });

  it('returns PICK_UP_ITEM when standing on an item', () => {
    const hero = createTestHero(1, 1);
    const state = createTestState(hero);
    state.dungeon.layout.items = [
      {
        position: { x: 1, y: 1 },
      },
    ];

    const entries = getAvailableRadialActions(state, hero);
    const actions = entries.map((e) => e.action);

    expect(actions).toContain(RadialAction.PICK_UP_ITEM);
  });

  it('returns no actions when hero has no full action, no movement, no door and no item', () => {
    const hero = createTestHero(1, 1);
    hero.actions = 0;
    hero.movement = 0;
    const state = createTestState(hero);

    const entries = getAvailableRadialActions(state, hero);

    expect(entries).toEqual([{ action: 'NEXT' }]);
  });

  describe('Active inventory items in radial menu', () => {
    it('includes radial action for neighboring heroes when item has TARGET_ANY_HERO and excludes heroes already healed', () => {
      const hero1 = createTestHero(1, 1);
      hero1.name = 'Fearik';
      const hero2 = createTestHero(2, 2);
      hero2.name = 'Helga';
      const hero3 = createTestHero(5, 5);
      hero3.name = 'Althea';

      const healingHerbs = {
        id: 'healing_herbs',
        name: 'Healing Herbs',
        type: ItemType.MAGIC,
        value: 0,
        amountInDeck: 1,
        properties: {
          ACTIVE: true,
          USED: false,
          USED_ON: ['Fearik'],
          TARGET: 'ANY_HERO',
        },
      };
      hero1.inventory = [healingHerbs];

      const state = createTestState(hero1);
      state.heroes = [hero1, hero2, hero3];

      const entries = getAvailableRadialActions(state, hero1);
      const itemEntries = entries.filter(
        (e) => e.action === RadialAction.USE_ITEM,
      );

      // Fearik is in USED_ON -> excluded. Althea is at (5, 5) -> not neighbor -> excluded.
      expect(itemEntries).toHaveLength(1);
      expect(itemEntries[0].item).toEqual(healingHerbs);
      expect(itemEntries[0].targetHero?.name).toBe('Helga');
    });

    it('getAvailableRadialActionsForTarget returns actions for neighboring hero', () => {
      const hero1 = createTestHero(1, 1);
      hero1.name = 'Fearik';
      const hero2 = createTestHero(1, 2);
      hero2.name = 'Helga';
      const hero3 = createTestHero(5, 5);
      hero3.name = 'Althea';

      const healingHerbs = {
        id: 'healing_herbs',
        name: 'Healing Herbs',
        type: ItemType.MAGIC,
        value: 0,
        amountInDeck: 1,
        properties: {
          ACTIVE: true,
          USED: false,
          USED_ON: [],
          TARGET: 'ANY_HERO',
        },
      };
      hero1.inventory = [healingHerbs];

      const state = createTestState(hero1);
      state.heroes = [hero1, hero2, hero3];

      const helgaActions = getAvailableRadialActionsForTarget(
        state,
        hero1,
        hero2,
      );
      expect(helgaActions).toHaveLength(1);
      expect(helgaActions[0].action).toBe(RadialAction.USE_ITEM);
      expect(helgaActions[0].targetHero?.name).toBe('Helga');

      // Distant hero
      const altheaActions = getAvailableRadialActionsForTarget(
        state,
        hero1,
        hero3,
      );
      expect(altheaActions).toHaveLength(0);
    });

    it('includes radial action targeting only current owner when item has TARGET_SELF', () => {
      const hero1 = createTestHero(1, 1);
      hero1.name = 'Fearik';
      const hero2 = createTestHero(2, 2);
      hero2.name = 'Helga';

      const potionOfSpeed = {
        id: 'potion_of_speed',
        name: 'Potion of Speed',
        type: ItemType.MAGIC,
        value: 0,
        amountInDeck: 1,
        properties: {
          ACTIVE: true,
          USED: false,
          TARGET: 'SELF',
        },
      };
      const necklaceOfLight = {
        id: 'necklace_of_light',
        name: 'Necklace of Light',
        type: ItemType.MAGIC,
        value: 0,
        amountInDeck: 1,
        properties: {
          ACTIVE: true,
          USED: false,
          TARGET: 'SELF',
        },
      };
      hero1.inventory = [potionOfSpeed, necklaceOfLight];

      const state = createTestState(hero1);
      state.heroes = [hero1, hero2];

      const entries = getAvailableRadialActions(state, hero1);
      const itemEntries = entries.filter(
        (e) => e.action === RadialAction.USE_ITEM,
      );

      expect(itemEntries).toHaveLength(2);
      expect(itemEntries[0].item).toEqual(potionOfSpeed);
      expect(itemEntries[0].targetHero?.name).toBe('Fearik');
      expect(itemEntries[1].item).toEqual(necklaceOfLight);
      expect(itemEntries[1].targetHero?.name).toBe('Fearik');
    });

    it('does not include items that are USED, disabled, or lack ACTIVE property', () => {
      const hero = createTestHero(1, 1);
      const usedItem = {
        id: 'used_potion',
        name: 'Used Potion',
        type: ItemType.MAGIC,
        value: 0,
        amountInDeck: 1,
        properties: {
          ACTIVE: true,
          USED: true,
          TARGET: 'SELF',
        },
      };
      const disabledItem = {
        id: 'disabled_potion',
        name: 'Disabled Potion',
        type: ItemType.MAGIC,
        value: 0,
        amountInDeck: 1,
        disabled: true,
        properties: {
          ACTIVE: true,
          USED: false,
          TARGET: 'SELF',
        },
      };
      const passiveItem = {
        id: 'boots_of_speed',
        name: 'Boots of Speed',
        type: ItemType.MAGIC,
        value: 0,
        amountInDeck: 1,
        properties: {
          MOVEMENT_BONUS: 1,
        },
      };
      hero.inventory = [usedItem, disabledItem, passiveItem];

      const state = createTestState(hero);
      const entries = getAvailableRadialActions(state, hero);
      const itemEntries = entries.filter(
        (e) => e.action === RadialAction.USE_ITEM,
      );

      expect(itemEntries).toHaveLength(0);
    });
  });
});

describe('OPEN_DOOR front squares', () => {
  const doorRightOfCell = (x: number, y: number) => ({
    x,
    y,
    side: Side.RIGHT,
    open: false,
    locked: false,
    hidden: false,
    trapped: false,
    trapAttacks: 0,
    reinforced: false,
  });

  it('offers OPEN_DOOR from both squares flanking the door edge', () => {
    // The hero stands on the declared door cell
    const heroOnDoorCell = createTestHero(1, 1);
    const stateOnDoorCell = createTestState(heroOnDoorCell);
    stateOnDoorCell.dungeon.layout.doors = [doorRightOfCell(1, 1)];
    expect(
      getAvailableRadialActions(stateOnDoorCell, heroOnDoorCell).some(
        (e) => e.action === RadialAction.OPEN_DOOR,
      ),
    ).toBe(true);

    // The hero stands on the offset cell, the other side of the edge
    const heroOnOffsetCell = createTestHero(2, 1);
    const stateOnOffsetCell = createTestState(heroOnOffsetCell);
    stateOnOffsetCell.dungeon.layout.doors = [doorRightOfCell(1, 1)];
    expect(
      getAvailableRadialActions(stateOnOffsetCell, heroOnOffsetCell).some(
        (e) => e.action === RadialAction.OPEN_DOOR,
      ),
    ).toBe(true);
  });

  it('does not offer OPEN_DOOR from a diagonal square of the door', () => {
    // Door on the edge between (1, 1) and (2, 1); the hero is diagonally
    // adjacent at (2, 2) — not a front square
    const hero = createTestHero(2, 2);
    const state = createTestState(hero);
    state.dungeon.layout.doors = [doorRightOfCell(1, 1)];

    expect(
      getAvailableRadialActions(state, hero).some(
        (e) => e.action === RadialAction.OPEN_DOOR,
      ),
    ).toBe(false);
  });

  it('does not offer OPEN_DOOR from a distant square', () => {
    const hero = createTestHero(4, 4);
    const state = createTestState(hero);
    state.dungeon.layout.doors = [doorRightOfCell(1, 1)];

    expect(
      getAvailableRadialActions(state, hero).some(
        (e) => e.action === RadialAction.OPEN_DOOR,
      ),
    ).toBe(false);
  });
});

describe('PICK_UP_ITEM from adjacent squares', () => {
  const floorItem = (x: number, y: number) => ({
    item: {
      id: `item_${x}_${y}`,
      name: 'Sword',
      type: ItemType.WEAPON,
      amountInDeck: 1,
      value: 0,
    },
    position: { x, y },
  });

  it('offers one entry per item on or adjacent to the hero, none for distant items', () => {
    const hero = createTestHero(2, 2);
    const state = createTestState(hero);
    state.dungeon.layout.items = [
      floorItem(2, 2), // under the hero
      floorItem(3, 2), // orthogonally adjacent
      floorItem(1, 1), // diagonally adjacent
      floorItem(4, 4), // two squares away — out of reach
    ];

    const entries = getAvailableRadialActions(state, hero).filter(
      (e) => e.action === RadialAction.PICK_UP_ITEM,
    );

    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.itemLocation?.position)).toEqual(
      expect.arrayContaining([
        { x: 2, y: 2 },
        { x: 3, y: 2 },
        { x: 1, y: 1 },
      ]),
    );
    // Each entry carries its item for the menu label and the pickup
    expect(
      entries.every(
        (e) =>
          e.item?.id ===
          `item_${String(e.itemLocation?.position.x)}_${String(
            e.itemLocation?.position.y,
          )}`,
      ),
    ).toBe(true);
  });

  it('offers PICK_UP_ITEM for an unassigned item spot next to the hero', () => {
    const hero = createTestHero(2, 2);
    const state = createTestState(hero);
    state.dungeon.layout.items = [{ position: { x: 3, y: 2 } }];

    const entries = getAvailableRadialActions(state, hero).filter(
      (e) => e.action === RadialAction.PICK_UP_ITEM,
    );

    expect(entries).toHaveLength(1);
    expect(entries[0].itemLocation?.position).toEqual({ x: 3, y: 2 });
  });
});
