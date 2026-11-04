// Monster cards component: the right-edge cards for visible monsters.
// Kit component per the 02 contract — the view model carries visible
// monsters with all card texts prebuilt by the game-side adapter; layout
// is canvas-free; hits are semantic card ids.

import type { Rect, UiTheme } from '@hoard-engine/primitives';
import {
  drawRoundedRect,
  isPointInRect,
  PER_CHAR_WIDTH_FALLBACK,
  composeFont,
  truncateText,
} from '@hoard-engine/primitives';
import type { UiContext } from '../env';

export interface MonsterCardViewModel {
  /** Hit-test identity: the monster's id or name. */
  readonly id: string;
  readonly title: string;
  /** Actor colour; the theme's fallback applies when empty. */
  readonly colour: string;
  readonly isCurrent: boolean;
  readonly isTarget: boolean;
  readonly hpText: string;
  readonly weaponText: string;
  readonly rangedWeaponText: string;
  readonly armourText: string;
  readonly shieldText: string;
  /** Whether the ranged-weapon line occupies its own row. */
  readonly hasRangedWeapon: boolean;
}

export interface MonsterCardsViewModel {
  readonly cards: readonly MonsterCardViewModel[];
}

export interface MonsterCardLayoutItem {
  card: MonsterCardViewModel;
  bounds: Rect;
  row: number;
  col: number;
}

export interface MonsterCardsLayout {
  containerBounds: Rect;
  cards: MonsterCardLayoutItem[];
}

/** Semantic hit: which monster card is under the point. */
export type MonsterCardsHit = { kind: 'card'; cardId: string } | null;

export const layoutMonsterCards = (
  vm: MonsterCardsViewModel,
  viewBounds: Rect,
): MonsterCardsLayout => {
  const emptyLayout: MonsterCardsLayout = {
    containerBounds: { x: 0, y: 0, width: 0, height: 0 },
    cards: [],
  };

  const { width: viewWidth, height: viewHeight } = viewBounds;
  if (viewWidth <= 0 || viewHeight <= 0 || vm.cards.length === 0) {
    return emptyLayout;
  }

  const marginX = 8;
  const marginY = 8;
  const cardGap = 6;
  const rowGap = 6;
  const cardHeight = 85;

  const numMonsters = vm.cards.length;
  const maxTotalWidth = viewWidth * 0.5;
  const availableWidth = Math.max(0, maxTotalWidth - marginX);

  const colsInRow = numMonsters <= 6 ? numMonsters : Math.min(6, numMonsters);
  const calculatedCardWidth = Math.max(
    70,
    Math.floor((availableWidth - (colsInRow - 1) * cardGap) / colsInRow),
  );
  const cardWidth = Math.min(140, calculatedCardWidth);

  const cards: MonsterCardLayoutItem[] = [];

  let minX = viewWidth;
  let minY = viewHeight;
  let maxX = 0;
  let maxY = 0;

  vm.cards.forEach((card, index) => {
    const row = Math.floor(index / 6);
    const col = index % 6;

    const x = viewWidth - marginX - (col + 1) * cardWidth - col * cardGap;
    const y = viewHeight - marginY - (row + 1) * cardHeight - row * rowGap;

    const bounds: Rect = { x, y, width: cardWidth, height: cardHeight };

    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);

    cards.push({ card, bounds, row, col });
  });

  const containerBounds: Rect =
    cards.length > 0
      ? { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
      : { x: 0, y: 0, width: 0, height: 0 };

  return { containerBounds, cards };
};

export const hitTestMonsterCards = (
  layout: MonsterCardsLayout,
  point: { x: number; y: number },
): MonsterCardsHit => {
  if (layout.cards.length === 0) return null;
  if (!isPointInRect(point.x, point.y, layout.containerBounds)) return null;
  for (const card of layout.cards) {
    if (isPointInRect(point.x, point.y, card.bounds)) {
      return { kind: 'card', cardId: card.card.id };
    }
  }
  return null;
};

export interface RenderMonsterCardsOptions {
  /** Hovered card id, for the hover border. */
  readonly hoveredCardId?: string | null;
}

export const renderMonsterCards = (
  layout: MonsterCardsLayout,
  vm: MonsterCardsViewModel,
  ui: UiContext,
  options?: RenderMonsterCardsOptions,
): void => {
  const { ctx } = ui;
  const theme: UiTheme = ui.theme;
  if (!ctx || layout.cards.length === 0) return;

  const hoveredCardId = options?.hoveredCardId ?? null;

  const titleFont = composeFont(
    theme,
    theme.typography.sizes.sm,
    theme.typography.weights.bold,
  );
  const statFont = composeFont(theme, theme.typography.sizes.xxs);
  const statBoldFont = composeFont(
    theme,
    theme.typography.sizes.xxs,
    theme.typography.weights.bold,
  );

  ctx.save();

  layout.cards.forEach((item) => {
    const { bounds, card } = item;
    const isHovered = hoveredCardId !== null && hoveredCardId === card.id;

    // Card background
    drawRoundedRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, 4);
    ctx.fillStyle = card.colour || theme.palette.surface.cardFallback;
    ctx.fill();

    // Border
    if (card.isCurrent) {
      ctx.lineWidth = theme.shape.strokeWidth.heavy;
      ctx.strokeStyle = theme.palette.status.monsterCurrent;
      ctx.stroke();
    } else if (card.isTarget) {
      ctx.lineWidth = theme.shape.strokeWidth.regular;
      ctx.strokeStyle = theme.palette.status.monsterTarget;
      ctx.stroke();
    } else if (isHovered) {
      ctx.lineWidth = theme.shape.strokeWidth.regular;
      ctx.strokeStyle = theme.palette.status.hoverCard;
      ctx.stroke();
    } else {
      ctx.lineWidth = theme.shape.strokeWidth.thin;
      ctx.strokeStyle = theme.palette.border.card;
      ctx.stroke();
    }

    const textMaxWidth = bounds.width - 8;

    // Title / Monster Name
    ctx.fillStyle = theme.palette.text.cardTitle;
    ctx.font = titleFont;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const displayTitle = truncateText(
      ctx,
      card.title,
      textMaxWidth,
      titleFont,
      PER_CHAR_WIDTH_FALLBACK,
    );
    ctx.fillText(displayTitle, bounds.x + 4, bounds.y + 11);

    // HP
    ctx.font = statBoldFont;
    ctx.fillStyle = theme.palette.text.cardStat;
    const displayHp = truncateText(
      ctx,
      card.hpText,
      textMaxWidth,
      statBoldFont,
      PER_CHAR_WIDTH_FALLBACK,
    );
    ctx.fillText(displayHp, bounds.x + 4, bounds.y + 24);

    // Weapon
    ctx.font = statFont;
    ctx.fillStyle = theme.palette.text.cardDetail;
    const displayWeapon = truncateText(
      ctx,
      card.weaponText,
      textMaxWidth,
      statFont,
      PER_CHAR_WIDTH_FALLBACK,
    );
    ctx.fillText(displayWeapon, bounds.x + 4, bounds.y + 37);

    let armourYOffset = 50;
    let shieldYOffset = 63;
    if (card.hasRangedWeapon) {
      ctx.font = statFont;
      ctx.fillStyle = theme.palette.text.cardDetail;
      const displayWeapon = truncateText(
        ctx,
        card.rangedWeaponText,
        textMaxWidth,
        statFont,
        PER_CHAR_WIDTH_FALLBACK,
      );
      ctx.fillText(displayWeapon, bounds.x + 4, bounds.y + 50);
      armourYOffset = 63;
      shieldYOffset = 76;
    }

    // Armour
    const displayArmour = truncateText(
      ctx,
      card.armourText,
      textMaxWidth,
      statFont,
      PER_CHAR_WIDTH_FALLBACK,
    );
    ctx.fillText(displayArmour, bounds.x + 4, bounds.y + armourYOffset);

    // Shield
    const displayShield = truncateText(
      ctx,
      card.shieldText,
      textMaxWidth,
      statFont,
      PER_CHAR_WIDTH_FALLBACK,
    );
    ctx.fillText(displayShield, bounds.x + 4, bounds.y + shieldYOffset);
  });

  ctx.restore();
};
