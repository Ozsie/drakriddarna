// Game-side facade for the monster cards. The adapter in
// ./viewmodels/monsterCards is the only place that reads GameState; this
// module owns the composition tree for layout, hits and rendering while
// keeping the historical entry points — including the Monster-carrying
// hit for the cascade — unchanged.

import type { GameState, Monster } from '../types';
import {
  composeFont,
  PER_CHAR_WIDTH_FALLBACK,
  type Rect,
} from '@hoard-engine/primitives';
import { truncateText } from '@hoard-engine/primitives';
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
  toMonsterCardsViewModel,
  type MonsterCardsViewModel,
} from './viewmodels/monsterCards';
import { legacyUiEnv, layoutModeForWidth } from './env';
import { uiAssetProvider } from './assets';
import { i18nTranslator } from './i18nAdapter';

export type {
  MonsterCardVm,
  MonsterCardsViewModel,
} from './viewmodels/monsterCards';

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

const MONSTER_CARD_HIT = 'monster-card:';

interface PositionedMonsterCard {
  card: MonsterCardsViewModel['cards'][number];
  bounds: Rect;
  row: number;
  col: number;
}

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

const compositionFor = (
  viewWidth: number,
  viewHeight: number,
  vm: MonsterCardsViewModel,
  env: UiEnv,
  hoveredMonsterId?: string | null,
  ctx?: CanvasRenderingContext2D,
): {
  compositionLayout: CompositionLayoutNode;
  cards: PositionedMonsterCard[];
  containerBounds: Rect;
} => {
  const marginX = 8;
  const marginY = 8;
  const cardGap = 6;
  const rowGap = 6;
  const cardHeight = 85;
  const colsInRow = Math.min(6, vm.cards.length);
  const availableWidth = Math.max(0, viewWidth * 0.5 - marginX);
  const cardWidth = Math.min(
    140,
    Math.max(
      70,
      Math.floor((availableWidth - (colsInRow - 1) * cardGap) / colsInRow),
    ),
  );
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
  const cardNodes: CompositionNode[] = vm.cards.map((card, index) => {
    const row = Math.floor(index / 6);
    const col = index % 6;
    const x = viewWidth - marginX - (col + 1) * cardWidth - col * cardGap;
    const y = viewHeight - marginY - (row + 1) * cardHeight - row * rowGap;
    const text = (
      value: string,
      offsetY: number,
      style: NonNullable<CompositionNode['themeStyle']>,
      font: string,
    ): CompositionNode => ({
      type: 'text',
      text: ctx
        ? truncateText(ctx, value, cardWidth - 8, font, PER_CHAR_WIDTH_FALLBACK)
        : value,
      width: cardWidth - 8,
      height: 22,
      alignSelf: 'start',
      justifySelf: 'start',
      offsetX: 4,
      offsetY: offsetY - 11,
      align: 'left',
      baseline: 'middle',
      themeStyle: style,
    });
    const strokeColor = card.isCurrent
      ? env.theme.palette.status.monsterCurrent
      : card.isTarget
        ? env.theme.palette.status.monsterTarget
        : hoveredMonsterId === card.id
          ? env.theme.palette.status.hoverCard
          : env.theme.palette.border.card;
    const strokeWidth = card.isCurrent
      ? 'heavy'
      : card.isTarget || hoveredMonsterId === card.id
        ? 'regular'
        : 'thin';
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
          strokeColor,
          strokeWidth,
          radius: 4,
        },
      },
      text(
        card.title,
        11,
        { text: 'cardTitle', fontSize: 'sm', fontWeight: 'bold' },
        titleFont,
      ),
      text(
        card.hpText,
        24,
        { text: 'cardStat', fontSize: 'xxs', fontWeight: 'bold' },
        statBoldFont,
      ),
      text(
        card.weaponText,
        37,
        { text: 'cardDetail', fontSize: 'xxs' },
        statFont,
      ),
    ];
    let armourOffset = 50;
    let shieldOffset = 63;
    if (card.hasRangedWeapon) {
      children.push(
        text(
          card.rangedWeaponText,
          50,
          { text: 'cardDetail', fontSize: 'xxs' },
          statFont,
        ),
      );
      armourOffset = 63;
      shieldOffset = 76;
    }
    children.push(
      text(
        card.armourText,
        armourOffset,
        { text: 'cardDetail', fontSize: 'xxs' },
        statFont,
      ),
      text(
        card.shieldText,
        shieldOffset,
        { text: 'cardDetail', fontSize: 'xxs' },
        statFont,
      ),
      {
        type: 'hitTarget',
        actionId: `${MONSTER_CARD_HIT}${card.id}`,
        width: cardWidth,
        height: cardHeight,
        alignSelf: 'start',
        justifySelf: 'start',
      },
    );

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
  const cards = compositionLayout.children.map((cardLayout, index) => ({
    card: vm.cards[index],
    bounds: cardLayout.bounds,
    row: Math.floor(index / 6),
    col: index % 6,
  }));
  const minX = Math.min(...cards.map((card) => card.bounds.x));
  const minY = Math.min(...cards.map((card) => card.bounds.y));
  const maxX = Math.max(
    ...cards.map((card) => card.bounds.x + card.bounds.width),
  );
  const maxY = Math.max(
    ...cards.map((card) => card.bounds.y + card.bounds.height),
  );

  return {
    compositionLayout,
    cards,
    containerBounds: {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    },
  };
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
  if (viewWidth <= 0 || viewHeight <= 0 || vm.cards.length === 0) {
    return {
      containerBounds: { x: 0, y: 0, width: 0, height: 0 },
      cards: [],
    };
  }
  const composition = compositionFor(viewWidth, viewHeight, vm, resolvedEnv);
  const monsters = visibleMonstersFor(state, vm);
  return {
    containerBounds: composition.containerBounds,
    cards: composition.cards.map((item, index) => ({
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

  const env = legacyUiEnv(options?.env);
  const compact =
    options?.env?.mode !== undefined
      ? options.env.mode === 'compact'
      : layoutModeForWidth(viewWidth) === 'compact';
  const vm = toMonsterCardsViewModel(state, env.t, compact);
  if (vm.cards.length === 0) return;
  const composition = compositionFor(
    viewWidth,
    viewHeight,
    vm,
    env,
    options?.hoveredMonsterId,
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
  if (vm.cards.length === 0) return null;
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

  const monsters = state.dungeon?.layout?.monsters ?? [];
  const monsterId = hit.actionId.slice(MONSTER_CARD_HIT.length);
  const monster = monsters.find(
    (m) => (m.id ?? m.name) === monsterId || m.name === monsterId,
  );
  return monster ? { type: 'card', monster } : null;
};
