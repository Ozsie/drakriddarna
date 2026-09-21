import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { setLocale } from '$lib/translations';
import type {
  GameAction,
  GameState,
  Hero,
  Item,
  MoveDirection,
} from '../types';
import { assertNever } from '../types';
import {
  init,
  loadState,
  save,
  next,
  endAction,
  hasWon,
  resetLevel,
  removeDamageIndicator,
} from '../game';
import {
  act,
  pickLock,
  search,
  resetLiveHeroes,
  liveHeroes,
} from '../hero/HeroLogic';
import { useItem } from '../items/ItemLogic';
import { findVisibleMonsters } from '../monsters/MonsterLogic';
import { doMouseLogic } from '../hero/ClickInputLogic';
import { testingGrounds } from '../campaigns/dungeons/testingGrounds';
import { saveReloadGuard, debouncedSaveReloadGuard } from '../core';

const getInitialState = (): GameState => {
  if (browser) {
    const reloadGuard = localStorage.getItem('reloadGuard');
    if (reloadGuard) {
      try {
        const parsed = JSON.parse(reloadGuard) as GameState;
        const loaded = loadState(parsed);
        if (loaded.settings?.['locale']) {
          void setLocale(loaded.settings['locale']);
        }
        return loaded;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to parse reloadGuard:', e);
      }
    }
  }
  const initialState = init();
  if (initialState.settings?.['locale']) {
    void setLocale(initialState.settings['locale']);
  }
  return initialState;
};

export const gameStateStore = writable<GameState>(getInitialState());

export const syncStore = (state: GameState, syncImmediate = false): void => {
  gameStateStore.set(state);
  if (syncImmediate) {
    saveReloadGuard(state);
  } else {
    debouncedSaveReloadGuard(state);
  }
};

// Derived Stores
export const currentHero = derived(
  gameStateStore,
  ($state) => $state.currentActor,
);

export const liveHeroesStore = derived(gameStateStore, ($state) =>
  liveHeroes($state),
);

export const visibleMonsters = derived(gameStateStore, ($state) =>
  findVisibleMonsters($state),
);

export const actionLogs = derived(gameStateStore, ($state) => $state.actionLog);

export const dungeonStore = derived(gameStateStore, ($state) => $state.dungeon);

export const winConditionsStore = derived(
  gameStateStore,
  ($state) => $state.dungeon.winConditions,
);

export const isDungeonBeaten = derived(
  gameStateStore,
  ($state) => $state.dungeon.beaten,
);

export const isGameOver = derived(
  gameStateStore,
  ($state) => liveHeroes($state).length === 0,
);

export const currentEventStore = derived(
  gameStateStore,
  ($state) => $state.currentEvent,
);

export const turnCountStore = derived(
  gameStateStore,
  ($state) => $state.turnCount ?? 0,
);

export const damageIndicatorsStore = derived(
  gameStateStore,
  ($state) => $state.damageIndicators ?? [],
);

export const debugModeStore = derived(gameStateStore, ($state) =>
  Boolean($state.settings?.['debug']),
);

// Encapsulated Action Dispatchers
export const initGame = (): GameState => {
  const state = init();
  syncStore(state, true);
  return state;
};

export const loadGameState = (loadedState: GameState): GameState => {
  const state = loadState(loadedState);
  syncStore(state, true);
  return state;
};

export const saveGame = (): void => {
  const state = get(gameStateStore);
  save(state);
  syncStore(state, true);
};

export const nextTurn = (): GameState => {
  const state = get(gameStateStore);
  const updated = next(state);
  syncStore(updated, true);
  return updated;
};

export const endHeroAction = (): void => {
  const state = get(gameStateStore);
  endAction(state);
  syncStore(state);
};

export const moveHero = (direction: MoveDirection | string): void => {
  const state = get(gameStateStore);
  act(direction, state);
  syncStore(state);
};

export const pickLockAction = (): void => {
  const state = get(gameStateStore);
  pickLock(state);
  syncStore(state);
};

export const searchAction = (): void => {
  const state = get(gameStateStore);
  search(state);
  syncStore(state);
};

export const useHeroItem = (item: Item): void => {
  const state = get(gameStateStore);
  useItem(state, item);
  syncStore(state);
};

export const selectTargetHero = (target: Hero): void => {
  const state = get(gameStateStore);
  if (state.targetActor && state.targetActor === target) {
    state.targetActor = undefined;
  } else {
    state.targetActor = target;
  }
  syncStore(state);
};

export const toggleHeroInventory = (hero: Hero): void => {
  const state = get(gameStateStore);
  const foundHero = state.heroes.find((h) => h.name === hero.name) as
    | Hero
    | undefined;
  if (foundHero) {
    foundHero.isInventoryOpen = !foundHero.isInventoryOpen;
  } else {
    hero.isInventoryOpen = !hero.isInventoryOpen;
  }
  syncStore(state);
};

export const setDebug = (debug: boolean): void => {
  const state = get(gameStateStore);
  state.settings['debug'] = debug;
  syncStore(state);
};

export const removeDamageIndicatorAction = (id: string): void => {
  const state = get(gameStateStore);
  removeDamageIndicator(state, id);
  syncStore(state);
};

export const setGameLocale = (loc: string): void => {
  const state = get(gameStateStore);
  state.settings['locale'] = loc;
  syncStore(state);
};

export const winLevel = (): void => {
  const state = get(gameStateStore);
  hasWon(state);
  syncStore(state, true);
};

export const resetCurrentLevel = (): void => {
  const state = get(gameStateStore);
  const updated = resetLevel(state);
  syncStore(updated, true);
};

export const goToTestingGrounds = (): void => {
  const state = get(gameStateStore);
  state.dungeon = testingGrounds;
  resetLiveHeroes(state);
  syncStore(state);
};

export const handleCanvasClick = (
  event: MouseEvent,
  cellSize: number,
): void => {
  const state = get(gameStateStore);
  doMouseLogic(event, cellSize, state);
  syncStore(state);
};

export const dispatchAction = (action: GameAction): void => {
  switch (action.type) {
    case 'MOVE':
      moveHero(action.direction);
      break;
    case 'PICK_LOCK':
      pickLockAction();
      break;
    case 'SEARCH':
      searchAction();
      break;
    case 'USE_ITEM':
      useHeroItem(action.item);
      break;
    case 'SELECT_TARGET':
      if (action.target) {
        selectTargetHero(action.target);
      } else {
        const state = get(gameStateStore);
        state.targetActor = undefined;
        syncStore(state);
      }
      break;
    case 'TOGGLE_INVENTORY':
      toggleHeroInventory(action.hero);
      break;
    case 'END_ACTION':
      endHeroAction();
      break;
    case 'NEXT_TURN':
      nextTurn();
      break;
    case 'INIT_GAME':
      initGame();
      break;
    case 'LOAD_GAME':
      loadGameState(action.state);
      break;
    case 'SAVE_GAME':
      saveGame();
      break;
    case 'SET_DEBUG':
      setDebug(action.debug);
      break;
    case 'SET_LOCALE':
      setGameLocale(action.locale);
      break;
    case 'WIN_LEVEL':
      winLevel();
      break;
    case 'RESET_LEVEL':
      resetCurrentLevel();
      break;
    case 'GO_TO_TESTING_GROUNDS':
      goToTestingGrounds();
      break;
    default:
      assertNever(action);
  }
};

export const dispatch = (actionFn: (state: GameState) => void): void => {
  const state = get(gameStateStore);
  actionFn(state);
  syncStore(state);
};
