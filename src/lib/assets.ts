import { asset } from '$app/paths';
import type { AssetPath } from '$app/types';

// Single point of contact with SvelteKit's `asset`: it only accepts the
// generated `AssetPath` literal union, but dynamic paths (campaign graphics
// roots, query-param tilesets, sprite references from content) arrive as
// plain strings. The string → AssetPath assertion lives here, once, so
// call sites pass a string and stay lint-clean.

/**
 * Resolves a path inside the static assets directory (relative to the
 * deployment base path) to its URL.
 */
export const assetUrl = (path: string): string => asset(path as AssetPath);
