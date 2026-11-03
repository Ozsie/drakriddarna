// Dungeon intro component: the full-screen modal that presents a
// dungeon's intro text before the first turn. Kit component per the 02
// contract — the view model carries the dungeon title, the intro text and
// the close label prebuilt by the game-side adapter; layout is canvas-free
// (wrapping through env.measure); hits are semantic.

import { drawRoundedRect } from '../primitives/roundedRect';
import { isPointInRect, type Rect } from '../primitives/geometry';
import { composeFont, wrapTextMeasured } from '../primitives/text';
import type { UiContext, UiEnv } from '../env';
import type { UiTheme } from '../theme';

export interface DungeonIntroViewModel {
  readonly titleText: string;
  readonly introText: string;
  readonly closeButtonLabel: string;
}

export interface DungeonIntroLayout {
  hasContent: boolean;
  backdropBounds: Rect;
  panelBounds: Rect;
  titleText: string;
  titleBounds: Rect;
  introText: string;
  introLines: string[];
  introTextBounds: Rect;
  closeButtonBounds: Rect;
  closeButtonLabel: string;
}

/** Semantic hit: which part of the intro modal is under the point. */
export type DungeonIntroHit =
  { kind: 'close' } | { kind: 'panel' } | { kind: 'backdrop' } | null;

export const emptyDungeonIntroLayout = (): DungeonIntroLayout => ({
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
});

export const layoutDungeonIntro = (
  vm: DungeonIntroViewModel | null,
  viewBounds: Rect,
  env: UiEnv,
): DungeonIntroLayout => {
  const { width: viewWidth, height: viewHeight } = viewBounds;
  if (!vm || viewWidth <= 0 || viewHeight <= 0) {
    return emptyDungeonIntroLayout();
  }

  const theme: UiTheme = env.theme;
  const textFont = composeFont(theme, theme.typography.sizes.lg);

  const padding = 20;
  const panelWidth = Math.min(480, Math.max(260, viewWidth - 32));
  const contentWidth = panelWidth - padding * 2;

  const introLines = wrapTextMeasured(
    env.measure,
    vm.introText,
    contentWidth,
    textFont,
  );
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
    titleText: vm.titleText,
    titleBounds: {
      x: panelX + padding,
      y: titleY,
      width: contentWidth,
      height: titleHeight,
    },
    introText: vm.introText,
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
    closeButtonLabel: vm.closeButtonLabel,
  };
};

export const hitTestDungeonIntro = (
  layout: DungeonIntroLayout,
  point: { x: number; y: number },
): DungeonIntroHit => {
  if (!layout.hasContent) return null;
  if (isPointInRect(point.x, point.y, layout.closeButtonBounds)) {
    return { kind: 'close' };
  }
  if (isPointInRect(point.x, point.y, layout.panelBounds)) {
    return { kind: 'panel' };
  }
  if (isPointInRect(point.x, point.y, layout.backdropBounds)) {
    return { kind: 'backdrop' };
  }
  return null;
};

export interface RenderDungeonIntroOptions {
  readonly isCloseHovered?: boolean;
}

export const renderDungeonIntro = (
  layout: DungeonIntroLayout,
  ui: UiContext,
  options?: RenderDungeonIntroOptions,
): void => {
  const { ctx } = ui;
  const theme: UiTheme = ui.theme;
  if (!ctx || !layout.hasContent) return;

  const isHovered = Boolean(options?.isCloseHovered);

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
