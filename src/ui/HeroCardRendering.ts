// Game-side facade for the hero cards. The component (layout, hit test,
// render over the view model) lives in the kit; the adapter in
// ./viewmodels/heroCards is the only place that reads GameState. This
// module keeps the historical entry points — including the Hero-carrying
// layout items and hits, and the shared text/rect helpers used by the
// sibling chrome modules — so the board controller, the hit cascade and
// existing tests work unchanged, with the exact same pixels: parity
// snapshots cover the whole chain.

import type { GameState, Hero, Item } from '../types';
import { liveHeroes } from '../hero/HeroLogic';
import type { UiEnv, UiContext } from '../uikit/env';
import {
  measureTextWidth as kitMeasureTextWidth,
  truncateText as kitTruncateText,
} from '../uikit/primitives/text';
import { isPointInRect } from '../uikit/primitives/geometry';
import { drawRoundedRect as kitDrawRoundedRect } from '../uikit/primitives/roundedRect';
import {
  hitTestHeroCards,
  layoutHeroCards,
  renderHeroCards as renderHeroCardsComponent,
  type HeroCardsLayout as KitLayout,
  type HeroCardsViewModel,
} from '../uikit/components/heroCards';
import { toHeroCardsViewModel } from './viewmodels/heroCards';
import { legacyUiEnv, layoutModeForWidth } from './env';
import { uiAssetProvider } from './assets';
import { i18nTranslator } from './i18nAdapter';

// Shared draw helpers now live in the kit; re-exported so existing
// importers keep working until each module is converted.
export const drawRoundedRect = kitDrawRoundedRect;

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

export interface InventoryItemLayout {
  item: Item;
  itemIndex: number;
  bounds: CardBounds;
  nameText: string;
  descriptionText: string;
  useButtonBounds?: CardBounds;
  isUsable: boolean;
  isUsed: boolean;
}

export interface InventoryPopoverLayout {
  hero: Hero;
  bounds: CardBounds;
  closeButtonBounds: CardBounds;
  titleText: string;
  items: InventoryItemLayout[];
}

export interface HeroCardsLayout {
  containerBounds: CardBounds;
  cards: HeroCardLayoutItem[];
  inventories: InventoryPopoverLayout[];
}

export interface RenderHeroCardsOptions {
  hoveredInventoryHeroName?: string | null;
  hoveredCloseHeroName?: string | null;
  hoveredUseItem?: { heroName: string; itemIndex: number } | null;
  env?: UiEnv;
}

export type HeroCardsHitResult =
  | { type: 'inventoryButton'; hero: Hero }
  | { type: 'inventoryClose'; hero: Hero }
  | { type: 'inventoryUseItem'; hero: Hero; item: Item; itemIndex: number }
  | { type: 'inventory'; hero: Hero }
  | { type: 'card'; hero: Hero };

export const isPointInBounds = isPointInRect;

// Per-character width used when no context is available for measuring
// (the historical behavior of this module's helpers).
const FALLBACK_PER_CHAR = 6.5;

export const measureTextWidth = (
  ctx: CanvasRenderingContext2D | null | undefined,
  text: string,
  font: string,
): number => kitMeasureTextWidth(ctx, text, font, FALLBACK_PER_CHAR);

export const truncateText = (
  ctx: CanvasRenderingContext2D | null | undefined,
  text: string,
  maxWidth: number,
  font: string,
): string => kitTruncateText(ctx, text, maxWidth, font, FALLBACK_PER_CHAR);

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
    inventories: [],
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
    inventories: kitLayout.inventories.map((inv) => {
      const hero = heroById(state, inv.heroId) ?? liveHeroes(state)[0];
      const heroInventory = hero.inventory ?? [];
      return {
        hero,
        bounds: inv.bounds,
        closeButtonBounds: inv.closeButtonBounds,
        titleText: inv.titleText,
        items: inv.items.flatMap((itemLayout) => {
          const item = heroInventory[itemLayout.item.itemIndex];
          return item
            ? [
                {
                  item,
                  itemIndex: itemLayout.item.itemIndex,
                  bounds: itemLayout.bounds,
                  nameText: itemLayout.item.nameText,
                  descriptionText: itemLayout.item.descriptionText,
                  useButtonBounds: itemLayout.useButtonBounds,
                  isUsable: itemLayout.item.isUsable,
                  isUsed: itemLayout.item.isUsed,
                },
              ]
            : [];
        }),
      };
    }),
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
    hoveredCloseHeroId: options?.hoveredCloseHeroName ?? null,
    hoveredUseItem: options?.hoveredUseItem
      ? {
          heroId: options.hoveredUseItem.heroName,
          itemIndex: options.hoveredUseItem.itemIndex,
        }
      : null,
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
    case 'inventoryClose':
      return { type: 'inventoryClose', hero };
    case 'inventory':
      return { type: 'inventory', hero };
    case 'card':
      return { type: 'card', hero };
    case 'inventoryUseItem': {
      const item = (hero.inventory ?? [])[hit.itemIndex];
      return item
        ? { type: 'inventoryUseItem', hero, item, itemIndex: hit.itemIndex }
        : null;
    }
  }
  return null;
};
