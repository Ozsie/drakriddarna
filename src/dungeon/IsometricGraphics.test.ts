import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  resolveIsometricCellTileId,
  resolveIsometricDoorTileId,
  resolveIsometricGraphics,
  resolveIsometricWallTileIds,
  parseIsometricGraphicsManifest,
  type IsometricGraphicsManifest,
} from './IsometricGraphics';

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
