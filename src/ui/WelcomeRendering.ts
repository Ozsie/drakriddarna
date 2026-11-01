import { getReadyImage } from '../core/ImageCache';
import {
  drawRoundedRect,
  isPointInBounds,
  type CardBounds,
} from './HeroCardRendering';
import { composeFont } from '../uikit/primitives/text';
import { drawModalFrame, drawModalHeader } from '../uikit/kit/modalFrame';
import { defaultTheme } from '../uikit/theme';
import type { UiEnv, Translator } from '../uikit/env';
import { defaultUiEnv } from './env';
import { AssetId, getAssetUrl } from './assets';
import { i18nTranslator } from './i18nAdapter';

// The welcome (title) screen: a full-canvas background image (cover-fit,
// with a flat fallback colour while the art is missing), a centered panel
// in the save/load dialog style with three buttons, and a build footer at
// the bottom. Follows the layout/hit/render split of the other UI
// modules so it is testable without a real canvas.

/** The human-authored welcome background, served like other static assets. */
export const WELCOME_BACKGROUND_IMAGE = getAssetUrl(AssetId.welcomeBackground);

/** The dungeon-view background colour, the fallback while art is missing. */
export const WELCOME_FALLBACK_COLOR = defaultTheme.palette.surface.welcome;

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
  env?: UiEnv;
}

export type WelcomeHitResult = WelcomeButtonId | null;

const BUTTON_RADIUS = 6;
const ROW_HEIGHT = 48;
const ROW_GAP = 8;
// Rows never shrink below this, even on very short views.
const MIN_ROW_HEIGHT = 28;
const HEADER_HEIGHT = 48;
const PADDING_X = 18;
const PADDING_Y = 16;

const BUTTON_ORDER: WelcomeButtonId[] = ['newGame', 'loadGame', 'settings'];

const getButtonLabel = (id: WelcomeButtonId, t: Translator): string => {
  switch (id) {
    case 'newGame':
      // Same wording as the canvas menu's New Game item.
      return t('content.menu.mainMenu.buttons.newGame');
    case 'loadGame':
      return t('content.menu.welcome.buttons.loadGame');
    case 'settings':
      return t('content.menu.welcome.buttons.settings');
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

  const t = options?.env?.t ?? i18nTranslator;
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
    label: getButtonLabel(id, t),
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
    headerText: t('content.menu.welcome.header'),
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
  const env = options?.env ?? defaultUiEnv;
  const theme = env.theme;
  if (image) {
    const fit = getCoverFitBounds(
      image.naturalWidth,
      image.naturalHeight,
      viewWidth,
      viewHeight,
    );
    ctx.drawImage(image, fit.x, fit.y, fit.width, fit.height);
  } else {
    ctx.fillStyle = theme.palette.surface.welcome;
    ctx.fillRect(0, 0, viewWidth, viewHeight);
    const gradient = ctx.createRadialGradient(
      viewWidth / 2,
      viewHeight / 2,
      Math.min(viewWidth, viewHeight) / 3,
      viewWidth / 2,
      viewHeight / 2,
      Math.max(viewWidth, viewHeight) / 1.5,
    );
    gradient.addColorStop(0, theme.palette.overlay.vignetteStart);
    gradient.addColorStop(1, theme.palette.overlay.vignetteEnd);
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
  env: UiEnv = defaultUiEnv,
): void => {
  if (!buildInfo) return;
  const theme = env.theme;
  ctx.fillStyle = theme.palette.text.faint;
  ctx.font = composeFont(theme, theme.typography.sizes.xxs);
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
  const env = options?.env ?? defaultUiEnv;
  const layout = getWelcomeLayout(viewWidth, viewHeight, options);
  if (!layout.hasContent) return;

  const theme = env.theme;

  ctx.save();

  renderWelcomeBackground(ctx, viewWidth, viewHeight, options);

  // Centered modal panel, save/load dialog style.
  const p = layout.panelBounds;
  drawModalFrame(ctx, p, theme);

  // Header line.
  drawModalHeader(ctx, p, layout.headerText, theme);

  // Button rows, dialog row style.
  for (const button of layout.buttons) {
    const isHovered = options?.hoveredButton === button.id;
    const b = button.bounds;
    ctx.fillStyle = isHovered
      ? theme.palette.surface.rowHover
      : theme.palette.surface.row;
    drawRoundedRect(ctx, b.x, b.y, b.width, b.height, BUTTON_RADIUS);
    ctx.fill();

    ctx.strokeStyle = isHovered
      ? theme.palette.border.rowHover
      : theme.palette.border.row;
    ctx.lineWidth = theme.shape.strokeWidth.thin;
    drawRoundedRect(ctx, b.x, b.y, b.width, b.height, BUTTON_RADIUS);
    ctx.stroke();

    ctx.font = composeFont(
      theme,
      theme.typography.sizes.lg,
      theme.typography.weights.bold,
    );
    ctx.fillStyle = isHovered
      ? theme.palette.text.bright
      : theme.palette.text.dialogValue;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(button.label, b.x + 12, b.y + b.height / 2);
  }

  renderWelcomeFooter(ctx, viewWidth, viewHeight, options?.buildInfo, env);

  ctx.restore();
};
