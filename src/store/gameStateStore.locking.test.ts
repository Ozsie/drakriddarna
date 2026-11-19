import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import * as game from '../game';
import type { GameState } from '../types';
import {
  dispatch,
  dispatchAction,
  endHeroAction,
  gameStateStore,
  goToTestingGrounds,
  initGame,
  isTurnInProgress,
  loadGameState,
  moveHero,
  nextTurn,
  removeDamageIndicatorAction,
  resetCurrentLevel,
  saveGame,
  setDebug,
  setDifficulty,
  setGameLocale,
  setMusic,
  winLevel,
} from './gameStateStore';

vi.mock('../game', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../game')>();
  return {
    ...actual,
    next: vi.fn(actual.next),
    endAction: vi.fn(actual.endAction),
  };
});

const nextMock = vi.mocked(game.next);
const endActionMock = vi.mocked(game.endAction);

const deferred = <T>() => {
  let resolvePromise: (value: T) => void = () => {};
  let rejectPromise: (reason?: unknown) => void = () => {};
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return { promise, resolve: resolvePromise, reject: rejectPromise };
};

const getState = (): GameState => {
  const state = get(gameStateStore);
  expect(state).not.toBeNull();
  if (!state) throw new Error('Expected game state');
  return state;
};

describe('gameStateStore asynchronous turn locking', () => {
  beforeEach(() => {
    nextMock.mockReset();
    endActionMock.mockReset();
    nextMock.mockImplementation((state) => Promise.resolve(state));
    endActionMock.mockResolvedValue(undefined);
    initGame();
  });

  it('ignores duplicate turn requests until the active turn completes', async () => {
    const pending = deferred<void>();
    nextMock.mockImplementationOnce(async (state) => {
      await pending.promise;
      return state;
    });

    const activeTurn = nextTurn();
    expect(get(isTurnInProgress)).toBe(true);

    const duplicateResult = await nextTurn();
    expect(duplicateResult).toBe(get(gameStateStore));
    expect(nextMock).toHaveBeenCalledOnce();

    pending.resolve();
    await activeTurn;
    expect(get(isTurnInProgress)).toBe(false);
  });

  it('blocks gameplay mutations and difficulty changes while allowing settings and visual cleanup', async () => {
    const state = getState();
    const hero = state.currentActor;
    expect(hero).toBeDefined();
    if (!hero) return;
    state.targetActor = hero;
    state.damageIndicators = [
      { id: 'transient-damage', damage: 1, position: { x: 0, y: 0 } },
    ];
    gameStateStore.set(state);
    const originalPosition = { ...hero.position };
    const originalMovement = hero.movement;
    const originalActions = hero.actions;
    const originalDifficulty = state.gameMaster;
    expect(originalDifficulty).toBeDefined();
    if (!originalDifficulty) return;
    const pending = deferred<void>();
    nextMock.mockImplementationOnce(async (turnState) => {
      await pending.promise;
      return turnState;
    });

    const activeTurn = nextTurn();
    moveHero('R');
    setDifficulty({ ...originalDifficulty, id: 'blocked-difficulty' });
    dispatch((turnState) => {
      turnState.settings['blockedMutation'] = true;
    });
    dispatchAction({ type: 'SELECT_TARGET' });

    expect(hero.position).toEqual(originalPosition);
    expect(hero.movement).toBe(originalMovement);
    expect(hero.actions).toBe(originalActions);
    expect(state.gameMaster).toBe(originalDifficulty);
    expect(state.settings['blockedMutation']).toBeUndefined();
    expect(state.targetActor).toBe(hero);

    setDebug(true);
    setMusic(false);
    setGameLocale('sv');
    removeDamageIndicatorAction('transient-damage');
    saveGame();

    expect(state.settings['debug']).toBe(true);
    expect(state.settings['music']).toBe(false);
    expect(state.settings['locale']).toBe('sv');
    expect(getState().damageIndicators).toEqual([]);
    expect(get(isTurnInProgress)).toBe(true);

    pending.resolve();
    await activeTurn;
  });

  it.each([
    ['init', () => initGame()],
    ['load', () => loadGameState(game.init())],
    ['reset', () => resetCurrentLevel()],
    ['win', () => winLevel()],
    ['testing grounds', () => goToTestingGrounds()],
  ])(
    'cancels stale turn publication when %s replaces or transitions state',
    async (_name, transition) => {
      const stateBeforeTurn = getState();
      const pending = deferred<void>();
      let publishIntermediateState: ((state: GameState) => void) | undefined;
      nextMock.mockImplementationOnce(async (turnState, options) => {
        publishIntermediateState = options?.onActionCallback;
        await pending.promise;
        return turnState;
      });

      const externalCallback = vi.fn();
      const activeTurn = nextTurn({ onActionCallback: externalCallback });
      transition();
      const transitionedState = get(gameStateStore);
      expect(transitionedState).not.toBeNull();
      expect(get(isTurnInProgress)).toBe(false);

      publishIntermediateState?.(stateBeforeTurn);
      expect(get(gameStateStore)).toBe(transitionedState);
      expect(externalCallback).not.toHaveBeenCalled();

      pending.resolve();
      const result = await activeTurn;
      expect(result).toBe(get(gameStateStore));
      expect(get(gameStateStore)).toBe(transitionedState);
    },
  );

  it('does not let a cancelled turn release a newer turn lock', async () => {
    const firstPending = deferred<void>();
    const secondPending = deferred<void>();
    nextMock
      .mockImplementationOnce(async (state) => {
        await firstPending.promise;
        return state;
      })
      .mockImplementationOnce(async (state) => {
        await secondPending.promise;
        return state;
      });

    const cancelledTurn = nextTurn();
    initGame();
    const activeTurn = nextTurn();
    expect(get(isTurnInProgress)).toBe(true);

    firstPending.resolve();
    await cancelledTurn;
    expect(get(isTurnInProgress)).toBe(true);

    secondPending.resolve();
    await activeTurn;
    expect(get(isTurnInProgress)).toBe(false);
  });

  it('releases the turn lock after an asynchronous turn fails', async () => {
    nextMock.mockRejectedValueOnce(new Error('turn failed'));

    await expect(nextTurn()).rejects.toThrow('turn failed');
    expect(get(isTurnInProgress)).toBe(false);

    await nextTurn();
    expect(nextMock).toHaveBeenCalledTimes(2);
  });

  it('locks endHeroAction when the hero has zero or one action, but not for a remaining action', async () => {
    const state = getState();
    const hero = state.currentActor;
    expect(hero).toBeDefined();
    if (!hero) return;

    const multiActionPending = deferred<void>();
    endActionMock.mockImplementationOnce(
      async () => multiActionPending.promise,
    );
    hero.actions = 2;
    const multiAction = endHeroAction();
    expect(get(isTurnInProgress)).toBe(false);
    multiActionPending.resolve();
    await multiAction;

    for (const actions of [1, 0]) {
      const pending = deferred<void>();
      endActionMock.mockImplementationOnce(async () => pending.promise);
      hero.actions = actions;

      const endingTurn = endHeroAction();
      expect(get(isTurnInProgress)).toBe(true);
      pending.resolve();
      await endingTurn;
      expect(get(isTurnInProgress)).toBe(false);
    }
  });
});
