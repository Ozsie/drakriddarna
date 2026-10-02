import { describe, expect, it, vi } from 'vitest';
import {
  Colour,
  ConditionType,
  type Dungeon,
  type GameState,
  type Hero,
  ItemType,
  Level,
  SecretType,
  Side,
  type Weapon,
} from '../types';
import {
  registerInteractableEffect,
  getInteractableEffect,
  triggerInteractable,
  NEXT_DUNGEON,
} from './InteractableLogic';
import {
  getAvailableRadialActions,
  RadialAction,
} from '../hero/RadialMenuLogic';
import { defineDungeon, parseTileMap } from '../dungeon/dungeonParser';
import { validateLayout } from '../dungeon/dungeonValidator';
import { interact, newHero, search } from '../hero/HeroLogic';
import { resetRng, setRng } from '../core';

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
    discoveredRooms: ['A', 'B'],
    layout: {
      grid: [
        '#######',
        '#AAAAA#',
        '#AAAAA#',
        '#BBBBB#',
        '#BBBBB#',
        '#BBBBB#',
        '#######',
      ],
      doors: [],
      monsters: [],
      secrets: [],
      notes: [],
      items: [],
      interactables: [],
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

describe('InteractableLogic', () => {
  it('registers and retrieves custom interactable effects', () => {
    const handler = vi.fn();
    registerInteractableEffect('customLeverEffect', handler);

    expect(getInteractableEffect('customLeverEffect')).toBe(handler);

    const hero = createTestHero(2, 2);
    const state = createTestState(hero);
    const interactable = {
      position: { x: 2, y: 2 },
      effect: 'customLeverEffect',
      oneTime: true,
      interacted: false,
    };

    const triggered = triggerInteractable(state, interactable, hero);
    expect(triggered).toBe(true);
    expect(handler).toHaveBeenCalledWith(state, interactable, hero);
    expect(interactable.interacted).toBe(true);

    // One-time interactable should not trigger again
    const triggeredAgain = triggerInteractable(state, interactable, hero);
    expect(triggeredAgain).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  describe('addHero effect', () => {
    it('adds a new hero to the current heroes party at the interactable position', () => {
      const hero = createTestHero(1, 1);
      const state = createTestState(hero);

      const interactable = {
        position: { x: 2, y: 2 },
        effect: 'addHero',
        args: {
          name: 'Rescued Knight',
          colour: Colour.Blue,
        },
        oneTime: true,
      };

      triggerInteractable(state, interactable, hero);

      expect(state.heroes.length).toBe(2);
      const added = state.heroes.find((h) => h.name === 'Rescued Knight');
      expect(added).toBeDefined();
      expect(added?.colour).toBe(Colour.Blue);
      expect(added?.position).toEqual({ x: 2, y: 2 });
    });

    it('adds an existing hero object to current heroes party', () => {
      const hero = createTestHero(1, 1);
      const state = createTestState(hero);
      const alliedHero = newHero('Thor', Colour.Red);
      alliedHero.health = 5;

      const interactable = {
        position: { x: 3, y: 3 },
        effect: 'addHero',
        args: {
          hero: alliedHero,
          position: { x: 4, y: 4 },
        },
        oneTime: true,
      };

      triggerInteractable(state, interactable, hero);

      expect(state.heroes.length).toBe(2);
      expect(state.heroes).toContain(alliedHero);
      expect(alliedHero.position).toEqual({ x: 4, y: 4 });
    });
  });

  describe('removeTrapsInRoom effect', () => {
    it('disarms all trapped doors and trap doors in the specified room', () => {
      const hero = createTestHero(1, 1);
      const state = createTestState(hero);

      state.dungeon.layout.doors = [
        {
          id: 'door_A',
          x: 2,
          y: 2,
          side: Side.DOWN,
          open: false,
          locked: false,
          hidden: false,
          trapped: true,
          trapAttacks: 2,
          reinforced: false,
        },
        {
          id: 'door_B',
          x: 4,
          y: 4,
          side: Side.RIGHT,
          open: false,
          locked: false,
          hidden: false,
          trapped: true,
          trapAttacks: 1,
          reinforced: false,
        },
      ];

      state.dungeon.layout.secrets = [
        {
          id: 'secret_trap_A',
          name: 'Trap in room A',
          type: SecretType.TRAP_DOOR,
          position: { x: 3, y: 2 },
          found: false,
        },
        {
          id: 'secret_trap_B',
          name: 'Trap in room B',
          type: SecretType.TRAP_DOOR,
          position: { x: 3, y: 4 },
          found: false,
        },
      ];

      // Interactable in room A
      const interactable = {
        position: { x: 1, y: 1 },
        effect: 'removeTrapsInRoom',
        args: { room: 'A' },
        oneTime: true,
      };

      triggerInteractable(state, interactable, hero);

      // Trapped door in room A should be disarmed
      const doorA = state.dungeon.layout.doors.find((d) => d.id === 'door_A');
      expect(doorA?.trapped).toBe(false);
      expect(doorA?.trapAttacks).toBe(0);

      // Trap door in room A should be marked found/disarmed
      const secretTrapA = state.dungeon.layout.secrets.find(
        (s) => s.id === 'secret_trap_A',
      );
      expect(secretTrapA?.found).toBe(true);

      // Room B traps should remain unchanged
      const doorB = state.dungeon.layout.doors.find((d) => d.id === 'door_B');
      expect(doorB?.trapped).toBe(true);
      const secretTrapB = state.dungeon.layout.secrets.find(
        (s) => s.id === 'secret_trap_B',
      );
      expect(secretTrapB?.found).toBe(false);
    });

    it('infers room automatically from interactable cell position if not specified in args', () => {
      const hero = createTestHero(2, 4);
      const state = createTestState(hero);

      state.dungeon.layout.doors = [
        {
          id: 'door_B',
          x: 2,
          y: 4,
          side: Side.UP,
          open: false,
          locked: false,
          hidden: false,
          trapped: true,
          trapAttacks: 2,
          reinforced: false,
        },
      ];

      // Position (2, 4) is in room 'B'
      const interactable = {
        position: { x: 2, y: 4 },
        effect: 'removeTrapsInRoom',
        oneTime: true,
      };

      triggerInteractable(state, interactable, hero);

      const doorB = state.dungeon.layout.doors.find((d) => d.id === 'door_B');
      expect(doorB?.trapped).toBe(false);
    });
  });

  describe('Radial menu integration', () => {
    it('includes RadialAction.INTERACT when hero is standing on an interactable cell', () => {
      const hero = createTestHero(2, 2);
      const state = createTestState(hero);
      state.dungeon.layout.interactables = [
        {
          position: { x: 2, y: 2 },
          effect: 'addHero',
          oneTime: true,
          interacted: false,
        },
      ];

      const entries = getAvailableRadialActions(state, hero);
      const actions = entries.map((e) => e.action);

      expect(actions).toContain(RadialAction.INTERACT);
      const interactEntry = entries.find(
        (e) => e.action === RadialAction.INTERACT,
      );
      expect(interactEntry?.interactable).toBeDefined();
    });

    it('does not include RadialAction.INTERACT if interactable has already been used and is oneTime', () => {
      const hero = createTestHero(2, 2);
      const state = createTestState(hero);
      state.dungeon.layout.interactables = [
        {
          position: { x: 2, y: 2 },
          effect: 'addHero',
          oneTime: true,
          interacted: true,
        },
      ];

      const entries = getAvailableRadialActions(state, hero);
      const actions = entries.map((e) => e.action);

      expect(actions).not.toContain(RadialAction.INTERACT);
    });

    it('blocks interaction when interactable has secret: true, until discovered via search action', () => {
      setRng(() => 0.75); // Math.floor(0.75 * 6) + 1 = 5 (Apprentice success)
      try {
        const hero = createTestHero(2, 2);
        const state = createTestState(hero);
        state.dungeon.layout.interactables = [
          {
            position: { x: 2, y: 2 },
            effect: 'addHero',
            name: 'Hidden Oswin',
            args: { name: 'Oswin' },
            oneTime: true,
            interacted: false,
            secret: true,
          },
        ];

        // 1. Secret interactable is not in radial menu
        let entries = getAvailableRadialActions(state, hero);
        expect(entries.map((e) => e.action)).not.toContain(
          RadialAction.INTERACT,
        );

        // 2. Direct interact call fails
        const directResult = interact(state);
        expect(directResult).toBe(false);
        expect(state.heroes.length).toBe(1);

        // 3. Hero searches and finds the secret interactable
        search(state);
        expect(state.dungeon.layout.interactables[0].secret).toBe(false);
        expect(
          state.actionLog.some(
            (log) => log.key === 'logs.heroAction.foundSecret',
          ),
        ).toBe(true);

        // Reset hero actions for next step
        hero.actions = 2;

        // 4. Secret interactable is now available in radial menu and can be interacted with
        entries = getAvailableRadialActions(state, hero);
        expect(entries.map((e) => e.action)).toContain(RadialAction.INTERACT);

        const interactResult = interact(state);
        expect(interactResult).toBe(true);
        expect(state.heroes.length).toBe(2);
        expect(state.dungeon.layout.interactables[0].interacted).toBe(true);
      } finally {
        resetRng();
      }
    });

    it('keeps interactable hidden when search roll fails or hero is out of range', () => {
      setRng(() => 0.1); // Math.floor(0.1 * 6) + 1 = 1 (Apprentice fails)
      try {
        const hero = createTestHero(2, 2);
        const state = createTestState(hero);
        state.dungeon.layout.interactables = [
          {
            position: { x: 2, y: 2 },
            effect: 'addHero',
            secret: true,
          },
        ];

        search(state);
        expect(state.dungeon.layout.interactables[0].secret).toBe(true);
        expect(interact(state)).toBe(false);
      } finally {
        resetRng();
      }
    });

    it('triggerInteractable returns false directly when interactable is secret', () => {
      const hero = createTestHero(2, 2);
      const state = createTestState(hero);
      const interactable = {
        position: { x: 2, y: 2 },
        effect: 'addHero',
        args: { name: 'Hidden Ally' },
        secret: true,
      };

      const result = triggerInteractable(state, interactable, hero);
      expect(result).toBe(false);
      expect(state.heroes.length).toBe(1);
    });

    it('interact function consumes hero action and triggers effect', () => {
      const hero = createTestHero(2, 2);
      const state = createTestState(hero);
      state.dungeon.layout.interactables = [
        {
          position: { x: 2, y: 2 },
          effect: 'addHero',
          args: { name: 'New Knight' },
          oneTime: true,
          interacted: false,
        },
      ];

      expect(hero.actions).toBe(2);
      const result = interact(state);

      expect(result).toBe(true);
      expect(hero.actions).toBe(1);
      expect(state.heroes.length).toBe(2);
      expect(state.dungeon.layout.interactables[0].interacted).toBe(true);
    });

    describe('nextDungeon effect', () => {
      it('NEXT_DUNGEON constant is defined as nextDungeon', () => {
        expect(NEXT_DUNGEON).toBe('nextDungeon');
      });

      it('transitions heroes to next dungeon when nextDungeon effect is triggered', () => {
        const hero = createTestHero(2, 2);
        const state = createTestState(hero);
        state.campaignId = 'iceDragonTreasure';

        const nextDungeonDef: Dungeon = {
          ...state.dungeon,
          name: 'campaign.iceDragon.e1m1.name',
          startingPositions: [{ x: 1, y: 1 }],
        };
        state.dungeon.nextDungeon = nextDungeonDef;

        const interactable = {
          position: { x: 2, y: 2 },
          effect: 'nextDungeon',
          oneTime: true,
        };

        const result = triggerInteractable(state, interactable, hero);

        expect(result).toBe(true);
        expect(state.dungeon.name).toBe('campaign.iceDragon.e1m1.name');
        expect(state.actionLog[0].key).toBe('logs.youHaveReached');
        expect(state.turnCount).toBe(0);
      });

      it('transitions to next dungeon specified in args.nextDungeon', () => {
        const hero = createTestHero(2, 2);
        const state = createTestState(hero);
        state.campaignId = 'iceDragonTreasure';

        const customNextDungeon: Dungeon = {
          ...state.dungeon,
          name: 'campaign.custom.next.name',
          startingPositions: [{ x: 3, y: 3 }],
        };

        const interactable = {
          position: { x: 2, y: 2 },
          effect: NEXT_DUNGEON,
          args: { nextDungeon: customNextDungeon },
          oneTime: true,
        };

        const result = triggerInteractable(state, interactable, hero);

        expect(result).toBe(true);
        expect(state.dungeon.name).toBe('campaign.custom.next.name');
      });

      it('marks dungeon beaten if no next dungeon is configured', () => {
        const hero = createTestHero(2, 2);
        const state = createTestState(hero);
        state.dungeon.nextDungeon = undefined;

        const interactable = {
          position: { x: 2, y: 2 },
          effect: 'nextDungeon',
          oneTime: true,
        };

        const result = triggerInteractable(state, interactable, hero);

        expect(result).toBe(true);
        expect(state.dungeon.beaten).toBe(true);
        expect(
          state.actionLog.some(
            (log) => log.key === 'logs.allConditionsFulfilled',
          ),
        ).toBe(true);
      });

      it('supports NEXT_SCENARIO alias', () => {
        const hero = createTestHero(2, 2);
        const state = createTestState(hero);

        const nextDungeonDef: Dungeon = {
          ...state.dungeon,
          name: 'campaign.iceDragon.e1m1.name',
          startingPositions: [{ x: 1, y: 1 }],
        };
        state.dungeon.nextDungeon = nextDungeonDef;

        const interactable = {
          position: { x: 2, y: 2 },
          effect: 'NEXT_SCENARIO',
          oneTime: true,
        };

        const result = triggerInteractable(state, interactable, hero);

        expect(result).toBe(true);
        expect(state.dungeon.name).toBe('campaign.iceDragon.e1m1.name');
      });
    });
  });

  describe('Dungeon Parser & Validator', () => {
    it('parses interactables defined in declarative layout', () => {
      const dungeon = defineDungeon({
        name: 'Interactable Dungeon',
        intro: 'Intro',
        winConditions: [{ type: ConditionType.KILL_ALL, fulfilled: false }],
        startingPositions: [[1, 1]],
        layout: {
          grid: ['#####', '#AAA#', '#AAA#', '#####'],
          interactables: [
            [
              2,
              2,
              'removeTrapsInRoom',
              { room: 'A', secret: true },
              'trap_lever',
            ],
            {
              x: 1,
              y: 2,
              effect: 'addHero',
              name: 'Rescue Cage',
              id: 'cage_1',
              secret: false,
            },
          ],
        },
      });

      expect(dungeon.layout.interactables?.length).toBe(2);
      expect(dungeon.layout.interactables?.[0]).toMatchObject({
        position: { x: 2, y: 2 },
        effect: 'removeTrapsInRoom',
        id: 'trap_lever',
        secret: true,
      });
      expect(dungeon.layout.interactables?.[1]).toMatchObject({
        position: { x: 1, y: 2 },
        effect: 'addHero',
        name: 'Rescue Cage',
        id: 'cage_1',
        secret: false,
      });
    });

    it('parses interactables from tile map legend', () => {
      const result = parseTileMap(['###', '#L#', '###'], {
        '#': { roomOrTile: '#' },
        L: {
          roomOrTile: 'A',
          interactable: {
            effect: 'addHero',
            name: 'Rescued Ally',
            id: 'ally_lever',
            secret: true,
          },
        },
      });

      expect(result.interactables.length).toBe(1);
      expect(result.interactables[0]).toMatchObject({
        position: { x: 1, y: 1 },
        effect: 'addHero',
        name: 'Rescued Ally',
        id: 'ally_lever',
        secret: true,
      });
    });

    it('validates interactable positions and duplicate ids', () => {
      const invalidLayout = {
        grid: ['###', '#A#', '###'],
        doors: [],
        monsters: [],
        secrets: [],
        notes: [],
        items: [],
        corners: [],
        corridors: [],
        interactables: [
          { position: { x: 0, y: 0 }, effect: 'someEffect', id: 'dup' }, // on wall
          { position: { x: 1, y: 1 }, effect: 'someEffect', id: 'dup' }, // duplicate id
        ],
      };

      const res = validateLayout(invalidLayout);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.type === 'overlap')).toBe(true);
      expect(res.errors.some((e) => e.type === 'duplicate_id')).toBe(true);
    });
  });
});
