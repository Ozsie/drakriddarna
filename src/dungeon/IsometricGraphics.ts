import { asset } from '$app/paths';
import { getReadyImage } from '../core/ImageCache';

export type IsometricGraphicsTile = {
  image: string;
  scale?: number;
  anchor?: { x: number; y: number };
};

export type IsometricGraphicsManifest = {
  version: 1;
  cells: Record<string, string>;
  tiles: Record<string, IsometricGraphicsTile>;
  wallShapes?: Record<string, string[]>;
  pillarVariants?: string[];
  decoratorVariants?: string[];
};

export type ResolvedIsometricGraphics = {
  cells: Record<string, string>;
  wallShapes: Record<string, string[]>;
  pillarVariants?: string[];
  decoratorVariants?: string[];
  tiles: Record<
    string,
    {
      imageUrl: string;
      scale: number;
      anchor: { x: number; y: number };
    }
  >;
};

const DEFAULT_GRAPHICS_ROOT = 'isometric';
const loadedIndexes = new Map<string, IsometricGraphicsManifest | null>();
const loadingIndexes = new Set<string>();
let graphicsLoadedListener: (() => void) | null = null;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isAnchor = (value: unknown): value is { x: number; y: number } =>
  isRecord(value) &&
  typeof value.x === 'number' &&
  typeof value.y === 'number' &&
  value.x >= 0 &&
  value.x <= 1 &&
  value.y >= 0 &&
  value.y <= 1;

const isSafeRelativePath = (path: string): boolean =>
  path.length > 0 &&
  !path.startsWith('/') &&
  !path.includes('\\') &&
  !path.includes(':') &&
  path
    .split('/')
    .every((part) => part.length > 0 && part !== '.' && part !== '..');

const parseTile = (value: unknown): IsometricGraphicsTile | null => {
  if (!isRecord(value) || typeof value.image !== 'string') return null;
  if (!isSafeRelativePath(value.image)) return null;
  if (
    value.scale !== undefined &&
    (typeof value.scale !== 'number' ||
      !Number.isFinite(value.scale) ||
      value.scale <= 0 ||
      value.scale > 8)
  ) {
    return null;
  }
  if (value.anchor !== undefined && !isAnchor(value.anchor)) return null;
  return {
    image: value.image,
    ...(typeof value.scale === 'number' ? { scale: value.scale } : {}),
    ...(isAnchor(value.anchor)
      ? {
          anchor: {
            x: value.anchor.x,
            y: value.anchor.y,
          },
        }
      : {}),
  };
};

export const parseIsometricGraphicsManifest = (
  value: unknown,
): IsometricGraphicsManifest | null => {
  if (!isRecord(value) || value.version !== 1) return null;
  if (!isRecord(value.cells) || !isRecord(value.tiles)) return null;

  const cells: Record<string, string> = {};
  for (const [symbol, tileId] of Object.entries(value.cells)) {
    if (typeof tileId !== 'string' || tileId.length === 0) return null;
    cells[symbol] = tileId;
  }

  const tiles: Record<string, IsometricGraphicsTile> = {};
  for (const [tileId, rawTile] of Object.entries(value.tiles)) {
    const tile = parseTile(rawTile);
    if (!tile || tileId.length === 0) return null;
    tiles[tileId] = tile;
  }

  const wallShapes: Record<string, string[]> = {};
  if (value.wallShapes !== undefined) {
    if (!isRecord(value.wallShapes)) return null;
    for (const [shape, rawTileIds] of Object.entries(value.wallShapes)) {
      if (
        shape.length === 0 ||
        !Array.isArray(rawTileIds) ||
        rawTileIds.length === 0 ||
        rawTileIds.some((tileId) => typeof tileId !== 'string' || !tileId)
      ) {
        return null;
      }
      wallShapes[shape] = rawTileIds as string[];
    }
  }

  let pillarVariants: string[] | undefined;
  if (value.pillarVariants !== undefined) {
    if (
      !Array.isArray(value.pillarVariants) ||
      value.pillarVariants.length === 0 ||
      value.pillarVariants.some(
        (tileId) => typeof tileId !== 'string' || !tileId,
      )
    ) {
      return null;
    }
    pillarVariants = value.pillarVariants as string[];
  }

  let decoratorVariants: string[] | undefined;
  if (value.decoratorVariants !== undefined) {
    if (
      !Array.isArray(value.decoratorVariants) ||
      value.decoratorVariants.length === 0 ||
      value.decoratorVariants.some(
        (tileId) => typeof tileId !== 'string' || !tileId,
      )
    ) {
      return null;
    }
    decoratorVariants = value.decoratorVariants as string[];
  }

  return {
    version: 1,
    cells,
    tiles,
    wallShapes,
    ...(pillarVariants ? { pillarVariants } : {}),
    ...(decoratorVariants ? { decoratorVariants } : {}),
  };
};

export const resolveIsometricGraphics = (
  fallback: IsometricGraphicsManifest,
  fallbackRoot: string,
  override?: IsometricGraphicsManifest | null,
  overrideRoot?: string,
): ResolvedIsometricGraphics => {
  const resolveTiles = (
    manifest: IsometricGraphicsManifest,
    root: string,
  ): ResolvedIsometricGraphics['tiles'] =>
    Object.fromEntries(
      Object.entries(manifest.tiles).map(([id, tile]) => [
        id,
        {
          imageUrl: `${root}/${tile.image}`,
          scale: tile.scale ?? 1,
          anchor: tile.anchor ?? { x: 0.5, y: 1 },
        },
      ]),
    );

  const fallbackTiles = resolveTiles(fallback, fallbackRoot);
  const overrideTiles =
    override && overrideRoot ? resolveTiles(override, overrideRoot) : {};
  const tiles = { ...fallbackTiles, ...overrideTiles };
  const cells = { ...fallback.cells };
  const wallShapes = Object.fromEntries(
    Object.entries(fallback.wallShapes ?? {}).filter(([, tileIds]) =>
      tileIds.every((tileId) => tiles[tileId]),
    ),
  );
  for (const [symbol, tileId] of Object.entries(override?.cells ?? {})) {
    if (tiles[tileId]) cells[symbol] = tileId;
  }
  for (const [shape, tileIds] of Object.entries(override?.wallShapes ?? {})) {
    if (tileIds.every((tileId) => tiles[tileId])) wallShapes[shape] = tileIds;
  }
  const fallbackPillarVariants = (fallback.pillarVariants ?? []).filter(
    (tileId) => tiles[tileId],
  );
  const overridePillarVariants = (override?.pillarVariants ?? []).filter(
    (tileId) => tiles[tileId],
  );
  const overridePillar = override?.cells.pillar;
  const pillarVariants =
    overridePillarVariants.length > 0
      ? overridePillarVariants
      : overridePillar && tiles[overridePillar]
        ? [overridePillar]
        : fallbackPillarVariants.length > 0
          ? fallbackPillarVariants
          : cells.pillar && tiles[cells.pillar]
            ? [cells.pillar]
            : undefined;
  const isCompleteDecoratorVariant = (variant: string): boolean =>
    (['N', 'E', 'S', 'W'] as const).every(
      (direction) => tiles[`${variant}_${direction}`],
    );
  const fallbackDecoratorVariants = (fallback.decoratorVariants ?? []).filter(
    isCompleteDecoratorVariant,
  );
  const overrideDecoratorVariants = (override?.decoratorVariants ?? []).filter(
    isCompleteDecoratorVariant,
  );
  const decoratorVariants =
    overrideDecoratorVariants.length > 0
      ? overrideDecoratorVariants
      : fallbackDecoratorVariants;

  return {
    cells,
    wallShapes,
    tiles,
    ...(pillarVariants ? { pillarVariants } : {}),
    ...(decoratorVariants.length > 0 ? { decoratorVariants } : {}),
  };
};

export const resolveIsometricPillarTileId = (
  graphics: ResolvedIsometricGraphics,
  x: number,
  y: number,
): string | undefined => {
  const variants = graphics.pillarVariants?.filter(
    (tileId) => graphics.tiles[tileId],
  );
  if (!variants || variants.length === 0) return graphics.cells.pillar;
  const coordinateHash =
    (Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0;
  return variants[coordinateHash % variants.length];
};

export const resolveIsometricDecoratorTileId = (
  graphics: ResolvedIsometricGraphics,
  x: number,
  y: number,
): string | undefined => {
  const variants = graphics.decoratorVariants?.filter((variant) =>
    (['N', 'E', 'S', 'W'] as const).every(
      (direction) => graphics.tiles[`${variant}_${direction}`],
    ),
  );
  if (!variants || variants.length === 0) return undefined;

  const coordinateHash =
    (Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0;
  const variant = variants[coordinateHash % variants.length];
  const direction = (['N', 'E', 'S', 'W'] as const)[(coordinateHash >>> 8) % 4];
  return variant && direction ? `${variant}_${direction}` : undefined;
};

export const resolveIsometricCellTileId = (
  graphics: ResolvedIsometricGraphics,
  cellType: 'floor' | 'wall' | 'door' | 'openDoor',
  symbol?: string,
): string | undefined =>
  (symbol ? graphics.cells[symbol] : undefined) ??
  graphics.cells[cellType] ??
  (cellType === 'openDoor' ? graphics.cells.door : undefined);

export const resolveIsometricDoorTileId = (
  graphics: ResolvedIsometricGraphics,
  open: boolean,
  side: 'Left' | 'Right' | 'Up' | 'Down',
): string | undefined => {
  const direction = { Left: 'W', Right: 'E', Up: 'N', Down: 'S' }[side];
  return (
    graphics.cells[`door${open ? 'Open' : 'Closed'}_${direction}`] ??
    graphics.cells[open ? 'openDoor' : 'door'] ??
    graphics.cells.door
  );
};

export const resolveIsometricChestTileId = (
  graphics: ResolvedIsometricGraphics,
  open: boolean,
  direction: 'N' | 'E' | 'S' | 'W',
): string | undefined => {
  const tileId =
    graphics.cells[`chest${open ? 'Open' : 'Closed'}_${direction}`];
  return tileId && graphics.tiles[tileId] ? tileId : undefined;
};

export const resolveIsometricWallTileIds = (
  graphics: ResolvedIsometricGraphics,
  neighbors: { north: boolean; east: boolean; south: boolean; west: boolean },
  cornerType?: string,
): string[] => {
  const shape = (['north', 'east', 'south', 'west'] as const)
    .filter((direction) => neighbors[direction])
    .map((direction) => direction[0])
    .join('');
  return (
    (cornerType ? graphics.wallShapes[cornerType] : undefined) ??
    graphics.wallShapes[shape || 'none'] ??
    [graphics.cells.wall].filter((tileId): tileId is string => !!tileId)
  );
};

const isSafeFolder = (folder: string): boolean =>
  folder.length > 0 && isSafeRelativePath(folder);

const loadIndex = (
  root: string,
): IsometricGraphicsManifest | null | undefined => {
  if (loadedIndexes.has(root)) return loadedIndexes.get(root);
  if (loadingIndexes.has(root) || typeof fetch === 'undefined')
    return undefined;

  loadingIndexes.add(root);
  void fetch(asset(`${root}/index.json`))
    .then((response) => (response.ok ? response.json() : null))
    .then((value: unknown) => parseIsometricGraphicsManifest(value))
    .catch(() => null)
    .then((manifest) => {
      loadedIndexes.set(root, manifest);
      loadingIndexes.delete(root);
      graphicsLoadedListener?.();
    });
  return undefined;
};

export const getIsometricGraphics = (
  campaignId?: string,
  campaignFolder?: string,
): ResolvedIsometricGraphics | undefined => {
  const fallback = loadIndex(DEFAULT_GRAPHICS_ROOT);
  if (!fallback) return undefined;

  const campaignRoot =
    campaignId &&
    isSafeFolder(campaignId) &&
    campaignFolder &&
    isSafeFolder(campaignFolder)
      ? `campaigns/${campaignId}/${campaignFolder}`
      : undefined;
  const override = campaignRoot ? loadIndex(campaignRoot) : null;

  return resolveIsometricGraphics(
    fallback,
    DEFAULT_GRAPHICS_ROOT,
    override ?? null,
    campaignRoot,
  );
};

export const getIsometricTileImage = (
  graphics: ResolvedIsometricGraphics,
  tileId: string | undefined,
): {
  image: HTMLImageElement;
  scale: number;
  anchor: { x: number; y: number };
} | null => {
  if (!tileId) return null;
  const tile = graphics.tiles[tileId];
  const image = tile ? getReadyImage(tile.imageUrl) : null;
  return tile && image ? { ...tile, image } : null;
};

export const setIsometricGraphicsLoadedListener = (
  listener: (() => void) | null,
): void => {
  graphicsLoadedListener = listener;
};
