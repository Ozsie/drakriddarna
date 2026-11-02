// Top bar view model adapter: the only place that reads GameState for the
// top bar. The kit component consumes the resulting view model; every
// label, counter and log line is prebuilt here (with the env's translator
// and layout mode), so the component holds no game knowledge.

import type { GameState, LogEvent } from '../../types';
import { formatDuration, getCurrentDungeonTimeMs } from '../../core';
import { isDebugModeAvailable } from '../../settings/debugMode';
import type { Translator } from '../../uikit';
import type { TopBarViewModel } from '../../uikit';
import { i18nTranslator } from '../i18nAdapter';

// Compact (narrow screen) counter labels: an emoji instead of the
// localized word, so each chip only needs room for the icon plus its
// digits.
const COMPACT_TURN_LABEL = '🔄';
const COMPACT_SCORE_LABEL = '🏆';

// Width reservations: the icon plus two round digits / five score digits,
// so the chips do not resize whenever the numbers tick up.
const COMPACT_TURN_TEMPLATE = `${COMPACT_TURN_LABEL} 99`;
const COMPACT_SCORE_TEMPLATE = `${COMPACT_SCORE_LABEL} 99999`;

export const formatLatestLog = (
  log?: LogEvent | null,
  t: Translator = i18nTranslator,
): string => {
  if (!log) return '';
  const translated = t(log.key, log.properties);
  if (log.turn !== undefined && log.turn !== null) {
    return `(${log.turn}) ${translated}`;
  }
  return translated;
};

export const formatTurnCounter = (
  turnCount?: number | null,
  compact = false,
  t: Translator = i18nTranslator,
): string => {
  if (compact) {
    return `${COMPACT_TURN_LABEL} ${turnCount ?? 0}`;
  }
  const turnLabel = t('content.turn');
  const label = turnLabel === 'content.turn' ? 'Turn' : turnLabel || 'Turn';
  return `${label} ${turnCount ?? 0}`;
};

export const formatScoreCounter = (
  score?: number | null,
  compact = false,
  t: Translator = i18nTranslator,
): string => {
  if (compact) {
    return `${COMPACT_SCORE_LABEL} ${score ?? 0}`;
  }
  const scoreLabel = t('content.scoring.topBar');
  const label =
    scoreLabel === 'content.scoring.topBar' ? 'Score' : scoreLabel || 'Score';
  return `${label} ${score ?? 0}`;
};

export interface TopBarAdapterOptions {
  /** Overrides the state's debug setting. */
  debugMode?: boolean;
  /**
   * Overrides the build-mode debug gate; defaults to dev-build
   * availability (`isDebugModeAvailable`), which production builds
   * compile to false.
   */
  debugAvailable?: boolean;
}

export const toTopBarViewModel = (
  state: GameState | null | undefined,
  t: Translator,
  compact: boolean,
  options?: TopBarAdapterOptions,
): TopBarViewModel => {
  const rawMenuLabel = t('content.menu.menuButton');
  const menuLabel =
    rawMenuLabel === 'content.menu.menuButton'
      ? 'Menu'
      : rawMenuLabel || 'Menu';

  const rawDebugLabel = t('content.menu.debugMenu.header');
  const debugLabel =
    rawDebugLabel === 'content.menu.debugMenu.header'
      ? 'Debug'
      : rawDebugLabel || 'Debug';

  const isSpeedrun = state?.speedrunSeed !== undefined;
  const latestLog = state?.actionLog?.[0];

  return {
    menuLabel,
    debugLabel,
    // The Debug button (the debug menu's only entry point) exists only in
    // dev builds; production deploys never show it, whatever a save or
    // persisted setting carries, so the menu can't be used to cheat.
    showDebug:
      (options?.debugAvailable ?? isDebugModeAvailable()) &&
      (options?.debugMode ?? Boolean(state?.settings?.['debug'])),
    turnText: formatTurnCounter(state?.turnCount, compact, t),
    scoreText: formatScoreCounter(state?.score, compact, t),
    isSpeedrun,
    timerText: isSpeedrun
      ? state
        ? formatDuration(getCurrentDungeonTimeMs(state), { hundredths: true })
        : ''
      : '',
    timerTemplateText: formatDuration(3600000, { hundredths: true }),
    turnTemplateText: compact ? COMPACT_TURN_TEMPLATE : '',
    scoreTemplateText: compact ? COMPACT_SCORE_TEMPLATE : '',
    logText: formatLatestLog(latestLog, t),
    logEntries: state?.actionLog
      ? state.actionLog.slice(0, 8).map((log) => formatLatestLog(log, t))
      : [],
  };
};
