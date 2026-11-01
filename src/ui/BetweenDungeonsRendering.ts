// Game-side facade for the between-dungeons dialog. The component
// (layout, hit test, render over the view model) lives in the kit; the
// adapter in ./viewmodels/betweenDungeons is the only place that reads
// GameState and owns the dialog's rules (score texts, level-up XP lines,
// tradable items, the high-score merge). This module keeps the historical
// entry points — including the Hero/Item-carrying layout items and the
// typed hit results the controller dispatches — so the controller, the
// hit cascade and existing tests work unchanged, with the exact same
// pixels: parity snapshots cover the whole chain.

import type {
  GameState,
  Hero,
  Item,
  PartyWipeAction,
  TradeItemSlot,
} from '../types';
import type { UiEnv, UiContext } from '../uikit/env';
import type { Rect } from '../uikit/primitives/geometry';
import {
  hitTestBetweenDungeons,
  layoutBetweenDungeons,
  renderBetweenDungeons as renderBetweenDungeonsComponent,
  type BetweenDungeonsHit as KitHit,
  type BetweenDungeonsLayout as KitLayout,
} from '../uikit/components/betweenDungeons';
import { toBetweenDungeonsViewModel } from './viewmodels/betweenDungeons';
import { getHeroTradableItems } from '../dungeon/BetweenDungeonsLogic';
import { defaultTheme } from '../uikit/theme';
import { actorColour } from './theme';
import { defaultUiEnv } from './env';
import { i18nTranslator } from './i18nAdapter';
import { uiAssetProvider } from './assets';

export interface BetweenDungeonsLayout {
  hasContent: boolean;
  step: 'levelUp' | 'trade' | 'campaignComplete' | 'partyWipe';
  backdropBounds: Rect;
  panelBounds: Rect;
  titleText: string;
  subtitleText: string;
  scoreSection?: KitLayout['scoreSection'];
  campaignComplete?: KitLayout['campaignComplete'];
  wipeButtons?: PartyWipeButtonLayout[];
  wipeHighScores?: KitLayout['wipeHighScores'];
  heroes: HeroSectionLayoutItem[];
  actionButtonBounds: Rect;
  actionButtonLabel: string;
  secondaryButtonBounds?: Rect;
  secondaryButtonLabel?: string;
  giveButtons: KitLayout['giveButtons'];
}

export interface PartyWipeButtonLayout {
  action: PartyWipeAction;
  bounds: Rect;
  labelText: string;
  descriptionLines: string[];
}

export interface HeroSectionLayoutItem {
  heroIndex: number;
  hero: Hero;
  bounds: Rect;
  title: string;
  levelBadge: string;
  isLeveledUp: boolean;
  xpText: string;
  levelMeaningText: string;
  items: TradeItemLayoutItem[];
}

export interface TradeItemLayoutItem {
  heroIndex: number;
  slot: TradeItemSlot;
  itemIndex: number;
  item: Item;
  category: 'weapon' | 'armour' | 'shield' | 'inventory';
  bounds: Rect;
  nameText: string;
  isSelected: boolean;
}

export interface RenderBetweenDungeonsOptions {
  env?: UiEnv;
  hoveredAction?: boolean;
  hoveredSecondary?: boolean;
  hoveredItem?: {
    heroIndex: number;
    slot?: TradeItemSlot;
    itemIndex?: number;
  } | null;
  hoveredGiveHeroIndex?: number | null;
  hoveredWipeAction?: PartyWipeAction | null;
}

export type BetweenDungeonsHitResult =
  | { type: 'actionButton' }
  | { type: 'secondaryButton' }
  | { type: 'item'; heroIndex: number; slot: TradeItemSlot; itemIndex: number }
  | { type: 'giveItem'; targetHeroIndex: number }
  | { type: 'wipeButton'; action: PartyWipeAction }
  | { type: 'panel' }
  | { type: 'backdrop' };

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
  env: UiEnv | undefined,
): KitLayout => {
  const resolved = legacyEnv(env);
  const vm = toBetweenDungeonsViewModel(state, resolved.t);
  return layoutBetweenDungeons(
    vm,
    { x: 0, y: 0, width: viewWidth, height: viewHeight },
    resolved.theme,
  );
};

/** Maps a kit layout onto the historical Hero/Item-carrying shapes. */
const toLegacyLayout = (
  kitLayout: KitLayout,
  state: GameState,
): BetweenDungeonsLayout => {
  const heroList = state.heroes as Hero[];
  const cc = kitLayout.campaignComplete;

  return {
    ...kitLayout,
    campaignComplete: cc
      ? {
          ...cc,
          heroRows: cc.heroRows.map((row) => ({
            ...row,
            colour: actorColour(row.colourKey),
          })),
        }
      : null,
    wipeButtons: kitLayout.wipeButtons?.map((button) => ({
      ...button,
      action: button.action as PartyWipeAction,
    })),
    heroes: kitLayout.heroes.map((heroSection) => {
      const hero = heroList[heroSection.heroIndex];
      const tradableItems = getHeroTradableItems(hero);
      return {
        heroIndex: heroSection.heroIndex,
        hero,
        bounds: heroSection.bounds,
        title: heroSection.title,
        levelBadge: heroSection.levelBadge,
        isLeveledUp: heroSection.isLeveledUp,
        xpText: heroSection.xpText,
        levelMeaningText: heroSection.levelMeaningText,
        items: heroSection.items.map((item, itemIdx) => ({
          heroIndex: item.heroIndex,
          slot: item.slot as TradeItemSlot,
          itemIndex: item.itemIndex,
          item: tradableItems[itemIdx]?.item,
          category: tradableItems[itemIdx]?.category ?? 'inventory',
          bounds: item.bounds,
          nameText: item.nameText,
          isSelected: item.isSelected,
        })),
      };
    }),
  };
};

export const getBetweenDungeonsLayout = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  env?: UiEnv,
): BetweenDungeonsLayout => {
  const kitLayout = kitLayoutFor(viewWidth, viewHeight, state, env);
  if (!state || !kitLayout.hasContent) {
    return {
      hasContent: false,
      step: 'levelUp',
      backdropBounds: kitLayout.backdropBounds,
      panelBounds: kitLayout.panelBounds,
      titleText: kitLayout.titleText,
      subtitleText: kitLayout.subtitleText,
      heroes: [],
      actionButtonBounds: kitLayout.actionButtonBounds,
      actionButtonLabel: kitLayout.actionButtonLabel,
      giveButtons: kitLayout.giveButtons,
    };
  }
  return toLegacyLayout(kitLayout, state);
};

export const getBetweenDungeonsHit = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  x: number,
  y: number,
): BetweenDungeonsHitResult | null => {
  if (!state || !state.betweenDungeons || viewWidth <= 0 || viewHeight <= 0) {
    return null;
  }

  const kitLayout = kitLayoutFor(viewWidth, viewHeight, state, undefined);
  if (!kitLayout.hasContent) return null;

  const hit: KitHit = hitTestBetweenDungeons(kitLayout, { x, y });
  if (!hit) return null;

  switch (hit.kind) {
    case 'actionButton':
      return { type: 'actionButton' };
    case 'secondaryButton':
      return { type: 'secondaryButton' };
    case 'item':
      return {
        type: 'item',
        heroIndex: hit.heroIndex,
        slot: hit.slot as TradeItemSlot,
        itemIndex: hit.itemIndex,
      };
    case 'giveItem':
      return { type: 'giveItem', targetHeroIndex: hit.targetHeroIndex };
    case 'wipeButton':
      return { type: 'wipeButton', action: hit.action as PartyWipeAction };
    case 'panel':
      return { type: 'panel' };
    case 'backdrop':
      return { type: 'backdrop' };
  }
  return null;
};

export const renderBetweenDungeons = (
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options?: RenderBetweenDungeonsOptions,
): void => {
  if (!state || !state.betweenDungeons || viewWidth <= 0 || viewHeight <= 0) {
    return;
  }

  const env = options?.env ?? defaultUiEnv;
  const resolved = legacyEnv(env);
  const vm = toBetweenDungeonsViewModel(state, resolved.t);
  if (!vm) return;
  const kitLayout = layoutBetweenDungeons(
    vm,
    { x: 0, y: 0, width: viewWidth, height: viewHeight },
    resolved.theme,
  );
  if (!kitLayout.hasContent) return;

  const ui: UiContext = {
    ...resolved,
    ctx,
    assets: uiAssetProvider,
  };
  renderBetweenDungeonsComponent(kitLayout, vm, ui, {
    hoveredAction: options?.hoveredAction,
    hoveredSecondary: options?.hoveredSecondary,
    hoveredItem: options?.hoveredItem
      ? {
          heroIndex: options.hoveredItem.heroIndex,
          itemIndex: options.hoveredItem.itemIndex,
        }
      : null,
    hoveredGiveHeroIndex: options?.hoveredGiveHeroIndex ?? null,
    hoveredWipeAction: options?.hoveredWipeAction ?? null,
  });
};
