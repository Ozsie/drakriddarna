// Game-side facade for the diary/win-condition panel. The component
// (layout, hit test, render over the view model) lives in the kit; the
// adapter in ./viewmodels/diary is the only place that reads GameState.
// This module keeps the historical entry points — including the
// Note/WinCondition-carrying layout items and the shared wrap/measure
// helpers BetweenDungeonsRendering still uses — so the controller, the
// hit cascade and existing tests work unchanged, with the exact same
// pixels: parity snapshots cover the whole chain.

import type { GameState, Note, WinCondition } from '../types';
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
  foundDiaryNotes,
  sortedWinConditions,
  toDiaryViewModel,
} from './viewmodels/diary';
import { legacyUiEnv } from './env';
import { uiAssetProvider } from './assets';

export {
  formatDiaryHeader,
  formatNoteHeader,
  formatNoteMessage,
  formatWinCondition,
} from './viewmodels/diary';

export type {
  DiaryNoteItemVm,
  DiaryViewModel,
  WinConditionItemVm,
} from './viewmodels/diary';

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
  bounds: Rect;
  toggleButtonBounds: Rect;
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
  env?: UiEnv;
}

export interface DiaryAndWinConditionsHitResult {
  type: 'panel' | 'toggle';
}

interface DiaryGeometry {
  bounds: Rect;
  toggleButtonBounds: Rect;
  isCollapsed: boolean;
  isCompact: boolean;
  winConditions: {
    condition: { text: string; fulfilled: boolean };
    lines: string[];
    y: number;
    height: number;
  }[];
  diaryHeader: string;
  diaryHeaderY: number;
  diaryNotes: {
    note: { header: string; message: string; turn: number };
    messageLines: string[];
    y: number;
    height: number;
  }[];
  hasContent: boolean;
}

const kitLayoutFor = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options: RenderDiaryAndWinConditionsOptions | undefined,
  ctx: CanvasRenderingContext2D | null | undefined,
): DiaryGeometry => {
  const env = legacyUiEnv(options?.env, { viewWidth, ctx });
  const vm = toDiaryViewModel(state, env.t);
  const isCollapsed = Boolean(options?.isCollapsed);
  const empty = (): DiaryGeometry => ({
    bounds: { x: 0, y: 0, width: 0, height: 0 },
    toggleButtonBounds: { x: 0, y: 0, width: 0, height: 0 },
    isCollapsed: false,
    isCompact: false,
    winConditions: [],
    diaryHeader: '',
    diaryHeaderY: 0,
    diaryNotes: [],
    hasContent: false,
  });
  if (
    !vm ||
    viewWidth <= 0 ||
    viewHeight <= 0 ||
    (vm.winConditions.length === 0 && vm.diaryNotes.length === 0)
  ) {
    return empty();
  }

  const marginX = 8;
  const topY = 46;
  const isCompact = env.mode === 'compact';
  if (isCollapsed) {
    const bounds: Rect = {
      x: Math.max(marginX, viewWidth - marginX - COMPACT_TOGGLE_SIZE),
      y: topY,
      width: COMPACT_TOGGLE_SIZE,
      height: COMPACT_TOGGLE_SIZE,
    };
    return {
      bounds,
      toggleButtonBounds: bounds,
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
  const toggleButtonBounds: Rect = isCompact
    ? {
        x: panelX + panelWidth - paddingX - 18,
        y: topY + 4,
        width: 18,
        height: 18,
      }
    : { x: 0, y: 0, width: 0, height: 0 };

  let currentY = topY + paddingY;
  const winConditions = vm.winConditions.map((condition) => {
    const lines = wrapTextMeasured(
      env.measure,
      `${condition.fulfilled ? '✓ ' : '❇️ '}${condition.text}`,
      contentWidth,
      bodyFont,
    );
    const item = {
      condition,
      lines,
      y: currentY,
      height: lines.length * condLineHeight,
    };
    currentY += item.height + 4;
    return item;
  });
  if (winConditions.length > 0) currentY += 4;
  const diaryHeaderY = currentY;
  currentY += 16;
  const diaryNotes = vm.diaryNotes.map((note) => {
    const messageLines = wrapTextMeasured(
      env.measure,
      note.message,
      contentWidth,
      bodyFont,
    );
    const item = {
      note,
      messageLines,
      y: currentY,
      height: 14 + messageLines.length * lineHeight,
    };
    currentY += item.height + 6;
    return item;
  });
  const totalHeight =
    currentY - topY + paddingY - (diaryNotes.length === 0 ? 0 : 2);
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
    winConditions,
    diaryHeader: vm.diaryHeader,
    diaryHeaderY,
    diaryNotes,
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
  options: Pick<
    Extract<CompositionNode, { type: 'text' }>,
    'align' | 'baseline' | 'lineHeight' | 'decoration'
  > = {},
): CompositionNode =>
  positioned({ type: 'text', text, ...options, themeStyle: style }, bounds);

const diaryComposition = (
  layout: DiaryGeometry,
  viewWidth: number,
  viewHeight: number,
  env: UiEnv,
  isToggleHovered = false,
): CompositionLayoutNode | null => {
  const { bounds, toggleButtonBounds } = layout;
  if (!layout.hasContent || bounds.width <= 0 || bounds.height <= 0)
    return null;

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
    positioned(
      { type: 'hitTarget', actionId: layout.isCollapsed ? 'toggle' : 'panel' },
      bounds,
    ),
  ];

  if (layout.isCollapsed) {
    children.push(
      textNode(
        '📖',
        bounds,
        { text: 'panelHeader', fontSize: 'title', fontFamily: 'plain' },
        { align: 'center', baseline: 'middle' },
      ),
    );
  } else {
    if (layout.isCompact && toggleButtonBounds.width > 0) {
      children.push(
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
          },
          toggleButtonBounds,
        ),
        positioned(
          { type: 'hitTarget', actionId: 'toggle' },
          toggleButtonBounds,
        ),
        textNode(
          '−',
          toggleButtonBounds,
          {
            text: isToggleHovered ? 'bright' : 'secondary',
            fontSize: 'sm',
            fontWeight: 'bold',
          },
          { align: 'center', baseline: 'middle' },
        ),
      );
    }
    const contentX = bounds.x + 8;
    const contentWidth = bounds.width - 16;
    for (const item of layout.winConditions) {
      item.lines.forEach((line, index) => {
        children.push(
          textNode(
            line,
            {
              x: contentX,
              y: item.y + index * 14,
              width: contentWidth,
              height: 14,
            },
            {
              text: item.condition.fulfilled ? 'success' : 'body',
              fontSize: 'xxs',
            },
            {
              baseline: 'top',
              lineHeight: 14,
              decoration: item.condition.fulfilled
                ? 'strikethrough'
                : undefined,
            },
          ),
        );
      });
    }
    if (layout.winConditions.length > 0) {
      const last = layout.winConditions[layout.winConditions.length - 1];
      children.push(
        positioned(
          {
            type: 'line',
            orientation: 'horizontal',
            themeStyle: { border: 'divider', strokeWidth: 'thin' },
          },
          {
            x: contentX,
            y: last.y + last.height + 3.5,
            width: contentWidth,
            height: 1,
          },
        ),
      );
    }
    if (layout.diaryHeader) {
      children.push(
        textNode(
          layout.diaryHeader,
          {
            x: contentX,
            y: layout.diaryHeaderY,
            width: contentWidth,
            height: 16,
          },
          { text: 'diaryHeader', fontSize: 'sm', fontWeight: 'bold' },
        ),
      );
    }
    layout.diaryNotes.forEach((note) => {
      children.push(
        positioned(
          {
            type: 'line',
            orientation: 'horizontal',
            themeStyle: { border: 'separator', strokeWidth: 'thin' },
          },
          {
            x: contentX,
            y: note.y - 3.5,
            width: contentWidth,
            height: 1,
          },
        ),
        textNode(
          note.note.header,
          { x: contentX, y: note.y, width: contentWidth, height: 14 },
          { text: 'success', fontSize: 'xxs', fontWeight: 'bold' },
        ),
      );
      note.messageLines.forEach((line, index) => {
        children.push(
          textNode(
            line,
            {
              x: contentX,
              y: note.y + 14 + index * 13,
              width: contentWidth,
              height: 13,
            },
            { text: 'secondary', fontSize: 'xxs' },
          ),
        );
      });
    });
  }

  return layoutComposition(
    { type: 'stack', width: viewWidth, height: viewHeight, children },
    { x: 0, y: 0, width: viewWidth, height: viewHeight },
    env,
  );
};

export const getDiaryAndWinConditionsLayout = (
  viewWidth: number,
  viewHeight: number,
  state?: GameState | null,
  options?: RenderDiaryAndWinConditionsOptions,
  ctx?: CanvasRenderingContext2D | null,
): DiaryAndWinConditionsLayout => {
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
      winConditions: [],
      diaryHeader: kitLayout.diaryHeader,
      diaryHeaderY: kitLayout.diaryHeaderY,
      diaryNotes: [],
      hasContent: kitLayout.hasContent,
    };
  }

  const conditions = sortedWinConditions(state);
  const notes = foundDiaryNotes(state);

  return {
    ...kitLayout,
    winConditions: kitLayout.winConditions.map((item, index) => ({
      condition: conditions[index],
      text: item.condition.text,
      lines: item.lines,
      fulfilled: Boolean(conditions[index]?.fulfilled),
      y: item.y,
      height: item.height,
    })),
    diaryNotes: kitLayout.diaryNotes.map((item, index) => ({
      note: notes[index],
      header: item.note.header,
      message: item.note.message,
      messageLines: item.messageLines,
      turn: item.note.turn,
      y: item.y,
      height: item.height,
    })),
  };
};

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

  const kitLayout = kitLayoutFor(
    viewWidth,
    viewHeight,
    state,
    { isCollapsed },
    ctx ?? null,
  );
  const env = legacyUiEnv(undefined, { viewWidth, ctx });
  const composition = diaryComposition(kitLayout, viewWidth, viewHeight, env);
  const hit = composition ? hitTestComposition(composition, { x, y }) : null;
  if (!hit) return null;
  return hit.actionId === 'toggle'
    ? { type: 'toggle' }
    : hit.actionId === 'panel'
      ? { type: 'panel' }
      : null;
};

export const renderDiaryAndWinConditions = (
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  viewHeight: number,
  state?: GameState | null,
  options?: RenderDiaryAndWinConditionsOptions,
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
  const composition = diaryComposition(
    kitLayout,
    viewWidth,
    viewHeight,
    env,
    options?.isToggleHovered,
  );
  if (!composition) return;
  const ui: UiContext = { ...env, ctx, assets: uiAssetProvider };
  renderComposition(composition, ui);
};
