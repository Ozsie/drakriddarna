// Diary component: the collapsible corner panel under the turn counter
// that lists the win conditions (with strikethrough on fulfilled ones)
// and the diary notes found so far. Kit component per the 02 contract —
// the view model carries the diary header and every condition/note text
// prebuilt by the game-side adapter; layout wraps through env.measure;
// hits are semantic.

import { drawRoundedRect } from '../primitives/roundedRect';
import { isPointInRect, type Rect } from '../primitives/geometry';
import {
  PER_CHAR_WIDTH_FALLBACK,
  composeFont,
  measureTextWidth,
  wrapTextMeasured,
} from '../primitives/text';
import { COMPACT_TOGGLE_SIZE, type UiContext, type UiEnv } from '../env';
import type { UiTheme } from '../theme';

export interface WinConditionItemVm {
  /** The formatted condition text, without the bullet. */
  readonly text: string;
  readonly fulfilled: boolean;
}

export interface DiaryNoteItemVm {
  /** The note header, e.g. "On 2)". */
  readonly header: string;
  readonly message: string;
  readonly turn: number;
}

export interface DiaryViewModel {
  readonly diaryHeader: string;
  /** Sorted: unfulfilled first, fulfilled last. */
  readonly winConditions: readonly WinConditionItemVm[];
  /** Found notes, newest first. */
  readonly diaryNotes: readonly DiaryNoteItemVm[];
}

export interface WinConditionItemLayout {
  condition: WinConditionItemVm;
  lines: string[];
  y: number;
  height: number;
}

export interface DiaryNoteItemLayout {
  note: DiaryNoteItemVm;
  messageLines: string[];
  y: number;
  height: number;
}

export interface DiaryLayout {
  bounds: Rect;
  toggleButtonBounds: Rect;
  isCollapsed: boolean;
  isCompact: boolean;
  winConditions: WinConditionItemLayout[];
  diaryHeader: string;
  diaryHeaderY: number;
  diaryNotes: DiaryNoteItemLayout[];
  hasContent: boolean;
}

/** Semantic hit: which affordance of the diary panel is under the point. */
export type DiaryHit = { kind: 'panel' } | { kind: 'toggle' } | null;

export interface DiaryLayoutOptions {
  isCollapsed?: boolean;
}

export const emptyDiaryLayout = (isCollapsed = false): DiaryLayout => ({
  bounds: { x: 0, y: 0, width: 0, height: 0 },
  toggleButtonBounds: { x: 0, y: 0, width: 0, height: 0 },
  isCollapsed,
  isCompact: false,
  winConditions: [],
  diaryHeader: '',
  diaryHeaderY: 0,
  diaryNotes: [],
  hasContent: false,
});

export const layoutDiary = (
  vm: DiaryViewModel | null,
  viewBounds: Rect,
  env: UiEnv,
  options?: DiaryLayoutOptions,
): DiaryLayout => {
  const isCollapsed = Boolean(options?.isCollapsed);
  if (!vm) return emptyDiaryLayout();
  const { width: viewWidth, height: viewHeight } = viewBounds;
  if (viewWidth <= 0 || viewHeight <= 0) return emptyDiaryLayout();
  if (vm.winConditions.length === 0 && vm.diaryNotes.length === 0) {
    return emptyDiaryLayout();
  }

  const marginX = 8;
  const topY = 46; // Just under top bar (y: 8, height: 32 + 6px gap)

  const isCompact = env.mode === 'compact';

  // On narrow screens the panel collapses into a square button in the
  // top-right corner; pressing it opens the full panel.
  if (isCollapsed) {
    const squareBounds: Rect = {
      x: Math.max(marginX, viewWidth - marginX - COMPACT_TOGGLE_SIZE),
      y: topY,
      width: COMPACT_TOGGLE_SIZE,
      height: COMPACT_TOGGLE_SIZE,
    };
    return {
      bounds: squareBounds,
      toggleButtonBounds: squareBounds,
      isCollapsed: true,
      isCompact: true,
      winConditions: [],
      diaryHeader: '',
      diaryHeaderY: 0,
      diaryNotes: [],
      hasContent: true,
    };
  }

  const paddingX = 8;
  const paddingY = 8;
  const lineHeight = 13;
  const condLineHeight = 14;

  const bodyFont = composeFont(env.theme, env.theme.typography.sizes.xxs);

  const panelWidth = Math.min(
    260,
    Math.max(180, Math.min(240, viewWidth - marginX * 2)),
  );
  const contentWidth = Math.max(0, panelWidth - paddingX * 2);
  const panelX = Math.max(marginX, viewWidth - marginX - panelWidth);

  // While open on a narrow screen, a close button sits in the panel
  // header; on wide screens the panel has no toggle at all.
  const toggleSize = 18;
  const toggleButtonBounds: Rect = isCompact
    ? {
        x: panelX + panelWidth - paddingX - toggleSize,
        y: topY + 4,
        width: toggleSize,
        height: toggleSize,
      }
    : { x: 0, y: 0, width: 0, height: 0 };

  let currentY = topY + paddingY;

  const winConditionsLayout: WinConditionItemLayout[] = [];
  for (const cond of vm.winConditions) {
    const bullet = cond.fulfilled ? '✓ ' : '❇️ ';
    const fullText = `${bullet}${cond.text}`;
    const lines = wrapTextMeasured(
      env.measure,
      fullText,
      contentWidth,
      bodyFont,
    );
    const itemHeight = lines.length * condLineHeight;

    winConditionsLayout.push({
      condition: cond,
      lines,
      y: currentY,
      height: itemHeight,
    });

    currentY += itemHeight + 4;
  }

  let diaryHeaderY = 0;
  const diaryNotesLayout: DiaryNoteItemLayout[] = [];

  // Show diary header and notes
  if (winConditionsLayout.length > 0) {
    currentY += 4; // Space / separator gap before diary
  }
  diaryHeaderY = currentY;
  currentY += 16; // Diary header height

  for (const note of vm.diaryNotes) {
    const messageLines = wrapTextMeasured(
      env.measure,
      note.message,
      contentWidth,
      bodyFont,
    );
    const itemHeight = 14 + messageLines.length * lineHeight;

    diaryNotesLayout.push({
      note,
      messageLines,
      y: currentY,
      height: itemHeight,
    });

    currentY += itemHeight + 6;
  }

  const totalHeight =
    currentY - topY + paddingY - (vm.diaryNotes.length === 0 ? 0 : 2);
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
    winConditions: winConditionsLayout,
    diaryHeader: vm.diaryHeader,
    diaryHeaderY,
    diaryNotes: diaryNotesLayout,
    hasContent: true,
  };
};

export const hitTestDiary = (
  layout: DiaryLayout,
  point: { x: number; y: number },
): DiaryHit => {
  if (
    !layout.hasContent ||
    layout.bounds.width <= 0 ||
    layout.bounds.height <= 0
  ) {
    return null;
  }

  const withinBounds = isPointInRect(point.x, point.y, layout.bounds);

  if (layout.isCollapsed) {
    return withinBounds ? { kind: 'toggle' } : null;
  }

  // Close button on the open compact panel.
  if (
    layout.isCompact &&
    isPointInRect(point.x, point.y, layout.toggleButtonBounds)
  ) {
    return { kind: 'toggle' };
  }

  return withinBounds ? { kind: 'panel' } : null;
};

export interface RenderDiaryOptions {
  readonly isToggleHovered?: boolean;
}

export const renderDiary = (
  layout: DiaryLayout,
  ui: UiContext,
  options?: RenderDiaryOptions,
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
    winConditions,
    diaryHeader,
    diaryHeaderY,
    diaryNotes,
  } = layout;

  const bodyFont = composeFont(theme, theme.typography.sizes.xxs);
  const headerFont = composeFont(
    theme,
    theme.typography.sizes.sm,
    theme.typography.weights.bold,
  );
  const noteHeaderFont = composeFont(
    theme,
    theme.typography.sizes.xxs,
    theme.typography.weights.bold,
  );

  ctx.save();

  // Collapsed compact mode: a square button with the diary icon;
  // pressing it opens the full panel.
  if (isCollapsed) {
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
      theme.typography.sizes.title,
      theme.typography.weights.regular,
      theme.typography.families.plain,
    );
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      '📖',
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    ctx.restore();
    return;
  }

  // Draw background panel
  ctx.fillStyle = theme.palette.surface.panelCorner;
  ctx.strokeStyle = theme.palette.border.hairline;
  ctx.lineWidth = theme.shape.strokeWidth.thin;
  drawRoundedRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, 6);
  ctx.fill();
  ctx.stroke();

  // Close button ( − ) on the open compact panel.
  if (isCompact && toggleButtonBounds.width > 0) {
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
    ctx.fillText(
      '−',
      toggleButtonBounds.x + toggleButtonBounds.width / 2,
      toggleButtonBounds.y + toggleButtonBounds.height / 2,
    );
  }

  // Clip content to panel bounds with padding
  ctx.save();
  ctx.beginPath();
  ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
  ctx.clip();

  const paddingX = 8;
  const contentX = bounds.x + paddingX;
  const contentWidth = bounds.width - paddingX * 2;

  // Render Win Conditions
  for (const item of winConditions) {
    ctx.font = bodyFont;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    let lineY = item.y;
    for (let i = 0; i < item.lines.length; i++) {
      const line = item.lines[i];
      if (item.condition.fulfilled) {
        ctx.fillStyle = theme.palette.text.success;
      } else {
        ctx.fillStyle = theme.palette.text.body;
      }
      ctx.fillText(line, contentX, lineY);

      if (item.condition.fulfilled) {
        const textW = measureTextWidth(
          ctx,
          line,
          bodyFont,
          PER_CHAR_WIDTH_FALLBACK,
        );
        ctx.strokeStyle = theme.palette.text.success;
        ctx.lineWidth = theme.shape.strokeWidth.thin;
        ctx.beginPath();
        ctx.moveTo(contentX, lineY + 7);
        ctx.lineTo(contentX + textW, lineY + 7);
        ctx.stroke();
      }

      lineY += 14;
    }
  }

  // Divider between Win Conditions and Diary
  if (winConditions.length > 0) {
    const dividerY =
      winConditions[winConditions.length - 1].y +
      winConditions[winConditions.length - 1].height +
      4;
    ctx.strokeStyle = theme.palette.border.divider;
    ctx.lineWidth = theme.shape.strokeWidth.thin;
    ctx.beginPath();
    ctx.moveTo(contentX, dividerY);
    ctx.lineTo(contentX + contentWidth, dividerY);
    ctx.stroke();
  }

  // Render Diary Header
  if (diaryHeader) {
    ctx.font = headerFont;
    ctx.fillStyle = theme.palette.text.diaryHeader;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(diaryHeader, contentX, diaryHeaderY);
  }

  // Render Diary Notes
  for (let idx = 0; idx < diaryNotes.length; idx++) {
    const noteItem = diaryNotes[idx];

    // Separator before note
    ctx.strokeStyle = theme.palette.border.separator;
    ctx.lineWidth = theme.shape.strokeWidth.thin;
    ctx.beginPath();
    ctx.moveTo(contentX, noteItem.y - 3);
    ctx.lineTo(contentX + contentWidth, noteItem.y - 3);
    ctx.stroke();

    // Note header (e.g. "On 2)")
    ctx.font = noteHeaderFont;
    ctx.fillStyle = theme.palette.text.success;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(noteItem.note.header, contentX, noteItem.y);

    // Note message lines
    ctx.font = bodyFont;
    ctx.fillStyle = theme.palette.text.secondary;
    let msgY = noteItem.y + 14;
    for (const msgLine of noteItem.messageLines) {
      ctx.fillText(msgLine, contentX, msgY);
      msgY += 13;
    }
  }

  ctx.restore();
  ctx.restore();
};
