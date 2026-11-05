// Game-side facade for the canvas debug menu (and its event view). The
// component (layout, hit test, render over the view model) lives in the
// kit; the adapter in ./viewmodels/debugMenu is the only place that
// reads GameState (through MenuLogic). This module keeps the historical
// entry points — including the CanvasMenuItem-carrying hit the
// controller dispatches — so callers work unchanged, with the exact
// same pixels: parity snapshots cover the whole chain.

import type { GameState } from '../types';
import {
  type CanvasMenuItem,
  type DebugMenuView,
  type MenuCallbacks,
  getDebugMenuItemsForView,
} from '../menu/MenuLogic';
import type { UiEnv } from '@hoard-engine/uikit';
import type { Rect } from '@hoard-engine/uikit';
import {
  hitTestMenu,
  layoutMenu,
  renderMenu as renderMenuComponent,
  type MenuHit,
  type MenuLayout as KitLayout,
} from '@hoard-engine/uikit';
import { toDebugMenuViewModel } from './viewmodels/debugMenu';
import { legacyUiContext } from './env';

export interface DebugMenuItemLayout {
  item: CanvasMenuItem;
  bounds: Rect;
}

export interface DebugMenuLayout {
  view: DebugMenuView;
  panelBounds: Rect;
  headerBounds: Rect & { text: string };
  items: DebugMenuItemLayout[];
}

export interface RenderDebugMenuOptions {
  view?: DebugMenuView;
  hoveredItemId?: string | null;
  callbacks?: MenuCallbacks;
  env?: UiEnv;
}

export interface DebugMenuHitResult {
  type: 'backdrop' | 'panel' | 'item';
  item?: CanvasMenuItem;
}

const emptyLayout = (view: DebugMenuView): DebugMenuLayout => ({
  view,
  panelBounds: { x: 0, y: 0, width: 0, height: 0 },
  headerBounds: { x: 0, y: 0, width: 0, height: 0, text: '' },
  items: [],
});

const viewFor = (options: RenderDebugMenuOptions | undefined): DebugMenuView =>
  options?.view ?? 'debug';

/** The menu items of the current view, for resolving hit ids. */
const debugMenuItems = (
  state: GameState,
  view: DebugMenuView,
  options: RenderDebugMenuOptions | undefined,
): CanvasMenuItem[] =>
  getDebugMenuItemsForView(view, state, options?.callbacks);

const kitLayoutFor = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options: RenderDebugMenuOptions | undefined,
): KitLayout | null => {
  if (!state || viewWidth <= 0 || viewHeight <= 0) return null;
  const view = viewFor(options);
  const vm = toDebugMenuViewModel(state, view, options?.callbacks);
  return layoutMenu(vm, { x: 0, y: 0, width: viewWidth, height: viewHeight });
};

export const getDebugMenuLayout = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options?: RenderDebugMenuOptions,
): DebugMenuLayout => {
  const view = viewFor(options);
  const kitLayout = kitLayoutFor(viewWidth, viewHeight, state, options);
  if (!state || !kitLayout) return emptyLayout(view);

  const items = debugMenuItems(state, view, options);
  return {
    view,
    panelBounds: kitLayout.panelBounds,
    headerBounds: kitLayout.headerBounds,
    items: kitLayout.items.map((itemLayout) => ({
      item: items.find((item) => item.id === itemLayout.item.id) ?? items[0],
      bounds: itemLayout.bounds,
    })),
  };
};

export const getDebugMenuHit = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options: RenderDebugMenuOptions | undefined,
  x: number,
  y: number,
): DebugMenuHitResult | null => {
  if (!state || viewWidth <= 0 || viewHeight <= 0) return null;
  if (x < 0 || y < 0 || x > viewWidth || y > viewHeight) return null;

  const kitLayout = kitLayoutFor(viewWidth, viewHeight, state, options);
  if (!kitLayout) return null;

  const hit: MenuHit = hitTestMenu(kitLayout, { x, y });
  if (hit?.kind === 'item') {
    const items = debugMenuItems(state, viewFor(options), options);
    const item = items.find((menuItem) => menuItem.id === hit.itemId);
    return item ? { type: 'item', item } : { type: 'panel' };
  }
  if (hit?.kind === 'panel') return { type: 'panel' };
  if (hit?.kind === 'backdrop') return { type: 'backdrop' };
  return null;
};

export const renderDebugMenuModal = (
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options?: RenderDebugMenuOptions,
): void => {
  if (!ctx || !state || viewWidth <= 0 || viewHeight <= 0) return;

  const kitLayout = kitLayoutFor(viewWidth, viewHeight, state, options);
  if (!kitLayout || kitLayout.panelBounds.width === 0) return;

  renderMenuComponent(kitLayout, legacyUiContext(ctx, options?.env), {
    hoveredItemId: options?.hoveredItemId ?? null,
  });
};
