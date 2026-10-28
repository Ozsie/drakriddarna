import { DifficultLevels, i18n } from '../core';
import { campaigns } from '../campaigns';
import {
  drawRoundedRect,
  isPointInBounds,
  type CardBounds,
} from './HeroCardRendering';

// Centered full-screen modal for starting a new game, a sibling of the
// save/load dialog: two columns — campaigns on the left, game masters on
// the right — with one selectable row each, a speedrunner-mode checkbox
// below them and, when ticked, the rng seed input next to it. Begin
// starts the selected combination; Cancel, the backdrop or Escape
// dismisses. Like the save/load dialog it captures every key while open
// (see DungeonBoardController), so no keystroke reaches the game.

export interface NewGameDialogRowLayout {
  id: string;
  label: string;
  bounds: CardBounds;
  selected: boolean;
}

export interface NewGameDialogLayout {
  hasContent: boolean;
  backdropBounds: CardBounds;
  panelBounds: CardBounds;
  titleText: string;
  campaignHeaderText: string;
  gameMasterHeaderText: string;
  campaignRows: NewGameDialogRowLayout[];
  gameMasterRows: NewGameDialogRowLayout[];
  checkboxBounds: CardBounds;
  checkboxLabelText: string;
  speedrunMode: boolean;
  /** Seed label + input, shown only in speedrunner mode. */
  seedLabelText?: string;
  seedInputBounds?: CardBounds;
  actionButtonBounds: CardBounds;
  actionButtonLabel: string;
  secondaryButtonBounds: CardBounds;
  secondaryButtonLabel: string;
}

export interface NewGameDialogOptions {
  selectedCampaignId?: string;
  selectedGameMasterId?: string;
  speedrunMode?: boolean;
  seedInput?: string;
  hoveredCampaignId?: string | null;
  hoveredGameMasterId?: string | null;
  isCheckboxHovered?: boolean;
  hoveredAction?: boolean;
  hoveredSecondary?: boolean;
}

export type NewGameDialogHitResult =
  | { type: 'campaign'; campaignId: string }
  | { type: 'gameMaster'; gameMasterId: string }
  | { type: 'checkbox' }
  | { type: 'seedInput' }
  | { type: 'action' }
  | { type: 'secondary' }
  | { type: 'panel' }
  | { type: 'backdrop' };

const TITLE_FONT = 'bold 18px Arial, Helvetica, sans-serif';
const COLUMN_HEADER_FONT = 'bold 12px Arial, Helvetica, sans-serif';
const ROW_FONT = '13px Arial, Helvetica, sans-serif';
const CHECKBOX_LABEL_FONT = '13px Arial, Helvetica, sans-serif';
const SEED_LABEL_FONT = '12px Arial, Helvetica, sans-serif';
const INPUT_FONT = '14px Arial, Helvetica, sans-serif';
const BUTTON_FONT = 'bold 14px Arial, Helvetica, sans-serif';

const ROW_HEIGHT = 36;
const ROW_GAP = 6;
const BTN_HEIGHT = 36;
const CHECKBOX_SIZE = 20;
const SEED_INPUT_WIDTH = 140;
const SEED_INPUT_HEIGHT = 30;
// Height reserved for a column header above its rows.
const COLUMN_HEADER_HEIGHT = 22;

export const getCampaignRows = (): { id: string; label: string }[] =>
  Object.values(campaigns).map((campaign) => ({
    id: campaign.id,
    label: i18n(campaign.nameTranslationKey ?? campaign.name),
  }));

export const getGameMasterRows = (): { id: string; label: string }[] =>
  DifficultLevels.map((gm) => ({
    id: gm.id,
    label: i18n(gm.nameTranslationKey ?? gm.id),
  }));

export const getNewGameDialogLayout = (
  viewWidth: number,
  viewHeight: number,
  options?: NewGameDialogOptions,
): NewGameDialogLayout => {
  const emptyLayout: NewGameDialogLayout = {
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
    speedrunMode: Boolean(options?.speedrunMode),
    actionButtonBounds: { x: 0, y: 0, width: 0, height: 0 },
    actionButtonLabel: '',
    secondaryButtonBounds: { x: 0, y: 0, width: 0, height: 0 },
    secondaryButtonLabel: '',
  };
  if (viewWidth <= 0 || viewHeight <= 0) return emptyLayout;

  const marginX = Math.max(12, Math.floor(viewWidth * 0.05));
  const marginY = Math.max(12, Math.floor(viewHeight * 0.05));
  const panelWidth = Math.min(680, Math.max(420, viewWidth - marginX * 2));
  const paddingX = 18;
  const paddingY = 16;
  const contentWidth = panelWidth - paddingX * 2;

  const headerHeight = 48;
  const optionsRowHeight = 36;
  const buttonGap = 12;

  const campaignData = getCampaignRows();
  const gameMasterData = getGameMasterRows();
  const rowCount = Math.max(campaignData.length, gameMasterData.length);
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
    data: { id: string; label: string }[],
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
    campaignData,
    campaignColX,
    options?.selectedCampaignId,
  );
  const gameMasterRows = buildRows(
    gameMasterData,
    gameMasterColX,
    options?.selectedGameMasterId,
  );

  // Speedrunner checkbox, with the seed input beside it when ticked.
  const optionsRowY = columnsTop + columnsHeight + 10;
  const checkboxBounds: CardBounds = {
    x: campaignColX,
    y: optionsRowY + (optionsRowHeight - CHECKBOX_SIZE) / 2,
    width: CHECKBOX_SIZE,
    height: CHECKBOX_SIZE,
  };

  let seedLabelText: string | undefined;
  let seedInputBounds: CardBounds | undefined;
  if (options?.speedrunMode) {
    seedLabelText = i18n('content.menu.newGame.rngSeed');
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
    titleText: i18n('content.menu.mainMenu.buttons.newGame'),
    campaignHeaderText: i18n('content.menu.selectCampaign.header'),
    gameMasterHeaderText: i18n('content.menu.selectGameMaster.header'),
    campaignRows,
    gameMasterRows,
    checkboxBounds,
    checkboxLabelText: i18n('content.menu.newGame.speedrunnerMode'),
    speedrunMode: Boolean(options?.speedrunMode),
    seedLabelText,
    seedInputBounds,
    actionButtonBounds: {
      x: panelX + panelWidth - paddingX - actionWidth,
      y: btnY,
      width: actionWidth,
      height: BTN_HEIGHT,
    },
    actionButtonLabel: i18n('content.menu.newGame.buttons.begin'),
    secondaryButtonBounds: {
      x: panelX + paddingX,
      y: btnY,
      width: secondaryWidth,
      height: BTN_HEIGHT,
    },
    secondaryButtonLabel: i18n('content.menu.saveGame.buttons.cancel'),
  };
};

export const getNewGameDialogHit = (
  viewWidth: number,
  viewHeight: number,
  x: number,
  y: number,
  options?: NewGameDialogOptions,
): NewGameDialogHitResult | null => {
  const layout = getNewGameDialogLayout(viewWidth, viewHeight, options);
  if (!layout.hasContent) return null;

  for (const row of layout.campaignRows) {
    if (isPointInBounds(x, y, row.bounds)) {
      return { type: 'campaign', campaignId: row.id };
    }
  }
  for (const row of layout.gameMasterRows) {
    if (isPointInBounds(x, y, row.bounds)) {
      return { type: 'gameMaster', gameMasterId: row.id };
    }
  }
  if (isPointInBounds(x, y, layout.checkboxBounds)) {
    return { type: 'checkbox' };
  }
  if (layout.seedInputBounds && isPointInBounds(x, y, layout.seedInputBounds)) {
    return { type: 'seedInput' };
  }
  if (isPointInBounds(x, y, layout.actionButtonBounds)) {
    return { type: 'action' };
  }
  if (isPointInBounds(x, y, layout.secondaryButtonBounds)) {
    return { type: 'secondary' };
  }
  if (isPointInBounds(x, y, layout.panelBounds)) {
    return { type: 'panel' };
  }
  return { type: 'backdrop' };
};

const renderRow = (
  ctx: CanvasRenderingContext2D,
  row: NewGameDialogRowLayout,
  isHovered: boolean,
): void => {
  const rb = row.bounds;
  ctx.fillStyle = row.selected
    ? 'rgba(212, 175, 55, 0.16)'
    : isHovered
    ? '#334155'
    : 'rgba(255, 255, 255, 0.04)';
  drawRoundedRect(ctx, rb.x, rb.y, rb.width, rb.height, 6);
  ctx.fill();

  ctx.strokeStyle = row.selected
    ? '#eab308'
    : isHovered
    ? '#94a3b8'
    : '#334155';
  ctx.lineWidth = row.selected ? 1.5 : 1;
  drawRoundedRect(ctx, rb.x, rb.y, rb.width, rb.height, 6);
  ctx.stroke();

  ctx.font = ROW_FONT;
  ctx.fillStyle = row.selected ? '#fef08a' : isHovered ? '#ffffff' : '#f1f5f9';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(row.label, rb.x + 12, rb.y + rb.height / 2);
};

export const renderNewGameDialog = (
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  viewHeight: number,
  options?: NewGameDialogOptions,
): void => {
  const layout = getNewGameDialogLayout(viewWidth, viewHeight, options);
  if (!layout.hasContent) return;

  ctx.save();

  // Dark backdrop, same veil the save/load dialog uses.
  ctx.fillStyle = 'rgba(10, 12, 16, 0.85)';
  ctx.fillRect(
    layout.backdropBounds.x,
    layout.backdropBounds.y,
    layout.backdropBounds.width,
    layout.backdropBounds.height,
  );

  // Centered modal panel
  const p = layout.panelBounds;
  ctx.fillStyle = '#181b22';
  drawRoundedRect(ctx, p.x, p.y, p.width, p.height, 10);
  ctx.fill();

  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, p.x, p.y, p.width, p.height, 10);
  ctx.stroke();

  // Title
  ctx.fillStyle = '#fce28a';
  ctx.font = TITLE_FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(layout.titleText, p.x + 18, p.y + 14);

  // Column headers
  ctx.font = COLUMN_HEADER_FONT;
  ctx.fillStyle = '#cbd5e1';
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
    renderRow(ctx, row, row.id === options?.hoveredCampaignId);
  }
  for (const row of layout.gameMasterRows) {
    renderRow(ctx, row, row.id === options?.hoveredGameMasterId);
  }

  // Speedrunner checkbox
  const cb = layout.checkboxBounds;
  const isCheckboxHovered = Boolean(options?.isCheckboxHovered);
  ctx.fillStyle = layout.speedrunMode ? '#ca8a04' : '#1e293b';
  drawRoundedRect(ctx, cb.x, cb.y, cb.width, cb.height, 4);
  ctx.fill();
  ctx.strokeStyle = layout.speedrunMode
    ? '#fde047'
    : isCheckboxHovered
    ? '#94a3b8'
    : '#475569';
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, cb.x, cb.y, cb.width, cb.height, 4);
  ctx.stroke();

  if (layout.speedrunMode) {
    // Check mark
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cb.x + 5, cb.y + cb.height / 2);
    ctx.lineTo(cb.x + cb.width / 2 - 1, cb.y + cb.height - 5);
    ctx.lineTo(cb.x + cb.width - 4, cb.y + 4);
    ctx.stroke();
  }

  ctx.font = CHECKBOX_LABEL_FONT;
  ctx.fillStyle = layout.speedrunMode ? '#fef08a' : '#e2e8f0';
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
    ctx.font = SEED_LABEL_FONT;
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'right';
    ctx.fillText(
      layout.seedLabelText,
      input.x - 10,
      input.y + input.height / 2,
    );

    ctx.fillStyle = '#0f1217';
    drawRoundedRect(ctx, input.x, input.y, input.width, input.height, 4);
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, input.x, input.y, input.width, input.height, 4);
    ctx.stroke();

    const text = options?.seedInput ?? '';
    ctx.font = INPUT_FONT;
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'left';
    ctx.fillText(text, input.x + 10, input.y + input.height / 2);
    // Static caret after the text; the input is focused whenever shown.
    ctx.fillRect(
      input.x + 10 + ctx.measureText(text).width + 2,
      input.y + input.height / 2 - 9,
      1,
      18,
    );
  }

  // Secondary button (Cancel)
  const sb = layout.secondaryButtonBounds;
  const isSecondaryHovered = Boolean(options?.hoveredSecondary);
  ctx.fillStyle = isSecondaryHovered ? '#475569' : '#334155';
  drawRoundedRect(ctx, sb.x, sb.y, sb.width, sb.height, 6);
  ctx.fill();
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, sb.x, sb.y, sb.width, sb.height, 6);
  ctx.stroke();
  ctx.fillStyle = '#e2e8f0';
  ctx.font = BUTTON_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    layout.secondaryButtonLabel,
    sb.x + sb.width / 2,
    sb.y + sb.height / 2,
  );

  // Action button (Begin)
  const ab = layout.actionButtonBounds;
  const isActionHovered = Boolean(options?.hoveredAction);
  ctx.fillStyle = isActionHovered ? '#b45309' : '#92400e';
  drawRoundedRect(ctx, ab.x, ab.y, ab.width, ab.height, 6);
  ctx.fill();
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, ab.x, ab.y, ab.width, ab.height, 6);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = BUTTON_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    layout.actionButtonLabel,
    ab.x + ab.width / 2,
    ab.y + ab.height / 2,
  );

  ctx.restore();
};
