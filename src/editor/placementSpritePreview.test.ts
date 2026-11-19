import { asset } from '$app/paths';
import type { AssetPath } from '$app/types';
import { describe, expect, it } from 'vitest';
import { CellAlignment } from '../types';
import type { ResolvedIsometricGraphics } from '../dungeon/IsometricGraphics';
import { parseDecorator, parseLight } from '../dungeon/dungeonParser';
import {
  createDungeonEditorState,
  DECORATOR_OPTIONS,
  decoratorOptionNames,
  LIGHT_PRESETS,
  placeDecorator,
  placeLight,
  type LightPresetName,
} from './dungeonEditor';
import {
  getDecoratorSpritePreviews,
  getLightSpritePreviews,
  loadPlacementPreviewGraphics,
  resolveSpritePreviewFrame,
} from './placementSpritePreview';

const resolveAsset = (path: string) => `/assets/${path}`;

const graphics: ResolvedIsometricGraphics = {
  cells: {},
  wallShapes: {},
  tiles: {
    customTorch: {
      imageUrl: 'campaigns/sample/graphics/torch.png',
      scale: 1,
      anchor: { x: 0.5, y: 1 },
    },
  },
};

describe('editor placement sprite previews', () => {
  it('resolves default sprite assets through the SvelteKit asset path', () => {
    const previews = getDecoratorSpritePreviews({
      position: { x: 0, y: 0 },
      sprite: { image: '/decorators/Objects.png', size: 32, index: 0 },
    });

    expect(previews.topDown?.imageUrl).toBe(asset('decorators/Objects.png'));
  });

  it('uses the decorator projection sprites and supports top-down isometric fallback', () => {
    const decorator = {
      position: { x: 2, y: 3 },
      alignment: CellAlignment.CENTER,
      sprite: { image: 'legacy.png', size: 32, index: 0 },
      sprites: {
        topDown: { image: 'top.png', size: 16, index: 1 },
        isometric: {
          image: 'iso.png',
          size: 256,
          index: 0,
          sourceRect: { x: 10, y: 20, width: 30, height: 40 },
        },
      },
    };

    const previews = getDecoratorSpritePreviews(decorator, resolveAsset);

    expect(previews.topDown?.imageUrl).toBe('/assets/top.png');
    expect(previews.isometric?.imageUrl).toBe('/assets/iso.png');
    expect(
      previews.isometric &&
        resolveSpritePreviewFrame(previews.isometric, 256, 512),
    ).toEqual({ x: 10, y: 20, width: 30, height: 40 });

    const fallback = getDecoratorSpritePreviews(
      { position: { x: 0, y: 0 }, sprite: decorator.sprite },
      resolveAsset,
    );
    expect(fallback.topDown?.imageUrl).toBe('/assets/legacy.png');
    expect(fallback.isometric?.imageUrl).toBe('/assets/legacy.png');
  });

  it('resolves row-major item sprite indices from loaded image dimensions', () => {
    const previews = getDecoratorSpritePreviews(
      {
        position: { x: 0, y: 0 },
        sprite: { image: 'items.png', size: 32, index: 5 },
      },
      resolveAsset,
    );

    expect(
      previews.topDown && resolveSpritePreviewFrame(previews.topDown, 96, 64),
    ).toEqual({ x: 64, y: 32, width: 32, height: 32 });
    expect(
      previews.topDown && resolveSpritePreviewFrame(previews.topDown, 96, 32),
    ).toBeNull();
  });

  it('uses the first rectangular light frame and the default tilesheet when needed', () => {
    const previews = getLightSpritePreviews(
      {
        position: { x: 1, y: 1 },
        sprite: {
          image: 'torch.png',
          x: 64,
          y: 32,
          size: 32,
          frameWidth: 48,
          frameHeight: 24,
          frameCount: 6,
        },
      },
      graphics,
      '/assets/DungeonTiles.png',
      resolveAsset,
    );

    expect(
      previews.topDown && resolveSpritePreviewFrame(previews.topDown, 256, 128),
    ).toEqual({ x: 64, y: 32, width: 48, height: 24 });

    const defaultSheet = getLightSpritePreviews(
      {
        position: { x: 1, y: 1 },
        sprite: { x: 96, y: 48, size: 48 },
      },
      graphics,
      '/assets/DungeonTiles.png',
      resolveAsset,
    );
    expect(defaultSheet.topDown?.imageUrl).toBe('/assets/DungeonTiles.png');
  });

  it('prefers isometric light tiles and falls back to the legacy sprite when unresolved', () => {
    const light = {
      position: { x: 1, y: 1 },
      sprite: { image: 'legacy.png', x: 0, y: 0, size: 32 },
      sprites: {
        topDown: { image: 'top.png', x: 0, y: 0, size: 32 },
        isometric: { tileId: 'customTorch' },
      },
    };

    const resolved = getLightSpritePreviews(
      light,
      graphics,
      '/assets/DungeonTiles.png',
      resolveAsset,
    );
    expect(resolved.topDown?.imageUrl).toBe('/assets/top.png');
    expect(resolved.isometric?.imageUrl).toBe(
      '/assets/campaigns/sample/graphics/torch.png',
    );
    expect(
      resolved.isometric &&
        resolveSpritePreviewFrame(resolved.isometric, 256, 512),
    ).toEqual({ x: 0, y: 0, width: 256, height: 512 });

    const unresolved = getLightSpritePreviews(
      light,
      null,
      '/assets/DungeonTiles.png',
      resolveAsset,
    );
    expect(unresolved.isometric?.imageUrl).toBe('/assets/legacy.png');
  });

  it('leaves sprite-less lights and invalid crops blank', () => {
    const spriteLess = getLightSpritePreviews(
      { position: { x: 0, y: 0 } },
      graphics,
      '/assets/DungeonTiles.png',
      resolveAsset,
    );
    expect(spriteLess).toEqual({ topDown: null, isometric: null });

    const invalid = getDecoratorSpritePreviews(
      {
        position: { x: 0, y: 0 },
        sprite: { image: 'small.png', size: 16, index: 0 },
      },
      resolveAsset,
    );
    expect(
      invalid.topDown && resolveSpritePreviewFrame(invalid.topDown, 8, 8),
    ).toBeNull();
  });

  it('matches selected light and decorator previews to editor placements', () => {
    const state = createDungeonEditorState('sample', {
      name: 'preview.dungeon',
      layout: { grid: ['A'] },
    });

    for (const preset of Object.keys(LIGHT_PRESETS) as LightPresetName[]) {
      const selected = parseLight({
        ...LIGHT_PRESETS[preset],
        x: 0,
        y: 0,
        alignment: CellAlignment.CENTER,
      });
      const placed = placeLight(
        state,
        preset,
        { x: 0, y: 0 },
        CellAlignment.CENTER,
      ).lights[0];

      if (!placed) throw new Error(`Light preset ${preset} was not placed`);
      expect(
        getLightSpritePreviews(
          selected,
          graphics,
          '/assets/DungeonTiles.png',
          resolveAsset,
        ),
      ).toEqual(
        getLightSpritePreviews(
          placed,
          graphics,
          '/assets/DungeonTiles.png',
          resolveAsset,
        ),
      );
    }

    for (const option of decoratorOptionNames) {
      const selected = parseDecorator({
        ...DECORATOR_OPTIONS[option],
        position: { x: 0, y: 0 },
        alignment: CellAlignment.CENTER,
      });
      const placed = placeDecorator(
        state,
        option,
        { x: 0, y: 0 },
        CellAlignment.CENTER,
      ).decorators[0];

      if (!placed) throw new Error(`Decorator option ${option} was not placed`);
      expect(getDecoratorSpritePreviews(selected, resolveAsset)).toEqual(
        getDecoratorSpritePreviews(placed, resolveAsset),
      );
    }

    const spriteLessLight = parseLight({
      ...LIGHT_PRESETS.chandelier,
      x: 0,
      y: 0,
      alignment: CellAlignment.CENTER,
    });
    expect(
      getLightSpritePreviews(
        spriteLessLight,
        graphics,
        '/assets/DungeonTiles.png',
        resolveAsset,
      ),
    ).toEqual({ topDown: null, isometric: null });

    const isometricOnlyOption = decoratorOptionNames.find((option) => {
      const definition = DECORATOR_OPTIONS[option];
      return (
        !definition.sprite &&
        !definition.sprites?.topDown &&
        !!definition.sprites?.isometric
      );
    });
    if (!isometricOnlyOption) {
      throw new Error('No isometric-only decorator option is available');
    }
    const isometricOnly = parseDecorator({
      ...DECORATOR_OPTIONS[isometricOnlyOption],
      position: { x: 0, y: 0 },
    });
    expect(isometricOnly.sprites?.isometric).toBeDefined();
    expect(
      getDecoratorSpritePreviews(isometricOnly, resolveAsset).isometric,
    ).not.toBeNull();
  });

  it('loads shared and campaign graphics manifests and tolerates a missing manifest', async () => {
    const requestedUrls: string[] = [];
    const fetcher: typeof fetch = (input) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      requestedUrls.push(url);
      const isCampaign = url.endsWith('campaigns/sample/graphics/index.json');
      return Promise.resolve(
        new Response(
          JSON.stringify(
            isCampaign
              ? {
                  version: 1,
                  cells: {},
                  tiles: { campaignLight: { image: 'lights/torch.png' } },
                }
              : {
                  version: 1,
                  cells: {},
                  tiles: { sharedFloor: { image: 'floors/stone.png' } },
                },
          ),
        ),
      );
    };

    const loaded = await loadPlacementPreviewGraphics(
      'sample',
      'graphics',
      fetcher,
    );

    expect(requestedUrls).toHaveLength(2);
    expect(requestedUrls).toEqual([
      asset('isometric/index.json'),
      asset('campaigns/sample/graphics/index.json' as AssetPath),
    ]);
    expect(loaded?.tiles.sharedFloor?.imageUrl).toBe(
      'isometric/floors/stone.png',
    );
    expect(loaded?.tiles.campaignLight?.imageUrl).toBe(
      'campaigns/sample/graphics/lights/torch.png',
    );

    const missing = await loadPlacementPreviewGraphics(
      undefined,
      undefined,
      () => Promise.resolve(new Response('', { status: 404 })),
    );
    expect(missing).toBeNull();
  });
});
