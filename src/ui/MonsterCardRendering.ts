// Game-side facade for the monster cards. The component (layout, hit
// test, render over the view model) lives in the kit; the adapter in
// ./viewmodels/monsterCards is the only place that reads GameState.
// This module keeps the historical entry points — including the
// Monster-carrying hit for the cascade — so callers work unchanged.

import type { GameState, Monster } from '../types';
import type { UiEnv, UiContext } from '../uikit/env';
import type { Rect } from '../uikit/primitives/geometry';
import {
  hitTestMonsterCards,
  layoutMonsterCards,
  renderMonsterCards as renderMonsterCardsComponent,
  type MonsterCardsLayout as KitLayout,
  type MonsterCardsViewModel,
} from '../uikit/components/monsterCards';
import { toMonsterCardsViewModel } from './viewmodels/monsterCards';
import { legacyUiEnv, layoutModeForWidth } from './env';
import { uiAssetProvider } from './assets';
import { i18nTranslator } from './i18nAdapter';

// Legacy layout item shape: the cascade's hit result carries the Monster.
export interface MonsterCardLayoutItem {
  monster: Monster;
  isCurrent: boolean;
  isTarget: boolean;
  bounds: Rect;
  title: string;
  hpText: string;
  weaponText: string;
  rangedWeaponText: string;
  armourText: string;
  shieldText: string;
  row: number;
  col: number;
}

export interface MonsterCardsLayout {
  containerBounds: Rect;
  cards: MonsterCardLayoutItem[];
}

export interface RenderMonsterCardsOptions {
  hoveredMonsterId?: string | null;
  env?: UiEnv;
}

export type MonsterCardsHitResult = {
  type: 'card';
  monster: Monster;
};

/** The visible monsters in view-model order, for resolving hit ids. */
const visibleMonstersFor = (
  state: GameState | null | undefined,
  vm: MonsterCardsViewModel,
): Monster[] => {
  if (!state) return [];
  const monsters = state.dungeon?.layout?.monsters ?? [];
  return vm.cards.map(
    (card) =>
      monsters.find(
        (m) => (m.id ?? m.name) === card.id || m.name === card.id,
      ) ?? monsters[0],
  );
};

export const getMonsterCardsLayout = (
  viewWidth: number,
  viewHeight: number,
  state?: GameState | null,
  env?: UiEnv,
): MonsterCardsLayout => {
  const resolvedEnv = legacyUiEnv(env);
  // Without an env, the historical width-derived compact rule applies.
  const compact =
    env?.mode !== undefined
      ? env.mode === 'compact'
      : layoutModeForWidth(viewWidth) === 'compact';
  const vm = toMonsterCardsViewModel(state, resolvedEnv.t, compact);
  const kitLayout: KitLayout = layoutMonsterCards(vm, {
    x: 0,
    y: 0,
    width: viewWidth,
    height: viewHeight,
  });
  const monsters = visibleMonstersFor(state, vm);
  return {
    containerBounds: kitLayout.containerBounds,
    cards: kitLayout.cards.map((item, index) => ({
      monster: monsters[index],
      isCurrent: item.card.isCurrent,
      isTarget: item.card.isTarget,
      bounds: item.bounds,
      title: item.card.title,
      hpText: item.card.hpText,
      weaponText: item.card.weaponText,
      rangedWeaponText: item.card.rangedWeaponText,
      armourText: item.card.armourText,
      shieldText: item.card.shieldText,
      row: item.row,
      col: item.col,
    })),
  };
};

export const renderMonsterCards = (
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  viewHeight: number,
  state?: GameState | null,
  options?: RenderMonsterCardsOptions,
): void => {
  if (!state || viewWidth <= 0 || viewHeight <= 0) return;

  const env = options?.env ?? legacyUiEnv(undefined);
  const compact =
    options?.env?.mode !== undefined
      ? options.env.mode === 'compact'
      : layoutModeForWidth(viewWidth) === 'compact';
  const vm = toMonsterCardsViewModel(state, env.t, compact);
  const layout = layoutMonsterCards(vm, {
    x: 0,
    y: 0,
    width: viewWidth,
    height: viewHeight,
  });
  if (layout.cards.length === 0) return;

  const ui: UiContext = {
    theme: env.theme,
    mode: env.mode,
    t: env.t,
    measure: env.measure,
    ctx,
    assets: uiAssetProvider,
  };
  renderMonsterCardsComponent(layout, vm, ui, {
    hoveredCardId: options?.hoveredMonsterId ?? null,
  });
};

export const getMonsterCardsHit = (
  viewWidth: number,
  viewHeight: number,
  state?: GameState | null,
  screenX = 0,
  screenY = 0,
): MonsterCardsHitResult | null => {
  if (!state || viewWidth <= 0 || viewHeight <= 0) return null;

  const vm = toMonsterCardsViewModel(
    state,
    i18nTranslator,
    layoutModeForWidth(viewWidth) === 'compact',
  );
  const layout = layoutMonsterCards(vm, {
    x: 0,
    y: 0,
    width: viewWidth,
    height: viewHeight,
  });
  if (layout.cards.length === 0) return null;

  const hit = hitTestMonsterCards(layout, { x: screenX, y: screenY });
  if (!hit) return null;

  const monsters = state.dungeon?.layout?.monsters ?? [];
  const monster = monsters.find(
    (m) => (m.id ?? m.name) === hit.cardId || m.name === hit.cardId,
  );
  return monster ? { type: 'card', monster } : null;
};
