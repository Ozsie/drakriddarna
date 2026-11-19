// Game-side facade for the event card. The component (layout, hit test,
// render over the view model) lives in the kit; the adapter in
// ./viewmodels/eventCard is the only place that reads GameState. This
// module keeps the historical entry points — including the
// TurnEvent-carrying layout items — so the controller, the hit cascade
// and existing tests work unchanged, with the exact same pixels: parity
// snapshots cover the whole chain.

import type { GameState, TurnEvent } from '../types';
import type {
  CompositionLayoutNode,
  CompositionNode,
  UiEnv,
  UiContext,
} from '@hoard-engine/uikit';
import type { Rect } from '@hoard-engine/primitives';
import { composeFont, wrapTextMeasured } from '@hoard-engine/primitives';
import {
  COMPACT_TOGGLE_SIZE,
  hitTestComposition,
  layoutComposition,
  renderComposition,
} from '@hoard-engine/uikit';
import {
  toEventCardViewModel,
  type EventCardViewModel,
} from './viewmodels/eventCard';
import { legacyUiEnv } from './env';
import { uiAssetProvider } from './assets';

export {
  formatEventDescription,
  formatEventTitle,
} from './viewmodels/eventCard';

export type { DrawnEventVm, EventCardViewModel } from './viewmodels/eventCard';

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

interface EventCardGeometry {
  bounds: Rect;
  toggleButtonBounds: Rect;
  isCollapsed: boolean;
  isCompact: boolean;
  headerText: string;
  deckSummary: EventCardLayout['deckSummary'];
  activeEvent?: {
    event: EventCardViewModel['activeEvent'];
    title: string;
    description: string;
    descriptionLines: string[];
    y: number;
    height: number;
  };
  drawnEventsHeader?: string;
  drawnEventsHeaderY?: number;
  drawnEvents: {
    number: number;
    title: string;
    lines: string[];
    y: number;
    height: number;
  }[];
  hasContent: boolean;
}

const kitLayoutFor = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options: RenderEventCardOptions | undefined,
  ctx: CanvasRenderingContext2D | null | undefined,
): EventCardGeometry => {
  const env = legacyUiEnv(options?.env, { viewWidth, ctx });
  const vm = toEventCardViewModel(state, env.t);
  const isCollapsed = Boolean(options?.isCollapsed);
  const empty = (): EventCardGeometry => ({
    bounds: { x: 0, y: 0, width: 0, height: 0 },
    toggleButtonBounds: { x: 0, y: 0, width: 0, height: 0 },
    isCollapsed,
    isCompact: false,
    headerText: '',
    deckSummary: { remaining: 0, total: 0, drawn: 0 },
    drawnEvents: [],
    hasContent: false,
  });
  if (
    !vm ||
    (vm.deckSummary.total === 0 && !vm.activeEvent) ||
    viewWidth <= 0 ||
    viewHeight <= 0
  ) {
    return empty();
  }

  const { remaining, total, drawn } = vm.deckSummary;
  const marginX = 8;
  const topY = 46;
  const paddingX = 8;
  const paddingY = 6;
  const lineHeight = 13;
  const panelWidth = Math.min(
    240,
    Math.max(180, Math.min(220, viewWidth - marginX * 2)),
  );
  const contentWidth = Math.max(0, panelWidth - paddingX * 2);
  const panelX = marginX;
  const toggleButtonBounds: Rect = {
    x: panelX + panelWidth - paddingX - 18,
    y: topY + 4,
    width: 18,
    height: 18,
  };
  const isCompact = env.mode === 'compact';

  if (isCollapsed) {
    const bounds = isCompact
      ? {
          x: marginX,
          y: topY,
          width: COMPACT_TOGGLE_SIZE,
          height: COMPACT_TOGGLE_SIZE,
        }
      : { x: panelX, y: topY, width: panelWidth, height: 28 };
    return {
      bounds,
      toggleButtonBounds: isCompact ? bounds : toggleButtonBounds,
      isCollapsed: true,
      isCompact,
      headerText: vm.headerText,
      deckSummary: { remaining, total, drawn },
      drawnEvents: [],
      hasContent: true,
    };
  }

  let currentY = topY + paddingY + 16;
  const bodyFont = composeFont(env.theme, env.theme.typography.sizes.xxs);
  let activeEvent: EventCardGeometry['activeEvent'];
  if (vm.activeEvent) {
    const descriptionLines = wrapTextMeasured(
      env.measure,
      vm.activeEvent.description,
      contentWidth,
      bodyFont,
    );
    const height = 28 + descriptionLines.length * lineHeight;
    activeEvent = {
      event: vm.activeEvent,
      title: vm.activeEvent.title,
      description: vm.activeEvent.description,
      descriptionLines,
      y: currentY,
      height,
    };
    currentY += height + 8;
  }

  const drawnEventsHeaderY = currentY;
  currentY += 15;
  const drawnEvents = vm.drawnEvents.length
    ? vm.drawnEvents.map((event) => {
        const lines = wrapTextMeasured(
          env.measure,
          event.title,
          contentWidth,
          bodyFont,
        );
        const height = lines.length * lineHeight;
        const item = {
          number: event.number,
          title: event.title,
          lines,
          y: currentY,
          height,
        };
        currentY += height + 2;
        return item;
      })
    : (() => {
        const lines = [vm.emptyDrawnText];
        const item = {
          number: 0,
          title: vm.emptyDrawnText,
          lines,
          y: currentY,
          height: lineHeight,
        };
        currentY += lineHeight + 4;
        return [item];
      })();

  const totalHeight = currentY - topY + paddingY;
  const maxHeight = Math.max(40, viewHeight - topY - marginX);
  return {
    bounds: {
      x: panelX,
      y: topY,
      width: panelWidth,
      height: Math.min(maxHeight, totalHeight),
    },
    toggleButtonBounds,
    isCollapsed: false,
    isCompact,
    headerText: vm.headerText,
    deckSummary: { remaining, total, drawn },
    activeEvent,
    drawnEventsHeader: vm.drawnEventsHeader,
    drawnEventsHeaderY,
    drawnEvents,
    hasContent: true,
  };
};

const positioned = (node: CompositionNode, bounds: Rect): CompositionNode => ({
  ...node,
  width: bounds.width,
  height: bounds.height,
  offsetX: bounds.x,
  offsetY: bounds.y,
  alignSelf: 'start',
  justifySelf: 'start',
});

const textNode = (
  text: string,
  bounds: Rect,
  style: NonNullable<CompositionNode['themeStyle']>,
  align: CanvasTextAlign = 'left',
  baseline: CanvasTextBaseline = 'top',
  lineHeight = 13,
): CompositionNode =>
  positioned(
    { type: 'text', text, align, baseline, lineHeight, themeStyle: style },
    bounds,
  );

const eventCardComposition = (
  layout: EventCardGeometry,
  viewWidth: number,
  viewHeight: number,
  env: UiEnv,
  isToggleHovered = false,
): CompositionLayoutNode | null => {
  if (
    !layout.hasContent ||
    layout.bounds.width <= 0 ||
    layout.bounds.height <= 0
  ) {
    return null;
  }
  const { bounds, toggleButtonBounds } = layout;
  const children: CompositionNode[] = [
    positioned(
      {
        type: 'fill',
        shape: 'roundedRect',
        themeStyle: {
          surface: 'panelCorner',
          border: 'hairline',
          strokeWidth: 'thin',
          radius: 6,
        },
      },
      bounds,
    ),
  ];
  const hitBounds = layout.isCollapsed
    ? bounds
    : {
        x: bounds.x,
        y: bounds.y + 26,
        width: bounds.width,
        height: Math.max(0, bounds.height - 26),
      };
  children.push(
    positioned(
      { type: 'hitTarget', actionId: layout.isCollapsed ? 'toggle' : 'card' },
      hitBounds,
    ),
  );
  if (!layout.isCollapsed) {
    children.push(
      positioned(
        { type: 'hitTarget', actionId: 'toggle' },
        { x: bounds.x, y: bounds.y, width: bounds.width, height: 26 },
      ),
    );
  }
  if (layout.isCollapsed && layout.isCompact) {
    children.push(
      textNode(
        '🎴',
        { x: bounds.x, y: bounds.y + 2, width: bounds.width, height: 24 },
        { text: 'panelHeader', fontSize: 'xxxl', fontFamily: 'plain' },
        'center',
        'middle',
      ),
      textNode(
        `${layout.deckSummary.remaining}`,
        { x: bounds.x, y: bounds.y + 20, width: bounds.width, height: 18 },
        { text: 'secondary', fontSize: 'xxs', fontWeight: 'bold' },
        'center',
        'middle',
      ),
    );
    return layoutComposition(
      { type: 'stack', width: viewWidth, height: viewHeight, children },
      { x: 0, y: 0, width: viewWidth, height: viewHeight },
      env,
    );
  }

  children.push(
    textNode(
      layout.headerText,
      {
        x: bounds.x + 8,
        y: bounds.y + 7,
        width: bounds.width - 34,
        height: 18,
      },
      { text: 'panelHeader', fontSize: 'sm', fontWeight: 'bold' },
    ),
    positioned(
      {
        type: 'fill',
        shape: 'roundedRect',
        themeStyle: {
          surface: isToggleHovered ? 'toggleHover' : 'toggle',
          border: isToggleHovered ? 'panelCornerHover' : 'toggle',
          strokeWidth: 'thin',
          radius: 3,
        },
        hoverThemeStyle: {
          surface: 'toggleHover',
          border: 'panelCornerHover',
          strokeWidth: 'thin',
          radius: 3,
        },
      },
      toggleButtonBounds,
    ),
    positioned({ type: 'hitTarget', actionId: 'toggle' }, toggleButtonBounds),
    textNode(
      layout.isCollapsed ? '+' : '−',
      toggleButtonBounds,
      {
        text: isToggleHovered ? 'bright' : 'secondary',
        fontSize: 'sm',
        fontWeight: 'bold',
      },
      'center',
      'middle',
    ),
  );
  if (layout.isCollapsed) {
    return layoutComposition(
      { type: 'stack', width: viewWidth, height: viewHeight, children },
      { x: 0, y: 0, width: viewWidth, height: viewHeight },
      env,
    );
  }

  if (layout.activeEvent) {
    const active = layout.activeEvent;
    children.push(
      textNode(
        active.event?.header ?? '',
        { x: bounds.x + 8, y: active.y, width: bounds.width - 16, height: 14 },
        { text: 'muted', fontSize: 'xxs', fontWeight: 'bold' },
      ),
      textNode(
        active.title,
        {
          x: bounds.x + 8,
          y: active.y + 14,
          width: bounds.width - 16,
          height: 14,
        },
        { text: 'body', fontSize: 'xs', fontWeight: 'bold' },
      ),
    );
    active.descriptionLines.forEach((line, index) => {
      children.push(
        textNode(
          line,
          {
            x: bounds.x + 8,
            y: active.y + 28 + index * 13,
            width: bounds.width - 16,
            height: 13,
          },
          { text: 'body', fontSize: 'xxs' },
        ),
      );
    });
  }
  if (layout.drawnEventsHeader && layout.drawnEventsHeaderY !== undefined) {
    children.push(
      textNode(
        layout.drawnEventsHeader,
        {
          x: bounds.x + 8,
          y: layout.drawnEventsHeaderY,
          width: bounds.width - 16,
          height: 15,
        },
        { text: 'muted', fontSize: 'xxs', fontWeight: 'bold' },
      ),
    );
  }
  for (const event of layout.drawnEvents) {
    event.lines.forEach((line, index) => {
      children.push(
        textNode(
          line,
          {
            x: bounds.x + 8,
            y: event.y + index * 13,
            width: bounds.width - 16,
            height: 13,
          },
          { text: 'body', fontSize: 'xxs' },
        ),
      );
    });
  }

  const composition: CompositionNode = {
    type: 'stack',
    width: viewWidth,
    height: viewHeight,
    children,
  };
  return layoutComposition(
    composition,
    { x: 0, y: 0, width: viewWidth, height: viewHeight },
    env,
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
          header: kitLayout.activeEvent.event?.header ?? '',
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
  const env = legacyUiEnv(undefined, { viewWidth });
  const composition = eventCardComposition(
    kitLayout,
    viewWidth,
    viewHeight,
    env,
  );
  const hit = composition ? hitTestComposition(composition, { x, y }) : null;
  if (!hit) return null;
  return hit.actionId === 'toggle'
    ? { type: 'toggle' }
    : hit.actionId === 'card'
      ? { type: 'card' }
      : null;
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

  const env = legacyUiEnv(options?.env, { viewWidth, ctx });
  const composition = eventCardComposition(
    kitLayout,
    viewWidth,
    viewHeight,
    env,
    options?.isToggleHovered,
  );
  if (!composition) return;
  const ui: UiContext = { ...env, ctx, assets: uiAssetProvider };
  ctx.save();
  renderComposition(composition, ui);
  ctx.restore();
};
