import {
  COLLAPSED,
  CornerType,
  EMPTY,
  SEALED_DOOR,
  WALL,
  toArray,
} from '@hoard-engine/grid';
import {
  DEFAULT_WALL_COLOUR,
  background,
  drawIsoHeroOverlay,
  drawIsoWorldFrame,
  dungeonViewBackdrop,
  worldToScreen,
  type SceneActorView,
  type SceneDungeonView,
  type SceneIsoPainterView,
  type SceneIsoPitFaceView,
  type SceneIsoPitPainterView,
  type SceneIsoView,
  type SceneIsoWorldView,
  type SceneSpriteFrame,
  DUNGEON_TILES,
} from '@hoard-engine/scene';
import { CellAlignment, type Dungeon, type GameState } from '../types';
import { isDiscovered } from '../core';
import {
  buildCorpseViewModels,
  buildDecoratorViewModels,
  buildDungeonView,
  buildFoundSecretViewModels,
  buildHeroViewModels,
  buildItemViewModels,
  buildLightSpriteViewModels,
  buildMonsterViewModels,
  type GameActorView,
  type GameHeroOverlayView,
  type GameItemView,
} from '../scene/adapters';
import {
  getIsometricGraphics,
  getIsometricTileImage,
  resolveIsometricCellTileId,
  resolveIsometricChestTileId,
  resolveIsometricDecoratorTileId,
  resolveIsometricDoorTileId,
  resolveIsometricPillarTileId,
  resolveIsometricWallTileIds,
  type ResolvedIsometricGraphics,
} from './IsometricGraphics';

const ISO_WALL = 'W';
const ISO_DOOR = 'D';
const ISO_FLOOR = 'F';
const ISO_HIDDEN = 'H';
const ISO_FLOOR_OUTLINE_DEPTH_BIAS = 0.01;
const ISO_GROUND_PAINTER_DEPTH_BIAS = 0.01;
const ISO_OPEN_DOOR_DEPTH_BIAS = 0.001;
const ISOMETRIC_WALL_LIGHT_SEAM_DEVICE_PX = 1;
const ISO_FOREGROUND_WALL_OPACITY = 0.35;
type IsometricDoorSide = 'Left' | 'Right' | 'Up' | 'Down';
type IsometricWorldView = SceneIsoWorldView & {
  wallFaceHeightsPx?: (number | undefined)[][];
  openDoorCells?: { x: number; y: number }[];
};

const PIT_WALL_SOURCE_RIM = {
  north: { width: 129, height: 64 },
  west: { width: 128, height: 64 },
};

export const getIsometricTileDimensions = (
  cellSize: number,
  projection: { ax: number },
  scale: number,
  naturalWidth: number,
  naturalHeight: number,
): { width: number; height: number } => {
  const width = cellSize * projection.ax * 2 * scale;
  return { width, height: width * (naturalHeight / naturalWidth) };
};

export const getIsometricWallShape = (
  worldRows: string[],
  x: number,
  y: number,
): { north: boolean; east: boolean; south: boolean; west: boolean } => {
  const isCell = (cellX: number, cellY: number, cell: string): boolean => {
    const neighbor = toArray(worldRows[cellY] ?? '')[cellX];
    return neighbor === cell || (cell === ISO_FLOOR && neighbor === ISO_DOOR);
  };
  const wallFaces = {
    north: isCell(x, y + 1, ISO_FLOOR),
    east: isCell(x - 1, y, ISO_FLOOR),
    south: isCell(x, y - 1, ISO_FLOOR),
    west: isCell(x + 1, y, ISO_FLOOR),
  };
  if (Object.values(wallFaces).some(Boolean)) return wallFaces;

  return {
    north: isCell(x, y - 1, ISO_WALL),
    east: isCell(x + 1, y, ISO_WALL),
    south: isCell(x, y + 1, ISO_WALL),
    west: isCell(x - 1, y, ISO_WALL),
  };
};

const getIsometricWallCornerShape = (
  worldRows: string[],
  grid: string[],
  x: number,
  y: number,
  doorWallCells: Set<string>,
): string | undefined => {
  const isFloor = (cellX: number, cellY: number): boolean => {
    const cell = toArray(worldRows[cellY] ?? '')[cellX];
    return cell === ISO_FLOOR || cell === ISO_DOOR;
  };
  const isWallOrEmpty = (cellX: number, cellY: number): boolean => {
    const cell = toArray(worldRows[cellY] ?? '')[cellX];
    const sourceCell = toArray(grid[cellY] ?? '')[cellX];
    return (
      cell === ISO_WALL ||
      (cell === ISO_DOOR &&
        doorWallCells.has(`${String(cellX)},${String(cellY)}`)) ||
      ((cell === ISO_HIDDEN || cell === undefined) &&
        (sourceCell === EMPTY || sourceCell === undefined))
    );
  };
  const corners = (
    [
      [CornerType.INNER_TOP_LEFT, 1, 1],
      [CornerType.INNER_TOP_RIGHT, -1, 1],
      [CornerType.INNER_BOTTOM_LEFT, 1, -1],
      [CornerType.INNER_BOTTOM_RIGHT, -1, -1],
    ] as const
  )
    .filter(
      ([, offsetX, offsetY]) =>
        isFloor(x + offsetX, y + offsetY) &&
        isWallOrEmpty(x + offsetX, y) &&
        isWallOrEmpty(x, y + offsetY),
    )
    .map(([type]) => type);
  if (corners.length === 0) return undefined;

  const faces = (
    [
      ['n', 0, 1],
      ['e', -1, 0],
      ['s', 0, -1],
      ['w', 1, 0],
    ] as const
  )
    .filter(([, offsetX, offsetY]) => isFloor(x + offsetX, y + offsetY))
    .map(([side]) => side)
    .join('');
  return [faces, ...corners].filter(Boolean).join('+');
};

export const getIsometricDoorPlacement = (
  grid: string[],
  x: number,
  y: number,
  side: IsometricDoorSide,
): { x: number; y: number; side: IsometricDoorSide } => {
  const directions: Record<
    IsometricDoorSide,
    { x: number; y: number; flanks: { x: number; y: number }[] }
  > = {
    Left: {
      x: -1,
      y: 0,
      flanks: [
        { x: 0, y: -1 },
        { x: 0, y: 1 },
      ],
    },
    Right: {
      x: 1,
      y: 0,
      flanks: [
        { x: 0, y: -1 },
        { x: 0, y: 1 },
      ],
    },
    Up: {
      x: 0,
      y: -1,
      flanks: [
        { x: -1, y: 0 },
        { x: 1, y: 0 },
      ],
    },
    Down: {
      x: 0,
      y: 1,
      flanks: [
        { x: -1, y: 0 },
        { x: 1, y: 0 },
      ],
    },
  };
  const direction = directions[side];
  const wallCount = (cellX: number, cellY: number): number =>
    direction.flanks.filter(({ x: offsetX, y: offsetY }) => {
      const cell = toArray(grid[cellY + offsetY] ?? '')[cellX + offsetX];
      return cell === WALL || cell === COLLAPSED;
    }).length;
  const adjacentX = x + direction.x;
  const adjacentY = y + direction.y;

  if (wallCount(adjacentX, adjacentY) <= wallCount(x, y)) {
    return { x, y, side };
  }

  const oppositeSides: Record<IsometricDoorSide, IsometricDoorSide> = {
    Left: 'Right',
    Right: 'Left',
    Up: 'Down',
    Down: 'Up',
  };
  return {
    x: adjacentX,
    y: adjacentY,
    side: oppositeSides[side],
  };
};

const traceIsometricCellDiamond = (
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  cellSize: number,
  projection: { ax: number; by: number },
  beginPath = true,
): void => {
  if (beginPath) ctx.beginPath();
  ctx.moveTo(center.x, center.y - projection.by * cellSize);
  ctx.lineTo(center.x + projection.ax * cellSize, center.y);
  ctx.lineTo(center.x, center.y + projection.by * cellSize);
  ctx.lineTo(center.x - projection.ax * cellSize, center.y);
  ctx.closePath();
};

const drawIsometricCellOutline = (
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  cellSize: number,
  projection: { ax: number; by: number },
): void => {
  ctx.save();
  ctx.strokeStyle = 'rgba(25, 22, 18, 0.15)';
  ctx.lineWidth = Math.max(1, projection.ax * 1.25);
  ctx.lineJoin = 'round';
  traceIsometricCellDiamond(ctx, center, cellSize, projection);
  ctx.stroke();
  ctx.restore();
};

export const prepareDepthSortedIsometricFloorPainters = (
  world: SceneIsoWorldView,
  view: SceneIsoView,
): { world: SceneIsoWorldView; painters: SceneIsoPainterView[] } => {
  const pitCells = new Set(
    (world.pitCells ?? []).map(({ x, y }) => `${String(x)},${String(y)}`),
  );
  const painters: SceneIsoPainterView[] = [];
  const floorImages: SceneIsoPainterView[] = [];
  const floorPainters = world.floorPainters?.map((row, y) =>
    toArray(world.rows[y] ?? '').map((cell, x) => {
      const painter = row[x];
      const cellKey = `${String(x)},${String(y)}`;
      if ((cell !== ISO_FLOOR && cell !== ISO_DOOR) || pitCells.has(cellKey)) {
        return painter;
      }

      const position = painter?.position ?? {
        x: (x + 0.5) * world.cellSize,
        y: (y + 0.5) * world.cellSize,
      };
      const outlinePosition = {
        x: position.x,
        y: position.y - ISO_FLOOR_OUTLINE_DEPTH_BIAS,
      };
      const outlinePainter: SceneIsoPainterView = {
        position: outlinePosition,
        draw: (ctx) =>
          drawIsometricCellOutline(
            ctx,
            worldToScreen(view, position.x, position.y),
            world.cellSize,
            view.projection,
          ),
      };
      if (!painter) {
        painters.push(outlinePainter);
        return painter;
      }

      const overlay = world.floorOverlays?.[y]?.[x];
      painters.push(outlinePainter);
      floorImages.push({
        position,
        draw: (ctx) => {
          const center = worldToScreen(view, position.x, position.y);
          painter.draw(ctx, center);
          if (overlay) {
            ctx.save();
            ctx.globalAlpha = overlay.opacity;
            ctx.fillStyle = overlay.color;
            traceIsometricCellDiamond(
              ctx,
              center,
              world.cellSize,
              view.projection,
            );
            ctx.fill();
            ctx.restore();
          }
        },
      });
      return undefined;
    }),
  );
  const floorOverlays = world.floorOverlays?.map((row, y) =>
    toArray(world.rows[y] ?? '').map((cell, x) =>
      (cell === ISO_FLOOR || cell === ISO_DOOR) &&
      world.floorPainters?.[y]?.[x] &&
      !pitCells.has(`${String(x)},${String(y)}`)
        ? undefined
        : row[x],
    ),
  );

  floorImages.sort(
    (a, b) => a.position.x + a.position.y - b.position.x - b.position.y,
  );
  if (floorImages.length > 0) {
    // Keep floor sprites together beneath all depth-sorted outlines and objects.
    painters.push({
      position: { x: -Number.MAX_SAFE_INTEGER, y: 0 },
      draw: (ctx) => {
        floorImages.forEach((painter) =>
          painter.draw(
            ctx,
            worldToScreen(view, painter.position.x, painter.position.y),
          ),
        );
      },
    });
  }

  return {
    world: {
      ...world,
      ...(floorPainters ? { floorPainters } : {}),
      ...(floorOverlays ? { floorOverlays } : {}),
    },
    painters,
  };
};

export const prepareDepthBiasedIsometricPainters = (
  painters: SceneIsoPainterView[],
  view: SceneIsoView,
): SceneIsoPainterView[] =>
  painters.map((painter) => {
    const position = { ...painter.position };
    return {
      position: {
        x: position.x,
        y: position.y - ISO_GROUND_PAINTER_DEPTH_BIAS,
      },
      draw: (ctx) =>
        painter.draw(ctx, worldToScreen(view, position.x, position.y)),
    };
  });

export const prepareDepthSortedIsometricDoorPainters = (
  world: IsometricWorldView,
  view: SceneIsoView,
): { world: IsometricWorldView; painters: SceneIsoPainterView[] } => {
  const painters: SceneIsoPainterView[] = [];
  const openDoors = new Set(
    (world.openDoorCells ?? []).map(({ x, y }) => `${String(x)},${String(y)}`),
  );
  const pitCells = new Set(
    (world.pitCells ?? []).map(({ x, y }) => `${String(x)},${String(y)}`),
  );
  const doorPainters = world.doorPainters?.map((row, y) =>
    row.map((painter, x) => {
      const key = `${String(x)},${String(y)}`;
      if (
        !painter ||
        !openDoors.has(key) ||
        pitCells.has(key) ||
        toArray(world.rows[y] ?? '')[x] !== world.doorCell
      ) {
        return painter;
      }
      const position = painter.position;
      painters.push({
        position: {
          x: (x + 1) * world.cellSize,
          y:
            (y + 1) * world.cellSize -
            world.cellSize * ISO_OPEN_DOOR_DEPTH_BIAS,
        },
        draw: (ctx) =>
          painter.draw(ctx, worldToScreen(view, position.x, position.y)),
      });
      return undefined;
    }),
  );
  return {
    world: { ...world, ...(doorPainters ? { doorPainters } : {}) },
    painters,
  };
};

const drawIsometricWallFallback = (
  ctx: CanvasRenderingContext2D,
  world: SceneIsoWorldView,
  view: SceneIsoView,
  cellX: number,
  cellY: number,
): void => {
  const { cellSize, wallHeightPx, palette } = world;
  const left = cellX * cellSize;
  const top = cellY * cellSize;
  const north = worldToScreen(view, left, top);
  const east = worldToScreen(view, left + cellSize, top);
  const south = worldToScreen(view, left + cellSize, top + cellSize);
  const west = worldToScreen(view, left, top + cellSize);
  const wallHeight = wallHeightPx * view.projection.by;
  const lift = (point: { x: number; y: number }) => ({
    x: point.x,
    y: point.y - wallHeight,
  });

  ctx.fillStyle = palette.wallSouth;
  ctx.beginPath();
  ctx.moveTo(west.x, west.y);
  ctx.lineTo(south.x, south.y);
  ctx.lineTo(lift(south).x, lift(south).y);
  ctx.lineTo(lift(west).x, lift(west).y);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = palette.wallEast;
  ctx.beginPath();
  ctx.moveTo(south.x, south.y);
  ctx.lineTo(east.x, east.y);
  ctx.lineTo(lift(east).x, lift(east).y);
  ctx.lineTo(lift(south).x, lift(south).y);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = palette.wallTop;
  ctx.beginPath();
  ctx.moveTo(lift(north).x, lift(north).y);
  ctx.lineTo(lift(east).x, lift(east).y);
  ctx.lineTo(lift(south).x, lift(south).y);
  ctx.lineTo(lift(west).x, lift(west).y);
  ctx.closePath();
  ctx.fill();
};

export const prepareIsometricForegroundWallPainters = (
  world: SceneIsoWorldView,
  heroes: SceneIsoPainterView[],
  view: SceneIsoView,
): SceneIsoWorldView => {
  if (heroes.length === 0) return world;

  let hasForegroundWall = false;
  const wallPainters = world.rows.map((row, y) =>
    toArray(row).map((cell, x) => {
      if (cell !== world.wallCell) return world.wallPainters?.[y]?.[x];

      const position = {
        x: (x + 0.5) * world.cellSize,
        y: (y + 0.5) * world.cellSize,
      };
      const inFrontOfNearbyHero = heroes.some((hero) => {
        const dx = Math.abs(position.x - hero.position.x);
        const dy = Math.abs(position.y - hero.position.y);
        return (
          dx <= world.cellSize * 2 &&
          dy <= world.cellSize * 2 &&
          position.x + position.y > hero.position.x + hero.position.y
        );
      });
      if (!inFrontOfNearbyHero) return world.wallPainters?.[y]?.[x];

      hasForegroundWall = true;
      const painter = world.wallPainters?.[y]?.[x];
      return {
        position: painter?.position ?? position,
        draw: (
          ctx: CanvasRenderingContext2D,
          screenPosition: { x: number; y: number },
        ) => {
          ctx.save();
          ctx.globalAlpha *= ISO_FOREGROUND_WALL_OPACITY;
          try {
            if (painter) {
              painter.draw(ctx, screenPosition);
            } else {
              drawIsometricWallFallback(ctx, world, view, x, y);
            }
          } finally {
            ctx.restore();
          }
        },
      };
    }),
  );

  return hasForegroundWall ? { ...world, wallPainters } : world;
};

export const buildIsometricFloorLightPainter = (
  world: SceneIsoWorldView,
  view: SceneIsoView,
  lightCanvas: HTMLCanvasElement,
  pixelRatio: number,
): SceneIsoPainterView | undefined => {
  if (pixelRatio <= 0 || lightCanvas.width <= 0 || lightCanvas.height <= 0) {
    return undefined;
  }

  const pitCells = new Set(
    (world.pitCells ?? []).map(({ x, y }) => `${String(x)},${String(y)}`),
  );
  const floorCells: { center: { x: number; y: number } }[] = [];
  world.rows.forEach((row, y) =>
    toArray(row).forEach((cell, x) => {
      if (
        (cell !== ISO_FLOOR && cell !== ISO_DOOR) ||
        pitCells.has(`${String(x)},${String(y)}`)
      ) {
        return;
      }

      const center = worldToScreen(
        view,
        (x + 0.5) * world.cellSize,
        (y + 0.5) * world.cellSize,
      );
      const halfWidth = view.projection.ax * world.cellSize;
      const halfHeight = view.projection.by * world.cellSize;
      if (
        center.x + halfWidth < 0 ||
        center.x - halfWidth > view.width ||
        center.y + halfHeight < 0 ||
        center.y - halfHeight > view.height
      ) {
        return;
      }

      floorCells.push({ center });
    }),
  );
  if (floorCells.length === 0) return undefined;

  return {
    position: { x: -Number.MAX_SAFE_INTEGER, y: 0 },
    draw: (ctx) => {
      ctx.save();
      floorCells.forEach(({ center }, index) => {
        traceIsometricCellDiamond(
          ctx,
          center,
          world.cellSize,
          view.projection,
          index === 0,
        );
      });
      ctx.clip();
      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(
        lightCanvas,
        0,
        0,
        lightCanvas.width / pixelRatio,
        lightCanvas.height / pixelRatio,
      );
      ctx.restore();
    },
  };
};

type IsometricWallLightPainterView = SceneIsoPainterView & {
  drawReplacing: (
    ctx: CanvasRenderingContext2D,
    origin: { x: number; y: number },
  ) => void;
};

export const buildIsometricWallLightPainters = (
  world: IsometricWorldView,
  view: SceneIsoView,
  lightCanvas: HTMLCanvasElement,
  pixelRatio: number,
): IsometricWallLightPainterView[] => {
  if (
    pixelRatio <= 0 ||
    lightCanvas.width <= 0 ||
    lightCanvas.height <= 0 ||
    world.wallHeightPx <= 0
  ) {
    return [];
  }

  const pitCells = new Set(
    (world.pitCells ?? []).map(({ x, y }) => `${String(x)},${String(y)}`),
  );
  const floorAt = (x: number, y: number): boolean => {
    const cell = toArray(world.rows[y] ?? '')[x];
    return (
      (cell === ISO_FLOOR || cell === ISO_DOOR) &&
      !pitCells.has(`${String(x)},${String(y)}`)
    );
  };
  const wallHeightAt = (x: number, y: number): number =>
    world.wallFaceHeightsPx?.[y]?.[x] ??
    world.wallHeightPx * view.projection.by;
  const hasSharedWallFace = (
    x: number,
    y: number,
    floorX: number,
    floorY: number,
    wallHeight: number,
  ): boolean =>
    toArray(world.rows[y] ?? '')[x] === ISO_WALL &&
    floorAt(floorX, floorY) &&
    wallHeightAt(x, y) === wallHeight;
  const lightFacePainter = (
    wallX: number,
    wallY: number,
    floorX: number,
    floorY: number,
    sourceOrigin: { x: number; y: number },
    targetX: { x: number; y: number },
    targetY: { x: number; y: number },
    points: { x: number; y: number }[],
    sharedStart = false,
    sharedEnd = false,
  ): IsometricWallLightPainterView | undefined => {
    const facePoints = points.map(({ x, y }) => ({ x, y }));
    const faceDirection = {
      x: points[1].x - points[0].x,
      y: points[1].y - points[0].y,
    };
    const faceLength = Math.hypot(faceDirection.x, faceDirection.y);
    if (faceLength > 0) {
      const overlap = ISOMETRIC_WALL_LIGHT_SEAM_DEVICE_PX / pixelRatio;
      const offset = {
        x: (faceDirection.x / faceLength) * overlap,
        y: (faceDirection.y / faceLength) * overlap,
      };
      if (sharedStart) {
        facePoints[0] = {
          x: facePoints[0].x - offset.x,
          y: facePoints[0].y - offset.y,
        };
        facePoints[3] = {
          x: facePoints[3].x - offset.x,
          y: facePoints[3].y - offset.y,
        };
      }
      if (sharedEnd) {
        facePoints[1] = {
          x: facePoints[1].x + offset.x,
          y: facePoints[1].y + offset.y,
        };
        facePoints[2] = {
          x: facePoints[2].x + offset.x,
          y: facePoints[2].y + offset.y,
        };
      }
    }
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    facePoints.forEach(({ x, y }) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });
    if (maxX < 0 || minX > view.width || maxY < 0 || minY > view.height) {
      return undefined;
    }

    const floorCorners = [
      worldToScreen(view, floorX * world.cellSize, floorY * world.cellSize),
      worldToScreen(
        view,
        (floorX + 1) * world.cellSize,
        floorY * world.cellSize,
      ),
      worldToScreen(
        view,
        (floorX + 1) * world.cellSize,
        (floorY + 1) * world.cellSize,
      ),
      worldToScreen(
        view,
        floorX * world.cellSize,
        (floorY + 1) * world.cellSize,
      ),
    ];
    const sourceMinX = Math.min(...floorCorners.map(({ x }) => x));
    const sourceMinY = Math.min(...floorCorners.map(({ y }) => y));
    const sourceMaxX = Math.max(...floorCorners.map(({ x }) => x));
    const sourceMaxY = Math.max(...floorCorners.map(({ y }) => y));
    const sourcePadding = ISOMETRIC_WALL_LIGHT_SEAM_DEVICE_PX;
    const sourceX = Math.max(
      0,
      Math.floor(sourceMinX * pixelRatio) - sourcePadding,
    );
    const sourceY = Math.max(
      0,
      Math.floor(sourceMinY * pixelRatio) - sourcePadding,
    );
    const sourceRight = Math.min(
      lightCanvas.width,
      Math.ceil(sourceMaxX * pixelRatio) + sourcePadding,
    );
    const sourceBottom = Math.min(
      lightCanvas.height,
      Math.ceil(sourceMaxY * pixelRatio) + sourcePadding,
    );
    const sourceWidth = sourceRight - sourceX;
    const sourceHeight = sourceBottom - sourceY;
    if (sourceWidth <= 0 || sourceHeight <= 0) return undefined;

    const { ax, by } = view.projection;
    const cellSize = world.cellSize;
    const sourceXBasis = { x: ax * cellSize, y: by * cellSize };
    const sourceYBasis = { x: -ax * cellSize, y: by * cellSize };
    const determinant =
      sourceXBasis.x * sourceYBasis.y - sourceYBasis.x * sourceXBasis.y;
    if (determinant === 0) return undefined;

    const a =
      (targetX.x * sourceYBasis.y - targetY.x * sourceXBasis.y) / determinant;
    const c =
      (-targetX.x * sourceYBasis.x + targetY.x * sourceXBasis.x) / determinant;
    const b =
      (targetX.y * sourceYBasis.y - targetY.y * sourceXBasis.y) / determinant;
    const d =
      (-targetX.y * sourceYBasis.x + targetY.y * sourceXBasis.x) / determinant;
    const targetOrigin = sourceOrigin;
    const e = targetOrigin.x - a * sourceOrigin.x - c * sourceOrigin.y;
    const f = targetOrigin.y - b * sourceOrigin.x - d * sourceOrigin.y;
    const facePath = (ctx: CanvasRenderingContext2D) => {
      ctx.beginPath();
      ctx.moveTo(facePoints[0].x, facePoints[0].y);
      for (
        let pointIndex = 1;
        pointIndex < facePoints.length;
        pointIndex += 1
      ) {
        ctx.lineTo(facePoints[pointIndex].x, facePoints[pointIndex].y);
      }
      ctx.closePath();
    };

    const drawWithCompositeOperation = (
      ctx: CanvasRenderingContext2D,
      compositeOperation: GlobalCompositeOperation,
    ) => {
      ctx.save();
      facePath(ctx);
      ctx.clip();
      ctx.filter = 'none';
      ctx.globalCompositeOperation = compositeOperation;
      ctx.transform(a, b, c, d, e, f);
      ctx.drawImage(
        lightCanvas,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        sourceX / pixelRatio,
        sourceY / pixelRatio,
        sourceWidth / pixelRatio,
        sourceHeight / pixelRatio,
      );
      ctx.restore();
    };

    return {
      position: {
        x: (wallX + 0.5) * cellSize,
        y: (wallY + 0.5) * cellSize,
      },
      draw: (ctx) => drawWithCompositeOperation(ctx, 'lighter'),
      drawReplacing: (ctx) => drawWithCompositeOperation(ctx, 'copy'),
    };
  };
  const wallLightPainters: IsometricWallLightPainterView[] = [];
  world.rows.forEach((row, y) =>
    toArray(row).forEach((cell, x) => {
      if (cell !== ISO_WALL) return;
      const wallHeight =
        world.wallFaceHeightsPx?.[y]?.[x] ??
        world.wallHeightPx * view.projection.by;

      const east = worldToScreen(
        view,
        (x + 1) * world.cellSize,
        y * world.cellSize,
      );
      const south = worldToScreen(
        view,
        (x + 1) * world.cellSize,
        (y + 1) * world.cellSize,
      );
      const west = worldToScreen(
        view,
        x * world.cellSize,
        (y + 1) * world.cellSize,
      );
      const lift = (point: { x: number; y: number }) => ({
        x: point.x,
        y: point.y - wallHeight,
      });
      if (floorAt(x, y + 1)) {
        const painter = lightFacePainter(
          x,
          y,
          x,
          y + 1,
          west,
          {
            x: view.projection.ax * world.cellSize,
            y: view.projection.by * world.cellSize,
          },
          { x: 0, y: -wallHeight },
          [west, south, lift(south), lift(west)],
          hasSharedWallFace(x - 1, y, x - 1, y + 1, wallHeight),
          hasSharedWallFace(x + 1, y, x + 1, y + 1, wallHeight),
        );
        if (painter) wallLightPainters.push(painter);
      }
      if (floorAt(x + 1, y)) {
        const painter = lightFacePainter(
          x,
          y,
          x + 1,
          y,
          south,
          { x: 0, y: -wallHeight },
          {
            x: -view.projection.ax * world.cellSize,
            y: view.projection.by * world.cellSize,
          },
          [south, east, lift(east), lift(south)],
          hasSharedWallFace(x, y + 1, x + 1, y + 1, wallHeight),
          hasSharedWallFace(x, y - 1, x + 1, y - 1, wallHeight),
        );
        if (painter) wallLightPainters.push(painter);
      }
    }),
  );

  return wallLightPainters;
};

const eraseIsometricWallSilhouette = (
  ctx: CanvasRenderingContext2D,
  world: IsometricWorldView,
  view: SceneIsoView,
  x: number,
  y: number,
): void => {
  const north = worldToScreen(view, x * world.cellSize, y * world.cellSize);
  const east = worldToScreen(
    view,
    (x + 1) * world.cellSize,
    y * world.cellSize,
  );
  const south = worldToScreen(
    view,
    (x + 1) * world.cellSize,
    (y + 1) * world.cellSize,
  );
  const west = worldToScreen(
    view,
    x * world.cellSize,
    (y + 1) * world.cellSize,
  );
  const wallHeight =
    world.wallFaceHeightsPx?.[y]?.[x] ??
    world.wallHeightPx * view.projection.by;
  const lift = (point: { x: number; y: number }) => ({
    x: point.x,
    y: point.y - wallHeight,
  });
  const points = [
    [west, south, lift(south), lift(west)],
    [south, east, lift(east), lift(south)],
    [lift(north), lift(east), lift(south), lift(west)],
  ];
  ctx.fillStyle = '#fff';
  points.forEach((face) => {
    ctx.beginPath();
    ctx.moveTo(face[0].x, face[0].y);
    for (let index = 1; index < face.length; index += 1) {
      ctx.lineTo(face[index].x, face[index].y);
    }
    ctx.closePath();
    ctx.fill();
  });
};

const isometricWallInViewport = (
  world: IsometricWorldView,
  view: SceneIsoView,
  x: number,
  y: number,
): boolean => {
  const corners = [
    worldToScreen(view, x * world.cellSize, y * world.cellSize),
    worldToScreen(view, (x + 1) * world.cellSize, y * world.cellSize),
    worldToScreen(view, (x + 1) * world.cellSize, (y + 1) * world.cellSize),
    worldToScreen(view, x * world.cellSize, (y + 1) * world.cellSize),
  ];
  const wallHeight =
    world.wallFaceHeightsPx?.[y]?.[x] ??
    world.wallHeightPx * view.projection.by;
  const minX = Math.min(...corners.map(({ x: pointX }) => pointX));
  const maxX = Math.max(...corners.map(({ x: pointX }) => pointX));
  const minY = Math.min(...corners.map(({ y: pointY }) => pointY)) - wallHeight;
  const maxY = Math.max(...corners.map(({ y: pointY }) => pointY));
  return minX <= view.width && maxX >= 0 && minY <= view.height && maxY >= 0;
};

const wallLightScratchCanvases = new WeakMap<
  HTMLCanvasElement,
  [HTMLCanvasElement, HTMLCanvasElement]
>();

export const renderIsometricLightMask = (
  world: IsometricWorldView,
  view: SceneIsoView,
  lightCanvas: HTMLCanvasElement,
  lightMaskCanvas: HTMLCanvasElement,
  pixelRatio: number,
): boolean => {
  if (
    pixelRatio <= 0 ||
    lightCanvas.width <= 0 ||
    lightCanvas.height <= 0 ||
    lightMaskCanvas.width <= 0 ||
    lightMaskCanvas.height <= 0
  ) {
    return false;
  }
  const maskCtx = lightMaskCanvas.getContext('2d');
  if (!maskCtx) return false;

  maskCtx.save();
  maskCtx.setTransform(1, 0, 0, 1, 0, 0);
  maskCtx.clearRect(0, 0, lightMaskCanvas.width, lightMaskCanvas.height);
  maskCtx.restore();
  maskCtx.save();
  maskCtx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  const floorLightPainter = buildIsometricFloorLightPainter(
    world,
    view,
    lightCanvas,
    pixelRatio,
  );
  floorLightPainter?.draw(maskCtx, { x: 0, y: 0 });

  const wallLightsByCell = new Map<string, IsometricWallLightPainterView[]>();
  buildIsometricWallLightPainters(world, view, lightCanvas, pixelRatio).forEach(
    (painter) => {
      const x = Math.round(painter.position.x / world.cellSize - 0.5);
      const y = Math.round(painter.position.y / world.cellSize - 0.5);
      const key = `${String(x)},${String(y)}`;
      const painters = wallLightsByCell.get(key) ?? [];
      painters.push(painter);
      wallLightsByCell.set(key, painters);
    },
  );
  const wallLightsAt = (
    x: number,
    y: number,
  ): IsometricWallLightPainterView[] =>
    [
      `${String(x)},${String(y)}`,
      `${String(x - 1)},${String(y)}`,
      `${String(x + 1)},${String(y)}`,
      `${String(x)},${String(y - 1)}`,
      `${String(x)},${String(y + 1)}`,
    ].flatMap((key) => wallLightsByCell.get(key) ?? []);

  const walls: { x: number; y: number }[] = [];
  world.rows.forEach((row, y) =>
    toArray(row).forEach((cell, x) => {
      if (cell === ISO_WALL && isometricWallInViewport(world, view, x, y)) {
        walls.push({ x, y });
      }
    }),
  );
  walls.sort((a, b) => a.x + a.y - b.x - b.y || a.y - b.y || a.x - b.x);
  walls.forEach(({ x, y }) => {
    maskCtx.save();
    maskCtx.globalCompositeOperation = 'destination-out';
    const painter = world.wallPainters?.[y]?.[x];
    if (painter) {
      painter.draw(
        maskCtx,
        worldToScreen(view, painter.position.x, painter.position.y),
      );
    } else {
      eraseIsometricWallSilhouette(maskCtx, world, view, x, y);
    }
    maskCtx.restore();
    const ownWallLights = wallLightsByCell.get(`${String(x)},${String(y)}`);
    if (!painter || !lightMaskCanvas.ownerDocument) {
      ownWallLights?.forEach((wallLight) =>
        wallLight.draw(maskCtx, { x: 0, y: 0 }),
      );
      return;
    }
    const wallLights = wallLightsAt(x, y);
    if (!wallLights.length) return;

    let scratch = wallLightScratchCanvases.get(lightMaskCanvas);
    if (!scratch) {
      scratch = [
        lightMaskCanvas.ownerDocument.createElement('canvas'),
        lightMaskCanvas.ownerDocument.createElement('canvas'),
      ];
      wallLightScratchCanvases.set(lightMaskCanvas, scratch);
    }
    const [lightScratch, silhouetteScratch] = scratch;
    const lightScratchCtx = lightScratch.getContext('2d');
    const silhouetteCtx = silhouetteScratch.getContext('2d');
    if (!lightScratchCtx || !silhouetteCtx) return;

    const center = worldToScreen(view, painter.position.x, painter.position.y);
    const halfWidth = Math.abs(view.projection.ax * world.cellSize);
    const halfHeight = Math.abs(view.projection.by * world.cellSize);
    const wallHeight =
      world.wallFaceHeightsPx?.[y]?.[x] ??
      world.wallHeightPx * view.projection.by;
    const scratchPadding = ISOMETRIC_WALL_LIGHT_SEAM_DEVICE_PX;
    const left = Math.max(
      0,
      Math.floor((center.x - halfWidth) * pixelRatio) - scratchPadding,
    );
    const top = Math.max(
      0,
      Math.floor((center.y - halfHeight - wallHeight) * pixelRatio) -
        scratchPadding,
    );
    const right = Math.min(
      lightMaskCanvas.width,
      Math.ceil((center.x + halfWidth) * pixelRatio) + scratchPadding,
    );
    const bottom = Math.min(
      lightMaskCanvas.height,
      Math.ceil((center.y + halfHeight) * pixelRatio) + scratchPadding,
    );
    const width = right - left;
    const height = bottom - top;
    if (width <= 0 || height <= 0) return;
    for (const canvas of scratch) {
      if (canvas.width < width) canvas.width = width;
      if (canvas.height < height) canvas.height = height;
    }
    for (const [context, canvas] of [
      [lightScratchCtx, lightScratch],
      [silhouetteCtx, silhouetteScratch],
    ] as const) {
      context.save();
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, -left, -top);
    }
    wallLights.forEach((wallLight) =>
      wallLight.drawReplacing(lightScratchCtx, { x: 0, y: 0 }),
    );
    painter.draw(silhouetteCtx, center);
    silhouetteCtx.restore();
    lightScratchCtx.setTransform(1, 0, 0, 1, 0, 0);
    lightScratchCtx.globalCompositeOperation = 'destination-in';
    lightScratchCtx.drawImage(silhouetteScratch, 0, 0);
    lightScratchCtx.restore();
    maskCtx.drawImage(
      lightScratch,
      0,
      0,
      width,
      height,
      left / pixelRatio,
      top / pixelRatio,
      width / pixelRatio,
      height / pixelRatio,
    );
  });
  maskCtx.restore();
  return true;
};

export const buildIsometricWorldView = (
  dungeon: SceneDungeonView,
  cellSize: number,
  debugMode = false,
  graphics?: ResolvedIsometricGraphics,
  view?: SceneIsoView,
): IsometricWorldView => {
  const resolvedDungeon = dungeon;
  const rows = resolvedDungeon.layout.sealedGrid ?? resolvedDungeon.layout.grid;
  const isDiscoveredCell = (x: number, y: number): boolean => {
    const cell = toArray(resolvedDungeon.layout.grid[y] ?? '')[x] ?? '';
    return cell !== EMPTY && resolvedDungeon.discoveredRooms.includes(cell);
  };
  const isVisibleCell = (x: number, y: number, cell: string): boolean => {
    const isWallCell =
      cell === WALL || cell === COLLAPSED || cell === SEALED_DOOR;
    // Debug overlays must not reveal undiscovered room floors.
    if (debugMode && !isWallCell) return isDiscoveredCell(x, y);
    if (isWallCell) {
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (isDiscoveredCell(x + offsetX, y + offsetY)) return true;
        }
      }
      return false;
    }
    return isDiscoveredCell(x, y);
  };
  const doors = new Map(
    (resolvedDungeon.layout.doors ?? [])
      .filter(
        (door) =>
          !door.hidden &&
          isVisibleCell(
            door.x,
            door.y,
            toArray(rows[door.y] ?? '')[door.x] ?? '',
          ),
      )
      .map((door) => {
        const placement = getIsometricDoorPlacement(
          resolvedDungeon.layout.grid,
          door.x,
          door.y,
          door.side,
        );
        const wallFrame = placement.x !== door.x || placement.y !== door.y;
        return [
          `${String(placement.x)},${String(placement.y)}`,
          { open: door.open, side: placement.side, wallFrame },
        ] as const;
      }),
  );
  const doorWallCells = new Set(
    [...doors]
      .filter(([, door]) => door.wallFrame)
      .map(([position]) => position),
  );
  const terrain = new Map(
    (resolvedDungeon.layout.terrain ?? []).map((cell) => [
      `${String(cell.position.x)},${String(cell.position.y)}`,
      cell.color,
    ]),
  );
  const worldRows = rows.map((row, y) =>
    toArray(row)
      .map((cell, x) => {
        if (doors.has(`${String(x)},${String(y)}`)) return ISO_DOOR;
        if (!isVisibleCell(x, y, cell)) return ISO_HIDDEN;
        if (cell === WALL || cell === SEALED_DOOR || cell === COLLAPSED) {
          return ISO_WALL;
        }
        return ISO_FLOOR;
      })
      .join(''),
  );
  const wallShapeRows = worldRows.map((row, y) =>
    toArray(row)
      .map((cell, x) => {
        const sourceCell = toArray(resolvedDungeon.layout.grid[y] ?? '')[x];
        return cell === ISO_DOOR &&
          (sourceCell === WALL || sourceCell === COLLAPSED)
          ? ISO_WALL
          : cell;
      })
      .join(''),
  );
  const cornerTypes = new Map(
    (resolvedDungeon.layout.corners ?? []).map(({ position, type }) => [
      `${String(position.x)},${String(position.y)}`,
      type,
    ]),
  );
  const buildPainter = (
    x: number,
    y: number,
    tileIds: string[],
  ): (SceneIsoPainterView & { wallFaceHeightPx: number }) | undefined => {
    if (!graphics) return undefined;
    const tiles = tileIds
      .map((tileId) => getIsometricTileImage(graphics, tileId))
      .filter((tile): tile is NonNullable<typeof tile> => tile !== null);
    if (tiles.length === 0) return undefined;
    const projection = view?.projection ?? { ax: 1, by: 0.5 };
    const groundOffset = projection.by * cellSize;
    return {
      position: { x: (x + 0.5) * cellSize, y: (y + 0.5) * cellSize },
      wallFaceHeightPx: Math.max(
        cellSize * 0.75 * projection.by,
        ...tiles.map((tile) => {
          const { height } = getIsometricTileDimensions(
            cellSize,
            projection,
            tile.scale,
            tile.image.naturalWidth,
            tile.image.naturalHeight,
          );
          return height * tile.anchor.y;
        }),
      ),
      draw: (ctx, center) => {
        for (const tile of tiles) {
          const { width, height } = getIsometricTileDimensions(
            cellSize,
            projection,
            tile.scale,
            tile.image.naturalWidth,
            tile.image.naturalHeight,
          );
          ctx.drawImage(
            tile.image,
            center.x - width * tile.anchor.x,
            center.y + groundOffset - height * tile.anchor.y,
            width,
            height,
          );
        }
      },
    };
  };
  const buildPitPainter = (): SceneIsoPitPainterView | undefined => {
    if (!graphics) return undefined;
    const tileIds = {
      north: resolveIsometricCellTileId(graphics, 'wall', 'pitNorth'),
      west: resolveIsometricCellTileId(graphics, 'wall', 'pitWest'),
    };
    const tiles = {
      north: tileIds.north
        ? getIsometricTileImage(graphics, tileIds.north)
        : null,
      west: tileIds.west ? getIsometricTileImage(graphics, tileIds.west) : null,
    };
    if (!tiles.north && !tiles.west) return undefined;
    return {
      drawFace: (ctx, face: SceneIsoPitFaceView) => {
        const tile = tiles[face.edge];
        if (!tile) return;
        const first = face.points[0];
        const second = face.points[1];
        const center = {
          x: (first.x + second.x) / 2,
          y: (first.y + second.y) / 2,
        };
        const sourceRim = PIT_WALL_SOURCE_RIM[face.edge];
        const width =
          (Math.abs(second.x - first.x) *
            tile.image.naturalWidth *
            tile.scale) /
          sourceRim.width;
        const height =
          (Math.abs(second.y - first.y) *
            tile.image.naturalHeight *
            tile.scale) /
          sourceRim.height;
        ctx.drawImage(
          tile.image,
          center.x - width * tile.anchor.x,
          center.y - height * tile.anchor.y,
          width,
          height,
        );
      },
    };
  };
  const floorPainters = worldRows.map((row, y) =>
    toArray(row).map((cell, x) => {
      if (cell === ISO_HIDDEN || cell === ISO_WALL || !graphics)
        return undefined;
      const sourceCell = toArray(resolvedDungeon.layout.grid[y] ?? '')[x];
      const tileId = resolveIsometricCellTileId(graphics, 'floor', sourceCell);
      return buildPainter(x, y, tileId ? [tileId] : []);
    }),
  );
  const wallPainters = worldRows.map((row, y) =>
    toArray(row).map((cell, x) => {
      if (cell !== ISO_WALL) return undefined;
      const cornerShape = getIsometricWallCornerShape(
        wallShapeRows,
        resolvedDungeon.layout.grid,
        x,
        y,
        doorWallCells,
      );
      const tileIds = graphics
        ? resolveIsometricWallTileIds(
            graphics,
            getIsometricWallShape(wallShapeRows, x, y),
            cornerShape && graphics.wallShapes[cornerShape]
              ? cornerShape
              : cornerTypes.get(`${String(x)},${String(y)}`),
          )
        : [];
      return buildPainter(x, y, tileIds);
    }),
  );
  const wallFaceHeightsPx = wallPainters.map((row) =>
    row.map((painter) => painter?.wallFaceHeightPx),
  );
  const doorPainters = worldRows.map((row, y) =>
    toArray(row).map((cell, x) => {
      if (cell !== ISO_DOOR || !graphics) return undefined;
      const door = doors.get(`${String(x)},${String(y)}`);
      const tileId = door
        ? resolveIsometricDoorTileId(graphics, door.open, door.side)
        : resolveIsometricCellTileId(graphics, 'door');
      return buildPainter(x, y, tileId ? [tileId] : []);
    }),
  );
  const pitCells = (resolvedDungeon.layout.pits ?? []).filter((pit) =>
    isDiscoveredCell(pit.x, pit.y),
  );
  const pitCellKeys = new Set(
    pitCells.map((pit) => `${String(pit.x)},${String(pit.y)}`),
  );
  const pitPainters = worldRows.map((row, y) =>
    toArray(row).map((_, x) =>
      pitCellKeys.has(`${String(x)},${String(y)}`)
        ? buildPitPainter()
        : undefined,
    ),
  );
  return {
    rows: worldRows,
    floorPainters,
    ...(graphics ? { wallPainters, doorPainters, pitPainters } : {}),
    openDoorCells: worldRows.flatMap((row, y) =>
      toArray(row).flatMap((cell, x) =>
        cell === ISO_DOOR && doors.get(`${String(x)},${String(y)}`)?.open
          ? [{ x, y }]
          : [],
      ),
    ),
    wallFaceHeightsPx,
    floorColors: rows.map((row, y) =>
      toArray(row).map((cell, x) =>
        isVisibleCell(x, y, cell)
          ? terrain.get(`${String(x)},${String(y)}`)
          : undefined,
      ),
    ),
    floorOverlays: rows.map((row, y) =>
      toArray(row).map((cell, x) => {
        if (!isVisibleCell(x, y, cell)) return undefined;
        const fog = resolvedDungeon.layout.roomFog?.[cell];
        if (!fog) return undefined;
        return {
          color: fog.color ?? '#797d80',
          opacity: fog.opacity ?? 0.3,
        };
      }),
    ),
    pitCells,
    pitDepthPx: cellSize * 0.6,
    cellSize,
    wallCell: ISO_WALL,
    doorCell: ISO_DOOR,
    hiddenCell: ISO_HIDDEN,
    wallHeightPx: cellSize * 0.75,
    palette: {
      background: dungeonViewBackdrop,
      floor: background,
      door: '#8b6543',
      wallTop: resolvedDungeon.layout.wallColour ?? DEFAULT_WALL_COLOUR,
      wallSouth: '#4c4944',
      wallEast: '#5a5650',
      pit: '#080808',
      pitNorth: '#383530',
      pitWest: '#292724',
    },
  };
};

export const feetPosition = (
  actor: Pick<SceneActorView, 'position'>,
  cellSize: number,
): { x: number; y: number } => ({
  x: (actor.position.x + 0.5) * cellSize,
  y: (actor.position.y + 0.5) * cellSize,
});

const actorFrame = (actor: SceneActorView): SceneSpriteFrame | null => {
  if (actor.sprite) return actor.sprite;
  if (!actor.tile) return null;
  return {
    image: actor.tile.sheet,
    sx: actor.tile.sx,
    sy: actor.tile.sy,
    sw: actor.tile.size,
    sh: actor.tile.size,
  };
};

export const buildHeroPainters = (
  actors: SceneActorView[],
  cellSize: number,
  zoom: number,
): SceneIsoPainterView[] =>
  actors.flatMap((actor) => {
    const frame = actorFrame(actor);
    if (!frame) return [];
    const size =
      cellSize * ((actor as GameActorView).spriteDraw?.scale ?? 1) * zoom;
    return [
      {
        position: feetPosition(actor, cellSize),
        draw: (
          ctx: CanvasRenderingContext2D,
          feet: { x: number; y: number },
        ) => {
          const markerColor = (actor as GameActorView).floorMarkerColor;
          if (markerColor) {
            ctx.save();
            ctx.fillStyle = markerColor;
            ctx.beginPath();
            ctx.ellipse(
              feet.x,
              feet.y + 2 * zoom,
              cellSize * zoom * 0.16,
              cellSize * zoom * 0.08,
              0,
              0,
              Math.PI * 2,
            );
            ctx.fill();
            ctx.restore();
          }
          const smoothing = ctx.imageSmoothingEnabled;
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(
            frame.image,
            frame.sx,
            frame.sy,
            frame.sw,
            frame.sh,
            feet.x - size / 2,
            feet.y - size,
            size,
            size,
          );
          ctx.imageSmoothingEnabled = smoothing;
        },
      },
    ];
  });

const drawIsometricHealthBar = (
  ctx: CanvasRenderingContext2D,
  view: SceneIsoView,
  position: { x: number; y: number },
  health: { current: number; max: number },
  cellSize: number,
  spriteScale: number,
): void => {
  const zoom = view.projection.ax;
  const center = worldToScreen(
    view,
    (position.x + 0.5) * cellSize,
    (position.y + 0.5) * cellSize,
  );
  const width = cellSize * zoom * 0.75;
  const height = 4 * zoom;
  const left = center.x - width / 2;
  const top = center.y - cellSize * spriteScale * zoom - height - 2 * zoom;
  const fraction = Math.max(
    0,
    Math.min(1, health.current / Math.max(1, health.max)),
  );
  ctx.fillStyle = 'red';
  ctx.fillRect(left, top, width, height);
  ctx.fillStyle = 'green';
  ctx.fillRect(left, top, width * fraction, height);
  ctx.strokeStyle = 'black';
  ctx.lineWidth = zoom;
  ctx.strokeRect(left, top, width, height);
};

const drawIsometricHeroPips = (
  ctx: CanvasRenderingContext2D,
  view: SceneIsoView,
  bar: GameHeroOverlayView['bars'][number],
  cellSize: number,
): void => {
  const zoom = view.projection.ax;
  const center = worldToScreen(
    view,
    (bar.position.x + 0.5) * cellSize,
    (bar.position.y + 0.5) * cellSize,
  );
  const pipSize = 5 * zoom;
  const pipGap = 6 * zoom;
  const y = center.y + cellSize * view.projection.by * 0.48;
  ctx.fillStyle = 'darkred';
  for (let index = 0; index < (bar.actionPips ?? 0); index += 1) {
    ctx.fillRect(center.x - 11 * zoom + index * pipGap, y, pipSize, pipSize);
  }
  ctx.fillStyle = 'blue';
  for (let index = 0; index < (bar.movePips ?? 0); index += 1) {
    ctx.fillRect(center.x + 6 * zoom + index * pipGap, y, pipSize, pipSize);
  }
};

export const renderIsometricActorOverlays = (
  ctx: CanvasRenderingContext2D,
  view: SceneIsoView,
  overlay: GameHeroOverlayView,
  monsterActors: SceneActorView[],
  cellSize: number,
): void => {
  drawIsoHeroOverlay(ctx, view, { ...overlay, bars: [] }, cellSize);
  overlay.bars.forEach((bar) => {
    drawIsometricHealthBar(
      ctx,
      view,
      bar.position,
      bar.health,
      cellSize,
      bar.spriteDraw?.scale ?? 1,
    );
    drawIsometricHeroPips(ctx, view, bar, cellSize);
  });
  monsterActors.forEach((actor) => {
    if (!actor.healthBar) return;
    drawIsometricHealthBar(
      ctx,
      view,
      actor.position,
      actor.healthBar,
      cellSize,
      (actor as GameActorView).spriteDraw?.scale ?? 1,
    );
  });
};

const itemFrame = (item: GameItemView): SceneSpriteFrame | null => {
  if (item.sprite) return item.sprite;
  if (!item.fallbackTile) return null;
  return {
    image: item.fallbackTile.sheet,
    sx: item.fallbackTile.sx,
    sy: item.fallbackTile.sy,
    sw: item.fallbackTile.size,
    sh: item.fallbackTile.size,
  };
};

const buildItemPainters = (
  items: GameItemView[],
  cellSize: number,
  zoom: number,
): SceneIsoPainterView[] =>
  items.flatMap((item) => {
    const frame = itemFrame(item);
    if (!frame) return [];
    const drawInfo = item.spriteDraw;
    const maxSize = cellSize * (drawInfo?.scale ?? 1) * zoom;
    const frameScale = Math.min(maxSize / frame.sw, maxSize / frame.sh);
    const width = frame.sw * frameScale;
    const height = frame.sh * frameScale;
    const alignment = drawInfo?.alignment;
    const leftAligned =
      alignment === CellAlignment.TOP_LEFT ||
      alignment === CellAlignment.BOTTOM_LEFT ||
      alignment === CellAlignment.CENTER_LEFT;
    const rightAligned =
      alignment === CellAlignment.TOP_RIGHT ||
      alignment === CellAlignment.BOTTOM_RIGHT ||
      alignment === CellAlignment.CENTER_RIGHT;
    const topAligned =
      alignment === CellAlignment.TOP_LEFT ||
      alignment === CellAlignment.TOP_RIGHT ||
      alignment === CellAlignment.CENTER_TOP;
    const bottomAligned =
      alignment === CellAlignment.BOTTOM_LEFT ||
      alignment === CellAlignment.BOTTOM_RIGHT ||
      alignment === CellAlignment.CENTER_BOTTOM;
    const offset = drawInfo?.offset;
    return [
      {
        position: {
          x: (item.position.x + 0.5) * cellSize,
          y: (item.position.y + 0.5) * cellSize,
        },
        draw: (
          ctx: CanvasRenderingContext2D,
          center: { x: number; y: number },
        ) => {
          const smoothing = ctx.imageSmoothingEnabled;
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(
            frame.image,
            frame.sx,
            frame.sy,
            frame.sw,
            frame.sh,
            center.x +
              (leftAligned
                ? (-cellSize * zoom) / 2
                : rightAligned
                  ? (cellSize * zoom) / 2 - width
                  : -width / 2) +
              (offset?.x ?? 0) * zoom,
            center.y +
              (topAligned
                ? (-cellSize * zoom) / 2
                : bottomAligned
                  ? (cellSize * zoom) / 2 - height
                  : -height / 2) +
              (offset?.y ?? 0) * zoom,
            width,
            height,
          );
          ctx.imageSmoothingEnabled = smoothing;
        },
      },
    ];
  });

export const buildIsometricDecoratorPainters = (
  decorators: GameItemView[],
  cellSize: number,
  projection: { ax: number; by: number },
  graphics?: ResolvedIsometricGraphics,
  getDecoratorTileImage: typeof getIsometricTileImage = getIsometricTileImage,
): SceneIsoPainterView[] =>
  decorators.flatMap((decorator) => {
    const tileId = graphics
      ? resolveIsometricDecoratorTileId(
          graphics,
          decorator.position.x,
          decorator.position.y,
        )
      : undefined;
    const tile = graphics ? getDecoratorTileImage(graphics, tileId) : null;
    if (!tile) return buildItemPainters([decorator], cellSize, projection.ax);

    const { width, height } = getIsometricTileDimensions(
      cellSize,
      projection,
      tile.scale,
      tile.image.naturalWidth,
      tile.image.naturalHeight,
    );
    const alignment = decorator.spriteDraw?.alignment;
    const leftAligned =
      alignment === CellAlignment.TOP_LEFT ||
      alignment === CellAlignment.BOTTOM_LEFT ||
      alignment === CellAlignment.CENTER_LEFT;
    const rightAligned =
      alignment === CellAlignment.TOP_RIGHT ||
      alignment === CellAlignment.BOTTOM_RIGHT ||
      alignment === CellAlignment.CENTER_RIGHT;
    const topAligned =
      alignment === CellAlignment.TOP_LEFT ||
      alignment === CellAlignment.TOP_RIGHT ||
      alignment === CellAlignment.CENTER_TOP;
    const bottomAligned =
      alignment === CellAlignment.BOTTOM_LEFT ||
      alignment === CellAlignment.BOTTOM_RIGHT ||
      alignment === CellAlignment.CENTER_BOTTOM;
    const horizontalOffset =
      ((leftAligned ? -1 : rightAligned ? 1 : 0) * cellSize * projection.ax) /
      2;
    const verticalOffset =
      ((topAligned ? -1 : bottomAligned ? 1 : 0) * cellSize * projection.ax) /
      2;
    const groundOffset = projection.by * cellSize;

    return [
      {
        position: {
          x: (decorator.position.x + 0.5) * cellSize,
          y: (decorator.position.y + 0.5) * cellSize,
        },
        draw: (
          ctx: CanvasRenderingContext2D,
          center: { x: number; y: number },
        ) =>
          ctx.drawImage(
            tile.image,
            center.x + horizontalOffset - width * tile.anchor.x,
            center.y + groundOffset + verticalOffset - height * tile.anchor.y,
            width,
            height,
          ),
      },
    ];
  });

const ISOMETRIC_CHEST_DIRECTIONS = ['N', 'E', 'S', 'W'] as const;

const getIsometricChestDirection = (x: number, y: number) => {
  const coordinateHash =
    (Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0;
  return ISOMETRIC_CHEST_DIRECTIONS[
    coordinateHash % ISOMETRIC_CHEST_DIRECTIONS.length
  ];
};

export const buildIsometricFoundSecretPainters = (
  items: GameItemView[],
  cellSize: number,
  projection: { ax: number; by: number },
  graphics?: ResolvedIsometricGraphics,
  getChestTileImage: typeof getIsometricTileImage = getIsometricTileImage,
): SceneIsoPainterView[] =>
  items.flatMap((item) => {
    const direction = getIsometricChestDirection(
      item.position.x,
      item.position.y,
    );
    const tileId = graphics
      ? resolveIsometricChestTileId(graphics, true, direction)
      : undefined;
    const tile = graphics ? getChestTileImage(graphics, tileId) : null;
    if (!tile) return buildItemPainters([item], cellSize, projection.ax);

    const { width, height } = getIsometricTileDimensions(
      cellSize,
      projection,
      tile.scale,
      tile.image.naturalWidth,
      tile.image.naturalHeight,
    );
    const groundOffset = projection.by * cellSize;
    return [
      {
        position: {
          x: (item.position.x + 0.5) * cellSize,
          y: (item.position.y + 0.5) * cellSize,
        },
        draw: (
          ctx: CanvasRenderingContext2D,
          center: { x: number; y: number },
        ) =>
          ctx.drawImage(
            tile.image,
            center.x - width * tile.anchor.x,
            center.y + groundOffset - height * tile.anchor.y,
            width,
            height,
          ),
      },
    ];
  });

const buildDungeonTilePainter = (
  tile: (typeof DUNGEON_TILES)[keyof typeof DUNGEON_TILES],
  sheet: CanvasImageSource,
  position: { x: number; y: number },
  cellSize: number,
  zoom: number,
): SceneIsoPainterView => {
  const size = cellSize * zoom;
  return {
    position,
    draw: (
      ctx: CanvasRenderingContext2D,
      screenPosition: { x: number; y: number },
    ) =>
      ctx.drawImage(
        sheet,
        tile.x,
        tile.y,
        tile.size,
        tile.size,
        screenPosition.x - size / 2,
        screenPosition.y - size / 2,
        size,
        size,
      ),
  };
};

export const buildIsometricPillarPainters = (
  dungeon: Dungeon,
  groundSheet: CanvasImageSource,
  cellSize: number,
  projection: { ax: number; by: number },
  graphics?: ResolvedIsometricGraphics,
): SceneIsoPainterView[] => {
  const painters: SceneIsoPainterView[] = [];
  for (const pillar of dungeon.layout.pillars ?? []) {
    if (!isDiscovered(dungeon, pillar.x, pillar.y)) continue;

    const position = {
      x: (pillar.x + 0.5) * cellSize,
      y: (pillar.y + 0.5) * cellSize,
    };
    const tile = graphics
      ? getIsometricTileImage(
          graphics,
          resolveIsometricPillarTileId(graphics, pillar.x, pillar.y),
        )
      : null;

    if (tile) {
      painters.push({
        position,
        draw: (ctx, center) => {
          const { width, height } = getIsometricTileDimensions(
            cellSize,
            projection,
            tile.scale,
            tile.image.naturalWidth,
            tile.image.naturalHeight,
          );
          ctx.drawImage(
            tile.image,
            center.x - width * tile.anchor.x,
            center.y + projection.by * cellSize - height * tile.anchor.y,
            width,
            height,
          );
        },
      });
    } else {
      painters.push(
        buildDungeonTilePainter(
          DUNGEON_TILES.PILLAR_BASE,
          groundSheet,
          position,
          cellSize,
          projection.ax,
        ),
        buildDungeonTilePainter(
          DUNGEON_TILES.PILLAR_TOP,
          groundSheet,
          { x: position.x, y: position.y - cellSize },
          cellSize,
          projection.ax,
        ),
      );
    }
  }
  return painters;
};

const buildDungeonObjectPainters = (
  dungeon: Dungeon,
  view: SceneDungeonView,
  groundSheet: CanvasImageSource,
  cellSize: number,
  zoom: number,
  debugMode: boolean,
  graphics: ResolvedIsometricGraphics | undefined,
  projection: { ax: number; by: number },
): SceneIsoPainterView[] => {
  const painters: SceneIsoPainterView[] = [];
  painters.push(
    ...buildIsometricPillarPainters(
      dungeon,
      groundSheet,
      cellSize,
      projection,
      graphics,
    ),
  );

  for (const interactable of dungeon.layout.interactables ?? []) {
    const { x, y } = interactable.position;
    if (!isDiscovered(dungeon, x, y)) continue;
    if (interactable.secret) continue;
    painters.push({
      position: { x: (x + 0.5) * cellSize, y: (y + 0.5) * cellSize },
      draw: (ctx, center) => {
        ctx.fillStyle = 'rgba(50, 150, 255, 0.28)';
        const halfWidth = cellSize * zoom;
        const halfHeight = cellSize * zoom * 0.5;
        ctx.beginPath();
        ctx.moveTo(center.x, center.y - halfHeight);
        ctx.lineTo(center.x + halfWidth, center.y);
        ctx.lineTo(center.x, center.y + halfHeight);
        ctx.lineTo(center.x - halfWidth, center.y);
        ctx.closePath();
        ctx.fill();
        if (debugMode) {
          ctx.fillStyle = 'cyan';
          ctx.font = `${String(10 * zoom)}px Arial`;
          ctx.fillText(interactable.effect, center.x + 2, center.y + 12 * zoom);
        }
      },
    });
  }

  const portal = view.portal;
  if (portal && isDiscovered(dungeon, portal.x, portal.y)) {
    const center = {
      x: (portal.x + 0.5) * cellSize,
      y: (portal.y + 0.5) * cellSize,
    };
    painters.push({
      position: center,
      draw: (ctx, screenPosition) => {
        const radius = cellSize * 0.4 * zoom;
        ctx.save();
        ctx.fillStyle = 'rgba(155, 89, 182, 0.35)';
        ctx.beginPath();
        ctx.ellipse(
          screenPosition.x,
          screenPosition.y,
          radius,
          radius * 0.5,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.strokeStyle = 'rgba(210, 170, 255, 0.9)';
        ctx.lineWidth = 1.5 * zoom;
        ctx.stroke();
        ctx.restore();
      },
    });
  }
  return painters;
};

export const renderIsometricDungeonPrototype = (
  ctx: CanvasRenderingContext2D,
  state: GameState,
  actorsSheet: CanvasImageSource,
  groundSheet: CanvasImageSource,
  cellSize: number,
  view: SceneIsoView,
  debugMode: boolean,
  currentTime: number = Date.now(),
  lightCanvas?: HTMLCanvasElement,
  pixelRatio = 1,
  lightMaskCanvas?: HTMLCanvasElement,
  reuseLightMask = false,
): SceneActorView[] => {
  const dungeon = buildDungeonView(state.dungeon);
  const graphics = getIsometricGraphics(
    state.campaignId,
    state.dungeon.isometricGraphics,
  );
  const world = buildIsometricWorldView(
    dungeon,
    cellSize,
    debugMode,
    graphics,
    view,
  );
  const heroes = buildHeroViewModels(
    state,
    actorsSheet,
    debugMode,
    currentTime,
  );
  const heroPainters = buildHeroPainters(heroes, cellSize, view.projection.ax);
  const liveActors = [
    ...heroes,
    ...buildMonsterViewModels(state, actorsSheet, debugMode, currentTime),
  ];
  const corpses = buildCorpseViewModels(state, currentTime);
  const actors = [...liveActors, ...corpses];
  const decorators = buildDecoratorViewModels(
    state,
    groundSheet,
    cellSize,
    true,
  ).filter((item) =>
    isDiscovered(state.dungeon, item.position.x, item.position.y),
  );
  const items = buildItemViewModels(
    state,
    groundSheet,
    cellSize,
    debugMode,
  ).filter((item) =>
    isDiscovered(state.dungeon, item.position.x, item.position.y),
  );
  const foundSecretItems = buildFoundSecretViewModels(
    dungeon,
    groundSheet,
    cellSize,
    debugMode,
  ).filter((item) =>
    isDiscovered(state.dungeon, item.position.x, item.position.y),
  );
  const itemsAfterDecorators = buildLightSpriteViewModels(
    state,
    groundSheet,
    cellSize,
    debugMode,
    currentTime,
  ).filter((item) =>
    isDiscovered(state.dungeon, item.position.x, item.position.y),
  );
  const corpsePainters = prepareDepthBiasedIsometricPainters(
    buildHeroPainters(corpses, cellSize, view.projection.ax),
    view,
  );
  const decoratorPainters = prepareDepthBiasedIsometricPainters(
    buildIsometricDecoratorPainters(
      decorators,
      cellSize,
      view.projection,
      graphics,
    ),
    view,
  );
  const depthSortedDoors = prepareDepthSortedIsometricDoorPainters(world, view);
  const depthSortedFloors = prepareDepthSortedIsometricFloorPainters(
    depthSortedDoors.world,
    view,
  );
  const hasDepthAwareLightMask = Boolean(
    lightCanvas &&
    lightMaskCanvas &&
    (reuseLightMask ||
      renderIsometricLightMask(
        world,
        view,
        lightCanvas,
        lightMaskCanvas,
        pixelRatio,
      )),
  );
  const lightPainter = lightCanvas
    ? hasDepthAwareLightMask
      ? undefined
      : buildIsometricFloorLightPainter(world, view, lightCanvas, pixelRatio)
    : undefined;
  const wallLightPainters =
    lightCanvas && !hasDepthAwareLightMask
      ? buildIsometricWallLightPainters(world, view, lightCanvas, pixelRatio)
      : [];
  const foregroundWallWorld = prepareIsometricForegroundWallPainters(
    depthSortedFloors.world,
    heroPainters,
    view,
  );
  drawIsoWorldFrame(
    ctx,
    foregroundWallWorld,
    view,
    [],
    [
      ...depthSortedFloors.painters,
      ...depthSortedDoors.painters,
      ...(lightPainter ? [lightPainter] : []),
      ...wallLightPainters,
      ...corpsePainters,
      ...buildItemPainters(items, cellSize, view.projection.ax),
      ...decoratorPainters,
      ...buildIsometricFoundSecretPainters(
        foundSecretItems,
        cellSize,
        view.projection,
        graphics,
      ),
      ...buildItemPainters(itemsAfterDecorators, cellSize, view.projection.ax),
      ...buildDungeonObjectPainters(
        state.dungeon,
        dungeon,
        groundSheet,
        cellSize,
        view.projection.ax,
        debugMode,
        graphics,
        view.projection,
      ),
      ...buildHeroPainters(liveActors, cellSize, view.projection.ax),
    ],
  );
  if (hasDepthAwareLightMask && lightMaskCanvas) {
    ctx.save();
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(
      lightMaskCanvas,
      0,
      0,
      lightMaskCanvas.width / pixelRatio,
      lightMaskCanvas.height / pixelRatio,
    );
    ctx.restore();
  }
  return actors;
};
