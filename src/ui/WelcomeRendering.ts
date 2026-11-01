// Game-side facade for the welcome (title) screen. The component
// (layout, hit test, render over the view model) lives in the kit; the
// adapter in ./viewmodels/welcome builds the labels and the build-info
// footer, and the background art travels through the asset port. This
// module keeps the historical entry points — including the separate
// background/footer renders the board controller layers — so callers
// work unchanged, with the exact same pixels: parity snapshots cover
// the whole chain.

import type { UiEnv } from '../uikit/env';
import type { Rect } from '../uikit/primitives/geometry';
import {
  hitTestWelcome,
  layoutWelcome,
  renderWelcome as renderWelcomeComponent,
  renderWelcomeBackground as renderWelcomeBackgroundComponent,
  renderWelcomeFooter as renderWelcomeFooterComponent,
  type WelcomeLayout as KitLayout,
} from '../uikit/components/welcome';
import { toWelcomeViewModel, type WelcomeButtonId } from './viewmodels/welcome';
import { defaultTheme } from '../uikit/theme';
import { legacyUiContext, defaultUiEnv } from './env';
import { AssetId, getAssetUrl } from './assets';

export type { WelcomeButtonId } from './viewmodels/welcome';
export { getCoverFitBounds } from '../uikit/components/welcome';

/** The human-authored welcome background, served like other static assets. */
export const WELCOME_BACKGROUND_IMAGE = getAssetUrl(AssetId.welcomeBackground);

/** The dungeon-view background colour, the fallback while art is missing. */
export const WELCOME_FALLBACK_COLOR = defaultTheme.palette.surface.welcome;

export interface WelcomeButtonLayout {
  id: WelcomeButtonId;
  label: string;
  bounds: Rect;
}

export interface WelcomeLayout {
  hasContent: boolean;
  panelBounds: Rect;
  headerText: string;
  buttons: WelcomeButtonLayout[];
  footerBounds: Rect;
  footerText: string;
}

export interface RenderWelcomeOptions {
  buildInfo?: { date: string; hash: string } | null;
  /** Hovered main-view button, for the row highlight. */
  hoveredButton?: WelcomeButtonId | null;
  /**
   * Background image override; when omitted the asset port is asked for
   * the welcome art (tests run without the asset).
   */
  backgroundImage?: HTMLImageElement | null;
  env?: UiEnv;
}

export type WelcomeHitResult = WelcomeButtonId | null;

const kitLayoutFor = (
  viewWidth: number,
  viewHeight: number,
  options: RenderWelcomeOptions | undefined,
): KitLayout => {
  const vm = toWelcomeViewModel(options?.env?.t, options?.buildInfo);
  return layoutWelcome(vm, {
    x: 0,
    y: 0,
    width: viewWidth,
    height: viewHeight,
  });
};

export const getWelcomeLayout = (
  viewWidth: number,
  viewHeight: number,
  options?: RenderWelcomeOptions,
): WelcomeLayout => {
  const kitLayout = kitLayoutFor(viewWidth, viewHeight, options);
  return {
    hasContent: kitLayout.hasContent,
    panelBounds: kitLayout.panelBounds,
    headerText: kitLayout.headerText,
    buttons: kitLayout.buttons.map((button) => ({
      id: button.id as WelcomeButtonId,
      label: button.label,
      bounds: button.bounds,
    })),
    footerBounds: kitLayout.footerBounds,
    footerText: kitLayout.footerText,
  };
};

export const getWelcomeHit = (
  viewWidth: number,
  viewHeight: number,
  x: number,
  y: number,
): WelcomeHitResult => {
  const layout = kitLayoutFor(viewWidth, viewHeight, undefined);
  const hit = hitTestWelcome(layout, { x, y });
  return (hit as WelcomeButtonId | null) ?? null;
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
  const vm = toWelcomeViewModel(options?.env?.t);
  renderWelcomeBackgroundComponent(
    legacyUiContext(ctx, options?.env),
    vm,
    { x: 0, y: 0, width: viewWidth, height: viewHeight },
    {
      hoveredButtonId: options?.hoveredButton ?? null,
      backgroundImage: options?.backgroundImage,
    },
  );
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
  const kitLayout = layoutWelcome(toWelcomeViewModel(env.t, buildInfo), {
    x: 0,
    y: 0,
    width: viewWidth,
    height: viewHeight,
  });
  renderWelcomeFooterComponent(legacyUiContext(ctx, env), kitLayout);
};

export const renderWelcome = (
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  viewHeight: number,
  options?: RenderWelcomeOptions,
): void => {
  const vm = toWelcomeViewModel(options?.env?.t, options?.buildInfo);
  const kitLayout = kitLayoutFor(viewWidth, viewHeight, options);
  if (!kitLayout.hasContent) return;
  renderWelcomeComponent(kitLayout, vm, legacyUiContext(ctx, options?.env), {
    hoveredButtonId: options?.hoveredButton ?? null,
    backgroundImage: options?.backgroundImage,
  });
};
