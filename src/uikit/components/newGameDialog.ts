// New-game dialog component: the centered full-screen modal for starting
// a new game — two selectable columns (campaigns, game masters), a
// speedrunner-mode checkbox and, when ticked, the rng seed input. Kit
// component per the 02 contract — the view model carries every label and
// row prebuilt by the game-side adapter; selection and speedrun state are
// layout options; hits are semantic ids.

import { drawRoundedRect } from '../primitives/roundedRect';
import { isPointInRect, type Rect } from '../primitives/geometry';
import { composeFont } from '../primitives/text';
import {
  drawDialogScrim,
  drawModalFrame,
  drawModalHeader,
} from '../kit/modalFrame';
import { drawButton } from '../kit/button';
import { drawListRow, listRowStyles, rowState } from '../kit/listRow';
import { drawTextInput } from '../kit/textInput';
import type { UiContext } from '../env';
import type { UiTheme } from '../theme';

export interface NewGameDialogRowVm {
  /** Hit-test identity: the campaign or game-master id. */
  readonly id: string;
  readonly label: string;
}

export interface NewGameDialogViewModel {
  readonly titleText: string;
  readonly campaignHeaderText: string;
  readonly gameMasterHeaderText: string;
  readonly campaignRows: readonly NewGameDialogRowVm[];
  readonly gameMasterRows: readonly NewGameDialogRowVm[];
  readonly checkboxLabelText: string;
  readonly seedLabelText: string;
  readonly actionButtonLabel: string;
  readonly secondaryButtonLabel: string;
}

export interface NewGameDialogRowLayout {
  id: string;
  label: string;
  bounds: Rect;
  selected: boolean;
}

export interface NewGameDialogLayout {
  hasContent: boolean;
  backdropBounds: Rect;
  panelBounds: Rect;
  titleText: string;
  campaignHeaderText: string;
  gameMasterHeaderText: string;
  campaignRows: NewGameDialogRowLayout[];
  gameMasterRows: NewGameDialogRowLayout[];
  checkboxBounds: Rect;
  checkboxLabelText: string;
  speedrunMode: boolean;
  /** Seed label + input, shown only in speedrunner mode. */
  seedLabelText?: string;
  seedInputBounds?: Rect;
  actionButtonBounds: Rect;
  actionButtonLabel: string;
  secondaryButtonBounds: Rect;
  secondaryButtonLabel: string;
}

/** Semantic hit: which part of the dialog is under the point. */
export type NewGameDialogHit =
  | { kind: 'campaign'; id: string }
  | { kind: 'gameMaster'; id: string }
  | { kind: 'checkbox' }
  | { kind: 'seedInput' }
  | { kind: 'action' }
  | { kind: 'secondary' }
  | { kind: 'panel' }
  | { kind: 'backdrop' }
  | null;

export interface NewGameDialogLayoutOptions {
  selectedCampaignId?: string;
  selectedGameMasterId?: string;
  speedrunMode?: boolean;
}

const ROW_HEIGHT = 36;
const ROW_GAP = 6;
const BTN_HEIGHT = 36;
const CHECKBOX_SIZE = 20;
const SEED_INPUT_WIDTH = 140;
const SEED_INPUT_HEIGHT = 30;
// Height reserved for a column header above its rows.
const COLUMN_HEADER_HEIGHT = 22;

export const emptyNewGameDialogLayout = (
  speedrunMode = false,
): NewGameDialogLayout => ({
  hasContent: false,
  backdropBounds: { x: 0, y: 0, width: 0, height: 0 },
  panelBounds: { x: 0, y: 0, width: 0, height: 0 },
  titleText: '',
  campaignHeaderText: '',
  gameMasterHeaderText: '',
  campaignRows: [],
  gameMasterRows: [],
  checkboxBounds: { x: 0, y: 0, width: 0, height: 0 },
  checkboxLabelText: '',
  speedrunMode,
  actionButtonBounds: { x: 0, y: 0, width: 0, height: 0 },
  actionButtonLabel: '',
  secondaryButtonBounds: { x: 0, y: 0, width: 0, height: 0 },
  secondaryButtonLabel: '',
});

export const layoutNewGameDialog = (
  vm: NewGameDialogViewModel | null,
  viewBounds: Rect,
  options?: NewGameDialogLayoutOptions,
): NewGameDialogLayout => {
  const speedrunMode = Boolean(options?.speedrunMode);
  const { width: viewWidth, height: viewHeight } = viewBounds;
  if (!vm || viewWidth <= 0 || viewHeight <= 0) {
    return emptyNewGameDialogLayout(speedrunMode);
  }

  const marginX = Math.max(12, Math.floor(viewWidth * 0.05));
  const marginY = Math.max(12, Math.floor(viewHeight * 0.05));
  const panelWidth = Math.min(680, Math.max(420, viewWidth - marginX * 2));
  const paddingX = 18;
  const paddingY = 16;
  const contentWidth = panelWidth - paddingX * 2;

  const headerHeight = 48;
  const optionsRowHeight = 36;
  const buttonGap = 12;

  const rowCount = Math.max(vm.campaignRows.length, vm.gameMasterRows.length);
  const columnsHeight =
    COLUMN_HEADER_HEIGHT + rowCount * (ROW_HEIGHT + ROW_GAP);

  const panelHeight = Math.max(
    240,
    Math.min(
      Math.min(600, viewHeight - marginY * 2),
      paddingY * 2 +
        headerHeight +
        columnsHeight +
        optionsRowHeight +
        buttonGap +
        BTN_HEIGHT,
    ),
  );
  const panelX = Math.floor((viewWidth - panelWidth) / 2);
  const panelY = Math.floor((viewHeight - panelHeight) / 2);

  const columnsTop = panelY + paddingY + headerHeight;
  const colGap = 16;
  const colWidth = Math.floor((contentWidth - colGap) / 2);
  const campaignColX = panelX + paddingX;
  const gameMasterColX = campaignColX + colWidth + colGap;

  const buildRows = (
    data: readonly NewGameDialogRowVm[],
    columnX: number,
    selectedId: string | undefined,
  ): NewGameDialogRowLayout[] =>
    data.map((entry, index) => ({
      id: entry.id,
      label: entry.label,
      selected: entry.id === selectedId,
      bounds: {
        x: columnX,
        y: columnsTop + COLUMN_HEADER_HEIGHT + index * (ROW_HEIGHT + ROW_GAP),
        width: colWidth,
        height: ROW_HEIGHT,
      },
    }));

  const campaignRows = buildRows(
    vm.campaignRows,
    campaignColX,
    options?.selectedCampaignId,
  );
  const gameMasterRows = buildRows(
    vm.gameMasterRows,
    gameMasterColX,
    options?.selectedGameMasterId,
  );

  // Speedrunner checkbox, with the seed input beside it when ticked.
  const optionsRowY = columnsTop + columnsHeight + 10;
  const checkboxBounds: Rect = {
    x: campaignColX,
    y: optionsRowY + (optionsRowHeight - CHECKBOX_SIZE) / 2,
    width: CHECKBOX_SIZE,
    height: CHECKBOX_SIZE,
  };

  let seedLabelText: string | undefined;
  let seedInputBounds: Rect | undefined;
  if (speedrunMode) {
    seedLabelText = vm.seedLabelText;
    seedInputBounds = {
      x: panelX + panelWidth - paddingX - SEED_INPUT_WIDTH,
      y: optionsRowY + (optionsRowHeight - SEED_INPUT_HEIGHT) / 2,
      width: SEED_INPUT_WIDTH,
      height: SEED_INPUT_HEIGHT,
    };
  }

  const btnY = panelY + panelHeight - paddingY - BTN_HEIGHT;
  const actionWidth = 120;
  const secondaryWidth = 100;

  return {
    hasContent: true,
    backdropBounds: { x: 0, y: 0, width: viewWidth, height: viewHeight },
    panelBounds: {
      x: panelX,
      y: panelY,
      width: panelWidth,
      height: panelHeight,
    },
    titleText: vm.titleText,
    campaignHeaderText: vm.campaignHeaderText,
    gameMasterHeaderText: vm.gameMasterHeaderText,
    campaignRows,
    gameMasterRows,
    checkboxBounds,
    checkboxLabelText: vm.checkboxLabelText,
    speedrunMode,
    seedLabelText,
    seedInputBounds,
    actionButtonBounds: {
      x: panelX + panelWidth - paddingX - actionWidth,
      y: btnY,
      width: actionWidth,
      height: BTN_HEIGHT,
    },
    actionButtonLabel: vm.actionButtonLabel,
    secondaryButtonBounds: {
      x: panelX + paddingX,
      y: btnY,
      width: secondaryWidth,
      height: BTN_HEIGHT,
    },
    secondaryButtonLabel: vm.secondaryButtonLabel,
  };
};

export const hitTestNewGameDialog = (
  layout: NewGameDialogLayout,
  point: { x: number; y: number },
): NewGameDialogHit => {
  if (!layout.hasContent) return null;

  for (const row of layout.campaignRows) {
    if (isPointInRect(point.x, point.y, row.bounds)) {
      return { kind: 'campaign', id: row.id };
    }
  }
  for (const row of layout.gameMasterRows) {
    if (isPointInRect(point.x, point.y, row.bounds)) {
      return { kind: 'gameMaster', id: row.id };
    }
  }
  if (isPointInRect(point.x, point.y, layout.checkboxBounds)) {
    return { kind: 'checkbox' };
  }
  if (
    layout.seedInputBounds &&
    isPointInRect(point.x, point.y, layout.seedInputBounds)
  ) {
    return { kind: 'seedInput' };
  }
  if (isPointInRect(point.x, point.y, layout.actionButtonBounds)) {
    return { kind: 'action' };
  }
  if (isPointInRect(point.x, point.y, layout.secondaryButtonBounds)) {
    return { kind: 'secondary' };
  }
  if (isPointInRect(point.x, point.y, layout.panelBounds)) {
    return { kind: 'panel' };
  }
  return { kind: 'backdrop' };
};

const renderRow = (
  ctx: CanvasRenderingContext2D,
  row: NewGameDialogRowLayout,
  isHovered: boolean,
  theme: UiTheme,
): void => {
  const rb = row.bounds;
  drawListRow(ctx, rb, listRowStyles(theme, rowState(row.selected, isHovered)));

  ctx.font = composeFont(theme, theme.typography.sizes.lg);
  ctx.fillStyle = row.selected
    ? theme.palette.text.rowSelected
    : isHovered
    ? theme.palette.text.bright
    : theme.palette.text.dialogValue;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(row.label, rb.x + 12, rb.y + rb.height / 2);
};

export interface RenderNewGameDialogOptions {
  readonly hoveredCampaignId?: string | null;
  readonly hoveredGameMasterId?: string | null;
  readonly isCheckboxHovered?: boolean;
  readonly hoveredAction?: boolean;
  readonly hoveredSecondary?: boolean;
  /** The seed being typed, shown in the seed input. */
  readonly seedInput?: string;
}

export const renderNewGameDialog = (
  layout: NewGameDialogLayout,
  ui: UiContext,
  options?: RenderNewGameDialogOptions,
): void => {
  const { ctx } = ui;
  const theme: UiTheme = ui.theme;
  if (!ctx || !layout.hasContent) return;

  const view = layout.backdropBounds;

  ctx.save();

  // Dark backdrop, same veil the save/load dialog uses.
  drawDialogScrim(ctx, view.width, view.height, theme);

  // Centered modal panel
  const p = layout.panelBounds;
  drawModalFrame(ctx, p, theme);

  // Title
  drawModalHeader(ctx, p, layout.titleText, theme);

  // Column headers
  ctx.font = composeFont(
    theme,
    theme.typography.sizes.md,
    theme.typography.weights.bold,
  );
  ctx.fillStyle = theme.palette.text.secondary;
  ctx.fillText(
    layout.campaignHeaderText,
    layout.campaignRows[0]?.bounds.x ?? p.x + 18,
    layout.campaignRows[0]?.bounds.y
      ? layout.campaignRows[0].bounds.y - COLUMN_HEADER_HEIGHT
      : p.y + 62,
  );
  ctx.fillText(
    layout.gameMasterHeaderText,
    layout.gameMasterRows[0]?.bounds.x ?? p.x + 18,
    layout.gameMasterRows[0]?.bounds.y
      ? layout.gameMasterRows[0].bounds.y - COLUMN_HEADER_HEIGHT
      : p.y + 62,
  );

  // Rows
  for (const row of layout.campaignRows) {
    renderRow(ctx, row, row.id === options?.hoveredCampaignId, theme);
  }
  for (const row of layout.gameMasterRows) {
    renderRow(ctx, row, row.id === options?.hoveredGameMasterId, theme);
  }

  // Speedrunner checkbox
  const cb = layout.checkboxBounds;
  const isCheckboxHovered = Boolean(options?.isCheckboxHovered);
  ctx.fillStyle = layout.speedrunMode
    ? theme.palette.surface.checkboxSelected
    : theme.palette.surface.checkbox;
  drawRoundedRect(ctx, cb.x, cb.y, cb.width, cb.height, 4);
  ctx.fill();
  ctx.strokeStyle = layout.speedrunMode
    ? theme.palette.border.checkboxSelected
    : isCheckboxHovered
    ? theme.palette.border.rowHover
    : theme.palette.border.input;
  ctx.lineWidth = theme.shape.strokeWidth.thin;
  drawRoundedRect(ctx, cb.x, cb.y, cb.width, cb.height, 4);
  ctx.stroke();

  if (layout.speedrunMode) {
    // Check mark
    ctx.strokeStyle = theme.palette.text.bright;
    ctx.lineWidth = theme.shape.strokeWidth.regular;
    ctx.beginPath();
    ctx.moveTo(cb.x + 5, cb.y + cb.height / 2);
    ctx.lineTo(cb.x + cb.width / 2 - 1, cb.y + cb.height - 5);
    ctx.lineTo(cb.x + cb.width - 4, cb.y + 4);
    ctx.stroke();
  }

  ctx.font = composeFont(theme, theme.typography.sizes.lg);
  ctx.fillStyle = layout.speedrunMode
    ? theme.palette.text.rowSelected
    : theme.palette.text.body;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    layout.checkboxLabelText,
    cb.x + cb.width + 10,
    cb.y + cb.height / 2,
  );

  // Seed label + input (speedrunner mode only)
  if (layout.seedLabelText && layout.seedInputBounds) {
    const input = layout.seedInputBounds;
    ctx.font = composeFont(theme, theme.typography.sizes.md);
    ctx.fillStyle = theme.palette.text.muted;
    ctx.textAlign = 'right';
    ctx.fillText(
      layout.seedLabelText,
      input.x - 10,
      input.y + input.height / 2,
    );

    // The input is focused whenever shown.
    drawTextInput(ctx, input, options?.seedInput ?? '', theme);
  }

  // Secondary button (Cancel)
  drawButton(
    ctx,
    layout.secondaryButtonBounds,
    layout.secondaryButtonLabel,
    theme,
    { variant: 'secondary', hovered: Boolean(options?.hoveredSecondary) },
  );

  // Action button (Begin)
  drawButton(ctx, layout.actionButtonBounds, layout.actionButtonLabel, theme, {
    variant: 'primary',
    hovered: Boolean(options?.hoveredAction),
  });

  ctx.restore();
};
