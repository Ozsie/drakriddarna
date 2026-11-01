import { describe, expect, it } from 'vitest';
import {
  rankedHighScores,
  toBetweenDungeonsViewModel,
} from './betweenDungeons';
import type { GameState } from '../../types';

const identityT = (key: string) => key;

const createState = (betweenDungeons: Record<string, unknown>): GameState =>
  ({
    heroes: [],
    betweenDungeons: { step: 'levelUp', ...betweenDungeons },
  }) as unknown as GameState;

describe('rankedHighScores', () => {
  it('merges the current run into the stored list at its rank', () => {
    const stored = [
      { score: 900 },
      { score: 700 },
      { score: 500 },
      { score: 300 },
    ];
    const rows = rankedHighScores(stored, 650);
    expect(rows.map((row) => row.score)).toEqual([900, 700, 650, 500, 300]);
    expect(rows.map((row) => row.isCurrent)).toEqual([
      false,
      false,
      true,
      false,
      false,
    ]);
  });

  it('caps the list at the maximum and keeps the current run visible', () => {
    const stored = Array.from({ length: 10 }, (_, i) => ({
      score: 1000 - i * 10,
    }));
    const rows = rankedHighScores(stored, 955, 10);
    expect(rows).toHaveLength(10);
    expect(rows.some((row) => row.isCurrent)).toBe(true);
    expect(rows.filter((row) => row.isCurrent)).toHaveLength(1);
    // The lowest stored score falls off the board.
    expect(rows.map((row) => row.score)).not.toContain(910);
  });

  it('appends below the maximum when the run does not rank', () => {
    const stored = Array.from({ length: 10 }, () => ({
      score: 1000,
    }));
    const rows = rankedHighScores(stored, 1, 10);
    expect(rows).toHaveLength(11);
    expect(rows[rows.length - 1].isCurrent).toBe(true);
  });

  it('tops the list when the run beats everything', () => {
    const rows = rankedHighScores([{ score: 10 }, { score: 5 }], 99);
    expect(rows[0]).toEqual({ score: 99, isCurrent: true });
  });
});

describe('between-dungeons view model', () => {
  it('returns null without the between-dungeons state', () => {
    expect(toBetweenDungeonsViewModel(null, identityT)).toBeNull();
    expect(toBetweenDungeonsViewModel({} as GameState, identityT)).toBeNull();
  });

  it('carries the level-up step with score texts and action label', () => {
    const vm = toBetweenDungeonsViewModel(
      createState({
        step: 'levelUp',
        completedDungeonName: 'The Buried Gate',
        nextDungeon: { name: 'The Ice Cave' },
        scenarioScore: {
          total: 120,
          healthPoints: 10,
          killPoints: 40,
          itemPoints: 30,
          secretPoints: 20,
          roundPenalty: -20,
        },
        campaignScore: 240,
      }),
      identityT,
    );
    expect(vm?.step).toBe('levelUp');
    expect(vm?.titleText).toBe('content.betweenDungeons.titleLevelUp');
    expect(vm?.actionButtonLabel).toBe(
      'content.betweenDungeons.buttons.tradeItems',
    );
    expect(vm?.secondaryButtonLabel).toBeUndefined();
    expect(vm?.scoreSection?.totalText).toBe('content.scoring.scenarioScore');
    expect(vm?.scoreSection?.breakdownTexts).toHaveLength(5);
    expect(vm?.selectedTradeHeroIndex).toBeNull();
  });

  it('switches to the trade labels on the trade step', () => {
    const vm = toBetweenDungeonsViewModel(
      createState({
        step: 'trade',
        nextDungeon: { name: 'The Ice Cave' },
      }),
      identityT,
    );
    expect(vm?.step).toBe('trade');
    expect(vm?.actionButtonLabel).toBe(
      'content.betweenDungeons.buttons.startNextDungeon',
    );
    expect(vm?.secondaryButtonLabel).toBe(
      'content.betweenDungeons.buttons.backToLevelUp',
    );
  });

  it('marks the selected trade item and its hero', () => {
    const vm = toBetweenDungeonsViewModel(
      createState({
        step: 'trade',
        selectedTradeItem: { heroIndex: 1, slot: 'weapon', itemIndex: 0 },
      }),
      identityT,
    );
    expect(vm?.selectedTradeHeroIndex).toBe(1);
  });
});
