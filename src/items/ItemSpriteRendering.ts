import type { ItemSprite } from '../types';
import { drawCachedTile } from '../dungeon/TileTextureCache';
import { getReadyImage } from '../core/ImageCache';

export interface SpriteSourceRect {
  sx: number;
  sy: number;
}

// Where in the sheet the sprite at `index` sits: square frames laid out
// row-major, columns derived from the sheet width divided by `size`, so both
// single-row strips and rectangular grids work. The index is clamped to the
// last available frame.
export const getItemSpriteSourceRect = (
  sprite: ItemSprite,
  imageWidth: number,
  imageHeight: number,
): SpriteSourceRect => {
  const size = Math.max(1, sprite.size);
  const columns = Math.max(1, Math.floor(imageWidth / size));
  const rows = Math.max(1, Math.floor(imageHeight / size));
  const index = Math.min(Math.max(0, sprite.index), columns * rows - 1);
  return {
    sx: (index % columns) * size,
    sy: Math.floor(index / columns) * size,
  };
};

/**
 * Draws the item's sprite scaled to `destSize` x `destSize`. Returns false
 * while the sheet is still loading or cannot be drawn; callers should fall
 * back to the item icon / tileset rendering in that case.
 */
export const drawItemSprite = (
  ctx: CanvasRenderingContext2D,
  sprite: ItemSprite,
  dx: number,
  dy: number,
  destSize: number,
): boolean => {
  const image = getReadyImage(sprite.image);
  if (!image) return false;
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const { sx, sy } = getItemSpriteSourceRect(sprite, width, height);
  drawCachedTile(
    ctx,
    image,
    sx,
    sy,
    Math.max(1, sprite.size),
    Math.max(1, sprite.size),
    dx,
    dy,
    destSize,
    destSize,
  );
  return true;
};
