import type { Campaign, Dungeon } from '../types';

// The tile size, in pixels, of a tileset image's grid: the width and height
// of a single tile slot. Defaults to the built-in tileset's 48x48 grid;
// tilesets with another tile size pass their own value to the renderers.
export const DEFAULT_TILESET_TILE_SIZE = 48;

/**
 * Resolves the tileset image to use when rendering a dungeon. A dungeon-level
 * tileset overrides the campaign-level default, and the provided fallback
 * (the built-in tileset) is used when neither defines one.
 */
export const resolveTileset = (
  dungeon: Dungeon | undefined,
  campaign: Campaign | undefined,
  fallbackTileset: string,
): string => dungeon?.tileset ?? campaign?.tileset ?? fallbackTileset;
