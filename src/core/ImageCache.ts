// Shared cache of images loaded by URL, used by actor sprite sheets, item
// sprite sheets and any other per-URL image asset. Images are loaded on
// demand the first time they are requested and reused afterwards.
import { isImageReady } from '@hoard-engine/scene';

const cachedImages = new Map<string, HTMLImageElement>();

// Resolves content-relative asset paths ('characters/knight/Idle.png')
// against the deployment's base path. Wired by the UI asset port
// (src/ui/assets.ts) because core stays framework-agnostic; unset means
// relative URLs resolve against the page URL (the pre-port behaviour).
let relativeUrlResolver: ((url: string) => string) | null = null;

export const setImageUrlResolver = (
  resolver: ((url: string) => string) | null,
): void => {
  relativeUrlResolver = resolver;
};

// Notified once per image when its load completes. The board wires this
// (see DungeonBoardController): lazily loaded sheets first referenced by
// a cached-layer draw would otherwise keep that layer's fallback art
// until the next state change. Unset means no consumer cares (headless
// tests, benchmarks).
let imageLoadedListener: ((url: string) => void) | null = null;

export const setImageLoadedListener = (
  listener: ((url: string) => void) | null,
): void => {
  imageLoadedListener = listener;
};

// Only bare relative paths go through the resolver; rooted paths,
// protocol URLs and data URLs pass through unchanged.
const resolveUrl = (url: string): string => {
  if (!url || url.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(url)) {
    return url;
  }
  return relativeUrlResolver ? relativeUrlResolver(url) : url;
};

export const getCachedImage = (url: string): HTMLImageElement | null => {
  if (typeof Image === 'undefined') {
    return null;
  }
  const resolved = resolveUrl(url);
  let image = cachedImages.get(resolved);
  if (!image) {
    image = new Image();
    // The load notification fires once per cached image; images are
    // reused afterwards, so the listener never re-fires for the same
    // URL while the cache entry lives.
    image.addEventListener('load', () => imageLoadedListener?.(resolved));
    image.src = resolved;
    cachedImages.set(resolved, image);
  }
  return image;
};

// The image once it has finished loading, or null while it is still loading
// (callers fall back to their default rendering meanwhile).
export const getReadyImage = (url: string): HTMLImageElement | null => {
  const image = getCachedImage(url);
  if (!image || !isImageReady(image)) return null;
  return image;
};

// The opaque bounding box of an image, in natural pixels: the part of the
// image that actually paints, ignoring transparent headroom. Read once per
// image and cached; null when the pixels cannot be read (headless
// environments, unreadable canvases) — callers then fall back to the full
// image rect.
export type ImagePaintedBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

const paintedBoundsCache = new WeakMap<
  HTMLImageElement,
  ImagePaintedBounds | null
>();

const readPaintedBounds = (
  image: HTMLImageElement,
): ImagePaintedBounds | null => {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (width <= 0 || height <= 0 || typeof document === 'undefined') {
    return null;
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0);
  let pixels: Uint8ClampedArray;
  try {
    pixels = ctx.getImageData(0, 0, width, height).data;
  } catch {
    return null;
  }
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] > 0) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  if (right < 0) return null;
  return { left, top, right, bottom };
};

export const getImagePaintedBounds = (
  image: HTMLImageElement,
): ImagePaintedBounds | null => {
  const cached = paintedBoundsCache.get(image);
  if (cached !== undefined) return cached;
  const bounds = readPaintedBounds(image);
  paintedBoundsCache.set(image, bounds);
  return bounds;
};
