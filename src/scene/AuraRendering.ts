import {
  auraSpriteSheet,
  getCachedAura,
  type AuraMode,
  type BakedAura,
} from './aura';

const sheets = new WeakMap<BakedAura, HTMLCanvasElement>();

/**
 * Draw an aura centered at (x, y), with the requested ground footprint width
 * and height in destination canvas units. In isometric mode the generator's
 * 64x32 footprint occupies the middle of its 64x64 image, so the whole image
 * is drawn at twice the footprint height to preserve its surrounding bloom.
 * `timeSeconds` wraps around the baked loop. The generator defaults to 48
 * frames over 6 seconds (8 fps), sampled at the start of each frame.
 *
 * Baked frames and their sprite sheet are cached per seed and mode. The sheet
 * is created lazily on first draw, using the browser's document and ImageData.
 * Throws if a sheet 2D context cannot be created.
 */
export function drawAura(
  context: CanvasRenderingContext2D,
  seed: string,
  mode: AuraMode,
  x: number,
  y: number,
  width: number,
  height: number,
  timeSeconds: number,
): void {
  const baked = getCachedAura(seed, { mode });
  let sheet = sheets.get(baked);
  if (!sheet) {
    sheet = auraSpriteSheet(baked);
    sheets.set(baked, sheet);
  }

  const index = Math.floor(
    timeSeconds / (baked.loopSeconds / baked.frameCount),
  );
  const frame =
    ((index % baked.frameCount) + baked.frameCount) % baked.frameCount;
  const imageHeight = mode === 'isometric' ? height * 2 : height;
  context.drawImage(
    sheet,
    frame * baked.size,
    0,
    baked.size,
    baked.size,
    x - width / 2,
    y - imageHeight / 2,
    width,
    imageHeight,
  );
}
