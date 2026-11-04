// Settings component: the welcome screen's Settings sub view (toggle
// rows, volume sliders, plain button rows) and its Credits sub view (the
// rights rows). Kit component per the 02 contract — the view models
// carry every label, toggle state, slider value and dimmed flag
// prebuilt by the game-side adapter; hits are semantic row ids.

import type { Rect, UiTheme } from '@hoard-engine/primitives';
import {
  drawRoundedRect,
  isPointInRect,
  composeFont,
} from '@hoard-engine/primitives';
import { drawModalFrame, drawModalHeader } from '../kit/modalFrame';
import { drawButton } from '../kit/button';
import { drawListRow, listRowStyles } from '../kit/listRow';
import type { UiContext } from '../env';

export type SettingsRowKind = 'toggle' | 'slider' | 'button';

export interface SettingsRowVm {
  /** Hit-test identity: the settings row's id. */
  readonly id: string;
  readonly kind: SettingsRowKind;
  readonly label: string;
  /** A muted channel's slider is dimmed and does not respond to input. */
  readonly dimmed: boolean;
  /** The slider position, 0..1 (slider rows only). */
  readonly value?: number;
}

export interface SettingsViewModel {
  readonly headerText: string;
  readonly backButtonLabel: string;
  readonly rows: readonly SettingsRowVm[];
}

export interface SettingsSliderLayout {
  trackBounds: Rect;
  /** The filled portion of the track, from its left edge to the handle. */
  fillBounds: Rect;
  handleBounds: Rect;
  valueText: string;
}

export interface SettingsRowLayout {
  id: string;
  label: string;
  kind: SettingsRowKind;
  bounds: Rect;
  dimmed: boolean;
  slider?: SettingsSliderLayout;
}

export interface SettingsLayout {
  hasContent: boolean;
  panelBounds: Rect;
  headerText: string;
  rows: SettingsRowLayout[];
  backButtonBounds: Rect;
  backButtonLabel: string;
}

/** Semantic hit: which part of the settings panel is under the point. */
export type SettingsHit =
  | { kind: 'toggle'; rowId: string }
  | { kind: 'slider'; rowId: string }
  | { kind: 'button'; rowId: string }
  | { kind: 'back' }
  | { kind: 'panel' }
  | { kind: 'backdrop' }
  | null;

export interface CreditsRowVm {
  readonly id: string;
  readonly label: string;
  readonly url?: string;
}

export interface CreditsViewModel {
  readonly headerText: string;
  readonly backButtonLabel: string;
  readonly rows: readonly CreditsRowVm[];
}

export interface CreditsRowLayout {
  id: string;
  label: string;
  url?: string;
  bounds: Rect;
}

export interface CreditsLayout {
  hasContent: boolean;
  panelBounds: Rect;
  headerText: string;
  rows: CreditsRowLayout[];
  backButtonBounds: Rect;
  backButtonLabel: string;
}

/** Semantic hit: which credits row is under the point. */
export type CreditsHit =
  | { kind: 'row'; rowId: string; url?: string }
  | { kind: 'back' }
  | { kind: 'panel' }
  | { kind: 'backdrop' }
  | null;

const ROW_RADIUS = 6;
const ROW_HEIGHT = 48;
const ROW_GAP = 8;
const BTN_HEIGHT = 36;
const HEADER_HEIGHT = 48;
const PADDING_X = 18;
const PADDING_Y = 16;

const formatVolumeText = (volume: number): string =>
  `${Math.round(volume * 100)}%`;

/**
 * The slider value for a pointer x position on the track, clamped to
 * [0, 1].
 */
export const getSliderValueFromX = (trackBounds: Rect, x: number): number =>
  Math.max(
    0,
    Math.min(1, (x - trackBounds.x) / Math.max(1, trackBounds.width)),
  );

const getPanelBounds = (
  viewWidth: number,
  viewHeight: number,
  rowCount: number,
): { panel: Rect; btnY: number; maxPanelHeight: number } => {
  const marginX = Math.max(12, Math.floor(viewWidth * 0.05));
  const marginY = Math.max(12, Math.floor(viewHeight * 0.05));
  const panelWidth = Math.min(560, Math.max(340, viewWidth - marginX * 2));
  const maxPanelHeight = Math.min(540, Math.max(220, viewHeight - marginY * 2));
  const rowsHeight = rowCount * ROW_HEIGHT + (rowCount - 1) * ROW_GAP;
  const panelHeight = Math.max(
    220,
    Math.min(
      maxPanelHeight,
      PADDING_Y * 2 + HEADER_HEIGHT + rowsHeight + BTN_HEIGHT + 12 + 12,
    ),
  );
  return {
    panel: {
      x: Math.floor((viewWidth - panelWidth) / 2),
      y: Math.floor((viewHeight - panelHeight) / 2),
      width: panelWidth,
      height: panelHeight,
    },
    btnY:
      Math.floor((viewHeight - panelHeight) / 2) +
      panelHeight -
      PADDING_Y -
      BTN_HEIGHT,
    maxPanelHeight,
  };
};

const emptySettingsLayout = (): SettingsLayout => ({
  hasContent: false,
  panelBounds: { x: 0, y: 0, width: 0, height: 0 },
  headerText: '',
  rows: [],
  backButtonBounds: { x: 0, y: 0, width: 0, height: 0 },
  backButtonLabel: '',
});

export const layoutSettings = (
  vm: SettingsViewModel | null,
  viewBounds: Rect,
): SettingsLayout => {
  const { width: viewWidth, height: viewHeight } = viewBounds;
  if (!vm || viewWidth <= 0 || viewHeight <= 0) return emptySettingsLayout();

  const { panel, btnY } = getPanelBounds(viewWidth, viewHeight, vm.rows.length);
  const contentWidth = panel.width - PADDING_X * 2;
  const valueTextWidth = 48;

  const rowBounds = (index: number): Rect => ({
    x: panel.x + PADDING_X,
    y: panel.y + PADDING_Y + HEADER_HEIGHT + index * (ROW_HEIGHT + ROW_GAP),
    width: contentWidth,
    height: ROW_HEIGHT,
  });

  const sliderFor = (
    index: number,
    volume: number,
    bounds: Rect,
  ): SettingsSliderLayout => {
    const trackBounds: Rect = {
      x: bounds.x + 150,
      y: bounds.y + (ROW_HEIGHT - 8) / 2,
      width: bounds.width - 150 - valueTextWidth - 16,
      height: 8,
    };
    const handleBounds: Rect = {
      x: trackBounds.x + volume * trackBounds.width - 8,
      y: bounds.y + (ROW_HEIGHT - 16) / 2,
      width: 16,
      height: 16,
    };
    return {
      trackBounds,
      fillBounds: {
        x: trackBounds.x,
        y: trackBounds.y,
        width: volume * trackBounds.width,
        height: trackBounds.height,
      },
      handleBounds,
      valueText: formatVolumeText(volume),
    };
  };

  const rows: SettingsRowLayout[] = vm.rows.map((row, index) => ({
    id: row.id,
    label: row.label,
    kind: row.kind,
    bounds: rowBounds(index),
    dimmed: row.dimmed,
    slider:
      row.kind === 'slider'
        ? sliderFor(index, row.value ?? 0, rowBounds(index))
        : undefined,
  }));

  const backWidth = 100;
  return {
    hasContent: true,
    panelBounds: panel,
    headerText: vm.headerText,
    rows,
    backButtonBounds: {
      x: panel.x + panel.width - PADDING_X - backWidth,
      y: btnY,
      width: backWidth,
      height: BTN_HEIGHT,
    },
    backButtonLabel: vm.backButtonLabel,
  };
};

export const hitTestSettings = (
  layout: SettingsLayout,
  point: { x: number; y: number },
): SettingsHit => {
  if (!layout.hasContent) return null;

  for (const row of layout.rows) {
    if (row.kind === 'slider') {
      if (
        row.slider &&
        isPointInRect(point.x, point.y, row.slider.trackBounds) &&
        !row.dimmed
      ) {
        return { kind: 'slider', rowId: row.id };
      }
      continue;
    }
    if (isPointInRect(point.x, point.y, row.bounds)) {
      if (row.kind === 'toggle') {
        return { kind: 'toggle', rowId: row.id };
      }
      if (row.kind === 'button') {
        return { kind: 'button', rowId: row.id };
      }
    }
  }
  if (isPointInRect(point.x, point.y, layout.backButtonBounds)) {
    return { kind: 'back' };
  }
  if (isPointInRect(point.x, point.y, layout.panelBounds)) {
    return { kind: 'panel' };
  }
  return { kind: 'backdrop' };
};

const emptyCreditsLayout = (): CreditsLayout => ({
  hasContent: false,
  panelBounds: { x: 0, y: 0, width: 0, height: 0 },
  headerText: '',
  rows: [],
  backButtonBounds: { x: 0, y: 0, width: 0, height: 0 },
  backButtonLabel: '',
});

export const layoutCredits = (
  vm: CreditsViewModel | null,
  viewBounds: Rect,
): CreditsLayout => {
  const { width: viewWidth, height: viewHeight } = viewBounds;
  if (!vm || viewWidth <= 0 || viewHeight <= 0) return emptyCreditsLayout();

  const { panel, btnY } = getPanelBounds(viewWidth, viewHeight, vm.rows.length);
  const contentWidth = panel.width - PADDING_X * 2;

  const rows: CreditsRowLayout[] = vm.rows.map((row, index) => ({
    id: row.id,
    label: row.label,
    url: row.url,
    bounds: {
      x: panel.x + PADDING_X,
      y: panel.y + PADDING_Y + HEADER_HEIGHT + index * (ROW_HEIGHT + ROW_GAP),
      width: contentWidth,
      height: ROW_HEIGHT,
    },
  }));

  const backWidth = 100;
  return {
    hasContent: true,
    panelBounds: panel,
    headerText: vm.headerText,
    rows,
    backButtonBounds: {
      x: panel.x + panel.width - PADDING_X - backWidth,
      y: btnY,
      width: backWidth,
      height: BTN_HEIGHT,
    },
    backButtonLabel: vm.backButtonLabel,
  };
};

export const hitTestCredits = (
  layout: CreditsLayout,
  point: { x: number; y: number },
): CreditsHit => {
  if (!layout.hasContent) return null;

  for (const row of layout.rows) {
    if (isPointInRect(point.x, point.y, row.bounds)) {
      return { kind: 'row', rowId: row.id, url: row.url };
    }
  }
  if (isPointInRect(point.x, point.y, layout.backButtonBounds)) {
    return { kind: 'back' };
  }
  if (isPointInRect(point.x, point.y, layout.panelBounds)) {
    return { kind: 'panel' };
  }
  return { kind: 'backdrop' };
};

const renderRowShell = (
  ctx: CanvasRenderingContext2D,
  bounds: Rect,
  isHovered: boolean,
  dimmed: boolean,
  theme: UiTheme,
): void => {
  ctx.globalAlpha = dimmed ? theme.alpha.dimmed : 1;
  drawListRow(
    ctx,
    bounds,
    listRowStyles(theme, isHovered ? 'hover' : 'rest'),
    ROW_RADIUS,
  );
};

const renderRowLabel = (
  ctx: CanvasRenderingContext2D,
  bounds: Rect,
  label: string,
  dimmed: boolean,
  theme: UiTheme,
): void => {
  ctx.font = composeFont(
    theme,
    theme.typography.sizes.lg,
    theme.typography.weights.bold,
  );
  ctx.fillStyle = dimmed
    ? theme.palette.text.muted
    : theme.palette.text.dialogValue;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, bounds.x + 12, bounds.y + bounds.height / 2);
};

const renderBackButton = (
  ctx: CanvasRenderingContext2D,
  bounds: Rect,
  label: string,
  isHovered: boolean,
  theme: UiTheme,
): void => {
  drawButton(ctx, bounds, label, theme, {
    variant: 'secondary',
    hovered: isHovered,
  });
};

const renderPanel = (
  ctx: CanvasRenderingContext2D,
  panel: Rect,
  headerText: string,
  theme: UiTheme,
): void => {
  drawModalFrame(ctx, panel, theme);
  drawModalHeader(ctx, panel, headerText, theme);
};

export interface RenderSettingsOptions {
  readonly hoveredRowId?: string | null;
  readonly hoveredBack?: boolean;
}

export const renderSettings = (
  layout: SettingsLayout,
  ui: UiContext,
  options?: RenderSettingsOptions,
): void => {
  const { ctx } = ui;
  const theme: UiTheme = ui.theme;
  if (!ctx || !layout.hasContent) return;

  ctx.save();
  renderPanel(ctx, layout.panelBounds, layout.headerText, theme);

  for (const row of layout.rows) {
    const isHovered = options?.hoveredRowId === row.id;
    renderRowShell(ctx, row.bounds, isHovered, row.dimmed, theme);
    renderRowLabel(ctx, row.bounds, row.label, row.dimmed, theme);

    if (row.kind === 'slider' && row.slider) {
      const { trackBounds, fillBounds, handleBounds, valueText } = row.slider;
      ctx.fillStyle = theme.palette.surface.input;
      drawRoundedRect(
        ctx,
        trackBounds.x,
        trackBounds.y,
        trackBounds.width,
        trackBounds.height,
        4,
      );
      ctx.fill();
      ctx.strokeStyle = theme.palette.border.input;
      ctx.lineWidth = theme.shape.strokeWidth.thin;
      drawRoundedRect(
        ctx,
        trackBounds.x,
        trackBounds.y,
        trackBounds.width,
        trackBounds.height,
        4,
      );
      ctx.stroke();
      ctx.fillStyle = theme.palette.surface.sliderFill;
      drawRoundedRect(
        ctx,
        fillBounds.x,
        fillBounds.y,
        fillBounds.width,
        fillBounds.height,
        4,
      );
      ctx.fill();
      ctx.fillStyle = theme.palette.surface.sliderHandle;
      drawRoundedRect(
        ctx,
        handleBounds.x,
        handleBounds.y,
        handleBounds.width,
        handleBounds.height,
        4,
      );
      ctx.fill();
      ctx.strokeStyle = theme.palette.border.sliderHandle;
      ctx.lineWidth = theme.shape.strokeWidth.thin;
      drawRoundedRect(
        ctx,
        handleBounds.x,
        handleBounds.y,
        handleBounds.width,
        handleBounds.height,
        4,
      );
      ctx.stroke();

      ctx.font = composeFont(
        theme,
        theme.typography.sizes.lg,
        theme.typography.weights.bold,
      );
      ctx.fillStyle = row.dimmed
        ? theme.palette.text.muted
        : theme.palette.text.dialogValue;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        valueText,
        row.bounds.x + row.bounds.width - 12,
        row.bounds.y + row.bounds.height / 2,
      );
    }
    ctx.globalAlpha = 1;
  }

  renderBackButton(
    ctx,
    layout.backButtonBounds,
    layout.backButtonLabel,
    Boolean(options?.hoveredBack),
    theme,
  );
  ctx.restore();
};

export interface RenderCreditsOptions {
  readonly hoveredRowId?: string | null;
  readonly hoveredBack?: boolean;
}

export const renderCredits = (
  layout: CreditsLayout,
  ui: UiContext,
  options?: RenderCreditsOptions,
): void => {
  const { ctx } = ui;
  const theme: UiTheme = ui.theme;
  if (!ctx || !layout.hasContent) return;

  ctx.save();
  renderPanel(ctx, layout.panelBounds, layout.headerText, theme);

  for (const row of layout.rows) {
    const isHovered = options?.hoveredRowId === row.id;
    renderRowShell(ctx, row.bounds, isHovered, false, theme);
    renderRowLabel(ctx, row.bounds, row.label, false, theme);
  }

  renderBackButton(
    ctx,
    layout.backButtonBounds,
    layout.backButtonLabel,
    Boolean(options?.hoveredBack),
    theme,
  );
  ctx.restore();
};
