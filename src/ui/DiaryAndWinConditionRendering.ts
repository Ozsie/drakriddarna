// Game-side facade for the diary/win-condition panel. The component
// (layout, hit test, render over the view model) lives in the kit; the
// adapter in ./viewmodels/diary is the only place that reads GameState.
// This module keeps the historical entry points — including the
// Note/WinCondition-carrying layout items and the shared wrap/measure
// helpers BetweenDungeonsRendering still uses — so the controller, the
// hit cascade and existing tests work unchanged, with the exact same
// pixels: parity snapshots cover the whole chain.

import type { GameState, Note, WinCondition } from '../types';
import type { UiEnv, UiContext } from '@hoard-engine/uikit';
import type { Rect } from '@hoard-engine/primitives';
import {
  hitTestDiary,
  layoutDiary,
  renderDiary as renderDiaryComponent,
  type DiaryHit,
  type DiaryLayout as KitLayout,
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

const kitLayoutFor = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options: RenderDiaryAndWinConditionsOptions | undefined,
  ctx: CanvasRenderingContext2D | null | undefined,
): KitLayout => {
  const env = legacyUiEnv(options?.env, { viewWidth, ctx });
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
    ...legacyUiEnv(options?.env, { viewWidth, ctx }),
    ctx,
    assets: uiAssetProvider,
  };
  renderDiaryComponent(kitLayout, ui, {
    isToggleHovered: options?.isToggleHovered,
  });
};
