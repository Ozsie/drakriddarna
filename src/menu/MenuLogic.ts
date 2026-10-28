import {
  addLog,
  DEFAULT_GAME_MASTER_ID,
  DifficultLevels,
  getDifficulty,
  i18n,
} from '../core';
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
  setMusic,
  winLevel,
} from '../store/gameStateStore';
import { locale, setLocale } from '$lib/translations';
import { hasWon, init, loadState, save } from '../game';
import {
  getSaveHint,
  getSaveHintFromStateString,
  listSaves,
  readSaveStateString,
} from '../saves/SavesLogic';
import { testingGrounds } from '../dungeon/testingGrounds';
import {
  getEventsForDungeon,
  selectNextEvent,
  shuffleEventDeck,
} from '../events/EventsLogic';
import { resetLiveHeroes } from '../hero/HeroLogic';
import { revealFullMap } from '../dungeon/RoomEffectsLogic';
import { goToNextDungeon } from '../dungeon/BetweenDungeonsLogic';
import { DEFAULT_CAMPAIGN_ID } from '../campaigns';

export interface CanvasMenuItem {
  id: string;
  label: string;
  hint?: string;
  debugOnly?: boolean;
  disabled?: boolean;
  onClick: (activeState: GameState) => void;
}

export type MenuView = 'main' | 'event' | 'debug' | 'rights';

export interface MenuCallbacks {
  setView?: (view: MenuView) => void;
  closeMenu?: () => void;
  setState?: (state: GameState) => void;
  /** Opens the centered save dialog (name input), from the main menu. */
  openSaveDialog?: () => void;
  /** Opens the centered load dialog (list of saves), from the main menu. */
  openLoadDialog?: () => void;
  /** Opens the centered new-game dialog (campaign, game master, seed). */
  openNewGameDialog?: () => void;
  /** Dismisses the save/load dialog; passed to its load-row items. */
  closeDialog?: () => void;
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

export const getMusicMenuLabel = (
  activeState?: GameState | null,
  musicMode?: boolean,
): string => {
  const isMusic =
    musicMode !== undefined
      ? musicMode
      : activeState?.settings?.['music'] !== false;
  const translated = i18n('content.menu.mainMenu.buttons.music');
  const prefix =
    translated === 'content.menu.mainMenu.buttons.music'
      ? 'Music'
      : translated || 'Music';
  const status = isMusic ? 'On' : 'Off';
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
        callbacks?.openNewGameDialog?.();
        callbacks?.closeMenu?.();
      },
    },
    {
      id: 'save_game',
      debugOnly: false,
      label: i18n('content.menu.mainMenu.buttons.saveGame'),
      onClick: () => {
        callbacks?.openSaveDialog?.();
        callbacks?.closeMenu?.();
      },
    },
    {
      id: 'load_game',
      debugOnly: false,
      label: i18n('content.menu.mainMenu.buttons.loadGame'),
      onClick: () => {
        callbacks?.openLoadDialog?.();
        callbacks?.closeMenu?.();
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
      id: 'music',
      debugOnly: false,
      label: getMusicMenuLabel(activeState),
      onClick: (state) => {
        setMusicMode(state);
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
    {
      id: 'rights',
      debugOnly: false,
      label: i18n('content.menu.mainMenu.buttons.rights'),
      onClick: () => {
        callbacks?.setView?.('rights');
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
): CanvasMenuItem[] => [
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
  {
    id: 'output_game_state',
    debugOnly: false,
    label: i18n('content.menu.mainMenu.buttons.outputGameState'),
    onClick: (state) => {
      // eslint-disable-next-line no-console
      console.log(state);
      callbacks?.closeMenu?.();
    },
  },
  {
    id: 'reveal_map',
    debugOnly: false,
    label: i18n('content.menu.mainMenu.buttons.revealMap'),
    onClick: (state) => {
      onRevealMap(state);
      callbacks?.closeMenu?.();
    },
  },
  {
    id: 'next_dungeon',
    debugOnly: false,
    label: i18n('content.menu.mainMenu.buttons.nextDungeon'),
    onClick: (state) => {
      onNextDungeon(state);
      callbacks?.closeMenu?.();
    },
  },
];

// Rows for the load dialog: the autosave plus every named save, each with a
// campaign/dungeon hint. Rendered by the centered save/load dialog, not by
// the canvas menu, so there is no back item — the dialog has its own button.
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
        hint: getSaveHintFromStateString(autoSave),
        onClick: (state) => {
          onClickLoad(autoSave, state, callbacks?.setState);
          callbacks?.closeDialog?.();
        },
      });
    }

    for (const meta of listSaves()) {
      const savedStateString = readSaveStateString(meta.id);
      if (!savedStateString) continue;
      items.push({
        id: `load_save_${meta.id}`,
        debugOnly: false,
        label: meta.name,
        hint: getSaveHint(meta),
        onClick: (state) => {
          onClickLoad(savedStateString, state, callbacks?.setState);
          callbacks?.closeDialog?.();
        },
      });
    }
  }

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

export const getRightsMenuItems = (
  activeState: GameState,
  callbacks?: MenuCallbacks,
): CanvasMenuItem[] => [
  {
    id: 'rights_implementation',
    debugOnly: false,
    label: i18n('content.menu.rights.implementation'),
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onClick: () => {},
  },
  {
    id: 'rights_music',
    debugOnly: false,
    label: i18n('content.menu.rights.musicLicense'),
    onClick: () => {
      if (typeof window !== 'undefined' && window.open) {
        window.open(
          'https://lostintheforest.bandcamp.com/',
          '_blank',
          'noopener,noreferrer',
        );
      }
    },
  },
  {
    id: 'rights_sfx',
    debugOnly: false,
    label: i18n('content.menu.rights.sfx'),
    onClick: () => {
      if (typeof window !== 'undefined' && window.open) {
        window.open(
          'https://rgbin.itch.io/knight-monsters-sounds-pack',
          '_blank',
          'noopener,noreferrer',
        );
      }
    },
  },
  {
    id: 'rights_graphics',
    debugOnly: false,
    label: i18n('content.menu.rights.graphics'),
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onClick: () => {},
  },
  {
    id: 'rights_back',
    debugOnly: false,
    label: i18n('content.menu.loadGame.buttons.back'),
    onClick: () => {
      callbacks?.setView?.('main');
    },
  },
];

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
    case 'event':
      items = getEventMenuItems(activeState, callbacks);
      break;
    case 'rights':
      items = getRightsMenuItems(activeState, callbacks);
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
    case 'event':
      return i18n('content.menu.selectNextEvent.header');
    case 'rights':
      return i18n('content.menu.rights.header');
  }
};

export const onNewGame = (
  campaignId: string = DEFAULT_CAMPAIGN_ID,
  gameMasterId: string = DEFAULT_GAME_MASTER_ID,
  activeState?: GameState,
  setState?: (state: GameState) => void,
  speedrunSeed?: number,
) => {
  if (setState) {
    const newState = init(campaignId, gameMasterId, speedrunSeed);
    setState(newState);
    gameStateStore.set(newState);
  } else {
    initGame(campaignId, gameMasterId, speedrunSeed);
  }
};

export const onClickLoad = (
  stateString: string,
  activeState?: GameState,
  setState?: (state: GameState) => void,
) => {
  try {
    const loaded = JSON.parse(stateString) as GameState;
    if (setState) {
      const newState = loadState(loaded);
      setState(newState);
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
    activeState.settings['debug'] = !activeState.settings['debug'];
    gameStateStore.set(activeState);
  } else {
    const isDebug = Boolean(get(gameStateStore).settings?.['debug']);
    setDebug(!isDebug);
  }
};

export const setMusicMode = (activeState?: GameState) => {
  if (activeState) {
    const isMusic = activeState.settings['music'] !== false;
    activeState.settings['music'] = !isMusic;
    gameStateStore.set(activeState);
  } else {
    const isMusic = get(gameStateStore).settings?.['music'] !== false;
    setMusic(!isMusic);
  }
};

export const onSaveGame = (activeState?: GameState, name = '') => {
  if (activeState) {
    save(activeState, name);
  } else {
    saveGame(name);
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

export const onRevealMap = (activeState?: GameState) => {
  if (activeState) {
    revealFullMap(activeState);
    gameStateStore.set(activeState);
  } else {
    dispatch((currentState) => revealFullMap(currentState));
  }
};

export const onNextDungeon = (activeState?: GameState) => {
  if (activeState) {
    goToNextDungeon(activeState);
    gameStateStore.set(activeState);
  } else {
    dispatch((currentState) => goToNextDungeon(currentState));
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
    activeState.gameMaster = nextDifficulty;
    addLog(activeState, nextDifficulty.descriptionTranslationKey ?? '');
    gameStateStore.set(activeState);
  } else {
    setDifficulty(nextDifficulty);
  }
};

export const getDifficultyMenuLabel = (activeState: GameState) => {
  const difficulty = getDifficulty(activeState);
  return (
    i18n('content.menu.mainMenu.buttons.gameMaster') +
    ' ' +
    i18n(difficulty?.nameTranslationKey)
  );
};
