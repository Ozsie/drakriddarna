// Game-side facade for the hero status screen (the full-screen status and
// inventory overlay opened from a hero card's inventory button). The
// component (layout, hit test, render over the view model) lives in the
// kit; the adapter in ./viewmodels/heroStatus is the only place that reads
// GameState. This module keeps the historical entry points — render and
// hit — for the board controller and tests, with the item sources resolved
// on game objects (Hero / Item).

import type { GameState, Hero, Item } from '../types';
import type { HeroStatusSlotId, Rect, UiEnv } from '@hoard-engine/uikit';
import {
  hitTestHeroStatus,
  layoutHeroStatus,
  renderHeroStatus as renderHeroStatusComponent,
  type HeroStatusLayout,
  type HeroStatusViewModel,
} from '@hoard-engine/uikit';
import {
  heroStatusItemForSource,
  heroWithOpenStatus,
  toHeroStatusViewModel,
  type HeroStatusSelection,
  type HeroStatusSelectionSource,
} from './viewmodels/heroStatus';
import { legacyUiContext, legacyUiEnv } from './env';

export type { HeroStatusSelection, HeroStatusSelectionSource };

export interface RenderHeroStatusOptions {
  /** The currently selected item (slot or inventory index), null for none. */
  readonly selection?: HeroStatusSelection | null;
  /** Whether the close button is hovered. */
  readonly isCloseHovered?: boolean;
  /** Whether the detail area's use button is hovered. */
  readonly isUseHovered?: boolean;
  readonly env?: UiEnv;
}

export type HeroStatusHitResult =
  | { type: 'close'; hero: Hero }
  | { type: 'slot'; hero: Hero; slotId: HeroStatusSlotId; item: Item | null }
  | { type: 'item'; hero: Hero; item: Item; itemIndex: number }
  | { type: 'use'; hero: Hero; item: Item; itemIndex: number }
  | { type: 'panel'; hero: Hero }
  | { type: 'backdrop'; hero: Hero };

const viewBounds = (viewWidth: number, viewHeight: number): Rect => ({
  x: 0,
  y: 0,
  width: viewWidth,
  height: viewHeight,
});

const viewModel = (
  viewWidth: number,
  state: GameState | null | undefined,
  selection: HeroStatusSelection | null,
  env?: UiEnv,
): { vm: HeroStatusViewModel; env: UiEnv } | null => {
  if (!state || viewWidth <= 0) return null;
  const resolvedEnv = legacyUiEnv(env, { viewWidth });
  const vm = toHeroStatusViewModel(state, selection, resolvedEnv.t);
  return vm ? { vm, env: resolvedEnv } : null;
};

const kitLayoutFor = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  selection: HeroStatusSelection | null,
  env?: UiEnv,
): { layout: HeroStatusLayout; vm: HeroStatusViewModel; env: UiEnv } | null => {
  const built = viewModel(viewWidth, state, selection, env);
  if (!built || viewHeight <= 0) return null;
  const layout = layoutHeroStatus(
    built.vm,
    viewBounds(viewWidth, viewHeight),
    built.env,
  );
  return { layout, vm: built.vm, env: built.env };
};

export const renderHeroStatus = (
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options?: RenderHeroStatusOptions,
): void => {
  const built = kitLayoutFor(
    viewWidth,
    viewHeight,
    state,
    options?.selection ?? null,
    options?.env,
  );
  if (!built) return;

  renderHeroStatusComponent(
    built.layout,
    built.vm,
    legacyUiContext(ctx, built.env, { ctx, viewWidth }),
    viewBounds(viewWidth, viewHeight),
    {
      isCloseHovered: options?.isCloseHovered ?? false,
      isUseHovered: options?.isUseHovered ?? false,
    },
  );
};

export const getHeroStatusHit = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  selection: HeroStatusSelection | null,
  screenX = 0,
  screenY = 0,
  env?: UiEnv,
): HeroStatusHitResult | null => {
  const hero = heroWithOpenStatus(state);
  if (!hero) return null;

  const built = kitLayoutFor(viewWidth, viewHeight, state, selection, env);
  if (!built) return null;

  const hit = hitTestHeroStatus(built.layout, { x: screenX, y: screenY });
  if (!hit) return null;

  switch (hit.kind) {
    case 'close':
      return { type: 'close', hero };
    case 'panel':
      return { type: 'panel', hero };
    case 'backdrop':
      return { type: 'backdrop', hero };
    case 'slot': {
      const item = heroStatusItemForSource(hero, { kind: hit.slotId });
      return { type: 'slot', hero, slotId: hit.slotId, item };
    }
    case 'item': {
      const item = (hero.inventory ?? [])[hit.itemIndex];
      return item
        ? { type: 'item', hero, item, itemIndex: hit.itemIndex }
        : null;
    }
    case 'use': {
      if (!selection || selection.heroId !== hero.name) return null;
      if (selection.source.kind !== 'inventory') return null;
      const item = heroStatusItemForSource(hero, selection.source);
      return item
        ? {
            type: 'use',
            hero,
            item,
            itemIndex: selection.source.itemIndex,
          }
        : null;
    }
  }
  return null;
};
