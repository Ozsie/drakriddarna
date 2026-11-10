// Game-side facade for the hero cards. The component (layout, hit test,
// render over the view model) lives in the kit; the adapter in
// ./viewmodels/heroCards is the only place that reads GameState. This
// module keeps the historical entry points — including the Hero-carrying
// layout items and hits — so the board controller, the hit cascade and
// existing tests work unchanged. The inventory button opens the
// full-screen hero status screen (see ./HeroStatusRendering); the cards
// themselves carry no inventory view, with parity snapshots covering the
// whole chain.

import type { GameState, Hero } from '../types';
import { liveHeroes } from '../hero/HeroLogic';
import type { UiEnv, UiContext } from '@hoard-engine/uikit';
import {
  hitTestHeroCards,
  layoutHeroCards,
  renderHeroCards as renderHeroCardsComponent,
  type HeroCardsLayout as KitLayout,
  type HeroCardsViewModel,
} from '@hoard-engine/uikit';
import { toHeroCardsViewModel } from './viewmodels/heroCards';
import { legacyUiEnv, layoutModeForWidth } from './env';
import { uiAssetProvider } from './assets';
import { i18nTranslator } from './i18nAdapter';

export interface CardBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HeroCardLayoutItem {
  hero: Hero;
  isCurrent: boolean;
  isTarget: boolean;
  bounds: CardBounds;
  inventoryButtonBounds: CardBounds;
  title: string;
  hpText: string;
  actionsText?: string;
  movesText?: string;
  equipmentText?: string;
  weaponText?: string;
  armourText?: string;
  shieldText?: string;
}

export interface HeroCardsLayout {
  containerBounds: CardBounds;
  cards: HeroCardLayoutItem[];
}

export interface RenderHeroCardsOptions {
  hoveredInventoryHeroName?: string | null;
  env?: UiEnv;
}

export type HeroCardsHitResult =
  { type: 'inventoryButton'; hero: Hero } | { type: 'card'; hero: Hero };

/** The compact rule a legacy call implies: the env's mode, else width-derived. */
const legacyCompact = (env: UiEnv | undefined, viewWidth: number): boolean =>
  env?.mode !== undefined
    ? env.mode === 'compact'
    : layoutModeForWidth(viewWidth) === 'compact';

/** Resolves the hero a view-model id refers to, by name. */
const heroById = (state: GameState, heroId: string): Hero | undefined =>
  liveHeroes(state).find((hero) => hero.name === heroId);

const viewModel = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  env?: UiEnv,
): HeroCardsViewModel | null => {
  if (!state || viewWidth <= 0 || viewHeight <= 0) return null;
  return toHeroCardsViewModel(
    state,
    env?.t ?? i18nTranslator,
    legacyCompact(env, viewWidth),
  );
};

const kitLayoutFor = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  env?: UiEnv,
): KitLayout | null => {
  const vm = viewModel(viewWidth, viewHeight, state, env);
  if (!vm || vm.cards.length === 0) return null;
  return layoutHeroCards(vm, {
    x: 0,
    y: 0,
    width: viewWidth,
    height: viewHeight,
  });
};

export const getHeroCardsLayout = (
  viewWidth: number,
  viewHeight: number,
  state?: GameState | null,
  env?: UiEnv,
): HeroCardsLayout => {
  const emptyLayout: HeroCardsLayout = {
    containerBounds: { x: 0, y: 0, width: 0, height: 0 },
    cards: [],
  };

  const kitLayout = kitLayoutFor(viewWidth, viewHeight, state, env);
  if (!state || !kitLayout) return emptyLayout;

  return {
    containerBounds: kitLayout.containerBounds,
    cards: kitLayout.cards.map((item) => ({
      hero: heroById(state, item.card.heroId) ?? liveHeroes(state)[0],
      isCurrent: item.card.isCurrent,
      isTarget: item.card.isTarget,
      bounds: item.bounds,
      inventoryButtonBounds: item.inventoryButtonBounds,
      title: item.card.title,
      hpText: item.card.hpText,
      actionsText: item.card.actionsText,
      movesText: item.card.movesText,
      equipmentText: item.card.equipmentText,
      weaponText: item.card.weaponText,
      armourText: item.card.armourText,
      shieldText: item.card.shieldText,
    })),
  };
};

export const renderHeroCards = (
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  viewHeight: number,
  state?: GameState | null,
  options?: RenderHeroCardsOptions,
): void => {
  if (!state || viewWidth <= 0 || viewHeight <= 0) return;

  const env = legacyUiEnv(options?.env);
  const vm = viewModel(viewWidth, viewHeight, state, options?.env);
  if (!vm || vm.cards.length === 0) return;
  const layout = layoutHeroCards(vm, {
    x: 0,
    y: 0,
    width: viewWidth,
    height: viewHeight,
  });

  const ui: UiContext = {
    theme: env.theme,
    mode: env.mode,
    t: env.t,
    measure: env.measure,
    ctx,
    assets: uiAssetProvider,
  };
  renderHeroCardsComponent(layout, vm, ui, {
    hoveredInventoryHeroId: options?.hoveredInventoryHeroName ?? null,
  });
};

export const getHeroCardsHit = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  screenX = 0,
  screenY = 0,
): HeroCardsHitResult | null => {
  if (!state || viewWidth <= 0 || viewHeight <= 0) return null;

  const kitLayout = kitLayoutFor(viewWidth, viewHeight, state);
  if (!kitLayout) return null;

  const hit = hitTestHeroCards(kitLayout, { x: screenX, y: screenY });
  if (!hit) return null;

  const hero = heroById(state, hit.heroId);
  if (!hero) return null;

  switch (hit.kind) {
    case 'inventoryButton':
      return { type: 'inventoryButton', hero };
    case 'card':
      return { type: 'card', hero };
  }
  return null;
};
