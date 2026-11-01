// button: the primary/secondary push buttons shared by the dialogs —
// fill, border and centered bold label, with hover states. Extracted 1:1
// from the five modules that drew this sequence inline (the parity
// snapshots stayed byte-identical).

import { drawRoundedRect } from '../primitives/roundedRect';
import type { Rect } from '../primitives/geometry';
import { composeFont } from '../primitives/text';
import type { UiTheme } from '../theme';

/** Accent call-to-action vs neutral secondary. */
export type ButtonVariant = 'primary' | 'secondary';

/** Corner radius of dialog buttons. */
export const BUTTON_RADIUS = 6;

export interface DrawButtonOptions {
  readonly variant: ButtonVariant;
  readonly hovered?: boolean;
  /**
   * Stroke width override for hybrid buttons (e.g. a secondary-styled
   * button carrying the primary weight); defaults to the variant's.
   */
  readonly lineWidth?: number;
}

export const drawButton = (
  ctx: CanvasRenderingContext2D,
  bounds: Rect,
  label: string,
  theme: UiTheme,
  options: DrawButtonOptions,
): void => {
  const hovered = options.hovered ?? false;
  const isPrimary = options.variant === 'primary';
  const fill = isPrimary
    ? hovered
      ? theme.palette.surface.buttonPrimaryHover
      : theme.palette.surface.buttonPrimary
    : hovered
    ? theme.palette.surface.buttonSecondaryHover
    : theme.palette.surface.buttonSecondary;
  const lineWidth =
    options.lineWidth ??
    (isPrimary ? theme.shape.strokeWidth.medium : theme.shape.strokeWidth.thin);

  ctx.fillStyle = fill;
  drawRoundedRect(
    ctx,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    BUTTON_RADIUS,
  );
  ctx.fill();
  ctx.strokeStyle = isPrimary
    ? theme.palette.border.buttonPrimary
    : theme.palette.border.buttonSecondary;
  ctx.lineWidth = lineWidth;
  drawRoundedRect(
    ctx,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    BUTTON_RADIUS,
  );
  ctx.stroke();

  ctx.fillStyle = isPrimary
    ? theme.palette.text.bright
    : theme.palette.text.body;
  ctx.font = composeFont(
    theme,
    theme.typography.sizes.xl,
    theme.typography.weights.bold,
  );
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    label,
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
};
