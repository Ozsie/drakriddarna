import { addLog, DifficultLevels, getDifficulty, i18n } from '../core';
import type { GameState, TurnEvent } from '../types';
import { get } from 'svelte/store';
import {
  dispatch,
  gameStateStore,
  goToTestingGrounds,
  initGame,
  loadGameState,
  saveGame,
  setDebug,
  setDifficulty,
  setGameLocale,
  winLevel,
} from '../store/gameStateStore';
import { locale, setLocale } from '$lib/translations';
import { hasWon, init, loadState, save } from '../game';
import { testingGrounds } from '../dungeon/testingGrounds';
import {
  getEventsForDungeon,
  selectNextEvent,
  shuffleEventDeck,
} from '../events/EventsLogic';
import { resetLiveHeroes } from '../hero/HeroLogic';
import { campaigns } from '../campaigns';

export interface CanvasMenuItem {
  id: string;
  label: string;
  debugOnly?: boolean;
  disabled?: boolean;
  onClick: (activeState: GameState) => void;
}

export type MenuView = 'main' | 'campaign' | 'load' | 'event' | 'debug';

export interface MenuCallbacks {
  setView?: (view: MenuView) => void;
  closeMenu?: () => void;
  setState?: (state: GameState) => void;
}

export const getDebugMenuLabel = (
  activeState?: GameState | null,
  debugMode?: boolean,
): string => {
  const isDebug =
    debugMode !== undefined
      ? debugMode
      : Boolean(activeState?.settings?.['debug']);
  const translated = i18n('content.menu.mainMenu.buttons.debug');
  const prefix =
    translated === 'content.menu.mainMenu.buttons.debug'
      ? 'Debug'
      : translated || 'Debug';
  const status = isDebug ? 'On' : 'Off';
  return `${prefix}: ${status}`;
};

export const getMainMenuItems = (
  activeState: GameState,
  callbacks?: MenuCallbacks,
  debugMode?: boolean,
): CanvasMenuItem[] => {
  const items: CanvasMenuItem[] = [
    {
      id: 'new_game',
      debugOnly: false,
      label: i18n('content.menu.mainMenu.buttons.newGame'),
      onClick: () => {
        callbacks?.setView?.('campaign');
      },
    },
    {
      id: 'save_game',
      debugOnly: false,
      label: i18n('content.menu.mainMenu.buttons.saveGame'),
      onClick: (state) => {
        onSaveGame(state);
        callbacks?.closeMenu?.();
      },
    },
    {
      id: 'load_game',
      debugOnly: false,
      label: i18n('content.menu.mainMenu.buttons.loadGame'),
      onClick: () => {
        callbacks?.setView?.('load');
      },
    },
    {
      id: 'debug',
      debugOnly: false,
      label: getDebugMenuLabel(activeState, debugMode),
      onClick: (state) => {
        setDebugMode(state);
      },
    },
    {
      id: 'language',
      debugOnly: false,
      label: i18n('content.menu.mainMenu.buttons.language'),
      onClick: (state) => {
        onChangeLanguage(state);
      },
    },
    {
      id: 'difficulty',
      debugOnly: false,
      label: getDifficultyMenuLabel(activeState),
      onClick: (state) => {
        onClickDifficulty(state);
      },
    },
  ];

  if (activeState?.dungeon?.beaten) {
    items.push({
      id: 'next_level',
      debugOnly: false,
      label: i18n('content.actions.nextLevel'),
      onClick: (state) => {
        onWinLevel(state);
        callbacks?.closeMenu?.();
      },
    });
  }

  return items;
};

export const getDebugMenuItems = (
  activeState: GameState,
  callbacks?: MenuCallbacks,
): CanvasMenuItem[] => {
  const items: CanvasMenuItem[] = [
    {
      id: 'testing_grounds',
      debugOnly: false,
      label: i18n('content.menu.mainMenu.buttons.testingGrounds'),
      onClick: (state) => {
        toTestingGrounds(state);
        callbacks?.closeMenu?.();
      },
    },
    {
      id: 'shuffle_deck',
      debugOnly: false,
      label: i18n('content.menu.mainMenu.buttons.shuffleDeck'),
      onClick: (state) => {
        onShuffleDeck(state);
        callbacks?.closeMenu?.();
      },
    },
    {
      id: 'select_next_event',
      debugOnly: false,
      label: i18n('content.menu.mainMenu.buttons.selectNextEvent'),
      onClick: () => {
        callbacks?.setView?.('event');
      },
    },
  ];

  return items;
};

export const getCampaignMenuItems = (
  activeState: GameState,
  callbacks?: MenuCallbacks,
): CanvasMenuItem[] => {
  const items: CanvasMenuItem[] = Object.values(campaigns).map((campaign) => ({
    id: `campaign_${campaign.id}`,
    debugOnly: false,
    label: i18n(campaign.name),
    onClick: (state) => {
      onNewGame(campaign.id, state, callbacks?.setState);
      callbacks?.closeMenu?.();
      callbacks?.setView?.('main');
    },
  }));

  items.push({
    id: 'campaign_back',
    debugOnly: false,
    label: i18n('content.menu.loadGame.buttons.back'),
    onClick: () => {
      callbacks?.setView?.('main');
    },
  });

  return items;
};

export const getSavedGameMenuItems = (
  activeState: GameState,
  callbacks?: MenuCallbacks,
): CanvasMenuItem[] => {
  const items: CanvasMenuItem[] = [];

  if (typeof localStorage !== 'undefined') {
    const autoSave = localStorage.getItem('autosave');
    if (autoSave) {
      items.push({
        id: 'load_autosave',
        debugOnly: false,
        label: i18n('content.menu.loadGame.buttons.autoSave'),
        onClick: (state) => {
          onClickLoad(autoSave, state, callbacks?.setState);
          callbacks?.closeMenu?.();
          callbacks?.setView?.('main');
        },
      });
    }

    const manualSave = localStorage.getItem('state');
    if (manualSave) {
      items.push({
        id: 'load_manual',
        debugOnly: false,
        label: i18n('content.menu.loadGame.buttons.manualSave'),
        onClick: (state) => {
          onClickLoad(manualSave, state, callbacks?.setState);
          callbacks?.closeMenu?.();
          callbacks?.setView?.('main');
        },
      });
    }
  }

  items.push({
    id: 'load_back',
    debugOnly: false,
    label: i18n('content.menu.loadGame.buttons.back'),
    onClick: () => {
      callbacks?.setView?.('main');
    },
  });

  return items;
};

export const getEventMenuItems = (
  activeState: GameState,
  callbacks?: MenuCallbacks,
): CanvasMenuItem[] => {
  const items: CanvasMenuItem[] = (activeState?.eventDeck ?? [])
    .slice()
    .sort((a, b) => a.number - b.number)
    .map((event) => ({
      id: `event_${String(event.id ?? '')}`,
      debugOnly: false,
      label: i18n(event.nameTranslationKey ?? event.name),
      onClick: (state) => {
        onSelectNextEvent(event, state);
        callbacks?.closeMenu?.();
        callbacks?.setView?.('main');
      },
    }));

  items.push({
    id: 'event_back',
    debugOnly: false,
    label: i18n('content.menu.loadGame.buttons.back'),
    onClick: () => {
      callbacks?.setView?.('main');
    },
  });

  return items;
};

export const getMenuItemsForView = (
  view: MenuView,
  activeState: GameState,
  callbacks?: MenuCallbacks,
  debugMode?: boolean,
): CanvasMenuItem[] => {
  let items: CanvasMenuItem[] = [];
  switch (view) {
    case 'main':
      items = getMainMenuItems(activeState, callbacks, debugMode);
      break;
    case 'debug':
      items = getDebugMenuItems(activeState, callbacks);
      break;
    case 'campaign':
      items = getCampaignMenuItems(activeState, callbacks);
      break;
    case 'load':
      items = getSavedGameMenuItems(activeState, callbacks);
      break;
    case 'event':
      items = getEventMenuItems(activeState, callbacks);
      break;
  }
  const isDebug = debugMode ?? Boolean(activeState?.settings?.['debug']);
  if (!isDebug) {
    items = items.filter((item) => !item.debugOnly);
  }
  return items;
};

export const getMenuHeader = (view: MenuView): string => {
  switch (view) {
    case 'main':
      return i18n('content.menu.mainMenu.header');
    case 'debug': {
      const translated = i18n('content.menu.mainMenu.buttons.debug');
      return translated === 'content.menu.mainMenu.buttons.debug'
        ? 'Debug'
        : translated || 'Debug';
    }
    case 'campaign':
      return i18n('content.menu.selectCampaign.header');
    case 'load':
      return i18n('content.menu.loadGame.header');
    case 'event':
      return i18n('content.menu.selectNextEvent.header');
  }
};

export const onNewGame = (
  campaignId: string,
  activeState?: GameState,
  setState?: (state: GameState) => void,
) => {
  const newState = init(campaignId);
  if (setState) {
    setState(newState);
    gameStateStore.set(newState);
  } else if (activeState) {
    gameStateStore.set(newState);
  } else {
    initGame(campaignId);
  }
};

export const onClickLoad = (
  stateString: string,
  activeState?: GameState,
  setState?: (state: GameState) => void,
) => {
  try {
    const loaded = JSON.parse(stateString) as GameState;
    const newState = loadState(loaded);
    if (setState) {
      setState(newState);
      gameStateStore.set(newState);
    } else if (activeState) {
      gameStateStore.set(newState);
    } else {
      loadGameState(loaded);
    }
  } catch {
    // Ignore invalid save state JSON
  }
};

export const onWinLevel = (activeState?: GameState) => {
  if (activeState) {
    hasWon(activeState);
    gameStateStore.set(activeState);
  } else {
    winLevel();
  }
};

export const setDebugMode = (activeState?: GameState) => {
  if (activeState) {
    const newDebug = !activeState.settings['debug'];
    activeState.settings['debug'] = newDebug;
    gameStateStore.set(activeState);
  } else {
    const isDebug = Boolean(get(gameStateStore).settings?.['debug']);
    setDebug(!isDebug);
  }
};

export const onSaveGame = (activeState?: GameState) => {
  if (activeState) {
    save(activeState);
  } else {
    saveGame();
  }
};

export const toTestingGrounds = (activeState?: GameState) => {
  if (activeState) {
    activeState.dungeon = testingGrounds;
    activeState.eventDeck = getEventsForDungeon(activeState.dungeon);
    resetLiveHeroes(activeState);
    gameStateStore.set(activeState);
  } else {
    goToTestingGrounds();
  }
};

export const onShuffleDeck = (activeState?: GameState) => {
  if (activeState) {
    shuffleEventDeck(activeState);
    gameStateStore.set(activeState);
  } else {
    dispatch(shuffleEventDeck);
  }
};

export const onSelectNextEvent = (
  event: TurnEvent,
  activeState?: GameState,
) => {
  if (activeState) {
    selectNextEvent(activeState, event.id);
    gameStateStore.set(activeState);
  } else {
    dispatch((currentState) => selectNextEvent(currentState, event.id));
  }
};

export const onChangeLanguage = (activeState?: GameState) => {
  if (locale.get() === 'en') {
    void setLocale('sv');
    if (activeState) {
      activeState.settings['locale'] = 'sv';
      gameStateStore.set(activeState);
    } else {
      setGameLocale('sv');
    }
  } else {
    void setLocale('en');
    if (activeState) {
      activeState.settings['locale'] = 'en';
      gameStateStore.set(activeState);
    } else {
      setGameLocale('en');
    }
  }
};

export const onClickDifficulty = (activeState: GameState) => {
  const difficulty = getDifficulty(activeState);
  const index = DifficultLevels.findIndex(
    (level) => level.id === difficulty.id,
  );
  const nextIndex = (index + 1) % DifficultLevels.length;
  const nextDifficulty = DifficultLevels[nextIndex];
  if (activeState) {
    activeState.difficulty = nextDifficulty;
    addLog(activeState, nextDifficulty.descriptionTranslationKey ?? '');
    gameStateStore.set(activeState);
  } else {
    setDifficulty(nextDifficulty);
  }
};

export const getDifficultyMenuLabel = (activeState: GameState) => {
  const difficulty = getDifficulty(activeState);
  return (
    i18n('content.menu.mainMenu.buttons.difficulty') +
    ' ' +
    i18n(difficulty?.nameTranslationKey)
  );
};
