import { describe, expect, it } from 'vitest';
import {
  ACTOR_TILES,
  ACTOR_TILE_SIZE,
  DUNGEON_TILES,
  ITEM_TILES,
  type TileRef,
} from './tiles';
import { DEFAULT_TILESET_TILE_SIZE } from './TilesetLogic';

// The named tiles must keep pointing at the same slots of the built-in
// sheets as the loose coordinates they replaced: a shifted entry silently
// repaints the dungeon, so the values are pinned here.
const expectedDungeonTiles: Record<string, TileRef> = {
  FLOOR_A: { sheet: 'dungeon', x: 8 * 48, y: 0, size: 48 },
  FLOOR_B: { sheet: 'dungeon', x: 10 * 48, y: 0, size: 48 },
  FLOOR_C: { sheet: 'dungeon', x: 11 * 48, y: 0, size: 48 },
  FLOOR_D: { sheet: 'dungeon', x: 12 * 48, y: 0, size: 48 },
  FLOOR_E: { sheet: 'dungeon', x: 1 * 48, y: 5 * 48, size: 48 },
  WALL_H_UP: { sheet: 'dungeon', x: 1 * 48, y: 0, size: 48 },
  WALL_H_DOWN: { sheet: 'dungeon', x: 2 * 48, y: 4 * 48, size: 48 },
  WALL_H_BOTH: { sheet: 'dungeon', x: 0, y: 2 * 48, size: 48 },
  WALL_V_LEFT: { sheet: 'dungeon', x: 4 * 48, y: 5 * 48, size: 48 },
  WALL_V_RIGHT: { sheet: 'dungeon', x: 0, y: 5 * 48, size: 48 },
  WALL_V_BOTH: { sheet: 'dungeon', x: 5 * 48, y: 7 * 48, size: 48 },
  WALL_BELOW_DOOR: { sheet: 'dungeon', x: 2 * 48, y: 6 * 48, size: 48 },
  CORNER_OUTER_TOP_LEFT: { sheet: 'dungeon', x: 0, y: 0, size: 48 },
  CORNER_OUTER_TOP_RIGHT: { sheet: 'dungeon', x: 4 * 48, y: 0, size: 48 },
  CORNER_OUTER_BOTTOM_RIGHT: {
    sheet: 'dungeon',
    x: 4 * 48,
    y: 2 * 48,
    size: 48,
  },
  CORNER_OUTER_BOTTOM_LEFT: { sheet: 'dungeon', x: 0, y: 2 * 48, size: 48 },
  CORNER_INNER_TOP_LEFT: { sheet: 'dungeon', x: 0, y: 4 * 48, size: 48 },
  CORNER_INNER_TOP_RIGHT: { sheet: 'dungeon', x: 4 * 48, y: 4 * 48, size: 48 },
  CORNER_INNER_BOTTOM_LEFT: { sheet: 'dungeon', x: 0, y: 6 * 48, size: 48 },
  CORNER_INNER_BOTTOM_RIGHT: {
    sheet: 'dungeon',
    x: 4 * 48,
    y: 6 * 48,
    size: 48,
  },
  CORNER_BOTTOM_END: { sheet: 'dungeon', x: 2 * 48, y: 4 * 48, size: 48 },
  CORNER_TOP_END: { sheet: 'dungeon', x: 4 * 48, y: 7 * 48, size: 48 },
  CORNER_THREE_WAY_UP: { sheet: 'dungeon', x: 4 * 48, y: 8 * 48, size: 48 },
  RUBBLE: { sheet: 'dungeon', x: 15 * 48, y: 0, size: 48 },
  PIT: { sheet: 'dungeon', x: 13 * 48, y: 0, size: 48 },
  PILLAR_BASE: { sheet: 'dungeon', x: 7 * 48, y: 2 * 48, size: 48 },
  PILLAR_TOP: { sheet: 'dungeon', x: 7 * 48, y: 1 * 48, size: 48 },
  SECRET_MARKER: { sheet: 'dungeon', x: 9 * 48, y: 0, size: 48 },
  SECRET_FOUND: { sheet: 'dungeon', x: 5 * 48, y: 4 * 48, size: 48 },
  TRAP_DOOR: { sheet: 'dungeon', x: 6 * 48, y: 7 * 48, size: 48 },
  DOOR_TOP: { sheet: 'dungeon', x: 13 * 48, y: 1 * 48, size: 48 },
};

const expectedActorTiles: Record<string, TileRef> = {
  HERO: { sheet: 'actors', x: 0, y: 2 * 32, size: 32 },
  MONSTER_DEFAULT: { sheet: 'actors', x: 11 * 32 - 16, y: 2 * 32, size: 32 },
  TROLL: { sheet: 'actors', x: 11 * 32 - 16, y: 4 * 32, size: 32 },
  ORCH: { sheet: 'actors', x: 11 * 32 - 16, y: 8 * 32, size: 32 },
};

const expectedItemTiles: Record<string, TileRef> = {
  ITEM_GENERIC: { sheet: 'dungeon', x: 6 * 48, y: 3 * 48, size: 48 },
};

describe('named tile consts', () => {
  it.each([
    ['DUNGEON_TILES', DUNGEON_TILES, expectedDungeonTiles],
    ['ACTOR_TILES', ACTOR_TILES, expectedActorTiles],
    ['ITEM_TILES', ITEM_TILES, expectedItemTiles],
  ])(
    'pins every %s entry to its slot in the built-in sheets',
    (_name, tiles, expected) => {
      expect(Object.keys(tiles).sort()).toEqual(Object.keys(expected).sort());
      Object.keys(expected).forEach((key) => {
        expect(tiles[key as keyof typeof tiles]).toEqual(expected[key]);
      });
    },
  );

  it('uses the built-in sheet sizes', () => {
    expect(DEFAULT_TILESET_TILE_SIZE).toBe(48);
    expect(ACTOR_TILE_SIZE).toBe(32);
    [...Object.values(DUNGEON_TILES), ...Object.values(ITEM_TILES)].forEach(
      (tile) => {
        expect(tile.size).toBe(DEFAULT_TILESET_TILE_SIZE);
        expect(tile.sheet).toBe('dungeon');
      },
    );
    Object.values(ACTOR_TILES).forEach((tile) => {
      expect(tile.size).toBe(ACTOR_TILE_SIZE);
      expect(tile.sheet).toBe('actors');
    });
  });
});
