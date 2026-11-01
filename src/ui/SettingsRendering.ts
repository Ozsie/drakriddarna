import type { AppSettings } from '../settings/AppSettings';
import {
  drawRoundedRect,
  isPointInBounds,
  type CardBounds,
} from './HeroCardRendering';
import { composeFont } from '../uikit/primitives/text';
import type { UiEnv } from '../uikit/env';
import type { UiTheme } from '../uikit/theme';
import { defaultUiEnv } from './env';
import { i18nTranslator } from './i18nAdapter';

// The welcome screen's Settings sub view (music/audio toggles, volume
// sliders, credits) and its Credits sub screen (the rights rows the
// canvas menu's Rights view shows). Same panel and row styles as the
// welcome screen and the save/load dialog; layout/hit/render split keeps
// both testable without a real canvas.

export type SettingsRowId =
  | 'music'
  | 'audio'
  | 'musicVolume'
  | 'audioVolume'
  | 'credits';

export interface SettingsSliderLayout {
  trackBounds: CardBounds;
  /** The filled portion of the track, from its left edge to the handle. */
  fillBounds: CardBounds;
  handleBounds: CardBounds;
  valueText: string;
}

export interface SettingsRowLayout {
  id: SettingsRowId;
  label: string;
  kind: 'toggle' | 'slider' | 'button';
  bounds: CardBounds;
  /** A muted channel's slider is dimmed and does not respond to input. */
  dimmed: boolean;
  slider?: SettingsSliderLayout;
}

export interface SettingsLayout {
  hasContent: boolean;
  panelBounds: CardBounds;
  headerText: string;
  rows: SettingsRowLayout[];
  backButtonBounds: CardBounds;
  backButtonLabel: string;
}

export interface RenderSettingsOptions {
  /** Kept for option-object symmetry; the render call takes it directly. */
  appSettings?: AppSettings;
  hoveredRowId?: SettingsRowId | null;
  hoveredBack?: boolean;
  env?: UiEnv;
}

export type SettingsHitResult =
  | { type: 'toggle'; rowId: 'music' | 'audio' }
  | { type: 'slider'; rowId: 'musicVolume' | 'audioVolume' }
  | { type: 'credits' }
  | { type: 'back' }
  | { type: 'panel' }
  | { type: 'backdrop' };

// The credits rows: the same content the canvas menu's Rights view shows,
// with the external links next to the row definitions (the renderer only
// draws; the click handler opens the url).
export interface CreditsRowDefinition {
  id: string;
  labelKey: string;
  url?: string;
}

export const CREDITS_ROWS: CreditsRowDefinition[] = [
  {
    id: 'implementation',
    labelKey: 'content.menu.rights.implementation',
  },
  {
    id: 'music',
    labelKey: 'content.menu.rights.musicLicense',
    url: 'https://lostintheforest.bandcamp.com/',
  },
  {
    id: 'sfx',
    labelKey: 'content.menu.rights.sfx',
    url: 'https://rgbin.itch.io/knight-monsters-sounds-pack',
  },
  {
    id: 'graphics',
    labelKey: 'content.menu.rights.graphics',
  },
];

export interface CreditsRowLayout {
  id: string;
  label: string;
  url?: string;
  bounds: CardBounds;
}

export interface CreditsLayout {
  hasContent: boolean;
  panelBounds: CardBounds;
  headerText: string;
  rows: CreditsRowLayout[];
  backButtonBounds: CardBounds;
  backButtonLabel: string;
}

export interface RenderCreditsOptions {
  hoveredRowId?: string | null;
  hoveredBack?: boolean;
  env?: UiEnv;
}

export type CreditsHitResult =
  | { type: 'row'; rowId: string; url?: string }
  | { type: 'back' }
  | { type: 'panel' }
  | { type: 'backdrop' };

const PANEL_RADIUS = 10;
const ROW_RADIUS = 6;
const ROW_HEIGHT = 48;
const ROW_GAP = 8;
const BTN_HEIGHT = 36;
const HEADER_HEIGHT = 48;
const PADDING_X = 18;
const PADDING_Y = 16;

// The On/Off suffix follows the existing menu label pattern
// (getMusicMenuLabel in src/menu/MenuLogic.ts).
const formatToggleLabel = (label: string, on: boolean): string =>
  `${label}: ${on ? 'On' : 'Off'}`;

const formatVolumeText = (volume: number): string =>
  `${Math.round(volume * 100)}%`;

/**
 * The slider value for a pointer x position on the track, clamped to
 * [0, 1].
 */
export const getSliderValueFromX = (
  trackBounds: CardBounds,
  x: number,
): number =>
  Math.max(
    0,
    Math.min(1, (x - trackBounds.x) / Math.max(1, trackBounds.width)),
  );

const getPanelBounds = (
  viewWidth: number,
  viewHeight: number,
  rowCount: number,
): { panel: CardBounds; btnY: number; maxPanelHeight: number } => {
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

export const getSettingsLayout = (
  viewWidth: number,
  viewHeight: number,
  appSettings: AppSettings,
  env?: UiEnv,
): SettingsLayout => {
  const t = env?.t ?? i18nTranslator;
  const emptyLayout: SettingsLayout = {
    hasContent: false,
    panelBounds: { x: 0, y: 0, width: 0, height: 0 },
    headerText: '',
    rows: [],
    backButtonBounds: { x: 0, y: 0, width: 0, height: 0 },
    backButtonLabel: '',
  };
  if (viewWidth <= 0 || viewHeight <= 0) return emptyLayout;

  const { panel, btnY } = getPanelBounds(viewWidth, viewHeight, 5);
  const contentWidth = panel.width - PADDING_X * 2;
  const valueTextWidth = 48;

  const rowBounds = (index: number): CardBounds => ({
    x: panel.x + PADDING_X,
    y: panel.y + PADDING_Y + HEADER_HEIGHT + index * (ROW_HEIGHT + ROW_GAP),
    width: contentWidth,
    height: ROW_HEIGHT,
  });

  const sliderFor = (index: number, volume: number): SettingsSliderLayout => {
    const bounds = rowBounds(index);
    const trackBounds: CardBounds = {
      x: bounds.x + 150,
      y: bounds.y + (ROW_HEIGHT - 8) / 2,
      width: bounds.width - 150 - valueTextWidth - 16,
      height: 8,
    };
    const handleBounds: CardBounds = {
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

  const rows: SettingsRowLayout[] = [
    {
      id: 'music',
      kind: 'toggle',
      label: formatToggleLabel(
        t('content.menu.settings.music'),
        appSettings.musicOn,
      ),
      bounds: rowBounds(0),
      dimmed: false,
    },
    {
      id: 'audio',
      kind: 'toggle',
      label: formatToggleLabel(
        t('content.menu.settings.audio'),
        appSettings.sfxOn,
      ),
      bounds: rowBounds(1),
      dimmed: false,
    },
    {
      id: 'musicVolume',
      kind: 'slider',
      label: t('content.menu.settings.musicVolume'),
      bounds: rowBounds(2),
      dimmed: !appSettings.musicOn,
      slider: sliderFor(2, appSettings.musicVolume),
    },
    {
      id: 'audioVolume',
      kind: 'slider',
      label: t('content.menu.settings.audioVolume'),
      bounds: rowBounds(3),
      dimmed: !appSettings.sfxOn,
      slider: sliderFor(3, appSettings.sfxVolume),
    },
    {
      id: 'credits',
      kind: 'button',
      label: t('content.menu.settings.credits'),
      bounds: rowBounds(4),
      dimmed: false,
    },
  ];

  const backWidth = 100;
  return {
    hasContent: true,
    panelBounds: panel,
    headerText: t('content.menu.settings.header'),
    rows,
    backButtonBounds: {
      x: panel.x + panel.width - PADDING_X - backWidth,
      y: btnY,
      width: backWidth,
      height: BTN_HEIGHT,
    },
    backButtonLabel: t('content.menu.loadGame.buttons.back'),
  };
};

export const getSettingsHit = (
  viewWidth: number,
  viewHeight: number,
  appSettings: AppSettings,
  x: number,
  y: number,
): SettingsHitResult | null => {
  const layout = getSettingsLayout(viewWidth, viewHeight, appSettings);
  if (!layout.hasContent) return null;

  for (const row of layout.rows) {
    if (row.kind === 'slider') {
      if (
        row.slider &&
        isPointInBounds(x, y, row.slider.trackBounds) &&
        !row.dimmed
      ) {
        return {
          type: 'slider',
          rowId: row.id === 'musicVolume' ? 'musicVolume' : 'audioVolume',
        };
      }
      continue;
    }
    if (isPointInBounds(x, y, row.bounds)) {
      if (row.id === 'music' || row.id === 'audio') {
        return { type: 'toggle', rowId: row.id };
      }
      if (row.id === 'credits') {
        return { type: 'credits' };
      }
    }
  }
  if (isPointInBounds(x, y, layout.backButtonBounds)) {
    return { type: 'back' };
  }
  if (isPointInBounds(x, y, layout.panelBounds)) {
    return { type: 'panel' };
  }
  return { type: 'backdrop' };
};

export const getCreditsLayout = (
  viewWidth: number,
  viewHeight: number,
  env?: UiEnv,
): CreditsLayout => {
  const t = env?.t ?? i18nTranslator;
  const emptyLayout: CreditsLayout = {
    hasContent: false,
    panelBounds: { x: 0, y: 0, width: 0, height: 0 },
    headerText: '',
    rows: [],
    backButtonBounds: { x: 0, y: 0, width: 0, height: 0 },
    backButtonLabel: '',
  };
  if (viewWidth <= 0 || viewHeight <= 0) return emptyLayout;

  const { panel, btnY } = getPanelBounds(viewWidth, viewHeight, 4);
  const contentWidth = panel.width - PADDING_X * 2;

  const rows: CreditsRowLayout[] = CREDITS_ROWS.map((definition, index) => ({
    id: definition.id,
    label: t(definition.labelKey),
    url: definition.url,
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
    headerText: t('content.menu.rights.header'),
    rows,
    backButtonBounds: {
      x: panel.x + panel.width - PADDING_X - backWidth,
      y: btnY,
      width: backWidth,
      height: BTN_HEIGHT,
    },
    backButtonLabel: t('content.menu.loadGame.buttons.back'),
  };
};

export const getCreditsHit = (
  viewWidth: number,
  viewHeight: number,
  x: number,
  y: number,
): CreditsHitResult | null => {
  const layout = getCreditsLayout(viewWidth, viewHeight);
  if (!layout.hasContent) return null;

  for (const row of layout.rows) {
    if (isPointInBounds(x, y, row.bounds)) {
      return { type: 'row', rowId: row.id, url: row.url };
    }
  }
  if (isPointInBounds(x, y, layout.backButtonBounds)) {
    return { type: 'back' };
  }
  if (isPointInBounds(x, y, layout.panelBounds)) {
    return { type: 'panel' };
  }
  return { type: 'backdrop' };
};

const renderRowShell = (
  ctx: CanvasRenderingContext2D,
  bounds: CardBounds,
  isHovered: boolean,
  dimmed: boolean,
  theme: UiTheme,
): void => {
  ctx.globalAlpha = dimmed ? theme.alpha.dimmed : 1;
  ctx.fillStyle = isHovered
    ? theme.palette.surface.rowHover
    : theme.palette.surface.row;
  drawRoundedRect(
    ctx,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    ROW_RADIUS,
  );
  ctx.fill();
  ctx.strokeStyle = isHovered
    ? theme.palette.border.rowHover
    : theme.palette.border.row;
  ctx.lineWidth = theme.shape.strokeWidth.thin;
  drawRoundedRect(
    ctx,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    ROW_RADIUS,
  );
  ctx.stroke();
};

const renderRowLabel = (
  ctx: CanvasRenderingContext2D,
  bounds: CardBounds,
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
  bounds: CardBounds,
  label: string,
  isHovered: boolean,
  theme: UiTheme,
): void => {
  ctx.fillStyle = isHovered
    ? theme.palette.surface.buttonSecondaryHover
    : theme.palette.surface.buttonSecondary;
  drawRoundedRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, 6);
  ctx.fill();
  ctx.strokeStyle = theme.palette.border.buttonSecondary;
  ctx.lineWidth = theme.shape.strokeWidth.thin;
  drawRoundedRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, 6);
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
    label,
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
};

const renderPanel = (
  ctx: CanvasRenderingContext2D,
  panel: CardBounds,
  headerText: string,
  theme: UiTheme,
): void => {
  ctx.fillStyle = theme.palette.surface.panelDialog;
  drawRoundedRect(
    ctx,
    panel.x,
    panel.y,
    panel.width,
    panel.height,
    PANEL_RADIUS,
  );
  ctx.fill();
  ctx.strokeStyle = theme.palette.border.panelDialog;
  ctx.lineWidth = theme.shape.strokeWidth.regular;
  drawRoundedRect(
    ctx,
    panel.x,
    panel.y,
    panel.width,
    panel.height,
    PANEL_RADIUS,
  );
  ctx.stroke();
  ctx.fillStyle = theme.palette.text.headerDialog;
  ctx.font = composeFont(
    theme,
    theme.typography.sizes.title,
    theme.typography.weights.bold,
  );
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(headerText, panel.x + 18, panel.y + 14);
};

export const renderSettings = (
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  viewHeight: number,
  appSettings: AppSettings,
  options?: RenderSettingsOptions,
): void => {
  const env = options?.env ?? defaultUiEnv;
  const layout = getSettingsLayout(viewWidth, viewHeight, appSettings, env);
  if (!layout.hasContent) return;

  const theme = env.theme;

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

export const renderCredits = (
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  viewHeight: number,
  options?: RenderCreditsOptions,
): void => {
  const env = options?.env ?? defaultUiEnv;
  const layout = getCreditsLayout(viewWidth, viewHeight, env);
  if (!layout.hasContent) return;

  const theme = env.theme;

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
