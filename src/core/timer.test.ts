import { describe, it, expect } from 'vitest';
import {
  addDungeonTimeToCampaign,
  beginDungeonTiming,
  checkpointDungeonTimer,
  formatDuration,
  getCampaignTimeMs,
  getCurrentDungeonTimeMs,
  resumeDungeonTimer,
  startDungeonTimer,
  stopDungeonTimer,
} from './timer';
import type { GameState } from '../types';

const createState = (overrides: Partial<GameState> = {}): GameState =>
  ({
    heroes: [],
    actionLog: [],
    itemDeck: [],
    magicItemDeck: [],
    settings: {},
    eventDeck: [],
    reRender: false,
    drawEvents: false,
    dungeon: {
      name: 'test-dungeon',
      intro: '',
      layout: {
        grid: [],
        doors: [],
        monsters: [],
        secrets: [],
        notes: [],
        items: [],
        corridors: [],
        corners: [],
      },
      startingPositions: [{ x: 0, y: 0 }],
      discoveredRooms: [],
      winConditions: [],
      beaten: false,
      killCount: 0,
    },
    ...overrides,
  }) as GameState;

describe('beginDungeonTiming', () => {
  it('starts the timer immediately for a dungeon without an intro', () => {
    const state = createState();
    const now = 1_000_000;
    beginDungeonTiming(state, false, now);
    expect(state.timer).toEqual({
      runningFrom: now,
      dungeonElapsedMs: 0,
      campaignElapsedMs: 0,
    });
  });

  it('waits for the intro to close for a dungeon with an intro', () => {
    const state = createState();
    beginDungeonTiming(state, true, 1_000_000);
    expect(state.timer).toEqual({
      runningFrom: undefined,
      dungeonElapsedMs: 0,
      campaignElapsedMs: 0,
    });
  });

  it('resets the dungeon segment but keeps the campaign total', () => {
    const state = createState();
    beginDungeonTiming(state, false, 1_000_000);
    stopDungeonTimer(state, 1_030_000);
    addDungeonTimeToCampaign(state);

    beginDungeonTiming(state, false, 2_000_000);
    expect(state.timer?.dungeonElapsedMs).toBe(0);
    expect(state.timer?.runningFrom).toBe(2_000_000);
    expect(state.timer?.campaignElapsedMs).toBe(30_000);
  });
});

describe('startDungeonTimer', () => {
  it('starts a stopped timer', () => {
    const state = createState();
    state.timer = { dungeonElapsedMs: 0, campaignElapsedMs: 0 };
    startDungeonTimer(state, 5_000);
    expect(state.timer?.runningFrom).toBe(5_000);
  });

  it('is a no-op while the timer already runs', () => {
    const state = createState();
    state.timer = {
      runningFrom: 1_000,
      dungeonElapsedMs: 200,
      campaignElapsedMs: 500,
    };
    startDungeonTimer(state, 9_000);
    expect(state.timer?.runningFrom).toBe(1_000);
  });
});

describe('stopDungeonTimer', () => {
  it('folds the running segment into the accumulated time and clears the base', () => {
    const state = createState();
    beginDungeonTiming(state, false, 1_000);
    stopDungeonTimer(state, 61_000);
    expect(state.timer).toEqual({
      runningFrom: undefined,
      dungeonElapsedMs: 60_000,
      campaignElapsedMs: 0,
    });
  });

  it('is idempotent', () => {
    const state = createState();
    beginDungeonTiming(state, false, 1_000);
    stopDungeonTimer(state, 61_000);
    stopDungeonTimer(state, 120_000);
    expect(state.timer?.dungeonElapsedMs).toBe(60_000);
  });

  it('does nothing without a timer', () => {
    const state = createState();
    stopDungeonTimer(state, 1_000);
    expect(state.timer).toBeUndefined();
  });
});

describe('addDungeonTimeToCampaign', () => {
  it('adds the dungeon time to the campaign total', () => {
    const state = createState();
    state.timer = {
      dungeonElapsedMs: 90_000,
      campaignElapsedMs: 30_000,
    };
    addDungeonTimeToCampaign(state);
    expect(state.timer?.campaignElapsedMs).toBe(120_000);
    expect(state.timer?.dungeonElapsedMs).toBe(90_000);
  });
});

describe('checkpointDungeonTimer', () => {
  it('accumulates the segment and rebases without changing the live time', () => {
    const state = createState();
    beginDungeonTiming(state, false, 1_000);
    expect(getCurrentDungeonTimeMs(state, 41_000)).toBe(40_000);

    checkpointDungeonTimer(state, 41_000);
    expect(state.timer?.dungeonElapsedMs).toBe(40_000);
    expect(state.timer?.runningFrom).toBe(41_000);
    // The live time is unchanged by the checkpoint.
    expect(getCurrentDungeonTimeMs(state, 41_000)).toBe(40_000);
  });

  it('does nothing when the timer is stopped', () => {
    const state = createState();
    state.timer = { dungeonElapsedMs: 5_000, campaignElapsedMs: 0 };
    checkpointDungeonTimer(state, 50_000);
    expect(state.timer).toEqual({
      runningFrom: undefined,
      dungeonElapsedMs: 5_000,
      campaignElapsedMs: 0,
    });
  });
});

describe('resumeDungeonTimer', () => {
  it('rebases the running segment to now, dropping the offline gap', () => {
    const state = createState();
    // Saved at 41_000 after a checkpoint at 40_000 (segment base 41_000 in
    // the save; loaded much later at 500_000).
    state.timer = {
      runningFrom: 41_000,
      dungeonElapsedMs: 40_000,
      campaignElapsedMs: 0,
    };
    resumeDungeonTimer(state, 500_000);
    expect(state.timer?.runningFrom).toBe(500_000);
    expect(state.timer?.dungeonElapsedMs).toBe(40_000);
    expect(getCurrentDungeonTimeMs(state, 500_500)).toBe(40_500);
  });

  it('does not start a timer that was not running when saved', () => {
    const state = createState();
    state.timer = { dungeonElapsedMs: 5_000, campaignElapsedMs: 0 };
    resumeDungeonTimer(state, 100_000);
    expect(state.timer?.runningFrom).toBeUndefined();
  });
});

describe('getCurrentDungeonTimeMs / getCampaignTimeMs', () => {
  it('return zero without a timer', () => {
    const state = createState();
    expect(getCurrentDungeonTimeMs(state)).toBe(0);
    expect(getCampaignTimeMs(state)).toBe(0);
  });

  it('sum accumulated, campaign and running time', () => {
    const state = createState();
    state.timer = {
      runningFrom: 10_000,
      dungeonElapsedMs: 50_000,
      campaignElapsedMs: 120_000,
    };
    expect(getCurrentDungeonTimeMs(state, 40_000)).toBe(80_000);
    expect(getCampaignTimeMs(state, 40_000)).toBe(200_000);
  });
});

describe('formatDuration', () => {
  it('formats minutes and seconds', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(59_999)).toBe('0:59');
    expect(formatDuration(60_000)).toBe('1:00');
    expect(formatDuration(654_321)).toBe('10:54');
  });

  it('switches to hours above an hour', () => {
    expect(formatDuration(3_600_000)).toBe('1:00:00');
    expect(formatDuration(3_661_000)).toBe('1:01:01');
  });

  it('clamps negative input to zero', () => {
    expect(formatDuration(-5_000)).toBe('0:00');
  });

  it('appends hundredths of a second when asked to', () => {
    expect(formatDuration(0, { hundredths: true })).toBe('0:00.00');
    expect(formatDuration(65_432, { hundredths: true })).toBe('1:05.43');
    expect(formatDuration(59_999, { hundredths: true })).toBe('0:59.99');
    expect(formatDuration(3_661_234, { hundredths: true })).toBe('1:01:01.23');
    expect(formatDuration(-5_000, { hundredths: true })).toBe('0:00.00');
  });
});
