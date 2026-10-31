import type { GameState, Note, WinCondition } from '../types';
import { ConditionType } from '../types';
import { i18n } from '../core';
import { drawRoundedRect, type CardBounds } from './HeroCardRendering';
import { COMPACT_TOGGLE_SIZE, isCompactUi } from './UiMode';
import {
  composeFont,
  measureTextWidth as kitMeasureTextWidth,
  wrapText as kitWrapText,
} from '../uikit/primitives/text';
import { defaultTheme, type UiTheme } from '../uikit/theme';

export interface WinConditionLayoutItem {
  condition: WinCondition;
  text: string;
  lines: string[];
  fulfilled: boolean;
  y: number;
  height: number;
}

export interface DiaryNoteLayoutItem {
  note: Note;
  header: string;
  message: string;
  messageLines: string[];
  turn: number;
  y: number;
  height: number;
}

export interface DiaryAndWinConditionsLayout {
  bounds: CardBounds;
  toggleButtonBounds: CardBounds;
  isCollapsed: boolean;
  isCompact: boolean;
  winConditions: WinConditionLayoutItem[];
  diaryHeader: string;
  diaryHeaderY: number;
  diaryNotes: DiaryNoteLayoutItem[];
  hasContent: boolean;
}

export interface RenderDiaryAndWinConditionsOptions {
  isCollapsed?: boolean;
  isToggleHovered?: boolean;
  theme?: UiTheme;
}

// Per-character width used when no context is available for measuring
// (the historical behavior of this module's helpers).
const FALLBACK_PER_CHAR = 6.5;

export const measureTextWidth = (
  ctx: CanvasRenderingContext2D | null | undefined,
  text: string,
  font: string,
): number => kitMeasureTextWidth(ctx, text, font, FALLBACK_PER_CHAR);

export const wrapText = (
  ctx: CanvasRenderingContext2D | null | undefined,
  text: string,
  maxWidth: number,
  font: string,
): string[] => kitWrapText(ctx, text, maxWidth, font, FALLBACK_PER_CHAR);

export const formatWinCondition = (
  cond: WinCondition,
  killCount = 0,
): string => {
  let additionalDescription = '';
  if (cond.additionalDescription) {
    const raw = i18n(cond.additionalDescription);
    const translated =
      raw === cond.additionalDescription ? cond.additionalDescription : raw;
    additionalDescription = ` ${translated}`;
  }

  let text = '';
  switch (cond.type) {
    case ConditionType.KILL_ALL: {
      const raw = i18n('content.winConditions.killAll');
      text =
        raw === 'content.winConditions.killAll'
          ? 'Kill all monsters.'
          : raw || 'Kill all monsters.';
      break;
    }
    case ConditionType.KILL_ALL_OF_TYPE: {
      const typeStr =
        cond.targetMonsterType !== undefined
          ? String(cond.targetMonsterType)
          : '';
      const raw = i18n('content.winConditions.killAllOfType', {
        type: typeStr,
      });
      if (raw && raw !== 'content.winConditions.killAllOfType') {
        if (raw.includes(typeStr)) {
          text = raw;
        } else if (raw.includes('{{type}}')) {
          text = raw.replace('{{type}}', typeStr);
        } else {
          text = `Kill all ${typeStr}.`;
        }
      } else {
        text = `Kill all ${typeStr}.`;
      }
      break;
    }
    case ConditionType.KILL_AT_LEAST: {
      const min = cond.killMinCount ?? 0;
      const raw = i18n('content.winConditions.killAtLeast', {
        minKills: `${min}`,
      });
      const prefix =
        raw === 'content.winConditions.killAtLeast'
          ? `Kill at least ${min} monsters.`
          : raw || `Kill at least ${min} monsters.`;
      text = `${prefix} (${killCount}/${min})`;
      break;
    }
    case ConditionType.OPEN_DOOR: {
      const raw = i18n('content.winConditions.openDoor');
      text =
        raw === 'content.winConditions.openDoor'
          ? 'Open a certain door.'
          : raw || 'Open a certain door.';
      break;
    }
    case ConditionType.REACH_CELL: {
      const raw = i18n('content.winConditions.reachCell');
      text =
        raw === 'content.winConditions.reachCell'
          ? 'Reach a certain cell.'
          : raw || 'Reach a certain cell.';
      break;
    }
    case ConditionType.SECRET_FOUND: {
      const raw = i18n('content.winConditions.secretFound');
      text =
        raw === 'content.winConditions.secretFound'
          ? 'Find a certain secret.'
          : raw || 'Find a certain secret.';
      break;
    }
    default:
      text = 'Complete objective.';
      break;
  }

  return text + additionalDescription;
};

export const formatDiaryHeader = (turnCount = 0): string => {
  const raw = i18n('content.diary.label', { turn: `${turnCount}` });
  return raw === 'content.diary.label'
    ? `Diary (turn ${turnCount})`
    : raw || `Diary (turn ${turnCount})`;
};

export const formatNoteHeader = (note: Note): string => {
  const round = `${note.foundOn ?? ''}`;
  const raw = i18n('content.diary.foundOn', { round });
  return raw === 'content.diary.foundOn'
    ? `On ${round})`
    : raw || `On ${round})`;
};

export const formatNoteMessage = (note: Note): string => {
  if (!note.message) return '';
  const raw = i18n(note.message);
  return raw === note.message ? note.message : raw || note.message;
};

export const getDiaryAndWinConditionsLayout = (
  viewWidth: number,
  viewHeight: number,
  state?: GameState | null,
  options?: RenderDiaryAndWinConditionsOptions,
  ctx?: CanvasRenderingContext2D | null,
): DiaryAndWinConditionsLayout => {
  const emptyLayout: DiaryAndWinConditionsLayout = {
    bounds: { x: 0, y: 0, width: 0, height: 0 },
    toggleButtonBounds: { x: 0, y: 0, width: 0, height: 0 },
    isCollapsed: false,
    isCompact: false,
    winConditions: [],
    diaryHeader: '',
    diaryHeaderY: 0,
    diaryNotes: [],
    hasContent: false,
  };

  if (!state || viewWidth <= 0 || viewHeight <= 0) {
    return emptyLayout;
  }

  const rawConditions = state.dungeon?.winConditions ?? [];
  const rawNotes = state.dungeon?.layout?.notes ?? [];
  const foundNotes = rawNotes
    .filter((n) => n.found)
    .sort((a, b) => (b.foundOn ?? 0) - (a.foundOn ?? 0));

  if (rawConditions.length === 0 && foundNotes.length === 0) {
    return emptyLayout;
  }

  const marginX = 8;
  const topY = 46; // Just under top bar (y: 8, height: 32 + 6px gap)

  const isCompact = isCompactUi(viewWidth);

  // On narrow screens the panel collapses into a square button in the
  // top-right corner; pressing it opens the full panel.
  if (options?.isCollapsed) {
    const squareBounds: CardBounds = {
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

  const theme = options?.theme ?? defaultTheme;
  const bodyFont = composeFont(theme, theme.typography.sizes.xxs);

  const panelWidth = Math.min(
    260,
    Math.max(180, Math.min(240, viewWidth - marginX * 2)),
  );
  const contentWidth = Math.max(0, panelWidth - paddingX * 2);
  const panelX = Math.max(marginX, viewWidth - marginX - panelWidth);

  // While open on a narrow screen, a close button sits in the panel
  // header; on wide screens the panel has no toggle at all.
  const toggleSize = 18;
  const toggleButtonBounds: CardBounds = isCompact
    ? {
        x: panelX + panelWidth - paddingX - toggleSize,
        y: topY + 4,
        width: toggleSize,
        height: toggleSize,
      }
    : { x: 0, y: 0, width: 0, height: 0 };

  // Win conditions sorted: unfulfilled first, fulfilled last
  const sortedConditions = rawConditions
    .slice()
    .sort((a, b) => (a.fulfilled === b.fulfilled ? 0 : a.fulfilled ? 1 : -1));

  let currentY = topY + paddingY;

  const winConditionsLayout: WinConditionLayoutItem[] = [];
  for (const cond of sortedConditions) {
    const text = formatWinCondition(cond, state.dungeon?.killCount ?? 0);
    const bullet = cond.fulfilled ? '✓ ' : '❇️ ';
    const fullText = `${bullet}${text}`;
    const lines = wrapText(ctx, fullText, contentWidth, bodyFont);
    const itemHeight = lines.length * condLineHeight;

    winConditionsLayout.push({
      condition: cond,
      text,
      lines,
      fulfilled: Boolean(cond.fulfilled),
      y: currentY,
      height: itemHeight,
    });

    currentY += itemHeight + 4;
  }

  let diaryHeader = '';
  let diaryHeaderY = 0;
  const diaryNotesLayout: DiaryNoteLayoutItem[] = [];

  // Show diary header and notes
  diaryHeader = formatDiaryHeader(state.turnCount ?? 0);
  if (winConditionsLayout.length > 0) {
    currentY += 4; // Space / separator gap before diary
  }
  diaryHeaderY = currentY;
  currentY += 16; // Diary header height

  for (const note of foundNotes) {
    const header = formatNoteHeader(note);
    const message = formatNoteMessage(note);
    const messageLines = wrapText(ctx, message, contentWidth, bodyFont);
    const itemHeight = 14 + messageLines.length * lineHeight;

    diaryNotesLayout.push({
      note,
      header,
      message,
      messageLines,
      turn: note.foundOn ?? 0,
      y: currentY,
      height: itemHeight,
    });

    currentY += itemHeight + 6;
  }

  const totalHeight =
    currentY - topY + paddingY - (foundNotes.length === 0 ? 0 : 2);
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
    diaryHeader,
    diaryHeaderY,
    diaryNotes: diaryNotesLayout,
    hasContent: true,
  };
};

export interface DiaryAndWinConditionsHitResult {
  type: 'panel' | 'toggle';
}

export const getDiaryAndWinConditionsHit = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  isCollapsed: boolean,
  x: number,
  y: number,
  ctx?: CanvasRenderingContext2D | null,
): DiaryAndWinConditionsHitResult | null => {
  if (!state || viewWidth <= 0 || viewHeight <= 0) return null;

  const layout = getDiaryAndWinConditionsLayout(
    viewWidth,
    viewHeight,
    state,
    { isCollapsed },
    ctx,
  );
  if (
    !layout.hasContent ||
    layout.bounds.width <= 0 ||
    layout.bounds.height <= 0
  ) {
    return null;
  }

  const { bounds } = layout;
  const withinBounds =
    x >= bounds.x &&
    x <= bounds.x + bounds.width &&
    y >= bounds.y &&
    y <= bounds.y + bounds.height;

  if (layout.isCollapsed) {
    return withinBounds ? { type: 'toggle' } : null;
  }

  // Close button on the open compact panel.
  if (
    layout.isCompact &&
    x >= layout.toggleButtonBounds.x &&
    x <= layout.toggleButtonBounds.x + layout.toggleButtonBounds.width &&
    y >= layout.toggleButtonBounds.y &&
    y <= layout.toggleButtonBounds.y + layout.toggleButtonBounds.height
  ) {
    return { type: 'toggle' };
  }

  return withinBounds ? { type: 'panel' } : null;
};

export const renderDiaryAndWinConditions = (
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  viewHeight: number,
  state?: GameState | null,
  options?: RenderDiaryAndWinConditionsOptions,
): void => {
  if (!state || viewWidth <= 0 || viewHeight <= 0) return;

  const layout = getDiaryAndWinConditionsLayout(
    viewWidth,
    viewHeight,
    state,
    options,
    ctx,
  );
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
    isCompact,
    winConditions,
    diaryHeader,
    diaryHeaderY,
    diaryNotes,
  } = layout;

  const theme = options?.theme ?? defaultTheme;
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
      : theme.palette.text.panelBody;
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
      if (item.fulfilled) {
        ctx.fillStyle = theme.palette.text.success;
      } else {
        ctx.fillStyle = theme.palette.text.body;
      }
      ctx.fillText(line, contentX, lineY);

      if (item.fulfilled) {
        const textW = measureTextWidth(ctx, line, bodyFont);
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
    ctx.fillText(noteItem.header, contentX, noteItem.y);

    // Note message lines
    ctx.font = bodyFont;
    ctx.fillStyle = theme.palette.text.panelBody;
    let msgY = noteItem.y + 14;
    for (const msgLine of noteItem.messageLines) {
      ctx.fillText(msgLine, contentX, msgY);
      msgY += 13;
    }
  }

  ctx.restore();
  ctx.restore();
};
