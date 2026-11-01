// Game-side facade for the canvas menu. The component (layout, hit test,
// render over the view model) lives in the kit; the adapter in
// ./viewmodels/menu is the only place that reads GameState (through
// MenuLogic). This module keeps the historical entry points — including
// the CanvasMenuItem-carrying hit the controller dispatches — so callers
// work unchanged, with the exact same pixels: parity snapshots cover the
// whole chain.

import type { GameState } from '../types';
import {
  type CanvasMenuItem,
  type MenuCallbacks,
  type MenuView,
  getMenuItemsForView,
} from '../menu/MenuLogic';
import type { UiEnv, UiContext } from '../uikit/env';
import type { Rect } from '../uikit/primitives/geometry';
import { isPointInRect } from '../uikit/primitives/geometry';
import {
  hitTestMenu,
  layoutMenu,
  renderMenu as renderMenuComponent,
  type MenuHit,
  type MenuLayout as KitLayout,
} from '../uikit/components/menu';
import { toMenuViewModel } from './viewmodels/menu';
import { defaultTheme } from '../uikit/theme';
import { i18nTranslator } from './i18nAdapter';
import { uiAssetProvider } from './assets';

export interface MenuItemLayout {
  item: CanvasMenuItem;
  bounds: Rect;
}

export interface MenuLayout {
  view: MenuView;
  panelBounds: Rect;
  headerBounds: Rect & { text: string };
  items: MenuItemLayout[];
  footerBounds?: Rect & { text: string };
}

export interface RenderMenuOptions {
  view?: MenuView;
  hoveredItemId?: string | null;
  buildInfo?: { date: string; hash: string } | null;
  debugMode?: boolean;
  callbacks?: MenuCallbacks;
  env?: UiEnv;
}

export interface MenuHitResult {
  type: 'backdrop' | 'panel' | 'item';
  item?: CanvasMenuItem;
}

export const isPointInBounds = isPointInRect;

const emptyLayout = (view: MenuView): MenuLayout => ({
  view,
  panelBounds: { x: 0, y: 0, width: 0, height: 0 },
  headerBounds: { x: 0, y: 0, width: 0, height: 0, text: '' },
  items: [],
});

const viewFor = (options: RenderMenuOptions | undefined): MenuView =>
  options?.view ?? 'main';

/** The menu items of the current view, for resolving hit ids. */
const menuItems = (
  state: GameState,
  view: MenuView,
  options: RenderMenuOptions | undefined,
): CanvasMenuItem[] =>
  getMenuItemsForView(view, state, options?.callbacks, options?.debugMode);

const kitLayoutFor = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options: RenderMenuOptions | undefined,
): KitLayout | null => {
  if (!state || viewWidth <= 0 || viewHeight <= 0) return null;
  const view = viewFor(options);
  const vm = toMenuViewModel(
    state,
    view,
    options?.callbacks,
    options?.debugMode,
    options?.buildInfo,
  );
  return layoutMenu(vm, { x: 0, y: 0, width: viewWidth, height: viewHeight });
};

export const getMenuLayout = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options?: RenderMenuOptions,
): MenuLayout => {
  const view = viewFor(options);
  const kitLayout = kitLayoutFor(viewWidth, viewHeight, state, options);
  if (!state || !kitLayout) return emptyLayout(view);

  const items = menuItems(state, view, options);
  return {
    view,
    panelBounds: kitLayout.panelBounds,
    headerBounds: kitLayout.headerBounds,
    items: kitLayout.items.map((itemLayout) => ({
      item: items.find((item) => item.id === itemLayout.item.id) ?? items[0],
      bounds: itemLayout.bounds,
    })),
    footerBounds: kitLayout.footerBounds,
  };
};

export const getMenuHit = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options: RenderMenuOptions | undefined,
  x: number,
  y: number,
): MenuHitResult | null => {
  if (!state || viewWidth <= 0 || viewHeight <= 0) return null;
  if (x < 0 || y < 0 || x > viewWidth || y > viewHeight) return null;

  const kitLayout = kitLayoutFor(viewWidth, viewHeight, state, options);
  if (!kitLayout) return null;

  const hit: MenuHit = hitTestMenu(kitLayout, { x, y });
  if (hit?.kind === 'item') {
    const items = menuItems(state, viewFor(options), options);
    const item = items.find((menuItem) => menuItem.id === hit.itemId);
    return item ? { type: 'item', item } : { type: 'panel' };
  }
  if (hit?.kind === 'panel') return { type: 'panel' };
  if (hit?.kind === 'backdrop') return { type: 'backdrop' };
  return null;
};

export const renderMenuModal = (
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options?: RenderMenuOptions,
): void => {
  if (!ctx || !state || viewWidth <= 0 || viewHeight <= 0) return;

  const kitLayout = kitLayoutFor(viewWidth, viewHeight, state, options);
  if (!kitLayout || kitLayout.panelBounds.width === 0) return;

  const ui: UiContext = {
    theme: options?.env?.theme ?? defaultTheme,
    mode: options?.env?.mode ?? 'regular',
    t: options?.env?.t ?? i18nTranslator,
    measure: options?.env?.measure ?? { width: (text) => text.length * 6.5 },
    ctx,
    assets: uiAssetProvider,
  };
  renderMenuComponent(kitLayout, ui, {
    hoveredItemId: options?.hoveredItemId ?? null,
  });
};
