// Game-side facade for the hero cards. The adapter in ./viewmodels/heroCards
// is the only place that reads GameState; this module owns a composition tree
// for layout, hits and rendering while keeping the historical entry points —
// including the Hero-carrying layout items and hits — unchanged. The inventory
// button opens the full-screen hero status screen (see ./HeroStatusRendering);
// the cards themselves carry no inventory view.

import type { GameState, Hero } from '../types';
import { liveHeroes } from '../hero/HeroLogic';
import type { Rect } from '@hoard-engine/primitives';
import {
  composeFont,
  PER_CHAR_WIDTH_FALLBACK,
  truncateText,
} from '@hoard-engine/primitives';
import type {
  CompositionLayoutNode,
  CompositionNode,
  UiEnv,
  UiContext,
} from '@hoard-engine/uikit';
import {
  hitTestComposition,
  layoutComposition,
  renderComposition,
} from '@hoard-engine/uikit';
import {
  toHeroCardsViewModel,
  type HeroCardsViewModel,
} from './viewmodels/heroCards';
import { legacyUiEnv, layoutModeForWidth } from './env';
import { uiAssetProvider } from './assets';
import { i18nTranslator } from './i18nAdapter';

export type { HeroCardVm, HeroCardsViewModel } from './viewmodels/heroCards';

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

const HERO_CARD_HIT = 'hero-card:';
const HERO_INVENTORY_HIT = 'hero-inventory:';

interface PositionedHeroCard {
  card: HeroCardsViewModel['cards'][number];
  bounds: Rect;
  inventoryButtonBounds: Rect;
}

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

const compositionFor = (
  viewWidth: number,
  viewHeight: number,
  vm: HeroCardsViewModel,
  env: UiEnv,
  hoveredInventoryHeroName?: string | null,
  ctx?: CanvasRenderingContext2D,
): {
  compositionLayout: CompositionLayoutNode;
  cards: PositionedHeroCard[];
} => {
  const marginX = 8;
  const marginY = 8;
  const cardGap = 6;
  const count = vm.cards.length;
  const availableWidth = Math.max(0, viewWidth * 0.5 - marginX);
  const cardWidth = Math.min(
    180,
    Math.max(80, Math.floor((availableWidth - (count - 1) * cardGap) / count)),
  );

  const cardNodes: CompositionNode[] = vm.cards.map((card, index) => {
    const cardHeight = card.isCurrent ? 112 : 44;
    const x = marginX + index * (cardWidth + cardGap);
    const y = Math.max(8, viewHeight - marginY - cardHeight);
    const titleFont = composeFont(
      env.theme,
      env.theme.typography.sizes.sm,
      env.theme.typography.weights.bold,
    );
    const statFont = composeFont(env.theme, env.theme.typography.sizes.xxs);
    const statBoldFont = composeFont(
      env.theme,
      env.theme.typography.sizes.xxs,
      env.theme.typography.weights.bold,
    );
    const text = (
      value: string,
      offsetX: number,
      offsetY: number,
      width: number,
      style: NonNullable<CompositionNode['themeStyle']>,
      font: string,
    ): CompositionNode => ({
      type: 'text',
      text: ctx
        ? truncateText(ctx, value, width, font, PER_CHAR_WIDTH_FALLBACK)
        : value,
      width,
      height: 24,
      alignSelf: 'start',
      justifySelf: 'start',
      offsetX,
      offsetY,
      align: 'left',
      baseline: 'middle',
      themeStyle: style,
    });
    const children: CompositionNode[] = [
      {
        type: 'fill',
        shape: 'roundedRect',
        width: cardWidth,
        height: cardHeight,
        alignSelf: 'start',
        justifySelf: 'start',
        themeStyle: {
          fillColor: card.colour || env.theme.palette.surface.cardFallback,
          border: card.isCurrent ? 'heroCurrent' : 'card',
          strokeWidth: card.isCurrent ? 'thick' : 'thin',
          radius: 5,
        },
      },
      text(
        card.title,
        5,
        0,
        cardWidth - 30,
        { text: 'cardTitle', fontSize: 'sm', fontWeight: 'bold' },
        titleFont,
      ),
      {
        type: 'fill',
        shape: 'roundedRect',
        width: 18,
        height: 18,
        alignSelf: 'start',
        justifySelf: 'start',
        offsetX: cardWidth - 22,
        offsetY: 3,
        themeStyle: {
          surface:
            hoveredInventoryHeroName === card.heroId
              ? 'inventoryButtonHover'
              : 'inventoryButton',
          border: 'inventoryButton',
          strokeWidth: 'thin',
          radius: 3,
        },
      },
      {
        type: 'text',
        text: card.inventoryButtonIcon,
        width: 18,
        height: 18,
        alignSelf: 'start',
        justifySelf: 'start',
        offsetX: cardWidth - 22,
        offsetY: 4,
        align: 'center',
        baseline: 'middle',
        themeStyle: {
          fontSize: 'md',
          fontFamily: 'plain',
        },
      },
      text(
        card.hpText,
        5,
        18,
        cardWidth - 10,
        { text: 'cardStat', fontSize: 'xxs', fontWeight: 'bold' },
        statBoldFont,
      ),
      {
        type: 'hitTarget',
        actionId: `${HERO_CARD_HIT}${card.heroId}`,
        width: cardWidth,
        height: cardHeight,
        alignSelf: 'start',
        justifySelf: 'start',
      },
      {
        type: 'hitTarget',
        actionId: `${HERO_INVENTORY_HIT}${card.heroId}`,
        width: 18,
        height: 18,
        alignSelf: 'start',
        justifySelf: 'start',
        offsetX: cardWidth - 22,
        offsetY: 3,
      },
    ];

    if (card.isCurrent) {
      if (card.actionsText && card.movesText) {
        children.push(
          text(
            `${card.actionsText}  ${card.movesText}`,
            5,
            34,
            cardWidth - 10,
            { text: 'cardStat', fontSize: 'xxs' },
            statFont,
          ),
        );
      }
      if (card.equipmentText) {
        children.push(
          text(
            card.equipmentText,
            5,
            49,
            cardWidth - 10,
            { text: 'cardStat', fontSize: 'xxs', fontWeight: 'bold' },
            statBoldFont,
          ),
        );
      }
      const equipment = [
        { value: card.weaponText, offsetY: 63 },
        { value: card.armourText, offsetY: 76 },
        { value: card.shieldText, offsetY: 89 },
      ];
      equipment.forEach(({ value, offsetY }) => {
        if (value) {
          children.push(
            text(
              value,
              5,
              offsetY,
              cardWidth - 10,
              { text: 'cardStat', fontSize: 'xxs' },
              statFont,
            ),
          );
        }
      });
    }

    return {
      type: 'stack',
      width: cardWidth,
      height: cardHeight,
      alignSelf: 'start',
      justifySelf: 'start',
      offsetX: x,
      offsetY: y,
      children,
    };
  });

  const composition: CompositionNode = {
    type: 'stack',
    width: viewWidth,
    height: viewHeight,
    children: cardNodes,
  };
  const compositionLayout = layoutComposition(
    composition,
    { x: 0, y: 0, width: viewWidth, height: viewHeight },
    env,
  );
  const cards = compositionLayout.children.map((cardLayout, index) => {
    const inventoryTarget = cardLayout.children.find(
      (child) =>
        child.node.type === 'hitTarget' &&
        child.node.actionId.startsWith(HERO_INVENTORY_HIT),
    );
    return {
      card: vm.cards[index],
      bounds: cardLayout.bounds,
      inventoryButtonBounds: inventoryTarget?.bounds ?? {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      },
    };
  });

  return { compositionLayout, cards };
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

  const vm = viewModel(viewWidth, viewHeight, state, env);
  if (
    !state ||
    !vm ||
    vm.cards.length === 0 ||
    viewWidth <= 0 ||
    viewHeight <= 0
  ) {
    return emptyLayout;
  }
  const composition = compositionFor(
    viewWidth,
    viewHeight,
    vm,
    legacyUiEnv(env),
  );
  const first = composition.cards[0];
  const last = composition.cards[composition.cards.length - 1];
  const minY = Math.min(...composition.cards.map((card) => card.bounds.y));

  return {
    containerBounds: {
      x: 8,
      y: minY,
      width: last.bounds.x + last.bounds.width - first.bounds.x,
      height: viewHeight - 8 - minY,
    },
    cards: composition.cards.map((item) => ({
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
  const composition = compositionFor(
    viewWidth,
    viewHeight,
    vm,
    env,
    options?.hoveredInventoryHeroName,
    ctx,
  );

  const ui: UiContext = {
    theme: env.theme,
    mode: env.mode,
    t: env.t,
    measure: env.measure,
    ctx,
    assets: uiAssetProvider,
  };
  ctx.save();
  renderComposition(composition.compositionLayout, ui);
  ctx.restore();
};

export const getHeroCardsHit = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  screenX = 0,
  screenY = 0,
): HeroCardsHitResult | null => {
  if (!state || viewWidth <= 0 || viewHeight <= 0) return null;

  const vm = viewModel(viewWidth, viewHeight, state);
  if (!vm || vm.cards.length === 0) return null;
  const composition = compositionFor(
    viewWidth,
    viewHeight,
    vm,
    legacyUiEnv(undefined),
  );
  const hit = hitTestComposition(composition.compositionLayout, {
    x: screenX,
    y: screenY,
  });
  if (hit?.kind !== 'hitTarget') return null;

  const isInventoryButton = hit.actionId.startsWith(HERO_INVENTORY_HIT);
  const heroId = hit.actionId.slice(
    isInventoryButton ? HERO_INVENTORY_HIT.length : HERO_CARD_HIT.length,
  );
  const hero = heroById(state, heroId);
  if (!hero) return null;
  return { type: isInventoryButton ? 'inventoryButton' : 'card', hero };
};
