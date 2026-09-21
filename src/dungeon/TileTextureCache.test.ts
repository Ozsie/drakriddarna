/* eslint-disable @typescript-eslint/unbound-method */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearTileTextureCache,
  drawCachedTile,
  getCachedTileTexture,
  getTileTextureCacheSize,
  isImageReady,
  setCanvasFactory,
} from './TileTextureCache';

describe('TileTextureCache', () => {
  beforeEach(() => {
    clearTileTextureCache();
    // Provide mock canvas factory for unit test environment
    setCanvasFactory((width, height) => {
      return {
        width,
        height,
        getContext: () => ({
          drawImage: vi.fn(),
        }),
      };
    });
  });

  it('starts with an empty cache', () => {
    expect(getTileTextureCacheSize()).toBe(0);
  });

  it('caches tile texture across multiple calls for same sprite coordinates', () => {
    const mockImage = {
      src: 'mock_spritesheet.png',
    } as unknown as CanvasImageSource;
    const tile1 = getCachedTileTexture(mockImage, 0, 0, 48, 48, 48, 48);
    const tile2 = getCachedTileTexture(mockImage, 0, 0, 48, 48, 48, 48);

    expect(tile1).toBeDefined();
    expect(tile1).toBe(tile2);
    expect(getTileTextureCacheSize()).toBe(1);
  });

  it('creates distinct cache entries for different sprite coordinates or sizes', () => {
    const mockImage = {
      src: 'mock_spritesheet.png',
    } as unknown as CanvasImageSource;
    const tileA = getCachedTileTexture(mockImage, 0, 0, 48, 48, 48, 48);
    const tileB = getCachedTileTexture(mockImage, 48, 0, 48, 48, 48, 48);
    const tileC = getCachedTileTexture(mockImage, 0, 0, 48, 48, 64, 64);

    expect(tileA).not.toBe(tileB);
    expect(tileA).not.toBe(tileC);
    expect(getTileTextureCacheSize()).toBe(3);
  });

  it('clears all cached entries when clearTileTextureCache is called', () => {
    const mockImage = {
      src: 'mock_spritesheet.png',
    } as unknown as CanvasImageSource;
    getCachedTileTexture(mockImage, 0, 0, 48, 48, 48, 48);
    getCachedTileTexture(mockImage, 48, 48, 48, 48, 48, 48);
    expect(getTileTextureCacheSize()).toBe(2);

    clearTileTextureCache();
    expect(getTileTextureCacheSize()).toBe(0);
  });

  it('drawCachedTile draws cached canvas using 3 arguments (cached, dx, dy)', () => {
    const mockImage = {
      src: 'mock_spritesheet.png',
    } as unknown as CanvasImageSource;
    const mockCtx = {
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    drawCachedTile(mockCtx, mockImage, 0, 0, 48, 48, 100, 200, 48, 48);

    expect(mockCtx.drawImage).toHaveBeenCalledTimes(1);
    const lastCall = (
      mockCtx.drawImage as unknown as { mock: { calls: unknown[][] } }
    ).mock.calls[0];
    expect(lastCall[0]).not.toBe(mockImage);
    expect(lastCall[1]).toBe(100);
    expect(lastCall[2]).toBe(200);
  });

  it('falls back gracefully to direct sprite slicing when canvas cannot be created', () => {
    setCanvasFactory(null);
    clearTileTextureCache();

    const mockImage = {
      src: 'mock_spritesheet.png',
    } as unknown as CanvasImageSource;
    const mockCtx = {
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    drawCachedTile(mockCtx, mockImage, 10, 20, 30, 40, 100, 200, 50, 60);

    expect(mockCtx.drawImage).toHaveBeenCalledWith(
      mockImage,
      10,
      20,
      30,
      40,
      100,
      200,
      50,
      60,
    );
  });

  it('does not cache textures when the image is not ready', () => {
    const unreadyImg = {
      complete: false,
      naturalWidth: 0,
      src: 'mock_unready.png',
    } as unknown as CanvasImageSource;

    expect(isImageReady(unreadyImg)).toBe(false);

    const res = getCachedTileTexture(unreadyImg, 0, 0, 48, 48, 48, 48);
    expect(res).toBe(unreadyImg);
    expect(getTileTextureCacheSize()).toBe(0);
  });

  it('recognizes completed image elements as ready', () => {
    const readyImg = {
      complete: true,
      naturalWidth: 256,
      src: 'mock_ready.png',
    } as unknown as CanvasImageSource;

    expect(isImageReady(readyImg)).toBe(true);

    const res = getCachedTileTexture(readyImg, 0, 0, 48, 48, 48, 48);
    expect(res).not.toBe(readyImg);
    expect(getTileTextureCacheSize()).toBe(1);
  });
});
