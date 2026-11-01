// Hero cards component: the bottom-left party cards with their inventory
// popovers. Kit component per the 02 contract — the view model carries the
// party with all card texts prebuilt by the game-side adapter; layout is
// canvas-free; hits are semantic hero ids; item sprites arrive through the
// asset port (the adapter resolves the sheet url to an asset id, the game
// side maps ids to loaded images).

import { drawRoundedRect } from '../primitives/roundedRect';
import { isPointInRect, type Rect } from '../primitives/geometry';
import {
  PER_CHAR_WIDTH_FALLBACK,
  composeFont,
  truncateText,
} from '../primitives/text';
import { drawSpriteFrame } from '../kit/spriteFrame';
import type { SpriteRef, UiContext } from '../env';
import type { UiTheme } from '../theme';

/** A sprite frame reference (the shared SpriteRef, under its old name). */
export type HeroCardSpriteRef = SpriteRef;

export interface HeroInventoryItemVm {
  /** Hit-test identity: the item's index in the hero's inventory. */
  readonly itemIndex: number;
  readonly nameText: string;
  readonly descriptionText: string;
  /** Whether the item gets a use button (an active item). */
  readonly hasUseButton: boolean;
  readonly isUsable: boolean;
  readonly isUsed: boolean;
  /** Prebuilt button labels; the kit ships no strings. */
  readonly useText: string;
  readonly usedText: string;
  readonly sprite?: HeroCardSpriteRef;
  readonly icon?: string;
}

export interface HeroInventoryVm {
  readonly heroId: string;
  readonly titleText: string;
  /** Label shown when the inventory has no items. */
  readonly emptyText: string;
  readonly closeIcon: string;
  readonly items: readonly HeroInventoryItemVm[];
}

export interface HeroCardVm {
  /** Hit-test identity: the hero's name. */
  readonly heroId: string;
  readonly title: string;
  /** Actor colour; the theme's fallback applies when empty. */
  readonly colour: string;
  readonly isCurrent: boolean;
  readonly isTarget: boolean;
  readonly hpText: string;
  readonly actionsText?: string;
  readonly movesText?: string;
  readonly equipmentText?: string;
  readonly weaponText?: string;
  readonly armourText?: string;
  readonly shieldText?: string;
  readonly inventoryButtonIcon: string;
  /** The open inventory popover, or null when closed. */
  readonly inventory: HeroInventoryVm | null;
}

export interface HeroCardsViewModel {
  readonly cards: readonly HeroCardVm[];
}

export interface HeroCardLayoutItem {
  card: HeroCardVm;
  bounds: Rect;
  inventoryButtonBounds: Rect;
}

export interface HeroInventoryItemLayout {
  item: HeroInventoryItemVm;
  bounds: Rect;
  useButtonBounds?: Rect;
}

export interface HeroInventoryLayout {
  inventory: HeroInventoryVm;
  heroId: string;
  bounds: Rect;
  closeButtonBounds: Rect;
  titleText: string;
  items: HeroInventoryItemLayout[];
}

export interface HeroCardsLayout {
  containerBounds: Rect;
  cards: HeroCardLayoutItem[];
  inventories: HeroInventoryLayout[];
}

/** Semantic hit: which hero-card affordance is under the point. */
export type HeroCardsHit =
  | { kind: 'inventoryClose'; heroId: string }
  | { kind: 'inventoryUseItem'; heroId: string; itemIndex: number }
  | { kind: 'inventory'; heroId: string }
  | { kind: 'inventoryButton'; heroId: string }
  | { kind: 'card'; heroId: string }
  | null;

export const layoutHeroCards = (
  vm: HeroCardsViewModel,
  viewBounds: Rect,
): HeroCardsLayout => {
  const emptyLayout: HeroCardsLayout = {
    containerBounds: { x: 0, y: 0, width: 0, height: 0 },
    cards: [],
    inventories: [],
  };

  const { width: viewWidth, height: viewHeight } = viewBounds;
  if (viewWidth <= 0 || viewHeight <= 0 || vm.cards.length === 0) {
    return emptyLayout;
  }

  const marginX = 8;
  const marginY = 8;
  const cardGap = 6;
  const maxTotalWidth = viewWidth * 0.5;
  const availableWidth = Math.max(0, maxTotalWidth - marginX);

  const numHeroes = vm.cards.length;
  // Calculate card width such that total cards width with gaps <= 50% of viewWidth
  const calculatedCardWidth = Math.max(
    80,
    Math.floor((availableWidth - (numHeroes - 1) * cardGap) / numHeroes),
  );
  const cardWidth = Math.min(180, calculatedCardWidth);

  const cards: HeroCardLayoutItem[] = [];
  const inventories: HeroInventoryLayout[] = [];

  let currentX = marginX;
  let minCardY = viewHeight;

  vm.cards.forEach((card) => {
    const cardHeight = card.isCurrent ? 112 : 44; // Compact inactive card: Title (20px) + HP (16px) + padding (8px)

    const cardY = Math.max(8, viewHeight - marginY - cardHeight);
    if (cardY < minCardY) {
      minCardY = cardY;
    }

    const cardBounds: Rect = {
      x: currentX,
      y: cardY,
      width: cardWidth,
      height: cardHeight,
    };

    const invBtnSize = 18;
    const invBtnBounds: Rect = {
      x: cardBounds.x + cardBounds.width - invBtnSize - 4,
      y: cardBounds.y + 3,
      width: invBtnSize,
      height: invBtnSize,
    };

    cards.push({
      card,
      bounds: cardBounds,
      inventoryButtonBounds: invBtnBounds,
    });

    if (card.inventory) {
      const inv = card.inventory;
      const invItems = inv.items;
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

      const popoverBounds: Rect = {
        x: popoverX,
        y: popoverY,
        width: popoverWidth,
        height: Math.max(50, popoverHeight),
      };

      const closeBtnSize = 16;
      const closeBtnBounds: Rect = {
        x: popoverBounds.x + popoverBounds.width - closeBtnSize - 4,
        y: popoverBounds.y + 4,
        width: closeBtnSize,
        height: closeBtnSize,
      };

      const itemLayouts: HeroInventoryItemLayout[] = [];
      let itemY = popoverBounds.y + headerHeight + 4;

      invItems.forEach((item) => {
        const itemBounds: Rect = {
          x: popoverBounds.x + 4,
          y: itemY,
          width: popoverBounds.width - 8,
          height: itemRowHeight - 4,
        };

        let useBtnBounds: Rect | undefined;
        if (item.hasUseButton) {
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
          bounds: itemBounds,
          useButtonBounds: useBtnBounds,
        });

        itemY += itemRowHeight;
      });

      inventories.push({
        inventory: inv,
        heroId: inv.heroId,
        bounds: popoverBounds,
        closeButtonBounds: closeBtnBounds,
        titleText: inv.titleText,
        items: itemLayouts,
      });
    }

    currentX += cardWidth + cardGap;
  });

  const totalWidth = currentX - cardGap - marginX;
  const containerBounds: Rect = {
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

export const hitTestHeroCards = (
  layout: HeroCardsLayout,
  point: { x: number; y: number },
): HeroCardsHit => {
  // 1. Check open inventory popovers first (they render on top)
  for (const inv of layout.inventories) {
    if (isPointInRect(point.x, point.y, inv.bounds)) {
      // Check Close button
      if (isPointInRect(point.x, point.y, inv.closeButtonBounds)) {
        return { kind: 'inventoryClose', heroId: inv.heroId };
      }

      // Check item Use buttons
      for (const itemLayout of inv.items) {
        if (
          itemLayout.useButtonBounds &&
          itemLayout.item.isUsable &&
          isPointInRect(point.x, point.y, itemLayout.useButtonBounds)
        ) {
          return {
            kind: 'inventoryUseItem',
            heroId: inv.heroId,
            itemIndex: itemLayout.item.itemIndex,
          };
        }
      }

      return { kind: 'inventory', heroId: inv.heroId };
    }
  }

  // 2. Check hero cards
  for (const card of layout.cards) {
    if (isPointInRect(point.x, point.y, card.bounds)) {
      // Check Backpack button
      if (isPointInRect(point.x, point.y, card.inventoryButtonBounds)) {
        return { kind: 'inventoryButton', heroId: card.card.heroId };
      }
      return { kind: 'card', heroId: card.card.heroId };
    }
  }

  return null;
};

export interface RenderHeroCardsOptions {
  /** Hovered inventory (backpack) button, by hero id. */
  readonly hoveredInventoryHeroId?: string | null;
  /** Hovered popover close button, by hero id. */
  readonly hoveredCloseHeroId?: string | null;
  /** Hovered item use button, by hero id and item index. */
  readonly hoveredUseItem?: { heroId: string; itemIndex: number } | null;
}

// Where in the sheet the frame at `index` sits: square frames laid out
// row-major, columns derived from the sheet width divided by `size`, so both
// single-row strips and rectangular grids work. The index is clamped to the
// last available frame.
export const renderHeroCards = (
  layout: HeroCardsLayout,
  vm: HeroCardsViewModel,
  ui: UiContext,
  options?: RenderHeroCardsOptions,
): void => {
  const { ctx } = ui;
  const theme: UiTheme = ui.theme;
  if (!ctx || layout.cards.length === 0) return;

  const hoveredInventoryHeroId = options?.hoveredInventoryHeroId ?? null;
  const hoveredCloseHeroId = options?.hoveredCloseHeroId ?? null;
  const hoveredUseItem = options?.hoveredUseItem ?? null;

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
  const invTitleFont = composeFont(
    theme,
    theme.typography.sizes.md,
    theme.typography.weights.bold,
  );
  const invItemFont = composeFont(
    theme,
    theme.typography.sizes.sm,
    theme.typography.weights.bold,
  );
  const invDescFont = composeFont(theme, theme.typography.sizes.xxs);
  const invBtnFont = composeFont(
    theme,
    theme.typography.sizes.xxs,
    theme.typography.weights.bold,
  );

  ctx.save();

  // 1. Render Hero Cards
  layout.cards.forEach((item) => {
    const { bounds, card } = item;

    // Card background
    drawRoundedRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, 5);
    ctx.fillStyle = card.colour || theme.palette.surface.cardFallback;
    ctx.fill();

    // Border (highlight active hero)
    if (card.isCurrent) {
      ctx.lineWidth = theme.shape.strokeWidth.thick;
      ctx.strokeStyle = theme.palette.border.heroCurrent;
      ctx.stroke();
    } else {
      ctx.lineWidth = theme.shape.strokeWidth.thin;
      ctx.strokeStyle = theme.palette.border.card;
      ctx.stroke();
    }

    // Header / Title
    ctx.fillStyle = theme.palette.text.cardTitle;
    ctx.font = titleFont;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const maxTitleWidth = bounds.width - item.inventoryButtonBounds.width - 12;
    const displayTitle = truncateText(
      ctx,
      card.title,
      maxTitleWidth,
      titleFont,
      PER_CHAR_WIDTH_FALLBACK,
    );
    ctx.fillText(displayTitle, bounds.x + 5, bounds.y + 12);

    // Inventory Button
    const invBtn = item.inventoryButtonBounds;
    const isInvHovered = hoveredInventoryHeroId === card.heroId;
    drawRoundedRect(ctx, invBtn.x, invBtn.y, invBtn.width, invBtn.height, 3);
    ctx.fillStyle = isInvHovered
      ? theme.palette.surface.inventoryButtonHover
      : theme.palette.surface.inventoryButton;
    ctx.fill();
    ctx.strokeStyle = theme.palette.border.inventoryButton;
    ctx.lineWidth = theme.shape.strokeWidth.thin;
    ctx.stroke();

    ctx.font = composeFont(
      theme,
      theme.typography.sizes.md,
      theme.typography.weights.regular,
      theme.typography.families.plain,
    );
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      card.inventoryButtonIcon,
      invBtn.x + invBtn.width / 2,
      invBtn.y + invBtn.height / 2 + 1,
    );

    // HP Text
    ctx.font = statBoldFont;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = theme.palette.text.cardStat;
    ctx.fillText(card.hpText, bounds.x + 5, bounds.y + 30);

    // If Current Actor, render actions, movement and equipment
    if (card.isCurrent) {
      ctx.font = statFont;

      // Actions and Moves
      if (card.actionsText && card.movesText) {
        ctx.fillText(
          `${card.actionsText}  ${card.movesText}`,
          bounds.x + 5,
          bounds.y + 46,
        );
      }

      // Equipment header
      if (card.equipmentText) {
        ctx.font = statBoldFont;
        ctx.fillText(card.equipmentText, bounds.x + 5, bounds.y + 61);
      }

      // Equipment items
      ctx.font = statFont;
      const maxItemWidth = bounds.width - 10;
      if (card.weaponText) {
        const wTxt = truncateText(
          ctx,
          card.weaponText,
          maxItemWidth,
          statFont,
          PER_CHAR_WIDTH_FALLBACK,
        );
        ctx.fillText(wTxt, bounds.x + 5, bounds.y + 75);
      }
      if (card.armourText) {
        const aTxt = truncateText(
          ctx,
          card.armourText,
          maxItemWidth,
          statFont,
          PER_CHAR_WIDTH_FALLBACK,
        );
        ctx.fillText(aTxt, bounds.x + 5, bounds.y + 88);
      }
      if (card.shieldText) {
        const sTxt = truncateText(
          ctx,
          card.shieldText,
          maxItemWidth,
          statFont,
          PER_CHAR_WIDTH_FALLBACK,
        );
        ctx.fillText(sTxt, bounds.x + 5, bounds.y + 101);
      }
    }
  });

  // 2. Render Open Inventory Popovers Above Cards
  layout.inventories.forEach((inv) => {
    const { bounds, closeButtonBounds, titleText, items, inventory } = inv;

    // Popover Box
    drawRoundedRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, 6);
    ctx.fillStyle = theme.palette.surface.popoverInventory; // Burlywood background
    ctx.fill();
    ctx.lineWidth = theme.shape.strokeWidth.regular;
    ctx.strokeStyle = theme.palette.border.popoverInventory;
    ctx.stroke();

    // Popover Header Title
    ctx.fillStyle = theme.palette.text.inventoryTitle;
    ctx.font = invTitleFont;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const maxTitleW = bounds.width - closeButtonBounds.width - 16;
    const displayTitle = truncateText(
      ctx,
      titleText,
      maxTitleW,
      invTitleFont,
      PER_CHAR_WIDTH_FALLBACK,
    );
    ctx.fillText(displayTitle, bounds.x + 8, bounds.y + 12);

    // Close Button
    const isCloseHovered = hoveredCloseHeroId === inv.heroId;
    drawRoundedRect(
      ctx,
      closeButtonBounds.x,
      closeButtonBounds.y,
      closeButtonBounds.width,
      closeButtonBounds.height,
      3,
    );
    ctx.fillStyle = isCloseHovered
      ? theme.palette.surface.closeButtonHover
      : theme.palette.surface.closeButton;
    ctx.fill();
    ctx.lineWidth = theme.shape.strokeWidth.thin;
    ctx.strokeStyle = theme.palette.border.popoverInventory;
    ctx.stroke();

    ctx.fillStyle = theme.palette.text.inventoryTitle;
    ctx.font = composeFont(
      theme,
      theme.typography.sizes.sm,
      theme.typography.weights.bold,
      theme.typography.families.plain,
    );
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      inventory.closeIcon,
      closeButtonBounds.x + closeButtonBounds.width / 2,
      closeButtonBounds.y + closeButtonBounds.height / 2,
    );

    // Items list
    if (items.length === 0) {
      ctx.fillStyle = theme.palette.text.inventoryEmpty;
      ctx.font = composeFont(
        theme,
        theme.typography.sizes.sm,
        theme.typography.weights.italic,
        theme.typography.families.compact,
      );
      ctx.textAlign = 'center';
      ctx.fillText(
        inventory.emptyText,
        bounds.x + bounds.width / 2,
        bounds.y + 36,
      );
    } else {
      items.forEach((itemLayout) => {
        const item = itemLayout.item;
        const itemB = itemLayout.bounds;

        // Item sprite / icon column: sprite sheet when defined, emoji icon
        // while it loads (or when only an icon is set)
        const hasIconColumn = Boolean(item.sprite || item.icon);
        const iconSize = 28;
        const textLeft = hasIconColumn
          ? itemB.x + 2 + iconSize + 6
          : itemB.x + 2;
        if (hasIconColumn) {
          const iconX = itemB.x + 2;
          const iconY = itemB.y + Math.floor((itemB.height - iconSize) / 2);
          const drawn = item.sprite
            ? drawSpriteFrame(
                ctx,
                ui.assets,
                item.sprite,
                iconX,
                iconY,
                iconSize,
              )
            : false;
          if (!drawn && item.icon) {
            ctx.fillStyle = theme.palette.text.inventoryItem;
            ctx.font = composeFont(
              theme,
              theme.typography.sizes.display,
              theme.typography.weights.regular,
              theme.typography.families.plain,
            );
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(item.icon, iconX + iconSize / 2, iconY + iconSize / 2);
          }
        }

        // Item bottom divider
        ctx.beginPath();
        ctx.moveTo(itemB.x, itemB.y + itemB.height);
        ctx.lineTo(itemB.x + itemB.width, itemB.y + itemB.height);
        ctx.strokeStyle = theme.palette.border.inventoryDivider;
        ctx.lineWidth = theme.shape.strokeWidth.thin;
        ctx.stroke();

        // Item Name
        ctx.fillStyle = theme.palette.text.inventoryItem;
        ctx.font = invItemFont;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        const maxTextW = itemLayout.useButtonBounds
          ? itemLayout.useButtonBounds.x - textLeft - 8
          : itemB.x + itemB.width - 4 - textLeft;

        const displayName = truncateText(
          ctx,
          item.nameText,
          maxTextW,
          invItemFont,
          PER_CHAR_WIDTH_FALLBACK,
        );
        ctx.fillText(displayName, textLeft, itemB.y + 2);

        // Item Description
        if (item.descriptionText) {
          ctx.fillStyle = theme.palette.text.inventoryDescription;
          ctx.font = invDescFont;
          const displayDesc = truncateText(
            ctx,
            item.descriptionText,
            maxTextW,
            invDescFont,
            PER_CHAR_WIDTH_FALLBACK,
          );
          ctx.fillText(displayDesc, textLeft, itemB.y + 16);
        }

        // Use Button if active
        if (itemLayout.useButtonBounds) {
          const btnB = itemLayout.useButtonBounds;
          const isItemHovered =
            hoveredUseItem?.heroId === inv.heroId &&
            hoveredUseItem?.itemIndex === item.itemIndex;

          drawRoundedRect(ctx, btnB.x, btnB.y, btnB.width, btnB.height, 3);

          if (item.isUsable) {
            ctx.fillStyle = isItemHovered
              ? theme.palette.surface.useButtonHover
              : theme.palette.surface.useButton;
            ctx.fill();
            ctx.strokeStyle = theme.palette.border.useButton;
            ctx.lineWidth = theme.shape.strokeWidth.thin;
            ctx.stroke();

            ctx.fillStyle = theme.palette.text.bright;
            ctx.font = invBtnFont;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
              item.useText,
              btnB.x + btnB.width / 2,
              btnB.y + btnB.height / 2,
            );
          } else {
            // Disabled / Used
            ctx.fillStyle = theme.palette.surface.useButtonDisabled;
            ctx.fill();
            ctx.strokeStyle = theme.palette.border.useButtonDisabled;
            ctx.lineWidth = theme.shape.strokeWidth.thin;
            ctx.stroke();

            ctx.fillStyle = theme.palette.text.inventoryUsed;
            ctx.font = invBtnFont;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
              item.usedText,
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
