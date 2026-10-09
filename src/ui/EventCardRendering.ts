import type { GameState, TurnEvent } from '../types';
import { i18n } from '../core';
import { drawRoundedRect, type CardBounds } from './HeroCardRendering';
import { wrapText } from './DiaryAndWinConditionRendering';

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
  bounds: CardBounds;
  toggleButtonBounds: CardBounds;
  isCollapsed: boolean;
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
}

export interface EventCardHitResult {
  type: 'toggle' | 'card';
}

const DEFAULT_FONT = '10px Arial, Helvetica, sans-serif';
const HEADER_FONT = 'bold 11px Arial, Helvetica, sans-serif';
const SUBHEADER_FONT = 'bold 10px Arial, Helvetica, sans-serif';
const EVENT_TITLE_FONT = 'bold 10.5px Arial, Helvetica, sans-serif';

export const formatEventTitle = (event: TurnEvent): string => {
  const name = i18n(event.nameTranslationKey ?? event.name);
  const resolvedName =
    name === (event.nameTranslationKey ?? event.name) ? event.name : name;
  return `${event.number}. ${resolvedName}`;
};

export const formatEventDescription = (event: TurnEvent): string => {
  const desc = i18n(event.descriptionTranslationKey ?? event.description);
  return desc === (event.descriptionTranslationKey ?? event.description)
    ? event.description
    : desc;
};

export const getEventCardLayout = (
  viewWidth: number,
  viewHeight: number,
  state?: GameState | null,
  options?: RenderEventCardOptions,
  ctx?: CanvasRenderingContext2D | null,
): EventCardLayout => {
  const emptyLayout: EventCardLayout = {
    bounds: { x: 0, y: 0, width: 0, height: 0 },
    toggleButtonBounds: { x: 0, y: 0, width: 0, height: 0 },
    isCollapsed: Boolean(options?.isCollapsed),
    headerText: '',
    deckSummary: { remaining: 0, total: 0, drawn: 0 },
    drawnEvents: [],
    hasContent: false,
  };

  if (!state || viewWidth <= 0 || viewHeight <= 0) {
    return emptyLayout;
  }

  const eventDeck = state.eventDeck ?? [];
  const activeEvent = state.currentEvent;
  const isCollapsed = Boolean(options?.isCollapsed);

  const remaining = eventDeck.filter((e) => !e.used).length;
  const total = eventDeck.length;
  const drawn = eventDeck.filter((e) => e.used).length;

  if (total === 0 && !activeEvent) {
    return emptyLayout;
  }

  const marginX = 8;
  const topY = 46; // Directly under top bar (y: 8, height: 32 + 6px gap)
  const paddingX = 8;
  const paddingY = 6;
  const lineHeight = 13;

  const panelWidth = Math.min(
    240,
    Math.max(180, Math.min(220, viewWidth - marginX * 2)),
  );
  const contentWidth = Math.max(0, panelWidth - paddingX * 2);
  const panelX = marginX;

  const toggleSize = 18;
  const toggleButtonBounds: CardBounds = {
    x: panelX + panelWidth - paddingX - toggleSize,
    y: topY + 4,
    width: toggleSize,
    height: toggleSize,
  };

  const headerText = `🎴 ${i18n('content.event.count')} (${remaining}/${total})`;

  if (isCollapsed) {
    const collapsedHeight = 28;
    return {
      bounds: {
        x: panelX,
        y: topY,
        width: panelWidth,
        height: collapsedHeight,
      },
      toggleButtonBounds,
      isCollapsed: true,
      headerText,
      deckSummary: { remaining, total, drawn },
      drawnEvents: [],
      hasContent: true,
    };
  }

  let currentY = topY + paddingY + 16; // Header space

  let activeEventLayout: ActiveEventLayout | undefined;
  if (activeEvent) {
    const rawHeader = i18n('content.event.current');
    const header =
      rawHeader === 'content.event.current'
        ? 'Current event'
        : rawHeader || 'Current event';
    const title = formatEventTitle(activeEvent);
    const description = formatEventDescription(activeEvent);
    const descriptionLines = wrapText(
      ctx,
      description,
      contentWidth,
      DEFAULT_FONT,
    );

    const activeHeight = 14 + 14 + descriptionLines.length * lineHeight;
    activeEventLayout = {
      event: activeEvent,
      header,
      title,
      description,
      descriptionLines,
      y: currentY,
      height: activeHeight,
    };

    currentY += activeHeight + 8;
  }

  const drawnEventsHeader = `${i18n('content.event.drawn')} (${drawn}):`;
  const drawnEventsHeaderY = currentY;
  currentY += 15;

  const drawnList = eventDeck.filter((e) => e.used);
  const drawnEventsLayout: DrawnEventItem[] = [];

  if (drawnList.length === 0) {
    const noneText = i18n('content.event.none');
    drawnEventsLayout.push({
      event: {} as TurnEvent,
      number: 0,
      title: noneText,
      lines: [noneText],
      y: currentY,
      height: lineHeight,
    });
    currentY += lineHeight + 4;
  } else {
    for (const event of drawnList) {
      const title = `• ${formatEventTitle(event)}`;
      const lines = wrapText(ctx, title, contentWidth, DEFAULT_FONT);
      const itemHeight = lines.length * lineHeight;
      drawnEventsLayout.push({
        event,
        number: event.number,
        title,
        lines,
        y: currentY,
        height: itemHeight,
      });
      currentY += itemHeight + 2;
    }
  }

  const totalHeight = currentY - topY + paddingY;
  const maxHeight = Math.max(40, viewHeight - topY - marginX);
  const panelHeight = Math.min(maxHeight, totalHeight);

  return {
    bounds: {
      x: panelX,
      y: topY,
      width: panelWidth,
      height: panelHeight,
    },
    toggleButtonBounds,
    isCollapsed: false,
    headerText,
    deckSummary: { remaining, total, drawn },
    activeEvent: activeEventLayout,
    drawnEventsHeader,
    drawnEventsHeaderY,
    drawnEvents: drawnEventsLayout,
    hasContent: true,
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
  const layout = getEventCardLayout(viewWidth, viewHeight, state, {
    isCollapsed,
  });
  if (!layout.hasContent) return null;

  const inToggle =
    x >= layout.toggleButtonBounds.x &&
    x <= layout.toggleButtonBounds.x + layout.toggleButtonBounds.width &&
    y >= layout.toggleButtonBounds.y &&
    y <= layout.toggleButtonBounds.y + layout.toggleButtonBounds.height;

  if (inToggle) {
    return { type: 'toggle' };
  }

  const inCard =
    x >= layout.bounds.x &&
    x <= layout.bounds.x + layout.bounds.width &&
    y >= layout.bounds.y &&
    y <= layout.bounds.y + layout.bounds.height;

  if (inCard) {
    // If collapsed, clicking anywhere on the header card also toggles it open
    if (layout.isCollapsed || y <= layout.bounds.y + 26) {
      return { type: 'toggle' };
    }
    return { type: 'card' };
  }

  return null;
};

export const renderEventCard = (
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  viewHeight: number,
  state?: GameState | null,
  options?: RenderEventCardOptions,
): void => {
  if (!state || viewWidth <= 0 || viewHeight <= 0) return;

  const layout = getEventCardLayout(viewWidth, viewHeight, state, options, ctx);
  if (
    !layout.hasContent ||
    layout.bounds.width <= 0 ||
    layout.bounds.height <= 0
  ) {
    return;
  }

  const {
    bounds,
    toggleButtonBounds,
    isCollapsed,
    headerText,
    activeEvent,
    drawnEventsHeader,
    drawnEventsHeaderY,
    drawnEvents,
  } = layout;

  ctx.save();

  // Background panel
  ctx.fillStyle = 'rgba(20, 24, 33, 0.90)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, 6);
  ctx.fill();
  ctx.stroke();

  // Header Title
  ctx.font = HEADER_FONT;
  ctx.fillStyle = '#f3f4f6';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(headerText, bounds.x + 8, bounds.y + 7);

  // Toggle button [ − ] or [ + ]
  ctx.fillStyle = options?.isToggleHovered
    ? 'rgba(255, 255, 255, 0.2)'
    : 'rgba(255, 255, 255, 0.08)';
  ctx.strokeStyle = options?.isToggleHovered
    ? 'rgba(255, 255, 255, 0.4)'
    : 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  drawRoundedRect(
    ctx,
    toggleButtonBounds.x,
    toggleButtonBounds.y,
    toggleButtonBounds.width,
    toggleButtonBounds.height,
    3,
  );
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 11px Arial, Helvetica, sans-serif';
  ctx.fillStyle = options?.isToggleHovered ? '#ffffff' : '#cbd5e1';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const toggleSymbol = isCollapsed ? '+' : '−';
  ctx.fillText(
    toggleSymbol,
    toggleButtonBounds.x + toggleButtonBounds.width / 2,
    toggleButtonBounds.y + toggleButtonBounds.height / 2,
  );

  if (isCollapsed) {
    ctx.restore();
    return;
  }

  // Divider under header
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  ctx.moveTo(bounds.x + 6, bounds.y + 26);
  ctx.lineTo(bounds.x + bounds.width - 6, bounds.y + 26);
  ctx.stroke();

  // Active event section
  if (activeEvent) {
    // Current event badge / subheader
    ctx.font = SUBHEADER_FONT;
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(activeEvent.header, bounds.x + 8, activeEvent.y);

    // Event title in amber / gold
    ctx.font = EVENT_TITLE_FONT;
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(activeEvent.title, bounds.x + 8, activeEvent.y + 13);

    // Description
    ctx.font = DEFAULT_FONT;
    ctx.fillStyle = '#e2e8f0';
    let lineY = activeEvent.y + 27;
    for (const line of activeEvent.descriptionLines) {
      ctx.fillText(line, bounds.x + 8, lineY);
      lineY += 13;
    }

    // Divider after active event
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(bounds.x + 6, activeEvent.y + activeEvent.height + 4);
    ctx.lineTo(
      bounds.x + bounds.width - 6,
      activeEvent.y + activeEvent.height + 4,
    );
    ctx.stroke();
  }

  // Drawn Events Section
  if (drawnEventsHeader && drawnEventsHeaderY) {
    ctx.font = SUBHEADER_FONT;
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(drawnEventsHeader, bounds.x + 8, drawnEventsHeaderY);
  }

  ctx.font = DEFAULT_FONT;
  ctx.fillStyle = '#94a3b8';
  for (const item of drawnEvents) {
    let lineY = item.y;
    for (const line of item.lines) {
      ctx.fillText(line, bounds.x + 8, lineY);
      lineY += 13;
    }
  }

  ctx.restore();
};
