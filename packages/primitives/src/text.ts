// Text primitives: measuring, ellipsized truncation, wrapping and font
// composition. All of them are deterministic given a context (or the
// per-character fallback when no context is available), so consumers
// can pin and replay exact layout output.

import type { UiTheme } from './theme';

/**
 * Composes a canvas font string from theme tokens:
 * `font(theme, sizes.sm, weights.bold)` → `'bold 11px Arial, Helvetica, sans-serif'`.
 */
/** The per-character width approximation the card and panel components
 * have always used when no context or measure is available. */
export const PER_CHAR_WIDTH_FALLBACK = 6.5;

export const composeFont = (
  theme: UiTheme,
  size: number,
  weight: string = theme.typography.weights.regular,
  family: string = theme.typography.families.ui,
): string => `${weight}${size}px ${family}`;

export const measureTextWidth = (
  ctx: CanvasRenderingContext2D | null | undefined,
  text: string,
  font: string,
  fallbackPerChar: number,
): number => {
  if (!text) return 0;
  if (ctx && typeof ctx.measureText === 'function') {
    ctx.save();
    ctx.font = font;
    const width = ctx.measureText(text).width;
    ctx.restore();
    return width;
  }
  return text.length * fallbackPerChar;
};

export const truncateText = (
  ctx: CanvasRenderingContext2D | null | undefined,
  text: string,
  maxWidth: number,
  font: string,
  fallbackPerChar: number,
): string => {
  if (!text || maxWidth <= 0) return '';
  const currentWidth = measureTextWidth(ctx, text, font, fallbackPerChar);
  if (currentWidth <= maxWidth) return text;

  const ellipsis = '...';
  const ellipsisWidth = measureTextWidth(ctx, ellipsis, font, fallbackPerChar);
  if (ellipsisWidth >= maxWidth) return '';

  let low = 0;
  let high = text.length;
  let best = '';

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = text.slice(0, mid) + ellipsis;
    if (measureTextWidth(ctx, candidate, font, fallbackPerChar) <= maxWidth) {
      best = candidate;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return best;
};

export const wrapText = (
  ctx: CanvasRenderingContext2D | null | undefined,
  text: string,
  maxWidth: number,
  font: string,
  fallbackPerChar: number,
): string[] => {
  if (!text || maxWidth <= 0) return [];
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    const width = measureTextWidth(ctx, candidate, font, fallbackPerChar);
    if (width <= maxWidth) {
      currentLine = candidate;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines.length > 0 ? lines : [text];
};

/**
 * Canvas-free variant of `wrapText` for kit layouts: the same greedy
 * word-wrap, measuring through a `TextMeasure` (env.measure) instead of a
 * context, so layout stays pure and replayable.
 */
export const wrapTextMeasured = (
  measure: { width: (text: string, font: string) => number },
  text: string,
  maxWidth: number,
  font: string,
): string[] => {
  if (!text || maxWidth <= 0) return [];
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    const width = measure.width(candidate, font);
    if (width <= maxWidth) {
      currentLine = candidate;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines.length > 0 ? lines : [text];
};
