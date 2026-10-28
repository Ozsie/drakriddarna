import { i18n } from '../core';
import type { GameState } from '../types';
import {
  type CanvasMenuItem,
  type MenuCallbacks,
  getSavedGameMenuItems,
} from '../menu/MenuLogic';
import {
  drawRoundedRect,
  isPointInBounds,
  type CardBounds,
} from './HeroCardRendering';

// Centered full-screen modal for saving (name input) and loading (list of
// saves with campaign/dungeon hints). Visually a sibling of the
// between-dungeons dialog, not part of the canvas menu: it opens on top of
// everything, dims the whole board, and dismisses on backdrop click or
// Escape. The load rows reuse the menu's saved-game items (labels, hints
// and click behavior); the save mode has no rows, only the name input.

export type SaveLoadDialogMode = 'save' | 'load';

export interface SaveLoadDialogRowLayout {
  item: CanvasMenuItem;
  bounds: CardBounds;
}

export interface SaveLoadDialogLayout {
  hasContent: boolean;
  mode: SaveLoadDialogMode;
  backdropBounds: CardBounds;
  panelBounds: CardBounds;
  titleText: string;
  subtitleText: string;
  /** Name input row, shown in save mode. */
  inputBounds?: CardBounds;
  /** Save rows, shown in load mode. */
  rows: SaveLoadDialogRowLayout[];
  actionButtonBounds?: CardBounds;
  actionButtonLabel?: string;
  secondaryButtonBounds?: CardBounds;
  secondaryButtonLabel?: string;
  /** Shown when more saves exist than fit the panel. */
  footerBounds?: CardBounds;
  footerText: string;
}

export interface RenderSaveLoadDialogOptions {
  saveName?: string;
  hoveredItemId?: string | null;
  hoveredAction?: boolean;
  hoveredSecondary?: boolean;
}

export type SaveLoadDialogHitResult =
  | { type: 'row'; item: CanvasMenuItem }
  | { type: 'action' }
  | { type: 'secondary' }
  | { type: 'input' }
  | { type: 'panel' }
  | { type: 'backdrop' };

const TITLE_FONT = 'bold 18px Arial, Helvetica, sans-serif';
const SUBTITLE_FONT = '13px Arial, Helvetica, sans-serif';
const BUTTON_FONT = 'bold 14px Arial, Helvetica, sans-serif';
const ROW_LABEL_FONT = 'bold 13px Arial, Helvetica, sans-serif';
const ROW_HINT_FONT = '11px Arial, Helvetica, sans-serif';
const INPUT_FONT = '14px Arial, Helvetica, sans-serif';
const FOOTER_FONT = '11px Arial, Helvetica, sans-serif';

const MAX_SAVE_NAME_WIDTH_FACTOR = 24;

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

const ROW_HEIGHT = 48;
const ROW_GAP = 8;
const BTN_HEIGHT = 36;

export const getSaveLoadDialogLayout = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options?: { mode?: SaveLoadDialogMode; callbacks?: MenuCallbacks },
): SaveLoadDialogLayout => {
  const mode: SaveLoadDialogMode = options?.mode ?? 'save';
  const emptyLayout: SaveLoadDialogLayout = {
    hasContent: false,
    mode,
    backdropBounds: { x: 0, y: 0, width: 0, height: 0 },
    panelBounds: { x: 0, y: 0, width: 0, height: 0 },
    titleText: '',
    subtitleText: '',
    rows: [],
    footerText: '',
  };
  if (!state || viewWidth <= 0 || viewHeight <= 0) return emptyLayout;

  const marginX = Math.max(12, Math.floor(viewWidth * 0.05));
  const marginY = Math.max(12, Math.floor(viewHeight * 0.05));
  const panelWidth = Math.min(560, Math.max(340, viewWidth - marginX * 2));
  const paddingX = 18;
  const paddingY = 16;
  const contentWidth = panelWidth - paddingX * 2;

  const isSave = mode === 'save';
  const titleText = isSave
    ? i18n('content.menu.saveGame.header')
    : i18n('content.menu.loadGame.header');
  const subtitleText = isSave
    ? i18n('content.menu.saveGame.subtitle')
    : i18n('content.menu.loadGame.subtitle');

  const headerHeight = 64;
  const inputHeight = 38;
  const inputGap = 10;
  const buttonGap = 12;

  const allItems = isSave
    ? []
    : getSavedGameMenuItems(state, options?.callbacks);

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
    if (allItems.length > rowCount) {
      // Reserve the footer line for the overflow note, but always keep at
      // least one row visible.
      while (
        rowCount > 1 &&
        rowCount * (ROW_HEIGHT + ROW_GAP) + 20 > maxContentHeight
      ) {
        rowCount -= 1;
      }
      footerText = i18n('content.menu.loadGame.moreSaves', {
        count: String(allItems.length - rowCount),
      });
    } else {
      rowCount = allItems.length;
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

  let inputBounds: CardBounds | undefined;
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
    const item = allItems[index];
    rows.push({
      item,
      bounds: {
        x: panelX + paddingX,
        y: rowY,
        width: contentWidth,
        height: ROW_HEIGHT,
      },
    });
    rowY += ROW_HEIGHT + ROW_GAP;
  }

  let footerBounds: CardBounds | undefined;
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
  let actionButtonBounds: CardBounds | undefined;
  let actionButtonLabel: string | undefined;
  let secondaryButtonBounds: CardBounds | undefined;
  let secondaryButtonLabel: string | undefined;

  if (isSave) {
    const actionWidth = 140;
    actionButtonBounds = {
      x: panelX + panelWidth - paddingX - actionWidth,
      y: btnY,
      width: actionWidth,
      height: BTN_HEIGHT,
    };
    actionButtonLabel = i18n('content.menu.saveGame.buttons.save');
    const secondaryWidth = 100;
    secondaryButtonBounds = {
      x: panelX + paddingX,
      y: btnY,
      width: secondaryWidth,
      height: BTN_HEIGHT,
    };
    secondaryButtonLabel = i18n('content.menu.saveGame.buttons.cancel');
  } else {
    const backWidth = 100;
    actionButtonBounds = {
      x: panelX + panelWidth - paddingX - backWidth,
      y: btnY,
      width: backWidth,
      height: BTN_HEIGHT,
    };
    actionButtonLabel = i18n('content.menu.loadGame.buttons.back');
  }

  return {
    hasContent: true,
    mode,
    backdropBounds: { x: 0, y: 0, width: viewWidth, height: viewHeight },
    panelBounds: {
      x: panelX,
      y: panelY,
      width: panelWidth,
      height: panelHeight,
    },
    titleText,
    subtitleText,
    inputBounds,
    rows,
    actionButtonBounds,
    actionButtonLabel,
    secondaryButtonBounds,
    secondaryButtonLabel,
    footerBounds,
    footerText,
  };
};

export const getSaveLoadDialogHit = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options: { mode?: SaveLoadDialogMode; callbacks?: MenuCallbacks } | undefined,
  x: number,
  y: number,
): SaveLoadDialogHitResult | null => {
  const layout = getSaveLoadDialogLayout(viewWidth, viewHeight, state, options);
  if (!layout.hasContent) return null;

  for (const row of layout.rows) {
    if (isPointInBounds(x, y, row.bounds)) {
      return { type: 'row', item: row.item };
    }
  }
  if (
    layout.actionButtonBounds &&
    isPointInBounds(x, y, layout.actionButtonBounds)
  ) {
    return { type: 'action' };
  }
  if (
    layout.secondaryButtonBounds &&
    isPointInBounds(x, y, layout.secondaryButtonBounds)
  ) {
    return { type: 'secondary' };
  }
  if (layout.inputBounds && isPointInBounds(x, y, layout.inputBounds)) {
    return { type: 'input' };
  }
  if (isPointInBounds(x, y, layout.panelBounds)) {
    return { type: 'panel' };
  }
  return { type: 'backdrop' };
};

export const renderSaveLoadDialog = (
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options?: {
    mode?: SaveLoadDialogMode;
    callbacks?: MenuCallbacks;
  } & RenderSaveLoadDialogOptions,
): void => {
  const layout = getSaveLoadDialogLayout(viewWidth, viewHeight, state, options);
  if (!layout.hasContent) return;

  ctx.save();

  // Dark backdrop, same veil the between-dungeons dialog uses.
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

  // Title + subtitle
  ctx.fillStyle = '#fce28a';
  ctx.font = TITLE_FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(layout.titleText, p.x + 18, p.y + 14);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = SUBTITLE_FONT;
  ctx.fillText(layout.subtitleText, p.x + 18, p.y + 38);

  // Name input (save mode)
  if (layout.inputBounds) {
    const input = layout.inputBounds;
    ctx.fillStyle = '#0f1217';
    drawRoundedRect(ctx, input.x, input.y, input.width, input.height, 4);
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, input.x, input.y, input.width, input.height, 4);
    ctx.stroke();

    const text = fitTextToWidth(ctx, options?.saveName ?? '', input.width - 20);
    ctx.font = INPUT_FONT;
    ctx.fillStyle = '#f8fafc';
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
    const isHovered = options?.hoveredItemId === row.item.id;
    ctx.fillStyle = isHovered ? '#334155' : 'rgba(255, 255, 255, 0.04)';
    drawRoundedRect(ctx, rb.x, rb.y, rb.width, rb.height, 6);
    ctx.fill();

    ctx.strokeStyle = isHovered ? '#94a3b8' : '#334155';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, rb.x, rb.y, rb.width, rb.height, 6);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = ROW_LABEL_FONT;
    ctx.fillStyle = isHovered ? '#ffffff' : '#f1f5f9';
    ctx.fillText(
      fitTextToWidth(
        ctx,
        row.item.label,
        rb.width - MAX_SAVE_NAME_WIDTH_FACTOR,
      ),
      rb.x + 12,
      rb.y + 16,
    );

    if (row.item.hint) {
      ctx.font = ROW_HINT_FONT;
      ctx.fillStyle = isHovered ? '#cbd5e1' : '#94a3b8';
      ctx.fillText(
        fitTextToWidth(
          ctx,
          row.item.hint,
          rb.width - MAX_SAVE_NAME_WIDTH_FACTOR,
        ),
        rb.x + 12,
        rb.y + 34,
      );
    }
  }

  if (layout.footerBounds && layout.footerText) {
    ctx.font = FOOTER_FONT;
    ctx.fillStyle = '#94a3b8';
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
    const sb = layout.secondaryButtonBounds;
    const isHovered = Boolean(options?.hoveredSecondary);
    ctx.fillStyle = isHovered ? '#475569' : '#334155';
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
  }

  // Action button (Save / Back)
  if (layout.actionButtonBounds && layout.actionButtonLabel) {
    const ab = layout.actionButtonBounds;
    const isHovered = Boolean(options?.hoveredAction);
    const isSave = layout.mode === 'save';
    ctx.fillStyle = isHovered
      ? isSave
        ? '#b45309'
        : '#475569'
      : isSave
      ? '#92400e'
      : '#334155';
    drawRoundedRect(ctx, ab.x, ab.y, ab.width, ab.height, 6);
    ctx.fill();

    ctx.strokeStyle = isSave ? '#fbbf24' : '#64748b';
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
  }

  ctx.restore();
};
