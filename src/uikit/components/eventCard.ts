// Event card component: the collapsible corner panel under the top bar
// that shows the current event, the drawn-event list and the deck
// summary. Kit component per the 02 contract — the view model carries
// the header, deck summary, active-event texts and drawn-event titles
// prebuilt by the game-side adapter; layout wraps through env.measure;
// hits are semantic.

import type { Rect, UiTheme } from '@hoard-engine/primitives';
import {
  drawRoundedRect,
  isPointInRect,
  composeFont,
  wrapTextMeasured,
} from '@hoard-engine/primitives';
import { COMPACT_TOGGLE_SIZE, type UiContext, type UiEnv } from '../env';

export interface EventDeckSummaryVm {
  remaining: number;
  total: number;
  drawn: number;
}

export interface ActiveEventVm {
  readonly header: string;
  readonly title: string;
  readonly description: string;
}

export interface DrawnEventVm {
  /** The drawn event's number, 0 for the empty-deck placeholder. */
  readonly number: number;
  /** Already bulleted: `• 3. Title`. */
  readonly title: string;
}

export interface EventCardViewModel {
  readonly headerText: string;
  readonly deckSummary: EventDeckSummaryVm;
  readonly activeEvent: ActiveEventVm | null;
  readonly drawnEventsHeader: string;
  readonly drawnEvents: readonly DrawnEventVm[];
  /** Shown in place of the drawn list when nothing is drawn yet. */
  readonly emptyDrawnText: string;
}

export interface ActiveEventLayout {
  event: ActiveEventVm;
  title: string;
  description: string;
  descriptionLines: string[];
  y: number;
  height: number;
}

export interface DrawnEventItemLayout {
  event: DrawnEventVm;
  number: number;
  title: string;
  lines: string[];
  y: number;
  height: number;
}

export interface EventCardLayout {
  bounds: Rect;
  toggleButtonBounds: Rect;
  isCollapsed: boolean;
  isCompact: boolean;
  headerText: string;
  deckSummary: EventDeckSummaryVm;
  activeEvent?: ActiveEventLayout;
  drawnEventsHeader?: string;
  drawnEventsHeaderY?: number;
  drawnEvents: DrawnEventItemLayout[];
  hasContent: boolean;
}

/** Semantic hit: which affordance of the event card is under the point. */
export type EventCardHit = { kind: 'toggle' } | { kind: 'card' } | null;

export interface EventCardLayoutOptions {
  isCollapsed?: boolean;
}

export const emptyEventCardLayout = (isCollapsed = false): EventCardLayout => ({
  bounds: { x: 0, y: 0, width: 0, height: 0 },
  toggleButtonBounds: { x: 0, y: 0, width: 0, height: 0 },
  isCollapsed,
  isCompact: false,
  headerText: '',
  deckSummary: { remaining: 0, total: 0, drawn: 0 },
  drawnEvents: [],
  hasContent: false,
});

export const layoutEventCard = (
  vm: EventCardViewModel | null,
  viewBounds: Rect,
  env: UiEnv,
  options?: EventCardLayoutOptions,
): EventCardLayout => {
  const isCollapsed = Boolean(options?.isCollapsed);
  if (!vm || (vm.deckSummary.total === 0 && !vm.activeEvent)) {
    return emptyEventCardLayout(isCollapsed);
  }
  const { width: viewWidth, height: viewHeight } = viewBounds;
  if (viewWidth <= 0 || viewHeight <= 0) {
    return emptyEventCardLayout(isCollapsed);
  }

  const remaining = vm.deckSummary.remaining;
  const total = vm.deckSummary.total;
  const drawn = vm.deckSummary.drawn;

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
  const toggleButtonBounds: Rect = {
    x: panelX + panelWidth - paddingX - toggleSize,
    y: topY + 4,
    width: toggleSize,
    height: toggleSize,
  };

  const isCompact = env.mode === 'compact';

  if (isCollapsed) {
    // On narrow screens the collapsed card is a square button in the
    // top-left corner; the bar layout would still cover too much board.
    if (isCompact) {
      const squareBounds: Rect = {
        x: marginX,
        y: topY,
        width: COMPACT_TOGGLE_SIZE,
        height: COMPACT_TOGGLE_SIZE,
      };
      return {
        bounds: squareBounds,
        toggleButtonBounds: squareBounds,
        isCollapsed: true,
        isCompact: true,
        headerText: vm.headerText,
        deckSummary: { remaining, total, drawn },
        drawnEvents: [],
        hasContent: true,
      };
    }

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
      isCompact: false,
      headerText: vm.headerText,
      deckSummary: { remaining, total, drawn },
      drawnEvents: [],
      hasContent: true,
    };
  }

  let currentY = topY + paddingY + 16; // Header space

  const bodyFont = composeFont(env.theme, env.theme.typography.sizes.xxs);

  let activeEventLayout: ActiveEventLayout | undefined;
  if (vm.activeEvent) {
    const descriptionLines = wrapTextMeasured(
      env.measure,
      vm.activeEvent.description,
      contentWidth,
      bodyFont,
    );

    const activeHeight = 14 + 14 + descriptionLines.length * lineHeight;
    activeEventLayout = {
      event: vm.activeEvent,
      title: vm.activeEvent.title,
      description: vm.activeEvent.description,
      descriptionLines,
      y: currentY,
      height: activeHeight,
    };

    currentY += activeHeight + 8;
  }

  const drawnEventsHeader = vm.drawnEventsHeader;
  const drawnEventsHeaderY = currentY;
  currentY += 15;

  const drawnEventsLayout: DrawnEventItemLayout[] = [];

  if (vm.drawnEvents.length === 0) {
    const lines = [vm.emptyDrawnText];
    drawnEventsLayout.push({
      event: { number: 0, title: vm.emptyDrawnText },
      number: 0,
      title: vm.emptyDrawnText,
      lines,
      y: currentY,
      height: lineHeight,
    });
    currentY += lineHeight + 4;
  } else {
    for (const event of vm.drawnEvents) {
      const lines = wrapTextMeasured(
        env.measure,
        event.title,
        contentWidth,
        bodyFont,
      );
      const itemHeight = lines.length * lineHeight;
      drawnEventsLayout.push({
        event,
        number: event.number,
        title: event.title,
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
    isCompact,
    headerText: vm.headerText,
    deckSummary: { remaining, total, drawn },
    activeEvent: activeEventLayout,
    drawnEventsHeader,
    drawnEventsHeaderY,
    drawnEvents: drawnEventsLayout,
    hasContent: true,
  };
};

export const hitTestEventCard = (
  layout: EventCardLayout,
  point: { x: number; y: number },
): EventCardHit => {
  if (!layout.hasContent) return null;

  if (isPointInRect(point.x, point.y, layout.toggleButtonBounds)) {
    return { kind: 'toggle' };
  }

  if (isPointInRect(point.x, point.y, layout.bounds)) {
    // If collapsed, clicking anywhere on the header card also toggles
    // it open.
    if (layout.isCollapsed || point.y <= layout.bounds.y + 26) {
      return { kind: 'toggle' };
    }
    return { kind: 'card' };
  }

  return null;
};

export interface RenderEventCardOptions {
  readonly isToggleHovered?: boolean;
}

export const renderEventCard = (
  layout: EventCardLayout,
  ui: UiContext,
  options?: RenderEventCardOptions,
): void => {
  const { ctx } = ui;
  const theme: UiTheme = ui.theme;
  if (
    !ctx ||
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
    isCompact,
    headerText,
    deckSummary,
    activeEvent,
    drawnEventsHeader,
    drawnEventsHeaderY,
    drawnEvents,
  } = layout;

  const bodyFont = composeFont(theme, theme.typography.sizes.xxs);
  const headerFont = composeFont(
    theme,
    theme.typography.sizes.sm,
    theme.typography.weights.bold,
  );
  const subheaderFont = composeFont(
    theme,
    theme.typography.sizes.xxs,
    theme.typography.weights.bold,
  );
  const eventTitleFont = composeFont(
    theme,
    theme.typography.sizes.xs,
    theme.typography.weights.bold,
  );

  ctx.save();

  // Collapsed compact mode: a square button with the event icon and the
  // remaining card count; pressing it opens the full panel.
  if (isCollapsed && isCompact) {
    ctx.fillStyle = options?.isToggleHovered
      ? theme.palette.surface.panelCornerHover
      : theme.palette.surface.panelCorner;
    ctx.strokeStyle = options?.isToggleHovered
      ? theme.palette.border.panelCornerHover
      : theme.palette.border.hairline;
    ctx.lineWidth = theme.shape.strokeWidth.thin;
    drawRoundedRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = theme.palette.text.panelHeader;
    ctx.font = composeFont(
      theme,
      theme.typography.sizes.xxxl,
      theme.typography.weights.regular,
      theme.typography.families.plain,
    );
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎴', bounds.x + bounds.width / 2, bounds.y + 14);

    ctx.font = subheaderFont;
    ctx.fillStyle = theme.palette.text.secondary;
    ctx.fillText(
      `${deckSummary.remaining}`,
      bounds.x + bounds.width / 2,
      bounds.y + 30,
    );

    ctx.restore();
    return;
  }

  // Background panel
  ctx.fillStyle = theme.palette.surface.panelCorner;
  ctx.strokeStyle = theme.palette.border.hairline;
  ctx.lineWidth = theme.shape.strokeWidth.thin;
  drawRoundedRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, 6);
  ctx.fill();
  ctx.stroke();

  // Header Title
  ctx.font = headerFont;
  ctx.fillStyle = theme.palette.text.panelHeader;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(headerText, bounds.x + 8, bounds.y + 7);

  // Toggle button [ − ] or [ + ]
  ctx.fillStyle = options?.isToggleHovered
    ? theme.palette.surface.toggleHover
    : theme.palette.surface.toggle;
  ctx.strokeStyle = options?.isToggleHovered
    ? theme.palette.border.panelCornerHover
    : theme.palette.border.toggle;
  ctx.lineWidth = theme.shape.strokeWidth.thin;
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

  ctx.font = headerFont;
  ctx.fillStyle = options?.isToggleHovered
    ? theme.palette.text.bright
    : theme.palette.text.secondary;
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
  ctx.strokeStyle = theme.palette.border.separator;
  ctx.beginPath();
  ctx.moveTo(bounds.x + 6, bounds.y + 26);
  ctx.lineTo(bounds.x + bounds.width - 6, bounds.y + 26);
  ctx.stroke();

  // Active event section
  if (activeEvent) {
    // Current event badge / subheader
    ctx.font = subheaderFont;
    ctx.fillStyle = theme.palette.text.muted;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(activeEvent.event.header, bounds.x + 8, activeEvent.y);

    // Event title in amber / gold
    ctx.font = eventTitleFont;
    ctx.fillStyle = theme.palette.text.eventTitle;
    ctx.fillText(activeEvent.title, bounds.x + 8, activeEvent.y + 13);

    // Description
    ctx.font = bodyFont;
    ctx.fillStyle = theme.palette.text.body;
    let lineY = activeEvent.y + 27;
    for (const line of activeEvent.descriptionLines) {
      ctx.fillText(line, bounds.x + 8, lineY);
      lineY += 13;
    }

    // Divider after active event
    ctx.strokeStyle = theme.palette.border.separator;
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
    ctx.font = subheaderFont;
    ctx.fillStyle = theme.palette.text.muted;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(drawnEventsHeader, bounds.x + 8, drawnEventsHeaderY);
  }

  ctx.font = bodyFont;
  ctx.fillStyle = theme.palette.text.muted;
  for (const item of drawnEvents) {
    let lineY = item.y;
    for (const line of item.lines) {
      ctx.fillText(line, bounds.x + 8, lineY);
      lineY += 13;
    }
  }

  ctx.restore();
};
