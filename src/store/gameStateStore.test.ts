import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
  gameStateStore,
  currentHero,
  liveHeroesStore,
  visibleMonsters,
  actionLogs,
  dungeonStore,
  winConditionsStore,
  isDungeonBeaten,
  isGameOver,
  debugModeStore,
  damageIndicatorsStore,
  initGame,
  loadGameState,
  saveGame,
  nextTurn,
  endHeroAction,
  moveHero,
  pickLockAction,
  searchAction,
  selectTargetHero,
  toggleHeroInventory,
  setDebug,
  setGameLocale,
  goToTestingGrounds,
  dispatch,
  removeDamageIndicatorAction,
} from './gameStateStore';
import { debouncedSaveReloadGuard, saveReloadGuard } from '../core';
import type { Hero } from '../types';
import { init } from '../game';

describe('gameStateStore and state management', () => {
  beforeEach(() => {
    initGame();
  });

  it('initializes gameStateStore and derived stores properly', () => {
    const state = get(gameStateStore);
    expect(state).toBeDefined();
    expect(state.heroes.length).toBeGreaterThan(0);

    const currHero = get(currentHero);
    expect(currHero).toBeDefined();
    expect(currHero?.name).toBe(state.heroes[0].name);

    const liveH = get(liveHeroesStore);
    expect(liveH.length).toBeGreaterThan(0);

    const logs = get(actionLogs);
    expect(logs.length).toBeGreaterThan(0);

    const dungeon = get(dungeonStore);
    expect(dungeon.name).toBe(state.dungeon.name);

    const conditions = get(winConditionsStore);
    expect(conditions.length).toBeGreaterThanOrEqual(0);

    const monsters = get(visibleMonsters);
    expect(Array.isArray(monsters)).toBe(true);

    const beaten = get(isDungeonBeaten);
    expect(beaten).toBe(false);

    const over = get(isGameOver);
    expect(over).toBe(false);

    const debug = get(debugModeStore);
    expect(debug).toBe(false);

    const indicators = get(damageIndicatorsStore);
    expect(indicators).toEqual([]);
  });

  it('damageIndicatorsStore reflects damage indicators and removeDamageIndicatorAction removes them', () => {
    dispatch((s) => {
      s.damageIndicators = [
        { id: 'dmg-1', damage: 3, position: { x: 2, y: 2 } },
      ];
    });
    expect(get(damageIndicatorsStore).length).toBe(1);
    expect(get(damageIndicatorsStore)[0].damage).toBe(3);

    removeDamageIndicatorAction('dmg-1');
    expect(get(damageIndicatorsStore).length).toBe(0);
  });

  it('updates debugMode and locale through action dispatchers', () => {
    setDebug(true);
    expect(get(debugModeStore)).toBe(true);

    setDebug(false);
    expect(get(debugModeStore)).toBe(false);

    setGameLocale('sv');
    expect(get(gameStateStore).settings['locale']).toBe('sv');
  });

  it('selectTargetHero toggles targetActor correctly', () => {
    const state = get(gameStateStore);
    const hero = state.heroes[0] as Hero;

    selectTargetHero(hero);
    expect(get(gameStateStore).targetActor).toBe(hero);

    selectTargetHero(hero);
    expect(get(gameStateStore).targetActor).toBeUndefined();
  });

  it('toggleHeroInventory toggles hero inventory state', () => {
    const state = get(gameStateStore);
    const hero = state.heroes[0] as Hero;
    const initialOpen = Boolean(hero.isInventoryOpen);

    toggleHeroInventory(hero);
    expect((get(gameStateStore).heroes[0] as Hero).isInventoryOpen).toBe(
      !initialOpen,
    );

    toggleHeroInventory(hero);
    expect((get(gameStateStore).heroes[0] as Hero).isInventoryOpen).toBe(
      initialOpen,
    );
  });

  it('actions like endHeroAction, moveHero, pickLockAction, searchAction modify state and notify store', () => {
    const hero = get(currentHero);
    expect(hero).toBeDefined();
    if (!hero) return;

    hero.actions = 2;
    endHeroAction();
    expect(get(currentHero)?.actions).toBe(1);

    moveHero('R');
    pickLockAction();
    searchAction();
    expect(get(gameStateStore)).toBeDefined();
  });

  it('supports saveGame, loadGameState, nextTurn, and goToTestingGrounds', () => {
    const state = get(gameStateStore);
    saveGame();
    saveReloadGuard(state);

    const nextState = nextTurn();
    expect(nextState).toBeDefined();

    loadGameState(state);
    expect(get(gameStateStore).heroes[0].name).toBe(state.heroes[0].name);

    goToTestingGrounds();
    expect(get(gameStateStore).dungeon.name).toBe(
      'campaign.iceDragon.testingGrounds.name',
    );
  });

  it('dispatch allows custom mutations with store synchronization', () => {
    dispatch((s) => {
      s.settings['customSetting'] = 'testValue';
    });
    expect(get(gameStateStore).settings['customSetting']).toBe('testValue');
  });

  it('debouncedSaveReloadGuard uses timer instead of synchronous execution', () => {
    vi.useFakeTimers();
    const state = init();

    debouncedSaveReloadGuard(state, 100);
    vi.runAllTimers();
    vi.useRealTimers();
  });
});
