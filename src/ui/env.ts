// Game-side UI environment construction (M3). The board controller builds
// one env per update — theme, layout mode, translator and measure — and the
// renderers receive it through their options. When no env is passed (unit
// tests, layout-only call sites), the fallbacks below reproduce the
// historical behavior exactly: the default theme, the shared translator
// and width-derived compact mode.

import { defaultTheme } from '../uikit/theme';
import type { LayoutMode, TextMeasure, UiEnv } from '../uikit/env';
import { isCompactUi } from './UiMode';
import { i18nTranslator } from './i18nAdapter';

// Per-character approximation used before the kit's cached measure lands
// (M5); layouts still measure through a canvas context today.
// A per-character estimate; the cached, ctx-backed measure lands with the
// canvas-free layouts in M5.
const approximateMeasure: TextMeasure = {
  width: (text) => text.length * 7,
};

/** The env used when a renderer is called without one. */
export const defaultUiEnv: UiEnv = {
  theme: defaultTheme,
  mode: 'regular',
  t: i18nTranslator,
  measure: approximateMeasure,
};

/** Derives the layout mode the way the compact-UI rules always have. */
export const layoutModeForWidth = (viewWidth: number): LayoutMode =>
  isCompactUi(viewWidth) ? 'compact' : 'regular';

/**
 * The mode a renderer should lay out with: the env's when provided,
 * otherwise the historical width-derived rule (legacy call sites and tests).
 */
export const resolveLayoutMode = (
  env: UiEnv | undefined,
  viewWidth: number,
): LayoutMode => env?.mode ?? layoutModeForWidth(viewWidth);

/**
 * Builds an env for one update. The locale participates because the
 * translator must change with it; the theme is identity-stable.
 */
export const createUiEnv = (
  viewWidth: number,
  locale: string,
  mode?: LayoutMode,
): UiEnv => ({
  theme: defaultTheme,
  mode: mode ?? layoutModeForWidth(viewWidth),
  t: i18nTranslator,
  measure: approximateMeasure,
});

/** Identity string for render signatures: changes when a repaint is due. */
export const envIdentity = (env: UiEnv, locale: string): string =>
  `${locale}:${env.mode}:${env.theme === defaultTheme ? 'default' : 'custom'}`;
