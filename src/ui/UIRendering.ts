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

export interface RenderUIOptions {
  topBar?: RenderTopBarOptions;
  heroCards?: RenderHeroCardsOptions;
  monsterCards?: RenderMonsterCardsOptions;
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
    }
  }
  if (radialMenu) {
    renderRadialMenu(ctx, cellSize, radialMenu, hoveredRadialIndex);
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
