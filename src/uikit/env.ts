// The environment and context contracts for kit components
// (docs/ui-kit-spec/02-component-contract.md). Everything a pure layout
// function needs arrives through `UiEnv`; render functions additionally
// hold a canvas context (`UiContext`). The kit defines the shapes only —
// the game side provides the implementations (translator, assets).

import type { UiTheme } from './theme';

/** Width-derived layout density; replaces `isCompactUi` reads. */
export type LayoutMode = 'regular' | 'compact';

/**
 * Translates a message key with optional parameters. Built game-side from
 * the i18n store; its behavior changes with the locale, so render
 * signatures must include the locale.
 */
export type Translator = (
  key: string,
  params?: Record<string, string | number>,
) => string;

/** Opaque, stable identifier for an image the game provides. */
export type AssetId = string;

/** Measures text width for a font; canvas-free so layouts stay pure. */
export interface TextMeasure {
  width(text: string, font: string): number;
}

/** Everything a pure layout function needs. No canvas. */
export interface UiEnv {
  readonly theme: UiTheme;
  readonly mode: LayoutMode;
  readonly t: Translator;
  readonly measure: TextMeasure;
}

/** Images by asset id; components draw a themed fallback when missing. */
export interface AssetProvider {
  get(id: AssetId): CanvasImageSource | undefined;
}

/** Everything a render function needs. */
export interface UiContext extends UiEnv {
  readonly ctx: CanvasRenderingContext2D;
  readonly assets: AssetProvider;
}
