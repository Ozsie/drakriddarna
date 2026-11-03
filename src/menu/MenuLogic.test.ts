import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getDebugMenuHeader,
  getDebugMenuItems,
  getDebugMenuItemsForView,
  getEventMenuItems,
  getSavedGameMenuItems,
  onClickLoad,
  onNewGame,
} from './MenuLogic';
import { writeSave } from '../saves/SavesLogic';
import { Colour, type GameState, type Hero, ItemType, Level } from '../types';
import {
  DEFAULT_APP_SETTINGS,
  appSettingsStore,
  updateAppSettings,
} from '../settings/AppSettings';

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

const createMockState = (overrides: Partial<GameState> = {}): GameState => ({
  heroes: [createMockHero()],
  dungeon: {
    name: 'Test Dungeon',
    beaten: false,
    winConditions: [],
    events: [],
    intro: '',
    killCount: 0,
    discoveredRooms: ['A'],
    layout: {
      grid: ['AAA'],
      doors: [],
      monsters: [],
      secrets: [],
      interactables: [],
      items: [],
      pillars: [],
      pits: [],
      notes: [],
      corridors: [],
      corners: [],
    },
    startingPositions: [{ x: 1, y: 1 }],
  },
  actionLog: [],
  itemDeck: [],
  magicItemDeck: [],
  settings: {},
  eventDeck: [
    {
      id: '2',
      number: 2,
      name: 'Event 2',
      description: 'Event 2 desc',
      effect: 'sunStone',
      used: false,
    },
    {
      id: '1',
      number: 1,
      name: 'Event 1',
      description: 'Event 1 desc',
      effect: 'sunStone',
      used: false,
    },
  ],
  reRender: false,
  drawEvents: false,
  ...overrides,
});

describe('MenuLogic', () => {
  let mockState: GameState;
  const storageMock: Record<string, string> = {};

  beforeEach(() => {
    mockState = createMockState();
    for (const key in storageMock) {
      delete storageMock[key];
    }
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storageMock[key] ?? null,
      setItem: (key: string, value: string) => {
        storageMock[key] = value;
      },
      removeItem: (key: string) => {
        delete storageMock[key];
      },
      clear: () => {
        for (const key in storageMock) {
          delete storageMock[key];
        }
      },
    });
    appSettingsStore.set({ ...DEFAULT_APP_SETTINGS });
  });

  describe('getDebugMenuItems', () => {
    it('returns debug actions', () => {
      const items = getDebugMenuItems(mockState);
      const ids = items.map((i) => i.id);
      expect(ids).toEqual([
        'testing_grounds',
        'shuffle_deck',
        'select_next_event',
        'output_game_state',
        'reveal_map',
        'next_dungeon',
        'tile_catalog',
      ]);
    });

    it('navigates to event view on select_next_event click', () => {
      const setView = vi.fn();
      const items = getDebugMenuItems(mockState, { setView });
      const selectEventItem = items.find((i) => i.id === 'select_next_event');
      selectEventItem?.onClick(mockState);
      expect(setView).toHaveBeenCalledWith('event');
    });

    it('logs game state to console and closes menu on output_game_state click', () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const closeMenu = vi.fn();
      const items = getDebugMenuItems(mockState, { closeMenu });
      const outputGameStateItem = items.find(
        (i) => i.id === 'output_game_state',
      );
      outputGameStateItem?.onClick(mockState);
      expect(consoleSpy).toHaveBeenCalledWith(mockState);
      expect(closeMenu).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('reveals all rooms and closes menu on reveal_map click', () => {
      const closeMenu = vi.fn();
      mockState.dungeon.layout.grid = ['AAA', '#B#', ' C '];
      const items = getDebugMenuItems(mockState, { closeMenu });
      const revealMapItem = items.find((i) => i.id === 'reveal_map');

      revealMapItem?.onClick(mockState);

      expect(mockState.dungeon.discoveredRooms).toEqual(
        expect.arrayContaining(['A', 'B', 'C']),
      );
      expect(closeMenu).toHaveBeenCalled();
    });

    it('moves to the next dungeon and closes menu on next_dungeon click', () => {
      const closeMenu = vi.fn();
      mockState.dungeon.nextDungeon = {
        ...mockState.dungeon,
        name: 'Next Dungeon',
      };
      const items = getDebugMenuItems(mockState, { closeMenu });
      const nextDungeonItem = items.find((i) => i.id === 'next_dungeon');

      nextDungeonItem?.onClick(mockState);

      expect(mockState.dungeon.name).toBe('Next Dungeon');
      expect(mockState.dungeon.discoveredRooms).toEqual(['A']);
      expect(closeMenu).toHaveBeenCalled();
    });
  });

  describe('onNewGame', () => {
    it('starts a normal run without a seed when none is given', () => {
      const setState = vi.fn((state: GameState) => state);
      onNewGame('iceDragonTreasure', 'tactician', mockState, setState);
      expect(setState).toHaveBeenCalled();
      const newState = setState.mock.calls[0][0];
      expect(newState.speedrunSeed).toBeUndefined();
    });

    it('passes the speedrun seed to the new state', () => {
      const setState = vi.fn((state: GameState) => state);
      onNewGame('iceDragonTreasure', 'tactician', mockState, setState, 42);
      expect(setState).toHaveBeenCalled();
      const newState = setState.mock.calls[0][0];
      expect(newState.speedrunSeed).toBe(42);
    });

    it('starts the run in debug mode when the app setting is on', () => {
      updateAppSettings({ debugOn: true });
      const setState = vi.fn((state: GameState) => state);
      onNewGame('iceDragonTreasure', 'tactician', mockState, setState);
      const newState = setState.mock.calls[0][0];
      expect(newState.settings['debug']).toBe(true);
    });

    it('starts the run out of debug mode when the app setting is off', () => {
      updateAppSettings({ debugOn: false });
      const setState = vi.fn((state: GameState) => state);
      onNewGame('iceDragonTreasure', 'tactician', mockState, setState);
      const newState = setState.mock.calls[0][0];
      expect(newState.settings['debug']).toBe(false);
    });
  });

  describe('onClickLoad', () => {
    it('applies the app debug setting over the saved one', () => {
      const saved = createMockState();
      saved.settings['debug'] = true;
      updateAppSettings({ debugOn: false });

      const setState = vi.fn((state: GameState) => state);
      onClickLoad(JSON.stringify(saved), mockState, setState);

      const newState = setState.mock.calls[0][0];
      expect(newState.settings['debug']).toBe(false);
    });
  });

  describe('getSavedGameMenuItems', () => {
    it('returns no rows when no saved games exist', () => {
      const items = getSavedGameMenuItems(mockState);
      expect(items.map((i) => i.id)).toEqual([]);
    });

    it('returns saved games when present in localStorage', () => {
      localStorage.setItem('autosave', JSON.stringify(mockState));
      localStorage.setItem('state', JSON.stringify(mockState));

      const items = getSavedGameMenuItems(mockState);
      const ids = items.map((i) => i.id);
      expect(ids).toContain('load_autosave');
      // The legacy `state` slot is imported as a named save.
      expect(ids.some((id) => id.startsWith('load_save_'))).toBe(true);
      // The dialog has its own Back button, so there is no back item.
      expect(ids).not.toContain('load_back');
    });

    it('returns named saves with hints from the save index', () => {
      writeSave(mockState, 'My Save');

      const items = getSavedGameMenuItems(mockState);
      const saveItem = items.find((i) => i.id.startsWith('load_save_'));
      expect(saveItem?.label).toBe('My Save');
      expect(saveItem?.hint).toBeDefined();
    });

    it('loads a named save and closes the dialog on click', () => {
      writeSave(mockState, 'My Save');
      const closeDialog = vi.fn();

      const items = getSavedGameMenuItems(mockState, { closeDialog });
      const saveItem = items.find((i) => i.id.startsWith('load_save_'));
      saveItem?.onClick(mockState);
      expect(closeDialog).toHaveBeenCalled();
    });
  });

  describe('getEventMenuItems', () => {
    it('returns events sorted by event number plus back button', () => {
      const items = getEventMenuItems(mockState);
      expect(items[0].id).toBe('event_1');
      expect(items[1].id).toBe('event_2');
      expect(items[2].id).toBe('event_back');
    });

    it('selects next event and closes menu', () => {
      const closeMenu = vi.fn();
      const items = getEventMenuItems(mockState, { closeMenu });
      items[1].onClick(mockState); // click Event 2
      expect(mockState.eventDeck[0].id).toBe('2');
      expect(closeMenu).toHaveBeenCalled();
    });

    it('navigates back to the debug view on the back item', () => {
      const setView = vi.fn();
      const items = getEventMenuItems(mockState, { setView });
      items[2].onClick(mockState); // click Back
      expect(setView).toHaveBeenCalledWith('debug');
    });
  });

  describe('getDebugMenuItemsForView', () => {
    it('returns debug menu items for the debug view', () => {
      const items = getDebugMenuItemsForView('debug', mockState);
      const ids = items.map((i) => i.id);
      expect(ids).toEqual([
        'testing_grounds',
        'shuffle_deck',
        'select_next_event',
        'output_game_state',
        'reveal_map',
        'next_dungeon',
        'tile_catalog',
      ]);
    });

    it('returns event items for the event view', () => {
      const items = getDebugMenuItemsForView('event', mockState);
      expect(items.map((i) => i.id)).toEqual([
        'event_1',
        'event_2',
        'event_back',
      ]);
    });
  });

  describe('getDebugMenuHeader', () => {
    it('returns headers for all views', () => {
      expect(getDebugMenuHeader('debug')).toBe('Debug');
      expect(getDebugMenuHeader('event')).toBeTruthy();
    });
  });
});
