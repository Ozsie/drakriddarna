// modalFrame: the centered-dialog chrome shared by every modal surface —
// the dim scrim over the board, the solid panel with its gold border, and
// the panel header line. Extracted 1:1 from the six modules that drew this
// sequence inline (the parity snapshots stayed byte-identical).

import { drawRoundedRect } from '../primitives/roundedRect';
import type { Rect } from '../primitives/geometry';
import { composeFont } from '../primitives/text';
import type { UiTheme } from '../theme';

/** Corner radius of centered dialog panels. */
export const MODAL_PANEL_RADIUS = 10;
/** Header text offset from the panel's top-left corner. */
export const MODAL_HEADER_OFFSET_X = 18;
export const MODAL_HEADER_OFFSET_Y = 14;

/** Dims the whole view behind a centered dialog. */
export const drawDialogScrim = (
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  viewHeight: number,
  theme: UiTheme,
): void => {
  ctx.fillStyle = theme.palette.overlay.scrimDialog;
  ctx.fillRect(0, 0, viewWidth, viewHeight);
};

/** The solid dialog panel with its accent border. */
export const drawModalFrame = (
  ctx: CanvasRenderingContext2D,
  bounds: Rect,
  theme: UiTheme,
): void => {
  ctx.fillStyle = theme.palette.surface.panelDialog;
  drawRoundedRect(
    ctx,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    MODAL_PANEL_RADIUS,
  );
  ctx.fill();
  ctx.strokeStyle = theme.palette.border.panelDialog;
  ctx.lineWidth = theme.shape.strokeWidth.regular;
  drawRoundedRect(
    ctx,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    MODAL_PANEL_RADIUS,
  );
  ctx.stroke();
};

/** The panel header line: gold, bold, at the top-left of the panel. */
export const drawModalHeader = (
  ctx: CanvasRenderingContext2D,
  bounds: Rect,
  text: string,
  theme: UiTheme,
): void => {
  ctx.fillStyle = theme.palette.text.headerDialog;
  ctx.font = composeFont(
    theme,
    theme.typography.sizes.title,
    theme.typography.weights.bold,
  );
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(
    text,
    bounds.x + MODAL_HEADER_OFFSET_X,
    bounds.y + MODAL_HEADER_OFFSET_Y,
  );
};
