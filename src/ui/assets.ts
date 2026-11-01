// The asset port (M3): the only place under src/ui that knows how UI
// images are addressed. Renderers reference images by AssetId; this module
// owns the URL construction (and, in M5, the $lib sprite imports).

import { base } from '$app/paths';
import { getReadyImage } from '../core/ImageCache';
import type { AssetProvider } from '../uikit/env';

export const AssetId = {
  /** The welcome screen background art. */
  welcomeBackground: 'welcomeBackground',
} as const;

export type AssetId = (typeof AssetId)[keyof typeof AssetId];

const ASSET_URLS: Record<AssetId, string> = {
  [AssetId.welcomeBackground]: `${base}/images/welcome.png`,
};

/** Resolves an asset id to its URL, for the shared image cache. */
export const getAssetUrl = (id: AssetId): string => ASSET_URLS[id];

/**
 * The UI asset port: resolves loaded images by id, undefined until the
 * cache has them (components draw their themed fallbacks meanwhile).
 */
export const uiAssetProvider: AssetProvider = {
  get: (id) => {
    const url = ASSET_URLS[id as AssetId];
    return url ? getReadyImage(url) ?? undefined : undefined;
  },
};
