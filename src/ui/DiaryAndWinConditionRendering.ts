// Game-side facade for the diary/win-condition panel. The component
// (layout, hit test, render over the view model) lives in the kit; the
// adapter in ./viewmodels/diary is the only place that reads GameState.
// This module keeps the historical entry points — including the
// Note/WinCondition-carrying layout items and the shared wrap/measure
// helpers BetweenDungeonsRendering still uses — so the controller, the
// hit cascade and existing tests work unchanged, with the exact same
// pixels: parity snapshots cover the whole chain.

import type { GameState, Note, WinCondition } from '../types';
import type { UiEnv, UiContext } from '../uikit/env';
import type { Rect } from '../uikit/primitives/geometry';
import {
  measureTextWidth as kitMeasureTextWidth,
  wrapText as kitWrapText,
} from '../uikit/primitives/text';
import {
  hitTestDiary,
  layoutDiary,
  renderDiary as renderDiaryComponent,
  type DiaryHit,
  type DiaryLayout as KitLayout,
} from '../uikit/components/diary';
import {
  foundDiaryNotes,
  sortedWinConditions,
  toDiaryViewModel,
} from './viewmodels/diary';
import { defaultTheme } from '../uikit/theme';
import { layoutModeForWidth, textMeasureFromCtx } from './env';
import { i18nTranslator } from './i18nAdapter';
import { uiAssetProvider } from './assets';

export {
  formatDiaryHeader,
  formatNoteHeader,
  formatNoteMessage,
  formatWinCondition,
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

/** The env a legacy call implies: overrides or the width-derived defaults. */
const legacyEnv = (
  viewWidth: number,
  env: UiEnv | undefined,
  ctx: CanvasRenderingContext2D | null | undefined,
): UiEnv => ({
  theme: env?.theme ?? defaultTheme,
  mode:
    env?.mode ??
    (viewWidth > 0 && layoutModeForWidth(viewWidth) === 'compact'
      ? 'compact'
      : 'regular'),
  t: env?.t ?? i18nTranslator,
  measure: ctx
    ? textMeasureFromCtx(ctx)
    : env?.measure ?? {
        width: (text: string) => text.length * FALLBACK_PER_CHAR,
      },
});

const kitLayoutFor = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options: RenderDiaryAndWinConditionsOptions | undefined,
  ctx: CanvasRenderingContext2D | null | undefined,
): KitLayout => {
  const env = legacyEnv(viewWidth, options?.env, ctx);
  const vm = toDiaryViewModel(state, env.t);
  return layoutDiary(
    vm,
    { x: 0, y: 0, width: viewWidth, height: viewHeight },
    env,
    { isCollapsed: options?.isCollapsed },
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
      fulfilled: item.condition.fulfilled,
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
  const hit: DiaryHit = hitTestDiary(kitLayout, { x, y });
  if (!hit) return null;
  return hit.kind === 'toggle' ? { type: 'toggle' } : { type: 'panel' };
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

  const ui: UiContext = {
    ...legacyEnv(viewWidth, options?.env, ctx),
    ctx,
    assets: uiAssetProvider,
  };
  renderDiaryComponent(kitLayout, ui, {
    isToggleHovered: options?.isToggleHovered,
  });
};
