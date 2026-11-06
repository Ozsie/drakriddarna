// Facade over the @hoard-engine/scene tileset handling: the tile
// reference type, the built-in dungeon tileset's slot layout and the
// cached tile drawing live in the engine package; the named fallback
// tiles of the game's own actor and item sheets are game content and
// stay here.
import {
  ACTOR_TILE_SIZE,
  DEFAULT_TILESET_TILE_SIZE,
  type TileRef,
} from '@hoard-engine/scene';

export {
  ACTOR_TILE_SIZE,
  DUNGEON_TILES,
  type TileRef,
  type TileSheet,
  drawTileRef,
} from '@hoard-engine/scene';

const actorTile = (x: number, y: number): TileRef => ({
  sheet: 'actors',
  x,
  y,
  size: ACTOR_TILE_SIZE,
});

// Fallback sprites on the actor sheet, for heroes/monsters without an
// animated sprite. The orch/troll/default slots sit a half tile right
// of column 11 in the built-in sheet.
export const ACTOR_TILES = {
  HERO: actorTile(0, 2 * ACTOR_TILE_SIZE),
  MONSTER_DEFAULT: actorTile(11 * ACTOR_TILE_SIZE - 16, 2 * ACTOR_TILE_SIZE),
  TROLL: actorTile(11 * ACTOR_TILE_SIZE - 16, 4 * ACTOR_TILE_SIZE),
  ORCH: actorTile(11 * ACTOR_TILE_SIZE - 16, 8 * ACTOR_TILE_SIZE),
} as const satisfies Record<string, TileRef>;

// Tiles for drawing items on the board. Items with their own sprite
// sheet do not use these; the entries live here so item tiles can grow
// into their own section of the sheets without touching the dungeon
// tiles.
export const ITEM_TILES = {
  // Fallback tile for items without their own sprite sheet.
  ITEM_GENERIC: {
    sheet: 'dungeon',
    x: 6 * DEFAULT_TILESET_TILE_SIZE,
    y: 3 * DEFAULT_TILESET_TILE_SIZE,
    size: DEFAULT_TILESET_TILE_SIZE,
  },
} as const satisfies Record<string, TileRef>;
