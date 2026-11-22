import { assetUrl } from '#lib/assets.js';
import type { Decorator, ItemSprite, LightSource, LightSprite } from '../types';
import {
  parseIsometricGraphicsManifest,
  resolveIsometricGraphics,
  type IsometricGraphicsManifest,
  type ResolvedIsometricGraphics,
} from '../dungeon/IsometricGraphics';

export type SpritePreviewFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SpritePreview = {
  imageUrl: string;
  frame:
    | { kind: 'full' }
    | { kind: 'rect'; rect: SpritePreviewFrame }
    | {
        kind: 'item';
        index: number;
        size: number;
        sourceRect?: SpritePreviewFrame;
      };
};

export type PlacementSpritePreviews = {
  topDown: SpritePreview | null;
  isometric: SpritePreview | null;
};

const resolveStaticAsset = (path: string): string =>
  assetUrl(path.replace(/^\/+/, ''));

const itemSpritePreview = (
  sprite: ItemSprite | undefined,
  toAssetUrl: (path: string) => string,
): SpritePreview | null =>
  sprite
    ? {
        imageUrl: toAssetUrl(sprite.image),
        frame: {
          kind: 'item',
          index: sprite.index,
          size: sprite.size,
          ...(sprite.sourceRect ? { sourceRect: sprite.sourceRect } : {}),
        },
      }
    : null;

const lightSpritePreview = (
  sprite: LightSprite | undefined,
  fallbackImage: string,
  toAssetUrl: (path: string) => string,
): SpritePreview | null =>
  sprite
    ? {
        imageUrl: sprite.image ? toAssetUrl(sprite.image) : fallbackImage,
        frame: {
          kind: 'rect',
          rect: {
            x: sprite.x,
            y: sprite.y,
            width: sprite.frameWidth ?? sprite.size,
            height: sprite.frameHeight ?? sprite.size,
          },
        },
      }
    : null;

export const getDecoratorSpritePreviews = (
  decorator: Decorator,
  toAssetUrl = resolveStaticAsset,
): PlacementSpritePreviews => ({
  topDown: itemSpritePreview(
    decorator.sprites?.topDown ?? decorator.sprite,
    toAssetUrl,
  ),
  isometric: itemSpritePreview(
    decorator.sprites?.isometric ??
      decorator.sprites?.topDown ??
      decorator.sprite,
    toAssetUrl,
  ),
});

export const getLightSpritePreviews = (
  light: LightSource,
  graphics: ResolvedIsometricGraphics | null | undefined,
  fallbackImage: string,
  toAssetUrl = resolveStaticAsset,
): PlacementSpritePreviews => {
  const isometricSprite = light.sprites?.isometric;
  let isometric: SpritePreview | null;

  if (isometricSprite && 'tileId' in isometricSprite) {
    const tile = graphics?.tiles[isometricSprite.tileId];
    isometric = tile
      ? {
          imageUrl: toAssetUrl(tile.imageUrl),
          frame: { kind: 'full' },
        }
      : lightSpritePreview(
          light.sprite ?? light.sprites?.topDown,
          fallbackImage,
          toAssetUrl,
        );
  } else {
    isometric = lightSpritePreview(
      isometricSprite ?? light.sprite,
      fallbackImage,
      toAssetUrl,
    );
  }

  return {
    topDown: lightSpritePreview(
      light.sprites?.topDown ?? light.sprite,
      fallbackImage,
      toAssetUrl,
    ),
    isometric,
  };
};

const isValidFrame = (
  frame: SpritePreviewFrame,
  imageWidth: number,
  imageHeight: number,
): boolean =>
  Number.isFinite(frame.x) &&
  Number.isFinite(frame.y) &&
  Number.isFinite(frame.width) &&
  Number.isFinite(frame.height) &&
  frame.x >= 0 &&
  frame.y >= 0 &&
  frame.width > 0 &&
  frame.height > 0 &&
  frame.x + frame.width <= imageWidth &&
  frame.y + frame.height <= imageHeight;

export const resolveSpritePreviewFrame = (
  sprite: SpritePreview,
  imageWidth: number,
  imageHeight: number,
): SpritePreviewFrame | null => {
  if (imageWidth <= 0 || imageHeight <= 0) return null;
  if (sprite.frame.kind === 'full') {
    return { x: 0, y: 0, width: imageWidth, height: imageHeight };
  }
  if (sprite.frame.kind === 'rect') {
    return isValidFrame(sprite.frame.rect, imageWidth, imageHeight)
      ? sprite.frame.rect
      : null;
  }

  if (sprite.frame.sourceRect) {
    return isValidFrame(sprite.frame.sourceRect, imageWidth, imageHeight)
      ? sprite.frame.sourceRect
      : null;
  }

  const { index, size } = sprite.frame;
  const columns = Math.floor(imageWidth / size);
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    !Number.isFinite(size) ||
    size <= 0 ||
    columns <= 0
  ) {
    return null;
  }

  const frame = {
    x: (index % columns) * size,
    y: Math.floor(index / columns) * size,
    width: size,
    height: size,
  };
  return isValidFrame(frame, imageWidth, imageHeight) ? frame : null;
};

const isSafeRelativePath = (path: string): boolean =>
  path.length > 0 &&
  !path.startsWith('/') &&
  !path.includes('\\') &&
  !path.includes(':') &&
  path
    .split('/')
    .every((part) => part.length > 0 && part !== '.' && part !== '..');

const loadManifest = async (
  root: string,
  fetcher: typeof fetch,
): Promise<IsometricGraphicsManifest | null> => {
  try {
    const response = await fetcher(assetUrl(`${root}/index.json`));
    return response.ok
      ? parseIsometricGraphicsManifest(await response.json())
      : null;
  } catch {
    return null;
  }
};

export const loadPlacementPreviewGraphics = async (
  campaignId: string | undefined,
  campaignFolder: string | undefined,
  fetcher: typeof fetch = fetch,
): Promise<ResolvedIsometricGraphics | null> => {
  const fallback = await loadManifest('isometric', fetcher);
  if (!fallback) return null;

  const campaignRoot =
    campaignId &&
    isSafeRelativePath(campaignId) &&
    campaignFolder &&
    isSafeRelativePath(campaignFolder)
      ? `campaigns/${campaignId}/${campaignFolder}`
      : undefined;
  const override = campaignRoot
    ? await loadManifest(campaignRoot, fetcher)
    : null;

  return resolveIsometricGraphics(
    fallback,
    'isometric',
    override,
    campaignRoot,
  );
};
