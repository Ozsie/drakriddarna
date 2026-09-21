/**
 * TileTextureCache provides an off-screen canvas cache for sprite sub-rectangles / tile textures.
 * This avoids looking up sprite offsets, cutting sub-rectangles, and scaling sprites on each frame.
 */

type CachedTexture = HTMLCanvasElement | OffscreenCanvas | CanvasImageSource;

export type CanvasFactory = (
  width: number,
  height: number,
) => {
  width: number;
  height: number;
  getContext: (
    type: string,
  ) => { drawImage: (...args: unknown[]) => void } | null;
} | null;

let customCanvasFactory: CanvasFactory | null = null;

export const setCanvasFactory = (factory: CanvasFactory | null) => {
  customCanvasFactory = factory;
};

const textureCache = new Map<string, CachedTexture>();

export const isImageReady = (source: CanvasImageSource): boolean => {
  if (
    typeof HTMLImageElement !== 'undefined' &&
    source instanceof HTMLImageElement
  ) {
    return source.complete && source.naturalWidth > 0;
  }
  if (
    source &&
    typeof source === 'object' &&
    'complete' in source &&
    'naturalWidth' in source
  ) {
    const img = source as { complete?: boolean; naturalWidth?: number };
    if (
      typeof img.complete === 'boolean' &&
      typeof img.naturalWidth === 'number'
    ) {
      return img.complete && img.naturalWidth > 0;
    }
  }
  return true;
};

const getSourceIdentifier = (source: CanvasImageSource): string => {
  if ('src' in source && typeof (source as HTMLImageElement).src === 'string') {
    return (source as HTMLImageElement).src;
  }
  return 'source_img';
};

/**
 * Retrieves a cached off-screen tile canvas for the given source and sprite rectangle.
 * If not already cached, extracts and pre-scales the sub-tile onto an offscreen canvas.
 */
export const getCachedTileTexture = (
  source: CanvasImageSource,
  sx: number,
  sy: number,
  sWidth: number,
  sHeight: number,
  targetWidth: number = sWidth,
  targetHeight: number = sHeight,
): CachedTexture => {
  if (!isImageReady(source)) {
    return source;
  }

  const sourceId = getSourceIdentifier(source);
  const key = `${sourceId}:${sx}:${sy}:${sWidth}:${sHeight}:${targetWidth}:${targetHeight}`;

  const cached = textureCache.get(key);
  if (cached) {
    return cached;
  }

  // If custom factory is provided, use it
  if (customCanvasFactory) {
    try {
      const offscreen = customCanvasFactory(targetWidth, targetHeight);
      if (offscreen) {
        const ctx = offscreen.getContext('2d');
        if (ctx) {
          ctx.drawImage(
            source,
            sx,
            sy,
            sWidth,
            sHeight,
            0,
            0,
            targetWidth,
            targetHeight,
          );
          textureCache.set(key, offscreen as unknown as CachedTexture);
          return offscreen as unknown as CachedTexture;
        }
      }
    } catch {
      // Fallback
    }
  }

  // If we have document or OffscreenCanvas support, create pre-rendered tile canvas
  try {
    let offscreenCanvas: HTMLCanvasElement | OffscreenCanvas | null = null;
    let offscreenCtx:
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D
      | null = null;

    if (
      typeof document !== 'undefined' &&
      typeof document.createElement === 'function'
    ) {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      offscreenCanvas = canvas;
      offscreenCtx = canvas.getContext('2d');
    } else if (typeof OffscreenCanvas !== 'undefined') {
      offscreenCanvas = new OffscreenCanvas(targetWidth, targetHeight);
      offscreenCtx = offscreenCanvas.getContext('2d');
    }

    if (offscreenCanvas && offscreenCtx) {
      offscreenCtx.drawImage(
        source,
        sx,
        sy,
        sWidth,
        sHeight,
        0,
        0,
        targetWidth,
        targetHeight,
      );
      textureCache.set(key, offscreenCanvas);
      return offscreenCanvas;
    }
  } catch {
    // Fallback if canvas context cannot be created
  }

  return source;
};

/**
 * Draws a tile using the cached tile texture when available, avoiding per-frame sprite slicing.
 */
export const drawCachedTile = (
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sx: number,
  sy: number,
  sWidth: number,
  sHeight: number,
  dx: number,
  dy: number,
  dWidth: number = sWidth,
  dHeight: number = sHeight,
): void => {
  const cached = getCachedTileTexture(
    source,
    sx,
    sy,
    sWidth,
    sHeight,
    dWidth,
    dHeight,
  );
  if (cached && cached !== source) {
    ctx.drawImage(cached, dx, dy);
  } else {
    ctx.drawImage(source, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
  }
};

/**
 * Clears the tile texture cache.
 */
export const clearTileTextureCache = (): void => {
  textureCache.clear();
};

/**
 * Returns the current number of cached tile textures.
 */
export const getTileTextureCacheSize = (): number => textureCache.size;
