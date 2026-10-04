import type { GameState, LogEvent } from '../types';
import { i18n } from '../core';

export interface TopBarElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TopBarLayout {
  topBar: TopBarElementBounds;
  menuButton: TopBarElementBounds & { label: string };
  logSection: TopBarElementBounds & { text: string };
  turnCounter: TopBarElementBounds & { text: string };
}

export interface RenderTopBarOptions {
  isMenuHovered?: boolean;
}

export type TopBarHitElement = 'menu' | 'log' | 'turn' | null;

const DEFAULT_FONT = '13px sans-serif';
const LOG_FONT = '12px monospace, sans-serif';

export const measureTextWidth = (
  ctx: CanvasRenderingContext2D | null | undefined,
  text: string,
  font: string = DEFAULT_FONT,
): number => {
  if (!text) return 0;
  if (ctx && typeof ctx.measureText === 'function') {
    ctx.save();
    ctx.font = font;
    const width = ctx.measureText(text).width;
    ctx.restore();
    return width;
  }
  // Fallback approximation (avg ~8px per char for monospace/standard)
  return text.length * 8;
};

export const formatLatestLog = (log?: LogEvent | null): string => {
  if (!log) return '';
  const translated = i18n(log.key, log.properties);
  if (log.turn !== undefined && log.turn !== null) {
    return `(${log.turn}) ${translated}`;
  }
  return translated;
};

export const formatTurnCounter = (turnCount?: number | null): string =>
  `Turn ${turnCount ?? 0}`;

export const truncateText = (
  ctx: CanvasRenderingContext2D | null | undefined,
  text: string,
  maxWidth: number,
  font: string = LOG_FONT,
): string => {
  if (!text || maxWidth <= 0) return '';
  const currentWidth = measureTextWidth(ctx, text, font);
  if (currentWidth <= maxWidth) return text;

  const ellipsis = '...';
  const ellipsisWidth = measureTextWidth(ctx, ellipsis, font);
  if (ellipsisWidth >= maxWidth) return '';

  let low = 0;
  let high = text.length;
  let best = '';

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = text.slice(0, mid) + ellipsis;
    if (measureTextWidth(ctx, candidate, font) <= maxWidth) {
      best = candidate;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return best;
};

export const getTopBarLayout = (
  viewWidth: number,
  state?: GameState | null,
  ctx?: CanvasRenderingContext2D | null,
): TopBarLayout => {
  const margin = 8;
  const top = 8;
  const height = 32;
  const gap = 8;
  const paddingX = 12;

  const menuLabel = i18n('content.menu.menuButton') || 'Menu';
  const menuTextWidth = measureTextWidth(ctx, menuLabel, DEFAULT_FONT);
  const menuWidth = Math.max(48, Math.round(menuTextWidth + paddingX * 2));

  const turnText = formatTurnCounter(state?.turnCount);
  const tenCharsWidth = measureTextWidth(ctx, '0123456789', DEFAULT_FONT);
  const turnTextWidth = measureTextWidth(ctx, turnText, DEFAULT_FONT);
  // Ensure enough space for at least 10 characters
  const turnCounterWidth = Math.max(
    Math.round(tenCharsWidth + paddingX * 2),
    Math.round(turnTextWidth + paddingX * 2),
    80,
  );

  const menuX = margin;
  const logX = menuX + menuWidth + gap;
  const turnX = Math.max(logX, viewWidth - margin - turnCounterWidth);
  const logWidth = Math.max(0, turnX - gap - logX);

  const latestLog = state?.actionLog?.[0];
  const logText = formatLatestLog(latestLog);

  return {
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
    turnCounter: {
      x: turnX,
      y: top,
      width: turnCounterWidth,
      height,
      text: turnText,
    },
  };
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
): TopBarHitElement => {
  const layout = getTopBarLayout(viewWidth, state, ctx);
  if (isPointInBounds(x, y, layout.menuButton)) return 'menu';
  if (isPointInBounds(x, y, layout.logSection)) return 'log';
  if (isPointInBounds(x, y, layout.turnCounter)) return 'turn';
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

  const layout = getTopBarLayout(viewWidth, state, ctx);
  const isMenuHovered = options?.isMenuHovered ?? false;

  ctx.save();

  // 1. Render Menu Button
  const menu = layout.menuButton;
  if (menu.width > 0) {
    drawRoundedRect(ctx, menu.x, menu.y, menu.width, menu.height, 4);
    ctx.fillStyle = isMenuHovered
      ? 'rgba(71, 85, 105, 0.95)'
      : 'rgba(37, 41, 50, 0.9)';
    ctx.fill();
    ctx.strokeStyle = isMenuHovered
      ? 'rgba(255, 255, 255, 0.6)'
      : 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = DEFAULT_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(menu.label, menu.x + menu.width / 2, menu.y + menu.height / 2);
  }

  // 2. Render Latest Log Event
  const log = layout.logSection;
  if (log.width > 0) {
    drawRoundedRect(ctx, log.x, log.y, log.width, log.height, 4);
    ctx.fillStyle = 'rgba(20, 40, 29, 0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(30, 71, 50, 0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (log.text) {
      const paddingInside = 8;
      const maxTextWidth = log.width - paddingInside * 2;
      const displayText = truncateText(ctx, log.text, maxTextWidth, LOG_FONT);

      ctx.save();
      ctx.beginPath();
      ctx.rect(log.x + 2, log.y, log.width - 4, log.height);
      ctx.clip();

      ctx.fillStyle = '#86efac';
      ctx.font = LOG_FONT;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(displayText, log.x + paddingInside, log.y + log.height / 2);
      ctx.restore();
    }
  }

  // 3. Render Turn Counter
  const turn = layout.turnCounter;
  if (turn.width > 0) {
    drawRoundedRect(ctx, turn.x, turn.y, turn.width, turn.height, 4);
    ctx.fillStyle = 'rgba(37, 41, 50, 0.9)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = DEFAULT_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(turn.text, turn.x + turn.width / 2, turn.y + turn.height / 2);
  }

  ctx.restore();
};
