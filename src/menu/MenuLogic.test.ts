import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getCampaignMenuItems,
  getDebugMenuItems,
  getDebugMenuLabel,
  getDifficultyMenuLabel,
  getEventMenuItems,
  getGameMasterMenuItems,
  getMainMenuItems,
  getMenuHeader,
  getMenuItemsForView,
  getMusicMenuLabel,
  getRightsMenuItems,
  getSavedGameMenuItems,
  getSelectedCampaign,
  setSelectedCampaign,
} from './MenuLogic';
import { DifficultLevels } from '../core';
import { Colour, type GameState, type Hero, ItemType, Level } from '../types';

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
      expect(ids).toContain('music');
      expect(ids).toContain('language');
      expect(ids).toContain('difficulty');
      expect(ids).toContain('rights');
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

    it('shows active or inactive state in music label and defaults to on', () => {
      delete mockState.settings['music'];
      const defaultItems = getMainMenuItems(mockState);
      const musicDefault = defaultItems.find((i) => i.id === 'music');
      expect(musicDefault?.label).toBe('Music: On');

      mockState.settings['music'] = false;
      const offItems = getMainMenuItems(mockState);
      const musicOff = offItems.find((i) => i.id === 'music');
      expect(musicOff?.label).toBe('Music: Off');

      mockState.settings['music'] = true;
      const onItems = getMainMenuItems(mockState);
      const musicOn = onItems.find((i) => i.id === 'music');
      expect(musicOn?.label).toBe('Music: On');
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

    it('navigates to rights view on rights click', () => {
      const setView = vi.fn();
      const items = getMainMenuItems(mockState, { setView });
      const rightsItem = items.find((i) => i.id === 'rights');
      rightsItem?.onClick(mockState);
      expect(setView).toHaveBeenCalledWith('rights');
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

    it('toggles music mode on music item click', () => {
      delete mockState.settings['music'];
      const items = getMainMenuItems(mockState);
      const musicItem = items.find((i) => i.id === 'music');
      musicItem?.onClick(mockState);
      expect(mockState.settings['music']).toBe(false);
      musicItem?.onClick(mockState);
      expect(mockState.settings['music']).toBe(true);
    });

    it('cycles difficulty on difficulty item click', () => {
      mockState.gameMaster = DifficultLevels[0];
      const items = getMainMenuItems(mockState);
      const difficultyItem = items.find((i) => i.id === 'difficulty');
      difficultyItem?.onClick(mockState);
      expect(mockState.gameMaster).toEqual(DifficultLevels[1]);
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
        'output_game_state',
        'reveal_map',
        'next_dungeon',
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

  describe('getCampaignMenuItems', () => {
    it('returns campaigns and a back button', () => {
      const items = getCampaignMenuItems(mockState);
      expect(items.length).toBeGreaterThan(1);
      const backItem = items.find((i) => i.id === 'campaign_back');
      expect(backItem).toBeDefined();
    });

    it('navigates to gameMaster view and sets selected campaign on campaign selection', () => {
      const setView = vi.fn();
      const items = getCampaignMenuItems(mockState, { setView });
      const campaignItem = items.find((i) => i.id !== 'campaign_back');
      campaignItem?.onClick(mockState);
      expect(setView).toHaveBeenCalledWith('gameMaster');
      expect(getSelectedCampaign()).toBe(
        campaignItem?.id.replace('campaign_', ''),
      );
    });

    it('navigates back to main on back button click', () => {
      const setView = vi.fn();
      const items = getCampaignMenuItems(mockState, { setView });
      const backItem = items.find((i) => i.id === 'campaign_back');
      backItem?.onClick(mockState);
      expect(setView).toHaveBeenCalledWith('main');
    });
  });

  describe('getGameMasterMenuItems', () => {
    it('returns game masters and a back button', () => {
      const items = getGameMasterMenuItems(mockState);
      expect(items.length).toBeGreaterThan(1);
      const backItem = items.find((i) => i.id === 'gameMaster_back');
      expect(backItem).toBeDefined();
    });

    it('navigates back to campaign on back button click', () => {
      const setView = vi.fn();
      const items = getGameMasterMenuItems(mockState, { setView });
      const backItem = items.find((i) => i.id === 'gameMaster_back');
      backItem?.onClick(mockState);
      expect(setView).toHaveBeenCalledWith('campaign');
    });

    it('starts new game, closes menu, and resets view to main on game master selection', () => {
      const setView = vi.fn();
      const closeMenu = vi.fn();
      const setState = vi.fn();
      setSelectedCampaign('iceDragonTreasure');
      const items = getGameMasterMenuItems(mockState, {
        setView,
        closeMenu,
        setState,
      });
      const gmItem = items.find((i) => i.id === 'gameMaster_tactician');
      expect(gmItem).toBeDefined();
      gmItem?.onClick(mockState);
      expect(setState).toHaveBeenCalled();
      expect(closeMenu).toHaveBeenCalled();
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

  describe('getRightsMenuItems', () => {
    it('returns ownership, music, sfx, graphics, and back items', () => {
      const items = getRightsMenuItems(mockState);
      const ids = items.map((i) => i.id);
      expect(ids).toEqual([
        'rights_implementation',
        'rights_music',
        'rights_sfx',
        'rights_graphics',
        'rights_back',
      ]);
    });

    it('navigates back to main on back button click', () => {
      const setView = vi.fn();
      const items = getRightsMenuItems(mockState, { setView });
      const backItem = items.find((i) => i.id === 'rights_back');
      backItem?.onClick(mockState);
      expect(setView).toHaveBeenCalledWith('main');
    });

    it('opens AlkaKrab website when music links are clicked', () => {
      const openSpy = vi.fn();
      vi.stubGlobal('window', { open: openSpy });

      const items = getRightsMenuItems(mockState);
      const musicItem = items.find((i) => i.id === 'rights_music');

      musicItem?.onClick(mockState);
      expect(openSpy).toHaveBeenCalledWith(
        'https://lostintheforest.bandcamp.com/',
        '_blank',
        'noopener,noreferrer',
      );
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
        'output_game_state',
        'reveal_map',
        'next_dungeon',
      ]);
    });

    it('returns campaign menu items for campaign view', () => {
      const items = getMenuItemsForView('campaign', mockState);
      const ids = items.map((i) => i.id);
      expect(ids).toContain('campaign_back');
    });

    it('returns game master menu items for gameMaster view', () => {
      const items = getMenuItemsForView('gameMaster', mockState);
      const ids = items.map((i) => i.id);
      expect(ids).toContain('gameMaster_tactician');
      expect(ids).toContain('gameMaster_back');
    });

    it('returns rights menu items for rights view', () => {
      const items = getMenuItemsForView('rights', mockState);
      const ids = items.map((i) => i.id);
      expect(ids).toContain('rights_implementation');
      expect(ids).toContain('rights_music');
      expect(ids).toContain('rights_back');
    });
  });

  describe('getMenuHeader and getDifficultyMenuLabel', () => {
    it('returns headers for all views', () => {
      expect(getMenuHeader('main')).toBeTruthy();
      expect(getMenuHeader('debug')).toBeTruthy();
      expect(getMenuHeader('campaign')).toBeTruthy();
      expect(getMenuHeader('gameMaster')).toBeTruthy();
      expect(getMenuHeader('load')).toBeTruthy();
      expect(getMenuHeader('event')).toBeTruthy();
      expect(getMenuHeader('rights')).toBeTruthy();
    });

    it('returns formatted difficulty label', () => {
      mockState.gameMaster = DifficultLevels[0];
      const label = getDifficultyMenuLabel(mockState);
      expect(label).toBeTruthy();
    });

    it('returns formatted debug menu label', () => {
      expect(getDebugMenuLabel(mockState, true)).toBe('Debug: On');
      expect(getDebugMenuLabel(mockState, false)).toBe('Debug: Off');
    });

    it('returns formatted music menu label', () => {
      expect(getMusicMenuLabel(mockState, true)).toBe('Music: On');
      expect(getMusicMenuLabel(mockState, false)).toBe('Music: Off');
    });
  });
});
