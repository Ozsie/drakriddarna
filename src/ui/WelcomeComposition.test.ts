import { describe, expect, it, vi } from 'vitest';
import {
  defaultTheme,
  hitTestComposition,
  type CompositionLayoutNode,
  type UiContext,
} from '@hoard-engine/uikit';
import { createRecordingContext } from '@hoard-engine/uikit/testing';
import { defaultUiEnv } from './env';
import { getWelcomeLayout } from './WelcomeRendering';
import { toWelcomeViewModel } from './viewmodels/welcome';
import {
  layoutWelcomeComposition,
  renderWelcomeComposition,
} from './WelcomeComposition';

const layoutNodes = (node: CompositionLayoutNode): CompositionLayoutNode[] => [
  node,
  ...node.children.flatMap(layoutNodes),
];

const welcomeAt = (width: number, height: number, hasOngoingRun = false) => {
  const buildInfo = { date: '2026-10-31', hash: 'abc1234' };
  const options = { hasOngoingRun, buildInfo };
  const viewModel = toWelcomeViewModel(defaultUiEnv.t, buildInfo, options);
  const layout = getWelcomeLayout(width, height, options);
  const viewBounds = { x: 0, y: 0, width, height };
  const composition = layoutWelcomeComposition(
    viewModel,
    layout,
    viewBounds,
    defaultUiEnv,
  );

  return { viewModel, layout, viewBounds, composition };
};

const contextFor = (
  ctx: CanvasRenderingContext2D,
  get: UiContext['assets']['get'] = () => undefined,
): UiContext => ({
  ...defaultUiEnv,
  ctx,
  assets: { get },
});

describe('WelcomeComposition', () => {
  it.each([false, true])(
    'matches every existing button bound and hit (ongoing run: %s)',
    (hasOngoingRun) => {
      const { layout, composition } = welcomeAt(800, 600, hasOngoingRun);
      expect(composition).not.toBeNull();
      if (!composition) return;

      const nodes = layoutNodes(composition);
      const image = nodes.find((node) => node.node.type === 'image');
      const panel = nodes.find((node) => node.node.type === 'panel');
      const footer = nodes.find(
        (node) => node.node.type === 'text' && node.node.role === 'footer',
      );
      expect(image?.bounds).toEqual({ x: 0, y: 0, width: 800, height: 600 });
      expect(panel?.bounds).toEqual(layout.panelBounds);
      expect(panel?.node.type === 'panel' ? panel.node.title : null).toBe(
        layout.headerText,
      );
      expect(footer?.bounds).toEqual(layout.footerBounds);

      const buttons = nodes
        .filter((node) => node.node.type === 'button')
        .map((node) => ({
          id: node.node.type === 'button' ? node.node.actionId : '',
          label: node.node.type === 'button' ? node.node.label : '',
          bounds: node.bounds,
        }));

      expect(buttons).toEqual(layout.buttons);
      for (const button of layout.buttons) {
        expect(
          hitTestComposition(composition, {
            x: button.bounds.x + button.bounds.width / 2,
            y: button.bounds.y + button.bounds.height / 2,
          }),
        ).toEqual({ kind: 'button', actionId: button.id });
      }
    },
  );

  it('handles empty layouts and a short view without changing button bounds', () => {
    const empty = welcomeAt(0, 0);
    expect(empty.layout.hasContent).toBe(false);
    expect(empty.composition).toBeNull();

    const short = welcomeAt(800, 260);
    expect(short.composition).not.toBeNull();
    if (!short.composition) return;

    const buttons = layoutNodes(short.composition)
      .filter((node) => node.node.type === 'button')
      .map((node) => node.bounds);
    expect(buttons).toEqual(
      short.layout.buttons.map((button) => button.bounds),
    );
  });

  it('uses the asset port unless an explicit background override is provided', () => {
    const { viewModel, layout, viewBounds } = welcomeAt(800, 600);
    const image = { width: 1000, height: 500 } as CanvasImageSource;
    const assetGet = vi.fn(() => image);
    const assetRender = createRecordingContext();

    renderWelcomeComposition(
      viewModel,
      layout,
      viewBounds,
      contextFor(assetRender.ctx, assetGet),
    );

    expect(assetGet).toHaveBeenCalledWith(viewModel.backgroundAssetId);
    expect(assetRender.log).toContain('drawImage(image, -200, 0, 1200, 600)');

    const overrideGet = vi.fn(() => undefined);
    const overrideRender = createRecordingContext();
    renderWelcomeComposition(
      viewModel,
      layout,
      viewBounds,
      contextFor(overrideRender.ctx, overrideGet),
      { backgroundImage: image },
    );

    expect(overrideGet).not.toHaveBeenCalled();
    expect(overrideRender.log).toContain(
      'drawImage(image, -200, 0, 1200, 600)',
    );
  });

  it('uses explicit null to suppress asset lookup and draw the themed fallback', () => {
    const { viewModel, layout, viewBounds } = welcomeAt(800, 600);
    const assetGet = vi.fn(
      () => ({ width: 10, height: 10 }) as CanvasImageSource,
    );
    const render = createRecordingContext();

    renderWelcomeComposition(
      viewModel,
      layout,
      viewBounds,
      contextFor(render.ctx, assetGet),
      { backgroundImage: null },
    );

    expect(assetGet).not.toHaveBeenCalled();
    expect(render.log).toContain(
      `fillStyle=${JSON.stringify(defaultTheme.palette.surface.welcome)}`,
    );
    expect(render.log).toContain(
      'createRadialGradient(400, 300, 200, 400, 300, 533.3333333333334)',
    );
  });

  it('passes hovered button ids through to row rendering', () => {
    const { viewModel, layout, viewBounds } = welcomeAt(800, 600);
    const hovered = createRecordingContext();
    const resting = createRecordingContext();

    renderWelcomeComposition(
      viewModel,
      layout,
      viewBounds,
      contextFor(hovered.ctx),
      { backgroundImage: null, hoveredButton: layout.buttons[0].id },
    );
    renderWelcomeComposition(
      viewModel,
      layout,
      viewBounds,
      contextFor(resting.ctx),
      { backgroundImage: null },
    );

    expect(hovered.log).not.toEqual(resting.log);
  });
});
