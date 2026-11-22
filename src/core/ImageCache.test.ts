import { afterEach, describe, expect, it, vi } from 'vitest';
import { getImagePaintedBounds } from './ImageCache';

const fakeImage = (width: number, height: number): HTMLImageElement =>
  ({ naturalWidth: width, naturalHeight: height }) as HTMLImageElement;

const stubCanvasPixels = (pixels: Uint8ClampedArray): void => {
  vi.stubGlobal('document', {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({
        drawImage: () => {},
        getImageData: () => ({ data: pixels }),
      }),
    }),
  });
};

describe('getImagePaintedBounds', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns null when no DOM canvas is available (headless)', () => {
    expect(getImagePaintedBounds(fakeImage(4, 4))).toBeNull();
    expect(getImagePaintedBounds(fakeImage(0, 4))).toBeNull();
  });

  it('scans the alpha channel for the opaque bounding box and caches it', () => {
    const pixels = new Uint8ClampedArray(4 * 4 * 4);
    for (const [x, y] of [
      [1, 1],
      [2, 1],
      [1, 2],
      [2, 2],
    ]) {
      pixels[(y * 4 + x) * 4 + 3] = 255;
    }
    stubCanvasPixels(pixels);
    const image = fakeImage(4, 4);
    expect(getImagePaintedBounds(image)).toEqual({
      left: 1,
      top: 1,
      right: 2,
      bottom: 2,
    });
    // Cached: the second call does not touch the DOM again.
    vi.unstubAllGlobals();
    expect(getImagePaintedBounds(image)).toEqual({
      left: 1,
      top: 1,
      right: 2,
      bottom: 2,
    });
  });

  it('returns null for a fully transparent image', () => {
    stubCanvasPixels(new Uint8ClampedArray(4 * 4 * 4));
    expect(getImagePaintedBounds(fakeImage(4, 4))).toBeNull();
  });
});
