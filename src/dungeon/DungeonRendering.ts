import { CornerType, TerrainType } from '../types';
import { COLLAPSED, EMPTY, SEALED_DOOR, WALL } from '../core';
import { findCell, isSamePosition, toArray } from '../core';
import { autoDetectCorners } from './cornerDetection';
import { drawCachedTile } from './TileTextureCache';
import { type TileRef, DUNGEON_TILES, drawTileRef } from './tiles';
import {
  TERRAIN_DEFAULT_OPACITY,
  TERRAIN_DEFAULT_RATE,
  TERRAIN_DEFAULT_STYLING,
} from './TerrainLogic';
import type { LightViewport } from './LightRendering';
import type { ScenePoint } from '../scene/contracts';
import type {
  SceneCorner,
  SceneDungeonView,
  SceneDoor,
  SceneEdgeWall,
  SceneFogOptions,
  SceneSecret,
  SceneTerrainCell,
} from '../scene/dungeon';

// Discovery over the contract's own shapes: the imported game helpers
// take the game's `Dungeon` type, and the renderer must resolve
// visibility against plain grid rows and the discovered-room set —
// the two-field duplicate is cheaper than an import edge
// (docs/engine-packages.md, dependency rule 3).
const isRoomDiscovered = (dungeon: SceneDungeonView, cell: string): boolean =>
  dungeon.discoveredRooms.includes(cell);

const isDiscovered = (
  dungeon: SceneDungeonView,
  x: number,
  y: number,
): boolean => {
  const cell = findCell(dungeon.layout.grid, x, y);
  if (!cell) return false;
  return isRoomDiscovered(dungeon, cell);
};

export const background = '#1E1C19';

// The dungeon view's backdrop colour, mirroring `--color-bg-dungeon` in
// theme.css. Painted as the opaque static canvas's full-canvas base so
// the area outside the dungeon world looks the same as it did when the
// CSS background showed through a transparent canvas.
export const dungeonViewBackdrop = '#121418';

export const renderDoors = (
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  cellSize: number,
  dungeon: SceneDungeonView,
  debugMode: boolean,
) => {
  dungeon.layout.doors.forEach((door) => {
    renderDoor(ctx, ground, cellSize, dungeon, door, debugMode);
  });
};

// Default fill of an edge wall when neither the wall nor the layout
// specifies a colour.
export const DEFAULT_WALL_COLOUR = '#6e6a63';
const WALL_EDGE_COLOUR = '#4a4741';

// The flat strip an edge wall paints on the shared boundary between its two
// cells — same positioning and thickness as a closed door leaf. The geometry
// is kept separate from the painting so a tileset piece can replace the flat
// colour without touching the visibility rules.
export const edgeWallRect = (
  wall: SceneEdgeWall,
  cellSize: number,
): { x: number; y: number; w: number; h: number; vertical: boolean } => {
  const thickness = doorThickness(cellSize);
  const half = Math.floor(thickness / 2);
  const vertical = wall.side === 'Right' || wall.side === 'Left';
  const edgeX = wall.x * cellSize + (wall.side === 'Right' ? cellSize : 0);
  const edgeY = wall.y * cellSize + (wall.side === 'Down' ? cellSize : 0);
  return {
    x: vertical ? edgeX - half : wall.x * cellSize,
    y: vertical ? wall.y * cellSize : edgeY - half,
    w: vertical ? thickness : cellSize,
    h: vertical ? cellSize : thickness,
    vertical,
  };
};

// A wall between two cells renders once at least one side is discovered.
// The validator rejects a wall sharing its edge with a door, so the wall
// never needs to yield to the door: it always paints, keeping the render
// consistent with movement, search and pathfinding even if validation was
// disabled.
const drawEdgeWall = (
  ctx: CanvasRenderingContext2D,
  wall: SceneEdgeWall,
  cellSize: number,
  dungeon: SceneDungeonView,
  debugMode: boolean,
) => {
  const layout = dungeon.layout;
  const farX = wall.side === 'Right' ? 1 : wall.side === 'Left' ? -1 : 0;
  const farY = wall.side === 'Down' ? 1 : wall.side === 'Up' ? -1 : 0;
  const nearDiscovered = isDiscovered(dungeon, wall.x, wall.y);
  const farDiscovered = isDiscovered(dungeon, wall.x + farX, wall.y + farY);
  if (!nearDiscovered && !farDiscovered && !debugMode) return;

  const rect = edgeWallRect(wall, cellSize);
  ctx.fillStyle = wall.colour ?? layout.wallColour ?? DEFAULT_WALL_COLOUR;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = WALL_EDGE_COLOUR;
  if (rect.vertical) {
    ctx.fillRect(rect.x, rect.y, 1, rect.h);
    ctx.fillRect(rect.x + rect.w - 1, rect.y, 1, rect.h);
  } else {
    ctx.fillRect(rect.x, rect.y, rect.w, 1);
    ctx.fillRect(rect.x, rect.y + rect.h - 1, rect.w, 1);
  }
};

export const renderWalls = (
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  dungeon: SceneDungeonView,
  debugMode: boolean,
) => {
  dungeon.layout.walls?.forEach((wall) => {
    drawEdgeWall(ctx, wall, cellSize, dungeon, debugMode);
  });
};

export const renderGrid = (
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  cellSize: number,
  dungeon: SceneDungeonView,
  debugMode: boolean,
) => {
  dungeon.layout.grid.forEach((row, y) => {
    toArray(row).forEach((cell: string, x: number) => {
      renderFloor(ctx, ground, dungeon, cell, x, y, cellSize);
      renderGridLines(ctx, cell, dungeon, x, y, cellSize, debugMode);
    });
  });
  renderPits(ctx, ground, cellSize, dungeon, debugMode);
};

export const renderSecrets = (
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  cellSize: number,
  dungeon: SceneDungeonView,
  debugMode: boolean,
) => {
  dungeon.layout.secrets
    .filter((secret) => secret.found)
    .forEach((secret) => {
      switch (secret.type) {
        case 'Trap Door':
          renderTrapDoor(ctx, ground, cellSize, secret);
          break;
        default:
          renderFoundSecret(ctx, ground, cellSize, secret);
          break;
      }
    });
  dungeon.layout.secrets
    .filter((secret) => !secret.found)
    .forEach((secret) => {
      ctx.globalAlpha = 0.6;
      drawTile(
        ctx,
        ground,
        DUNGEON_TILES.SECRET_MARKER,
        cellSize,
        secret.position.x,
        secret.position.y,
        dungeon,
      );
      ctx.globalAlpha = 1;
      if (debugMode) {
        const secretText = `${secret.type}`;
        ctx.fillStyle = 'rgba(255, 50, 50, 0.28)';
        ctx.fillRect(
          secret.position.x * cellSize,
          secret.position.y * cellSize,
          cellSize,
          cellSize,
        );
        ctx.fillStyle = 'black';
        ctx.font = '12px Arial';
        ctx.fillText(
          secretText,
          secret.position.x * cellSize,
          secret.position.y * cellSize + 10,
        );
      }
    });
};

const drawTile = (
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  tile: TileRef,
  cellSize: number,
  x: number,
  y: number,
  dungeon: SceneDungeonView,
) => {
  if (
    dungeon.discoveredRooms.some((r) => neighbourOf(x, y, r, dungeon)) ||
    neighbourOf(x, y, COLLAPSED, dungeon)
  ) {
    drawCachedTile(
      ctx,
      ground,
      tile.x,
      tile.y,
      tile.size,
      tile.size,
      x * cellSize,
      y * cellSize,
      cellSize,
      cellSize,
    );
  } else {
    renderHiddenCell(ctx, x, y, cellSize);
  }
};

const drawCornerTile = (
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  corner: string,
  cellSize: number,
  x: number,
  y: number,
  dungeon: SceneDungeonView,
) => {
  switch (corner) {
    case CornerType.INNER_BOTTOM_LEFT: {
      drawTile(
        ctx,
        ground,
        DUNGEON_TILES.CORNER_INNER_BOTTOM_LEFT,
        cellSize,
        x,
        y,
        dungeon,
      );
      break;
    }
    case CornerType.INNER_BOTTOM_RIGHT: {
      drawTile(
        ctx,
        ground,
        DUNGEON_TILES.CORNER_INNER_BOTTOM_RIGHT,
        cellSize,
        x,
        y,
        dungeon,
      );
      break;
    }
    case CornerType.INNER_TOP_LEFT: {
      drawTile(
        ctx,
        ground,
        DUNGEON_TILES.CORNER_INNER_TOP_LEFT,
        cellSize,
        x,
        y,
        dungeon,
      );
      break;
    }
    case CornerType.INNER_TOP_RIGHT: {
      drawTile(
        ctx,
        ground,
        DUNGEON_TILES.CORNER_INNER_TOP_RIGHT,
        cellSize,
        x,
        y,
        dungeon,
      );
      break;
    }
    case CornerType.OUTER_TOP_RIGHT: {
      drawTile(
        ctx,
        ground,
        DUNGEON_TILES.CORNER_OUTER_TOP_RIGHT,
        cellSize,
        x,
        y,
        dungeon,
      );
      break;
    }
    case CornerType.OUTER_TOP_LEFT: {
      drawTile(
        ctx,
        ground,
        DUNGEON_TILES.CORNER_OUTER_TOP_LEFT,
        cellSize,
        x,
        y,
        dungeon,
      );
      break;
    }
    case CornerType.OUTER_BOTTOM_RIGHT:
    case CornerType.RIGHT_END: {
      drawTile(
        ctx,
        ground,
        DUNGEON_TILES.CORNER_OUTER_BOTTOM_RIGHT,
        cellSize,
        x,
        y,
        dungeon,
      );
      break;
    }
    case CornerType.OUTER_BOTTOM_LEFT:
    case CornerType.LEFT_END: {
      drawTile(
        ctx,
        ground,
        DUNGEON_TILES.CORNER_OUTER_BOTTOM_LEFT,
        cellSize,
        x,
        y,
        dungeon,
      );
      break;
    }
    case CornerType.BOTTOM_END: {
      drawTile(
        ctx,
        ground,
        DUNGEON_TILES.CORNER_BOTTOM_END,
        cellSize,
        x,
        y,
        dungeon,
      );
      break;
    }
    case CornerType.TOP_END: {
      drawTile(
        ctx,
        ground,
        DUNGEON_TILES.CORNER_TOP_END,
        cellSize,
        x,
        y,
        dungeon,
      );
      break;
    }
    case CornerType.THREE_WAY_INTERSECTION_UP: {
      drawTile(
        ctx,
        ground,
        DUNGEON_TILES.CORNER_THREE_WAY_UP,
        cellSize,
        x,
        y,
        dungeon,
      );
      break;
    }
    default:
      drawTile(ctx, ground, DUNGEON_TILES.RUBBLE, cellSize, x, y, dungeon);
      break;
  }
};

const renderPits = (
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  cellSize: number,
  dungeon: SceneDungeonView,
  debugMode: boolean,
) => {
  dungeon.layout.pits
    ?.filter((pit) => isDiscovered(dungeon, pit.x, pit.y) || debugMode)
    ?.forEach((pit) => {
      drawTile(ctx, ground, DUNGEON_TILES.PIT, cellSize, pit.x, pit.y, dungeon);
    });
};

// Fill colour of a terrain cell that configures neither its own colour nor
// has a default styling for its type.
const DEFAULT_TERRAIN_COLOR = '#56606a';

// Terrain cells (water, lava, ...) tint the floor with a translucent
// colour fill. The fill lives on the static layer like the floor itself;
// animated material highlights will render on the dynamic layer.
export const renderTerrain = (
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  dungeon: SceneDungeonView,
  debugMode: boolean,
) => {
  (dungeon.layout.terrain ?? [])
    .filter(
      (cell) =>
        isDiscovered(dungeon, cell.position.x, cell.position.y) || debugMode,
    )
    .forEach((cell) => {
      const styling = TERRAIN_DEFAULT_STYLING[cell.type];
      ctx.globalAlpha =
        cell.opacity ?? styling?.opacity ?? TERRAIN_DEFAULT_OPACITY;
      ctx.fillStyle = cell.color ?? styling?.color ?? DEFAULT_TERRAIN_COLOR;
      ctx.fillRect(
        cell.position.x * cellSize,
        cell.position.y * cellSize,
        cellSize,
        cellSize,
      );
      ctx.globalAlpha = 1;
    });
};

// --- Animated terrain and fog overlays (dynamic layer) --------------------

// Fog cloud styling defaults.
const DEFAULT_FOG_COLOR = '#b9c6cf';
const DEFAULT_FOG_OPACITY = 0.35;
const DEFAULT_FOG_RATE = 0.3;
const DEFAULT_FOG_SOFTNESS = 0.6;
const DEFAULT_FOG_DENSITY = 0.3;

// The animated terrain and fog overlays change their output slowly
// (travelling wave crests, breathing glow, undulating cloud), so the
// dynamic layer repaints them at most this often: the ambient repaint
// gate in the board controller steps time by this amount.
export const TERRAIN_ANIMATION_STEP_MS = 1000 / 15;

// Only the built-in terrain types have an animated overlay; unknown types
// render their static fill alone.
const isAnimatedTerrainType = (type: string): boolean =>
  type === TerrainType.WATER || type === TerrainType.LAVA;

const fract = (v: number): number => v - Math.floor(v);

// Deterministic pseudo-random 0..1 phase per cell, so the overlays move
// stably across frames without flicker and without stored per-cell state.
const cellHash = (x: number, y: number, salt = 0): number =>
  fract(
    Math.sin((x + 1) * 12.9898 + (y + 1) * 78.233 + salt * 37.719) * 43758.5453,
  );

const cellInViewport = (
  cell: ScenePoint,
  viewport?: LightViewport,
): boolean => {
  if (!viewport) return true;
  return (
    cell.x + 1 > viewport.x &&
    cell.x < viewport.x + viewport.width &&
    cell.y + 1 > viewport.y &&
    cell.y < viewport.y + viewport.height
  );
};

const terrainOverlayRate = (cell: SceneTerrainCell): number =>
  cell.rate ?? TERRAIN_DEFAULT_STYLING[cell.type]?.rate ?? TERRAIN_DEFAULT_RATE;

// The visible fog cells of all fogged rooms: one grid scan collects each
// discovered cell whose grid letter carries fog options, together with
// the letter so renderers can group cells into whole-room shapes.
const collectFogCells = (
  dungeon: SceneDungeonView,
  debugMode: boolean,
  viewport?: LightViewport,
): { position: ScenePoint; room: string; options: SceneFogOptions }[] => {
  const fog = dungeon.layout.roomFog;
  if (!fog) return [];
  const cells: {
    position: ScenePoint;
    room: string;
    options: SceneFogOptions;
  }[] = [];
  dungeon.layout.grid.forEach((row, y) => {
    toArray(row).forEach((letter: string, x: number) => {
      const options = fog[letter];
      if (
        options &&
        (debugMode || isDiscovered(dungeon, x, y)) &&
        cellInViewport({ x, y }, viewport)
      ) {
        cells.push({ position: { x, y }, room: letter, options });
      }
    });
  });
  return cells;
};

// Whether any animated terrain or fog overlay is visible, and so the
// dynamic layer needs continuous re-rendering.
export const hasAnimatedTerrainEffects = (
  dungeon: SceneDungeonView,
  debugMode: boolean,
  viewport?: LightViewport,
): boolean =>
  (dungeon.layout.terrain ?? []).some(
    (cell) =>
      isAnimatedTerrainType(cell.type) &&
      (debugMode || isDiscovered(dungeon, cell.position.x, cell.position.y)) &&
      cellInViewport(cell.position, viewport),
  ) || collectFogCells(dungeon, debugMode, viewport).length > 0;

// Travelling wave crests: two translucent lines drift down the water
// cell, fading in and out, wiggling slightly to read as ripples.
// Traces one horizontal water wave: a sine sampled across the cell width,
// so the crest reads as a ripple instead of a straight line.
const strokeWaterWave = (
  ctx: CanvasRenderingContext2D,
  x0: number,
  yBase: number,
  cellSize: number,
  amplitude: number,
  wavelength: number,
  phase: number,
  style: string,
  lineWidth: number,
): void => {
  const SEGMENTS = 6;
  ctx.strokeStyle = style;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  for (let segment = 0; segment <= SEGMENTS; segment++) {
    const px = x0 + (segment / SEGMENTS) * cellSize;
    const py =
      yBase +
      Math.sin(((px - x0) / wavelength) * Math.PI * 2 + phase) * amplitude;
    if (segment === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.stroke();
};

// Three wave bands drift down the cell at staggered depths and speeds —
// the back bands slower and dimmer, giving a parallax feel — each fading
// in and out as it travels. Every crest is followed by a darker trough
// line, so the water reads as lit ripples with shadowed valleys.
const renderWaterShimmer = (
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  cell: SceneTerrainCell,
  timeMs: number,
): void => {
  const rate = terrainOverlayRate(cell);
  const t = timeMs / 1000;
  const x0 = cell.position.x * cellSize;
  const y0 = cell.position.y * cellSize;
  for (let band = 0; band < 3; band++) {
    const phase = cellHash(cell.position.x, cell.position.y, band);
    // Back bands travel down more slowly: parallax between the layers.
    const progress = fract(t * rate * (1 - band * 0.22) + phase);
    const alpha = Math.sin(Math.PI * progress) * (0.32 - band * 0.09);
    if (alpha <= 0.01) continue;
    const bandY = y0 + progress * cellSize;
    const amplitude = cellSize * (0.07 - band * 0.015);
    const wavelength = cellSize * (0.85 + band * 0.3);
    // The ripple pattern travels sideways, phase-shifted per cell and band.
    const ripplePhase = 2 * Math.PI * (t * (0.6 + band * 0.2) + phase);
    strokeWaterWave(
      ctx,
      x0,
      bandY,
      cellSize,
      amplitude,
      wavelength,
      ripplePhase,
      `rgba(235,247,255,${alpha.toFixed(3)})`,
      1.5 + (band === 0 ? 1 : 0),
    );
    // Shadowed trough trailing the crest.
    strokeWaterWave(
      ctx,
      x0,
      bandY + cellSize * 0.22,
      cellSize,
      amplitude * 0.8,
      wavelength,
      ripplePhase + 0.6,
      `rgba(8,30,52,${(alpha * 0.55).toFixed(3)})`,
      2,
    );
  }
};

// The lava cell breathes: a bright overlay pulses over the base fill,
// dark crust spots sit nearly still in the molten material — standing out
// most when the glow ebbs — and two hotspots drift slowly between them.
const renderLavaPulse = (
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  cell: SceneTerrainCell,
  timeMs: number,
): void => {
  const rate = terrainOverlayRate(cell);
  const t = (timeMs / 1000) * rate;
  const glow =
    0.5 +
    0.5 *
      Math.sin(2 * Math.PI * (t + cellHash(cell.position.x, cell.position.y)));
  const x = cell.position.x * cellSize;
  const y = cell.position.y * cellSize;
  ctx.globalAlpha = 0.1 + 0.14 * glow;
  ctx.fillStyle = '#ff8c1a';
  ctx.fillRect(x, y, cellSize, cellSize);
  // Dark crust spots: cooled blotches in the molten pool. They wander a
  // fraction of a cell and swell slightly, but never leave their spot —
  // unlike the hotspots, they anchor the motion.
  for (let spot = 0; spot < 3; spot++) {
    const spotPhase = cellHash(cell.position.x, cell.position.y, spot + 1);
    const driftX = 0.05 * Math.sin(2 * Math.PI * (t * 0.35 + spotPhase));
    const driftY = 0.05 * Math.cos(2 * Math.PI * (t * 0.3 + spotPhase * 0.618));
    const sx = x + (0.15 + 0.6 * fract(spotPhase * 1.618) + driftX) * cellSize;
    const sy = y + (0.15 + 0.6 * fract(spotPhase * 2.414) + driftY) * cellSize;
    const radius =
      cellSize *
      (0.08 + 0.05 * fract(spotPhase * 3.303)) *
      (0.9 + 0.2 * (1 - glow));
    ctx.globalAlpha = 0.42 + 0.16 * (1 - glow);
    ctx.fillStyle = '#4a0e02';
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let spot = 0; spot < 2; spot++) {
    const spotPhase = cellHash(cell.position.x, cell.position.y, spot + 4);
    const drift = Math.sin(2 * Math.PI * (t * 0.6 + spotPhase));
    const sx = x + (0.3 + 0.4 * fract(spotPhase) + 0.12 * drift) * cellSize;
    const sy =
      y + (0.3 + 0.4 * fract(spotPhase * 0.618) - 0.12 * drift) * cellSize;
    ctx.globalAlpha = 0.16 + 0.2 * glow;
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(sx, sy, cellSize * 0.13, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
};

// Animated material overlays for discovered terrain cells, drawn on the
// dynamic layer above the static base fill and below the actors, so
// figures wading in the water stand on top of the shimmer. The ambient
// darkness veil applies afterwards, keeping unlit terrain dark.
export const renderTerrainAnimation = (
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  dungeon: SceneDungeonView,
  debugMode: boolean,
  timeMs: number,
  viewport?: LightViewport,
): void => {
  (dungeon.layout.terrain ?? [])
    .filter(
      (cell) =>
        isAnimatedTerrainType(cell.type) &&
        (debugMode ||
          isDiscovered(dungeon, cell.position.x, cell.position.y)) &&
        cellInViewport(cell.position, viewport),
    )
    .forEach((cell) => {
      if (cell.type === TerrainType.WATER) {
        renderWaterShimmer(ctx, cellSize, cell, timeMs);
      } else {
        renderLavaPulse(ctx, cellSize, cell, timeMs);
      }
    });
};

// The blur radius of a fog cloud's edges, in pixels. `softness` 0 keeps
// hard cell edges; 1 feathers the cloud roughly half a cell out and in.
const fogEdgeBlurPx = (options: SceneFogOptions, cellSize: number): number =>
  Math.max(
    0,
    Math.round((options.softness ?? DEFAULT_FOG_SOFTNESS) * 0.3 * cellSize),
  );

// Traces a whole room's fog cells as one path on the context, so a single
// fill (and so a single blur pass) covers the union of the cells — solid
// inside, soft only at the room's boundary.
const traceRoomPath = (
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  cells: { position: ScenePoint }[],
): void => {
  ctx.beginPath();
  cells.forEach(({ position }) => {
    ctx.rect(position.x * cellSize, position.y * cellSize, cellSize, cellSize);
  });
};

// The fog rooms currently relevant for rendering, grouped by grid letter.
const groupFogRooms = (
  dungeon: SceneDungeonView,
  debugMode: boolean,
  viewport?: LightViewport,
): Map<string, { position: ScenePoint; options: SceneFogOptions }[]> => {
  const rooms = new Map<
    string,
    { position: ScenePoint; options: SceneFogOptions }[]
  >();
  collectFogCells(dungeon, debugMode, viewport).forEach(
    ({ position, room, options }) => {
      const group = rooms.get(room) ?? [];
      group.push({ position, options });
      rooms.set(room, group);
    },
  );
  return rooms;
};

// --- Fog cloud caching -----------------------------------------------------

// The blurred fog cloud of each room — the visible fill and the light-dim
// mask — is rasterized once per fog state into an offscreen canvas and then
// only blitted with the animated alpha. This keeps the canvas blur filter,
// by far the most expensive part of fog rendering, off the per-frame path:
// a fogged room costs two drawImage calls per frame instead of two
// blurred fills. Falls back to direct (per-frame blurred) rendering where
// offscreen canvases are unavailable, e.g. in the node test environment.
type FogCloudCacheEntry = {
  key: string;
  // World offset of the canvases, in pixels.
  x: number;
  y: number;
  cloud: HTMLCanvasElement;
  dim: HTMLCanvasElement;
};
const fogCloudCaches = new Map<string, FogCloudCacheEntry>();

export const clearFogCloudCaches = (): void => fogCloudCaches.clear();

const canBuildOffscreenCanvas = (): boolean =>
  typeof document !== 'undefined' &&
  typeof document.createElement === 'function';

// Everything that changes a room's fog cloud: the room, its fog options
// (runtime fog fills mutate these), the discovered cells it covers, the
// grid itself (collapses rewrite room letters) and the cell size.
const fogCloudCacheKey = (
  dungeon: SceneDungeonView,
  room: string,
  cellSize: number,
  debugMode: boolean,
): string =>
  `${dungeon.name}|${room}|${cellSize}|${debugMode ? 'd' : 'n'}|${
    dungeon.discoveredRooms.includes(room) ? 'd' : 'n'
  }|${dungeon.layout.grid.join('')}|${JSON.stringify(
    dungeon.layout.roomFog?.[room] ?? null,
  )}`;

const buildFogCloudCanvas = (
  cells: { position: ScenePoint }[],
  fillStyle: string,
  blurPx: number,
  cellSize: number,
  minX: number,
  minY: number,
  width: number,
  height: number,
): HTMLCanvasElement | null => {
  if (!canBuildOffscreenCanvas()) return null;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const cloudCtx = canvas.getContext('2d');
  if (!cloudCtx) return null;
  if (blurPx > 0) {
    cloudCtx.filter = `blur(${blurPx}px)`;
  }
  cloudCtx.fillStyle = fillStyle;
  cloudCtx.beginPath();
  cells.forEach(({ position }) => {
    cloudCtx.rect(
      (position.x - minX) * cellSize,
      (position.y - minY) * cellSize,
      cellSize,
      cellSize,
    );
  });
  cloudCtx.fill();
  return canvas;
};

// All discovered (or debug-visible) cells of one room letter, independent
// of the viewport: the cached fog cloud covers the whole visible room, so
// its pixels — and so its cache key — stay valid across pans.
const collectRoomFogCells = (
  dungeon: SceneDungeonView,
  room: string,
  debugMode: boolean,
): ScenePoint[] => {
  const cells: ScenePoint[] = [];
  dungeon.layout.grid.forEach((row, y) => {
    toArray(row).forEach((letter: string, x: number) => {
      if (letter === room && (debugMode || isDiscovered(dungeon, x, y))) {
        cells.push({ x, y });
      }
    });
  });
  return cells;
};

const fogCloudFor = (
  dungeon: SceneDungeonView,
  room: string,
  options: SceneFogOptions,
  cellSize: number,
  debugMode: boolean,
): FogCloudCacheEntry | null => {
  if (!canBuildOffscreenCanvas()) return null;
  const key = fogCloudCacheKey(dungeon, room, cellSize, debugMode);
  const cached = fogCloudCaches.get(room);
  if (cached && cached.key === key) return cached;

  // The cloud is built from every visible cell of the room, not the
  // viewport-culled subset: the cache key does not include the viewport,
  // so the cached pixels must not depend on it either. Callers still use
  // the viewport to decide which rooms render at all.
  const cells = collectRoomFogCells(dungeon, room, debugMode).map(
    (position) => ({
      position,
    }),
  );
  if (cells.length === 0) return null;

  const minX = Math.min(...cells.map(({ position }) => position.x));
  const minY = Math.min(...cells.map(({ position }) => position.y));
  const maxX = Math.max(...cells.map(({ position }) => position.x));
  const maxY = Math.max(...cells.map(({ position }) => position.y));
  const blurPx = fogEdgeBlurPx(options, cellSize);
  const cloud = buildFogCloudCanvas(
    cells,
    options.color ?? DEFAULT_FOG_COLOR,
    blurPx,
    cellSize,
    minX,
    minY,
    (maxX - minX + 1) * cellSize,
    (maxY - minY + 1) * cellSize,
  );
  // The dim mask is the same shape in opaque black: destination-out only
  // reads the drawn pixels' alpha.
  const dim = cloud
    ? buildFogCloudCanvas(
        cells,
        '#000000',
        blurPx,
        cellSize,
        minX,
        minY,
        (maxX - minX + 1) * cellSize,
        (maxY - minY + 1) * cellSize,
      )
    : null;
  if (!cloud || !dim) return null;
  const entry: FogCloudCacheEntry = {
    key,
    x: minX * cellSize,
    y: minY * cellSize,
    cloud,
    dim,
  };
  fogCloudCaches.set(room, entry);
  return entry;
};

// The fog cloud of a fogged room: a translucent fill over every discovered
// cell of the room, drawn as one whole-room shape so the cloud reads as a
// single body. The whole cloud slowly breathes (its alpha undulates with a
// per-room phase) and its edges blur into the room's surroundings —
// `softness` 0 keeps hard cell edges. Drawn above pillar shafts and actors
// but before the ambient darkness veil, so unlit fog darkens with the room.
export const renderRoomFog = (
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  dungeon: SceneDungeonView,
  debugMode: boolean,
  timeMs: number,
  viewport?: LightViewport,
): void => {
  const fog = dungeon.layout.roomFog;
  if (!fog) return;
  groupFogRooms(dungeon, debugMode, viewport).forEach((cells, room) => {
    const options = cells[0].options;
    const rate = options.rate ?? DEFAULT_FOG_RATE;
    const t = (timeMs / 1000) * rate;
    const alpha =
      (options.opacity ?? DEFAULT_FOG_OPACITY) *
      (0.78 +
        0.22 * Math.sin(2 * Math.PI * (t + cellHash(room.charCodeAt(0), 0))));

    // Fast path: blit the cached blurred cloud with the breathing alpha.
    const cache = fogCloudFor(dungeon, room, options, cellSize, debugMode);
    if (cache) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(cache.cloud, cache.x, cache.y);
      ctx.restore();
      return;
    }

    // Direct path (no offscreen canvases): the blurred fill itself.
    const blurPx = fogEdgeBlurPx(options, cellSize);
    ctx.save();
    if (blurPx > 0) {
      // Same graceful degradation as the light glow: browsers without
      // canvas filter support ignore the assignment, leaving hard edges.
      ctx.filter = `blur(${blurPx}px)`;
    }
    ctx.globalAlpha = alpha;
    ctx.fillStyle = options.color ?? DEFAULT_FOG_COLOR;
    traceRoomPath(ctx, cellSize, cells);
    ctx.fill();
    ctx.restore();
  });
};

// Fog absorbs light: every fogged room with a density erases that
// fraction of the light mask inside the room, so glows shining into or
// standing in the fog dim, and the ambient darkness veil — which is
// punched by the same mask — closes in over the room. Rooms that block
// light entirely are handled by the ray cast (their occlusion map cells
// read as fog of war) and are skipped here. The erase uses the same
// soft whole-room shape and edge blur as the visible cloud, so the dimmed
// glow matches the fog's boundary.
export const renderFogLightDim = (
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  dungeon: SceneDungeonView,
  debugMode: boolean,
  viewport?: LightViewport,
): void => {
  const fog = dungeon.layout.roomFog;
  if (!fog) return;
  const rooms = groupFogRooms(dungeon, debugMode, viewport);
  rooms.forEach((cells, room) => {
    const options = cells[0].options;
    const density = options.density ?? DEFAULT_FOG_DENSITY;
    if (density <= 0 || options.blocksLight) {
      return;
    }

    // Fast path: erase through the cached blurred dim mask.
    const cache = fogCloudFor(dungeon, room, options, cellSize, debugMode);
    if (cache) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = density;
      ctx.drawImage(cache.dim, cache.x, cache.y);
      ctx.restore();
      return;
    }

    // Direct path (no offscreen canvases).
    const blurPx = fogEdgeBlurPx(options, cellSize);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    if (blurPx > 0) {
      ctx.filter = `blur(${blurPx}px)`;
    }
    ctx.globalAlpha = density;
    traceRoomPath(ctx, cellSize, cells);
    ctx.fill();
    ctx.restore();
  });
};

// A pillar renders in two passes. The base tile is an ordinary floor
// object and lives on the static layer (renderPillars). The shaft tile
// above it simulates height and must cover actors standing in the cell
// behind it, so it is drawn on the dynamic layer after the actors
// (renderPillarTops). Both tiles are opaque: the pillar is a physical
// occluder in the light mask, and a translucent shaft would both tint
// itself with the floor behind it and show a hard edge against the base.
export const renderPillars = (
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  cellSize: number,
  dungeon: SceneDungeonView,
  debugMode: boolean,
) => {
  dungeon.layout.pillars
    ?.filter((pillar) => isDiscovered(dungeon, pillar.x, pillar.y) || debugMode)
    ?.forEach((pillar) => {
      drawTile(
        ctx,
        ground,
        DUNGEON_TILES.PILLAR_BASE,
        cellSize,
        pillar.x,
        pillar.y,
        dungeon,
      );
    });
};

// The upper half of a pillar, rising into the cell behind it. Drawn after
// monsters and heroes so figures north of the pillar stand behind its
// shaft, and before the ambient darkness veil so unlit shafts darken like
// the rest of the scene. Fog rules match the base: only a discovered
// pillar renders its shaft.
export const renderPillarTops = (
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  cellSize: number,
  dungeon: SceneDungeonView,
  debugMode: boolean,
) => {
  dungeon.layout.pillars
    ?.filter((pillar) => isDiscovered(dungeon, pillar.x, pillar.y) || debugMode)
    ?.forEach((pillar) => {
      drawTile(
        ctx,
        ground,
        DUNGEON_TILES.PILLAR_TOP,
        cellSize,
        pillar.x,
        pillar.y - 1,
        dungeon,
      );
    });
};

export const renderPortal = (
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  dungeon: SceneDungeonView,
  debugMode: boolean,
) => {
  const portal = dungeon.portal;
  if (!portal) return;
  if (!isDiscovered(dungeon, portal.x, portal.y) && !debugMode) return;

  const centerX = portal.x * cellSize + cellSize / 2;
  const centerY = portal.y * cellSize + cellSize / 2;
  const radius = cellSize * 0.4;

  ctx.save();
  ctx.fillStyle = 'rgba(155, 89, 182, 0.35)';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(210, 170, 255, 0.9)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    const angle1 = (Math.PI / 3) * i - Math.PI / 2;
    const angle2 = (Math.PI / 3) * ((i + 2) % 6) - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(
      centerX + radius * Math.cos(angle1),
      centerY + radius * Math.sin(angle1),
    );
    ctx.lineTo(
      centerX + radius * Math.cos(angle2),
      centerY + radius * Math.sin(angle2),
    );
    ctx.stroke();
  }
  ctx.restore();
};

export const renderInteractables = (
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  cellSize: number,
  dungeon: SceneDungeonView,
  debugMode: boolean,
) => {
  dungeon.layout.interactables?.forEach((interactable) => {
    if (
      !isDiscovered(
        dungeon,
        interactable.position.x,
        interactable.position.y,
      ) &&
      !debugMode
    ) {
      return;
    }
    if (!interactable.secret) {
      ctx.fillStyle = 'rgba(50, 150, 255, 0.28)';
      ctx.fillRect(
        interactable.position.x * cellSize,
        interactable.position.y * cellSize,
        cellSize,
        cellSize,
      );
    }
    if (debugMode) {
      if (interactable.secret) {
        ctx.fillStyle = 'rgba(50, 150, 255, 0.28)';
        ctx.fillRect(
          interactable.position.x * cellSize,
          interactable.position.y * cellSize,
          cellSize,
          cellSize,
        );
      }
      ctx.fillStyle = 'cyan';
      ctx.font = '10px Arial';
      ctx.fillText(
        interactable.effect,
        interactable.position.x * cellSize + 2,
        interactable.position.y * cellSize + 12,
      );
    }
  });
};

const randomFloorTileCoordinates = (seed: number): TileRef => {
  if (seed / 100 > 2) {
    return DUNGEON_TILES.FLOOR_E;
  } else if (seed / 100 > 1.8) {
    return DUNGEON_TILES.FLOOR_C;
  } else if (seed / 100 > 1) {
    return DUNGEON_TILES.FLOOR_B;
  } else if (seed / 100 === 1) {
    return DUNGEON_TILES.FLOOR_D;
  } else {
    return DUNGEON_TILES.FLOOR_A;
  }
};

const renderFloor = (
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  dungeon: SceneDungeonView,
  cell: string,
  x: number,
  y: number,
  cellSize: number,
) => {
  if (notGround(cell, dungeon)) {
    if (cell === COLLAPSED) {
      drawTile(ctx, ground, DUNGEON_TILES.FLOOR_A, cellSize, x, y, dungeon);
      drawTile(ctx, ground, DUNGEON_TILES.RUBBLE, cellSize, x, y, dungeon);
    } else {
      const corner = isCornerWall(x, y, dungeon);
      if (corner !== CornerType.NOT_CORNER) {
        drawCornerTile(ctx, ground, corner, cellSize, x, y, dungeon);
      } else {
        const vertical = isVerticalWall(x, y, dungeon);
        const horizontal = isHorizontalWall(x, y, dungeon);
        if (horizontal !== 'none' && vertical === 'none') {
          if (horizontal === 'up') {
            drawTile(
              ctx,
              ground,
              DUNGEON_TILES.WALL_H_UP,
              cellSize,
              x,
              y,
              dungeon,
            );
          } else if (horizontal === 'down') {
            drawTile(
              ctx,
              ground,
              DUNGEON_TILES.WALL_H_DOWN,
              cellSize,
              x,
              y,
              dungeon,
            );
          } else {
            drawTile(
              ctx,
              ground,
              DUNGEON_TILES.WALL_H_BOTH,
              cellSize,
              x,
              y,
              dungeon,
            );
          }
        } else if (vertical !== 'none') {
          if (vertical === 'left') {
            drawTile(
              ctx,
              ground,
              DUNGEON_TILES.WALL_V_LEFT,
              cellSize,
              x,
              y,
              dungeon,
            );
          } else if (vertical === 'right') {
            drawTile(
              ctx,
              ground,
              DUNGEON_TILES.WALL_V_RIGHT,
              cellSize,
              x,
              y,
              dungeon,
            );
          } else {
            drawTile(
              ctx,
              ground,
              DUNGEON_TILES.WALL_V_BOTH,
              cellSize,
              x,
              y,
              dungeon,
            );
          }
        }
      }
    }
  } else if (!isEmpty(cell, dungeon)) {
    // Ordinary floor
    const seed = (x + y) * 10;
    const tile = randomFloorTileCoordinates(seed);
    drawTile(ctx, ground, tile, cellSize, x, y, dungeon);
  } else {
    renderHiddenCell(ctx, x, y, cellSize);
  }
};

const isHorizontalWall = (
  x: number,
  y: number,
  dungeon: SceneDungeonView,
): string => {
  // Classify against the sealed grid: a hidden cell sealed behind a closed
  // door renders as a wall piece here, so it must classify as one
  const grid = sealedGrid(dungeon);
  const cell = findCell(grid, x, y);
  if (cell !== WALL && cell !== SEALED_DOOR) {
    return 'none';
  }
  if (x === 0 || x === grid[0].length - 1) {
    return 'none';
  }
  const cellLeft = findCell(grid, x - 1, y);
  const cellRight = findCell(grid, x + 1, y);
  const isHorizontal =
    cellLeft === WALL ||
    isEmpty(cellLeft, dungeon) ||
    cellRight === WALL ||
    isEmpty(cellRight, dungeon);
  if (isHorizontal) {
    const cellAbove = findCell(grid, x, y - 1);
    const cellBelow = findCell(grid, x, y + 1);
    if (isRoom(cellAbove, dungeon) && isRoom(cellBelow, dungeon)) {
      return 'both';
    } else if (isRoom(cellAbove, dungeon)) {
      return 'up';
    } else if (isRoom(cellBelow, dungeon)) {
      return 'down';
    } else {
      return 'none';
    }
  } else {
    return 'none';
  }
};

const isVerticalWall = (
  x: number,
  y: number,
  dungeon: SceneDungeonView,
): string => {
  // Classify against the sealed grid: a hidden cell sealed behind a closed
  // door renders as a wall piece here, so it must classify as one
  const grid = sealedGrid(dungeon);
  const cell = findCell(grid, x, y);
  if (cell !== WALL && cell !== SEALED_DOOR) {
    return 'none';
  }
  if (y === 0 || y === grid.length - 1) {
    return 'none';
  }

  const cellAbove = findCell(grid, x, y - 1);
  const cellBelow = findCell(grid, x, y + 1);
  const isVertical =
    cellAbove === WALL ||
    isEmpty(cellAbove, dungeon) ||
    cellBelow === WALL ||
    isEmpty(cellBelow, dungeon);
  if (isVertical) {
    const cellLeft = findCell(grid, x - 1, y);
    const cellRight = findCell(grid, x + 1, y);
    if (isRoom(cellLeft, dungeon) && isRoom(cellRight, dungeon)) {
      return 'both';
    } else if (isRoom(cellLeft, dungeon)) {
      return 'left';
    } else if (isRoom(cellRight, dungeon)) {
      return 'right';
    } else {
      return 'none';
    }
  } else {
    return 'none';
  }
};

// A closed door is drawn as wall pieces (renderClosedDoor /
// renderClosedHiddenDoor plus the wall pieces the sealed cells classify as),
// sealing the passage until it is opened. The corner classifier must see the
// same sealed geometry from both sides: whichever side of the doorway is not
// discovered yet has its cell and the two cells flanking the doorway replaced
// with the SEALED_DOOR marker. Sealed cells count as wall for closed sides —
// a corridor end gets its corner caps exactly like a dead end, and the corner
// cells beside a door set in a solid wall render their caps too — but never
// as the stem of a junction, since a sealed doorway renders as a door rather
// than rock. Invisible sealed cells (no discovered floor bordering them)
// resolve to unknown during classification, so sealing never fabricates
// junction shapes on the wall pieces themselves.
export const sealedCornerGrid = (dungeon: SceneDungeonView): string[] => {
  const grid = [...dungeon.layout.grid];
  const sealable = (cell: string) =>
    Boolean(cell) &&
    cell !== WALL &&
    cell !== COLLAPSED &&
    !isRoomDiscovered(dungeon, cell);
  dungeon.layout.doors.forEach((door) => {
    if (door.open) return;
    const farX =
      door.side === 'Right'
        ? door.x + 1
        : door.side === 'Left'
          ? door.x - 1
          : door.x;
    const farY =
      door.side === 'Down'
        ? door.y + 1
        : door.side === 'Up'
          ? door.y - 1
          : door.y;
    const farCell = findCell(grid, farX, farY);
    const nearCell = findCell(grid, door.x, door.y);
    const farDiscovered = farCell !== '' && !isEmpty(farCell, dungeon);
    const nearDiscovered = nearCell !== '' && !isEmpty(nearCell, dungeon);
    const flankX = door.side === 'Up' || door.side === 'Down' ? 1 : 0;
    const flankY = door.side === 'Left' || door.side === 'Right' ? 1 : 0;
    // Seal whichever side of the doorway is still undiscovered: the far side
    // when approaching the door from the front, the near side when it is
    // approached from behind
    const sealed: [number, number][] = [];
    if (!farDiscovered) {
      sealed.push([farX, farY]);
      sealed.push([farX - flankX, farY - flankY]);
      sealed.push([farX + flankX, farY + flankY]);
    }
    if (!nearDiscovered) {
      sealed.push([door.x, door.y]);
      sealed.push([door.x - flankX, door.y - flankY]);
      sealed.push([door.x + flankX, door.y + flankY]);
    }
    sealed.forEach(([x, y]) => {
      if (!sealable(findCell(grid, x, y))) return;
      grid[y] = grid[y].slice(0, x) + SEALED_DOOR + grid[y].slice(x + 1);
    });
  });
  return grid;
};

// Everything that can change the visible corner classification or the sealed
// grid, hashed into a shared cache key.
const visibleStateKey = (dungeon: SceneDungeonView): string => {
  const doors = dungeon.layout.doors
    .map((door) => (door.open ? '1' : '0'))
    .join('');
  return `${dungeon.name}|${dungeon.discoveredRooms.join(',')}|${doors}`;
};

// The sealed classification grid, from cache when the visible state has not
// changed since it was last built.
let sealedGridCache: { key: string; grid: string[] } | null = null;

const sealedGrid = (dungeon: SceneDungeonView): string[] => {
  const key = visibleStateKey(dungeon);
  if (!sealedGridCache || sealedGridCache.key !== key) {
    sealedGridCache = { key, grid: sealedCornerGrid(dungeon) };
  }
  return sealedGridCache.grid;
};

// Corners are classified against the visible dungeon: an undiscovered room
// renders as solid rock, so corners on the fog-of-war boundary look different
// from their full-layout classification, and closed doors seal their doorway
// as wall. The visible corner set depends only on the grid, the discovered
// rooms, and the door open states, so it is cached until one of them changes
// instead of being re-detected on every render.
let visibleCornersCache: { key: string; corners: SceneCorner[] } | null = null;

const visibleCorners = (dungeon: SceneDungeonView): SceneCorner[] => {
  const key = visibleStateKey(dungeon);
  if (!visibleCornersCache || visibleCornersCache.key !== key) {
    visibleCornersCache = {
      key,
      corners: autoDetectCorners(sealedGrid(dungeon), dungeon.discoveredRooms),
    };
  }
  return visibleCornersCache.corners;
};

const isCornerWall = (
  x: number,
  y: number,
  dungeon: SceneDungeonView,
): string => {
  const corner = visibleCorners(dungeon).filter((corner) =>
    isSamePosition(corner.position, { x, y }),
  );
  if (corner.length === 1) {
    return corner[0].type;
  } else {
    return CornerType.NOT_CORNER;
  }
};

const notGround = (cell: string, dungeon: SceneDungeonView) =>
  isWall(cell) || (!isRoomDiscovered(dungeon, cell) && cell !== EMPTY);

const isRoom = (cell: string, dungeon: SceneDungeonView) =>
  dungeon.discoveredRooms.includes(cell);

const renderHiddenCell = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellSize: number,
) => {
  ctx.beginPath();
  ctx.strokeStyle = background;
  ctx.fillStyle = background;
  ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
  ctx.stroke();
};

const renderTrapDoor = (
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  cellSize: number,
  secret: SceneSecret,
) => {
  const x = secret.position.x;
  const y = secret.position.y;
  drawTileRef(
    ctx,
    ground,
    DUNGEON_TILES.TRAP_DOOR,
    x * cellSize,
    y * cellSize,
    cellSize,
    cellSize,
  );
};

const renderFoundSecret = (
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  cellSize: number,
  secret: SceneSecret,
) => {
  const x = secret.position.x;
  const y = secret.position.y;
  drawTileRef(
    ctx,
    ground,
    DUNGEON_TILES.SECRET_FOUND,
    x * cellSize,
    y * cellSize,
    cellSize,
    cellSize,
  );
};

const renderGridLines = (
  ctx: CanvasRenderingContext2D,
  cell: string,
  dungeon: SceneDungeonView,
  x: number,
  y: number,
  cellSize: number,
  debugMode: boolean,
) => {
  if (!debugMode && (isEmpty(cell, dungeon) || cell === WALL)) return;
  ctx.beginPath();
  ctx.strokeStyle = 'black';
  ctx.rect(x * cellSize, y * cellSize, cellSize, cellSize);
  if (debugMode) {
    const horizontalWall = isHorizontalWall(x, y, dungeon);
    const verticalWall = isVerticalWall(x, y, dungeon);
    const isCorner = isCornerWall(x, y, dungeon);
    let text = `${cell}: ${x},${y}`;
    if (isCorner !== CornerType.NOT_CORNER) {
      text += ` C ${isCorner.valueOf()}`;
    } else if (horizontalWall != 'none') {
      text += ' H ' + horizontalWall[0];
    } else if (verticalWall !== 'none') {
      text += ' V ' + verticalWall[0];
    }
    ctx.font = '7px Arial';
    ctx.fillText(text, x * cellSize + 3, y * cellSize + (cellSize - 3));
  }
  ctx.stroke();
};

// The sealed far side of a closed door renders as wall pieces. Where the
// corner classifier already renders a corner piece on such a cell (e.g. the
// cap of the wall run beside the door), the door paint must not overwrite
// it with the plain wall piece.
const drawDoorWallTile = (
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  tile: TileRef,
  cellSize: number,
  x: number,
  y: number,
  dungeon: SceneDungeonView,
) => {
  if (isCornerWall(x, y, dungeon) !== CornerType.NOT_CORNER) return;
  drawTile(ctx, ground, tile, cellSize, x, y, dungeon);
};

const renderClosedHiddenDoor = (
  door: SceneDoor,
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  cellSize: number,
  dungeon: SceneDungeonView,
) => {
  switch (door.side) {
    case 'Right': {
      drawDoorWallTile(
        ctx,
        ground,
        DUNGEON_TILES.WALL_V_LEFT,
        cellSize,
        door.x + 1,
        door.y,
        dungeon,
      );
      drawDoorWallTile(
        ctx,
        ground,
        DUNGEON_TILES.WALL_V_LEFT,
        cellSize,
        door.x + 1,
        door.y - 1,
        dungeon,
      );
      drawDoorWallTile(
        ctx,
        ground,
        DUNGEON_TILES.WALL_V_LEFT,
        cellSize,
        door.x + 1,
        door.y + 1,
        dungeon,
      );
      break;
    }
    case 'Left': {
      drawDoorWallTile(
        ctx,
        ground,
        DUNGEON_TILES.WALL_V_RIGHT,
        cellSize,
        door.x - 1,
        door.y,
        dungeon,
      );
      drawDoorWallTile(
        ctx,
        ground,
        DUNGEON_TILES.WALL_V_RIGHT,
        cellSize,
        door.x - 1,
        door.y - 1,
        dungeon,
      );
      drawDoorWallTile(
        ctx,
        ground,
        DUNGEON_TILES.WALL_V_RIGHT,
        cellSize,
        door.x - 1,
        door.y + 1,
        dungeon,
      );
      break;
    }
    case 'Up': {
      drawDoorWallTile(
        ctx,
        ground,
        DUNGEON_TILES.WALL_H_DOWN,
        cellSize,
        door.x,
        door.y - 1,
        dungeon,
      );
      drawDoorWallTile(
        ctx,
        ground,
        DUNGEON_TILES.WALL_H_DOWN,
        cellSize,
        door.x + 1,
        door.y - 1,
        dungeon,
      );
      drawDoorWallTile(
        ctx,
        ground,
        DUNGEON_TILES.WALL_H_DOWN,
        cellSize,
        door.x - 1,
        door.y - 1,
        dungeon,
      );
      break;
    }
    case 'Down': {
      drawDoorWallTile(
        ctx,
        ground,
        DUNGEON_TILES.WALL_BELOW_DOOR,
        cellSize,
        door.x,
        door.y + 1,
        dungeon,
      );
      drawDoorWallTile(
        ctx,
        ground,
        DUNGEON_TILES.WALL_BELOW_DOOR,
        cellSize,
        door.x + 1,
        door.y + 1,
        dungeon,
      );
      drawDoorWallTile(
        ctx,
        ground,
        DUNGEON_TILES.WALL_BELOW_DOOR,
        cellSize,
        door.x - 1,
        door.y + 1,
        dungeon,
      );
      break;
    }
  }
};

const renderClosedDoor = (
  door: SceneDoor,
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  cellSize: number,
  dungeon: SceneDungeonView,
) => {
  switch (door.side) {
    case 'Right': {
      drawDoorWallTile(
        ctx,
        ground,
        DUNGEON_TILES.WALL_V_LEFT,
        cellSize,
        door.x + 1,
        door.y,
        dungeon,
      );
      break;
    }
    case 'Left': {
      drawDoorWallTile(
        ctx,
        ground,
        DUNGEON_TILES.WALL_V_RIGHT,
        cellSize,
        door.x - 1,
        door.y,
        dungeon,
      );
      break;
    }
    case 'Up': {
      drawDoorWallTile(
        ctx,
        ground,
        DUNGEON_TILES.WALL_H_DOWN,
        cellSize,
        door.x,
        door.y - 1,
        dungeon,
      );
      break;
    }
    case 'Down': {
      drawDoorWallTile(
        ctx,
        ground,
        DUNGEON_TILES.WALL_BELOW_DOOR,
        cellSize,
        door.x,
        door.y + 1,
        dungeon,
      );
      break;
    }
  }
};

// Door leaf palette: warm wood reads as an ordinary unlocked door, cold iron
// as a locked one, and brass fittings carry the lock detail.
const DOOR_WOOD = '#8a5a2b';
const DOOR_WOOD_SEAM = '#6b4220';
const DOOR_WOOD_EDGE = '#43290f';
const DOOR_LOCKED = '#5a5a66';
const DOOR_LOCKED_SEAM = '#43434e';
const DOOR_LOCKED_EDGE = '#2b2b34';
const DOOR_BRASS = '#d9a83f';
const DOOR_HOLE = '#1f1608';
// A faint warm outline painted just around the leaf, so the door reads
// against the grey of the surrounding wall pieces. Translucent enough to
// stay unobtrusive where the door is easy to see, bright enough to pick
// the leaf out of the wall in a dark corridor.
const DOOR_OUTLINE = 'rgba(230, 206, 158, 0.4)';

const doorThickness = (cellSize: number): number =>
  Math.max(5, Math.round(cellSize / 6));

// The closed door leaf on the shared edge between the two door cells. The
// leaf is thick enough to read clearly, is textured with seams and shaded
// edges, and shows the lock state at a glance: iron with a brass keyhole
// plate when locked, wood with a brass handle when unlocked.
const drawClosedDoor = (
  ctx: CanvasRenderingContext2D,
  door: SceneDoor,
  cellSize: number,
) => {
  const thickness = doorThickness(cellSize);
  const half = Math.floor(thickness / 2);
  const vertical = door.side === 'Right' || door.side === 'Left';
  const edgeX = door.x * cellSize + (door.side === 'Right' ? cellSize : 0);
  const edgeY = door.y * cellSize + (door.side === 'Down' ? cellSize : 0);
  const leafX = vertical ? edgeX - half : door.x * cellSize;
  const leafY = vertical ? door.y * cellSize : edgeY - half;
  const leafW = vertical ? thickness : cellSize;
  const leafH = vertical ? cellSize : thickness;
  const midX = door.x * cellSize + cellSize / 2;
  const midY = door.y * cellSize + cellSize / 2;

  // Contrasting outline around the leaf, painted first so the leaf and
  // its shading cover everything but the one-pixel halo.
  ctx.fillStyle = DOOR_OUTLINE;
  ctx.fillRect(leafX - 1, leafY - 1, leafW + 2, leafH + 2);

  // Leaf base and shaded long edges
  ctx.fillStyle = door.locked ? DOOR_LOCKED : DOOR_WOOD;
  ctx.fillRect(leafX, leafY, leafW, leafH);
  ctx.fillStyle = door.locked ? DOOR_LOCKED_EDGE : DOOR_WOOD_EDGE;
  if (vertical) {
    ctx.fillRect(leafX, leafY, 1, cellSize);
    ctx.fillRect(leafX + thickness - 1, leafY, 1, cellSize);
  } else {
    ctx.fillRect(leafX, leafY, cellSize, 1);
    ctx.fillRect(leafX, leafY + thickness - 1, cellSize, 1);
  }

  // Seam texture at every quarter along the leaf
  ctx.fillStyle = door.locked ? DOOR_LOCKED_SEAM : DOOR_WOOD_SEAM;
  for (let i = 1; i <= 3; i++) {
    const along = Math.round((i * cellSize) / 4);
    if (vertical) {
      ctx.fillRect(leafX, door.y * cellSize + along, thickness, 1);
    } else {
      ctx.fillRect(door.x * cellSize + along, leafY, 1, thickness);
    }
  }

  // Brass fitting in the middle of the leaf
  const fittingX = vertical ? edgeX : midX;
  const fittingY = vertical ? midY : edgeY;
  if (door.locked) {
    // Keyhole plate with a dark hole: a round chamber above a slot
    const plateLen = Math.max(10, Math.round(cellSize / 4));
    ctx.fillStyle = DOOR_BRASS;
    if (vertical) {
      ctx.fillRect(edgeX - half, midY - plateLen / 2, thickness, plateLen);
    } else {
      ctx.fillRect(midX - plateLen / 2, edgeY - half, plateLen, thickness);
    }
    ctx.fillStyle = DOOR_HOLE;
    if (vertical) {
      ctx.fillRect(fittingX - 1, midY - 3, 2, 2);
      ctx.fillRect(fittingX - 1, midY - 1, 2, 4);
    } else {
      ctx.fillRect(midX - 3, fittingY - 1, 2, 2);
      ctx.fillRect(midX - 1, fittingY - 1, 4, 2);
    }
  } else {
    // Ring handle: a brass plate with a dark centre
    ctx.fillStyle = DOOR_BRASS;
    ctx.fillRect(fittingX - 2, fittingY - 2, 4, 4);
    ctx.fillStyle = DOOR_HOLE;
    ctx.fillRect(fittingX - 1, fittingY - 1, 2, 2);
  }
};

const drawDoorEdgeStrip = (
  ctx: CanvasRenderingContext2D,
  door: SceneDoor,
  cellSize: number,
) => {
  const thickness = doorThickness(cellSize);
  const half = Math.floor(thickness / 2);
  switch (door.side) {
    case 'Right': {
      ctx.fillRect(
        door.x * cellSize + (cellSize - half),
        door.y * cellSize,
        thickness,
        cellSize,
      );
      break;
    }
    case 'Left': {
      ctx.fillRect(
        door.x * cellSize - half,
        door.y * cellSize,
        thickness,
        cellSize,
      );
      break;
    }
    case 'Up': {
      ctx.fillRect(
        door.x * cellSize,
        door.y * cellSize - half,
        cellSize,
        thickness,
      );
      break;
    }
    case 'Down': {
      ctx.fillRect(
        door.x * cellSize,
        door.y * cellSize + (cellSize - 2),
        cellSize,
        4,
      );
      break;
    }
  }
};

const renderDoor = (
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  cellSize: number,
  dungeon: SceneDungeonView,
  door: SceneDoor,
  debugMode: boolean,
) => {
  const cell = dungeon.layout.grid[door.y][door.x];
  const farOffsetX = door.side === 'Right' ? 1 : door.side === 'Left' ? -1 : 0;
  const farOffsetY = door.side === 'Down' ? 1 : door.side === 'Up' ? -1 : 0;
  const farCell = findCell(
    dungeon.layout.grid,
    door.x + farOffsetX,
    door.y + farOffsetY,
  );
  const nearDiscovered = !isEmpty(cell, dungeon);
  const farDiscovered = farCell !== '' && !isEmpty(farCell, dungeon);

  // The wall tiles are painted on the far side of the door edge. Only do so
  // while that side is undiscovered — otherwise they would cover floor the
  // player can already see and stand on. Once the far side is discovered the
  // door itself is drawn on the shared edge instead, so it renders correctly
  // from both sides.
  if (door && !door.open && !farDiscovered) {
    if (door.hidden) {
      renderClosedHiddenDoor(door, ctx, ground, cellSize, dungeon);
    } else {
      renderClosedDoor(door, ctx, ground, cellSize, dungeon);
    }
  }
  if (door && !door.hidden && !door.open && (nearDiscovered || farDiscovered)) {
    if (door.side === 'Up' && !farDiscovered) {
      drawTile(
        ctx,
        ground,
        DUNGEON_TILES.DOOR_TOP,
        cellSize,
        door.x,
        door.y - 1,
        dungeon,
      );
    }
    drawClosedDoor(ctx, door, cellSize);
    if (door.locked && debugMode) {
      ctx.fillStyle = 'grey';
      switch (door.side) {
        case 'Right': {
          ctx.fillRect(
            door.x * cellSize + (cellSize - 4),
            door.y * cellSize + (cellSize / 2 - 4),
            8,
            8,
          );
          break;
        }
        case 'Left': {
          ctx.fillRect(
            door.x * cellSize - 4,
            door.y * cellSize + (cellSize / 2 - 4),
            8,
            8,
          );
          break;
        }
        case 'Up': {
          ctx.fillRect(
            door.x * cellSize + (cellSize / 2 - 4),
            door.y * cellSize - 4,
            8,
            8,
          );
          break;
        }
        case 'Down': {
          ctx.fillRect(
            door.x * cellSize + (cellSize / 2 - 4),
            door.y * cellSize + (cellSize - 4),
            8,
            8,
          );
          break;
        }
      }
    }
  }
  if (door && door.hidden && !door.open && nearDiscovered && farDiscovered) {
    // A hidden door between two discovered rooms would otherwise be
    // invisible while still blocking movement; mark the sealed edge.
    ctx.fillStyle = 'darkgrey';
    drawDoorEdgeStrip(ctx, door, cellSize);
  }
  if (debugMode && !isEmpty(cell, dungeon)) {
    ctx.fillStyle = 'black';
    ctx.font = '12px Arial';
    ctx.fillText(
      `[${door.hidden ? 'H' : '-'}/${
        door.trapped ? `T${door.trapAttacks}` : '-'
      }/${door.locked ? 'L' : '-'}]`,
      door.x * cellSize,
      door.y * cellSize + 10,
    );
    ctx.fillStyle = 'rgba(50, 255, 255, 0.28)';
    ctx.fillRect(door.x * cellSize, door.y * cellSize, cellSize, cellSize);
  }
};

const isWall = (cell: string) => cell === WALL;

const isEmpty = (cell: string, dungeon: SceneDungeonView) =>
  cell === EMPTY || !isRoomDiscovered(dungeon, cell);

const neighbourOf = (
  x: number,
  y: number,
  value: string,
  dungeon: SceneDungeonView,
) => {
  if (!dungeon) return;
  const xMin = Math.max(x - 1, 0);
  const yMin = Math.max(y - 1, 0);
  const yMax = Math.min(y + 1, dungeon.layout.grid.length - 1);
  const xMax = Math.min(x + 1, dungeon.layout.grid[0].length - 1);
  for (let pX = xMin; pX <= xMax; pX++) {
    for (let pY = yMin; pY <= yMax; pY++) {
      const row = dungeon.layout.grid[pY];
      const valueAt = toArray(row)[pX];
      if (valueAt === value) return true;
    }
  }
  return false;
};
