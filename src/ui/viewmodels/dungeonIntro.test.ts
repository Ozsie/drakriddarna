import { describe, expect, it } from 'vitest';
import {
  shouldShowDungeonIntro,
  toDungeonIntroViewModel,
} from './dungeonIntro';
import { dismissDungeonIntro } from '../actions/dismissDungeonIntro';
import type { Dungeon, GameState } from '../../types';

const identityT = (key: string) => key;

const createState = (overrides?: {
  turnCount?: number;
  dungeon?: Partial<Dungeon>;
}): GameState =>
  ({
    turnCount: 0,
    dungeon: {
      name: 'The Buried Gate',
      intro: 'The gate groans open.',
      layout: { grid: [], notes: [] },
      ...overrides?.dungeon,
    },
    ...overrides,
  }) as unknown as GameState;

describe('dungeon intro view model', () => {
  it('shows the intro only before the first turn and while not dismissed', () => {
    const state = createState();
    expect(shouldShowDungeonIntro(state)).toBe(true);
    expect(shouldShowDungeonIntro(state, true)).toBe(false);
    expect(shouldShowDungeonIntro(createState({ turnCount: 1 }))).toBe(false);
    expect(
      shouldShowDungeonIntro(
        createState({ dungeon: { name: 'X', intro: '   ' } }),
      ),
    ).toBe(false);
  });

  it('carries the translated title, intro and close label', () => {
    const vm = toDungeonIntroViewModel(createState(), identityT);
    expect(vm?.titleText).toBe('The Buried Gate');
    expect(vm?.introText).toBe('The gate groans open.');
    expect(vm?.closeButtonLabel).toBe('content.winConditions.buttonClose');
  });

  it('returns no view model without an intro', () => {
    expect(
      toDungeonIntroViewModel(createState({ dungeon: { name: 'X' } })),
    ).toBeNull();
  });
});

describe('dismissDungeonIntro action', () => {
  it('logs the intro and records it as a found note once', () => {
    const state = createState();
    state.actionLog = [];

    expect(dismissDungeonIntro(state)).toBe(true);
    expect(state.actionLog).toHaveLength(1);
    const notes = state.dungeon.layout?.notes ?? [];
    expect(notes).toHaveLength(1);
    expect(notes[0].found).toBe(true);
    expect(notes[0].message).toBe('The gate groans open.');

    // A second dismissal does not duplicate the note.
    dismissDungeonIntro(state);
    expect(state.dungeon.layout?.notes).toHaveLength(1);
  });

  it('is a no-op without an intro', () => {
    const state = createState({ dungeon: { name: 'X' } });
    expect(dismissDungeonIntro(state)).toBe(false);
  });
});
