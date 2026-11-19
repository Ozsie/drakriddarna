// Game-side facade for the dungeon intro. Its consumer-owned composition
// keeps the historical entry points; the adapter in ./viewmodels/dungeonIntro
// remains the only place that reads GameState.

import type { GameState } from '../types';
import type { Rect } from '@hoard-engine/primitives';
import { composeFont, wrapTextMeasured } from '@hoard-engine/primitives';
import type {
  CompositionLayoutNode,
  CompositionNode,
  UiContext,
  UiEnv,
} from '@hoard-engine/uikit';
import {
  hitTestComposition,
  layoutComposition,
  renderComposition,
} from '@hoard-engine/uikit';
import {
  shouldShowDungeonIntro as shouldShow,
  toDungeonIntroViewModel,
} from './viewmodels/dungeonIntro';
import { legacyUiContext, legacyUiEnv } from './env';

export type { DungeonIntroViewModel } from './viewmodels/dungeonIntro';
export { shouldShowDungeonIntro } from './viewmodels/dungeonIntro';
export { dismissDungeonIntro } from './actions/dismissDungeonIntro';

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

export interface RenderDungeonIntroOptions {
  dismissed?: boolean;
  isCloseHovered?: boolean;
  env?: UiEnv;
}

export interface DungeonIntroHitResult {
  type: 'close' | 'panel' | 'backdrop';
}

const emptyLayout = (): DungeonIntroLayout => ({
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

const kitLayoutFor = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options: RenderDungeonIntroOptions | undefined,
  ctx: CanvasRenderingContext2D | null | undefined,
): DungeonIntroLayout => {
  const env = legacyUiEnv(options?.env, { viewWidth, ctx });
  if (
    viewWidth <= 0 ||
    viewHeight <= 0 ||
    !shouldShow(state, options?.dismissed)
  ) {
    return emptyLayout();
  }
  const vm = toDungeonIntroViewModel(state, env.t);
  if (!vm) return emptyLayout();

  const theme = env.theme;
  const panelWidth = Math.min(480, Math.max(260, viewWidth - 32));
  const padding = 20;
  const contentWidth = panelWidth - padding * 2;
  const font = composeFont(theme, theme.typography.sizes.lg);
  const introLines = wrapTextMeasured(
    env.measure,
    vm.introText,
    contentWidth,
    font,
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
    backdropBounds: { x: 0, y: 0, width: viewWidth, height: viewHeight },
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

const positioned = (node: CompositionNode, bounds: Rect): CompositionNode => ({
  ...node,
  width: bounds.width,
  height: bounds.height,
  offsetX: bounds.x,
  offsetY: bounds.y,
  alignSelf: 'start',
  justifySelf: 'start',
});

const compositionFor = (
  layout: DungeonIntroLayout,
  hovered: boolean,
): CompositionNode => {
  const panel = layout.panelBounds;
  const centerX = panel.x + panel.width / 2;
  const children: CompositionNode[] = [
    positioned(
      {
        type: 'hitTarget',
        actionId: 'backdrop',
      },
      layout.backdropBounds,
    ),
    positioned({ type: 'hitTarget', actionId: 'panel' }, panel),
    positioned(
      { type: 'fill', themeStyle: { overlay: 'scrimStrong' } },
      layout.backdropBounds,
    ),
    positioned(
      {
        type: 'fill',
        shape: 'roundedRect',
        themeStyle: {
          surface: 'panelIntro',
          border: 'panelIntro',
          radius: 8,
          strokeWidth: 'medium',
        },
      },
      panel,
    ),
    positioned(
      {
        type: 'text',
        text: layout.titleText,
        align: 'center',
        baseline: 'top',
        themeStyle: {
          text: 'introTitle',
          fontSize: 'xxxl',
          fontWeight: 'bold',
        },
      },
      { ...layout.titleBounds, x: centerX - layout.titleBounds.width / 2 },
    ),
    positioned(
      {
        type: 'line',
        orientation: 'horizontal',
        themeStyle: { border: 'hairline', strokeWidth: 'thin' },
      },
      {
        x: panel.x + 30,
        y: layout.titleBounds.y + layout.titleBounds.height + 5.5,
        width: panel.width - 60,
        height: 1,
      },
    ),
  ];
  layout.introLines.forEach((text, index) => {
    children.push(
      positioned(
        {
          type: 'text',
          text,
          align: 'center',
          baseline: 'top',
          lineHeight: 18,
          themeStyle: { text: 'introBody', fontSize: 'lg' },
        },
        {
          x: centerX - layout.introTextBounds.width / 2,
          y: layout.introTextBounds.y + index * 18,
          width: layout.introTextBounds.width,
          height: 18,
        },
      ),
    );
  });
  children.push(
    positioned(
      {
        type: 'button',
        actionId: 'close',
        label: layout.closeButtonLabel,
        variant: 'secondary',
        themeStyle: {
          surface: hovered ? 'buttonIntroHover' : 'buttonIntro',
          border: hovered ? 'buttonIntroHover' : 'subtle',
          text: 'bright',
          fontSize: 'lg',
          fontWeight: 'bold',
          radius: 5,
          strokeWidth: 'thin',
        },
        hoverThemeStyle: {
          surface: 'buttonIntroHover',
          border: 'buttonIntroHover',
        },
      },
      layout.closeButtonBounds,
    ),
  );
  return {
    type: 'stack',
    width: layout.backdropBounds.width,
    height: layout.backdropBounds.height,
    children,
  };
};

const compositionLayoutFor = (
  layout: DungeonIntroLayout,
  env: UiEnv,
  hovered: boolean,
): CompositionLayoutNode =>
  layoutComposition(
    compositionFor(layout, hovered),
    layout.backdropBounds,
    env,
  );

export const getDungeonIntroLayout = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options?: RenderDungeonIntroOptions,
  ctx?: CanvasRenderingContext2D | null,
): DungeonIntroLayout =>
  kitLayoutFor(viewWidth, viewHeight, state, options, ctx ?? null);

export const getDungeonIntroHit = (
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  x: number,
  y: number,
  options?: RenderDungeonIntroOptions,
  ctx?: CanvasRenderingContext2D | null,
): DungeonIntroHitResult | null => {
  const layout = kitLayoutFor(
    viewWidth,
    viewHeight,
    state,
    options,
    ctx ?? null,
  );
  if (!layout.hasContent) return null;
  const composition = compositionLayoutFor(
    layout,
    legacyUiEnv(options?.env, { viewWidth, ctx: ctx ?? null }),
    options?.isCloseHovered ?? false,
  );
  const hit = hitTestComposition(composition, { x, y });
  return hit?.kind === 'hitTarget' || hit?.kind === 'button'
    ? { type: hit.actionId as DungeonIntroHitResult['type'] }
    : null;
};

export const renderDungeonIntro = (
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  viewHeight: number,
  state: GameState | null | undefined,
  options?: RenderDungeonIntroOptions,
): void => {
  const layout = kitLayoutFor(viewWidth, viewHeight, state, options, ctx);
  if (!layout.hasContent) return;

  const ui: UiContext = legacyUiContext(ctx, options?.env, { ctx });
  const composition = compositionLayoutFor(
    layout,
    ui,
    options?.isCloseHovered ?? false,
  );
  renderComposition(composition, ui, {
    hoveredActionId: options?.isCloseHovered ? 'close' : null,
  });
};
