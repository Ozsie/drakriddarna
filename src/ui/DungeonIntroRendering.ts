import type { GameState } from '../types';
import { addLog } from '../core';
import { startDungeonTimer } from '../core';
import {
  drawRoundedRect,
  isPointInBounds,
  type CardBounds,
} from './HeroCardRendering';
import { wrapText } from './DiaryAndWinConditionRendering';
import { composeFont } from '../uikit/primitives/text';
import type { UiEnv } from '../uikit/env';
import { defaultUiEnv } from './env';
import { i18nTranslator } from './i18nAdapter';

export interface DungeonIntroLayout {
  hasContent: boolean;
  backdropBounds: CardBounds;
  panelBounds: CardBounds;
  titleText: string;
  titleBounds: CardBounds;
  introText: string;
  introLines: string[];
  introTextBounds: CardBounds;
  closeButtonBounds: CardBounds;
  closeButtonLabel: string;
}

export interface RenderDungeonIntroOptions {
  dismissed?: boolean;
  isCloseHovered?: boolean;
  env?: UiEnv;
}

export interface DungeonIntroHitResult {
  type: 'close' | 'panel' | 'backdrop';
}

export const shouldShowDungeonIntro = (
  state: GameState | null | undefined,
  dismissed = false,
): boolean => {
  if (!state || dismissed) return false;
  const intro = state.dungeon?.intro;
  if (!intro || typeof intro !== 'string' || intro.trim().length === 0) {
    return false;
  }
  const turnCount = state.turnCount ?? 0;
  return turnCount <= 0;
};

export const dismissDungeonIntro = (
  state: GameState | null | undefined,
): boolean => {
  if (!state?.dungeon?.intro) return false;
  const dungeon = state.dungeon;
  addLog(state, dungeon.intro);
  // Closing the intro starts the dungeon's timer (a no-op when it
  // already runs, e.g. a dungeon without an intro).
  startDungeonTimer(state);

  if (!dungeon.layout) {
    dungeon.layout = {
      grid: [],
      doors: [],
      monsters: [],
      secrets: [],
      notes: [],
      items: [],
      corridors: [],
      corners: [],
    };
  }
  if (!dungeon.layout.notes) {
    dungeon.layout.notes = [];
  }

  if (!dungeon.layout.notes.find((note) => note.message === dungeon.intro)) {
    dungeon.layout.notes.push({
      found: true,
      foundOn: 0,
      message: dungeon.intro,
      position: { x: 0, y: 0 },
    });
  }

  return true;
};

export const getDungeonIntroLayout = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options?: RenderDungeonIntroOptions,
  ctx?: CanvasRenderingContext2D | null,
): DungeonIntroLayout => {
  const emptyLayout: DungeonIntroLayout = {
    hasContent: false,
    backdropBounds: { x: 0, y: 0, width: 0, height: 0 },
    panelBounds: { x: 0, y: 0, width: 0, height: 0 },
    titleText: '',
    titleBounds: { x: 0, y: 0, width: 0, height: 0 },
    introText: '',
    introLines: [],
    introTextBounds: { x: 0, y: 0, width: 0, height: 0 },
    closeButtonBounds: { x: 0, y: 0, width: 0, height: 0 },
    closeButtonLabel: '',
  };

  if (
    !state ||
    viewWidth <= 0 ||
    viewHeight <= 0 ||
    !shouldShowDungeonIntro(state, options?.dismissed)
  ) {
    return emptyLayout;
  }

  const t = options?.env?.t ?? i18nTranslator;
  const rawIntro = state.dungeon?.intro ?? '';
  const translatedIntro = t(rawIntro);
  const introText =
    translatedIntro && translatedIntro !== rawIntro
      ? translatedIntro
      : rawIntro;

  const rawTitle = state.dungeon?.name ?? 'Dungeon Intro';
  const translatedTitle = t(rawTitle);
  const titleText =
    translatedTitle && translatedTitle !== rawTitle
      ? translatedTitle
      : rawTitle;

  const closeButtonLabel = t('content.winConditions.buttonClose') || 'Close';

  const theme = options?.env?.theme ?? defaultUiEnv.theme;
  const textFont = composeFont(theme, theme.typography.sizes.lg);

  const padding = 20;
  const panelWidth = Math.min(480, Math.max(260, viewWidth - 32));
  const contentWidth = panelWidth - padding * 2;

  const introLines = wrapText(ctx, introText, contentWidth, textFont);
  const lineHeight = 18;
  const textHeight = introLines.length * lineHeight;

  const titleHeight = 24;
  const buttonHeight = 32;
  const buttonWidth = Math.min(120, contentWidth);
  const gap = 16;

  const panelHeight =
    padding + titleHeight + gap + textHeight + gap + buttonHeight + padding;

  const panelX = Math.round((viewWidth - panelWidth) / 2);
  const panelY = Math.round(Math.max(16, (viewHeight - panelHeight) / 2));

  const titleY = panelY + padding;
  const textY = titleY + titleHeight + gap;
  const buttonY = textY + textHeight + gap;
  const buttonX = Math.round(panelX + (panelWidth - buttonWidth) / 2);

  return {
    hasContent: true,
    backdropBounds: {
      x: 0,
      y: 0,
      width: viewWidth,
      height: viewHeight,
    },
    panelBounds: {
      x: panelX,
      y: panelY,
      width: panelWidth,
      height: panelHeight,
    },
    titleText,
    titleBounds: {
      x: panelX + padding,
      y: titleY,
      width: contentWidth,
      height: titleHeight,
    },
    introText,
    introLines,
    introTextBounds: {
      x: panelX + padding,
      y: textY,
      width: contentWidth,
      height: textHeight,
    },
    closeButtonBounds: {
      x: buttonX,
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight,
    },
    closeButtonLabel,
  };
};

export const getDungeonIntroHit = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  x: number,
  y: number,
  options?: RenderDungeonIntroOptions,
  ctx?: CanvasRenderingContext2D | null,
): DungeonIntroHitResult | null => {
  const layout = getDungeonIntroLayout(
    viewWidth,
    viewHeight,
    state,
    options,
    ctx,
  );
  if (!layout.hasContent) return null;

  if (isPointInBounds(x, y, layout.closeButtonBounds)) {
    return { type: 'close' };
  }
  if (isPointInBounds(x, y, layout.panelBounds)) {
    return { type: 'panel' };
  }
  if (isPointInBounds(x, y, layout.backdropBounds)) {
    return { type: 'backdrop' };
  }
  return null;
};

export const renderDungeonIntro = (
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options?: RenderDungeonIntroOptions,
): void => {
  const layout = getDungeonIntroLayout(
    viewWidth,
    viewHeight,
    state,
    options,
    ctx,
  );
  if (!layout.hasContent) return;

  const theme = options?.env?.theme ?? defaultUiEnv.theme;

  ctx.save();

  // 1. Dimmed Backdrop
  ctx.fillStyle = theme.palette.overlay.scrimStrong;
  ctx.fillRect(
    layout.backdropBounds.x,
    layout.backdropBounds.y,
    layout.backdropBounds.width,
    layout.backdropBounds.height,
  );

  // 2. Dialog Panel
  const panel = layout.panelBounds;
  drawRoundedRect(ctx, panel.x, panel.y, panel.width, panel.height, 8);
  ctx.fillStyle = theme.palette.surface.panelIntro;
  ctx.fill();
  ctx.lineWidth = theme.shape.strokeWidth.medium;
  ctx.strokeStyle = theme.palette.border.panelIntro;
  ctx.stroke();

  // 3. Dungeon Title
  ctx.font = composeFont(
    theme,
    theme.typography.sizes.xxxl,
    theme.typography.weights.bold,
  );
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = theme.palette.text.introTitle; // warm gold
  const titleCenterX = panel.x + panel.width / 2;
  ctx.fillText(layout.titleText, titleCenterX, layout.titleBounds.y);

  // Decorative divider line under title
  const dividerY = layout.titleBounds.y + layout.titleBounds.height + 6;
  ctx.beginPath();
  ctx.moveTo(panel.x + 30, dividerY);
  ctx.lineTo(panel.x + panel.width - 30, dividerY);
  ctx.strokeStyle = theme.palette.border.hairline;
  ctx.lineWidth = theme.shape.strokeWidth.thin;
  ctx.stroke();

  // 4. Intro Text Lines
  ctx.font = composeFont(theme, theme.typography.sizes.lg);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = theme.palette.text.introBody;
  const lineHeight = 18;
  layout.introLines.forEach((line, index) => {
    ctx.fillText(
      line,
      titleCenterX,
      layout.introTextBounds.y + index * lineHeight,
    );
  });

  // 5. Close Button
  const btn = layout.closeButtonBounds;
  const isHovered = Boolean(options?.isCloseHovered);
  drawRoundedRect(ctx, btn.x, btn.y, btn.width, btn.height, 5);
  ctx.fillStyle = isHovered
    ? theme.palette.surface.buttonIntroHover
    : theme.palette.surface.buttonIntro;
  ctx.fill();
  ctx.lineWidth = theme.shape.strokeWidth.thin;
  ctx.strokeStyle = isHovered
    ? theme.palette.border.buttonIntroHover
    : theme.palette.border.subtle;
  ctx.stroke();

  ctx.font = composeFont(
    theme,
    theme.typography.sizes.lg,
    theme.typography.weights.bold,
  );
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = theme.palette.text.bright;
  ctx.fillText(
    layout.closeButtonLabel,
    btn.x + btn.width / 2,
    btn.y + btn.height / 2,
  );

  ctx.restore();
};
