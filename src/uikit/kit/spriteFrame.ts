// Sprite frames: one image picked from a sprite sheet by zero-based index.
// Shared by the kit components that draw item art (hero-card inventories,
// radial menu buttons). The sheet arrives through the asset port; while it
// is loading the caller draws its themed fallback.

import type { AssetProvider, SpriteRef } from '../env';

/**
 * Where in the sheet the frame at `ref.index` sits: square frames laid out
 * row-major, columns derived from the sheet width divided by `ref.size`, so
 * single-row strips and rectangular grids both work. The index is clamped
 * to the last available frame.
 */
export const spriteSourceRect = (
  image: CanvasImageSource,
  ref: SpriteRef,
): { sx: number; sy: number } => {
  const dims = image as {
    naturalWidth?: number;
    naturalHeight?: number;
    width?: number;
    height?: number;
  };
  const imageWidth = dims.naturalWidth || dims.width || 0;
  const imageHeight = dims.naturalHeight || dims.height || 0;
  const frameSize = Math.max(1, ref.size);
  const columns = Math.max(1, Math.floor(imageWidth / frameSize));
  const rows = Math.max(1, Math.floor(imageHeight / frameSize));
  const clamped = Math.min(Math.max(0, ref.index), columns * rows - 1);
  return {
    sx: (clamped % columns) * frameSize,
    sy: Math.floor(clamped / columns) * frameSize,
  };
};

/**
 * Draws the sprite frame scaled to `destSize` x `destSize`. Returns false
 * while the sheet is still loading or cannot be drawn; callers should fall
 * back to their icon / themed placeholder in that case.
 */
export const drawSpriteFrame = (
  ctx: CanvasRenderingContext2D,
  assets: AssetProvider,
  ref: SpriteRef,
  dx: number,
  dy: number,
  destSize: number,
): boolean => {
  const image = assets.get(ref.assetId);
  if (!image) return false;
  const { sx, sy } = spriteSourceRect(image, ref);
  ctx.drawImage(
    image,
    sx,
    sy,
    Math.max(1, ref.size),
    Math.max(1, ref.size),
    dx,
    dy,
    destSize,
    destSize,
  );
  return true;
};
