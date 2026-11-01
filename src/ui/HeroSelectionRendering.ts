// Game-side facade for the hero selection step. The component (layout,
// hit test, render over the view model) lives in the kit; the adapter in
// ./viewmodels/heroSelection owns the campaign roster rules and the
// rename/party helpers the controller drives. This module keeps the
// historical entry points so the board controller and the hit cascade
// work unchanged, with the exact same pixels: parity snapshots cover
// the whole chain.

import type { UiEnv, UiContext } from '../uikit/env';
import {
  hitTestHeroSelection,
  layoutHeroSelection,
  renderHeroSelection as renderHeroSelectionComponent,
  type HeroSelectionHit as KitHit,
  type HeroSelectionLayout,
  type HeroSelectionLayout as KitLayout,
  type HeroSelectionRowLayout,
} from '../uikit/components/heroSelection';
import { toHeroSelectionViewModel } from './viewmodels/heroSelection';
import { legacyUiEnv } from './env';
import { uiAssetProvider } from './assets';

export {
  MAX_HERO_NAME_LENGTH,
  MIN_PARTY_SIZE,
  applyHeroRenameKey,
  buildSelectedHeroes,
  clampHeroName,
  getDefaultSelectedHeroIds,
  getHeroDefaultName,
  getHeroRenameValue,
  getMaxHeroes,
  isHeroSelectionStartEnabled,
  toggleHeroSelection,
} from './viewmodels/heroSelection';

export interface HeroSelectionOptions {
  /** Roster-order ids of the selected heroes. */
  selectedHeroIds: string[];
  /**
   * Player-typed names by hero id. A hero without an entry shows (and
   * edits) the roster default; once edited, the raw typed value shows,
   * empty included.
   */
  names: Record<string, string>;
  focusedHeroId?: string | null;
  hoveredHeroId?: string | null;
  hoveredAction?: boolean;
  hoveredSecondary?: boolean;
  env?: UiEnv;
}

export type HeroSelectionHitResult =
  | { type: 'checkbox'; heroId: string }
  | { type: 'nameInput'; heroId: string }
  | { type: 'row'; heroId: string }
  | { type: 'start' }
  | { type: 'back' }
  | { type: 'panel' }
  | { type: 'backdrop' };

export type { HeroSelectionLayout, HeroSelectionRowLayout };

const kitLayoutFor = (
  viewWidth: number,
  viewHeight: number,
  campaignId: string,
  options: HeroSelectionOptions | undefined,
): KitLayout => {
  const env = legacyUiEnv(options?.env);
  const vm = toHeroSelectionViewModel(campaignId, env.t);
  return layoutHeroSelection(
    vm,
    { x: 0, y: 0, width: viewWidth, height: viewHeight },
    env,
    {
      selectedHeroIds: options?.selectedHeroIds,
      names: options?.names,
      focusedHeroId: options?.focusedHeroId ?? null,
    },
  );
};

export const getHeroSelectionLayout = (
  viewWidth: number,
  viewHeight: number,
  campaignId: string,
  options?: HeroSelectionOptions,
): HeroSelectionLayout =>
  kitLayoutFor(viewWidth, viewHeight, campaignId, options);

export const getHeroSelectionHit = (
  viewWidth: number,
  viewHeight: number,
  campaignId: string,
  x: number,
  y: number,
  options?: HeroSelectionOptions,
): HeroSelectionHitResult | null => {
  const layout = kitLayoutFor(viewWidth, viewHeight, campaignId, options);
  const hit: KitHit = hitTestHeroSelection(layout, { x, y });
  if (!hit) return null;

  switch (hit.kind) {
    case 'checkbox':
      return { type: 'checkbox', heroId: hit.heroId };
    case 'nameInput':
      return { type: 'nameInput', heroId: hit.heroId };
    case 'row':
      return { type: 'row', heroId: hit.heroId };
    case 'start':
      return { type: 'start' };
    case 'back':
      return { type: 'back' };
    case 'panel':
      return { type: 'panel' };
    case 'backdrop':
      return { type: 'backdrop' };
  }
  return null;
};

export const renderHeroSelection = (
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  viewHeight: number,
  campaignId: string,
  options?: HeroSelectionOptions,
): void => {
  const layout = kitLayoutFor(viewWidth, viewHeight, campaignId, options);
  if (!layout.hasContent) return;

  const ui: UiContext = {
    ...legacyUiEnv(options?.env),
    ctx,
    assets: uiAssetProvider,
  };
  renderHeroSelectionComponent(layout, ui, {
    hoveredHeroId: options?.hoveredHeroId ?? null,
    hoveredAction: options?.hoveredAction,
    hoveredSecondary: options?.hoveredSecondary,
  });
};
