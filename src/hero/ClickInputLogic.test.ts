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
import {
  onTargetCell,
  screenToGridPosition,
  doMouseLogic,
} from './ClickInputLogic';
import { get } from 'svelte/store';
import { radialMenuStore } from '../store/radialMenuStore';

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
    intro: 'test-dungeon',
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
    drawEvents: true,
    ...overrides,
  };
};

describe('screenToGridPosition', () => {
  it('correctly maps centered origin coordinates to grid position when pan is (0,0)', () => {
    const viewWidth = 800;
    const viewHeight = 600;
    const cellSize = 48;
    const panX = 0;
    const panY = 0;

    // View center is (400, 300) -> world (0, 0)
    // Screen (400, 300) should map to cell (0, 0)
    const posCenter = screenToGridPosition(
      400,
      300,
      viewWidth,
      viewHeight,
      panX,
      panY,
      cellSize,
    );
    expect(posCenter).toEqual({ x: 0, y: 0 });

    // Screen (400 + 48, 300 + 48) should map to cell (1, 1)
    const pos11 = screenToGridPosition(
      448,
      348,
      viewWidth,
      viewHeight,
      panX,
      panY,
      cellSize,
    );
    expect(pos11).toEqual({ x: 1, y: 1 });

    // Screen (400 - 10, 300 - 10) should map to cell (-1, -1)
    const posNeg = screenToGridPosition(
      390,
      290,
      viewWidth,
      viewHeight,
      panX,
      panY,
      cellSize,
    );
    expect(posNeg).toEqual({ x: -1, y: -1 });
  });

  it('correctly shifts coordinates when panned', () => {
    const viewWidth = 800;
    const viewHeight = 600;
    const cellSize = 50;
    const panX = 100;
    const panY = -50;

    // Origin is now at screen (400 + 100, 300 - 50) = (500, 250)
    const posAtOrigin = screenToGridPosition(
      500,
      250,
      viewWidth,
      viewHeight,
      panX,
      panY,
      cellSize,
    );
    expect(posAtOrigin).toEqual({ x: 0, y: 0 });

    const pos23 = screenToGridPosition(
      500 + 2 * 50 + 10,
      250 + 3 * 50 + 10,
      viewWidth,
      viewHeight,
      panX,
      panY,
      cellSize,
    );
    expect(pos23).toEqual({ x: 2, y: 3 });
  });
});

describe('doMouseLogic with camera', () => {
  it('handles clicks using camera offset and triggers hero interaction or movement', () => {
    const state = createTestState();
    const hero = state.currentActor as Hero;
    expect(hero.position).toEqual({ x: 1, y: 1 });

    const mockElement = {
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
        right: 800,
        bottom: 600,
      }),
    };
    const origDocument = globalThis.document;
    globalThis.document = {
      getElementById: (id: string) => {
        if (id === 'gameBoard') return mockElement as unknown as HTMLElement;
        return null;
      },
    } as unknown as Document;

    try {
      // With origin at center (400, 300) and pan (0,0), cell (1,1) is at screen (400+48, 300+48) = (448, 348)
      // Clicking on hero at (1,1) opens radial menu
      const heroClickEvent = {
        clientX: 448 + 10,
        clientY: 348 + 10,
      } as MouseEvent;

      doMouseLogic(heroClickEvent, 48, state, {
        panX: 0,
        panY: 0,
        viewWidth: 800,
        viewHeight: 600,
      });

      const menu = get(radialMenuStore);
      expect(menu).not.toBeNull();
      expect(menu?.x).toBe(1);
      expect(menu?.y).toBe(1);

      // Now click on cell (2, 1) -> screen (400 + 2*48 + 10, 300 + 1*48 + 10) = (506, 358)
      const moveClickEvent = {
        clientX: 506,
        clientY: 358,
      } as MouseEvent;

      doMouseLogic(moveClickEvent, 48, state, {
        panX: 0,
        panY: 0,
        viewWidth: 800,
        viewHeight: 600,
      });

      // Hero should have moved to (2, 1)
      expect(hero.position).toEqual({ x: 2, y: 1 });
    } finally {
      globalThis.document = origDocument;
    }
  });

  it('ignores clicks outside dungeon bounds', () => {
    const state = createTestState();
    const hero = state.currentActor as Hero;
    expect(hero.position).toEqual({ x: 1, y: 1 });

    const mockElement = {
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
        right: 800,
        bottom: 600,
      }),
    };
    const origDocument = globalThis.document;
    globalThis.document = {
      getElementById: (id: string) => {
        if (id === 'gameBoard') return mockElement as unknown as HTMLElement;
        return null;
      },
    } as unknown as Document;

    try {
      // Click way outside at negative screen coordinates
      const outsideEvent = {
        clientX: 50,
        clientY: 50,
      } as MouseEvent;

      doMouseLogic(outsideEvent, 48, state, {
        panX: 0,
        panY: 0,
        viewWidth: 800,
        viewHeight: 600,
      });

      // Hero should not have moved
      expect(hero.position).toEqual({ x: 1, y: 1 });
    } finally {
      globalThis.document = origDocument;
    }
  });
});

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
