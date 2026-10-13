import type { CardBounds } from './HeroCardRendering';
import type { GameState, Monster } from '../types';
import { findVisibleMonsters } from '../monsters/MonsterLogic';
import { i18n } from '../core';
import {
  drawRoundedRect,
  isPointInBounds,
  truncateText,
} from './HeroCardRendering';

export interface MonsterCardLayoutItem {
  monster: Monster;
  isCurrent: boolean;
  isTarget: boolean;
  bounds: CardBounds;
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
  containerBounds: CardBounds;
  cards: MonsterCardLayoutItem[];
}

export interface RenderMonsterCardsOptions {
  hoveredMonsterId?: string | null;
}

export type MonsterCardsHitResult = {
  type: 'card';
  monster: Monster;
};

const TITLE_FONT = 'bold 11px Arial, Helvetica, sans-serif';
const STAT_FONT = '10px Arial, Helvetica, sans-serif';
const STAT_BOLD_FONT = 'bold 10px Arial, Helvetica, sans-serif';

const translateOrFallback = (key: string, fallback: string): string => {
  const res = i18n(key);
  return res === key ? fallback : res || fallback;
};

export const getMonsterCardsLayout = (
  viewWidth: number,
  viewHeight: number,
  state?: GameState | null,
): MonsterCardsLayout => {
  const emptyLayout: MonsterCardsLayout = {
    containerBounds: { x: 0, y: 0, width: 0, height: 0 },
    cards: [],
  };

  if (!state || viewWidth <= 0 || viewHeight <= 0) {
    return emptyLayout;
  }

  const monsters = findVisibleMonsters(state);
  if (!monsters || monsters.length === 0) {
    return emptyLayout;
  }

  const marginX = 8;
  const marginY = 8;
  const cardGap = 6;
  const rowGap = 6;
  const cardHeight = 85;

  const numMonsters = monsters.length;
  const maxTotalWidth = viewWidth * 0.5;
  const availableWidth = Math.max(0, maxTotalWidth - marginX);

  const colsInRow = numMonsters <= 6 ? numMonsters : Math.min(6, numMonsters);
  const calculatedCardWidth = Math.max(
    70,
    Math.floor((availableWidth - (colsInRow - 1) * cardGap) / colsInRow),
  );
  const cardWidth = Math.min(140, calculatedCardWidth);

  const currentActor = state.currentActor;
  const targetActor = state.targetActor;

  const cards: MonsterCardLayoutItem[] = [];

  let minX = viewWidth;
  let minY = viewHeight;
  let maxX = 0;
  let maxY = 0;

  monsters.forEach((monster, index) => {
    const row = Math.floor(index / 6);
    const col = index % 6;

    const x = viewWidth - marginX - (col + 1) * cardWidth - col * cardGap;
    const y = viewHeight - marginY - (row + 1) * cardHeight - row * rowGap;

    const bounds: CardBounds = {
      x,
      y,
      width: cardWidth,
      height: cardHeight,
    };

    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);

    const isCurrent = Boolean(
      currentActor && currentActor === (monster as unknown),
    );
    const isTarget = Boolean(
      targetActor &&
        (targetActor === (monster as unknown) ||
          (targetActor.name === monster.name &&
            targetActor.position?.x === monster.position?.x &&
            targetActor.position?.y === monster.position?.y)),
    );

    const monsterNameTranslated = i18n(
      monster.nameTranslationKey ?? monster.name,
    );
    const title = `${isTarget ? '*' : ''}${monsterNameTranslated}`;
    const hpLabel = translateOrFallback('content.hero.hp', 'HP');
    const hpText = `${hpLabel}: ${monster.health}`;

    const noneLabel = translateOrFallback('content.hero.none', 'None');

    const weaponName = monster.weapon
      ? i18n(monster.weapon.nameTranslationKey ?? monster.weapon.name)
      : noneLabel;
    const weaponDice = monster.weapon?.dice ?? 0;
    const weaponText = `🗡 ${weaponName} (${weaponDice})`;

    const rangedWeaponName = monster.rangedWeapon
      ? i18n(
          monster.rangedWeapon.nameTranslationKey ?? monster.rangedWeapon.name,
        )
      : noneLabel;
    const rangedWeaponDice = monster.rangedWeapon?.dice ?? 0;
    const rangedWeaponText = `🏹 ${rangedWeaponName} (${rangedWeaponDice})`;

    const armourName = monster.armour
      ? i18n(monster.armour.nameTranslationKey ?? monster.armour.name)
      : noneLabel;
    const armourDef = monster.armour?.defense ?? 0;
    const armourText = `🥋 ${armourName} (${armourDef})`;

    const shieldName = monster.shield
      ? i18n(monster.shield.nameTranslationKey ?? monster.shield.name)
      : noneLabel;
    const shieldDice = monster.shield?.dice ?? 0;
    const shieldText = `🛡 ${shieldName} (${shieldDice})`;

    cards.push({
      monster,
      isCurrent,
      isTarget,
      bounds,
      title,
      hpText,
      weaponText,
      rangedWeaponText,
      armourText,
      shieldText,
      row,
      col,
    });
  });

  const containerBounds: CardBounds =
    cards.length > 0
      ? {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        }
      : { x: 0, y: 0, width: 0, height: 0 };

  return {
    containerBounds,
    cards,
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

  const layout = getMonsterCardsLayout(viewWidth, viewHeight, state);
  if (!layout.cards || layout.cards.length === 0) return;

  const hoveredMonsterId = options?.hoveredMonsterId ?? null;

  ctx.save();

  layout.cards.forEach((item) => {
    const { bounds, monster, isCurrent, isTarget } = item;
    const isHovered =
      hoveredMonsterId &&
      (monster.id === hoveredMonsterId || monster.name === hoveredMonsterId);

    // Card background
    drawRoundedRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, 4);
    ctx.fillStyle = monster.colour || '#CD5C5C';
    ctx.fill();

    // Border
    if (isCurrent) {
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ef4444';
      ctx.stroke();
    } else if (isTarget) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffd700';
      ctx.stroke();
    } else if (isHovered) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    } else {
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.stroke();
    }

    const textMaxWidth = bounds.width - 8;

    // Title / Monster Name
    ctx.fillStyle = '#111827';
    ctx.font = TITLE_FONT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const displayTitle = truncateText(
      ctx,
      item.title,
      textMaxWidth,
      TITLE_FONT,
    );
    ctx.fillText(displayTitle, bounds.x + 4, bounds.y + 11);

    // HP
    ctx.font = STAT_BOLD_FONT;
    ctx.fillStyle = '#1f2937';
    const displayHp = truncateText(
      ctx,
      item.hpText,
      textMaxWidth,
      STAT_BOLD_FONT,
    );
    ctx.fillText(displayHp, bounds.x + 4, bounds.y + 24);

    // Weapon
    ctx.font = STAT_FONT;
    ctx.fillStyle = '#374151';
    const displayWeapon = truncateText(
      ctx,
      item.weaponText,
      textMaxWidth,
      STAT_FONT,
    );
    ctx.fillText(displayWeapon, bounds.x + 4, bounds.y + 37);

    let armourYOffset = 50;
    let shieldYOffset = 63;
    if (monster.rangedWeapon) {
      ctx.font = STAT_FONT;
      ctx.fillStyle = '#374151';
      const displayWeapon = truncateText(
        ctx,
        item.rangedWeaponText,
        textMaxWidth,
        STAT_FONT,
      );
      ctx.fillText(displayWeapon, bounds.x + 4, bounds.y + 50);
      armourYOffset = 63;
      shieldYOffset = 76;
    }

    // Armour
    const displayArmour = truncateText(
      ctx,
      item.armourText,
      textMaxWidth,
      STAT_FONT,
    );
    ctx.fillText(displayArmour, bounds.x + 4, bounds.y + armourYOffset);

    // Shield
    const displayShield = truncateText(
      ctx,
      item.shieldText,
      textMaxWidth,
      STAT_FONT,
    );
    ctx.fillText(displayShield, bounds.x + 4, bounds.y + shieldYOffset);
  });

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

  const layout = getMonsterCardsLayout(viewWidth, viewHeight, state);
  if (!layout.cards || layout.cards.length === 0) return null;

  if (!isPointInBounds(screenX, screenY, layout.containerBounds)) {
    return null;
  }

  for (const card of layout.cards) {
    if (isPointInBounds(screenX, screenY, card.bounds)) {
      return { type: 'card', monster: card.monster };
    }
  }

  return null;
};
