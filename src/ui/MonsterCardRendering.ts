import type { CardBounds } from './HeroCardRendering';
import type { GameState, Monster } from '../types';
import { findVisibleMonsters } from '../monsters/MonsterLogic';
import {
  drawRoundedRect,
  isPointInBounds,
  truncateText,
} from './HeroCardRendering';
import { composeFont } from '../uikit/primitives/text';
import type { Translator, UiEnv } from '../uikit/env';
import { defaultUiEnv, resolveLayoutMode } from './env';
import { i18nTranslator } from './i18nAdapter';

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
  env?: UiEnv;
}

export type MonsterCardsHitResult = {
  type: 'card';
  monster: Monster;
};

const translateOrFallback = (
  key: string,
  fallback: string,
  t: Translator,
): string => {
  const res = t(key);
  return res === key ? fallback : res || fallback;
};

export const getMonsterCardsLayout = (
  viewWidth: number,
  viewHeight: number,
  state?: GameState | null,
  env?: UiEnv,
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

  const currentActor = state.currentActor;
  const targetActor = state.targetActor;

  const isMonsterCurrent = (monster: Monster): boolean =>
    Boolean(currentActor && currentActor === (monster as unknown));
  const isMonsterTarget = (monster: Monster): boolean =>
    Boolean(
      targetActor &&
        (targetActor === (monster as unknown) ||
          (targetActor.name === monster.name &&
            targetActor.position?.x === monster.position?.x &&
            targetActor.position?.y === monster.position?.y)),
    );

  const t = env?.t ?? i18nTranslator;
  // On narrow screens only the active monster's card is drawn, mirroring
  // the hero cards, so the cards never cover the whole board.
  const compact = resolveLayoutMode(env, viewWidth) === 'compact';
  const visibleMonsters = compact
    ? monsters.filter((m) => isMonsterCurrent(m) || isMonsterTarget(m))
    : monsters;

  if (visibleMonsters.length === 0) {
    return emptyLayout;
  }

  const numMonsters = visibleMonsters.length;
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

  visibleMonsters.forEach((monster, index) => {
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

    const isCurrent = isMonsterCurrent(monster);
    const isTarget = isMonsterTarget(monster);

    const monsterNameTranslated = t(monster.nameTranslationKey ?? monster.name);
    const title = `${isTarget ? '*' : ''}${monsterNameTranslated}`;
    const hpLabel = translateOrFallback('content.hero.hp', 'HP', t);
    const hpText = `${hpLabel}: ${monster.health}`;

    const noneLabel = translateOrFallback('content.hero.none', 'None', t);

    const weaponName = monster.weapon
      ? t(monster.weapon.nameTranslationKey ?? monster.weapon.name)
      : noneLabel;
    const weaponDice = monster.weapon?.dice ?? 0;
    const weaponText = `🗡 ${weaponName} (${weaponDice})`;

    const rangedWeaponName = monster.rangedWeapon
      ? t(monster.rangedWeapon.nameTranslationKey ?? monster.rangedWeapon.name)
      : noneLabel;
    const rangedWeaponDice = monster.rangedWeapon?.dice ?? 0;
    const rangedWeaponText = `🏹 ${rangedWeaponName} (${rangedWeaponDice})`;

    const armourName = monster.armour
      ? t(monster.armour.nameTranslationKey ?? monster.armour.name)
      : noneLabel;
    const armourDef = monster.armour?.defense ?? 0;
    const armourText = `🥋 ${armourName} (${armourDef})`;

    const shieldName = monster.shield
      ? t(monster.shield.nameTranslationKey ?? monster.shield.name)
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

  const env = options?.env ?? defaultUiEnv;
  // The raw options.env (possibly undefined) flows into the layout so its
  // width-derived mode fallback keeps working for legacy callers.
  const layout = getMonsterCardsLayout(
    viewWidth,
    viewHeight,
    state,
    options?.env,
  );
  if (!layout.cards || layout.cards.length === 0) return;

  const hoveredMonsterId = options?.hoveredMonsterId ?? null;

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

  ctx.save();

  layout.cards.forEach((item) => {
    const { bounds, monster, isCurrent, isTarget } = item;
    const isHovered =
      hoveredMonsterId &&
      (monster.id === hoveredMonsterId || monster.name === hoveredMonsterId);

    // Card background
    drawRoundedRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, 4);
    ctx.fillStyle = monster.colour || theme.palette.surface.cardFallback;
    ctx.fill();

    // Border
    if (isCurrent) {
      ctx.lineWidth = theme.shape.strokeWidth.heavy;
      ctx.strokeStyle = theme.palette.status.monsterCurrent;
      ctx.stroke();
    } else if (isTarget) {
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
    const displayTitle = truncateText(ctx, item.title, textMaxWidth, titleFont);
    ctx.fillText(displayTitle, bounds.x + 4, bounds.y + 11);

    // HP
    ctx.font = statBoldFont;
    ctx.fillStyle = theme.palette.text.cardStat;
    const displayHp = truncateText(
      ctx,
      item.hpText,
      textMaxWidth,
      statBoldFont,
    );
    ctx.fillText(displayHp, bounds.x + 4, bounds.y + 24);

    // Weapon
    ctx.font = statFont;
    ctx.fillStyle = theme.palette.text.cardDetail;
    const displayWeapon = truncateText(
      ctx,
      item.weaponText,
      textMaxWidth,
      statFont,
    );
    ctx.fillText(displayWeapon, bounds.x + 4, bounds.y + 37);

    let armourYOffset = 50;
    let shieldYOffset = 63;
    if (monster.rangedWeapon) {
      ctx.font = statFont;
      ctx.fillStyle = theme.palette.text.cardDetail;
      const displayWeapon = truncateText(
        ctx,
        item.rangedWeaponText,
        textMaxWidth,
        statFont,
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
      statFont,
    );
    ctx.fillText(displayArmour, bounds.x + 4, bounds.y + armourYOffset);

    // Shield
    const displayShield = truncateText(
      ctx,
      item.shieldText,
      textMaxWidth,
      statFont,
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
