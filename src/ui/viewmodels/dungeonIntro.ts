// Dungeon intro view model adapter: the only place that reads GameState
// for the dungeon intro. The visibility gate (intro present, turn 0, not
// dismissed) and the translated title/intro/close texts live here.

import type { GameState } from '../../types';
import type { Translator } from '@hoard-engine/uikit';
import { i18nTranslator } from '../i18nAdapter';

export interface DungeonIntroViewModel {
  titleText: string;
  introText: string;
  closeButtonLabel: string;
}

/** Whether the intro modal should be shown for this state. */
export const shouldShowDungeonIntro = (
  state: GameState | null | undefined,
  dismissed = false,
): boolean => {
  if (!state || dismissed) return false;
  const intro = state.dungeon?.intro;
  if (!intro || typeof intro !== 'string' || intro.trim().length === 0) {
    return false;
  }
  const turnCount = state.turnCount ?? 0;
  return turnCount <= 0;
};

// A key that has no translation keeps its raw text (human-authored
// content such as dungeon names and intro texts).
const translateOrRaw = (raw: string, t: Translator): string => {
  const translated = t(raw);
  return translated && translated !== raw ? translated : raw;
};

export const toDungeonIntroViewModel = (
  state: GameState | null | undefined,
  t: Translator = i18nTranslator,
): DungeonIntroViewModel | null => {
  if (!state) return null;
  const rawIntro = state.dungeon?.intro ?? '';
  if (!rawIntro) return null;
  return {
    titleText: translateOrRaw(state.dungeon?.name ?? 'Dungeon Intro', t),
    introText: translateOrRaw(rawIntro, t),
    closeButtonLabel: t('content.winConditions.buttonClose') || 'Close',
  };
};
