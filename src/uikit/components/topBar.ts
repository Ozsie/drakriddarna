// The top status bar component: menu button, latest log chip, score /
// timer / turn chips and the open log dropdown. Kit component per the
// 02 contract: the view model carries the texts (labels prebuilt by the
// game-side adapter), layout is canvas-free (it measures through
// `env.measure`), hit testing consumes the same layout, and rendering
// consumes layout + view model + context.

import { roundRectPath } from '../primitives/roundedRect';
import { isPointInRect, type Rect } from '../primitives/geometry';
import { composeFont, truncateText } from '../primitives/text';
import type { UiContext, UiEnv } from '../env';

export interface TopBarViewModel {
  readonly menuLabel: string;
  readonly debugLabel: string;
  /** Whether the debug chip is shown. */
  readonly showDebug: boolean;
  readonly turnText: string;
  readonly scoreText: string;
  /** Speedrunner mode: the live timer chip is shown. */
  readonly isSpeedrun: boolean;
  /** Live dungeon timer text; '' when the timer has not started. */
  readonly timerText: string;
  /** Fixed text the timer chip reserves width for. */
  readonly timerTemplateText: string;
  /** Counter width reservations in compact mode; '' in regular mode. */
  readonly turnTemplateText: string;
  readonly scoreTemplateText: string;
  readonly logText: string;
  readonly logEntries: readonly string[];
}

export interface TopBarElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TopBarLayout {
  topBar: TopBarElementBounds;
  menuButton: TopBarElementBounds;
  debugButton?: TopBarElementBounds;
  logSection: TopBarElementBounds;
  scoreCounter: TopBarElementBounds;
  /** Live dungeon timer chip; present only in speedrunner mode. */
  timerCounter?: TopBarElementBounds;
  turnCounter: TopBarElementBounds;
  logDropdown: TopBarElementBounds;
}

export type TopBarHitElement =
  | 'menu'
  | 'debug'
  | 'log'
  | 'turn'
  | 'logDropdown'
  | null;

export interface TopBarLayoutOptions {
  /** Overrides the view model's debug chip visibility decision. */
  readonly debugMode?: boolean;
}

/** Chip font shared by every top bar element. */
const chipFont = (env: UiEnv): string =>
  composeFont(
    env.theme,
    env.theme.typography.sizes.lg,
    env.theme.typography.weights.regular,
    env.theme.typography.families.plain,
  );

// On narrow screens the counters shrink to an emoji plus the number, so
// each chip only needs room for the icon plus its digits.
const TURN_COUNTER_FALLBACK_WIDTH = 80;
const SCORE_COUNTER_FALLBACK_WIDTH = 70;

export const layoutTopBar = (
  vm: TopBarViewModel,
  viewBounds: Rect,
  env: UiEnv,
  options?: TopBarLayoutOptions,
): TopBarLayout => {
  const font = chipFont(env);
  const measure = (text: string, withFont: string): number =>
    env.measure.width(text, withFont);
  const viewWidth = viewBounds.width;

  const margin = 8;
  const top = 8;
  const height = 32;
  const gap = 8;
  const paddingX = 12;

  const showDebug =
    options?.debugMode !== undefined ? options.debugMode : vm.showDebug;

  const menuTextWidth = measure(vm.menuLabel, font);
  const menuWidth = Math.max(48, Math.round(menuTextWidth + paddingX * 2));

  const debugTextWidth = measure(vm.debugLabel, font);
  const debugWidth = showDebug
    ? Math.max(48, Math.round(debugTextWidth + paddingX * 2))
    : 0;

  const compact = env.mode === 'compact';
  const counterPaddingX = compact ? 6 : paddingX;

  let turnCounterWidth: number;
  let scoreCounterWidth: number;
  if (compact) {
    // The view model's template texts reserve room for the icon plus two
    // round digits / five score digits, so the chips do not resize
    // whenever the numbers tick up.
    const turnTemplateWidth = measure(vm.turnTemplateText, font);
    const scoreTemplateWidth = measure(vm.scoreTemplateText, font);
    turnCounterWidth = Math.round(
      Math.max(turnTemplateWidth, measure(vm.turnText, font)) +
        counterPaddingX * 2,
    );
    scoreCounterWidth = Math.round(
      Math.max(scoreTemplateWidth, measure(vm.scoreText, font)) +
        counterPaddingX * 2,
    );
  } else {
    const tenCharsWidth = measure('0123456789', font);
    const turnTextWidth = measure(vm.turnText, font);
    // Ensure enough space for at least 10 characters
    turnCounterWidth = Math.max(
      Math.round(tenCharsWidth + paddingX * 2),
      Math.round(turnTextWidth + paddingX * 2),
      TURN_COUNTER_FALLBACK_WIDTH,
    );
    scoreCounterWidth = Math.max(
      Math.round(measure(vm.scoreText, font) + paddingX * 2),
      SCORE_COUNTER_FALLBACK_WIDTH,
    );
  }

  // Speedrunner HUD: the live dungeon timer sits left of the score chip.
  const isSpeedrun = vm.isSpeedrun;
  const timerCounterWidth = isSpeedrun
    ? Math.max(
        Math.round(measure(vm.timerTemplateText, font) + paddingX * 2),
        80,
      )
    : 0;

  const menuX = margin;
  const debugX = menuX + menuWidth + gap;
  const logX = showDebug ? debugX + debugWidth + gap : menuX + menuWidth + gap;
  const turnX = Math.max(logX, viewWidth - margin - turnCounterWidth);
  const scoreX = Math.max(logX, turnX - gap - scoreCounterWidth);
  const timerX = isSpeedrun
    ? Math.max(logX, scoreX - gap - timerCounterWidth)
    : scoreX;
  const logWidth = Math.max(0, timerX - gap - logX);

  const logItemHeight = 20;
  const logPaddingY = 6;
  const dropdownHeight =
    vm.logEntries.length > 0
      ? logPaddingY * 2 + vm.logEntries.length * logItemHeight
      : 0;

  const layout: TopBarLayout = {
    topBar: {
      x: margin,
      y: top,
      width: Math.max(0, viewWidth - margin * 2),
      height,
    },
    menuButton: { x: menuX, y: top, width: menuWidth, height },
    ...(showDebug
      ? {
          debugButton: {
            x: debugX,
            y: top,
            width: debugWidth,
            height,
          },
        }
      : {}),
    logSection: { x: logX, y: top, width: logWidth, height },
    scoreCounter: { x: scoreX, y: top, width: scoreCounterWidth, height },
    ...(isSpeedrun
      ? {
          timerCounter: {
            x: timerX,
            y: top,
            width: timerCounterWidth,
            height,
          },
        }
      : {}),
    turnCounter: { x: turnX, y: top, width: turnCounterWidth, height },
    logDropdown: {
      x: logX,
      y: top + height + 4,
      width: logWidth,
      height: dropdownHeight,
    },
  };

  return layout;
};

export const hitTestTopBar = (
  layout: TopBarLayout,
  point: { x: number; y: number },
  isLogOpen = false,
): TopBarHitElement => {
  if (isPointInRect(point.x, point.y, layout.menuButton)) return 'menu';
  if (
    layout.debugButton &&
    layout.debugButton.width > 0 &&
    isPointInRect(point.x, point.y, layout.debugButton)
  ) {
    return 'debug';
  }
  if (isPointInRect(point.x, point.y, layout.logSection)) return 'log';
  if (isPointInRect(point.x, point.y, layout.turnCounter)) return 'turn';
  if (
    isLogOpen &&
    layout.logDropdown.height > 0 &&
    isPointInRect(point.x, point.y, layout.logDropdown)
  ) {
    return 'logDropdown';
  }
  return null;
};

export interface RenderTopBarOptions {
  isMenuHovered?: boolean;
  isDebugHovered?: boolean;
  isLogHovered?: boolean;
  isLogOpen?: boolean;
}

export const renderTopBar = (
  layout: TopBarLayout,
  vm: TopBarViewModel,
  ui: UiContext,
  options?: RenderTopBarOptions,
): void => {
  const { ctx } = ui;
  const theme = ui.theme;
  if (!ctx || layout.topBar.width <= 0) return;

  const isMenuHovered = options?.isMenuHovered ?? false;
  const isDebugHovered = options?.isDebugHovered ?? false;
  const isLogHovered = options?.isLogHovered ?? false;
  const isLogOpen = options?.isLogOpen ?? false;

  const chipFontValue = chipFont(ui);
  const logFont = composeFont(
    theme,
    theme.typography.sizes.md,
    theme.typography.weights.regular,
    theme.typography.families.mono,
  );

  ctx.save();

  // 1. Menu Button
  const menu = layout.menuButton;
  if (menu.width > 0) {
    roundRectPath(ctx, menu.x, menu.y, menu.width, menu.height, 4);
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
    ctx.font = chipFontValue;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      vm.menuLabel,
      menu.x + menu.width / 2,
      menu.y + menu.height / 2,
    );
  }

  // 1b. Debug Button (if present)
  const debug = layout.debugButton;
  if (debug && debug.width > 0) {
    roundRectPath(ctx, debug.x, debug.y, debug.width, debug.height, 4);
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
    ctx.font = chipFontValue;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      vm.debugLabel,
      debug.x + debug.width / 2,
      debug.y + debug.height / 2,
    );
  }

  // 2. Latest Log Event
  const log = layout.logSection;
  if (log.width > 0) {
    roundRectPath(ctx, log.x, log.y, log.width, log.height, 4);
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

    if (vm.logText) {
      const paddingInside = 8;
      const maxTextWidth = log.width - paddingInside * 2;
      const displayText = truncateText(
        ctx,
        vm.logText,
        maxTextWidth,
        logFont,
        8,
      );

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

  // 3. Score Counter
  const score = layout.scoreCounter;
  if (score.width > 0) {
    roundRectPath(ctx, score.x, score.y, score.width, score.height, 4);
    ctx.fillStyle = theme.palette.surface.item;
    ctx.fill();
    ctx.strokeStyle = theme.palette.border.hudScore;
    ctx.lineWidth = theme.shape.strokeWidth.thin;
    ctx.stroke();

    ctx.fillStyle = theme.palette.text.hudScore;
    ctx.font = chipFontValue;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      vm.scoreText,
      score.x + score.width / 2,
      score.y + score.height / 2,
    );
  }

  // 3b. Timer Counter (speedrunner mode only)
  const timer = layout.timerCounter;
  if (timer && timer.width > 0) {
    roundRectPath(ctx, timer.x, timer.y, timer.width, timer.height, 4);
    ctx.fillStyle = theme.palette.surface.item;
    ctx.fill();
    ctx.strokeStyle = theme.palette.border.hudTimer;
    ctx.lineWidth = theme.shape.strokeWidth.thin;
    ctx.stroke();

    ctx.fillStyle = theme.palette.text.success;
    ctx.font = chipFontValue;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      vm.timerText,
      timer.x + timer.width / 2,
      timer.y + timer.height / 2,
    );
  }

  // 4. Turn Counter
  const turn = layout.turnCounter;
  if (turn.width > 0) {
    roundRectPath(ctx, turn.x, turn.y, turn.width, turn.height, 4);
    ctx.fillStyle = theme.palette.surface.item;
    ctx.fill();
    ctx.strokeStyle = theme.palette.border.subtle;
    ctx.lineWidth = theme.shape.strokeWidth.thin;
    ctx.stroke();

    ctx.fillStyle = theme.palette.text.body;
    ctx.font = chipFontValue;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      vm.turnText,
      turn.x + turn.width / 2,
      turn.y + turn.height / 2,
    );
  }

  // 5. Log Dropdown (if open)
  const dropdown = layout.logDropdown;
  if (isLogOpen && dropdown.width > 0 && vm.logEntries.length > 0) {
    roundRectPath(
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

    vm.logEntries.forEach((entry, index) => {
      const itemY = dropdown.y + paddingY + index * itemHeight;
      const text = truncateText(ctx, entry, maxTextWidth, logFont, 8);

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
