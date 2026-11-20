import { describe, it, expect, beforeEach, vi } from 'vitest';
import { derived, get } from 'svelte/store';
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
  useHeroItem,
  setDebug,
  setGameLocale,
  goToTestingGrounds,
  dispatch,
  removeDamageIndicatorAction,
} from './gameStateStore';
import { debouncedSaveReloadGuard, findCell, saveReloadGuard } from '../core';
import type { GameState, Hero, Item } from '../types';
import { init } from '../game';
import { magicItems } from '../items/magicItems';
import { USED_ON } from '../items/ItemLogic';

// The store may hold null (fresh visit boots into the welcome phase);
// every test below starts a run first, so the state is present.
const getState = (): GameState => {
  const state = get(gameStateStore);
  expect(state).toBeDefined();
  return state as GameState;
};

describe('gameStateStore and state management', () => {
  beforeEach(() => {
    initGame();
  });

  it('initializes gameStateStore and derived stores properly', () => {
    const state = getState();
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
    expect(dungeon?.name).toBe(state.dungeon.name);

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
    // Notes on hero starting positions create static indicators at init,
    // but no damage indicators should exist.
    expect(indicators.every((indicator) => indicator.effect === 'static')).toBe(
      true,
    );
  });

  it('publishes a fresh top-level reference while nested state stays shared', () => {
    // The game mutates the state in place and re-publishes the same
    // object; Svelte 5 deriveds (the board's render glue) strict-compare
    // by reference, so every publish must wrap the state in a fresh
    // top-level envelope. Nested objects stay shared so references
    // already held by the game keep seeing in-place mutations.
    const state = getState();
    const seen: (GameState | null)[] = [];
    const unsubscribe = gameStateStore.subscribe((s) => {
      seen.push(s);
    });

    gameStateStore.set(state);

    const latest = seen[seen.length - 1];
    expect(latest).not.toBe(state);
    expect(latest?.dungeon).toBe(state.dungeon);
    expect(latest?.heroes).toBe(state.heroes);
    expect(latest?.settings).toBe(state.settings);

    unsubscribe();
  });

  it('does not use another hero’s item when the status screen passes its owner', () => {
    const state = getState();
    const heroes = state.heroes.filter(
      (actor): actor is Hero => 'isInventoryOpen' in actor,
    );
    const currentActor = heroes[0];
    const itemOwner = heroes[1];
    const baseHerbs = magicItems.find((item) => item.id === 'healing_herbs');
    expect(currentActor).toBeDefined();
    expect(itemOwner).toBeDefined();
    expect(baseHerbs).toBeDefined();
    if (!currentActor || !itemOwner || !baseHerbs) return;

    const herbs = JSON.parse(JSON.stringify(baseHerbs)) as Item;
    itemOwner.inventory = [herbs];
    const currentHealth = currentActor.health;
    const ownerHealth = itemOwner.health;
    const publishedState = get(gameStateStore);
    expect(state.currentActor).toBe(currentActor);

    useHeroItem(herbs, itemOwner);

    expect(currentActor.health).toBe(currentHealth);
    expect(itemOwner.health).toBe(ownerHealth);
    expect(herbs.properties?.[USED_ON]).toEqual([]);
    expect(get(gameStateStore)).toBe(publishedState);
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
    expect(getState().settings['locale']).toBe('sv');
  });

  it('selectTargetHero toggles targetActor correctly', () => {
    const state = getState();
    const hero = state.heroes[0] as Hero;

    selectTargetHero(hero);
    expect(getState().targetActor).toBe(hero);

    selectTargetHero(hero);
    expect(getState().targetActor).toBeUndefined();
  });

  it('toggleHeroInventory toggles hero inventory state', () => {
    const state = getState();
    const hero = state.heroes[0] as Hero;
    const initialOpen = Boolean(hero.isInventoryOpen);

    toggleHeroInventory(hero);
    expect((getState().heroes[0] as Hero).isInventoryOpen).toBe(!initialOpen);

    toggleHeroInventory(hero);
    expect((getState().heroes[0] as Hero).isInventoryOpen).toBe(initialOpen);
  });

  it('toggleHeroInventory closes every other hero status screen (modal)', () => {
    const state = getState();
    const first = state.heroes[0] as Hero;
    const second = state.heroes[1] as Hero;
    expect(second).toBeDefined();

    first.isInventoryOpen = true;
    toggleHeroInventory(second);

    const after = getState();
    expect((after.heroes[0] as Hero).isInventoryOpen).toBe(false);
    expect((after.heroes[1] as Hero).isInventoryOpen).toBe(true);
  });

  it('actions like endHeroAction, moveHero, pickLockAction, searchAction modify state and notify store', async () => {
    const hero = get(currentHero);
    expect(hero).toBeDefined();
    if (!hero) return;

    hero.actions = 2;
    await endHeroAction();
    expect(get(currentHero)?.actions).toBe(1);

    moveHero('R');
    pickLockAction();
    searchAction();
    expect(get(gameStateStore)).toBeDefined();
  });

  it('supports saveGame, loadGameState, nextTurn, and goToTestingGrounds', async () => {
    const state = getState();
    saveGame();
    saveReloadGuard(state);

    const nextState = await nextTurn({
      delayBetweenMonsters: 0,
      delayBetweenActions: 0,
      delayAfterAttack: 0,
      waitForMovement: false,
    });
    expect(nextState).toBeDefined();

    loadGameState(state);
    expect(getState().heroes[0].name).toBe(state.heroes[0].name);

    goToTestingGrounds();
    expect(getState().dungeon.name).toBe(
      'campaign.iceDragon.testingGrounds.name',
    );
  });

  it('dispatch allows custom mutations with store synchronization', () => {
    dispatch((s) => {
      s.settings['customSetting'] = 'testValue';
    });
    expect(getState().settings['customSetting']).toBe('testValue');
  });

  it('debouncedSaveReloadGuard uses timer instead of synchronous execution', () => {
    vi.useFakeTimers();
    const state = init();

    debouncedSaveReloadGuard(state, 100);
    vi.runAllTimers();
    vi.useRealTimers();
  });
});

describe('derived store recomputation', () => {
  beforeEach(() => {
    initGame();
  });

  it('deriveds recompute only while subscribed (laziness)', () => {
    let computes = 0;
    const probe = derived(gameStateStore, ($state) => {
      computes += 1;
      return $state?.turnCount ?? 0;
    });
    const state = getState();

    // Publications without subscribers do not run derived predicates.
    for (let i = 0; i < 5; i += 1) gameStateStore.set(state);
    expect(computes).toBe(0);

    const unsub = probe.subscribe(() => {});
    expect(computes).toBe(1);

    gameStateStore.set(state);
    expect(computes).toBe(2);

    unsub();
    gameStateStore.set(state);
    expect(computes).toBe(2);
  });

  it('publishes an in-place visibility change to derived subscribers', () => {
    const state = getState();
    const hidden = state.dungeon.layout.monsters.find((monster) => {
      const cell = findCell(
        state.dungeon.layout.grid,
        monster.position.x,
        monster.position.y,
      );
      return cell && !state.dungeon.discoveredRooms.includes(cell);
    });
    expect(hidden).toBeDefined();
    if (!hidden) return;

    const seen: number[] = [];
    const unsub = visibleMonsters.subscribe((monsters) => {
      seen.push(monsters.length);
    });

    gameStateStore.set(state);
    const before = seen[seen.length - 1];
    expect(get(visibleMonsters).some((monster) => monster === hidden)).toBe(
      false,
    );

    // In-place discovery of the monster's room, published through the
    // usual envelope: subscribers must see the reveal without any
    // deduplication on the shared nested objects.
    const cell = findCell(
      state.dungeon.layout.grid,
      hidden.position.x,
      hidden.position.y,
    );
    if (cell) state.dungeon.discoveredRooms.push(cell);
    gameStateStore.set(state);

    expect(seen.length).toBeGreaterThan(1);
    expect(seen[seen.length - 1]).toBe(before + 1);
    expect(get(visibleMonsters).some((monster) => monster === hidden)).toBe(
      true,
    );

    unsub();
  });

  it('publishes in-place hero deaths to liveHeroesStore and isGameOver', () => {
    const state = getState();
    const liveSeen: number[] = [];
    const overSeen: boolean[] = [];
    const unsubLive = liveHeroesStore.subscribe((heroes) => {
      liveSeen.push(heroes.length);
    });
    const unsubOver = isGameOver.subscribe((over) => {
      overSeen.push(over);
    });

    gameStateStore.set(state);
    expect(liveSeen[liveSeen.length - 1]).toBe(state.heroes.length);
    expect(overSeen[overSeen.length - 1]).toBe(false);

    state.heroes.forEach((hero) => {
      hero.health = 0;
    });
    gameStateStore.set(state);

    expect(liveSeen[liveSeen.length - 1]).toBe(0);
    expect(overSeen[overSeen.length - 1]).toBe(true);

    // Reviving in place publishes again: the game-over result must
    // re-derive from the then-current live-hero result.
    state.heroes.forEach((hero) => {
      hero.health = 3;
    });
    gameStateStore.set(state);

    expect(liveSeen[liveSeen.length - 1]).toBe(state.heroes.length);
    expect(overSeen[overSeen.length - 1]).toBe(false);

    unsubLive();
    unsubOver();
  });

  it('forwards mid-turn publications from an asynchronous turn', async () => {
    const liveSeen: number[] = [];
    const unsubLive = liveHeroesStore.subscribe((heroes) => {
      liveSeen.push(heroes.length);
    });

    await nextTurn({
      delayBetweenMonsters: 0,
      delayBetweenActions: 0,
      delayAfterAttack: 0,
      waitForMovement: false,
    });

    // At least the final publication of the turn reached subscribers, on
    // top of the subscription's initial notification.
    expect(liveSeen.length).toBeGreaterThan(1);
    expect(liveSeen[liveSeen.length - 1]).toBe(get(liveHeroesStore).length);

    unsubLive();
  });

  it('keeps the welcome-phase game-over result false while the store holds null', () => {
    gameStateStore.set(null);

    expect(get(gameStateStore)).toBeNull();
    expect(get(liveHeroesStore)).toEqual([]);
    expect(get(isGameOver)).toBe(false);
  });
});
