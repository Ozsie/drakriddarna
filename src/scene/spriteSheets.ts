// Sprite-sheet source-rect math for the scene layer: square frames laid
// out row-major, columns derived from the sheet width divided by the
// frame size, so both single-row strips and rectangular grids work. Pure
// computation over a two-field descriptor — this is @hoard-engine/scene
// material (docs/engine-packages.md, step 9), with no game types.

export type SheetSprite = {
  index: number;
  size: number;
};

export type SpriteSourceRect = {
  sx: number;
  sy: number;
};

// Where in the sheet the sprite at `index` sits. The index is clamped to
// the last available frame and negative indexes read as the first frame.
export const getSpriteSourceRect = (
  sprite: SheetSprite,
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
