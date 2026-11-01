// Game-side facade for the new-game dialog. The component (layout, hit
// test, render over the view model) lives in the kit; the adapter in
// ./viewmodels/newGameDialog is the only place that reads the game side
// (the campaign registry and the game-master levels). This module keeps
// the historical entry points so the board controller and the hit
// cascade work unchanged, with the exact same pixels: parity snapshots
// cover the whole chain.

import type { UiEnv, UiContext } from '../uikit/env';
import type { Rect } from '../uikit/primitives/geometry';
import {
  hitTestNewGameDialog,
  layoutNewGameDialog,
  renderNewGameDialog as renderNewGameDialogComponent,
  type NewGameDialogHit as KitHit,
  type NewGameDialogLayout as KitLayout,
  type NewGameDialogLayoutOptions,
} from '../uikit/components/newGameDialog';
import { toNewGameDialogViewModel } from './viewmodels/newGameDialog';
import { defaultTheme } from '../uikit/theme';
import { i18nTranslator } from './i18nAdapter';
import { uiAssetProvider } from './assets';

export { getCampaignRows, getGameMasterRows } from './viewmodels/newGameDialog';

export interface NewGameDialogRowLayout {
  id: string;
  label: string;
  bounds: Rect;
  selected: boolean;
}

export interface NewGameDialogLayout {
  hasContent: boolean;
  backdropBounds: Rect;
  panelBounds: Rect;
  titleText: string;
  campaignHeaderText: string;
  gameMasterHeaderText: string;
  campaignRows: NewGameDialogRowLayout[];
  gameMasterRows: NewGameDialogRowLayout[];
  checkboxBounds: Rect;
  checkboxLabelText: string;
  speedrunMode: boolean;
  /** Seed label + input, shown only in speedrunner mode. */
  seedLabelText?: string;
  seedInputBounds?: Rect;
  actionButtonBounds: Rect;
  actionButtonLabel: string;
  secondaryButtonBounds: Rect;
  secondaryButtonLabel: string;
}

export interface NewGameDialogOptions {
  selectedCampaignId?: string;
  selectedGameMasterId?: string;
  speedrunMode?: boolean;
  seedInput?: string;
  hoveredCampaignId?: string | null;
  hoveredGameMasterId?: string | null;
  isCheckboxHovered?: boolean;
  hoveredAction?: boolean;
  hoveredSecondary?: boolean;
  env?: UiEnv;
}

export type NewGameDialogHitResult =
  | { type: 'campaign'; campaignId: string }
  | { type: 'gameMaster'; gameMasterId: string }
  | { type: 'checkbox' }
  | { type: 'seedInput' }
  | { type: 'action' }
  | { type: 'secondary' }
  | { type: 'panel' }
  | { type: 'backdrop' };

const legacyEnv = (env: UiEnv | undefined): UiEnv => ({
  theme: env?.theme ?? defaultTheme,
  mode: env?.mode ?? 'regular',
  t: env?.t ?? i18nTranslator,
  measure: env?.measure ?? { width: (text) => text.length * 6.5 },
});

const layoutOptions = (
  options: NewGameDialogOptions | undefined,
): NewGameDialogLayoutOptions => ({
  selectedCampaignId: options?.selectedCampaignId,
  selectedGameMasterId: options?.selectedGameMasterId,
  speedrunMode: options?.speedrunMode,
});

const kitLayoutFor = (
  viewWidth: number,
  viewHeight: number,
  options: NewGameDialogOptions | undefined,
): KitLayout => {
  const env = legacyEnv(options?.env);
  const vm = toNewGameDialogViewModel(env.t);
  return layoutNewGameDialog(
    vm,
    { x: 0, y: 0, width: viewWidth, height: viewHeight },
    layoutOptions(options),
  );
};

export const getNewGameDialogLayout = (
  viewWidth: number,
  viewHeight: number,
  options?: NewGameDialogOptions,
): NewGameDialogLayout => kitLayoutFor(viewWidth, viewHeight, options);

export const getNewGameDialogHit = (
  viewWidth: number,
  viewHeight: number,
  x: number,
  y: number,
  options?: NewGameDialogOptions,
): NewGameDialogHitResult | null => {
  const layout = kitLayoutFor(viewWidth, viewHeight, options);
  const hit: KitHit = hitTestNewGameDialog(layout, { x, y });
  if (!hit) return null;

  switch (hit.kind) {
    case 'campaign':
      return { type: 'campaign', campaignId: hit.id };
    case 'gameMaster':
      return { type: 'gameMaster', gameMasterId: hit.id };
    case 'checkbox':
      return { type: 'checkbox' };
    case 'seedInput':
      return { type: 'seedInput' };
    case 'action':
      return { type: 'action' };
    case 'secondary':
      return { type: 'secondary' };
    case 'panel':
      return { type: 'panel' };
    case 'backdrop':
      return { type: 'backdrop' };
  }
  return null;
};

export const renderNewGameDialog = (
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  viewHeight: number,
  options?: NewGameDialogOptions,
): void => {
  const layout = kitLayoutFor(viewWidth, viewHeight, options);
  if (!layout.hasContent) return;

  const ui: UiContext = {
    ...legacyEnv(options?.env),
    ctx,
    assets: uiAssetProvider,
  };
  renderNewGameDialogComponent(layout, ui, {
    hoveredCampaignId: options?.hoveredCampaignId ?? null,
    hoveredGameMasterId: options?.hoveredGameMasterId ?? null,
    isCheckboxHovered: options?.isCheckboxHovered,
    hoveredAction: options?.hoveredAction,
    hoveredSecondary: options?.hoveredSecondary,
    seedInput: options?.seedInput,
  });
};
