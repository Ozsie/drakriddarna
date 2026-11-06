// Facade over the @hoard-engine/scene dungeon-plane compositing: the
// view-typed drawing cores live in the package; this module keeps the
// historical entry points for the callers (and tests), resolving the
// game's dungeon data into the package's view contracts first — the
// fog-of-war-sealed grid, the classified corners and the terrain
// styling are game knowledge resolved by the adapter in
// src/scene/adapters.ts (corner data arrives in the view at lift; the
// renderer runs no detection of its own).
import type { SceneDungeonView, SceneViewport } from '@hoard-engine/scene';
import {
  DEFAULT_WALL_COLOUR,
  TERRAIN_ANIMATION_STEP_MS,
  background,
  clearFogCloudCaches,
  dungeonViewBackdrop,
  edgeWallRect,
  hasAnimatedTerrainEffects as sceneHasAnimatedTerrainEffects,
  renderDoors as sceneRenderDoors,
  renderFogLightDim,
  renderGrid as sceneRenderGrid,
  renderInteractables,
  renderPillarTops,
  renderPillars,
  renderPortal,
  renderRoomFog,
  renderSecrets,
  renderTerrain as sceneRenderTerrain,
  renderTerrainAnimation as sceneRenderTerrainAnimation,
  renderWalls as sceneRenderWalls,
} from '@hoard-engine/scene';
import { buildDungeonView } from '../scene/adapters';

export {
  DEFAULT_WALL_COLOUR,
  TERRAIN_ANIMATION_STEP_MS,
  background,
  clearFogCloudCaches,
  dungeonViewBackdrop,
  edgeWallRect,
  renderFogLightDim,
  renderInteractables,
  renderPillarTops,
  renderPillars,
  renderPortal,
  renderRoomFog,
  renderSecrets,
};

// The sealed-corner grid derivation is game knowledge (its fog-of-war
// and door-sealing rules pair with the grid engine's corner
// classifier); the adapter owns it and the package consumes its result.
export { sealedCornerGrid } from '../scene/adapters';

export const renderGrid = (
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  cellSize: number,
  dungeon: SceneDungeonView,
  debugMode: boolean,
): void => {
  sceneRenderGrid(ctx, ground, cellSize, buildDungeonView(dungeon), debugMode);
};

export const renderDoors = (
  ctx: CanvasRenderingContext2D,
  ground: CanvasImageSource,
  cellSize: number,
  dungeon: SceneDungeonView,
  debugMode: boolean,
): void => {
  sceneRenderDoors(ctx, ground, cellSize, buildDungeonView(dungeon), debugMode);
};

export const renderWalls = (
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  dungeon: SceneDungeonView,
  debugMode: boolean,
): void => {
  sceneRenderWalls(ctx, cellSize, buildDungeonView(dungeon), debugMode);
};

export const renderTerrain = (
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  dungeon: SceneDungeonView,
  debugMode: boolean,
): void => {
  sceneRenderTerrain(ctx, cellSize, buildDungeonView(dungeon), debugMode);
};

export const renderTerrainAnimation = (
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  dungeon: SceneDungeonView,
  debugMode: boolean,
  timeMs: number,
  viewport?: SceneViewport,
): void => {
  sceneRenderTerrainAnimation(
    ctx,
    cellSize,
    buildDungeonView(dungeon),
    debugMode,
    timeMs,
    viewport,
  );
};

export const hasAnimatedTerrainEffects = (
  dungeon: SceneDungeonView,
  debugMode: boolean,
  viewport?: SceneViewport,
): boolean =>
  sceneHasAnimatedTerrainEffects(
    buildDungeonView(dungeon),
    debugMode,
    viewport,
  );
