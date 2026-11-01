// Welcome component: the title screen — a cover-fit background image
// (with a themed fallback while the art is missing), a centered panel in
// the dialog style with three buttons, and a build footer. Kit component
// per the 02 contract — the view model carries the header, button labels
// and footer text prebuilt by the game-side adapter; the background art
// arrives through the asset port; hits are the semantic button ids.

import { isPointInRect, type Rect } from '../primitives/geometry';
import { composeFont } from '../primitives/text';
import { drawModalFrame, drawModalHeader } from '../kit/modalFrame';
import { drawListRow, listRowStyles } from '../kit/listRow';
import type { UiContext } from '../env';
import type { UiTheme } from '../theme';

export interface WelcomeButtonVm {
  /** Hit-test identity: the button id. */
  readonly id: string;
  readonly label: string;
}

export interface WelcomeViewModel {
  readonly headerText: string;
  readonly buttons: readonly WelcomeButtonVm[];
  readonly footerText: string;
  /** Asset-port id of the background art. */
  readonly backgroundAssetId: string;
}

export interface WelcomeButtonLayout {
  id: string;
  label: string;
  bounds: Rect;
}

export interface WelcomeLayout {
  hasContent: boolean;
  viewBounds: Rect;
  panelBounds: Rect;
  headerText: string;
  buttons: WelcomeButtonLayout[];
  footerBounds: Rect;
  footerText: string;
}

/** Semantic hit: the pressed welcome button. */
export type WelcomeHit = string | null;

const BUTTON_RADIUS = 6;
const ROW_HEIGHT = 48;
const ROW_GAP = 8;
// Rows never shrink below this, even on very short views.
const MIN_ROW_HEIGHT = 28;
const HEADER_HEIGHT = 48;
const PADDING_X = 18;
const PADDING_Y = 16;

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
): Rect => {
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

export const layoutWelcome = (
  vm: WelcomeViewModel | null,
  viewBounds: Rect,
): WelcomeLayout => {
  const { width: viewWidth, height: viewHeight } = viewBounds;
  const emptyLayout: WelcomeLayout = {
    hasContent: false,
    viewBounds: { x: 0, y: 0, width: 0, height: 0 },
    panelBounds: { x: 0, y: 0, width: 0, height: 0 },
    headerText: '',
    buttons: [],
    footerBounds: { x: 0, y: 0, width: 0, height: 0 },
    footerText: '',
  };
  if (!vm || viewWidth <= 0 || viewHeight <= 0) return emptyLayout;

  const buttons = vm.buttons;
  const marginX = Math.max(12, Math.floor(viewWidth * 0.05));
  const marginY = Math.max(12, Math.floor(viewHeight * 0.05));
  // Same centered sizing rule as the save/load dialog.
  const panelWidth = Math.min(560, Math.max(340, viewWidth - marginX * 2));
  const contentWidth = panelWidth - PADDING_X * 2;

  // Rows shrink when the view is short so the panel always fits.
  const availableHeight = viewHeight - marginY * 2;
  const fixedHeight =
    PADDING_Y * 2 + HEADER_HEIGHT + (buttons.length - 1) * ROW_GAP;
  const rowHeight = Math.max(
    MIN_ROW_HEIGHT,
    Math.min(
      ROW_HEIGHT,
      Math.floor((availableHeight - fixedHeight) / buttons.length),
    ),
  );

  const panelHeight =
    PADDING_Y * 2 +
    HEADER_HEIGHT +
    buttons.length * rowHeight +
    (buttons.length - 1) * ROW_GAP;
  const panelX = Math.floor((viewWidth - panelWidth) / 2);
  const panelY = Math.floor((viewHeight - panelHeight) / 2);

  return {
    hasContent: true,
    viewBounds: { x: 0, y: 0, width: viewWidth, height: viewHeight },
    panelBounds: {
      x: panelX,
      y: panelY,
      width: panelWidth,
      height: panelHeight,
    },
    headerText: vm.headerText,
    buttons: buttons.map((button, index) => ({
      id: button.id,
      label: button.label,
      bounds: {
        x: panelX + PADDING_X,
        y: panelY + PADDING_Y + HEADER_HEIGHT + index * (rowHeight + ROW_GAP),
        width: contentWidth,
        height: rowHeight,
      },
    })),
    footerBounds: {
      x: 0,
      y: viewHeight - 22,
      width: viewWidth,
      height: 10,
    },
    footerText: vm.footerText,
  };
};

export const hitTestWelcome = (
  layout: WelcomeLayout,
  point: { x: number; y: number },
): WelcomeHit => {
  if (!layout.hasContent) return null;
  for (const button of layout.buttons) {
    if (isPointInRect(point.x, point.y, button.bounds)) {
      return button.id;
    }
  }
  return null;
};

export interface RenderWelcomeOptions {
  /** Hovered main-view button, for the row highlight. */
  readonly hoveredButtonId?: string | null;
  /** Background image override; when omitted the asset port is asked. */
  readonly backgroundImage?: HTMLImageElement | null;
}

/**
 * The background layer every welcome view shares: the welcome art
 * cover-fit over the whole canvas, or the flat fallback colour with a
 * subtle vignette while the art is missing.
 */
export const renderWelcomeBackground = (
  ui: UiContext,
  vm: WelcomeViewModel,
  viewBounds: Rect,
  options?: RenderWelcomeOptions,
): void => {
  const { ctx } = ui;
  const theme: UiTheme = ui.theme;
  if (!ctx) return;
  const { width: viewWidth, height: viewHeight } = viewBounds;

  const image =
    options?.backgroundImage !== undefined
      ? options.backgroundImage
      : ui.assets.get(vm.backgroundAssetId);
  if (image) {
    // Image-cache art exposes naturalWidth/Height; other canvas sources
    // fall back to their intrinsic size.
    const dims = image as {
      naturalWidth?: number;
      naturalHeight?: number;
      width?: number;
      height?: number;
    };
    const fit = getCoverFitBounds(
      dims.naturalWidth || dims.width || 0,
      dims.naturalHeight || dims.height || 0,
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
  ui: UiContext,
  layout: WelcomeLayout,
): void => {
  const { ctx } = ui;
  const theme: UiTheme = ui.theme;
  if (!ctx || !layout.footerText) return;
  const { width: viewWidth, height: viewHeight } = layout.viewBounds;
  ctx.fillStyle = theme.palette.text.faint;
  ctx.font = composeFont(theme, theme.typography.sizes.xxs);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  // The baseline sits 12px above the canvas bottom edge.
  ctx.fillText(layout.footerText, viewWidth / 2, viewHeight - 12);
};

export const renderWelcome = (
  layout: WelcomeLayout,
  vm: WelcomeViewModel,
  ui: UiContext,
  options?: RenderWelcomeOptions,
): void => {
  if (!ui.ctx || !layout.hasContent) return;

  const theme: UiTheme = ui.theme;

  ui.ctx.save();

  renderWelcomeBackground(ui, vm, layout.viewBounds, options);

  // Centered modal panel, save/load dialog style.
  const p = layout.panelBounds;
  drawModalFrame(ui.ctx, p, theme);

  // Header line.
  drawModalHeader(ui.ctx, p, layout.headerText, theme);

  // Button rows, dialog row style.
  for (const button of layout.buttons) {
    const isHovered = options?.hoveredButtonId === button.id;
    const b = button.bounds;
    drawListRow(
      ui.ctx,
      b,
      listRowStyles(theme, isHovered ? 'hover' : 'rest'),
      BUTTON_RADIUS,
    );

    ui.ctx.font = composeFont(
      theme,
      theme.typography.sizes.lg,
      theme.typography.weights.bold,
    );
    ui.ctx.fillStyle = isHovered
      ? theme.palette.text.bright
      : theme.palette.text.dialogValue;
    ui.ctx.textAlign = 'left';
    ui.ctx.textBaseline = 'middle';
    ui.ctx.fillText(button.label, b.x + 12, b.y + b.height / 2);
  }

  renderWelcomeFooter(ui, layout);

  ui.ctx.restore();
};
