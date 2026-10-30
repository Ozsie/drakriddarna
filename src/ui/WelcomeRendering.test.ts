import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  getCoverFitBounds,
  getWelcomeHit,
  getWelcomeLayout,
  renderWelcome,
  WELCOME_FALLBACK_COLOR,
} from './WelcomeRendering';
import { loadTranslations } from '$lib/translations';

const createMockCtx = (): CanvasRenderingContext2D => {
  const gradient = {
    addColorStop: vi.fn(),
  };
  const fillStyles: string[] = [];
  const fillRectCalls: { args: number[]; style: string }[] = [];
  const ctx = {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    rect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    clip: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arcTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn((text: string) => ({
      width: text.length * 8,
    })),
    createRadialGradient: vi.fn(() => gradient),
    drawImage: vi.fn(),
    fillRect: vi.fn((...args: number[]) => {
      fillRectCalls.push({
        args,
        style: fillStyles[fillStyles.length - 1] ?? '',
      });
    }),
    fillRectCalls,
    get fillStyle() {
      return fillStyles[fillStyles.length - 1] ?? '';
    },
    set fillStyle(value: string) {
      fillStyles.push(value);
    },
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
  } as unknown as CanvasRenderingContext2D;
  return ctx;
};

const createMockImage = (width: number, height: number): HTMLImageElement =>
  ({
    naturalWidth: width,
    naturalHeight: height,
  }) as unknown as HTMLImageElement;

describe('WelcomeRendering', () => {
  beforeAll(async () => {
    // The welcome labels are human-authored translations; without a loaded
    // locale i18n falls back to the raw keys.
    await loadTranslations('en');
  });

  describe('layout', () => {
    it('returns empty content without view dimensions', () => {
      const layout = getWelcomeLayout(0, 0);
      expect(layout.hasContent).toBe(false);
      expect(layout.buttons).toHaveLength(0);
    });

    it('centers the panel on the screen', () => {
      const layout = getWelcomeLayout(800, 600);
      expect(layout.hasContent).toBe(true);
      const { panelBounds } = layout;
      expect(
        Math.abs(panelBounds.x * 2 + panelBounds.width - 800),
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(panelBounds.y * 2 + panelBounds.height - 600),
      ).toBeLessThanOrEqual(1);
    });

    it('uses the save/load dialog sizing rule for the panel width', () => {
      const layout = getWelcomeLayout(1600, 900);
      expect(layout.panelBounds.width).toBe(560);
      const narrow = getWelcomeLayout(400, 600);
      expect(narrow.panelBounds.width).toBeLessThanOrEqual(400 - 24);
      expect(narrow.panelBounds.width).toBeGreaterThanOrEqual(340);
    });

    it('stacks the three buttons inside the panel in order', () => {
      const layout = getWelcomeLayout(800, 600);
      expect(layout.buttons.map((button) => button.id)).toEqual([
        'newGame',
        'loadGame',
        'settings',
      ]);
      for (const button of layout.buttons) {
        expect(button.bounds.x).toBeGreaterThanOrEqual(layout.panelBounds.x);
        expect(button.bounds.x + button.bounds.width).toBeLessThanOrEqual(
          layout.panelBounds.x + layout.panelBounds.width,
        );
      }
      // Rows are separated by the gap and do not overlap.
      const [first, second, third] = layout.buttons;
      expect(second.bounds.y).toBe(first.bounds.y + first.bounds.height + 8);
      expect(third.bounds.y).toBe(second.bounds.y + second.bounds.height + 8);
    });

    it('scales rows down on short views without overlapping the panel', () => {
      const layout = getWelcomeLayout(800, 260);
      expect(layout.hasContent).toBe(true);
      const panelBottom = layout.panelBounds.y + layout.panelBounds.height;
      const lastButton = layout.buttons[layout.buttons.length - 1];
      expect(lastButton.bounds.y + lastButton.bounds.height).toBeLessThan(
        panelBottom,
      );
      expect(
        layout.panelBounds.y + layout.panelBounds.height,
      ).toBeLessThanOrEqual(260);
    });

    it('formats the build footer like the canvas menu footer', () => {
      const layout = getWelcomeLayout(800, 600, {
        buildInfo: { date: '2026-10-30', hash: 'abc1234' },
      });
      expect(layout.footerText).toBe('2026-10-30 - abc1234');
      // The baseline sits 12px above the canvas bottom edge.
      expect(layout.footerBounds.y + layout.footerBounds.height).toBe(600 - 12);
      const withoutInfo = getWelcomeLayout(800, 600);
      expect(withoutInfo.footerText).toBe('');
    });
  });

  describe('hit', () => {
    it('hits the buttons inside their bounds', () => {
      const layout = getWelcomeLayout(800, 600);
      for (const button of layout.buttons) {
        const hit = getWelcomeHit(
          800,
          600,
          button.bounds.x + 10,
          button.bounds.y + button.bounds.height / 2,
        );
        expect(hit).toBe(button.id);
      }
    });

    it('returns null outside the panel and between rows', () => {
      const layout = getWelcomeLayout(800, 600);
      // Outside the panel entirely.
      expect(getWelcomeHit(800, 600, 10, 10)).toBeNull();
      // Between two rows.
      const [first, second] = layout.buttons;
      const betweenY = first.bounds.y + first.bounds.height + 4;
      expect(getWelcomeHit(800, 600, first.bounds.x + 10, betweenY)).toBeNull();
      expect(second.bounds.y).toBeGreaterThan(betweenY);
    });
  });

  describe('render', () => {
    it('draws the fallback colour when no image is available', () => {
      const ctx = createMockCtx();
      renderWelcome(ctx, 800, 600, { backgroundImage: null });
      // The full-canvas fallback fill is the first full-width fillRect,
      // painted in the fallback colour and followed by the vignette.
      const calls = (
        ctx as unknown as {
          fillRectCalls: { args: number[]; style: string }[];
        }
      ).fillRectCalls;
      expect(calls[0].args).toEqual([0, 0, 800, 600]);
      expect(calls[0].style).toBe(WELCOME_FALLBACK_COLOR);
      expect(
        (ctx as unknown as { createRadialGradient: ReturnType<typeof vi.fn> })
          .createRadialGradient,
      ).toHaveBeenCalled();
    });

    it('draws the image cover-fit over the whole canvas', () => {
      const ctx = createMockCtx();
      const image = createMockImage(1000, 500);
      renderWelcome(ctx, 800, 600, { backgroundImage: image });
      const draws = (ctx as unknown as { drawImage: ReturnType<typeof vi.fn> })
        .drawImage.mock.calls as unknown as unknown[][];
      expect(draws).toHaveLength(1);
      const [drawnImage, x, y, width, height] = draws[0];
      expect(drawnImage).toBe(image);
      // Cover: 1200x600, centered horizontally, cropped vertically.
      expect(width).toBe(1200);
      expect(height).toBe(600);
      expect(x).toBe(-200);
      expect(y).toBe(0);
    });

    it('renders the header, buttons and footer text', () => {
      const ctx = createMockCtx();
      renderWelcome(ctx, 800, 600, {
        buildInfo: { date: '2026-10-30', hash: 'dev' },
      });
      const texts = (ctx as unknown as { fillText: ReturnType<typeof vi.fn> })
        .fillText.mock.calls as unknown as string[][];
      expect(texts.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('cover fit', () => {
    it('covers the view and centers the overflow', () => {
      // Wider than tall view: the image scales by width, crops vertically.
      const wide = getCoverFitBounds(1000, 500, 800, 600);
      expect(wide.width).toBe(1200);
      expect(wide.height).toBe(600);
      expect(wide.x).toBe(-200);
      expect(wide.y).toBe(0);
      // Taller than wide view: scales by height, crops horizontally.
      const tall = getCoverFitBounds(500, 1000, 600, 800);
      expect(tall.width).toBe(600);
      expect(tall.height).toBe(1200);
      expect(tall.x).toBe(0);
      expect(tall.y).toBe(-200);
      // Exact fit.
      const exact = getCoverFitBounds(800, 600, 800, 600);
      expect(exact).toEqual({ x: 0, y: 0, width: 800, height: 600 });
    });
  });
});
