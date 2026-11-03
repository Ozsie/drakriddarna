import { DEFAULT_TILESET_TILE_SIZE } from './TilesetLogic';
import { drawCachedTile } from './TileTextureCache';

// The sheets named tiles are cut from. 'dungeon' is the tileset image the
// current campaign/dungeon resolves to (see resolveTileset); 'actors' is
// the shared actor sheet used for hero/monster fallback sprites.
export type TileSheet = 'dungeon' | 'actors';

// A named reference to one tile slot in a sheet: the top-left pixel of the
// tile inside the sheet image, and the tile's extent. Sheets are grid
// images, so the built-in references are derived from grid columns/rows.
export type TileRef = {
  readonly sheet: TileSheet;
  readonly x: number;
  readonly y: number;
  readonly size: number;
};

// The tile slot size of the built-in actor sheet.
export const ACTOR_TILE_SIZE = 32;

const dungeonTile = (column: number, row: number): TileRef => ({
  sheet: 'dungeon',
  x: column * DEFAULT_TILESET_TILE_SIZE,
  y: row * DEFAULT_TILESET_TILE_SIZE,
  size: DEFAULT_TILESET_TILE_SIZE,
});

const actorTile = (x: number, y: number): TileRef => ({
  sheet: 'actors',
  x,
  y,
  size: ACTOR_TILE_SIZE,
});

// Named tiles of the dungeon tileset: floors, wall runs, corner caps and
// dungeon props. Renderers pass these around instead of a sheet plus loose
// coordinates. Some slots serve more than one role (a wall piece that
// doubles as a corner cap, for instance); such slots appear under each
// role's name so call sites read as what they draw.
export const DUNGEON_TILES = {
  // Ordinary floor variants; renderFloor picks between them by cell seed.
  FLOOR_A: dungeonTile(8, 0),
  FLOOR_B: dungeonTile(10, 0),
  FLOOR_C: dungeonTile(11, 0),
  FLOOR_D: dungeonTile(12, 0),
  FLOOR_E: dungeonTile(1, 5),
  // Wall runs, named by where the bordering floor lies.
  WALL_H_UP: dungeonTile(1, 0),
  // Same slot as the bottom wall-end cap.
  WALL_H_DOWN: dungeonTile(2, 4),
  // Same slot as the outer bottom-left corner and the left wall-end cap.
  WALL_H_BOTH: dungeonTile(0, 2),
  WALL_V_LEFT: dungeonTile(4, 5),
  WALL_V_RIGHT: dungeonTile(0, 5),
  WALL_V_BOTH: dungeonTile(5, 7),
  // The wall piece painted on the undiscovered cell below a closed
  // down-side door (the mirror of WALL_H_DOWN).
  WALL_BELOW_DOOR: dungeonTile(2, 6),
  // Corner caps the corner classifier paints on wall cells.
  CORNER_OUTER_TOP_LEFT: dungeonTile(0, 0),
  CORNER_OUTER_TOP_RIGHT: dungeonTile(4, 0),
  CORNER_OUTER_BOTTOM_RIGHT: dungeonTile(4, 2),
  CORNER_OUTER_BOTTOM_LEFT: dungeonTile(0, 2),
  CORNER_INNER_TOP_LEFT: dungeonTile(0, 4),
  CORNER_INNER_TOP_RIGHT: dungeonTile(4, 4),
  CORNER_INNER_BOTTOM_LEFT: dungeonTile(0, 6),
  CORNER_INNER_BOTTOM_RIGHT: dungeonTile(4, 6),
  CORNER_BOTTOM_END: dungeonTile(2, 4),
  CORNER_TOP_END: dungeonTile(4, 7),
  CORNER_THREE_WAY_UP: dungeonTile(4, 8),
  // Rock filling a collapsed cell, and the fallback for uncategorized
  // corner shapes.
  RUBBLE: dungeonTile(15, 0),
  PIT: dungeonTile(13, 0),
  PILLAR_BASE: dungeonTile(7, 2),
  PILLAR_TOP: dungeonTile(7, 1),
  // Translucent marker over a not-yet-found secret.
  SECRET_MARKER: dungeonTile(9, 0),
  SECRET_FOUND: dungeonTile(5, 4),
  TRAP_DOOR: dungeonTile(6, 7),
  // The closed-door piece painted on the undiscovered cell above an
  // up-side door, so the doorway reads as a door from the south.
  DOOR_TOP: dungeonTile(13, 1),
} as const satisfies Record<string, TileRef>;

// Fallback sprites on the actor sheet, for heroes/monsters without an
// animated sprite. The orch/troll/default slots sit a half tile right
// of column 11 in the built-in sheet.
export const ACTOR_TILES = {
  HERO: actorTile(0, 2 * ACTOR_TILE_SIZE),
  MONSTER_DEFAULT: actorTile(11 * ACTOR_TILE_SIZE - 16, 2 * ACTOR_TILE_SIZE),
  TROLL: actorTile(11 * ACTOR_TILE_SIZE - 16, 4 * ACTOR_TILE_SIZE),
  ORCH: actorTile(11 * ACTOR_TILE_SIZE - 16, 8 * ACTOR_TILE_SIZE),
} as const satisfies Record<string, TileRef>;

// Tiles for drawing items on the board. Items with their own sprite sheet
// do not use these; the entries live here so item tiles can grow into
// their own section of the sheets without touching the dungeon tiles.
export const ITEM_TILES = {
  // Fallback tile for items without their own sprite sheet.
  ITEM_GENERIC: dungeonTile(6, 3),
} as const satisfies Record<string, TileRef>;

// Draws a named tile from its sheet at the given destination rectangle,
// through the tile texture cache.
export const drawTileRef = (
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  tile: TileRef,
  dx: number,
  dy: number,
  destWidth: number = tile.size,
  destHeight: number = tile.size,
): void => {
  drawCachedTile(
    ctx,
    source,
    tile.x,
    tile.y,
    tile.size,
    tile.size,
    dx,
    dy,
    destWidth,
    destHeight,
  );
};
