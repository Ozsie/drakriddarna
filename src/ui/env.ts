// Game-side UI environment construction (M3). The board controller builds
// one env per update — theme, layout mode, translator and measure — and the
// renderers receive it through their options. When no env is passed (unit
// tests, layout-only call sites), the fallbacks below reproduce the
// historical behavior exactly: the default theme, the shared translator
// and width-derived compact mode.

import { defaultTheme } from '../uikit/theme';
import type { LayoutMode, TextMeasure, UiContext, UiEnv } from '../uikit/env';
import { measureTextWidth as kitMeasureTextWidth } from '../uikit/primitives/text';
import { isCompactUi } from './UiMode';
import { i18nTranslator } from './i18nAdapter';
import { uiAssetProvider } from './assets';

// Per-character approximation used before the kit's cached measure lands
// (M5); layouts still measure through a canvas context today.
// A per-character estimate, used when no context is available (headless
// helper calls without a canvas).
const approximateMeasure: TextMeasure = {
  width: (text) => text.length * 7,
};

/**
 * A measure backed by a real 2D context: the same
 * save / font / measureText / restore sequence the kit text primitive
 * performs, so kit layouts measure exactly as the pre-kit code did and
 * recorded logs stay identical when tests pass their recording context.
 */
export const textMeasureFromCtx = (
  ctx: CanvasRenderingContext2D,
): TextMeasure => ({
  width: (text, font) => kitMeasureTextWidth(ctx, text, font, 7),
});

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
  measure?: TextMeasure,
): UiEnv => ({
  theme: defaultTheme,
  mode: layoutModeForWidth(viewWidth),
  t: i18nTranslator,
  measure: measure ?? approximateMeasure,
});

/** Identity string for render signatures: changes when a repaint is due. */
export const envIdentity = (env: UiEnv, locale: string): string =>
  `${locale}:${env.mode}:${env.theme === defaultTheme ? 'default' : 'custom'}`;

/**
 * The env a legacy (pre-kit) call implies: the caller's overrides, else
 * the historical defaults — the default theme, the shared translator,
 * the width-derived compact rule when the module used one, and a
 * context-backed measure when the pre-kit layout measured through a
 * context, else the module's per-character fallback. One shared builder
 * for all game-side facades (the top bar keeps its own variant: its
 * fallback predates env.measure and ignores it without a context).
 */
export interface LegacyEnvOptions {
  /** The view width, for the width-derived compact fallback. */
  readonly viewWidth?: number;
  /** A context to measure through, as the pre-kit layouts did. */
  readonly ctx?: CanvasRenderingContext2D | null;
  /** The module's historical per-character fallback width. */
  readonly fallbackPerChar?: number;
}

export const legacyUiEnv = (
  env: UiEnv | undefined,
  options: LegacyEnvOptions = {},
): UiEnv => ({
  theme: env?.theme ?? defaultTheme,
  mode:
    env?.mode ??
    (options.viewWidth !== undefined &&
    options.viewWidth > 0 &&
    isCompactUi(options.viewWidth)
      ? 'compact'
      : 'regular'),
  t: env?.t ?? i18nTranslator,
  measure: options.ctx
    ? textMeasureFromCtx(options.ctx)
    : (env?.measure ?? {
        width: (text) => text.length * (options.fallbackPerChar ?? 6.5),
      }),
});

/**
 * The UiContext a legacy render call implies: the legacy env plus the
 * canvas context and the UI asset port. Shared by the game-side facades.
 */
export const legacyUiContext = (
  ctx: CanvasRenderingContext2D,
  env: UiEnv | undefined,
  options: LegacyEnvOptions = {},
): UiContext => ({
  ...legacyUiEnv(env, options),
  ctx,
  assets: uiAssetProvider,
});
