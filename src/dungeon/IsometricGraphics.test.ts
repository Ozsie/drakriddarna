import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  resolveIsometricCellTileId,
  resolveIsometricDoorTileId,
  resolveIsometricGraphics,
  resolveIsometricPillarTileId,
  resolveIsometricWallTileIds,
  parseIsometricGraphicsManifest,
  type IsometricGraphicsManifest,
} from './IsometricGraphics';
import { CornerType } from '../types';

describe('isometric graphics indexes', () => {
  const fallback: IsometricGraphicsManifest = {
    version: 1,
    cells: {
      floor: 'stoneFloor',
      wall: 'stoneWall',
      door: 'stoneDoor',
      doorClosed_E: 'stoneDoorClosed_E',
      doorOpen_E: 'stoneDoorOpen_E',
    },
    tiles: {
      stoneFloor: { image: 'floors/stone_E.png' },
      stoneWall: { image: 'walls/stoneWall_E.png' },
      stoneDoor: { image: 'doors/stoneWallDoorClosed_E.png' },
      stoneDoorClosed_E: { image: 'doors/stoneWallDoorClosed_E.png' },
      stoneDoorOpen_E: { image: 'doors/stoneWallDoorOpen_E.png' },
    },
  };

  it('merges campaign tiles and cell mappings over the shared index', () => {
    const campaign: IsometricGraphicsManifest = {
      version: 1,
      cells: { floor: 'iceFloor', A: 'roomFloor' },
      tiles: {
        iceFloor: { image: 'floors/ice.png' },
        roomFloor: { image: 'floors/room.png' },
      },
    };

    const graphics = resolveIsometricGraphics(
      fallback,
      'isometric',
      campaign,
      'campaigns/ice/crypt',
    );

    expect(graphics.tiles.stoneWall?.imageUrl).toBe(
      'isometric/walls/stoneWall_E.png',
    );
    expect(graphics.tiles.iceFloor?.imageUrl).toBe(
      'campaigns/ice/crypt/floors/ice.png',
    );
    expect(resolveIsometricCellTileId(graphics, 'floor', 'A')).toBe(
      'roomFloor',
    );
    expect(resolveIsometricCellTileId(graphics, 'wall')).toBe('stoneWall');
  });

  it('allows campaign mappings to reuse shared tile ids and ignores unknown ids', () => {
    const campaign = parseIsometricGraphicsManifest({
      version: 1,
      cells: { floor: 'stoneFloor', wall: 'missingTile' },
      tiles: {},
    });
    expect(campaign).not.toBeNull();
    if (!campaign) return;

    const graphics = resolveIsometricGraphics(
      fallback,
      'isometric',
      campaign,
      'campaigns/ice/crypt',
    );

    expect(resolveIsometricCellTileId(graphics, 'floor')).toBe('stoneFloor');
    expect(resolveIsometricCellTileId(graphics, 'wall')).toBe('stoneWall');
  });

  it('rejects image paths that escape the graphics folder', () => {
    expect(
      parseIsometricGraphicsManifest({
        version: 1,
        cells: { floor: 'floor' },
        tiles: { floor: { image: '../outside.png' } },
      }),
    ).toBeNull();
  });

  it('keeps the shared index when no campaign index is supplied', () => {
    const graphics = resolveIsometricGraphics(fallback, 'isometric');

    expect(resolveIsometricCellTileId(graphics, 'door')).toBe('stoneDoor');
    expect(graphics.tiles.stoneFloor?.imageUrl).toBe(
      'isometric/floors/stone_E.png',
    );
  });

  it('resolves pillar variants deterministically from the grid position', () => {
    const manifest = parseIsometricGraphicsManifest(
      JSON.parse(
        readFileSync(
          new URL('../../static/isometric/index.json', import.meta.url),
          'utf8',
        ),
      ),
    );

    expect(manifest).not.toBeNull();
    if (!manifest) return;

    expect(manifest.pillarVariants).toEqual([
      'stoneColumn_E',
      'stoneColumn_N',
      'stoneColumn_S',
      'stoneColumn_W',
      'stoneColumnWood_E',
      'stoneColumnWood_N',
      'stoneColumnWood_S',
      'stoneColumnWood_W',
    ]);
    expect(manifest.cells.pillar).toBe('stoneColumn_E');
    expect(
      manifest.pillarVariants?.map((tileId) => manifest.tiles[tileId]?.image),
    ).toEqual([
      'pillars/stoneColumn_E.png',
      'pillars/stoneColumn_N.png',
      'pillars/stoneColumn_S.png',
      'pillars/stoneColumn_W.png',
      'pillars/stoneColumnWood_E.png',
      'pillars/stoneColumnWood_N.png',
      'pillars/stoneColumnWood_S.png',
      'pillars/stoneColumnWood_W.png',
    ]);

    const graphics = resolveIsometricGraphics(manifest, 'isometric');
    const selected = Array.from({ length: 8 }, (_, x) =>
      resolveIsometricPillarTileId(graphics, x, 0),
    );

    expect(new Set(selected)).toEqual(new Set(manifest.pillarVariants));
    expect(resolveIsometricPillarTileId(graphics, 3, 5)).toBe(
      resolveIsometricPillarTileId(graphics, 3, 5),
    );
  });

  it.each([
    { pillarVariants: [] },
    { pillarVariants: [''] },
    { pillarVariants: ['pillar', 1] },
    { pillarVariants: 'pillar' },
  ])(
    'rejects invalid pillar variant definitions: $pillarVariants',
    ({ pillarVariants }) => {
      expect(
        parseIsometricGraphicsManifest({
          version: 1,
          cells: {},
          tiles: {},
          pillarVariants,
        }),
      ).toBeNull();
    },
  );

  it('lets campaign pillar variants or a single pillar mapping override shared variants', () => {
    const shared: IsometricGraphicsManifest = {
      ...fallback,
      cells: { ...fallback.cells, pillar: 'sharedPillar' },
      tiles: {
        ...fallback.tiles,
        sharedPillar: { image: 'pillars/shared.png' },
        sharedVariantA: { image: 'pillars/shared-a.png' },
        sharedVariantB: { image: 'pillars/shared-b.png' },
      },
      pillarVariants: ['sharedVariantA', 'sharedVariantB'],
    };
    const campaignVariants: IsometricGraphicsManifest = {
      version: 1,
      cells: { pillar: 'campaignPillar' },
      tiles: {
        campaignPillar: { image: 'pillars/campaign.png' },
        campaignVariantA: { image: 'pillars/a.png' },
        campaignVariantB: { image: 'pillars/b.png' },
      },
      pillarVariants: ['campaignVariantA', 'campaignVariantB'],
    };
    const variantGraphics = resolveIsometricGraphics(
      shared,
      'isometric',
      campaignVariants,
      'campaigns/ice/crypt',
    );

    expect(variantGraphics.pillarVariants).toEqual([
      'campaignVariantA',
      'campaignVariantB',
    ]);
    expect(resolveIsometricPillarTileId(variantGraphics, 0, 0)).toBe(
      'campaignVariantA',
    );
    expect(variantGraphics.tiles.campaignVariantA?.imageUrl).toBe(
      'campaigns/ice/crypt/pillars/a.png',
    );

    const singleGraphics = resolveIsometricGraphics(
      shared,
      'isometric',
      {
        version: 1,
        cells: { pillar: 'campaignPillar' },
        tiles: { campaignPillar: { image: 'pillars/campaign.png' } },
      },
      'campaigns/ice/crypt',
    );

    expect(singleGraphics.pillarVariants).toEqual(['campaignPillar']);
    expect(resolveIsometricPillarTileId(singleGraphics, 4, 9)).toBe(
      'campaignPillar',
    );
    expect(singleGraphics.tiles.campaignPillar?.imageUrl).toBe(
      'campaigns/ice/crypt/pillars/campaign.png',
    );
  });

  it('ignores wall-shape entries that reference missing tile definitions', () => {
    const manifest: IsometricGraphicsManifest = {
      ...fallback,
      wallShapes: { ne: ['missingTile'] },
    };
    const graphics = resolveIsometricGraphics(manifest, 'isometric');

    expect(graphics.wallShapes.ne).toBeUndefined();
    expect(
      resolveIsometricWallTileIds(graphics, {
        north: true,
        east: true,
        south: false,
        west: false,
      }),
    ).toEqual(['stoneWall']);
  });

  it('references defined tiles from the shared graphics index', () => {
    const manifest = parseIsometricGraphicsManifest(
      JSON.parse(
        readFileSync(
          new URL('../../static/isometric/index.json', import.meta.url),
          'utf8',
        ),
      ),
    );

    expect(manifest).not.toBeNull();
    if (!manifest) return;

    const tileIds = [
      ...Object.values(manifest.cells),
      ...Object.values(manifest.wallShapes ?? {}).flat(),
    ];
    expect(tileIds.every((tileId) => manifest.tiles[tileId])).toBe(true);
  });

  it('composes all exposed wall faces without detached column caps', () => {
    const manifest = parseIsometricGraphicsManifest(
      JSON.parse(
        readFileSync(
          new URL('../../static/isometric/index.json', import.meta.url),
          'utf8',
        ),
      ),
    );

    expect(manifest).not.toBeNull();
    if (!manifest) return;

    const cornerShapes: Record<string, string[]> = {
      ne: ['stoneWall_E', 'stoneWall_N'],
      es: ['stoneWall_E', 'stoneWall_S'],
      sw: ['stoneWall_S', 'stoneWall_W'],
      nw: ['stoneWall_N', 'stoneWall_W'],
    };
    for (const [shape, tileIds] of Object.entries(cornerShapes)) {
      expect(manifest.wallShapes?.[shape]).toEqual(tileIds);
      expect(
        tileIds.every(
          (tileId) => manifest.tiles[tileId]?.image === `walls/${tileId}.png`,
        ),
      ).toBe(true);
    }

    expect(manifest.wallShapes?.nes).toEqual([
      'stoneWall_E',
      'stoneWall_S',
      'stoneWall_N',
    ]);
    expect(manifest.wallShapes?.new).toEqual([
      'stoneWall_E',
      'stoneWall_N',
      'stoneWall_W',
    ]);
    expect(manifest.wallShapes?.nsw).toEqual([
      'stoneWall_S',
      'stoneWall_N',
      'stoneWall_W',
    ]);
    expect(manifest.wallShapes?.esw).toEqual([
      'stoneWall_E',
      'stoneWall_S',
      'stoneWall_W',
    ]);
  });

  it('prefers classified corner art over wall masks and preserves mask fallback', () => {
    const manifest: IsometricGraphicsManifest = {
      version: 1,
      cells: { wall: 'stoneWall' },
      tiles: {
        stoneWall: { image: 'walls/stoneWall_E.png' },
        maskCorner: { image: 'walls/maskCorner.png' },
        innerTopLeft: { image: 'walls/innerTopLeft.png' },
        innerTopRight: { image: 'walls/innerTopRight.png' },
        innerBottomLeft: { image: 'walls/innerBottomLeft.png' },
        innerBottomRight: { image: 'walls/innerBottomRight.png' },
        outerTopLeft: { image: 'walls/outerTopLeft.png' },
        outerTopRight: { image: 'walls/outerTopRight.png' },
        outerBottomLeft: { image: 'walls/outerBottomLeft.png' },
        outerBottomRight: { image: 'walls/outerBottomRight.png' },
      },
      wallShapes: {
        ne: ['maskCorner'],
        [CornerType.INNER_TOP_LEFT]: ['innerTopLeft'],
        [CornerType.INNER_TOP_RIGHT]: ['innerTopRight'],
        [CornerType.INNER_BOTTOM_LEFT]: ['innerBottomLeft'],
        [CornerType.INNER_BOTTOM_RIGHT]: ['innerBottomRight'],
        [CornerType.OUTER_TOP_LEFT]: ['outerTopLeft'],
        [CornerType.OUTER_TOP_RIGHT]: ['outerTopRight'],
        [CornerType.OUTER_BOTTOM_LEFT]: ['outerBottomLeft'],
        [CornerType.OUTER_BOTTOM_RIGHT]: ['outerBottomRight'],
      },
    };
    const graphics = resolveIsometricGraphics(manifest, 'isometric');
    const neighbors = {
      north: true,
      east: true,
      south: false,
      west: false,
    };
    const classifiedShapes = [
      [CornerType.INNER_TOP_LEFT, 'innerTopLeft'],
      [CornerType.INNER_TOP_RIGHT, 'innerTopRight'],
      [CornerType.INNER_BOTTOM_LEFT, 'innerBottomLeft'],
      [CornerType.INNER_BOTTOM_RIGHT, 'innerBottomRight'],
      [CornerType.OUTER_TOP_LEFT, 'outerTopLeft'],
      [CornerType.OUTER_TOP_RIGHT, 'outerTopRight'],
      [CornerType.OUTER_BOTTOM_LEFT, 'outerBottomLeft'],
      [CornerType.OUTER_BOTTOM_RIGHT, 'outerBottomRight'],
    ] as const;

    for (const [cornerType, tileId] of classifiedShapes) {
      expect(
        resolveIsometricWallTileIds(graphics, neighbors, cornerType),
      ).toEqual([tileId]);
    }
    expect(
      resolveIsometricWallTileIds(graphics, neighbors, CornerType.NOT_CORNER),
    ).toEqual(['maskCorner']);
  });

  it('maps classified inner corners, outer turns and wall ends to oriented assets', () => {
    const manifest = parseIsometricGraphicsManifest(
      JSON.parse(
        readFileSync(
          new URL('../../static/isometric/index.json', import.meta.url),
          'utf8',
        ),
      ),
    );

    expect(manifest).not.toBeNull();
    if (!manifest) return;

    const classifiedTiles: Record<string, string[]> = {
      [CornerType.INNER_TOP_LEFT]: ['stoneWallColumn_N'],
      [CornerType.INNER_TOP_RIGHT]: ['stoneWallColumn_E'],
      [CornerType.INNER_BOTTOM_LEFT]: ['stoneWallColumn_W'],
      [CornerType.INNER_BOTTOM_RIGHT]: ['stoneWallColumn_S'],
      [CornerType.OUTER_TOP_LEFT]: ['stoneWallCorner_S'],
      [CornerType.OUTER_TOP_RIGHT]: ['stoneWallCorner_W'],
      [CornerType.OUTER_BOTTOM_LEFT]: ['stoneWallCorner_E'],
      [CornerType.OUTER_BOTTOM_RIGHT]: ['stoneWallCorner_N'],
    };

    for (const [cornerType, tileIds] of Object.entries(classifiedTiles)) {
      expect(manifest.wallShapes?.[cornerType]).toEqual(tileIds);
    }
  });

  it('maps wall ends and multi-face masks to exposed faces in back-to-front order', () => {
    const manifest = parseIsometricGraphicsManifest(
      JSON.parse(
        readFileSync(
          new URL('../../static/isometric/index.json', import.meta.url),
          'utf8',
        ),
      ),
    );

    expect(manifest).not.toBeNull();
    if (!manifest) return;

    const compositeShapes: Record<string, string[]> = {
      [CornerType.TOP_END]: ['stoneWall_E', 'stoneWall_S', 'stoneWall_W'],
      [CornerType.RIGHT_END]: ['stoneWall_S', 'stoneWall_N', 'stoneWall_W'],
      [CornerType.BOTTOM_END]: ['stoneWall_E', 'stoneWall_N', 'stoneWall_W'],
      [CornerType.LEFT_END]: ['stoneWall_E', 'stoneWall_S', 'stoneWall_N'],
      ns: ['stoneWall_S', 'stoneWall_N'],
      ew: ['stoneWall_E', 'stoneWall_W'],
      ne: ['stoneWall_E', 'stoneWall_N'],
      es: ['stoneWall_E', 'stoneWall_S'],
      sw: ['stoneWall_S', 'stoneWall_W'],
      nw: ['stoneWall_N', 'stoneWall_W'],
      nes: ['stoneWall_E', 'stoneWall_S', 'stoneWall_N'],
      new: ['stoneWall_E', 'stoneWall_N', 'stoneWall_W'],
      nsw: ['stoneWall_S', 'stoneWall_N', 'stoneWall_W'],
      esw: ['stoneWall_E', 'stoneWall_S', 'stoneWall_W'],
      nesw: ['stoneWall_E', 'stoneWall_S', 'stoneWall_N', 'stoneWall_W'],
    };

    for (const [shape, tileIds] of Object.entries(compositeShapes)) {
      expect(manifest.wallShapes?.[shape]).toEqual(tileIds);
    }
  });

  it('maps compound wall shapes to faces and corner caps in back-to-front order', () => {
    const manifest = parseIsometricGraphicsManifest(
      JSON.parse(
        readFileSync(
          new URL('../../static/isometric/index.json', import.meta.url),
          'utf8',
        ),
      ),
    );

    expect(manifest).not.toBeNull();
    if (!manifest) return;

    const compoundShapes: Record<string, string[]> = {
      'ITL+ITR': ['stoneWallColumn_E', 'stoneWallColumn_N'],
      'ITL+IBL': ['stoneWallColumn_W', 'stoneWallColumn_N'],
      'ITL+IBR': ['stoneWallColumn_S', 'stoneWallColumn_N'],
      'ITR+IBL': ['stoneWallColumn_E', 'stoneWallColumn_W'],
      'ITR+IBR': ['stoneWallColumn_S', 'stoneWallColumn_E'],
      'IBL+IBR': ['stoneWallColumn_S', 'stoneWallColumn_W'],
      'ITL+ITR+IBL': [
        'stoneWallColumn_E',
        'stoneWallColumn_W',
        'stoneWallColumn_N',
      ],
      'ITL+ITR+IBR': [
        'stoneWallColumn_S',
        'stoneWallColumn_E',
        'stoneWallColumn_N',
      ],
      'ITL+IBL+IBR': [
        'stoneWallColumn_S',
        'stoneWallColumn_W',
        'stoneWallColumn_N',
      ],
      'ITR+IBL+IBR': [
        'stoneWallColumn_S',
        'stoneWallColumn_E',
        'stoneWallColumn_W',
      ],
      'ITL+ITR+IBL+IBR': [
        'stoneWallColumn_S',
        'stoneWallColumn_E',
        'stoneWallColumn_W',
        'stoneWallColumn_N',
      ],
      'n+IBL': ['stoneWallColumn_W', 'stoneWall_N'],
      'n+IBR': ['stoneWallColumn_S', 'stoneWall_N'],
      'n+IBL+IBR': ['stoneWallColumn_S', 'stoneWallColumn_W', 'stoneWall_N'],
      'e+ITL': ['stoneWall_E', 'stoneWallColumn_N'],
      'e+IBL': ['stoneWall_E', 'stoneWallColumn_W'],
      'e+ITL+IBL': ['stoneWall_E', 'stoneWallColumn_W', 'stoneWallColumn_N'],
      's+ITL': ['stoneWall_S', 'stoneWallColumn_N'],
      's+ITR': ['stoneWall_S', 'stoneWallColumn_E'],
      's+ITL+ITR': ['stoneWall_S', 'stoneWallColumn_E', 'stoneWallColumn_N'],
      'w+ITR': ['stoneWallColumn_E', 'stoneWall_W'],
      'w+IBR': ['stoneWallColumn_S', 'stoneWall_W'],
      'w+ITR+IBR': ['stoneWallColumn_S', 'stoneWallColumn_E', 'stoneWall_W'],
      'ne+IBL': ['stoneWall_E', 'stoneWallColumn_W', 'stoneWall_N'],
      'es+ITL': ['stoneWall_E', 'stoneWall_S', 'stoneWallColumn_N'],
      'sw+ITR': ['stoneWall_S', 'stoneWallColumn_E', 'stoneWall_W'],
      'nw+IBR': ['stoneWallColumn_S', 'stoneWall_N', 'stoneWall_W'],
    };

    for (const [shape, tileIds] of Object.entries(compoundShapes)) {
      expect(manifest.wallShapes?.[shape], shape).toEqual(tileIds);
    }
  });

  it('matches classified convex corners and wall ends to their exposed grid edges', () => {
    const manifest = parseIsometricGraphicsManifest(
      JSON.parse(
        readFileSync(
          new URL('../../static/isometric/index.json', import.meta.url),
          'utf8',
        ),
      ),
    );

    expect(manifest).not.toBeNull();
    if (!manifest) return;

    // Sprite suffixes are art rotations, not the grid edges occupied by the art.
    const spriteEdges: Record<string, string[]> = {
      stoneWall_N: ['south'],
      stoneWall_E: ['west'],
      stoneWall_S: ['north'],
      stoneWall_W: ['east'],
      stoneWallCorner_N: ['east', 'south'],
      stoneWallCorner_E: ['south', 'west'],
      stoneWallCorner_S: ['north', 'west'],
      stoneWallCorner_W: ['east', 'north'],
    };
    const exposedEdges: Record<string, string[]> = {
      [CornerType.OUTER_TOP_LEFT]: ['north', 'west'],
      [CornerType.OUTER_TOP_RIGHT]: ['east', 'north'],
      [CornerType.OUTER_BOTTOM_LEFT]: ['south', 'west'],
      [CornerType.OUTER_BOTTOM_RIGHT]: ['east', 'south'],
      [CornerType.TOP_END]: ['east', 'north', 'west'],
      [CornerType.RIGHT_END]: ['east', 'north', 'south'],
      [CornerType.BOTTOM_END]: ['east', 'south', 'west'],
      [CornerType.LEFT_END]: ['north', 'south', 'west'],
    };

    for (const [shape, edges] of Object.entries(exposedEdges)) {
      const tiles = manifest.wallShapes?.[shape] ?? [];
      expect(tiles.every((tileId) => tileId in spriteEdges)).toBe(true);
      expect(
        tiles.flatMap((tileId) => spriteEdges[tileId] ?? []).sort(),
      ).toEqual(edges);
    }
  });

  it('resolves wall faces and composite corner shapes from wall-side masks', () => {
    const manifest: IsometricGraphicsManifest = {
      version: 1,
      cells: { wall: 'stoneWall' },
      tiles: {
        stoneWall: { image: 'walls/stoneWall_E.png' },
        northFace: { image: 'walls/stoneWall_N.png' },
        northEastCorner: { image: 'walls/stoneWallCorner_E.png' },
        southFace: { image: 'walls/stoneWall_S.png' },
      },
      wallShapes: {
        n: ['northFace'],
        ne: ['northEastCorner', 'southFace'],
      },
    };
    const graphics = resolveIsometricGraphics(manifest, 'isometric');

    expect(
      resolveIsometricWallTileIds(graphics, {
        north: true,
        east: false,
        south: false,
        west: false,
      }),
    ).toEqual(['northFace']);
    expect(
      resolveIsometricWallTileIds(graphics, {
        north: true,
        east: true,
        south: false,
        west: false,
      }),
    ).toEqual(['northEastCorner', 'southFace']);
    expect(
      resolveIsometricWallTileIds(graphics, {
        north: false,
        east: false,
        south: true,
        west: false,
      }),
    ).toEqual(['stoneWall']);
  });

  it('selects open and closed door art by door side', () => {
    const graphics = resolveIsometricGraphics(fallback, 'isometric');

    expect(resolveIsometricDoorTileId(graphics, false, 'Right')).toBe(
      'stoneDoorClosed_E',
    );
    expect(resolveIsometricDoorTileId(graphics, true, 'Right')).toBe(
      'stoneDoorOpen_E',
    );
    expect(resolveIsometricDoorTileId(graphics, true, 'Left')).toBe(
      'stoneDoor',
    );
  });
});
