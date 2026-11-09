import { describe, expect, it, vi } from 'vitest';
import { renderDecorators } from '../items/ItemRendering';
import { CellAlignment, type GameState } from '../types';

vi.mock('../core/ImageCache', () => ({
  getReadyImage: (url: string): HTMLImageElement =>
    ({
      naturalWidth: 32,
      naturalHeight: 32,
      width: 32,
      height: 32,
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
