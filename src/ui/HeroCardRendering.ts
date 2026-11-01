import type { GameState, Hero, Item } from '../types';
import { liveHeroes } from '../hero/HeroLogic';
import { ACTIVE, DESCRIPTION, USED } from '../items/ItemLogic';
import { drawItemSprite } from '../items/ItemSpriteRendering';
import {
  composeFont,
  measureTextWidth as kitMeasureTextWidth,
  truncateText as kitTruncateText,
} from '../uikit/primitives/text';
import { isPointInRect } from '../uikit/primitives/geometry';
import { drawRoundedRect as kitDrawRoundedRect } from '../uikit/primitives/roundedRect';
import type { UiEnv } from '../uikit/env';
import { defaultUiEnv, resolveLayoutMode } from './env';
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

  const currentActorName = state.currentActor?.name;
  const targetActorName = state.targetActor?.name;

  const t = env?.t ?? i18nTranslator;
  // On narrow screens only the active hero's card is drawn; the other
  // cards would cover the board and overlap the monster cards.
  const compact = resolveLayoutMode(env, viewWidth) === 'compact';
  const visibleHeroes = compact
    ? heroes.filter(
        (hero) =>
          hero.name === currentActorName || hero.name === targetActorName,
      )
    : heroes;

  if (visibleHeroes.length === 0) {
    return emptyLayout;
  }

  const numHeroes = visibleHeroes.length;
  // Calculate card width such that total cards width with gaps <= 50% of viewWidth
  const calculatedCardWidth = Math.max(
    80,
    Math.floor((availableWidth - (numHeroes - 1) * cardGap) / numHeroes),
  );
  const cardWidth = Math.min(180, calculatedCardWidth);

  const cards: HeroCardLayoutItem[] = [];
  const inventories: InventoryPopoverLayout[] = [];

  let currentX = marginX;
  let minCardY = viewHeight;

  visibleHeroes.forEach((hero) => {
    const isCurrent = currentActorName === hero.name;
    const isTarget = targetActorName === hero.name;

    const heroNameTranslated = t(hero.name);
    const levelKey = `content.level.${hero.level}`;
    const levelTranslated = t(levelKey);
    const title = `${
      isTarget ? '*' : ''
    }${heroNameTranslated} - ${levelTranslated} (${hero.experience})`;
    const hpText = `${t('content.hero.hp')}: ${hero.health}`;

    let actionsText: string | undefined;
    let movesText: string | undefined;
    let equipmentText: string | undefined;
    let weaponText: string | undefined;
    let armourText: string | undefined;
    let shieldText: string | undefined;

    let cardHeight = 44; // Compact inactive card: Title (20px) + HP (16px) + padding (8px)

    if (isCurrent) {
      actionsText = `${t('content.hero.actions')}: ${hero.actions}`;
      movesText = `${t('content.hero.moves')}: ${hero.movement}`;
      equipmentText = `${t('content.hero.equipment')}:`;
      weaponText = `🗡️ ${t(hero.weapon.name)} (${hero.weapon.dice})`;
      armourText = `🥋 ${
        hero.armour
          ? `${t(hero.armour.name)} (${hero.armour.defense})`
          : `${t('content.hero.none')} (0)`
      }`;
      shieldText = `🛡️ ${
        hero.shield
          ? `${t(hero.shield.name)} (${hero.shield.dice})`
          : `${t('content.hero.none')} (0)`
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
      const invTitle = t('content.inventory.label', {
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

        const itemName = t(item.nameTranslationKey ?? item.name);
        const itemDesc = item.properties?.[DESCRIPTION]
          ? t(String(item.properties[DESCRIPTION]))
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

  const env = options?.env ?? defaultUiEnv;
  // The raw options.env (possibly undefined) flows into the layout so its
  // width-derived mode fallback keeps working for legacy callers.
  const layout = getHeroCardsLayout(viewWidth, viewHeight, state, options?.env);
  if (!layout.cards || layout.cards.length === 0) return;

  const hoveredInvHeroName = options?.hoveredInventoryHeroName ?? null;
  const hoveredCloseHeroName = options?.hoveredCloseHeroName ?? null;
  const hoveredUseItem = options?.hoveredUseItem ?? null;

  const t = env.t;
  const theme = env.theme;
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
    const { bounds, hero, isCurrent } = item;

    // Card background
    drawRoundedRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, 5);
    ctx.fillStyle = hero.colour || theme.palette.surface.cardFallback;
    ctx.fill();

    // Border (highlight active hero)
    if (isCurrent) {
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
      item.title,
      maxTitleWidth,
      titleFont,
    );
    ctx.fillText(displayTitle, bounds.x + 5, bounds.y + 12);

    // Inventory Button (🎒)
    const invBtn = item.inventoryButtonBounds;
    const isInvHovered = hoveredInvHeroName === hero.name;
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
      '🎒',
      invBtn.x + invBtn.width / 2,
      invBtn.y + invBtn.height / 2 + 1,
    );

    // HP Text
    ctx.font = statBoldFont;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = theme.palette.text.cardStat;
    ctx.fillText(item.hpText, bounds.x + 5, bounds.y + 30);

    // If Current Actor, render actions, movement and equipment
    if (isCurrent) {
      ctx.font = statFont;

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
        ctx.font = statBoldFont;
        ctx.fillText(item.equipmentText, bounds.x + 5, bounds.y + 61);
      }

      // Equipment items
      ctx.font = statFont;
      const maxItemWidth = bounds.width - 10;
      if (item.weaponText) {
        const wTxt = truncateText(ctx, item.weaponText, maxItemWidth, statFont);
        ctx.fillText(wTxt, bounds.x + 5, bounds.y + 75);
      }
      if (item.armourText) {
        const aTxt = truncateText(ctx, item.armourText, maxItemWidth, statFont);
        ctx.fillText(aTxt, bounds.x + 5, bounds.y + 88);
      }
      if (item.shieldText) {
        const sTxt = truncateText(ctx, item.shieldText, maxItemWidth, statFont);
        ctx.fillText(sTxt, bounds.x + 5, bounds.y + 101);
      }
    }
  });

  // 2. Render Open Inventory Popovers Above Cards
  layout.inventories.forEach((inv) => {
    const { bounds, closeButtonBounds, titleText, items, hero } = inv;

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
    const displayTitle = truncateText(ctx, titleText, maxTitleW, invTitleFont);
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
      '✕',
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
      ctx.fillText('(Empty)', bounds.x + bounds.width / 2, bounds.y + 36);
    } else {
      items.forEach((itemLayout) => {
        const itemB = itemLayout.bounds;

        // Item sprite / icon column: sprite sheet when defined, emoji icon
        // while it loads (or when only an icon is set)
        const hasIconColumn = Boolean(
          itemLayout.item.sprite || itemLayout.item.icon,
        );
        const iconSize = 28;
        const textLeft = hasIconColumn
          ? itemB.x + 2 + iconSize + 6
          : itemB.x + 2;
        if (hasIconColumn) {
          const iconX = itemB.x + 2;
          const iconY = itemB.y + Math.floor((itemB.height - iconSize) / 2);
          const drawn = itemLayout.item.sprite
            ? drawItemSprite(
                ctx,
                itemLayout.item.sprite,
                iconX,
                iconY,
                iconSize,
              )
            : false;
          if (!drawn && itemLayout.item.icon) {
            ctx.fillStyle = theme.palette.text.inventoryItem;
            ctx.font = composeFont(
              theme,
              theme.typography.sizes.display,
              theme.typography.weights.regular,
              theme.typography.families.plain,
            );
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
              itemLayout.item.icon,
              iconX + iconSize / 2,
              iconY + iconSize / 2,
            );
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
          itemLayout.nameText,
          maxTextW,
          invItemFont,
        );
        ctx.fillText(displayName, textLeft, itemB.y + 2);

        // Item Description
        if (itemLayout.descriptionText) {
          ctx.fillStyle = theme.palette.text.inventoryDescription;
          ctx.font = invDescFont;
          const displayDesc = truncateText(
            ctx,
            itemLayout.descriptionText,
            maxTextW,
            invDescFont,
          );
          ctx.fillText(displayDesc, textLeft, itemB.y + 16);
        }

        // Use Button if active
        if (itemLayout.useButtonBounds) {
          const btnB = itemLayout.useButtonBounds;
          const isItemHovered =
            hoveredUseItem?.heroName === hero.name &&
            hoveredUseItem?.itemIndex === itemLayout.itemIndex;

          drawRoundedRect(ctx, btnB.x, btnB.y, btnB.width, btnB.height, 3);

          if (itemLayout.isUsable) {
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
              t('content.inventory.use') || 'Use',
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
              t('content.inventory.used') || 'Used',
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
