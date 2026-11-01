import type { GameState, LogEvent } from '../types';
import { formatDuration, getCurrentDungeonTimeMs } from '../core';
import {
  composeFont,
  measureTextWidth as kitMeasureTextWidth,
  truncateText as kitTruncateText,
} from '../uikit/primitives/text';
import type { Translator, UiEnv } from '../uikit/env';
import { defaultTheme } from '../uikit/theme';
import { defaultUiEnv, resolveLayoutMode } from './env';
import { i18nTranslator } from './i18nAdapter';

export interface TopBarElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TopBarLayout {
  topBar: TopBarElementBounds;
  menuButton: TopBarElementBounds & { label: string };
  debugButton?: TopBarElementBounds & { label: string };
  logSection: TopBarElementBounds & { text: string };
  scoreCounter: TopBarElementBounds & { text: string };
  /** Live dungeon timer chip; present only in speedrunner mode. */
  timerCounter?: TopBarElementBounds & { text: string };
  turnCounter: TopBarElementBounds & { text: string };
  logDropdown: TopBarElementBounds & { entries: string[] };
}

export interface RenderTopBarOptions {
  isMenuHovered?: boolean;
  isDebugHovered?: boolean;
  isLogHovered?: boolean;
  isLogOpen?: boolean;
  debugMode?: boolean;
  env?: UiEnv;
}

export type TopBarHitElement =
  | 'menu'
  | 'debug'
  | 'log'
  | 'turn'
  | 'logDropdown'
  | null;

// Compact (narrow screen) counter labels: an emoji instead of the localized
// word, so each chip only needs room for the icon plus its digits.
const COMPACT_TURN_LABEL = '🔄';
const COMPACT_SCORE_LABEL = '🏆';

// Fallback approximation (avg ~8px per char for monospace/standard).
const FALLBACK_PER_CHAR = 8;

export const measureTextWidth = (
  ctx: CanvasRenderingContext2D | null | undefined,
  text: string,
  font: string,
): number => kitMeasureTextWidth(ctx, text, font, FALLBACK_PER_CHAR);

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

export const truncateText = (
  ctx: CanvasRenderingContext2D | null | undefined,
  text: string,
  maxWidth: number,
  font: string,
): string => kitTruncateText(ctx, text, maxWidth, font, FALLBACK_PER_CHAR);

export interface TopBarLayoutOptions {
  debugMode?: boolean;
  env?: UiEnv;
}

export const getTopBarLayout = (
  viewWidth: number,
  state?: GameState | null,
  ctx?: CanvasRenderingContext2D | null,
  options?: TopBarLayoutOptions,
): TopBarLayout => {
  const theme = options?.env?.theme ?? defaultTheme;
  const t = options?.env?.t ?? i18nTranslator;
  const chipFont = composeFont(
    theme,
    theme.typography.sizes.lg,
    theme.typography.weights.regular,
    theme.typography.families.plain,
  );

  const margin = 8;
  const top = 8;
  const height = 32;
  const gap = 8;
  const paddingX = 12;

  const isDebug =
    options?.debugMode !== undefined
      ? options.debugMode
      : Boolean(state?.settings?.['debug']);

  const rawMenuLabel = t('content.menu.menuButton');
  const menuLabel =
    rawMenuLabel === 'content.menu.menuButton'
      ? 'Menu'
      : rawMenuLabel || 'Menu';
  const menuTextWidth = measureTextWidth(ctx, menuLabel, chipFont);
  const menuWidth = Math.max(48, Math.round(menuTextWidth + paddingX * 2));

  const rawDebugLabel = t('content.menu.mainMenu.buttons.debug');
  const debugLabel =
    rawDebugLabel === 'content.menu.mainMenu.buttons.debug'
      ? 'Debug'
      : rawDebugLabel || 'Debug';
  const debugTextWidth = measureTextWidth(ctx, debugLabel, chipFont);
  const debugWidth = isDebug
    ? Math.max(48, Math.round(debugTextWidth + paddingX * 2))
    : 0;

  // On narrow screens the counters shrink to an emoji plus the number, so
  // the log section keeps most of the bar width.
  const compact = resolveLayoutMode(options?.env, viewWidth) === 'compact';
  const counterPaddingX = compact ? 6 : paddingX;
  const turnText = formatTurnCounter(state?.turnCount, compact, t);
  const scoreText = formatScoreCounter(state?.score, compact, t);

  let turnCounterWidth: number;
  let scoreCounterWidth: number;
  if (compact) {
    // Reserve room for the icon plus two round digits / five score digits,
    // so the chips do not resize whenever the numbers tick up.
    const turnTemplateWidth = measureTextWidth(
      ctx,
      `${COMPACT_TURN_LABEL} 99`,
      chipFont,
    );
    const scoreTemplateWidth = measureTextWidth(
      ctx,
      `${COMPACT_SCORE_LABEL} 99999`,
      chipFont,
    );
    turnCounterWidth = Math.round(
      Math.max(turnTemplateWidth, measureTextWidth(ctx, turnText, chipFont)) +
        counterPaddingX * 2,
    );
    scoreCounterWidth = Math.round(
      Math.max(scoreTemplateWidth, measureTextWidth(ctx, scoreText, chipFont)) +
        counterPaddingX * 2,
    );
  } else {
    const tenCharsWidth = measureTextWidth(ctx, '0123456789', chipFont);
    const turnTextWidth = measureTextWidth(ctx, turnText, chipFont);
    // Ensure enough space for at least 10 characters
    turnCounterWidth = Math.max(
      Math.round(tenCharsWidth + paddingX * 2),
      Math.round(turnTextWidth + paddingX * 2),
      80,
    );
    scoreCounterWidth = Math.max(
      Math.round(measureTextWidth(ctx, scoreText, chipFont) + paddingX * 2),
      70,
    );
  }

  // Speedrunner HUD: the live dungeon timer sits left of the score chip,
  // ticking in hundredths of a second.
  const isSpeedrun = state?.speedrunSeed !== undefined;
  const timerText = isSpeedrun
    ? state
      ? formatDuration(getCurrentDungeonTimeMs(state), { hundredths: true })
      : ''
    : '';
  const timerCounterWidth = isSpeedrun
    ? Math.max(
        Math.round(
          measureTextWidth(
            ctx,
            formatDuration(3600000, { hundredths: true }),
            chipFont,
          ) +
            paddingX * 2,
        ),
        80,
      )
    : 0;

  const menuX = margin;
  const debugX = menuX + menuWidth + gap;
  const logX = isDebug ? debugX + debugWidth + gap : menuX + menuWidth + gap;
  const turnX = Math.max(logX, viewWidth - margin - turnCounterWidth);
  const scoreX = Math.max(logX, turnX - gap - scoreCounterWidth);
  const timerX = isSpeedrun
    ? Math.max(logX, scoreX - gap - timerCounterWidth)
    : scoreX;
  const logWidth = Math.max(0, timerX - gap - logX);

  const latestLog = state?.actionLog?.[0];
  const logText = formatLatestLog(latestLog, t);

  const logEntries = state?.actionLog
    ? state.actionLog.slice(0, 8).map((log) => formatLatestLog(log, t))
    : [];
  const logItemHeight = 20;
  const logPaddingY = 6;
  const dropdownHeight =
    logEntries.length > 0
      ? logPaddingY * 2 + logEntries.length * logItemHeight
      : 0;

  const layout: TopBarLayout = {
    topBar: {
      x: margin,
      y: top,
      width: Math.max(0, viewWidth - margin * 2),
      height,
    },
    menuButton: {
      x: menuX,
      y: top,
      width: menuWidth,
      height,
      label: menuLabel,
    },
    logSection: {
      x: logX,
      y: top,
      width: logWidth,
      height,
      text: logText,
    },
    scoreCounter: {
      x: scoreX,
      y: top,
      width: scoreCounterWidth,
      height,
      text: scoreText,
    },
    ...(isSpeedrun
      ? {
          timerCounter: {
            x: timerX,
            y: top,
            width: timerCounterWidth,
            height,
            text: timerText,
          },
        }
      : {}),
    turnCounter: {
      x: turnX,
      y: top,
      width: turnCounterWidth,
      height,
      text: turnText,
    },
    logDropdown: {
      x: logX,
      y: top + height + 4,
      width: logWidth,
      height: dropdownHeight,
      entries: logEntries,
    },
  };

  if (isDebug) {
    layout.debugButton = {
      x: debugX,
      y: top,
      width: debugWidth,
      height,
      label: debugLabel,
    };
  }

  return layout;
};

export const isPointInBounds = (
  x: number,
  y: number,
  bounds: TopBarElementBounds,
): boolean =>
  x >= bounds.x &&
  x <= bounds.x + bounds.width &&
  y >= bounds.y &&
  y <= bounds.y + bounds.height;

export const getTopBarHit = (
  viewWidth: number,
  state: GameState | null | undefined,
  x: number,
  y: number,
  ctx?: CanvasRenderingContext2D | null,
  options?: { isLogOpen?: boolean; debugMode?: boolean },
): TopBarHitElement => {
  const layout = getTopBarLayout(viewWidth, state, ctx, {
    debugMode: options?.debugMode,
  });
  if (isPointInBounds(x, y, layout.menuButton)) return 'menu';
  if (
    layout.debugButton &&
    layout.debugButton.width > 0 &&
    isPointInBounds(x, y, layout.debugButton)
  ) {
    return 'debug';
  }
  if (isPointInBounds(x, y, layout.logSection)) return 'log';
  if (isPointInBounds(x, y, layout.turnCounter)) return 'turn';
  if (
    options?.isLogOpen &&
    layout.logDropdown.height > 0 &&
    isPointInBounds(x, y, layout.logDropdown)
  ) {
    return 'logDropdown';
  }
  return null;
};

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 4,
) => {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.rect(x, y, width, height);
  }
};

export const renderTopBar = (
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  state: GameState | null | undefined,
  options?: RenderTopBarOptions,
) => {
  if (!ctx || viewWidth <= 0) return;

  const theme = options?.env?.theme ?? defaultUiEnv.theme;
  const chipFont = composeFont(
    theme,
    theme.typography.sizes.lg,
    theme.typography.weights.regular,
    theme.typography.families.plain,
  );
  const logFont = composeFont(
    theme,
    theme.typography.sizes.md,
    theme.typography.weights.regular,
    theme.typography.families.mono,
  );

  const layout = getTopBarLayout(viewWidth, state, ctx, {
    debugMode: options?.debugMode,
    env: options?.env,
  });
  const isMenuHovered = options?.isMenuHovered ?? false;
  const isDebugHovered = options?.isDebugHovered ?? false;
  const isLogHovered = options?.isLogHovered ?? false;
  const isLogOpen = options?.isLogOpen ?? false;

  ctx.save();

  // 1. Render Menu Button
  const menu = layout.menuButton;
  if (menu.width > 0) {
    drawRoundedRect(ctx, menu.x, menu.y, menu.width, menu.height, 4);
    ctx.fillStyle = isMenuHovered
      ? theme.palette.surface.itemHover
      : theme.palette.surface.item;
    ctx.fill();
    ctx.strokeStyle = isMenuHovered
      ? theme.palette.border.soft
      : theme.palette.border.subtle;
    ctx.lineWidth = theme.shape.strokeWidth.thin;
    ctx.stroke();

    ctx.fillStyle = theme.palette.text.bright;
    ctx.font = chipFont;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(menu.label, menu.x + menu.width / 2, menu.y + menu.height / 2);
  }

  // 1b. Render Debug Button (if present)
  const debug = layout.debugButton;
  if (debug && debug.width > 0) {
    drawRoundedRect(ctx, debug.x, debug.y, debug.width, debug.height, 4);
    ctx.fillStyle = isDebugHovered
      ? theme.palette.surface.itemHover
      : theme.palette.surface.item;
    ctx.fill();
    ctx.strokeStyle = isDebugHovered
      ? theme.palette.border.soft
      : theme.palette.border.subtle;
    ctx.lineWidth = theme.shape.strokeWidth.thin;
    ctx.stroke();

    ctx.fillStyle = theme.palette.text.bright;
    ctx.font = chipFont;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      debug.label,
      debug.x + debug.width / 2,
      debug.y + debug.height / 2,
    );
  }

  // 2. Render Latest Log Event
  const log = layout.logSection;
  if (log.width > 0) {
    drawRoundedRect(ctx, log.x, log.y, log.width, log.height, 4);
    ctx.fillStyle = isLogOpen
      ? theme.palette.surface.hudLogOpen
      : isLogHovered
      ? theme.palette.surface.hudLogHover
      : theme.palette.surface.hudLog;
    ctx.fill();
    ctx.strokeStyle = isLogOpen
      ? theme.palette.border.hudLogOpen
      : isLogHovered
      ? theme.palette.border.hudLogHover
      : theme.palette.border.hudLog;
    ctx.lineWidth = theme.shape.strokeWidth.thin;
    ctx.stroke();

    if (log.text) {
      const paddingInside = 8;
      const maxTextWidth = log.width - paddingInside * 2;
      const displayText = truncateText(ctx, log.text, maxTextWidth, logFont);

      ctx.save();
      ctx.beginPath();
      ctx.rect(log.x + 2, log.y, log.width - 4, log.height);
      ctx.clip();

      ctx.fillStyle = theme.palette.text.success;
      ctx.font = logFont;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(displayText, log.x + paddingInside, log.y + log.height / 2);
      ctx.restore();
    }
  }

  // 3. Render Score Counter
  const score = layout.scoreCounter;
  if (score.width > 0) {
    drawRoundedRect(ctx, score.x, score.y, score.width, score.height, 4);
    ctx.fillStyle = theme.palette.surface.item;
    ctx.fill();
    ctx.strokeStyle = theme.palette.border.hudScore;
    ctx.lineWidth = theme.shape.strokeWidth.thin;
    ctx.stroke();

    ctx.fillStyle = theme.palette.text.hudScore;
    ctx.font = chipFont;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      score.text,
      score.x + score.width / 2,
      score.y + score.height / 2,
    );
  }

  // 3b. Render Timer Counter (speedrunner mode only)
  const timer = layout.timerCounter;
  if (timer && timer.width > 0) {
    drawRoundedRect(ctx, timer.x, timer.y, timer.width, timer.height, 4);
    ctx.fillStyle = theme.palette.surface.item;
    ctx.fill();
    ctx.strokeStyle = theme.palette.border.hudTimer;
    ctx.lineWidth = theme.shape.strokeWidth.thin;
    ctx.stroke();

    ctx.fillStyle = theme.palette.text.success;
    ctx.font = chipFont;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      timer.text,
      timer.x + timer.width / 2,
      timer.y + timer.height / 2,
    );
  }

  // 4. Render Turn Counter
  const turn = layout.turnCounter;
  if (turn.width > 0) {
    drawRoundedRect(ctx, turn.x, turn.y, turn.width, turn.height, 4);
    ctx.fillStyle = theme.palette.surface.item;
    ctx.fill();
    ctx.strokeStyle = theme.palette.border.subtle;
    ctx.lineWidth = theme.shape.strokeWidth.thin;
    ctx.stroke();

    ctx.fillStyle = theme.palette.text.body;
    ctx.font = chipFont;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(turn.text, turn.x + turn.width / 2, turn.y + turn.height / 2);
  }

  // 5. Render Log Dropdown (if open)
  const dropdown = layout.logDropdown;
  if (isLogOpen && dropdown.width > 0 && dropdown.entries.length > 0) {
    drawRoundedRect(
      ctx,
      dropdown.x,
      dropdown.y,
      dropdown.width,
      dropdown.height,
      4,
    );
    ctx.fillStyle = theme.palette.surface.hudDropdown;
    ctx.fill();
    ctx.strokeStyle = theme.palette.border.hudLog;
    ctx.lineWidth = theme.shape.strokeWidth.thin;
    ctx.stroke();

    const paddingInside = 8;
    const paddingY = 6;
    const itemHeight = 20;
    const maxTextWidth = dropdown.width - paddingInside * 2;

    dropdown.entries.forEach((entry, index) => {
      const itemY = dropdown.y + paddingY + index * itemHeight;
      const text = truncateText(ctx, entry, maxTextWidth, logFont);

      ctx.save();
      ctx.beginPath();
      ctx.rect(dropdown.x + 2, itemY, dropdown.width - 4, itemHeight);
      ctx.clip();

      ctx.fillStyle =
        index === 0
          ? theme.palette.text.success
          : theme.palette.text.hudLogEntry;
      ctx.font = logFont;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, dropdown.x + paddingInside, itemY + itemHeight / 2);
      ctx.restore();
    });
  }

  ctx.restore();
};
