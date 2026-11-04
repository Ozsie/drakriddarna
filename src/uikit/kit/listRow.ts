// listRow: the fill/border shell of a selectable list row, shared by the
// dialogs' rows (save slots, campaign/game-master columns, hero rows,
// settings rows). The row's *label* stays with the caller — fonts and
// anchors differ per surface; the box is the part every module drew
// identically. Extracted 1:1 (parity snapshots stayed byte-identical).

import type { Rect, UiTheme } from '@hoard-engine/primitives';
import { drawRoundedRect } from '@hoard-engine/primitives';

/** Interaction state of a row; maps to the row* theme tokens. */
export type ListRowState = 'rest' | 'hover' | 'selected';

/** The fill, border and stroke width a row shell draws with. */
export interface ListRowStyles {
  readonly fill: string;
  readonly border: string;
  readonly lineWidth: number;
}

/** Standard row styling; selected rows get the heavier border. */
export const listRowStyles = (
  theme: UiTheme,
  state: ListRowState,
): ListRowStyles => ({
  fill:
    state === 'selected'
      ? theme.palette.surface.rowSelected
      : state === 'hover'
        ? theme.palette.surface.rowHover
        : theme.palette.surface.row,
  border:
    state === 'selected'
      ? theme.palette.border.rowSelected
      : state === 'hover'
        ? theme.palette.border.rowHover
        : theme.palette.border.row,
  lineWidth:
    state === 'selected'
      ? theme.shape.strokeWidth.medium
      : theme.shape.strokeWidth.thin,
});

/** Corner radius of dialog list rows. */
export const LIST_ROW_RADIUS = 6;

/** Draws one row shell; pass custom styles for non-standard surfaces. */
export const drawListRow = (
  ctx: CanvasRenderingContext2D,
  bounds: Rect,
  styles: ListRowStyles,
  radius: number = LIST_ROW_RADIUS,
): void => {
  ctx.fillStyle = styles.fill;
  drawRoundedRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, radius);
  ctx.fill();
  ctx.strokeStyle = styles.border;
  ctx.lineWidth = styles.lineWidth;
  drawRoundedRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, radius);
  ctx.stroke();
};

/** The row state for a hovered/selected pair, as every caller computes it. */
export const rowState = (
  isSelected: boolean,
  isHovered: boolean,
): ListRowState => (isSelected ? 'selected' : isHovered ? 'hover' : 'rest');
