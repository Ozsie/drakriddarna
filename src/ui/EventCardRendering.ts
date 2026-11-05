// Game-side facade for the event card. The component (layout, hit test,
// render over the view model) lives in the kit; the adapter in
// ./viewmodels/eventCard is the only place that reads GameState. This
// module keeps the historical entry points — including the
// TurnEvent-carrying layout items — so the controller, the hit cascade
// and existing tests work unchanged, with the exact same pixels: parity
// snapshots cover the whole chain.

import type { GameState, TurnEvent } from '../types';
import type { UiEnv, UiContext } from '@hoard-engine/uikit';
import type { Rect } from '@hoard-engine/primitives';
import {
  hitTestEventCard,
  layoutEventCard,
  renderEventCard as renderEventCardComponent,
  type EventCardHit,
  type EventCardLayout as KitLayout,
} from '@hoard-engine/uikit';
import { toEventCardViewModel } from './viewmodels/eventCard';
import { legacyUiEnv } from './env';
import { uiAssetProvider } from './assets';

export {
  formatEventDescription,
  formatEventTitle,
} from './viewmodels/eventCard';

export interface DrawnEventItem {
  event: TurnEvent;
  number: number;
  title: string;
  lines: string[];
  y: number;
  height: number;
}

export interface ActiveEventLayout {
  event: TurnEvent;
  header: string;
  title: string;
  description: string;
  descriptionLines: string[];
  y: number;
  height: number;
}

export interface EventCardLayout {
  bounds: Rect;
  toggleButtonBounds: Rect;
  isCollapsed: boolean;
  isCompact: boolean;
  headerText: string;
  deckSummary: {
    remaining: number;
    total: number;
    drawn: number;
  };
  activeEvent?: ActiveEventLayout;
  drawnEventsHeader?: string;
  drawnEventsHeaderY?: number;
  drawnEvents: DrawnEventItem[];
  hasContent: boolean;
}

export interface RenderEventCardOptions {
  isCollapsed?: boolean;
  isToggleHovered?: boolean;
  env?: UiEnv;
}

export interface EventCardHitResult {
  type: 'toggle' | 'card';
}

const kitLayoutFor = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options: RenderEventCardOptions | undefined,
  ctx: CanvasRenderingContext2D | null | undefined,
): KitLayout => {
  const env = legacyUiEnv(options?.env, { viewWidth, ctx });
  const vm = toEventCardViewModel(state, env.t);
  return layoutEventCard(
    vm,
    { x: 0, y: 0, width: viewWidth, height: viewHeight },
    env,
    { isCollapsed: options?.isCollapsed },
  );
};

export const getEventCardLayout = (
  viewWidth: number,
  viewHeight: number,
  state?: GameState | null,
  options?: RenderEventCardOptions,
  ctx?: CanvasRenderingContext2D | null,
): EventCardLayout => {
  const kitLayout = kitLayoutFor(
    viewWidth,
    viewHeight,
    state,
    options,
    ctx ?? null,
  );
  if (!state || !kitLayout.hasContent) {
    return {
      bounds: kitLayout.bounds,
      toggleButtonBounds: kitLayout.toggleButtonBounds,
      isCollapsed: kitLayout.isCollapsed,
      isCompact: kitLayout.isCompact,
      headerText: kitLayout.headerText,
      deckSummary: kitLayout.deckSummary,
      activeEvent: undefined,
      drawnEvents: [],
      hasContent: kitLayout.hasContent,
    };
  }

  const activeTurnEvent = state.currentEvent;
  const drawnList = (state.eventDeck ?? []).filter((event) => event.used);

  return {
    ...kitLayout,
    activeEvent: kitLayout.activeEvent
      ? {
          event: activeTurnEvent ?? ({} as TurnEvent),
          header: kitLayout.activeEvent.event.header,
          title: kitLayout.activeEvent.title,
          description: kitLayout.activeEvent.description,
          descriptionLines: kitLayout.activeEvent.descriptionLines,
          y: kitLayout.activeEvent.y,
          height: kitLayout.activeEvent.height,
        }
      : undefined,
    drawnEvents: kitLayout.drawnEvents.map((item, index) => ({
      event: drawnList[index] ?? ({} as TurnEvent),
      number: item.number,
      title: item.title,
      lines: item.lines,
      y: item.y,
      height: item.height,
    })),
  };
};

export const getEventCardHit = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  isCollapsed: boolean,
  x: number,
  y: number,
): EventCardHitResult | null => {
  const kitLayout = kitLayoutFor(
    viewWidth,
    viewHeight,
    state,
    { isCollapsed },
    null,
  );
  const hit: EventCardHit = hitTestEventCard(kitLayout, { x, y });
  if (!hit) return null;
  return hit.kind === 'toggle' ? { type: 'toggle' } : { type: 'card' };
};

export const renderEventCard = (
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  viewHeight: number,
  state?: GameState | null,
  options?: RenderEventCardOptions,
): void => {
  if (!state || viewWidth <= 0 || viewHeight <= 0) return;

  const kitLayout = kitLayoutFor(viewWidth, viewHeight, state, options, ctx);
  if (
    !kitLayout.hasContent ||
    kitLayout.bounds.width <= 0 ||
    kitLayout.bounds.height <= 0
  ) {
    return;
  }

  const ui: UiContext = {
    ...legacyUiEnv(options?.env, { viewWidth, ctx }),
    ctx,
    assets: uiAssetProvider,
  };
  renderEventCardComponent(kitLayout, ui, {
    isToggleHovered: options?.isToggleHovered,
  });
};
