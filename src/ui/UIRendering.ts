import type { RadialMenuState } from '../store/radialMenuStore';
import type { GameState } from '../types';
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

export interface RenderUIOptions {
  topBar?: RenderTopBarOptions;
  heroCards?: RenderHeroCardsOptions;
  monsterCards?: RenderMonsterCardsOptions;
  eventCard?: RenderEventCardOptions;
  menu?: RenderMenuOptions;
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
  formatWinCondition,
  formatDiaryHeader,
  formatNoteHeader,
  formatNoteMessage,
  type WinConditionLayoutItem,
  type DiaryNoteLayoutItem,
  type DiaryAndWinConditionsLayout,
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
