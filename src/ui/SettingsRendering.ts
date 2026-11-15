// Game-side facade for the settings and credits views. The component
// (layout, hit test, render over the view models) lives in the kit; the
// adapter in ./viewmodels/settings is the only place that reads
// AppSettings and owns the credits row definitions. This module keeps
// the historical entry points so the board controller and the hit
// cascade work unchanged, compacting rows only when the kit layout would
// otherwise place them below the Back button.

import type { AppSettings } from '../settings/AppSettings';
import type { UiEnv } from '@hoard-engine/uikit';
import {
  hitTestCredits,
  hitTestSettings,
  layoutCredits,
  layoutSettings,
  renderCredits as renderCreditsComponent,
  renderSettings as renderSettingsComponent,
  type CreditsHit as KitCreditsHit,
  type CreditsLayout,
  type CreditsLayout as KitCreditsLayout,
  type SettingsHit as KitSettingsHit,
  type SettingsLayout,
  type SettingsLayout as KitSettingsLayout,
} from '@hoard-engine/uikit';
import {
  toCreditsViewModel,
  toSettingsViewModel,
  type SettingsRowId,
} from './viewmodels/settings';
import { legacyUiContext, defaultUiEnv } from './env';
import { i18nTranslator } from './i18nAdapter';

export type { SettingsRowId } from './viewmodels/settings';
export type { CreditsRowDefinition } from './viewmodels/settings';
export { CREDITS_ROWS } from './viewmodels/settings';
export { getSliderValueFromX } from '@hoard-engine/uikit';

export type {
  CreditsLayout,
  CreditsRowLayout,
  SettingsLayout,
  SettingsRowLayout,
  SettingsSliderLayout,
} from '@hoard-engine/uikit';

export interface RenderSettingsOptions {
  /** Kept for option-object symmetry; the render call takes it directly. */
  appSettings?: AppSettings;
  hoveredRowId?: SettingsRowId | null;
  hoveredBack?: boolean;
  env?: UiEnv;
}

export type SettingsHitResult =
  | { type: 'toggle'; rowId: 'music' | 'audio' | 'debug' | 'renderMode' }
  | { type: 'slider'; rowId: 'musicVolume' | 'audioVolume' }
  | { type: 'button'; rowId: 'language' | 'credits' }
  | { type: 'back' }
  | { type: 'panel' }
  | { type: 'backdrop' };

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

const settingsLayoutFor = (
  viewWidth: number,
  viewHeight: number,
  appSettings: AppSettings,
  env?: UiEnv,
): KitSettingsLayout => {
  const layout = layoutSettings(
    toSettingsViewModel(appSettings, env?.t ?? i18nTranslator),
    {
      x: 0,
      y: 0,
      width: viewWidth,
      height: viewHeight,
    },
  );
  if (layout.rows.length === 0) return layout;

  const firstRow = layout.rows[0];
  const secondRow = layout.rows[1];
  const rowGap =
    firstRow && secondRow
      ? secondRow.bounds.y - firstRow.bounds.y - firstRow.bounds.height
      : 0;
  const availableHeight =
    layout.backButtonBounds.y -
    firstRow.bounds.y -
    rowGap * Math.max(0, layout.rows.length - 1) -
    rowGap;
  const rowHeight = Math.floor(availableHeight / layout.rows.length);
  if (rowHeight >= firstRow.bounds.height) return layout;

  return {
    ...layout,
    rows: layout.rows.map((row, index) => {
      const y = firstRow.bounds.y + index * (rowHeight + rowGap);
      const trackBounds = row.slider
        ? {
            ...row.slider.trackBounds,
            y: y + (rowHeight - row.slider.trackBounds.height) / 2,
          }
        : undefined;
      const fillBounds = row.slider
        ? {
            ...row.slider.fillBounds,
            y: trackBounds?.y ?? row.slider.fillBounds.y,
          }
        : undefined;
      const handleBounds = row.slider
        ? {
            ...row.slider.handleBounds,
            y: y + (rowHeight - row.slider.handleBounds.height) / 2,
          }
        : undefined;
      return {
        ...row,
        bounds: { ...row.bounds, y, height: rowHeight },
        slider:
          row.slider && trackBounds && fillBounds && handleBounds
            ? { ...row.slider, trackBounds, fillBounds, handleBounds }
            : row.slider,
      };
    }),
  };
};

const creditsLayoutFor = (
  viewWidth: number,
  viewHeight: number,
  env?: UiEnv,
): KitCreditsLayout =>
  layoutCredits(toCreditsViewModel(env?.t ?? i18nTranslator), {
    x: 0,
    y: 0,
    width: viewWidth,
    height: viewHeight,
  });

export const getSettingsLayout = (
  viewWidth: number,
  viewHeight: number,
  appSettings: AppSettings,
  env?: UiEnv,
): SettingsLayout => settingsLayoutFor(viewWidth, viewHeight, appSettings, env);

export const getSettingsHit = (
  viewWidth: number,
  viewHeight: number,
  appSettings: AppSettings,
  x: number,
  y: number,
): SettingsHitResult | null => {
  const layout = settingsLayoutFor(viewWidth, viewHeight, appSettings);
  const hit: KitSettingsHit = hitTestSettings(layout, { x, y });
  if (!hit) return null;

  switch (hit.kind) {
    case 'toggle':
      return {
        type: 'toggle',
        rowId: hit.rowId as 'music' | 'audio' | 'debug' | 'renderMode',
      };
    case 'slider':
      return {
        type: 'slider',
        rowId: hit.rowId as 'musicVolume' | 'audioVolume',
      };
    case 'button':
      return {
        type: 'button',
        rowId: hit.rowId as 'language' | 'credits',
      };
    case 'back':
      return { type: 'back' };
    case 'panel':
      return { type: 'panel' };
    case 'backdrop':
      return { type: 'backdrop' };
  }
  return null;
};

export const getCreditsLayout = (
  viewWidth: number,
  viewHeight: number,
  env?: UiEnv,
): CreditsLayout => creditsLayoutFor(viewWidth, viewHeight, env);

export const getCreditsHit = (
  viewWidth: number,
  viewHeight: number,
  x: number,
  y: number,
): CreditsHitResult | null => {
  const layout = creditsLayoutFor(viewWidth, viewHeight);
  const hit: KitCreditsHit = hitTestCredits(layout, { x, y });
  if (!hit) return null;

  switch (hit.kind) {
    case 'row':
      return { type: 'row', rowId: hit.rowId, url: hit.url };
    case 'back':
      return { type: 'back' };
    case 'panel':
      return { type: 'panel' };
    case 'backdrop':
      return { type: 'backdrop' };
  }
  return null;
};

export const renderSettings = (
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  viewHeight: number,
  appSettings: AppSettings,
  options?: RenderSettingsOptions,
): void => {
  const env = options?.env ?? defaultUiEnv;
  const layout = settingsLayoutFor(viewWidth, viewHeight, appSettings, env);
  if (!layout.hasContent) return;

  renderSettingsComponent(layout, legacyUiContext(ctx, env), {
    hoveredRowId: options?.hoveredRowId ?? null,
    hoveredBack: options?.hoveredBack,
  });
};

export const renderCredits = (
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  viewHeight: number,
  options?: RenderCreditsOptions,
): void => {
  const env = options?.env ?? defaultUiEnv;
  const layout = creditsLayoutFor(viewWidth, viewHeight, env);
  if (!layout.hasContent) return;

  renderCreditsComponent(layout, legacyUiContext(ctx, env), {
    hoveredRowId: options?.hoveredRowId ?? null,
    hoveredBack: options?.hoveredBack,
  });
};
