import type { GameState, Hero, Item, Weapon, Armour, Shield, TradeItemSlot } from '../types';
import { ItemType } from '../types';
import { i18n } from '../core';
import { getHeroTradableItems } from '../dungeon/BetweenDungeonsLogic';
import { drawRoundedRect, isPointInBounds, type CardBounds } from './HeroCardRendering';
import { wrapText } from './DiaryAndWinConditionRendering';

export interface BetweenDungeonsLayout {
  hasContent: boolean;
  step: 'levelUp' | 'trade';
  backdropBounds: CardBounds;
  panelBounds: CardBounds;
  titleText: string;
  subtitleText: string;
  heroes: HeroSectionLayoutItem[];
  actionButtonBounds: CardBounds;
  actionButtonLabel: string;
  secondaryButtonBounds?: CardBounds;
  secondaryButtonLabel?: string;
  giveButtons: GiveButtonLayoutItem[];
}

export interface HeroSectionLayoutItem {
  heroIndex: number;
  hero: Hero;
  bounds: CardBounds;
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
  bounds: CardBounds;
  nameText: string;
  isSelected: boolean;
}

export interface GiveButtonLayoutItem {
  targetHeroIndex: number;
  bounds: CardBounds;
  label: string;
}

export interface RenderBetweenDungeonsOptions {
  hoveredAction?: boolean;
  hoveredSecondary?: boolean;
  hoveredItem?: { heroIndex: number; slot?: TradeItemSlot; itemIndex?: number } | null;
  hoveredGiveHeroIndex?: number | null;
}

export type BetweenDungeonsHitResult =
  | { type: 'actionButton' }
  | { type: 'secondaryButton' }
  | { type: 'item'; heroIndex: number; slot: TradeItemSlot; itemIndex: number }
  | { type: 'giveItem'; targetHeroIndex: number }
  | { type: 'panel' }
  | { type: 'backdrop' };

const TITLE_FONT = 'bold 18px Arial, Helvetica, sans-serif';
const SUBTITLE_FONT = '13px Arial, Helvetica, sans-serif';
const HERO_NAME_FONT = 'bold 14px Arial, Helvetica, sans-serif';
const BADGE_FONT = 'bold 11px Arial, Helvetica, sans-serif';
const DESC_FONT = '12px Arial, Helvetica, sans-serif';
const BUTTON_FONT = 'bold 14px Arial, Helvetica, sans-serif';
const ITEM_FONT = '11px Arial, Helvetica, sans-serif';
const SMALL_BTN_FONT = 'bold 11px Arial, Helvetica, sans-serif';

export const getBetweenDungeonsLayout = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options?: RenderBetweenDungeonsOptions,
  ctx?: CanvasRenderingContext2D | null,
): BetweenDungeonsLayout => {
  const emptyLayout: BetweenDungeonsLayout = {
    hasContent: false,
    step: 'levelUp',
    backdropBounds: { x: 0, y: 0, width: 0, height: 0 },
    panelBounds: { x: 0, y: 0, width: 0, height: 0 },
    titleText: '',
    subtitleText: '',
    heroes: [],
    actionButtonBounds: { x: 0, y: 0, width: 0, height: 0 },
    actionButtonLabel: '',
    giveButtons: [],
  };

  if (!state || !state.betweenDungeons || viewWidth <= 0 || viewHeight <= 0) {
    return emptyLayout;
  }

  const bd = state.betweenDungeons;
  const isLevelUp = bd.step === 'levelUp';

  const marginX = Math.max(12, Math.floor(viewWidth * 0.05));
  const marginY = Math.max(12, Math.floor(viewHeight * 0.05));
  const panelWidth = Math.min(680, Math.max(340, viewWidth - marginX * 2));
  const panelHeight = Math.min(540, Math.max(360, viewHeight - marginY * 2));
  const panelX = Math.floor((viewWidth - panelWidth) / 2);
  const panelY = Math.floor((viewHeight - panelHeight) / 2);

  const paddingX = 18;
  const paddingY = 16;
  const contentWidth = panelWidth - paddingX * 2;

  const nextDungeonName = bd.nextDungeon?.name ? i18n(bd.nextDungeon.name) : '';
  const completedName = bd.completedDungeonName ? i18n(bd.completedDungeonName) : '';

  const titleText = isLevelUp
    ? i18n('content.betweenDungeons.titleLevelUp', { name: completedName })
    : i18n('content.betweenDungeons.titleTrade');

  const subtitleText = isLevelUp
    ? i18n('content.betweenDungeons.subtitleLevelUp')
    : i18n('content.betweenDungeons.subtitleTrade', { nextDungeon: nextDungeonName || completedName });

  const btnHeight = 36;
  const btnWidth = isLevelUp ? 180 : 220;
  const btnY = panelY + panelHeight - paddingY - btnHeight;
  const btnX = panelX + panelWidth - paddingX - btnWidth;

  const actionButtonBounds: CardBounds = {
    x: btnX,
    y: btnY,
    width: btnWidth,
    height: btnHeight,
  };

  const actionButtonLabel = isLevelUp
    ? i18n('content.betweenDungeons.buttons.tradeItems')
    : bd.nextDungeon
      ? i18n('content.betweenDungeons.buttons.startNextDungeon')
      : i18n('content.betweenDungeons.buttons.finishCampaign');

  let secondaryButtonBounds: CardBounds | undefined = undefined;
  let secondaryButtonLabel: string | undefined = undefined;

  if (!isLevelUp) {
    const secWidth = 100;
    secondaryButtonBounds = {
      x: panelX + paddingX,
      y: btnY,
      width: secWidth,
      height: btnHeight,
    };
    secondaryButtonLabel = i18n('content.betweenDungeons.buttons.backToLevelUp');
  }

  // Calculate layout for heroes
  const heroList = state.heroes as Hero[];
  const heroCount = heroList.length;
  const heroesY = panelY + paddingY + 54;
  const availableHeroHeight = btnY - heroesY - 12;

  const heroesLayout: HeroSectionLayoutItem[] = [];
  const giveButtonsLayout: GiveButtonLayoutItem[] = [];

  if (isLevelUp) {
    // Vertical list of heroes with level up details
    const cardGap = 8;
    const cardHeight = Math.max(50, Math.floor((availableHeroHeight - (heroCount - 1) * cardGap) / Math.max(1, heroCount)));

    heroList.forEach((hero, index) => {
      const cardY = heroesY + index * (cardHeight + cardGap);
      const cardBounds: CardBounds = {
        x: panelX + paddingX,
        y: cardY,
        width: contentWidth,
        height: cardHeight,
      };

      const info = bd.levelUps[index];
      const isLeveledUp = info?.leveledUp ?? false;
      const levelName = i18n(`content.level.${hero.level}`);
      const xpText = info
        ? info.xpToNextLevel
          ? `${i18n('content.betweenDungeons.xpProgress', { xp: String(hero.experience) })} ${i18n('content.betweenDungeons.nextLevelXp', { needed: String(info.xpToNextLevel), nextLevel: i18n(`content.level.${info.nextLevel}`) })}`
          : `${i18n('content.betweenDungeons.xpProgress', { xp: String(hero.experience) })} ${i18n('content.betweenDungeons.maxLevel')}`
        : `${hero.experience} XP`;

      const levelMeaning = info?.levelMeaning || '';

      heroesLayout.push({
        heroIndex: index,
        hero,
        bounds: cardBounds,
        title: i18n(hero.name),
        levelBadge: isLeveledUp ? i18n('content.betweenDungeons.leveledUpBadge') : levelName,
        isLeveledUp,
        xpText,
        levelMeaningText: levelMeaning,
        items: [],
      });
    });
  } else {
    // Trading step: Columns for heroes
    const colGap = 8;
    const colWidth = Math.floor((contentWidth - (heroCount - 1) * colGap) / Math.max(1, heroCount));

    heroList.forEach((hero, hIndex) => {
      const colX = panelX + paddingX + hIndex * (colWidth + colGap);
      const colBounds: CardBounds = {
        x: colX,
        y: heroesY,
        width: colWidth,
        height: availableHeroHeight,
      };

      const itemLayouts: TradeItemLayoutItem[] = [];
      const itemStartY = heroesY + 34;
      const itemRowHeight = 26;
      const itemGap = 4;

      const tradableItems = getHeroTradableItems(hero);

      tradableItems.forEach((entry, entryIndex) => {
        const itemY = itemStartY + entryIndex * (itemRowHeight + itemGap);
        const itemBounds: CardBounds = {
          x: colX + 4,
          y: itemY,
          width: colWidth - 8,
          height: itemRowHeight,
        };

        const isSelected =
          bd.selectedTradeItem?.heroIndex === hIndex &&
          (bd.selectedTradeItem?.slot === entry.slot ||
            (typeof entry.slot === 'number' && bd.selectedTradeItem?.itemIndex === entry.slot));

        let nameText = i18n(entry.item.nameTranslationKey ?? entry.item.name);
        if (entry.category === 'weapon') {
          nameText = `🗡️ ${nameText} (${(entry.item as Weapon).dice})`;
        } else if (entry.category === 'armour') {
          nameText = `🥋 ${nameText} (${(entry.item as Armour).defense})`;
        } else if (entry.category === 'shield') {
          nameText = `🛡️ ${nameText} (${(entry.item as Shield).dice})`;
        } else {
          if (entry.item.type === ItemType.WEAPON) {
            nameText = `🗡️ ${nameText}`;
          } else if (entry.item.type === ItemType.ARMOUR) {
            nameText = `🥋 ${nameText}`;
          } else if (entry.item.type === ItemType.SHIELD) {
            nameText = `🛡️ ${nameText}`;
          } else {
            nameText = `📦 ${nameText}`;
          }
        }

        itemLayouts.push({
          heroIndex: hIndex,
          slot: entry.slot,
          itemIndex: typeof entry.slot === 'number' ? entry.slot : entryIndex,
          item: entry.item,
          category: entry.category,
          bounds: itemBounds,
          nameText,
          isSelected,
        });
      });

      // If an item is selected from another hero, add a "Give" button here
      if (
        bd.selectedTradeItem &&
        bd.selectedTradeItem.heroIndex !== hIndex
      ) {
        const giveBtnY = Math.min(
          colBounds.y + colBounds.height - 30,
          itemStartY + tradableItems.length * (itemRowHeight + itemGap) + 4,
        );
        const giveBtnBounds: CardBounds = {
          x: colX + 6,
          y: giveBtnY,
          width: colWidth - 12,
          height: 24,
        };
        giveButtonsLayout.push({
          targetHeroIndex: hIndex,
          bounds: giveBtnBounds,
          label: i18n('content.betweenDungeons.buttons.giveItem'),
        });
      }

      heroesLayout.push({
        heroIndex: hIndex,
        hero,
        bounds: colBounds,
        title: i18n(hero.name),
        levelBadge: i18n(`content.level.${hero.level}`),
        isLeveledUp: false,
        xpText: `${hero.experience} XP`,
        levelMeaningText: '',
        items: itemLayouts,
      });
    });
  }

  return {
    hasContent: true,
    step: bd.step,
    backdropBounds: { x: 0, y: 0, width: viewWidth, height: viewHeight },
    panelBounds: { x: panelX, y: panelY, width: panelWidth, height: panelHeight },
    titleText,
    subtitleText,
    heroes: heroesLayout,
    actionButtonBounds,
    actionButtonLabel,
    secondaryButtonBounds,
    secondaryButtonLabel,
    giveButtons: giveButtonsLayout,
  };
};

export const getBetweenDungeonsHit = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  x: number,
  y: number,
  options?: RenderBetweenDungeonsOptions,
  ctx?: CanvasRenderingContext2D | null,
): BetweenDungeonsHitResult | null => {
  if (!state || !state.betweenDungeons || viewWidth <= 0 || viewHeight <= 0) {
    return null;
  }

  const layout = getBetweenDungeonsLayout(viewWidth, viewHeight, state, options, ctx);
  if (!layout.hasContent) return null;

  if (isPointInBounds(x, y, layout.actionButtonBounds)) {
    return { type: 'actionButton' };
  }

  if (layout.secondaryButtonBounds && isPointInBounds(x, y, layout.secondaryButtonBounds)) {
    return { type: 'secondaryButton' };
  }

  for (const giveBtn of layout.giveButtons) {
    if (isPointInBounds(x, y, giveBtn.bounds)) {
      return { type: 'giveItem', targetHeroIndex: giveBtn.targetHeroIndex };
    }
  }

  for (const hero of layout.heroes) {
    for (const item of hero.items) {
      if (isPointInBounds(x, y, item.bounds)) {
        return {
          type: 'item',
          heroIndex: item.heroIndex,
          slot: item.slot,
          itemIndex: item.itemIndex,
        };
      }
    }
  }

  if (isPointInBounds(x, y, layout.panelBounds)) {
    return { type: 'panel' };
  }

  if (isPointInBounds(x, y, layout.backdropBounds)) {
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

  const layout = getBetweenDungeonsLayout(viewWidth, viewHeight, state, options, ctx);
  if (!layout.hasContent) return;

  ctx.save();

  // Dark backdrop
  ctx.fillStyle = 'rgba(10, 12, 16, 0.85)';
  ctx.fillRect(
    layout.backdropBounds.x,
    layout.backdropBounds.y,
    layout.backdropBounds.width,
    layout.backdropBounds.height,
  );

  // Main modal panel
  const p = layout.panelBounds;
  ctx.fillStyle = '#181b22';
  drawRoundedRect(ctx, p.x, p.y, p.width, p.height, 10);
  ctx.fill();

  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, p.x, p.y, p.width, p.height, 10);
  ctx.stroke();

  // Header Title
  ctx.fillStyle = '#fce28a';
  ctx.font = TITLE_FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(layout.titleText, p.x + 18, p.y + 14);

  // Subtitle
  ctx.fillStyle = '#cbd5e1';
  ctx.font = SUBTITLE_FONT;
  ctx.fillText(layout.subtitleText, p.x + 18, p.y + 38);

  // Render Heroes
  if (layout.step === 'levelUp') {
    for (const h of layout.heroes) {
      const hb = h.bounds;
      ctx.fillStyle = h.isLeveledUp ? 'rgba(212, 175, 55, 0.12)' : 'rgba(255, 255, 255, 0.04)';
      drawRoundedRect(ctx, hb.x, hb.y, hb.width, hb.height, 6);
      ctx.fill();

      ctx.strokeStyle = h.isLeveledUp ? '#eab308' : '#334155';
      ctx.lineWidth = h.isLeveledUp ? 1.5 : 1;
      drawRoundedRect(ctx, hb.x, hb.y, hb.width, hb.height, 6);
      ctx.stroke();

      // Hero name & color dot
      ctx.fillStyle = h.hero.colour === 'Red' ? '#ef4444' : h.hero.colour === 'Blue' ? '#3b82f6' : h.hero.colour === 'Yellow' ? '#eab308' : '#10b981';
      ctx.beginPath();
      ctx.arc(hb.x + 14, hb.y + 16, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f8fafc';
      ctx.font = HERO_NAME_FONT;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(h.title, hb.x + 26, hb.y + 16);

      // XP info
      ctx.fillStyle = '#94a3b8';
      ctx.font = DESC_FONT;
      ctx.fillText(h.xpText, hb.x + 140, hb.y + 16);

      // Level badge
      const badgeX = hb.x + hb.width - 110;
      const badgeY = hb.y + 6;
      ctx.fillStyle = h.isLeveledUp ? '#ca8a04' : '#1e293b';
      drawRoundedRect(ctx, badgeX, badgeY, 100, 20, 4);
      ctx.fill();
      ctx.strokeStyle = h.isLeveledUp ? '#fde047' : '#475569';
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, badgeX, badgeY, 100, 20, 4);
      ctx.stroke();

      ctx.fillStyle = h.isLeveledUp ? '#ffffff' : '#e2e8f0';
      ctx.font = BADGE_FONT;
      ctx.textAlign = 'center';
      ctx.fillText(h.levelBadge, badgeX + 50, badgeY + 10);

      // Level Meaning explanation
      ctx.fillStyle = h.isLeveledUp ? '#fef08a' : '#cbd5e1';
      ctx.font = DESC_FONT;
      ctx.textAlign = 'left';
      ctx.fillText(h.levelMeaningText, hb.x + 26, hb.y + 36);
    }
  } else {
    // Trading step
    for (const h of layout.heroes) {
      const hb = h.bounds;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      drawRoundedRect(ctx, hb.x, hb.y, hb.width, hb.height, 6);
      ctx.fill();

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, hb.x, hb.y, hb.width, hb.height, 6);
      ctx.stroke();

      // Hero header
      ctx.fillStyle = h.hero.colour === 'Red' ? '#ef4444' : h.hero.colour === 'Blue' ? '#3b82f6' : h.hero.colour === 'Yellow' ? '#eab308' : '#10b981';
      ctx.beginPath();
      ctx.arc(hb.x + 12, hb.y + 14, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f8fafc';
      ctx.font = HERO_NAME_FONT;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(h.title, hb.x + 22, hb.y + 14);

      if (h.items.length === 0) {
        ctx.fillStyle = '#64748b';
        ctx.font = ITEM_FONT;
        ctx.fillText(i18n('content.betweenDungeons.noItems'), hb.x + 10, hb.y + 42);
      }

      // Render Items
      for (const it of h.items) {
        const ib = it.bounds;
        const isHovered =
          options?.hoveredItem?.heroIndex === it.heroIndex &&
          options?.hoveredItem?.itemIndex === it.itemIndex;

        ctx.fillStyle = it.isSelected
          ? '#854d0e'
          : isHovered
            ? '#334155'
            : '#1e293b';
        drawRoundedRect(ctx, ib.x, ib.y, ib.width, ib.height, 4);
        ctx.fill();

        ctx.strokeStyle = it.isSelected ? '#facc15' : '#475569';
        ctx.lineWidth = it.isSelected ? 1.5 : 1;
        drawRoundedRect(ctx, ib.x, ib.y, ib.width, ib.height, 4);
        ctx.stroke();

        ctx.fillStyle = it.isSelected ? '#fef08a' : '#f1f5f9';
        ctx.font = ITEM_FONT;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(it.nameText, ib.x + 6, ib.y + ib.height / 2);
      }
    }

    // Give buttons
    for (const gb of layout.giveButtons) {
      const gbb = gb.bounds;
      const isHovered = options?.hoveredGiveHeroIndex === gb.targetHeroIndex;
      ctx.fillStyle = isHovered ? '#15803d' : '#166534';
      drawRoundedRect(ctx, gbb.x, gbb.y, gbb.width, gbb.height, 4);
      ctx.fill();

      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, gbb.x, gbb.y, gbb.width, gbb.height, 4);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = SMALL_BTN_FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(gb.label, gbb.x + gbb.width / 2, gbb.y + gbb.height / 2);
    }
  }

  // Secondary Button (Back)
  if (layout.secondaryButtonBounds && layout.secondaryButtonLabel) {
    const sb = layout.secondaryButtonBounds;
    const isHovered = Boolean(options?.hoveredSecondary);
    ctx.fillStyle = isHovered ? '#475569' : '#334155';
    drawRoundedRect(ctx, sb.x, sb.y, sb.width, sb.height, 6);
    ctx.fill();

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, sb.x, sb.y, sb.width, sb.height, 6);
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = BUTTON_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(layout.secondaryButtonLabel, sb.x + sb.width / 2, sb.y + sb.height / 2);
  }

  // Action Button
  const ab = layout.actionButtonBounds;
  const isHovered = Boolean(options?.hoveredAction);
  ctx.fillStyle = isHovered ? '#b45309' : '#92400e';
  drawRoundedRect(ctx, ab.x, ab.y, ab.width, ab.height, 6);
  ctx.fill();

  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, ab.x, ab.y, ab.width, ab.height, 6);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = BUTTON_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(layout.actionButtonLabel, ab.x + ab.width / 2, ab.y + ab.height / 2);

  ctx.restore();
};
