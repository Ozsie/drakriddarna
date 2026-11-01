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
import { composeFont } from '../uikit/primitives/text';
import {
  drawDialogScrim,
  drawModalFrame,
  drawModalHeader,
} from '../uikit/kit/modalFrame';
import type { UiEnv } from '../uikit/env';
import { defaultUiEnv } from './env';
import { i18nTranslator } from './i18nAdapter';

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
  env?: UiEnv;
}

export type SaveLoadDialogHitResult =
  | { type: 'row'; item: CanvasMenuItem }
  | { type: 'action' }
  | { type: 'secondary' }
  | { type: 'input' }
  | { type: 'panel' }
  | { type: 'backdrop' };

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
  options?: {
    mode?: SaveLoadDialogMode;
    callbacks?: MenuCallbacks;
  } & RenderSaveLoadDialogOptions,
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
  // The load dialog also opens over the welcome screen, where no game
  // state exists yet; only save mode requires one (it prefills the name
  // from the current dungeon and saves the live run).
  if ((mode === 'save' && !state) || viewWidth <= 0 || viewHeight <= 0) {
    return emptyLayout;
  }

  const t = options?.env?.t ?? i18nTranslator;

  const marginX = Math.max(12, Math.floor(viewWidth * 0.05));
  const marginY = Math.max(12, Math.floor(viewHeight * 0.05));
  const panelWidth = Math.min(560, Math.max(340, viewWidth - marginX * 2));
  const paddingX = 18;
  const paddingY = 16;
  const contentWidth = panelWidth - paddingX * 2;

  const isSave = mode === 'save';
  const titleText = isSave
    ? t('content.menu.saveGame.header')
    : t('content.menu.loadGame.header');
  const subtitleText = isSave
    ? t('content.menu.saveGame.subtitle')
    : t('content.menu.loadGame.subtitle');

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
      footerText = t('content.menu.loadGame.moreSaves', {
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
    actionButtonLabel = t('content.menu.saveGame.buttons.save');
    const secondaryWidth = 100;
    secondaryButtonBounds = {
      x: panelX + paddingX,
      y: btnY,
      width: secondaryWidth,
      height: BTN_HEIGHT,
    };
    secondaryButtonLabel = t('content.menu.saveGame.buttons.cancel');
  } else {
    const backWidth = 100;
    actionButtonBounds = {
      x: panelX + panelWidth - paddingX - backWidth,
      y: btnY,
      width: backWidth,
      height: BTN_HEIGHT,
    };
    actionButtonLabel = t('content.menu.loadGame.buttons.back');
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

  const theme = options?.env?.theme ?? defaultUiEnv.theme;

  ctx.save();

  // Dark backdrop, same veil the between-dungeons dialog uses.
  drawDialogScrim(ctx, viewWidth, viewHeight, theme);

  // Centered modal panel
  const p = layout.panelBounds;
  drawModalFrame(ctx, p, theme);

  // Title + subtitle
  drawModalHeader(ctx, p, layout.titleText, theme);

  ctx.fillStyle = theme.palette.text.secondary;
  ctx.font = composeFont(theme, theme.typography.sizes.lg);
  ctx.fillText(layout.subtitleText, p.x + 18, p.y + 38);

  // Name input (save mode)
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
    const isHovered = options?.hoveredItemId === row.item.id;
    ctx.fillStyle = isHovered
      ? theme.palette.surface.rowHover
      : theme.palette.surface.row;
    drawRoundedRect(ctx, rb.x, rb.y, rb.width, rb.height, 6);
    ctx.fill();

    ctx.strokeStyle = isHovered
      ? theme.palette.border.rowHover
      : theme.palette.border.row;
    ctx.lineWidth = theme.shape.strokeWidth.thin;
    drawRoundedRect(ctx, rb.x, rb.y, rb.width, rb.height, 6);
    ctx.stroke();

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
      fitTextToWidth(
        ctx,
        row.item.label,
        rb.width - MAX_SAVE_NAME_WIDTH_FACTOR,
      ),
      rb.x + 12,
      rb.y + 16,
    );

    if (row.item.hint) {
      ctx.font = composeFont(theme, theme.typography.sizes.sm);
      ctx.fillStyle = isHovered
        ? theme.palette.text.secondary
        : theme.palette.text.muted;
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
    const sb = layout.secondaryButtonBounds;
    const isHovered = Boolean(options?.hoveredSecondary);
    ctx.fillStyle = isHovered
      ? theme.palette.surface.buttonSecondaryHover
      : theme.palette.surface.buttonSecondary;
    drawRoundedRect(ctx, sb.x, sb.y, sb.width, sb.height, 6);
    ctx.fill();

    ctx.strokeStyle = theme.palette.border.buttonSecondary;
    ctx.lineWidth = theme.shape.strokeWidth.thin;
    drawRoundedRect(ctx, sb.x, sb.y, sb.width, sb.height, 6);
    ctx.stroke();

    ctx.fillStyle = theme.palette.text.body;
    ctx.font = composeFont(
      theme,
      theme.typography.sizes.xl,
      theme.typography.weights.bold,
    );
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
