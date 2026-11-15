import {
  COLLAPSED,
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
  resolveIsometricDoorTileId,
  resolveIsometricWallTileIds,
  type ResolvedIsometricGraphics,
} from './IsometricGraphics';

const ISO_WALL = 'W';
const ISO_DOOR = 'D';
const ISO_FLOOR = 'F';
const ISO_HIDDEN = 'H';

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
  const isCell = (cellX: number, cellY: number, cell: string): boolean =>
    toArray(worldRows[cellY] ?? '')[cellX] === cell;
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

export const buildIsometricWorldView = (
  dungeon: SceneDungeonView,
  cellSize: number,
  debugMode = false,
  graphics?: ResolvedIsometricGraphics,
  view?: SceneIsoView,
): SceneIsoWorldView => {
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
      .map(
        (
          door,
        ): [
          string,
          { open: boolean; side: 'Left' | 'Right' | 'Up' | 'Down' },
        ] => [
          `${String(door.x)},${String(door.y)}`,
          { open: door.open, side: door.side },
        ],
      ),
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
        if (!isVisibleCell(x, y, cell)) return ISO_HIDDEN;
        if (doors.has(`${String(x)},${String(y)}`)) return ISO_DOOR;
        if (cell === WALL || cell === SEALED_DOOR || cell === COLLAPSED) {
          return ISO_WALL;
        }
        return ISO_FLOOR;
      })
      .join(''),
  );
  const buildPainter = (
    x: number,
    y: number,
    tileIds: string[],
  ): SceneIsoPainterView | undefined => {
    if (!graphics) return undefined;
    const tiles = tileIds
      .map((tileId) => getIsometricTileImage(graphics, tileId))
      .filter((tile): tile is NonNullable<typeof tile> => tile !== null);
    if (tiles.length === 0) return undefined;
    const projection = view?.projection ?? { ax: 1, by: 0.5 };
    const groundOffset = projection.by * cellSize;
    return {
      position: { x: (x + 0.5) * cellSize, y: (y + 0.5) * cellSize },
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
      const tileIds = graphics
        ? resolveIsometricWallTileIds(
            graphics,
            getIsometricWallShape(worldRows, x, y),
          )
        : [];
      return buildPainter(x, y, tileIds);
    }),
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
  return {
    rows: worldRows,
    ...(graphics ? { floorPainters, wallPainters, doorPainters } : {}),
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
    pitCells: (resolvedDungeon.layout.pits ?? []).filter((pit) =>
      isDiscoveredCell(pit.x, pit.y),
    ),
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

const buildDungeonObjectPainters = (
  dungeon: Dungeon,
  view: SceneDungeonView,
  groundSheet: CanvasImageSource,
  cellSize: number,
  zoom: number,
  debugMode: boolean,
): SceneIsoPainterView[] => {
  const painters: SceneIsoPainterView[] = [];
  for (const pillar of dungeon.layout.pillars ?? []) {
    if (!isDiscovered(dungeon, pillar.x, pillar.y)) continue;
    const position = {
      x: (pillar.x + 0.5) * cellSize,
      y: (pillar.y + 0.5) * cellSize,
    };
    painters.push(
      buildDungeonTilePainter(
        DUNGEON_TILES.PILLAR_BASE,
        groundSheet,
        position,
        cellSize,
        zoom,
      ),
      buildDungeonTilePainter(
        DUNGEON_TILES.PILLAR_TOP,
        groundSheet,
        { x: position.x, y: position.y - cellSize },
        cellSize,
        zoom,
      ),
    );
  }

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
  const actors = [
    ...heroes,
    ...buildMonsterViewModels(state, actorsSheet, debugMode, currentTime),
    ...buildCorpseViewModels(state, currentTime),
  ];
  const items = [
    ...buildItemViewModels(state, groundSheet, cellSize, debugMode),
    ...buildDecoratorViewModels(state, groundSheet, cellSize),
    ...buildFoundSecretViewModels(dungeon, groundSheet, cellSize, debugMode),
    ...buildLightSpriteViewModels(
      state,
      groundSheet,
      cellSize,
      debugMode,
      currentTime,
    ),
  ].filter((item) =>
    isDiscovered(state.dungeon, item.position.x, item.position.y),
  );
  drawIsoWorldFrame(
    ctx,
    world,
    view,
    [],
    [
      ...buildHeroPainters(actors, cellSize, view.projection.ax),
      ...buildItemPainters(items, cellSize, view.projection.ax),
      ...buildDungeonObjectPainters(
        state.dungeon,
        dungeon,
        groundSheet,
        cellSize,
        view.projection.ax,
        debugMode,
      ),
    ],
  );
  return actors;
};
