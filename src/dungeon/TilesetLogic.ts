import type { Campaign, Dungeon } from '../types';

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
