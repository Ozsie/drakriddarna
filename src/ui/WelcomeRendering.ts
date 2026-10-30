import { base } from '$app/paths';
import { i18n } from '../core';
import { getReadyImage } from '../core/ImageCache';
import {
  drawRoundedRect,
  isPointInBounds,
  type CardBounds,
} from './HeroCardRendering';

// The welcome (title) screen: a full-canvas background image (cover-fit,
// with a flat fallback colour while the art is missing), a centered panel
// in the save/load dialog style with three buttons, and a build footer at
// the bottom. Follows the layout/hit/render split of the other UI
// modules so it is testable without a real canvas.

/** The human-authored welcome background, served like other static assets. */
export const WELCOME_BACKGROUND_IMAGE = `${base}/images/welcome.png`;

/** The dungeon-view background colour, the fallback while art is missing. */
export const WELCOME_FALLBACK_COLOR = '#121418';

export type WelcomeButtonId = 'newGame' | 'loadGame' | 'settings';

export interface WelcomeButtonLayout {
  id: WelcomeButtonId;
  label: string;
  bounds: CardBounds;
}

export interface WelcomeLayout {
  hasContent: boolean;
  panelBounds: CardBounds;
  headerText: string;
  buttons: WelcomeButtonLayout[];
  footerBounds: CardBounds;
  footerText: string;
}

export interface RenderWelcomeOptions {
  buildInfo?: { date: string; hash: string } | null;
  /** Hovered main-view button, for the row highlight. */
  hoveredButton?: WelcomeButtonId | null;
  /**
   * Background image override; when omitted the shared image cache is
   * asked for the welcome art (tests run without the asset).
   */
  backgroundImage?: HTMLImageElement | null;
}

export type WelcomeHitResult = WelcomeButtonId | null;

const TITLE_FONT = 'bold 18px Arial, Helvetica, sans-serif';
const BUTTON_FONT = 'bold 13px Arial, Helvetica, sans-serif';
const FOOTER_FONT = '10px Arial, Helvetica, sans-serif';

const PANEL_RADIUS = 10;
const BUTTON_RADIUS = 6;
const ROW_HEIGHT = 48;
const ROW_GAP = 8;
// Rows never shrink below this, even on very short views.
const MIN_ROW_HEIGHT = 28;
const HEADER_HEIGHT = 48;
const PADDING_X = 18;
const PADDING_Y = 16;

const BUTTON_ORDER: WelcomeButtonId[] = ['newGame', 'loadGame', 'settings'];

const getButtonLabel = (id: WelcomeButtonId): string => {
  switch (id) {
    case 'newGame':
      // Same wording as the canvas menu's New Game item.
      return i18n('content.menu.mainMenu.buttons.newGame');
    case 'loadGame':
      return i18n('content.menu.welcome.buttons.loadGame');
    case 'settings':
      return i18n('content.menu.welcome.buttons.settings');
  }
};

/**
 * Cover-fit bounds: the image scaled uniformly so it covers the whole
 * view, centered, overflowing edges cropped (CSS `background-size:
 * cover` semantics).
 */
export const getCoverFitBounds = (
  imageWidth: number,
  imageHeight: number,
  viewWidth: number,
  viewHeight: number,
): { x: number; y: number; width: number; height: number } => {
  if (
    imageWidth <= 0 ||
    imageHeight <= 0 ||
    viewWidth <= 0 ||
    viewHeight <= 0
  ) {
    return { x: 0, y: 0, width: viewWidth, height: viewHeight };
  }
  const scale = Math.max(viewWidth / imageWidth, viewHeight / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  return {
    x: (viewWidth - width) / 2,
    y: (viewHeight - height) / 2,
    width,
    height,
  };
};

export const getWelcomeLayout = (
  viewWidth: number,
  viewHeight: number,
  options?: RenderWelcomeOptions,
): WelcomeLayout => {
  const emptyLayout: WelcomeLayout = {
    hasContent: false,
    panelBounds: { x: 0, y: 0, width: 0, height: 0 },
    headerText: '',
    buttons: [],
    footerBounds: { x: 0, y: 0, width: 0, height: 0 },
    footerText: '',
  };
  if (viewWidth <= 0 || viewHeight <= 0) return emptyLayout;

  const marginX = Math.max(12, Math.floor(viewWidth * 0.05));
  const marginY = Math.max(12, Math.floor(viewHeight * 0.05));
  // Same centered sizing rule as the save/load dialog.
  const panelWidth = Math.min(560, Math.max(340, viewWidth - marginX * 2));
  const contentWidth = panelWidth - PADDING_X * 2;

  // Rows shrink when the view is short so the panel always fits.
  const availableHeight = viewHeight - marginY * 2;
  const fixedHeight =
    PADDING_Y * 2 + HEADER_HEIGHT + (BUTTON_ORDER.length - 1) * ROW_GAP;
  const rowHeight = Math.max(
    MIN_ROW_HEIGHT,
    Math.min(
      ROW_HEIGHT,
      Math.floor((availableHeight - fixedHeight) / BUTTON_ORDER.length),
    ),
  );

  const panelHeight =
    PADDING_Y * 2 +
    HEADER_HEIGHT +
    BUTTON_ORDER.length * rowHeight +
    (BUTTON_ORDER.length - 1) * ROW_GAP;
  const panelX = Math.floor((viewWidth - panelWidth) / 2);
  const panelY = Math.floor((viewHeight - panelHeight) / 2);

  const buttons: WelcomeButtonLayout[] = BUTTON_ORDER.map((id, index) => ({
    id,
    label: getButtonLabel(id),
    bounds: {
      x: panelX + PADDING_X,
      y: panelY + PADDING_Y + HEADER_HEIGHT + index * (rowHeight + ROW_GAP),
      width: contentWidth,
      height: rowHeight,
    },
  }));

  const footerText = options?.buildInfo
    ? `${options.buildInfo.date} - ${options.buildInfo.hash}`
    : '';

  return {
    hasContent: true,
    panelBounds: {
      x: panelX,
      y: panelY,
      width: panelWidth,
      height: panelHeight,
    },
    headerText: i18n('content.menu.welcome.header'),
    buttons,
    footerBounds: {
      x: 0,
      y: viewHeight - 22,
      width: viewWidth,
      height: 10,
    },
    footerText,
  };
};

export const getWelcomeHit = (
  viewWidth: number,
  viewHeight: number,
  x: number,
  y: number,
): WelcomeHitResult => {
  const layout = getWelcomeLayout(viewWidth, viewHeight);
  if (!layout.hasContent) return null;
  for (const button of layout.buttons) {
    if (isPointInBounds(x, y, button.bounds)) {
      return button.id;
    }
  }
  return null;
};

/**
 * The background layer every welcome view shares: the welcome art
 * cover-fit over the whole canvas, or the flat fallback colour with a
 * subtle vignette while the art is missing.
 */
export const renderWelcomeBackground = (
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  viewHeight: number,
  options?: RenderWelcomeOptions,
): void => {
  const image =
    options?.backgroundImage !== undefined
      ? options.backgroundImage
      : getReadyImage(WELCOME_BACKGROUND_IMAGE);
  if (image) {
    const fit = getCoverFitBounds(
      image.naturalWidth,
      image.naturalHeight,
      viewWidth,
      viewHeight,
    );
    ctx.drawImage(image, fit.x, fit.y, fit.width, fit.height);
  } else {
    ctx.fillStyle = WELCOME_FALLBACK_COLOR;
    ctx.fillRect(0, 0, viewWidth, viewHeight);
    const gradient = ctx.createRadialGradient(
      viewWidth / 2,
      viewHeight / 2,
      Math.min(viewWidth, viewHeight) / 3,
      viewWidth / 2,
      viewHeight / 2,
      Math.max(viewWidth, viewHeight) / 1.5,
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, viewWidth, viewHeight);
  }
};

/**
 * The build footer, bottom center — drawn on every welcome view.
 */
export const renderWelcomeFooter = (
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  viewHeight: number,
  buildInfo?: { date: string; hash: string } | null,
): void => {
  if (!buildInfo) return;
  ctx.fillStyle = 'rgba(226, 232, 240, 0.5)';
  ctx.font = FOOTER_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  // The baseline sits 12px above the canvas bottom edge.
  ctx.fillText(
    `${buildInfo.date} - ${buildInfo.hash}`,
    viewWidth / 2,
    viewHeight - 12,
  );
};

export const renderWelcome = (
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  viewHeight: number,
  options?: RenderWelcomeOptions,
): void => {
  const layout = getWelcomeLayout(viewWidth, viewHeight, options);
  if (!layout.hasContent) return;

  ctx.save();

  renderWelcomeBackground(ctx, viewWidth, viewHeight, options);

  // Centered modal panel, save/load dialog style.
  const p = layout.panelBounds;
  ctx.fillStyle = '#181b22';
  drawRoundedRect(ctx, p.x, p.y, p.width, p.height, PANEL_RADIUS);
  ctx.fill();

  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, p.x, p.y, p.width, p.height, PANEL_RADIUS);
  ctx.stroke();

  // Header line.
  ctx.fillStyle = '#fce28a';
  ctx.font = TITLE_FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(layout.headerText, p.x + 18, p.y + 14);

  // Button rows, dialog row style.
  for (const button of layout.buttons) {
    const isHovered = options?.hoveredButton === button.id;
    const b = button.bounds;
    ctx.fillStyle = isHovered ? '#334155' : 'rgba(255, 255, 255, 0.04)';
    drawRoundedRect(ctx, b.x, b.y, b.width, b.height, BUTTON_RADIUS);
    ctx.fill();

    ctx.strokeStyle = isHovered ? '#94a3b8' : '#334155';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, b.x, b.y, b.width, b.height, BUTTON_RADIUS);
    ctx.stroke();

    ctx.font = BUTTON_FONT;
    ctx.fillStyle = isHovered ? '#ffffff' : '#f1f5f9';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(button.label, b.x + 12, b.y + b.height / 2);
  }

  renderWelcomeFooter(ctx, viewWidth, viewHeight, options?.buildInfo);

  ctx.restore();
};
