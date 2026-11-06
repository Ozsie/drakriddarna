// The asset port (M3): the only place under src/ui that knows how UI
// images are addressed. Renderers reference images by AssetId; this module
// owns the URL construction (and, in M5, the $lib sprite imports).

import { asset } from '$app/paths';
import type { AssetPath } from '$app/types';
import { getReadyImage } from '../core/ImageCache';
import type { AssetProvider } from '@hoard-engine/uikit';

export const AssetId = {
  /** The welcome screen background art. */
  welcomeBackground: 'welcomeBackground',
};

export type AssetId = (typeof AssetId)[keyof typeof AssetId];

const ASSET_URLS: Record<AssetId, string> = {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  [AssetId.welcomeBackground]: asset('images/welcome.png' as AssetPath),
};

/** Resolves an asset id to its URL, for the shared image cache. */
export const getAssetUrl = (id: AssetId): string => ASSET_URLS[id];

/**
 * The UI asset port: resolves loaded images by id, undefined until the
 * cache has them (components draw their themed fallbacks meanwhile).
 * Registry ids resolve through the table above; ids that are not in the
 * registry are the image URL itself — the item sprite sheets referenced
 * by item content arrive that way, so the id-to-image mapping stays here
 * and no renderer knows a URL.
 */
export const uiAssetProvider: AssetProvider = {
  get: (id) => {
    const url = ASSET_URLS[id] ?? id;
    return getReadyImage(url) ?? undefined;
  },
};
