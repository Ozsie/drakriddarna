// Save/load dialog view model adapter: the only place that reads the
// game side for the save/load dialog. Save mode needs a live game state
// (it prefills from the current dungeon); the load rows come from the
// menu's saved-game items. Every label is prebuilt here.

import type { GameState } from '../../types';
import {
  type MenuCallbacks,
  getSavedGameMenuItems,
} from '../../menu/MenuLogic';
import type { Translator } from '@hoard-engine/uikit';
import type {
  SaveLoadDialogMode,
  SaveLoadDialogViewModel,
} from '@hoard-engine/uikit';
import { i18nTranslator } from '../i18nAdapter';

export const toSaveLoadDialogViewModel = (
  state: GameState | null | undefined,
  mode: SaveLoadDialogMode,
  t: Translator = i18nTranslator,
): SaveLoadDialogViewModel | null => {
  // The load dialog also opens over the welcome screen, where no game
  // state exists yet; only save mode requires one.
  if (mode === 'save' && !state) return null;

  const isSave = mode === 'save';
  const rows = isSave
    ? []
    : getSavedGameMenuItems(state, undefined).map((item) => ({
        id: item.id,
        label: item.label,
        hint: item.hint,
      }));

  return {
    mode,
    titleText: isSave
      ? t('content.menu.saveGame.header')
      : t('content.menu.loadGame.header'),
    subtitleText: isSave
      ? t('content.menu.saveGame.subtitle')
      : t('content.menu.loadGame.subtitle'),
    rows,
    actionButtonLabel: isSave
      ? t('content.menu.saveGame.buttons.save')
      : t('content.menu.loadGame.buttons.back'),
    secondaryButtonLabel: isSave
      ? t('content.menu.saveGame.buttons.cancel')
      : undefined,
  };
};

/** The saved-game menu items, in view-model row order. */
export const savedGameItems = (
  state: GameState | null | undefined,
  callbacks: MenuCallbacks | undefined,
) => getSavedGameMenuItems(state, callbacks);
