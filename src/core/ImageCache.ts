// Shared cache of images loaded by URL, used by actor sprite sheets, item
// sprite sheets and any other per-URL image asset. Images are loaded on
// demand the first time they are requested and reused afterwards.
import { isImageReady } from '../dungeon/TileTextureCache';

const cachedImages = new Map<string, HTMLImageElement>();

export const getCachedImage = (url: string): HTMLImageElement | null => {
  if (typeof Image === 'undefined') {
    return null;
  }
  let image = cachedImages.get(url);
  if (!image) {
    image = new Image();
    image.src = url;
    cachedImages.set(url, image);
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
