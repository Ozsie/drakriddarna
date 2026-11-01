import { describe, expect, it } from 'vitest';
import {
  foundDiaryNotes,
  sortedWinConditions,
  toDiaryViewModel,
} from './diary';
import {
  ConditionType,
  type GameState,
  type Note,
  type WinCondition,
} from '../../types';

const identityT = (key: string) => key;

const condition = (
  type: ConditionType,
  fulfilled: boolean,
  extra: Partial<WinCondition> = {},
): WinCondition => ({ type, fulfilled, ...extra });

const note = (message: string, foundOn: number, found = true): Note => ({
  message,
  found,
  foundOn,
  position: { x: 0, y: 0 },
});

const createState = (
  winConditions: WinCondition[],
  notes: Note[],
  killCount = 0,
): GameState =>
  ({
    turnCount: 4,
    dungeon: {
      winConditions,
      killCount,
      layout: { notes },
    },
  }) as unknown as GameState;

describe('diary view model', () => {
  it('returns null without state and empty for a dungeon without content', () => {
    expect(toDiaryViewModel(null, identityT)).toBeNull();
    const vm = toDiaryViewModel(
      createState([], [note('x', 1, false)]),
      identityT,
    );
    expect(vm?.winConditions).toHaveLength(0);
    expect(vm?.diaryNotes).toHaveLength(0);
    expect(vm?.diaryHeader).toBe('Diary (turn 4)');
  });

  it('sorts conditions unfulfilled first and prebuilds their texts', () => {
    const done = condition(ConditionType.KILL_ALL, true);
    const open = condition(ConditionType.KILL_AT_LEAST, false, {
      killMinCount: 3,
    });
    const vm = toDiaryViewModel(createState([done, open], [], 1), identityT);

    expect(vm?.winConditions.map((item) => item.fulfilled)).toEqual([
      false,
      true,
    ]);
    expect(vm?.winConditions[0].text).toBe('Kill at least 3 monsters. (1/3)');
  });

  it('keeps only found notes, newest first, with headers and turns', () => {
    const state = createState(
      [],
      [
        note('Ancient inscription', 1),
        note('A shadow dragon', 3),
        note('Unfound', 5, false),
      ],
    );
    const vm = toDiaryViewModel(state, identityT);

    expect(vm?.diaryNotes.map((item) => item.turn)).toEqual([3, 1]);
    expect(vm?.diaryNotes[0].message).toContain('shadow dragon');
    expect(vm?.diaryNotes[0].header).toBe('On 3)');
  });

  it('exposes the sorted lists for facade-side item mapping', () => {
    const state = createState(
      [condition(ConditionType.SECRET_FOUND, true)],
      [note('n', 2)],
    );
    expect(sortedWinConditions(state)).toHaveLength(1);
    expect(foundDiaryNotes(state)).toHaveLength(1);
  });
});
