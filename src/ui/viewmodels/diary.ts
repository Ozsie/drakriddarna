// Diary view model adapter: the only place that reads GameState for the
// diary/win-condition panel, and the owner of the condition/note text
// formatters. The found-note filter and the sort orders live here too,
// so the facade can map layout items back to their Notes and
// WinConditions in the same order.

import type { GameState, Note, WinCondition } from '../../types';
import { ConditionType } from '../../types';
import type { Translator } from '../../uikit/env';
import type {
  DiaryNoteItemVm,
  DiaryViewModel,
  WinConditionItemVm,
} from '../../uikit/components/diary';
import { i18nTranslator } from '../i18nAdapter';

export const formatWinCondition = (
  cond: WinCondition,
  killCount = 0,
  t: Translator = i18nTranslator,
): string => {
  let additionalDescription = '';
  if (cond.additionalDescription) {
    const raw = t(cond.additionalDescription);
    const translated =
      raw === cond.additionalDescription ? cond.additionalDescription : raw;
    additionalDescription = ` ${translated}`;
  }

  let text: string;
  switch (cond.type) {
    case ConditionType.KILL_ALL: {
      const raw = t('content.winConditions.killAll');
      text =
        raw === 'content.winConditions.killAll'
          ? 'Kill all monsters.'
          : raw || 'Kill all monsters.';
      break;
    }
    case ConditionType.KILL_ALL_OF_TYPE: {
      const typeStr =
        cond.targetMonsterType !== undefined
          ? String(cond.targetMonsterType)
          : '';
      const raw = t('content.winConditions.killAllOfType', {
        type: typeStr,
      });
      if (raw && raw !== 'content.winConditions.killAllOfType') {
        if (raw.includes(typeStr)) {
          text = raw;
        } else if (raw.includes('{{type}}')) {
          text = raw.replace('{{type}}', typeStr);
        } else {
          text = `Kill all ${typeStr}.`;
        }
      } else {
        text = `Kill all ${typeStr}.`;
      }
      break;
    }
    case ConditionType.KILL_AT_LEAST: {
      const min = cond.killMinCount ?? 0;
      const raw = t('content.winConditions.killAtLeast', {
        minKills: `${min}`,
      });
      const prefix =
        raw === 'content.winConditions.killAtLeast'
          ? `Kill at least ${min} monsters.`
          : raw || `Kill at least ${min} monsters.`;
      text = `${prefix} (${killCount}/${min})`;
      break;
    }
    case ConditionType.OPEN_DOOR: {
      const raw = t('content.winConditions.openDoor');
      text =
        raw === 'content.winConditions.openDoor'
          ? 'Open a certain door.'
          : raw || 'Open a certain door.';
      break;
    }
    case ConditionType.REACH_CELL: {
      const raw = t('content.winConditions.reachCell');
      text =
        raw === 'content.winConditions.reachCell'
          ? 'Reach a certain cell.'
          : raw || 'Reach a certain cell.';
      break;
    }
    case ConditionType.SECRET_FOUND: {
      const raw = t('content.winConditions.secretFound');
      text =
        raw === 'content.winConditions.secretFound'
          ? 'Find a certain secret.'
          : raw || 'Find a certain secret.';
      break;
    }
    default:
      text = 'Complete objective.';
      break;
  }

  return text + additionalDescription;
};

export const formatDiaryHeader = (
  turnCount = 0,
  t: Translator = i18nTranslator,
): string => {
  const raw = t('content.diary.label', { turn: `${turnCount}` });
  return raw === 'content.diary.label'
    ? `Diary (turn ${turnCount})`
    : raw || `Diary (turn ${turnCount})`;
};

export const formatNoteHeader = (
  note: Note,
  t: Translator = i18nTranslator,
): string => {
  const round = `${note.foundOn ?? ''}`;
  const raw = t('content.diary.foundOn', { round });
  return raw === 'content.diary.foundOn'
    ? `On ${round})`
    : raw || `On ${round})`;
};

export const formatNoteMessage = (
  note: Note,
  t: Translator = i18nTranslator,
): string => {
  if (!note.message) return '';
  const raw = t(note.message);
  return raw === note.message ? note.message : raw || note.message;
};

/** Win conditions sorted: unfulfilled first, fulfilled last. */
export const sortedWinConditions = (
  state: GameState | null | undefined,
): WinCondition[] => {
  const raw = state?.dungeon?.winConditions ?? [];
  return raw
    .slice()
    .sort((a, b) => (a.fulfilled === b.fulfilled ? 0 : a.fulfilled ? 1 : -1));
};

/** The found diary notes, newest first. */
export const foundDiaryNotes = (
  state: GameState | null | undefined,
): Note[] => {
  const raw = state?.dungeon?.layout?.notes ?? [];
  return raw
    .filter((note) => note.found)
    .sort((a, b) => (b.foundOn ?? 0) - (a.foundOn ?? 0));
};

export const toDiaryViewModel = (
  state: GameState | null | undefined,
  t: Translator = i18nTranslator,
): DiaryViewModel | null => {
  if (!state) return null;

  const killCount = state.dungeon?.killCount ?? 0;
  const conditions = sortedWinConditions(state);
  const notes = foundDiaryNotes(state);

  const winConditions: WinConditionItemVm[] = conditions.map((cond) => ({
    text: formatWinCondition(cond, killCount, t),
    fulfilled: Boolean(cond.fulfilled),
  }));

  const diaryNotes: DiaryNoteItemVm[] = notes.map((note) => ({
    header: formatNoteHeader(note, t),
    message: formatNoteMessage(note, t),
    turn: note.foundOn ?? 0,
  }));

  return {
    diaryHeader: formatDiaryHeader(state.turnCount ?? 0, t),
    winConditions,
    diaryNotes,
  };
};
