import type { RadialMenuState } from '../store/radialMenuStore';
import type { GameState } from '../types';
import type { CursorType } from '../hero/ClickInputLogic';
import { renderRadialMenu } from './RadialMenuRendering';
import { renderTopBar, type RenderTopBarOptions } from './TopBarRendering';
import {
  renderHeroCards,
  type RenderHeroCardsOptions,
} from './HeroCardRendering';
import {
  renderMonsterCards,
  type RenderMonsterCardsOptions,
} from './MonsterCardRendering';
import { renderMenuModal, type RenderMenuOptions } from './MenuRendering';
import { renderDiaryAndWinConditions } from './DiaryAndWinConditionRendering';
import {
  renderEventCard,
  type RenderEventCardOptions,
} from './EventCardRendering';
import {
  renderDungeonIntro,
  type RenderDungeonIntroOptions,
} from './DungeonIntroRendering';
import {
  renderBetweenDungeons,
  type RenderBetweenDungeonsOptions,
} from './BetweenDungeonsRendering';

export interface RenderUIOptions {
  topBar?: RenderTopBarOptions;
  heroCards?: RenderHeroCardsOptions;
  monsterCards?: RenderMonsterCardsOptions;
  eventCard?: RenderEventCardOptions;
  menu?: RenderMenuOptions;
  dungeonIntro?: RenderDungeonIntroOptions;
  betweenDungeons?: RenderBetweenDungeonsOptions;
}

export const renderUI = (
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  radialMenu?: RadialMenuState | null,
  hoveredRadialIndex?: number | null,
  state?: GameState | null,
  viewWidth?: number,
  viewHeight?: number,
  options?: RenderUIOptions,
) => {
  if (state && viewWidth && viewWidth > 0) {
    renderTopBar(ctx, viewWidth, state, options?.topBar);
    if (viewHeight && viewHeight > 0) {
      renderHeroCards(ctx, viewWidth, viewHeight, state, options?.heroCards);
      renderMonsterCards(
        ctx,
        viewWidth,
        viewHeight,
        state,
        options?.monsterCards,
      );
      renderDiaryAndWinConditions(ctx, viewWidth, viewHeight, state);
      renderEventCard(ctx, viewWidth, viewHeight, state, options?.eventCard);
    }
  }
  if (radialMenu) {
    renderRadialMenu(ctx, cellSize, radialMenu, hoveredRadialIndex);
  }
  if (
    state &&
    viewWidth &&
    viewWidth > 0 &&
    viewHeight &&
    viewHeight > 0 &&
    options?.menu
  ) {
    renderMenuModal(ctx, viewWidth, viewHeight, state, options.menu);
  }
  if (
    state &&
    viewWidth &&
    viewWidth > 0 &&
    viewHeight &&
    viewHeight > 0 &&
    options?.dungeonIntro
  ) {
    renderDungeonIntro(ctx, viewWidth, viewHeight, state, options.dungeonIntro);
  }
  if (
    state &&
    viewWidth &&
    viewWidth > 0 &&
    viewHeight &&
    viewHeight > 0 &&
    state.betweenDungeons
  ) {
    renderBetweenDungeons(
      ctx,
      viewWidth,
      viewHeight,
      state,
      options?.betweenDungeons,
    );
  }
};

export * from './RadialMenuRendering';
export * from './TopBarRendering';
export {
  renderHeroCards,
  getHeroCardsLayout,
  getHeroCardsHit,
  type CardBounds,
  type HeroCardLayoutItem,
  type InventoryItemLayout,
  type InventoryPopoverLayout,
  type HeroCardsLayout,
  type RenderHeroCardsOptions,
  type HeroCardsHitResult,
} from './HeroCardRendering';
export {
  renderMonsterCards,
  getMonsterCardsLayout,
  getMonsterCardsHit,
  type MonsterCardLayoutItem,
  type MonsterCardsLayout,
  type RenderMonsterCardsOptions,
  type MonsterCardsHitResult,
} from './MonsterCardRendering';
export {
  renderMenuModal,
  getMenuLayout,
  getMenuHit,
  type MenuItemLayout,
  type MenuLayout,
  type RenderMenuOptions,
  type MenuHitResult,
} from './MenuRendering';
export {
  renderDiaryAndWinConditions,
  getDiaryAndWinConditionsLayout,
  getDiaryAndWinConditionsHit,
  formatWinCondition,
  formatDiaryHeader,
  formatNoteHeader,
  formatNoteMessage,
  type WinConditionLayoutItem,
  type DiaryNoteLayoutItem,
  type DiaryAndWinConditionsLayout,
  type DiaryAndWinConditionsHitResult,
} from './DiaryAndWinConditionRendering';
export {
  renderEventCard,
  getEventCardLayout,
  getEventCardHit,
  formatEventTitle,
  formatEventDescription,
  type EventCardLayout,
  type RenderEventCardOptions,
  type EventCardHitResult,
  type ActiveEventLayout,
  type DrawnEventItem,
} from './EventCardRendering';
export {
  renderDungeonIntro,
  getDungeonIntroLayout,
  getDungeonIntroHit,
  shouldShowDungeonIntro,
  dismissDungeonIntro,
  type DungeonIntroLayout,
  type RenderDungeonIntroOptions,
  type DungeonIntroHitResult,
} from './DungeonIntroRendering';
export {
  renderBetweenDungeons,
  getBetweenDungeonsLayout,
  getBetweenDungeonsHit,
  type BetweenDungeonsLayout,
  type RenderBetweenDungeonsOptions,
  type BetweenDungeonsHitResult,
} from './BetweenDungeonsRendering';
export {
  renderDebugPrintout,
  getDebugPrintoutPosition,
  type DebugPrintoutCounts,
} from './DebugOverlayRendering';
export {
  renderSaveLoadDialog,
  getSaveLoadDialogLayout,
  getSaveLoadDialogHit,
  type RenderSaveLoadDialogOptions,
  type SaveLoadDialogHitResult,
  type SaveLoadDialogLayout,
  type SaveLoadDialogMode,
} from './SaveLoadDialogRendering';

// Board cursors for the three interactive tile actions; '' means the plain
// default cursor. The CSS cursor for each is built once and cached.
const cursorEmojis: Record<CursorType, string> = {
  sword: '⚔️',
  boot: '🥾',
  menu: '📜',
  default: '',
};

const emojiCursorCache = new Map<CursorType, string>();

export const emojiCursor = (cursorType: CursorType): string => {
  if (cursorType === 'default') return 'default';
  const cached = emojiCursorCache.get(cursorType);
  if (cached) return cached;
  const emoji = cursorEmojis[cursorType];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><text x='0' y='16' font-size='20'>${emoji}</text></svg>`;
  const cursor = `url("data:image/svg+xml,${encodeURIComponent(
    svg,
  )}") 4 28, pointer`;
  emojiCursorCache.set(cursorType, cursor);
  return cursor;
};
