export interface BoardModalState {
  isNewGameDialogOpen: boolean;
  isSaveLoadDialogOpen: boolean;
  isHeroRenameFocused: boolean;
  isWelcomePhase: boolean;
  isDebugMenuOpen: boolean;
  isDungeonIntroOpen: boolean;
  isBetweenDungeonsOpen: boolean;
  isHeroStatusOpen: boolean;
}

export type BoardKeyboardTarget =
  'newGameDialog' | 'saveLoadDialog' | 'heroRename' | 'welcome' | 'board';

export const isGameInputEnabled = (modal: BoardModalState): boolean =>
  !modal.isWelcomePhase &&
  !modal.isDebugMenuOpen &&
  !modal.isSaveLoadDialogOpen &&
  !modal.isNewGameDialogOpen &&
  !modal.isDungeonIntroOpen &&
  !modal.isBetweenDungeonsOpen &&
  !modal.isHeroStatusOpen;

export const resolveKeyboardTarget = (
  modal: BoardModalState,
): BoardKeyboardTarget => {
  if (modal.isNewGameDialogOpen) return 'newGameDialog';
  if (modal.isSaveLoadDialogOpen) return 'saveLoadDialog';
  if (modal.isWelcomePhase && modal.isHeroRenameFocused) return 'heroRename';
  if (modal.isWelcomePhase) return 'welcome';
  return 'board';
};
