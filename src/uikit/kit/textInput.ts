// textInput: the canvas text field shared by the save-name input, the
// hero rename input and the speedrun seed input — box, value and the
// static caret after the measured text — plus the pure edit reducer that
// turns keystrokes into values. Extracted 1:1 (the parity snapshots
// stayed byte-identical).

import type { Rect, UiTheme } from '@hoard-engine/primitives';
import { drawRoundedRect, composeFont } from '@hoard-engine/primitives';

/** Corner radius of text inputs. */
export const TEXT_INPUT_RADIUS = 4;
/** Text inset from the input's left edge. */
export const TEXT_INPUT_INSET = 10;

export interface DrawTextInputOptions {
  /** Draws the focus border and the caret; defaults to true. */
  readonly focused?: boolean;
  /** Value text color; defaults to the theme's strong text. */
  readonly textColor?: string;
}

export const drawTextInput = (
  ctx: CanvasRenderingContext2D,
  bounds: Rect,
  value: string,
  theme: UiTheme,
  options: DrawTextInputOptions = {},
): void => {
  const focused = options.focused ?? true;
  const centerY = bounds.y + bounds.height / 2;

  ctx.fillStyle = theme.palette.surface.input;
  drawRoundedRect(
    ctx,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    TEXT_INPUT_RADIUS,
  );
  ctx.fill();
  ctx.strokeStyle = focused
    ? theme.palette.border.inputFocus
    : theme.palette.border.input;
  ctx.lineWidth = focused
    ? theme.shape.strokeWidth.medium
    : theme.shape.strokeWidth.thin;
  drawRoundedRect(
    ctx,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    TEXT_INPUT_RADIUS,
  );
  ctx.stroke();

  ctx.font = composeFont(theme, theme.typography.sizes.xl);
  ctx.fillStyle = options.textColor ?? theme.palette.text.strong;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(value, bounds.x + TEXT_INPUT_INSET, centerY);

  if (focused) {
    // Static caret after the measured text.
    ctx.fillRect(
      bounds.x + TEXT_INPUT_INSET + ctx.measureText(value).width + 2,
      centerY - 9,
      1,
      18,
    );
  }
};

/** Length-clamps a value (player-typed text is never corrected). */
export const clampTextInput = (value: string, maxLength: number): string =>
  value.slice(0, maxLength);

/**
 * Applies one keystroke: Backspace erases the last character, a printable
 * character appends (length-clamped), anything else is a no-op.
 */
export const applyTextInputKey = (
  value: string,
  key: string,
  maxLength: number,
): string =>
  key === 'Backspace'
    ? value.slice(0, -1)
    : key.length === 1
      ? clampTextInput(value + key, maxLength)
      : value;
