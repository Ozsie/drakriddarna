import { describe, expect, it } from 'vitest';
import {
  isGameInputEnabled,
  resolveKeyboardTarget,
  type BoardModalState,
} from './DungeonBoardModal';

const boardState: BoardModalState = {
  isNewGameDialogOpen: false,
  isSaveLoadDialogOpen: false,
  isHeroRenameFocused: false,
  isWelcomePhase: false,
  isDebugMenuOpen: false,
  isDungeonIntroOpen: false,
  isBetweenDungeonsOpen: false,
  isHeroStatusOpen: false,
};

describe('DungeonBoardModal', () => {
  it('resolves keyboard targets in modal priority order', () => {
    expect(resolveKeyboardTarget(boardState)).toBe('board');
    expect(resolveKeyboardTarget({ ...boardState, isWelcomePhase: true })).toBe(
      'welcome',
    );
    expect(
      resolveKeyboardTarget({
        ...boardState,
        isWelcomePhase: true,
        isHeroRenameFocused: true,
      }),
    ).toBe('heroRename');
    expect(
      resolveKeyboardTarget({
        ...boardState,
        isWelcomePhase: true,
        isHeroRenameFocused: true,
        isSaveLoadDialogOpen: true,
      }),
    ).toBe('saveLoadDialog');
    expect(
      resolveKeyboardTarget({
        ...boardState,
        isWelcomePhase: true,
        isHeroRenameFocused: true,
        isSaveLoadDialogOpen: true,
        isNewGameDialogOpen: true,
      }),
    ).toBe('newGameDialog');
  });

  it.each([
    ['new-game dialog', { isNewGameDialogOpen: true }],
    ['save/load dialog', { isSaveLoadDialogOpen: true }],
    ['welcome phase', { isWelcomePhase: true }],
    ['hero rename input', { isWelcomePhase: true, isHeroRenameFocused: true }],
    ['debug menu', { isDebugMenuOpen: true }],
    ['dungeon intro', { isDungeonIntroOpen: true }],
    ['between-dungeons overlay', { isBetweenDungeonsOpen: true }],
    ['hero status', { isHeroStatusOpen: true }],
  ])('disables game input while the %s is open', (_name, modalState) => {
    expect(isGameInputEnabled({ ...boardState, ...modalState })).toBe(false);
  });

  it('enables game input on the unobstructed board', () => {
    expect(isGameInputEnabled(boardState)).toBe(true);
  });
});
