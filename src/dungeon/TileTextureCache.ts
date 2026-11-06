// Facade over the @hoard-engine/scene tile texture cache: the
// off-screen canvas caching of sprite sub-rectangles is package
// machinery; the historical import path stays for the game's callers.
export {
  clearTileTextureCache,
  drawCachedTile,
  getCachedTileTexture,
  getTileTextureCacheSize,
  isImageReady,
  setCanvasFactory,
} from '@hoard-engine/scene';
