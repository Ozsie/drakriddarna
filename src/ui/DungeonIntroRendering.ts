import type { GameState } from '../types';
import { addLog, i18n } from '../core';
import {
  drawRoundedRect,
  isPointInBounds,
  type CardBounds,
} from './HeroCardRendering';
import { wrapText } from './DiaryAndWinConditionRendering';

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
}

export interface DungeonIntroHitResult {
  type: 'close' | 'panel' | 'backdrop';
}

const DEFAULT_TEXT_FONT = '13px Arial, Helvetica, sans-serif';
const TITLE_FONT = 'bold 16px Arial, Helvetica, sans-serif';
const BUTTON_FONT = 'bold 13px Arial, Helvetica, sans-serif';

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

  const rawIntro = state.dungeon?.intro ?? '';
  const translatedIntro = i18n(rawIntro);
  const introText =
    translatedIntro && translatedIntro !== rawIntro
      ? translatedIntro
      : rawIntro;

  const rawTitle = state.dungeon?.name ?? 'Dungeon Intro';
  const translatedTitle = i18n(rawTitle);
  const titleText =
    translatedTitle && translatedTitle !== rawTitle
      ? translatedTitle
      : rawTitle;

  const closeButtonLabel = i18n('content.winConditions.buttonClose') || 'Close';

  const padding = 20;
  const panelWidth = Math.min(480, Math.max(260, viewWidth - 32));
  const contentWidth = panelWidth - padding * 2;

  const introLines = wrapText(ctx, introText, contentWidth, DEFAULT_TEXT_FONT);
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

  ctx.save();

  // 1. Dimmed Backdrop
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(
    layout.backdropBounds.x,
    layout.backdropBounds.y,
    layout.backdropBounds.width,
    layout.backdropBounds.height,
  );

  // 2. Dialog Panel
  const panel = layout.panelBounds;
  drawRoundedRect(ctx, panel.x, panel.y, panel.width, panel.height, 8);
  ctx.fillStyle = 'rgba(24, 28, 36, 0.96)';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
  ctx.stroke();

  // 3. Dungeon Title
  ctx.font = TITLE_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#f6ad55'; // warm gold
  const titleCenterX = panel.x + panel.width / 2;
  ctx.fillText(layout.titleText, titleCenterX, layout.titleBounds.y);

  // Decorative divider line under title
  const dividerY = layout.titleBounds.y + layout.titleBounds.height + 6;
  ctx.beginPath();
  ctx.moveTo(panel.x + 30, dividerY);
  ctx.lineTo(panel.x + panel.width - 30, dividerY);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 4. Intro Text Lines
  ctx.font = DEFAULT_TEXT_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(235, 240, 245, 0.95)';
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
    ? 'rgba(49, 130, 206, 0.9)'
    : 'rgba(45, 55, 72, 0.9)';
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = isHovered
    ? 'rgba(99, 179, 237, 0.95)'
    : 'rgba(255, 255, 255, 0.2)';
  ctx.stroke();

  ctx.font = BUTTON_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(
    layout.closeButtonLabel,
    btn.x + btn.width / 2,
    btn.y + btn.height / 2,
  );

  ctx.restore();
};
