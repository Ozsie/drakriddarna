// Game-side facade for the settings and credits views. The component
// (layout, hit test, render over the view models) lives in the kit; the
// adapter in ./viewmodels/settings is the only place that reads
// AppSettings and owns the credits row definitions. This module keeps
// the historical entry points so the board controller and the hit
// cascade work unchanged, with the exact same pixels: parity snapshots
// cover the whole chain.

import type { AppSettings } from '../settings/AppSettings';
import type { UiEnv, UiContext } from '../uikit/env';
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
} from '../uikit/components/settings';
import {
  toCreditsViewModel,
  toSettingsViewModel,
  type SettingsRowId,
} from './viewmodels/settings';
import { defaultTheme } from '../uikit/theme';
import { defaultUiEnv } from './env';
import { i18nTranslator } from './i18nAdapter';
import { uiAssetProvider } from './assets';

export type { SettingsRowId } from './viewmodels/settings';
export type { CreditsRowDefinition } from './viewmodels/settings';
export { CREDITS_ROWS } from './viewmodels/settings';
export { getSliderValueFromX } from '../uikit/components/settings';

export type {
  CreditsLayout,
  CreditsRowLayout,
  SettingsLayout,
  SettingsRowLayout,
  SettingsSliderLayout,
} from '../uikit/components/settings';

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

const legacyUi = (
  ctx: CanvasRenderingContext2D,
  env: UiEnv | undefined,
): UiContext => ({
  theme: env?.theme ?? defaultTheme,
  mode: env?.mode ?? 'regular',
  t: env?.t ?? i18nTranslator,
  measure: env?.measure ?? { width: (text) => text.length * 6.5 },
  ctx,
  assets: uiAssetProvider,
});

const settingsLayoutFor = (
  viewWidth: number,
  viewHeight: number,
  appSettings: AppSettings,
  env?: UiEnv,
): KitSettingsLayout =>
  layoutSettings(toSettingsViewModel(appSettings, env?.t ?? i18nTranslator), {
    x: 0,
    y: 0,
    width: viewWidth,
    height: viewHeight,
  });

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
      return { type: 'toggle', rowId: hit.rowId as 'music' | 'audio' };
    case 'slider':
      return {
        type: 'slider',
        rowId: hit.rowId as 'musicVolume' | 'audioVolume',
      };
    case 'credits':
      return { type: 'credits' };
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

  renderSettingsComponent(layout, legacyUi(ctx, env), {
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

  renderCreditsComponent(layout, legacyUi(ctx, env), {
    hoveredRowId: options?.hoveredRowId ?? null,
    hoveredBack: options?.hoveredBack,
  });
};
