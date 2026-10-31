import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { setLocale } from '$lib/translations';
import type {
  Difficulty,
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
  interact,
  pickLock,
  search,
  resetLiveHeroes,
  liveHeroes,
} from '../hero/HeroLogic';
import { useItem } from '../items/ItemLogic';
import {
  findVisibleMonsters,
  type MonsterTurnOptions,
} from '../monsters/MonsterLogic';
import { doMouseLogic, type CameraOffset } from '../hero/ClickInputLogic';
import { testingGrounds } from '../dungeon/testingGrounds';
import { getEventsForDungeon } from '../events/EventsLogic';
import { saveReloadGuard, debouncedSaveReloadGuard } from '../core';
import { beginDungeonTiming } from '../core';
import { appPhaseStore, enterGamePhase } from './appPhaseStore';

// Fresh browser visits boot into the welcome phase without creating any
// game state; the store then holds null until a run is started or a save
// is loaded. Outside the browser (SSR/tests) a campaign is initialized as
// before so the game surfaces keep a state to work against.
const getInitialState = (): GameState | null => {
  if (browser) {
    const reloadGuard = localStorage.getItem('reloadGuard');
    if (reloadGuard) {
      try {
        const parsed = JSON.parse(reloadGuard) as GameState;
        const loaded = loadState(parsed);
        if (loaded.settings?.['locale']) {
          void setLocale(loaded.settings['locale']);
        }
        appPhaseStore.set('game');
        return loaded;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to parse reloadGuard:', e);
      }
    }
    return null;
  }
  const initialState = init();
  appPhaseStore.set('game');
  if (initialState.settings?.['locale']) {
    void setLocale(initialState.settings['locale']);
  }
  return initialState;
};

export const gameStateStore = writable<GameState | null>(getInitialState());

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
  ($state) => $state?.currentActor,
);

export const liveHeroesStore = derived(gameStateStore, ($state) =>
  $state ? liveHeroes($state) : [],
);

export const visibleMonsters = derived(gameStateStore, ($state) =>
  $state ? findVisibleMonsters($state) : [],
);

export const actionLogs = derived(
  gameStateStore,
  ($state) => $state?.actionLog ?? [],
);

export const dungeonStore = derived(gameStateStore, ($state) =>
  $state ? $state.dungeon : undefined,
);

export const winConditionsStore = derived(
  gameStateStore,
  ($state) => $state?.dungeon.winConditions ?? [],
);

export const isDungeonBeaten = derived(gameStateStore, ($state) =>
  Boolean($state?.dungeon.beaten),
);

export const isGameOver = derived(gameStateStore, ($state) =>
  $state ? liveHeroes($state).length === 0 : false,
);

export const currentEventStore = derived(
  gameStateStore,
  ($state) => $state?.currentEvent,
);

export const turnCountStore = derived(
  gameStateStore,
  ($state) => $state?.turnCount ?? 0,
);

export const damageIndicatorsStore = derived(
  gameStateStore,
  ($state) => $state?.damageIndicators ?? [],
);

export const debugModeStore = derived(gameStateStore, ($state) =>
  Boolean($state?.settings?.['debug']),
);

export const musicModeStore = derived(
  gameStateStore,
  ($state) => $state?.settings?.['music'] !== false,
);

export const isTurnInProgress = writable<boolean>(false);
let isExecutingTurn = false;

// Encapsulated Action Dispatchers
export const initGame = (
  campaignId?: string,
  gameMasterId?: string,
  speedrunSeed?: number,
  heroes?: Hero[],
): GameState => {
  const state = init(campaignId, gameMasterId, speedrunSeed, heroes);
  syncStore(state, true);
  enterGamePhase();
  return state;
};

export const loadGameState = (loadedState: GameState): GameState => {
  const state = loadState(loadedState);
  syncStore(state, true);
  enterGamePhase();
  return state;
};

export const saveGame = (name?: string): void => {
  const state = get(gameStateStore);
  if (!state) return;
  save(state, name);
  syncStore(state, true);
};

export const nextTurn = async (
  options?: MonsterTurnOptions,
): Promise<GameState | null> => {
  if (isExecutingTurn) {
    return get(gameStateStore);
  }
  isExecutingTurn = true;
  isTurnInProgress.set(true);
  try {
    const state = get(gameStateStore);
    if (!state) return null;
    const updated = await next(state, {
      onActionCallback: (st) => syncStore(st),
      ...options,
    });
    syncStore(updated, true);
    return updated;
  } finally {
    isExecutingTurn = false;
    isTurnInProgress.set(false);
  }
};

export const endHeroAction = async (
  options?: MonsterTurnOptions,
): Promise<void> => {
  if (isExecutingTurn) {
    return;
  }
  const state = get(gameStateStore);
  if (!state) return;
  const hero = state.currentActor;
  if (!hero) return;

  if (hero.actions === 1) {
    isExecutingTurn = true;
    isTurnInProgress.set(true);
    try {
      await endAction(state, {
        onActionCallback: (st) => syncStore(st),
        ...options,
      });
      syncStore(state, true);
    } finally {
      isExecutingTurn = false;
      isTurnInProgress.set(false);
    }
  } else {
    await endAction(state, options);
    syncStore(state);
  }
};

export const moveHero = (direction: MoveDirection | string): void => {
  if (isExecutingTurn) return;
  const state = get(gameStateStore);
  if (!state) return;
  act(direction, state);
  syncStore(state);
};

export const pickLockAction = (): void => {
  if (isExecutingTurn) return;
  const state = get(gameStateStore);
  if (!state) return;
  pickLock(state);
  syncStore(state);
};

export const searchAction = (): void => {
  if (isExecutingTurn) return;
  const state = get(gameStateStore);
  if (!state) return;
  search(state);
  syncStore(state);
};

export const interactAction = (): void => {
  if (isExecutingTurn) return;
  const state = get(gameStateStore);
  if (!state) return;
  interact(state);
  syncStore(state);
};

export const useHeroItem = (item: Item): void => {
  if (isExecutingTurn) return;
  const state = get(gameStateStore);
  if (!state) return;
  useItem(state, item);
  syncStore(state);
};

export const selectTargetHero = (target: Hero): void => {
  if (isExecutingTurn) return;
  const state = get(gameStateStore);
  if (!state) return;
  if (state.targetActor && state.targetActor === target) {
    state.targetActor = undefined;
  } else {
    state.targetActor = target;
  }
  syncStore(state);
};

export const toggleHeroInventory = (hero: Hero): void => {
  if (isExecutingTurn) return;
  const state = get(gameStateStore);
  if (!state) return;
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
  if (!state) return;
  state.settings['debug'] = debug;
  syncStore(state);
};

export const setMusic = (music: boolean): void => {
  const state = get(gameStateStore);
  if (!state) return;
  state.settings['music'] = music;
  syncStore(state);
};

export const removeDamageIndicatorAction = (id: string): void => {
  const state = get(gameStateStore);
  if (!state) return;
  removeDamageIndicator(state, id);
  syncStore(state);
};

export const setGameLocale = (loc: string): void => {
  const state = get(gameStateStore);
  if (!state) return;
  state.settings['locale'] = loc;
  syncStore(state);
};

export const setDifficulty = (difficulty: Difficulty): void => {
  const state = get(gameStateStore);
  if (!state) return;
  state.gameMaster = difficulty;
  syncStore(state);
};

export const setGameMaster = setDifficulty;

export const winLevel = (): void => {
  const state = get(gameStateStore);
  if (!state) return;
  hasWon(state);
  syncStore(state, true);
};

export const resetCurrentLevel = (): void => {
  const state = get(gameStateStore);
  if (!state) return;
  const updated = resetLevel(state);
  syncStore(updated, true);
};

export const goToTestingGrounds = (): void => {
  if (isExecutingTurn) return;
  const state = get(gameStateStore);
  if (!state) return;
  state.dungeon = testingGrounds;
  state.eventDeck = getEventsForDungeon(state.dungeon);
  resetLiveHeroes(state);
  // The testing grounds show an intro like any dungeon; its timer starts
  // when that intro is closed.
  beginDungeonTiming(state, true);
  syncStore(state);
};

export const handleCanvasClick = (
  event: MouseEvent,
  cellSize: number,
  camera?: CameraOffset,
): void => {
  if (isExecutingTurn) return;
  const state = get(gameStateStore);
  if (!state) return;
  doMouseLogic(event, cellSize, state, camera);
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
        if (state) {
          state.targetActor = undefined;
          syncStore(state);
        }
      }
      break;
    case 'TOGGLE_INVENTORY':
      toggleHeroInventory(action.hero);
      break;
    case 'END_ACTION':
      void endHeroAction();
      break;
    case 'NEXT_TURN':
      void nextTurn();
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
    case 'SET_MUSIC':
      setMusic(action.music);
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
  if (!state) return;
  actionFn(state);
  syncStore(state);
};
