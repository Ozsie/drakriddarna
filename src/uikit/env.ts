// The environment and context contracts for kit components
// (docs/ui-kit-spec/02-component-contract.md). Everything a pure layout
// function needs arrives through `UiEnv`; render functions additionally
// hold a canvas context (`UiContext`). The kit defines the shapes only —
// the game side provides the implementations (translator, assets).

import type { UiTheme } from '@hoard-engine/primitives';

/** Width-derived layout density; replaces `isCompactUi` reads. */
export type LayoutMode = 'regular' | 'compact';

/**
 * Size of the square a collapsed compact panel collapses into (the
 * events and diary corner panels). Lives here so the kit components and
 * the game-side `UiMode` share one value.
 */
export const COMPACT_TOGGLE_SIZE = 40;

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

/**
 * A sprite frame on a sheet asset: row-major square frames of `size`,
 * picked by zero-based index. The asset id resolves through the asset
 * port (the game side maps ids to loaded images).
 */
export interface SpriteRef {
  readonly assetId: string;
  readonly index: number;
  readonly size: number;
}

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
