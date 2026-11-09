import { describe, expect, it, vi } from 'vitest';
import { renderDecorators, renderLightSprites } from '../items/ItemRendering';
import { CellAlignment, type GameState } from '../types';

vi.mock('../core/ImageCache', () => ({
  getReadyImage: (url: string): HTMLImageElement =>
    ({
      naturalWidth: url.includes('Torch Animated')
        ? 256
        : url.includes('dw9f2h0x')
          ? 540
          : 32,
      naturalHeight: url.includes('Torch Animated')
        ? 128
        : url.includes('dw9f2h0x')
          ? 639
          : 32,
      width: url.includes('Torch Animated')
        ? 256
        : url.includes('dw9f2h0x')
          ? 540
          : 32,
      height: url.includes('Torch Animated')
        ? 128
        : url.includes('dw9f2h0x')
          ? 639
          : 32,
      src: url,
    }) as HTMLImageElement,
}));

describe('renderDecorators', () => {
  it('draws decorator sprites in discovered rooms only', () => {
    const discoveredDecorator = {
      position: { x: 0, y: 0 },
      sprite: { image: 'decorators/bones.png', size: 32, index: 0 },
    };
    const undiscoveredDecorator = {
      position: { x: 1, y: 0 },
      sprite: { image: 'decorators/rock.png', size: 32, index: 0 },
    };
    const state = {
      dungeon: {
        discoveredRooms: ['A'],
        layout: {
          grid: ['AB'],
          decorators: [discoveredDecorator, undiscoveredDecorator],
        },
      },
    } as GameState;
    const drawImage = vi.fn();
    const ctx = { drawImage } as unknown as CanvasRenderingContext2D;

    renderDecorators(ctx, {} as CanvasImageSource, 48, state);

    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(drawImage).toHaveBeenCalledWith(
      expect.objectContaining({ src: 'decorators/bones.png' }),
      0,
      0,
      32,
      32,
      6,
      6,
      36,
      36,
    );
  });

  it('draws atlas crops without distorting their aspect ratio', () => {
    const state = {
      dungeon: {
        discoveredRooms: ['A'],
        layout: {
          grid: ['A'],
          decorators: [
            {
              position: { x: 0, y: 0 },
              sprite: {
                image: 'decorators/supplies_objects.png',
                size: 45,
                index: 0,
                sourceRect: { x: 146, y: 10, width: 29, height: 45 },
              },
            },
          ],
        },
      },
    } as GameState;
    const drawImage = vi.fn();
    const ctx = { drawImage } as unknown as CanvasRenderingContext2D;

    renderDecorators(ctx, {} as CanvasImageSource, 48, state);

    const drawArguments = drawImage.mock.calls[0];
    expect(drawArguments?.[0]).toEqual(
      expect.objectContaining({ src: 'decorators/supplies_objects.png' }),
    );
    expect(drawArguments?.slice(1, 5)).toEqual([146, 10, 29, 45]);
    expect(drawArguments?.[5]).toBeCloseTo(12.4);
    expect(drawArguments?.[6]).toBe(6);
    expect(drawArguments?.[7]).toBeCloseTo(23.2);
    expect(drawArguments?.[8]).toBe(36);
  });

  it.each([
    [CellAlignment.TOP_LEFT, 0, 0],
    [CellAlignment.TOP_RIGHT, 12, 0],
    [CellAlignment.BOTTOM_LEFT, 0, 12],
    [CellAlignment.BOTTOM_RIGHT, 12, 12],
    [CellAlignment.CENTER, 6, 6],
    [CellAlignment.CENTER_LEFT, 0, 6],
    [CellAlignment.CENTER_RIGHT, 12, 6],
    [CellAlignment.CENTER_TOP, 6, 0],
    [CellAlignment.CENTER_BOTTOM, 6, 12],
    [CellAlignment.CEILING, 6, 6],
  ] as const)(
    'positions a decorator at %s within its cell',
    (alignment, expectedX, expectedY) => {
      const state = {
        dungeon: {
          discoveredRooms: ['A'],
          layout: {
            grid: ['A'],
            decorators: [
              {
                position: { x: 0, y: 0 },
                alignment,
                sprite: { image: 'decorators/bones.png', size: 32, index: 0 },
              },
            ],
          },
        },
      } as GameState;
      const drawImage = vi.fn();
      const ctx = { drawImage } as unknown as CanvasRenderingContext2D;

      renderDecorators(ctx, {} as CanvasImageSource, 48, state);

      expect(drawImage.mock.calls[0]?.slice(5, 7)).toEqual([
        expectedX,
        expectedY,
      ]);
    },
  );
});

describe('renderLightSprites', () => {
  it('draws the configured light tile in discovered rooms only', () => {
    const state = {
      dungeon: {
        discoveredRooms: ['A'],
        layout: {
          grid: ['AB'],
          lights: [
            {
              position: { x: 0, y: 0 },
              sprite: { x: 576, y: 96, size: 48 },
            },
            {
              position: { x: 1, y: 0 },
              sprite: { x: 576, y: 96, size: 48 },
            },
          ],
        },
      },
    } as GameState;
    const drawImage = vi.fn();
    const ctx = { drawImage } as unknown as CanvasRenderingContext2D;
    const ground = {} as CanvasImageSource;

    renderLightSprites(ctx, ground, 48, state);

    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(drawImage).toHaveBeenCalledWith(
      ground,
      576,
      96,
      48,
      48,
      0,
      0,
      48,
      48,
    );
  });

  it('draws undiscovered light tiles in debug mode', () => {
    const state = {
      dungeon: {
        discoveredRooms: ['A'],
        layout: {
          grid: ['AB'],
          lights: [
            {
              position: { x: 1, y: 0 },
              sprite: { x: 576, y: 96, size: 48 },
            },
          ],
        },
      },
    } as GameState;
    const drawImage = vi.fn();
    const ctx = { drawImage } as unknown as CanvasRenderingContext2D;

    renderLightSprites(ctx, {} as CanvasImageSource, 48, state, true);

    expect(drawImage).toHaveBeenCalledTimes(1);
  });

  it('applies the offset for the light sprite alignment', () => {
    const state = {
      dungeon: {
        discoveredRooms: ['A'],
        layout: {
          grid: ['A'],
          lights: [
            {
              position: { x: 0, y: 0 },
              alignment: CellAlignment.TOP_RIGHT,
              sprite: {
                image: 'decorators/Torch Animated.png',
                x: 0,
                y: 0,
                size: 64,
                scale: 0.75,
                alignmentOffsets: {
                  [CellAlignment.TOP_RIGHT]: { x: 4, y: -3 },
                  [CellAlignment.CENTER]: { x: 100, y: 100 },
                },
              },
            },
          ],
        },
      },
    } as GameState;
    const drawImage = vi.fn();
    const ctx = { drawImage } as unknown as CanvasRenderingContext2D;

    renderLightSprites(ctx, {} as CanvasImageSource, 48, state);

    expect(drawImage.mock.calls[0]?.slice(5)).toEqual([16, -3, 36, 36]);
  });

  it('draws the animated torch frame selected by time', () => {
    const state = {
      dungeon: {
        discoveredRooms: ['A'],
        layout: {
          grid: ['A'],
          lights: [
            {
              position: { x: 0, y: 0 },
              alignment: CellAlignment.TOP_RIGHT,
              sprite: {
                image: 'decorators/Torch Animated.png',
                x: 0,
                y: 0,
                size: 64,
                scale: 0.75,
                frameCount: 8,
                frameRate: 8,
              },
            },
          ],
        },
      },
    } as GameState;
    const drawImage = vi.fn();
    const ctx = { drawImage } as unknown as CanvasRenderingContext2D;
    const ground = {} as CanvasImageSource;

    renderLightSprites(ctx, ground, 48, state, false, 250);
    renderLightSprites(ctx, ground, 48, state, false, 625);

    expect(drawImage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ src: 'decorators/Torch Animated.png' }),
      128,
      0,
      64,
      64,
      12,
      0,
      36,
      36,
    );
    expect(drawImage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ src: 'decorators/Torch Animated.png' }),
      64,
      64,
      64,
      64,
      12,
      0,
      36,
      36,
    );
  });

  it.each([
    [CellAlignment.TOP_LEFT, 0, 0],
    [CellAlignment.TOP_RIGHT, 12, 0],
    [CellAlignment.CENTER_TOP, 6, 0],
    [CellAlignment.BOTTOM_LEFT, 0, 12],
    [CellAlignment.BOTTOM_RIGHT, 12, 12],
    [CellAlignment.CENTER_BOTTOM, 6, 12],
    [CellAlignment.CENTER_LEFT, 0, 6],
    [CellAlignment.CENTER_RIGHT, 12, 6],
    [CellAlignment.CENTER, 6, 6],
    [CellAlignment.CEILING, 6, 6],
  ])(
    'aligns light sprites to the %s cell edge',
    (alignment, expectedX, expectedY) => {
      const state = {
        dungeon: {
          discoveredRooms: ['A'],
          layout: {
            grid: ['A'],
            lights: [
              {
                position: { x: 0, y: 0 },
                alignment,
                sprite: {
                  image: 'decorators/Torch Animated.png',
                  x: 0,
                  y: 0,
                  size: 64,
                  scale: 0.75,
                },
              },
            ],
          },
        },
      } as GameState;
      const drawImage = vi.fn();
      const ctx = { drawImage } as unknown as CanvasRenderingContext2D;

      renderLightSprites(ctx, {} as CanvasImageSource, 48, state);

      expect(drawImage.mock.calls[0]?.slice(5)).toEqual([
        expectedX,
        expectedY,
        36,
        36,
      ]);
    },
  );

  it('draws the full portrait brazier sprite without distorting it', () => {
    const state = {
      dungeon: {
        discoveredRooms: ['A'],
        layout: {
          grid: ['A'],
          lights: [
            {
              position: { x: 0, y: 0 },
              sprite: {
                image:
                  'decorators/nobg-1293999211a5-1791660715455_1791660715455_dw9f2h0x.png',
                x: 0,
                y: 0,
                size: 540,
                frameWidth: 540,
                frameHeight: 639,
                scale: 0.6,
              },
            },
          ],
        },
      },
    } as GameState;
    const drawImage = vi.fn();
    const ctx = { drawImage } as unknown as CanvasRenderingContext2D;

    renderLightSprites(ctx, {} as CanvasImageSource, 48, state);

    expect(drawImage).toHaveBeenCalledWith(
      expect.objectContaining({
        src: 'decorators/nobg-1293999211a5-1791660715455_1791660715455_dw9f2h0x.png',
      }),
      0,
      0,
      540,
      639,
      expect.closeTo(11.83, 1),
      expect.closeTo(9.6, 1),
      expect.closeTo(24.34, 1),
      expect.closeTo(28.8, 1),
    );
  });
});
