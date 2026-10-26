import { describe, expect, it } from 'vitest';
import type { GameState } from './types';
import { getGameMaster } from './core';
import { init, loadState } from './game';
import {
  CURRENT_SAVE_VERSION,
  migrateCollapsedCorridor,
  migrateGameMasterFields,
  migrateSaveState,
} from './saveMigration';

const createBareState = (): GameState =>
  ({
    heroes: [],
    dungeon: {
      name: 'test-dungeon',
      layout: {
        grid: ['#####', '#AA?#', '#####'],
        doors: [],
        monsters: [],
        secrets: [],
        notes: [],
        items: [],
        corridors: [],
        corners: [],
      },
      discoveredRooms: ['A'],
      startingPositions: [{ x: 1, y: 1 }],
      winConditions: [],
      beaten: false,
      killCount: 0,
    },
    actionLog: [],
    itemDeck: [],
    magicItemDeck: [],
    settings: {},
    eventDeck: [],
    reRender: false,
    drawEvents: true,
  }) as unknown as GameState;

describe('migrateGameMasterFields', () => {
  it('resolves the game master from legacy difficulty with modifiers', () => {
    const state = createBareState();
    const easy = getGameMaster('easy');
    (state as { difficulty?: unknown }).difficulty = easy;
    state.gameMaster = undefined;

    migrateGameMasterFields(state);

    expect(state.gameMaster).toBe(easy);
    expect('difficulty' in state).toBe(false);
    expect('gameMasterId' in state).toBe(false);
  });

  it('resolves a legacy gameMasterId when difficulty is absent', () => {
    const state = createBareState();
    state.gameMaster = undefined;
    (state as { gameMasterId?: string }).gameMasterId = 'brutalOverlord';

    migrateGameMasterFields(state);

    expect(state.gameMaster).toBe(getGameMaster('brutalOverlord'));
    expect('gameMasterId' in state).toBe(false);
  });

  it('keeps an existing game master and still removes legacy fields', () => {
    const state = createBareState();
    const tactician = getGameMaster('tactician');
    state.gameMaster = tactician;
    (state as { difficulty?: unknown }).difficulty = getGameMaster('easy');

    migrateGameMasterFields(state);

    expect(state.gameMaster).toBe(tactician);
    expect('difficulty' in state).toBe(false);
  });
});

describe('migrateCollapsedCorridor', () => {
  it('converts the legacy letter plus COLLAPSED cells into a group', () => {
    const state = createBareState();
    (state.dungeon as { collapsedCorridor?: string }).collapsedCorridor = 'B';

    migrateCollapsedCorridor(state);

    expect(state.dungeon.collapsedCorridors).toEqual([
      { letter: 'B', cells: [{ x: 3, y: 1 }] },
    ]);
    expect('collapsedCorridor' in state.dungeon).toBe(false);
  });

  it('preserves existing restore groups', () => {
    const state = createBareState();
    state.dungeon.layout.grid = ['#####', '#A?B#', '#####'];
    const existing = { letter: 'C', cells: [{ x: 1, y: 1 }] };
    state.dungeon.collapsedCorridors = [existing];
    (state.dungeon as { collapsedCorridor?: string }).collapsedCorridor = 'B';

    migrateCollapsedCorridor(state);

    expect(state.dungeon.collapsedCorridors).toEqual([
      existing,
      { letter: 'B', cells: [{ x: 2, y: 1 }] },
    ]);
  });

  it('does nothing without a legacy letter', () => {
    const state = createBareState();
    migrateCollapsedCorridor(state);
    expect(state.dungeon.collapsedCorridors).toBeUndefined();
  });
});

describe('migrateSaveState', () => {
  it('runs both migrations for a pre-versioning save and stamps the version', () => {
    const state = createBareState();
    state.gameMaster = undefined;
    (state as { gameMasterId?: string }).gameMasterId = 'easy';
    (state.dungeon as { collapsedCorridor?: string }).collapsedCorridor = 'B';

    migrateSaveState(state);

    expect(state.gameMaster).toBe(getGameMaster('easy'));
    expect(state.dungeon.collapsedCorridors).toEqual([
      { letter: 'B', cells: [{ x: 3, y: 1 }] },
    ]);
    expect(state.saveVersion).toBe(CURRENT_SAVE_VERSION);
  });

  it('skips migrations for a current-version save', () => {
    const state = createBareState();
    state.saveVersion = CURRENT_SAVE_VERSION;
    // A current save would not carry these fields; if it somehow does,
    // migration must not touch it at version.
    (state as { gameMasterId?: string }).gameMasterId = 'easy';
    state.gameMaster = getGameMaster('tactician');

    migrateSaveState(state);

    expect(state.gameMaster).toBe(getGameMaster('tactician'));
    expect('gameMasterId' in state).toBe(true);
    expect(state.saveVersion).toBe(CURRENT_SAVE_VERSION);
  });

  it('stamps the version even when nothing needs migrating', () => {
    const state = createBareState();
    state.gameMaster = getGameMaster('tactician');
    migrateSaveState(state);
    expect(state.saveVersion).toBe(CURRENT_SAVE_VERSION);
  });
});

describe('save version integration', () => {
  it('init stamps the current save version', () => {
    const state = init();
    expect(state.saveVersion).toBe(CURRENT_SAVE_VERSION);
  });

  it('loadState migrates an unversioned legacy save and stamps the version', () => {
    const state = init();
    const legacy = state as GameState & {
      difficulty?: unknown;
      gameMasterId?: string;
    };
    legacy.gameMasterId = 'brutalOverlord';
    legacy.difficulty = undefined;
    state.saveVersion = undefined;
    state.gameMaster = undefined;

    loadState(state);

    expect(state.gameMaster).toBe(getGameMaster('brutalOverlord'));
    expect(state.saveVersion).toBe(CURRENT_SAVE_VERSION);
    expect('gameMasterId' in state).toBe(false);
  });
});
