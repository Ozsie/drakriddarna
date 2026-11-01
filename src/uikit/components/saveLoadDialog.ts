// Save/load dialog component: the centered full-screen modal for saving
// (name input) and loading (list of saves with campaign/dungeon hints).
// Kit component per the 02 contract — the view model carries the mode,
// title/subtitle, button labels and every save row (ids, labels, hints)
// prebuilt by the game-side adapter; the layout decides how many rows
// fit and asks env.t for the "+N more" overflow line; hits are semantic
// row ids.

import { drawRoundedRect } from '../primitives/roundedRect';
import { isPointInRect, type Rect } from '../primitives/geometry';
import { composeFont } from '../primitives/text';
import {
  drawDialogScrim,
  drawModalFrame,
  drawModalHeader,
} from '../kit/modalFrame';
import { drawButton } from '../kit/button';
import { drawListRow, listRowStyles } from '../kit/listRow';
import type { UiContext, UiEnv } from '../env';
import type { UiTheme } from '../theme';

export type SaveLoadDialogMode = 'save' | 'load';

export interface SaveLoadDialogRowVm {
  /** Hit-test identity: the saved-game item's id. */
  readonly id: string;
  readonly label: string;
  readonly hint?: string;
}

export interface SaveLoadDialogViewModel {
  readonly mode: SaveLoadDialogMode;
  readonly titleText: string;
  readonly subtitleText: string;
  /** Every save row (load mode); the layout slices what fits. */
  readonly rows: readonly SaveLoadDialogRowVm[];
  readonly actionButtonLabel: string;
  readonly secondaryButtonLabel?: string;
}

export interface SaveLoadDialogRowLayout {
  row: SaveLoadDialogRowVm;
  bounds: Rect;
}

export interface SaveLoadDialogLayout {
  hasContent: boolean;
  mode: SaveLoadDialogMode;
  backdropBounds: Rect;
  panelBounds: Rect;
  titleText: string;
  subtitleText: string;
  /** Name input row, shown in save mode. */
  inputBounds?: Rect;
  /** Save rows, shown in load mode. */
  rows: SaveLoadDialogRowLayout[];
  actionButtonBounds?: Rect;
  actionButtonLabel?: string;
  secondaryButtonBounds?: Rect;
  secondaryButtonLabel?: string;
  /** Shown when more saves exist than fit the panel. */
  footerBounds?: Rect;
  footerText: string;
}

/** Semantic hit: which part of the dialog is under the point. */
export type SaveLoadDialogHit =
  | { kind: 'row'; rowId: string }
  | { kind: 'action' }
  | { kind: 'secondary' }
  | { kind: 'input' }
  | { kind: 'panel' }
  | { kind: 'backdrop' }
  | null;

const MAX_SAVE_NAME_WIDTH_FACTOR = 24;

const ROW_HEIGHT = 48;
const ROW_GAP = 8;
const BTN_HEIGHT = 36;

export const emptySaveLoadDialogLayout = (
  mode: SaveLoadDialogMode,
): SaveLoadDialogLayout => ({
  hasContent: false,
  mode,
  backdropBounds: { x: 0, y: 0, width: 0, height: 0 },
  panelBounds: { x: 0, y: 0, width: 0, height: 0 },
  titleText: '',
  subtitleText: '',
  rows: [],
  footerText: '',
});

export const layoutSaveLoadDialog = (
  vm: SaveLoadDialogViewModel | null,
  viewBounds: Rect,
  env: UiEnv,
): SaveLoadDialogLayout => {
  const mode = vm?.mode ?? 'save';
  const { width: viewWidth, height: viewHeight } = viewBounds;
  if (!vm || viewWidth <= 0 || viewHeight <= 0) {
    return emptySaveLoadDialogLayout(mode);
  }

  const marginX = Math.max(12, Math.floor(viewWidth * 0.05));
  const marginY = Math.max(12, Math.floor(viewHeight * 0.05));
  const panelWidth = Math.min(560, Math.max(340, viewWidth - marginX * 2));
  const paddingX = 18;
  const paddingY = 16;
  const contentWidth = panelWidth - paddingX * 2;

  const isSave = vm.mode === 'save';

  const headerHeight = 64;
  const inputHeight = 38;
  const inputGap = 10;
  const buttonGap = 12;

  // Content between the header and the bottom buttons. Panel height adapts
  // to the content but never outgrows the view; when the saves do not all
  // fit, the newest stay visible and a "+N more" footer notes the rest.
  const maxPanelHeight = Math.min(540, viewHeight - marginY * 2);
  const minPanelHeight = Math.min(220, maxPanelHeight);
  const maxContentHeight =
    maxPanelHeight - paddingY * 2 - headerHeight - BTN_HEIGHT - buttonGap;

  let rowCount = 0;
  let footerText = '';
  if (!isSave) {
    rowCount = Math.max(
      0,
      Math.floor((maxContentHeight + ROW_GAP) / (ROW_HEIGHT + ROW_GAP)),
    );
    if (vm.rows.length > rowCount) {
      // Reserve the footer line for the overflow note, but always keep at
      // least one row visible.
      while (
        rowCount > 1 &&
        rowCount * (ROW_HEIGHT + ROW_GAP) + 20 > maxContentHeight
      ) {
        rowCount -= 1;
      }
      footerText = env.t('content.menu.loadGame.moreSaves', {
        count: String(vm.rows.length - rowCount),
      });
    } else {
      rowCount = vm.rows.length;
    }
  }
  const hasFooter = footerText !== '';
  const contentHeight = isSave
    ? inputHeight + inputGap
    : rowCount * (ROW_HEIGHT + ROW_GAP) + (hasFooter ? 20 : 0);
  const panelHeight = Math.max(
    minPanelHeight,
    Math.min(
      maxPanelHeight,
      paddingY * 2 + headerHeight + contentHeight + BTN_HEIGHT + buttonGap,
    ),
  );
  const panelX = Math.floor((viewWidth - panelWidth) / 2);
  const panelY = Math.floor((viewHeight - panelHeight) / 2);

  const btnY = panelY + panelHeight - paddingY - BTN_HEIGHT;
  const contentTop = panelY + paddingY + headerHeight;

  let inputBounds: Rect | undefined;
  if (isSave) {
    inputBounds = {
      x: panelX + paddingX,
      y: contentTop,
      width: contentWidth,
      height: inputHeight,
    };
  }

  const rows: SaveLoadDialogRowLayout[] = [];
  let rowY = contentTop;
  for (let index = 0; index < rowCount; index += 1) {
    const row = vm.rows[index];
    rows.push({
      row,
      bounds: {
        x: panelX + paddingX,
        y: rowY,
        width: contentWidth,
        height: ROW_HEIGHT,
      },
    });
    rowY += ROW_HEIGHT + ROW_GAP;
  }

  let footerBounds: Rect | undefined;
  if (hasFooter) {
    footerBounds = {
      x: panelX + paddingX,
      y: rowY - ROW_GAP + 4,
      width: contentWidth,
      height: 16,
    };
  }

  // Bottom buttons, between-dungeons style: the primary action sits
  // bottom-right, the dismissive one bottom-left (load mode keeps its
  // single dismiss button at the action position).
  let actionButtonBounds: Rect | undefined;
  let secondaryButtonBounds: Rect | undefined;

  if (isSave) {
    const actionWidth = 140;
    actionButtonBounds = {
      x: panelX + panelWidth - paddingX - actionWidth,
      y: btnY,
      width: actionWidth,
      height: BTN_HEIGHT,
    };
    const secondaryWidth = 100;
    secondaryButtonBounds = {
      x: panelX + paddingX,
      y: btnY,
      width: secondaryWidth,
      height: BTN_HEIGHT,
    };
  } else {
    const backWidth = 100;
    actionButtonBounds = {
      x: panelX + panelWidth - paddingX - backWidth,
      y: btnY,
      width: backWidth,
      height: BTN_HEIGHT,
    };
  }

  return {
    hasContent: true,
    mode: vm.mode,
    backdropBounds: { x: 0, y: 0, width: viewWidth, height: viewHeight },
    panelBounds: {
      x: panelX,
      y: panelY,
      width: panelWidth,
      height: panelHeight,
    },
    titleText: vm.titleText,
    subtitleText: vm.subtitleText,
    inputBounds,
    rows,
    actionButtonBounds,
    actionButtonLabel: vm.actionButtonLabel,
    secondaryButtonBounds,
    secondaryButtonLabel: vm.secondaryButtonLabel,
    footerBounds,
    footerText,
  };
};

export const hitTestSaveLoadDialog = (
  layout: SaveLoadDialogLayout,
  point: { x: number; y: number },
): SaveLoadDialogHit => {
  if (!layout.hasContent) return null;

  for (const row of layout.rows) {
    if (isPointInRect(point.x, point.y, row.bounds)) {
      return { kind: 'row', rowId: row.row.id };
    }
  }
  if (
    layout.actionButtonBounds &&
    isPointInRect(point.x, point.y, layout.actionButtonBounds)
  ) {
    return { kind: 'action' };
  }
  if (
    layout.secondaryButtonBounds &&
    isPointInRect(point.x, point.y, layout.secondaryButtonBounds)
  ) {
    return { kind: 'secondary' };
  }
  if (
    layout.inputBounds &&
    isPointInRect(point.x, point.y, layout.inputBounds)
  ) {
    return { kind: 'input' };
  }
  if (isPointInRect(point.x, point.y, layout.panelBounds)) {
    return { kind: 'panel' };
  }
  return { kind: 'backdrop' };
};

export interface RenderSaveLoadDialogOptions {
  /** The name being typed, shown in the save input. */
  readonly saveName?: string;
  readonly hoveredRowId?: string | null;
  readonly hoveredAction?: boolean;
  readonly hoveredSecondary?: boolean;
}

// Trims the text with an ellipsis until it fits maxWidth (measured
// against the live context).
const fitTextToWidth = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string => {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let trimmed = text;
  while (
    trimmed.length > 1 &&
    ctx.measureText(`${trimmed}...`).width > maxWidth
  ) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}...`;
};

export const renderSaveLoadDialog = (
  layout: SaveLoadDialogLayout,
  ui: UiContext,
  options?: RenderSaveLoadDialogOptions,
): void => {
  const { ctx } = ui;
  const theme: UiTheme = ui.theme;
  if (!ctx || !layout.hasContent) return;

  const viewBounds = layout.backdropBounds;

  ctx.save();

  // Dark backdrop, same veil the between-dungeons dialog uses.
  drawDialogScrim(ctx, viewBounds.width, viewBounds.height, theme);

  // Centered modal panel
  const p = layout.panelBounds;
  drawModalFrame(ctx, p, theme);

  // Title + subtitle
  drawModalHeader(ctx, p, layout.titleText, theme);

  ctx.fillStyle = theme.palette.text.secondary;
  ctx.font = composeFont(theme, theme.typography.sizes.lg);
  ctx.fillText(layout.subtitleText, p.x + 18, p.y + 38);

  // Name input (save mode). Deliberately not the kit text input: the
  // displayed name is clipped to the field between the box and the label
  // draw, an ordering the primitive does not own. The input is focused
  // whenever shown.
  if (layout.inputBounds) {
    const input = layout.inputBounds;
    ctx.fillStyle = theme.palette.surface.input;
    drawRoundedRect(ctx, input.x, input.y, input.width, input.height, 4);
    ctx.fill();
    ctx.strokeStyle = theme.palette.border.inputFocus;
    ctx.lineWidth = theme.shape.strokeWidth.medium;
    drawRoundedRect(ctx, input.x, input.y, input.width, input.height, 4);
    ctx.stroke();

    const text = fitTextToWidth(ctx, options?.saveName ?? '', input.width - 20);
    ctx.font = composeFont(theme, theme.typography.sizes.xl);
    ctx.fillStyle = theme.palette.text.strong;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, input.x + 10, input.y + input.height / 2);

    // Static caret after the text; the input is focused whenever shown.
    ctx.fillRect(
      input.x + 10 + ctx.measureText(text).width + 2,
      input.y + input.height / 2 - 9,
      1,
      18,
    );
  }

  // Save rows (load mode)
  for (const row of layout.rows) {
    const rb = row.bounds;
    const isHovered = options?.hoveredRowId === row.row.id;
    drawListRow(ctx, rb, listRowStyles(theme, isHovered ? 'hover' : 'rest'));

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = composeFont(
      theme,
      theme.typography.sizes.lg,
      theme.typography.weights.bold,
    );
    ctx.fillStyle = isHovered
      ? theme.palette.text.bright
      : theme.palette.text.dialogValue;
    ctx.fillText(
      fitTextToWidth(ctx, row.row.label, rb.width - MAX_SAVE_NAME_WIDTH_FACTOR),
      rb.x + 12,
      rb.y + 16,
    );

    if (row.row.hint) {
      ctx.font = composeFont(theme, theme.typography.sizes.sm);
      ctx.fillStyle = isHovered
        ? theme.palette.text.secondary
        : theme.palette.text.muted;
      ctx.fillText(
        fitTextToWidth(
          ctx,
          row.row.hint,
          rb.width - MAX_SAVE_NAME_WIDTH_FACTOR,
        ),
        rb.x + 12,
        rb.y + 34,
      );
    }
  }

  if (layout.footerBounds && layout.footerText) {
    ctx.font = composeFont(theme, theme.typography.sizes.sm);
    ctx.fillStyle = theme.palette.text.muted;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      layout.footerText,
      layout.footerBounds.x,
      layout.footerBounds.y + layout.footerBounds.height / 2,
    );
  }

  // Secondary button (Cancel)
  if (layout.secondaryButtonBounds && layout.secondaryButtonLabel) {
    drawButton(
      ctx,
      layout.secondaryButtonBounds,
      layout.secondaryButtonLabel,
      theme,
      { variant: 'secondary', hovered: Boolean(options?.hoveredSecondary) },
    );
  }

  // Action button (Save / Back). Deliberately not the kit button: in load
  // mode it is a hybrid - secondary surfaces, primary stroke weight and a
  // bright label - and the parity snapshot pins that.
  if (layout.actionButtonBounds && layout.actionButtonLabel) {
    const ab = layout.actionButtonBounds;
    const isHovered = Boolean(options?.hoveredAction);
    const isSave = layout.mode === 'save';
    ctx.fillStyle = isHovered
      ? isSave
        ? theme.palette.surface.buttonPrimaryHover
        : theme.palette.surface.buttonSecondaryHover
      : isSave
      ? theme.palette.surface.buttonPrimary
      : theme.palette.surface.buttonSecondary;
    drawRoundedRect(ctx, ab.x, ab.y, ab.width, ab.height, 6);
    ctx.fill();

    ctx.strokeStyle = isSave
      ? theme.palette.border.buttonPrimary
      : theme.palette.border.buttonSecondary;
    ctx.lineWidth = theme.shape.strokeWidth.medium;
    drawRoundedRect(ctx, ab.x, ab.y, ab.width, ab.height, 6);
    ctx.stroke();

    ctx.fillStyle = theme.palette.text.bright;
    ctx.font = composeFont(
      theme,
      theme.typography.sizes.xl,
      theme.typography.weights.bold,
    );
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      layout.actionButtonLabel,
      ab.x + ab.width / 2,
      ab.y + ab.height / 2,
    );
  }

  ctx.restore();
};
