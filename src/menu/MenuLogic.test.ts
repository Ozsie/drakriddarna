import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getMainMenuItems,
  getDebugMenuItems,
  getCampaignMenuItems,
  getSavedGameMenuItems,
  getEventMenuItems,
  getMenuItemsForView,
  getMenuHeader,
  getDifficultyMenuLabel,
  getDebugMenuLabel,
} from './MenuLogic';
import { DifficultLevels } from '../core';
import { Colour, ItemType, Level, type GameState, type Hero } from '../types';

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
  });

  describe('getMainMenuItems', () => {
    it('returns standard menu items when dungeon is not beaten', () => {
      const items = getMainMenuItems(mockState);
      const ids = items.map((i) => i.id);
      expect(ids).toContain('new_game');
      expect(ids).toContain('save_game');
      expect(ids).toContain('load_game');
      expect(ids).toContain('debug');
      expect(ids).toContain('language');
      expect(ids).toContain('difficulty');
      expect(ids).not.toContain('testing_grounds');
      expect(ids).not.toContain('shuffle_deck');
      expect(ids).not.toContain('select_next_event');
      expect(ids).not.toContain('next_level');
    });

    it('shows active or inactive state in debug label', () => {
      mockState.settings['debug'] = false;
      const offItems = getMainMenuItems(mockState);
      const debugOff = offItems.find((i) => i.id === 'debug');
      expect(debugOff?.label).toBe('Debug: Off');

      mockState.settings['debug'] = true;
      const onItems = getMainMenuItems(mockState);
      const debugOn = onItems.find((i) => i.id === 'debug');
      expect(debugOn?.label).toBe('Debug: On');
    });

    it('includes next_level when dungeon is beaten', () => {
      mockState.dungeon.beaten = true;
      const items = getMainMenuItems(mockState);
      const ids = items.map((i) => i.id);
      expect(ids).toContain('next_level');
    });

    it('navigates to campaign view on new_game click', () => {
      const setView = vi.fn();
      const items = getMainMenuItems(mockState, { setView });
      const newGameItem = items.find((i) => i.id === 'new_game');
      newGameItem?.onClick(mockState);
      expect(setView).toHaveBeenCalledWith('campaign');
    });

    it('navigates to load view on load_game click', () => {
      const setView = vi.fn();
      const items = getMainMenuItems(mockState, { setView });
      const loadGameItem = items.find((i) => i.id === 'load_game');
      loadGameItem?.onClick(mockState);
      expect(setView).toHaveBeenCalledWith('load');
    });

    it('toggles debug mode on debug item click', () => {
      mockState.settings['debug'] = false;
      const items = getMainMenuItems(mockState);
      const debugItem = items.find((i) => i.id === 'debug');
      debugItem?.onClick(mockState);
      expect(mockState.settings['debug']).toBe(true);
      debugItem?.onClick(mockState);
      expect(mockState.settings['debug']).toBe(false);
    });

    it('cycles difficulty on difficulty item click', () => {
      mockState.difficulty = DifficultLevels[0];
      const items = getMainMenuItems(mockState);
      const difficultyItem = items.find((i) => i.id === 'difficulty');
      difficultyItem?.onClick(mockState);
      expect(mockState.difficulty).toEqual(DifficultLevels[1]);
    });
  });

  describe('getDebugMenuItems', () => {
    it('returns debug actions', () => {
      const items = getDebugMenuItems(mockState);
      const ids = items.map((i) => i.id);
      expect(ids).toEqual([
        'testing_grounds',
        'shuffle_deck',
        'select_next_event',
      ]);
    });

    it('navigates to event view on select_next_event click', () => {
      const setView = vi.fn();
      const items = getDebugMenuItems(mockState, { setView });
      const selectEventItem = items.find((i) => i.id === 'select_next_event');
      selectEventItem?.onClick(mockState);
      expect(setView).toHaveBeenCalledWith('event');
    });
  });

  describe('getCampaignMenuItems', () => {
    it('returns campaigns and a back button', () => {
      const items = getCampaignMenuItems(mockState);
      expect(items.length).toBeGreaterThan(1);
      const backItem = items.find((i) => i.id === 'campaign_back');
      expect(backItem).toBeDefined();
    });

    it('navigates back to main on back button click', () => {
      const setView = vi.fn();
      const items = getCampaignMenuItems(mockState, { setView });
      const backItem = items.find((i) => i.id === 'campaign_back');
      backItem?.onClick(mockState);
      expect(setView).toHaveBeenCalledWith('main');
    });
  });

  describe('getSavedGameMenuItems', () => {
    it('returns only back button when no saved games exist', () => {
      const items = getSavedGameMenuItems(mockState);
      expect(items.map((i) => i.id)).toEqual(['load_back']);
    });

    it('returns saved games when present in localStorage', () => {
      localStorage.setItem('autosave', JSON.stringify(mockState));
      localStorage.setItem('state', JSON.stringify(mockState));

      const items = getSavedGameMenuItems(mockState);
      const ids = items.map((i) => i.id);
      expect(ids).toContain('load_autosave');
      expect(ids).toContain('load_manual');
      expect(ids).toContain('load_back');
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
  });

  describe('getMenuItemsForView', () => {
    it('returns main menu items for main view', () => {
      const items = getMenuItemsForView('main', mockState);
      expect(items.some((i) => i.id === 'new_game')).toBe(true);
    });

    it('returns debug menu items for debug view', () => {
      const items = getMenuItemsForView('debug', mockState);
      const ids = items.map((i) => i.id);
      expect(ids).toEqual([
        'testing_grounds',
        'shuffle_deck',
        'select_next_event',
      ]);
    });
  });

  describe('getMenuHeader and getDifficultyMenuLabel', () => {
    it('returns headers for all views', () => {
      expect(getMenuHeader('main')).toBeTruthy();
      expect(getMenuHeader('debug')).toBeTruthy();
      expect(getMenuHeader('campaign')).toBeTruthy();
      expect(getMenuHeader('load')).toBeTruthy();
      expect(getMenuHeader('event')).toBeTruthy();
    });

    it('returns formatted difficulty label', () => {
      mockState.difficulty = DifficultLevels[0];
      const label = getDifficultyMenuLabel(mockState);
      expect(label).toBeTruthy();
    });

    it('returns formatted debug menu label', () => {
      expect(getDebugMenuLabel(mockState, true)).toBe('Debug: On');
      expect(getDebugMenuLabel(mockState, false)).toBe('Debug: Off');
    });
  });
});
