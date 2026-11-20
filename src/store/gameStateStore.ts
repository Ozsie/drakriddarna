import { writable, derived, get, type Writable } from 'svelte/store';
import { browser } from '$app/env';
import { setLocale } from '#lib/translations/index.js';
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
import {
  doMouseLogic,
  type BoardPointer,
  type CameraOffset,
} from '../hero/ClickInputLogic';
import { testingGrounds } from '../dungeon/testingGrounds';
import { getEventsForDungeon } from '../events/EventsLogic';
import {
  saveReloadGuard,
  debouncedSaveReloadGuard,
  readReloadGuard,
} from '../core';
import { beginDungeonTiming } from '../core';
import { drainSoundCues } from '../audio/SoundCueAdapter';
import { appPhaseStore, enterGamePhase } from './appPhaseStore';

// Fresh browser visits boot into the welcome phase without creating any
// game state; the store then holds null until a run is started or a save
// is loaded. Outside the browser (SSR/tests) a campaign is initialized as
// before so the game surfaces keep a state to work against.
const getInitialState = (): GameState | null => {
  if (browser) {
    const reloadGuard = readReloadGuard();
    if (reloadGuard) {
      try {
        const loaded = loadState(reloadGuard);
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

// The game mutates the state in place and then publishes the same object
// reference. Svelte 4 reactive statements re-ran on every store emission,
// but Svelte 5 deriveds strict-compare by reference and would treat such a
// publish as "unchanged", freezing the board's reactive render glue (room
// reveals, hero/action/step marks, ...). Every publish therefore wraps the
// state in a fresh top-level envelope; the nested objects (dungeon, heroes,
// settings, ...) stay shared with the source state, so mid-flow mutations
// remain visible to already-held references until the next publish.
const baseGameStateStore = writable<GameState | null>(getInitialState());

export const gameStateStore: Writable<GameState | null> = {
  subscribe: baseGameStateStore.subscribe,
  set: (state) => baseGameStateStore.set(state && { ...state }),
  update: (fn) =>
    baseGameStateStore.update((state) => {
      const next = fn(state);
      return next && { ...next };
    }),
};

export const syncStore = (state: GameState, syncImmediate = false): void => {
  gameStateStore.set(state);
  if (syncImmediate) {
    saveReloadGuard(state);
  } else {
    debouncedSaveReloadGuard(state);
  }
};

// The single seam where sound-cue data crosses into audio: every publish
// drains the cues logic appended, in emission order, whichever flow ran
// (turn pipeline, between dungeons, menu actions). Logic modules never
// import the audio facade; the adapter maps cues to samples
// (src/audio/SoundCueAdapter.ts). Headless consumers (benchmarks, logic
// tests) do not import this store and stay silent.
gameStateStore.subscribe((state) => {
  if (state) {
    drainSoundCues(state);
  }
});

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

type TurnToken = { generation: number };

type TurnOutcome<T> =
  { acquired: false } | { acquired: true; cancelled: boolean; result: T };

let generation = 0;
let activeTurn: TurnToken | null = null;
const turnProgressStore = writable<boolean>(false);
export const isTurnInProgress = {
  subscribe: turnProgressStore.subscribe,
};

const isTurnLocked = (): boolean => activeTurn !== null;

const withState = <T>(action: (state: GameState) => T): T | undefined => {
  const state = get(gameStateStore);
  if (!state) return;
  return action(state);
};

const withGameplayState = <T>(
  action: (state: GameState) => T,
): T | undefined => (isTurnLocked() ? undefined : withState(action));

const beginLifecycle = (): void => {
  generation++;
  activeTurn = null;
  turnProgressStore.set(false);
};

const runTurn = async <T>(
  operation: (
    publish: (state: GameState, syncImmediate?: boolean) => boolean,
  ) => Promise<T>,
): Promise<TurnOutcome<T>> => {
  if (activeTurn) return { acquired: false };

  const token: TurnToken = { generation };
  activeTurn = token;
  turnProgressStore.set(true);
  const publish = (state: GameState, syncImmediate = false): boolean => {
    if (activeTurn !== token || generation !== token.generation) return false;
    syncStore(state, syncImmediate);
    return true;
  };

  try {
    const result = await operation(publish);
    return {
      acquired: true,
      cancelled: generation !== token.generation,
      result,
    };
  } finally {
    if (activeTurn === token) {
      activeTurn = null;
      turnProgressStore.set(false);
    }
  }
};

// Encapsulated Action Dispatchers
// During an asynchronous turn, gameplay mutations and difficulty changes are
// blocked. Settings, save requests and transient visual cleanup remain allowed;
// lifecycle transitions cancel the turn. The multi-action endHeroAction branch
// remains unlocked because it does not advance monster actions.
export const initGame = (
  campaignId?: string,
  gameMasterId?: string,
  speedrunSeed?: number,
  heroes?: Hero[],
): GameState => {
  beginLifecycle();
  const state = init(campaignId, gameMasterId, speedrunSeed, heroes);
  syncStore(state, true);
  enterGamePhase();
  return state;
};

export const loadGameState = (loadedState: GameState): GameState => {
  beginLifecycle();
  const state = loadState(loadedState);
  syncStore(state, true);
  enterGamePhase();
  return state;
};

export const saveGame = (name?: string): void => {
  withState((state) => {
    save(state, name);
    syncStore(state, true);
  });
};

export const nextTurn = async (
  options?: MonsterTurnOptions,
): Promise<GameState | null> => {
  const outcome = await runTurn(async (publish) => {
    const state = get(gameStateStore);
    if (!state) return null;
    const updated = await next(state, {
      ...options,
      onActionCallback: (st) => {
        if (publish(st)) options?.onActionCallback?.(st);
      },
    });
    publish(updated, true);
    return updated;
  });
  if (!outcome.acquired || outcome.cancelled) return get(gameStateStore);
  return outcome.result;
};

export const endHeroAction = async (
  options?: MonsterTurnOptions,
): Promise<void> => {
  if (isTurnLocked()) return;
  const state = withState((currentState) => currentState);
  if (!state) return;
  const hero = state.currentActor;
  if (!hero) return;

  if (hero.actions <= 1) {
    await runTurn(async (publish) => {
      await endAction(state, {
        ...options,
        onActionCallback: (st) => {
          if (publish(st)) options?.onActionCallback?.(st);
        },
      });
      publish(state, true);
    });
  } else {
    const currentGeneration = generation;
    await endAction(state, options);
    if (currentGeneration === generation) syncStore(state);
  }
};

export const moveHero = (direction: MoveDirection | (string & {})): void => {
  withGameplayState((state) => {
    act(direction, state);
    syncStore(state);
  });
};

export const pickLockAction = (): void => {
  withGameplayState((state) => {
    pickLock(state);
    syncStore(state);
  });
};

export const searchAction = (): void => {
  withGameplayState((state) => {
    search(state);
    syncStore(state);
  });
};

export const interactAction = (): void => {
  withGameplayState((state) => {
    interact(state);
    syncStore(state);
  });
};

export const useHeroItem = (item: Item, hero?: Hero): void => {
  withGameplayState((state) => {
    const itemUser = hero ?? state.currentActor;
    if (
      state.currentActor !== itemUser ||
      !state.heroes.some(
        (stateHero) =>
          stateHero === itemUser && stateHero.inventory.includes(item),
      )
    ) {
      return;
    }
    useItem(state, item);
    syncStore(state);
  });
};

export const selectTargetHero = (target: Hero): void => {
  withGameplayState((state) => {
    if (state.targetActor && state.targetActor === target) {
      state.targetActor = undefined;
    } else {
      state.targetActor = target;
    }
    syncStore(state);
  });
};

export const toggleHeroInventory = (hero: Hero): void => {
  withGameplayState((state) => {
    const foundHero = state.heroes.find((h) => h.name === hero.name) as
      Hero | undefined;
    if (foundHero) {
      // The hero status screen is a full-board modal: opening one hero's
      // screen closes every other hero's.
      const opening = !foundHero.isInventoryOpen;
      (state.heroes as Hero[]).forEach((h) => {
        h.isInventoryOpen = false;
      });
      foundHero.isInventoryOpen = opening;
    } else {
      hero.isInventoryOpen = !hero.isInventoryOpen;
    }
    syncStore(state);
  });
};

export const setDebug = (debug: boolean): void => {
  withState((state) => {
    state.settings['debug'] = debug;
    syncStore(state);
  });
};

export const setMusic = (music: boolean): void => {
  withState((state) => {
    state.settings['music'] = music;
    syncStore(state);
  });
};

export const removeDamageIndicatorAction = (id: string): void => {
  withState((state) => {
    removeDamageIndicator(state, id);
    syncStore(state);
  });
};

export const setGameLocale = (loc: string): void => {
  withState((state) => {
    state.settings['locale'] = loc;
    syncStore(state);
  });
};

export const setDifficulty = (difficulty: Difficulty): void => {
  withGameplayState((state) => {
    state.gameMaster = difficulty;
    syncStore(state);
  });
};

export const setGameMaster = setDifficulty;

export const winLevel = (): void => {
  beginLifecycle();
  withState((state) => {
    hasWon(state);
    syncStore(state, true);
  });
};

export const resetCurrentLevel = (): void => {
  beginLifecycle();
  withState((state) => {
    const updated = resetLevel(state);
    syncStore(updated, true);
  });
};

export const goToTestingGrounds = (): void => {
  beginLifecycle();
  withState((state) => {
    state.dungeon = testingGrounds;
    state.eventDeck = getEventsForDungeon(state.dungeon, [], state);
    resetLiveHeroes(state);
    // The testing grounds show an intro like any dungeon; its timer starts
    // when that intro is closed.
    beginDungeonTiming(state, true);
    syncStore(state);
  });
};

export const handleCanvasClick = (
  pointer: BoardPointer,
  cellSize: number,
  camera?: CameraOffset,
): void => {
  withGameplayState((state) => {
    doMouseLogic(pointer, cellSize, state, camera);
    syncStore(state);
  });
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
        withGameplayState((state) => {
          state.targetActor = undefined;
          syncStore(state);
        });
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
  withGameplayState((state) => {
    actionFn(state);
    syncStore(state);
  });
};
