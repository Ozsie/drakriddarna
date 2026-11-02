import { DEFAULT_GAME_MASTER_ID, i18n } from '../core';
import type { GameState, Hero, TurnEvent } from '../types';
import {
  dispatch,
  gameStateStore,
  goToTestingGrounds,
  initGame,
  loadGameState,
  saveGame,
  setGameLocale,
  syncStore,
} from '../store/gameStateStore';
import { locale, setLocale } from '$lib/translations';
import { init, loadState, save } from '../game';
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
import { applyDebugSetting } from '../settings/AppSettings';

export interface CanvasMenuItem {
  id: string;
  label: string;
  hint?: string;
  debugOnly?: boolean;
  disabled?: boolean;
  // The active state is null while the welcome screen is up (a dialog can
  // be opened from there without any game existing); every item handles
  // it the same way as the no-state case.
  onClick: (activeState: GameState | null) => void;
}

// The canvas menu's two views: the debug menu itself and the event list
// it drills into. The main menu used to live here too; it is folded into
// the welcome screen.
export type DebugMenuView = 'debug' | 'event';

export interface MenuCallbacks {
  setView?: (view: DebugMenuView) => void;
  closeMenu?: () => void;
  setState?: (state: GameState) => void;
  /** Dismisses the save/load dialog; passed to its load-row items. */
  closeDialog?: () => void;
}

export const getDebugMenuItems = (
  activeState: GameState,
  callbacks?: MenuCallbacks,
): CanvasMenuItem[] => [
  {
    id: 'testing_grounds',
    debugOnly: false,
    label: i18n('content.menu.debugMenu.buttons.testingGrounds'),
    onClick: (state) => {
      toTestingGrounds(state);
      callbacks?.closeMenu?.();
    },
  },
  {
    id: 'shuffle_deck',
    debugOnly: false,
    label: i18n('content.menu.debugMenu.buttons.shuffleDeck'),
    onClick: (state) => {
      onShuffleDeck(state);
      callbacks?.closeMenu?.();
    },
  },
  {
    id: 'select_next_event',
    debugOnly: false,
    label: i18n('content.menu.debugMenu.buttons.selectNextEvent'),
    onClick: () => {
      callbacks?.setView?.('event');
    },
  },
  {
    id: 'output_game_state',
    debugOnly: false,
    label: i18n('content.menu.debugMenu.buttons.outputGameState'),
    onClick: (state) => {
      // eslint-disable-next-line no-console
      console.log(state);
      callbacks?.closeMenu?.();
    },
  },
  {
    id: 'reveal_map',
    debugOnly: false,
    label: i18n('content.menu.debugMenu.buttons.revealMap'),
    onClick: (state) => {
      onRevealMap(state);
      callbacks?.closeMenu?.();
    },
  },
  {
    id: 'next_dungeon',
    debugOnly: false,
    label: i18n('content.menu.debugMenu.buttons.nextDungeon'),
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
  activeState: GameState | null | undefined,
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
        callbacks?.setView?.('debug');
      },
    }));

  items.push({
    id: 'event_back',
    debugOnly: false,
    label: i18n('content.menu.loadGame.buttons.back'),
    onClick: () => {
      callbacks?.setView?.('debug');
    },
  });

  return items;
};

export const getDebugMenuItemsForView = (
  view: DebugMenuView,
  activeState: GameState,
  callbacks?: MenuCallbacks,
): CanvasMenuItem[] => {
  let items: CanvasMenuItem[] = [];
  switch (view) {
    case 'debug':
      items = getDebugMenuItems(activeState, callbacks);
      break;
    case 'event':
      items = getEventMenuItems(activeState, callbacks);
      break;
  }
  return items;
};

export const getDebugMenuHeader = (view: DebugMenuView): string => {
  switch (view) {
    case 'debug': {
      const translated = i18n('content.menu.debugMenu.header');
      return translated === 'content.menu.debugMenu.header'
        ? 'Debug'
        : translated || 'Debug';
    }
    case 'event':
      return i18n('content.menu.selectNextEvent.header');
  }
};

export const onNewGame = (
  campaignId: string = DEFAULT_CAMPAIGN_ID,
  gameMasterId: string = DEFAULT_GAME_MASTER_ID,
  activeState?: GameState | null,
  setState?: (state: GameState) => void,
  speedrunSeed?: number,
  heroes?: Hero[],
) => {
  if (setState) {
    const newState = init(campaignId, gameMasterId, speedrunSeed, heroes);
    // A run started while debug is toggled on in the settings view runs
    // in debug mode (the app setting is the source of truth).
    applyDebugSetting(newState);
    setState(newState);
    gameStateStore.set(newState);
  } else {
    const newState = initGame(campaignId, gameMasterId, speedrunSeed, heroes);
    applyDebugSetting(newState);
    syncStore(newState, true);
  }
};

export const onClickLoad = (
  stateString: string,
  activeState?: GameState | null,
  setState?: (state: GameState) => void,
) => {
  try {
    const loaded = JSON.parse(stateString) as GameState;
    if (setState) {
      const newState = loadState(loaded);
      applyDebugSetting(newState);
      setState(newState);
      gameStateStore.set(newState);
    } else {
      const newState = loadGameState(loaded);
      applyDebugSetting(newState);
      syncStore(newState, true);
    }
  } catch {
    // Ignore invalid save state JSON
  }
};

export const onSaveGame = (activeState?: GameState | null, name = '') => {
  if (activeState) {
    save(activeState, name);
  } else {
    saveGame(name);
  }
};

export const toTestingGrounds = (activeState?: GameState | null) => {
  if (activeState) {
    activeState.dungeon = testingGrounds;
    activeState.eventDeck = getEventsForDungeon(activeState.dungeon);
    resetLiveHeroes(activeState);
    gameStateStore.set(activeState);
  } else {
    goToTestingGrounds();
  }
};

export const onShuffleDeck = (activeState?: GameState | null) => {
  if (activeState) {
    shuffleEventDeck(activeState);
    gameStateStore.set(activeState);
  } else {
    dispatch(shuffleEventDeck);
  }
};

export const onRevealMap = (activeState?: GameState | null) => {
  if (activeState) {
    revealFullMap(activeState);
    gameStateStore.set(activeState);
  } else {
    dispatch((currentState) => revealFullMap(currentState));
  }
};

export const onNextDungeon = (activeState?: GameState | null) => {
  if (activeState) {
    goToNextDungeon(activeState);
    gameStateStore.set(activeState);
  } else {
    dispatch((currentState) => goToNextDungeon(currentState));
  }
};

export const onSelectNextEvent = (
  event: TurnEvent,
  activeState?: GameState | null,
) => {
  if (activeState) {
    selectNextEvent(activeState, event.id);
    gameStateStore.set(activeState);
  } else {
    dispatch((currentState) => selectNextEvent(currentState, event.id));
  }
};

// The language toggle of the welcome screen's settings view: flips the
// global locale and, when a run exists, the state's saved locale field.
export const onChangeLanguage = (activeState?: GameState | null) => {
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
