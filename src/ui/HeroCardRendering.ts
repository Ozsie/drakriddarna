import type { GameState, Hero, Item } from '../types';
import { liveHeroes } from '../hero/HeroLogic';
import { i18n } from '../core';
import { ACTIVE, DESCRIPTION, USED } from '../items/ItemLogic';

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
}

export type HeroCardsHitResult =
  | { type: 'inventoryButton'; hero: Hero }
  | { type: 'inventoryClose'; hero: Hero }
  | { type: 'inventoryUseItem'; hero: Hero; item: Item; itemIndex: number }
  | { type: 'inventory'; hero: Hero }
  | { type: 'card'; hero: Hero };

const TITLE_FONT = 'bold 11px Arial, Helvetica, sans-serif';
const STAT_FONT = '10px Arial, Helvetica, sans-serif';
const STAT_BOLD_FONT = 'bold 10px Arial, Helvetica, sans-serif';
const INV_TITLE_FONT = 'bold 12px Arial, Helvetica, sans-serif';
const INV_ITEM_FONT = 'bold 11px Arial, Helvetica, sans-serif';
const INV_DESC_FONT = '10px Arial, Helvetica, sans-serif';
const INV_BTN_FONT = 'bold 10px Arial, Helvetica, sans-serif';

export const isPointInBounds = (
  x: number,
  y: number,
  bounds: CardBounds,
): boolean =>
  x >= bounds.x &&
  x <= bounds.x + bounds.width &&
  y >= bounds.y &&
  y <= bounds.y + bounds.height;

export const measureTextWidth = (
  ctx: CanvasRenderingContext2D | null | undefined,
  text: string,
  font: string = STAT_FONT,
): number => {
  if (!text) return 0;
  if (ctx && typeof ctx.measureText === 'function') {
    ctx.save();
    ctx.font = font;
    const width = ctx.measureText(text).width;
    ctx.restore();
    return width;
  }
  return text.length * 6.5;
};

export const truncateText = (
  ctx: CanvasRenderingContext2D | null | undefined,
  text: string,
  maxWidth: number,
  font: string = STAT_FONT,
): string => {
  if (!text || maxWidth <= 0) return '';
  const currentWidth = measureTextWidth(ctx, text, font);
  if (currentWidth <= maxWidth) return text;

  const ellipsis = '...';
  const ellipsisWidth = measureTextWidth(ctx, ellipsis, font);
  if (ellipsisWidth >= maxWidth) return '';

  let low = 0;
  let high = text.length;
  let best = '';

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = text.slice(0, mid) + ellipsis;
    if (measureTextWidth(ctx, candidate, font) <= maxWidth) {
      best = candidate;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return best;
};

export const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

export const getHeroCardsLayout = (
  viewWidth: number,
  viewHeight: number,
  state?: GameState | null,
): HeroCardsLayout => {
  const emptyLayout: HeroCardsLayout = {
    containerBounds: { x: 0, y: 0, width: 0, height: 0 },
    cards: [],
    inventories: [],
  };

  if (!state || viewWidth <= 0 || viewHeight <= 0) {
    return emptyLayout;
  }

  const heroes = liveHeroes(state);
  if (!heroes || heroes.length === 0) {
    return emptyLayout;
  }

  const marginX = 8;
  const marginY = 8;
  const cardGap = 6;
  const maxTotalWidth = viewWidth * 0.5;
  const availableWidth = Math.max(0, maxTotalWidth - marginX);

  const numHeroes = heroes.length;
  // Calculate card width such that total cards width with gaps <= 50% of viewWidth
  const calculatedCardWidth = Math.max(
    80,
    Math.floor((availableWidth - (numHeroes - 1) * cardGap) / numHeroes),
  );
  const cardWidth = Math.min(180, calculatedCardWidth);

  const currentActorName = state.currentActor?.name;
  const targetActorName = state.targetActor?.name;

  const cards: HeroCardLayoutItem[] = [];
  const inventories: InventoryPopoverLayout[] = [];

  let currentX = marginX;
  let minCardY = viewHeight;

  heroes.forEach((hero) => {
    const isCurrent = currentActorName === hero.name;
    const isTarget = targetActorName === hero.name;

    const heroNameTranslated = i18n(hero.name);
    const levelKey = `content.level.${hero.level}`;
    const levelTranslated = i18n(levelKey);
    const title = `${
      isTarget ? '*' : ''
    }${heroNameTranslated} - ${levelTranslated} (${hero.experience})`;
    const hpText = `${i18n('content.hero.hp')}: ${hero.health}`;

    let actionsText: string | undefined;
    let movesText: string | undefined;
    let equipmentText: string | undefined;
    let weaponText: string | undefined;
    let armourText: string | undefined;
    let shieldText: string | undefined;

    let cardHeight = 44; // Compact inactive card: Title (20px) + HP (16px) + padding (8px)

    if (isCurrent) {
      actionsText = `${i18n('content.hero.actions')}: ${hero.actions}`;
      movesText = `${i18n('content.hero.moves')}: ${hero.movement}`;
      equipmentText = `${i18n('content.hero.equipment')}:`;
      weaponText = `🗡️ ${i18n(hero.weapon.name)} (${hero.weapon.dice})`;
      armourText = `🥋 ${
        hero.armour
          ? `${i18n(hero.armour.name)} (${hero.armour.defense})`
          : `${i18n('content.hero.none')} (0)`
      }`;
      shieldText = `🛡️ ${
        hero.shield
          ? `${i18n(hero.shield.name)} (${hero.shield.dice})`
          : `${i18n('content.hero.none')} (0)`
      }`;
      // Inactive 44 + Actions/Moves (16px) + Equipment header (14px) + 3 items (3 * 13px = 39px)
      cardHeight = 112;
    }

    const cardY = Math.max(8, viewHeight - marginY - cardHeight);
    if (cardY < minCardY) {
      minCardY = cardY;
    }

    const cardBounds: CardBounds = {
      x: currentX,
      y: cardY,
      width: cardWidth,
      height: cardHeight,
    };

    const invBtnSize = 18;
    const invBtnBounds: CardBounds = {
      x: cardBounds.x + cardBounds.width - invBtnSize - 4,
      y: cardBounds.y + 3,
      width: invBtnSize,
      height: invBtnSize,
    };

    cards.push({
      hero,
      isCurrent,
      isTarget,
      bounds: cardBounds,
      inventoryButtonBounds: invBtnBounds,
      title,
      hpText,
      actionsText,
      movesText,
      equipmentText,
      weaponText,
      armourText,
      shieldText,
    });

    // Check if inventory is open for this hero
    if (hero.isInventoryOpen) {
      const invTitle = i18n('content.inventory.label', {
        hero: heroNameTranslated,
      });

      const invItems = hero.inventory ?? [];
      const itemRowHeight = 36;
      const headerHeight = 24;
      const footerPadding = 8;
      const computedInvHeight =
        invItems.length === 0
          ? headerHeight + 28 + footerPadding
          : headerHeight + invItems.length * itemRowHeight + footerPadding;

      const popoverWidth = Math.min(
        Math.max(cardWidth, 220),
        Math.max(viewWidth * 0.5, 220),
        viewWidth - 16,
      );

      // Inventory opens up above the card
      const preferredY = cardBounds.y - computedInvHeight - 6;
      const popoverY = Math.max(42, preferredY);
      const popoverHeight = Math.min(
        computedInvHeight,
        cardBounds.y - popoverY - 4,
      );

      // Clamp X position within canvas bounds
      const popoverX = Math.max(
        8,
        Math.min(cardBounds.x, viewWidth - popoverWidth - 8),
      );

      const popoverBounds: CardBounds = {
        x: popoverX,
        y: popoverY,
        width: popoverWidth,
        height: Math.max(50, popoverHeight),
      };

      const closeBtnSize = 16;
      const closeBtnBounds: CardBounds = {
        x: popoverBounds.x + popoverBounds.width - closeBtnSize - 4,
        y: popoverBounds.y + 4,
        width: closeBtnSize,
        height: closeBtnSize,
      };

      const itemLayouts: InventoryItemLayout[] = [];
      let itemY = popoverBounds.y + headerHeight + 4;

      invItems.forEach((item, itemIdx) => {
        const itemBounds: CardBounds = {
          x: popoverBounds.x + 4,
          y: itemY,
          width: popoverBounds.width - 8,
          height: itemRowHeight - 4,
        };

        const itemName = i18n(item.nameTranslationKey ?? item.name);
        const itemDesc = item.properties?.[DESCRIPTION]
          ? i18n(String(item.properties[DESCRIPTION]))
          : '';

        const isUsable = Boolean(
          item.properties?.[ACTIVE] && !item.properties?.[USED],
        );
        const isUsed = Boolean(
          item.properties?.[ACTIVE] && item.properties?.[USED],
        );

        let useBtnBounds: CardBounds | undefined;
        if (item.properties?.[ACTIVE]) {
          const btnWidth = 42;
          const btnHeight = 20;
          useBtnBounds = {
            x: itemBounds.x + itemBounds.width - btnWidth - 4,
            y: itemBounds.y + Math.floor((itemBounds.height - btnHeight) / 2),
            width: btnWidth,
            height: btnHeight,
          };
        }

        itemLayouts.push({
          item,
          itemIndex: itemIdx,
          bounds: itemBounds,
          nameText: itemName,
          descriptionText: itemDesc,
          useButtonBounds: useBtnBounds,
          isUsable,
          isUsed,
        });

        itemY += itemRowHeight;
      });

      inventories.push({
        hero,
        bounds: popoverBounds,
        closeButtonBounds: closeBtnBounds,
        titleText: invTitle,
        items: itemLayouts,
      });
    }

    currentX += cardWidth + cardGap;
  });

  const totalWidth = currentX - cardGap - marginX;
  const containerBounds: CardBounds = {
    x: marginX,
    y: minCardY,
    width: totalWidth,
    height: viewHeight - marginY - minCardY,
  };

  return {
    containerBounds,
    cards,
    inventories,
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

  const layout = getHeroCardsLayout(viewWidth, viewHeight, state);
  if (!layout.cards || layout.cards.length === 0) return;

  const hoveredInvHeroName = options?.hoveredInventoryHeroName ?? null;
  const hoveredCloseHeroName = options?.hoveredCloseHeroName ?? null;
  const hoveredUseItem = options?.hoveredUseItem ?? null;

  ctx.save();

  // 1. Render Hero Cards
  layout.cards.forEach((item) => {
    const { bounds, hero, isCurrent } = item;

    // Card background
    drawRoundedRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, 5);
    ctx.fillStyle = hero.colour || '#CD5C5C';
    ctx.fill();

    // Border (highlight active hero)
    if (isCurrent) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#38bdf8';
      ctx.stroke();
    } else {
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.stroke();
    }

    // Header / Title
    ctx.fillStyle = '#111827';
    ctx.font = TITLE_FONT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const maxTitleWidth = bounds.width - item.inventoryButtonBounds.width - 12;
    const displayTitle = truncateText(
      ctx,
      item.title,
      maxTitleWidth,
      TITLE_FONT,
    );
    ctx.fillText(displayTitle, bounds.x + 5, bounds.y + 12);

    // Inventory Button (🎒)
    const invBtn = item.inventoryButtonBounds;
    const isInvHovered = hoveredInvHeroName === hero.name;
    drawRoundedRect(ctx, invBtn.x, invBtn.y, invBtn.width, invBtn.height, 3);
    ctx.fillStyle = isInvHovered
      ? 'rgba(255, 255, 255, 0.5)'
      : 'rgba(255, 255, 255, 0.25)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      '🎒',
      invBtn.x + invBtn.width / 2,
      invBtn.y + invBtn.height / 2 + 1,
    );

    // HP Text
    ctx.font = STAT_BOLD_FONT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1f2937';
    ctx.fillText(item.hpText, bounds.x + 5, bounds.y + 30);

    // If Current Actor, render actions, movement and equipment
    if (isCurrent) {
      ctx.font = STAT_FONT;

      // Actions and Moves
      if (item.actionsText && item.movesText) {
        ctx.fillText(
          `${item.actionsText}  ${item.movesText}`,
          bounds.x + 5,
          bounds.y + 46,
        );
      }

      // Equipment header
      if (item.equipmentText) {
        ctx.font = STAT_BOLD_FONT;
        ctx.fillText(item.equipmentText, bounds.x + 5, bounds.y + 61);
      }

      // Equipment items
      ctx.font = STAT_FONT;
      const maxItemWidth = bounds.width - 10;
      if (item.weaponText) {
        const wTxt = truncateText(
          ctx,
          item.weaponText,
          maxItemWidth,
          STAT_FONT,
        );
        ctx.fillText(wTxt, bounds.x + 5, bounds.y + 75);
      }
      if (item.armourText) {
        const aTxt = truncateText(
          ctx,
          item.armourText,
          maxItemWidth,
          STAT_FONT,
        );
        ctx.fillText(aTxt, bounds.x + 5, bounds.y + 88);
      }
      if (item.shieldText) {
        const sTxt = truncateText(
          ctx,
          item.shieldText,
          maxItemWidth,
          STAT_FONT,
        );
        ctx.fillText(sTxt, bounds.x + 5, bounds.y + 101);
      }
    }
  });

  // 2. Render Open Inventory Popovers Above Cards
  layout.inventories.forEach((inv) => {
    const { bounds, closeButtonBounds, titleText, items, hero } = inv;

    // Popover Box
    drawRoundedRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, 6);
    ctx.fillStyle = 'rgba(222, 184, 135, 0.96)'; // Burlywood background
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#5C4033';
    ctx.stroke();

    // Popover Header Title
    ctx.fillStyle = '#3E2723';
    ctx.font = INV_TITLE_FONT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const maxTitleW = bounds.width - closeButtonBounds.width - 16;
    const displayTitle = truncateText(
      ctx,
      titleText,
      maxTitleW,
      INV_TITLE_FONT,
    );
    ctx.fillText(displayTitle, bounds.x + 8, bounds.y + 12);

    // Close Button (✕)
    const isCloseHovered = hoveredCloseHeroName === hero.name;
    drawRoundedRect(
      ctx,
      closeButtonBounds.x,
      closeButtonBounds.y,
      closeButtonBounds.width,
      closeButtonBounds.height,
      3,
    );
    ctx.fillStyle = isCloseHovered
      ? 'rgba(180, 50, 50, 0.3)'
      : 'rgba(0, 0, 0, 0.1)';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#5C4033';
    ctx.stroke();

    ctx.fillStyle = '#3E2723';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      '✕',
      closeButtonBounds.x + closeButtonBounds.width / 2,
      closeButtonBounds.y + closeButtonBounds.height / 2,
    );

    // Items list
    if (items.length === 0) {
      ctx.fillStyle = '#6D4C41';
      ctx.font = 'italic 11px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('(Empty)', bounds.x + bounds.width / 2, bounds.y + 36);
    } else {
      items.forEach((itemLayout) => {
        const itemB = itemLayout.bounds;

        // Item bottom divider
        ctx.beginPath();
        ctx.moveTo(itemB.x, itemB.y + itemB.height);
        ctx.lineTo(itemB.x + itemB.width, itemB.y + itemB.height);
        ctx.strokeStyle = 'rgba(92, 64, 51, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Item Name
        ctx.fillStyle = '#271711';
        ctx.font = INV_ITEM_FONT;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        const maxTextW = itemLayout.useButtonBounds
          ? itemLayout.useButtonBounds.x - itemB.x - 8
          : itemB.width - 4;

        const displayName = truncateText(
          ctx,
          itemLayout.nameText,
          maxTextW,
          INV_ITEM_FONT,
        );
        ctx.fillText(displayName, itemB.x + 2, itemB.y + 2);

        // Item Description
        if (itemLayout.descriptionText) {
          ctx.fillStyle = '#4E342E';
          ctx.font = INV_DESC_FONT;
          const displayDesc = truncateText(
            ctx,
            itemLayout.descriptionText,
            maxTextW,
            INV_DESC_FONT,
          );
          ctx.fillText(displayDesc, itemB.x + 2, itemB.y + 16);
        }

        // Use Button if active
        if (itemLayout.useButtonBounds) {
          const btnB = itemLayout.useButtonBounds;
          const isItemHovered =
            hoveredUseItem?.heroName === hero.name &&
            hoveredUseItem?.itemIndex === itemLayout.itemIndex;

          drawRoundedRect(ctx, btnB.x, btnB.y, btnB.width, btnB.height, 3);

          if (itemLayout.isUsable) {
            ctx.fillStyle = isItemHovered ? '#16a34a' : '#15803d';
            ctx.fill();
            ctx.strokeStyle = '#14532d';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = INV_BTN_FONT;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
              i18n('content.inventory.use') || 'Use',
              btnB.x + btnB.width / 2,
              btnB.y + btnB.height / 2,
            );
          } else {
            // Disabled / Used
            ctx.fillStyle = 'rgba(120, 100, 90, 0.4)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(92, 64, 51, 0.4)';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = '#5C4033';
            ctx.font = INV_BTN_FONT;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
              i18n('content.inventory.used') || 'Used',
              btnB.x + btnB.width / 2,
              btnB.y + btnB.height / 2,
            );
          }
        }
      });
    }
  });

  ctx.restore();
};

export const getHeroCardsHit = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  screenX: number,
  screenY: number,
): HeroCardsHitResult | null => {
  if (!state || viewWidth <= 0 || viewHeight <= 0) return null;

  const layout = getHeroCardsLayout(viewWidth, viewHeight, state);

  // 1. Check open inventory popovers first (they render on top)
  for (const inv of layout.inventories) {
    if (isPointInBounds(screenX, screenY, inv.bounds)) {
      // Check Close button
      if (isPointInBounds(screenX, screenY, inv.closeButtonBounds)) {
        return { type: 'inventoryClose', hero: inv.hero };
      }

      // Check item Use buttons
      for (const itemLayout of inv.items) {
        if (
          itemLayout.useButtonBounds &&
          itemLayout.isUsable &&
          isPointInBounds(screenX, screenY, itemLayout.useButtonBounds)
        ) {
          return {
            type: 'inventoryUseItem',
            hero: inv.hero,
            item: itemLayout.item,
            itemIndex: itemLayout.itemIndex,
          };
        }
      }

      return { type: 'inventory', hero: inv.hero };
    }
  }

  // 2. Check hero cards
  for (const card of layout.cards) {
    if (isPointInBounds(screenX, screenY, card.bounds)) {
      // Check Backpack button
      if (isPointInBounds(screenX, screenY, card.inventoryButtonBounds)) {
        return { type: 'inventoryButton', hero: card.hero };
      }
      return { type: 'card', hero: card.hero };
    }
  }

  return null;
};
