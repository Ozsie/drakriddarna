import type {
  CompositionLayoutNode,
  CompositionNode,
  CompositionRenderOptions,
  Rect,
  UiContext,
  UiEnv,
  WelcomeViewModel,
} from '@hoard-engine/uikit';
import { layoutComposition, renderComposition } from '@hoard-engine/uikit';

export interface WelcomeCompositionLayout {
  hasContent: boolean;
  panelBounds: Rect;
  headerText: string;
  buttons: { id: string; label: string; bounds: Rect }[];
  footerBounds: Rect;
  footerText: string;
}

export interface WelcomeCompositionOptions {
  backgroundImage?: CanvasImageSource | null;
  hoveredButton?: string | null;
}

const buttonColumnFor = (
  layout: WelcomeCompositionLayout,
): CompositionNode | null => {
  if (layout.buttons.length === 0) return null;

  const firstButton = layout.buttons[0];
  const contentTop = layout.panelBounds.y + 16 + 48;
  const children: CompositionNode[] = [];
  const topSpace = firstButton.bounds.y - contentTop;
  if (topSpace > 0) children.push({ type: 'spacer', size: topSpace });

  layout.buttons.forEach((button, index) => {
    children.push({
      type: 'button',
      actionId: button.id,
      label: button.label,
      variant: 'row',
      width: button.bounds.width,
      height: button.bounds.height,
    });
    const nextButton = layout.buttons[index + 1];
    if (nextButton) {
      const gap =
        nextButton.bounds.y - (button.bounds.y + button.bounds.height);
      if (gap > 0) children.push({ type: 'spacer', size: gap });
    }
  });

  return {
    type: 'column',
    width: firstButton.bounds.width,
    alignSelf: 'center',
    children,
  };
};

export const createWelcomeComposition = (
  viewModel: WelcomeViewModel,
  layout: WelcomeCompositionLayout,
  viewBounds: Rect,
  options?: WelcomeCompositionOptions,
): CompositionNode | null => {
  if (!layout.hasContent) return null;

  const image: CompositionNode = {
    type: 'image',
    assetId: viewModel.backgroundAssetId,
    fit: 'cover',
    fallback: 'welcome',
    width: viewBounds.width,
    height: viewBounds.height,
    ...(options?.backgroundImage !== undefined
      ? {
          imageOverride: {
            source: options.backgroundImage,
            fit: 'cover' as const,
          },
        }
      : {}),
  };

  const panelChildren = buttonColumnFor(layout);
  const panel: CompositionNode = {
    type: 'panel',
    title: layout.headerText,
    width: layout.panelBounds.width,
    height: layout.panelBounds.height,
    padding: 16,
    alignSelf: 'center',
    justifySelf: 'center',
    children: panelChildren ? [panelChildren] : [],
  };

  const footer: CompositionNode | null = layout.footerText
    ? {
        type: 'column',
        width: viewBounds.width,
        height: viewBounds.height - layout.footerBounds.y,
        alignSelf: 'stretch',
        justifySelf: 'end',
        children: [
          {
            type: 'text',
            text: layout.footerText,
            role: 'footer',
            align: 'center',
            baseline: 'bottom',
            width: layout.footerBounds.width,
            height: layout.footerBounds.height,
          },
          { type: 'spacer', grow: 1 },
        ],
      }
    : null;

  return {
    type: 'stack',
    width: viewBounds.width,
    height: viewBounds.height,
    children: [image, panel, ...(footer ? [footer] : [])],
  };
};

export const layoutWelcomeComposition = (
  viewModel: WelcomeViewModel,
  layout: WelcomeCompositionLayout,
  viewBounds: Rect,
  env: UiEnv,
  options?: WelcomeCompositionOptions,
): CompositionLayoutNode | null => {
  const composition = createWelcomeComposition(
    viewModel,
    layout,
    viewBounds,
    options,
  );
  return composition ? layoutComposition(composition, viewBounds, env) : null;
};

export const renderWelcomeComposition = (
  viewModel: WelcomeViewModel,
  layout: WelcomeCompositionLayout,
  viewBounds: Rect,
  ui: UiContext,
  options?: WelcomeCompositionOptions,
): void => {
  const compositionLayout = layoutWelcomeComposition(
    viewModel,
    layout,
    viewBounds,
    ui,
    options,
  );
  if (!compositionLayout) return;

  const renderOptions: CompositionRenderOptions = {
    hoveredActionId: options?.hoveredButton ?? null,
  };
  renderComposition(compositionLayout, ui, renderOptions);
};
