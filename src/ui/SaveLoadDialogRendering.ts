// Game-side facade for the save/load dialog. The component (layout, hit
// test, render over the view model) lives in the kit; the adapter in
// ./viewmodels/saveLoadDialog is the only place that reads the game side
// (the saved-game items via MenuLogic). This module keeps the historical
// entry points — including the CanvasMenuItem-carrying row hit the
// controller dispatches — so callers work unchanged, with the exact
// same pixels: parity snapshots cover the whole chain.

import type { GameState } from '../types';
import type { CanvasMenuItem, MenuCallbacks } from '../menu/MenuLogic';
import type { UiEnv, UiContext } from '../uikit/env';
import type { Rect } from '../uikit/primitives/geometry';
import {
  hitTestSaveLoadDialog,
  layoutSaveLoadDialog,
  renderSaveLoadDialog as renderSaveLoadDialogComponent,
  type SaveLoadDialogHit as KitHit,
  type SaveLoadDialogLayout as KitLayout,
  type SaveLoadDialogMode,
} from '../uikit/components/saveLoadDialog';
import {
  savedGameItems,
  toSaveLoadDialogViewModel,
} from './viewmodels/saveLoadDialog';
import { defaultTheme } from '../uikit/theme';
import { i18nTranslator } from './i18nAdapter';
import { uiAssetProvider } from './assets';

export type { SaveLoadDialogMode } from '../uikit/components/saveLoadDialog';

export interface SaveLoadDialogRowLayout {
  item: CanvasMenuItem;
  bounds: Rect;
}

export interface SaveLoadDialogLayout {
  hasContent: boolean;
  mode: SaveLoadDialogMode;
  backdropBounds: Rect;
  panelBounds: Rect;
  titleText: string;
  subtitleText: string;
  /** Name input row, shown in save mode. */
  inputBounds?: Rect;
  /** Save rows, shown in load mode. */
  rows: SaveLoadDialogRowLayout[];
  actionButtonBounds?: Rect;
  actionButtonLabel?: string;
  secondaryButtonBounds?: Rect;
  secondaryButtonLabel?: string;
  /** Shown when more saves exist than fit the panel. */
  footerBounds?: Rect;
  footerText: string;
}

export interface RenderSaveLoadDialogOptions {
  saveName?: string;
  hoveredItemId?: string | null;
  hoveredAction?: boolean;
  hoveredSecondary?: boolean;
  env?: UiEnv;
}

export type SaveLoadDialogHitResult =
  | { type: 'row'; item: CanvasMenuItem }
  | { type: 'action' }
  | { type: 'secondary' }
  | { type: 'input' }
  | { type: 'panel' }
  | { type: 'backdrop' };

export type SaveLoadDialogOptions = {
  mode?: SaveLoadDialogMode;
  callbacks?: MenuCallbacks;
} & RenderSaveLoadDialogOptions;

const legacyEnv = (env: UiEnv | undefined): UiEnv => ({
  theme: env?.theme ?? defaultTheme,
  mode: env?.mode ?? 'regular',
  t: env?.t ?? i18nTranslator,
  measure: env?.measure ?? { width: (text) => text.length * 6.5 },
});

const kitLayoutFor = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options: SaveLoadDialogOptions | undefined,
): KitLayout => {
  const mode = options?.mode ?? 'save';
  if (viewWidth <= 0 || viewHeight <= 0) {
    return layoutSaveLoadDialog(
      null,
      { x: 0, y: 0, width: 0, height: 0 },
      legacyEnv(options?.env),
    );
  }
  const env = legacyEnv(options?.env);
  const vm = toSaveLoadDialogViewModel(state, mode, env.t);
  return layoutSaveLoadDialog(
    vm,
    { x: 0, y: 0, width: viewWidth, height: viewHeight },
    env,
  );
};

export const getSaveLoadDialogLayout = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options?: SaveLoadDialogOptions,
): SaveLoadDialogLayout => {
  const kitLayout = kitLayoutFor(viewWidth, viewHeight, state, options);
  // Rows map 1:1 onto the saved-game items, in order.
  const items = savedGameItems(state, options?.callbacks);
  return {
    ...kitLayout,
    rows: kitLayout.rows.map((row, index) => ({
      item: items[index],
      bounds: row.bounds,
    })),
  };
};

export const getSaveLoadDialogHit = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options: { mode?: SaveLoadDialogMode; callbacks?: MenuCallbacks } | undefined,
  x: number,
  y: number,
): SaveLoadDialogHitResult | null => {
  const kitLayout = kitLayoutFor(viewWidth, viewHeight, state, options);
  const hit: KitHit = hitTestSaveLoadDialog(kitLayout, { x, y });
  if (!hit) return null;

  switch (hit.kind) {
    case 'row': {
      const item = savedGameItems(state, options?.callbacks).find(
        (menuItem) => menuItem.id === hit.rowId,
      );
      return item ? { type: 'row', item } : null;
    }
    case 'action':
      return { type: 'action' };
    case 'secondary':
      return { type: 'secondary' };
    case 'input':
      return { type: 'input' };
    case 'panel':
      return { type: 'panel' };
    case 'backdrop':
      return { type: 'backdrop' };
  }
  return null;
};

export const renderSaveLoadDialog = (
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options?: SaveLoadDialogOptions,
): void => {
  const kitLayout = kitLayoutFor(viewWidth, viewHeight, state, options);
  if (!kitLayout.hasContent) return;

  const ui: UiContext = {
    ...legacyEnv(options?.env),
    ctx,
    assets: uiAssetProvider,
  };
  renderSaveLoadDialogComponent(kitLayout, ui, {
    saveName: options?.saveName,
    hoveredRowId: options?.hoveredItemId ?? null,
    hoveredAction: options?.hoveredAction,
    hoveredSecondary: options?.hoveredSecondary,
  });
};
