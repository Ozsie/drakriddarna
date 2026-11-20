import {
  createIsoProjection,
  createIsoView,
  isoPlaneToWorld,
  screenToWorld,
  type SceneIsoView,
  worldToScreen,
} from '@hoard-engine/scene';
import { clampZoom } from './ZoomLogic';

export type IsometricCameraOptions = {
  width: number;
  height: number;
  center: { x: number; y: number };
  cellSize: number;
  panX: number;
  panY: number;
  zoom: number;
};

export const createIsometricCameraView = (
  options: IsometricCameraOptions,
): SceneIsoView => {
  const projection = createIsoProjection(
    options.cellSize,
    options.cellSize * 2 * options.zoom,
    options.cellSize * options.zoom,
  );
  const pan = isoPlaneToWorld(projection, options.panX, options.panY);
  return createIsoView(
    {
      x: options.center.x - pan.x,
      y: options.center.y - pan.y,
    },
    options.width,
    options.height,
    options.cellSize,
    projection,
  );
};

export const screenToIsometricWorldPosition = (
  screenX: number,
  screenY: number,
  options: IsometricCameraOptions,
): { x: number; y: number } => {
  const view = createIsometricCameraView(options);
  return screenToWorld(view, screenX, screenY);
};

export const zoomIsometricCameraAtAnchor = (
  options: IsometricCameraOptions,
  zoomRaw: number,
  anchor: { x: number; y: number },
): { zoom: number; panX: number; panY: number } => {
  const zoom = clampZoom(zoomRaw);
  if (zoom === options.zoom) {
    return { zoom, panX: options.panX, panY: options.panY };
  }
  const world = screenToIsometricWorldPosition(anchor.x, anchor.y, options);
  const unpannedView = createIsometricCameraView({
    ...options,
    panX: 0,
    panY: 0,
    zoom,
  });
  const projected = worldToScreen(unpannedView, world.x, world.y);
  return {
    zoom,
    panX: anchor.x - projected.x,
    panY: anchor.y - projected.y,
  };
};

export const screenToIsometricGridPosition = (
  screenX: number,
  screenY: number,
  options: IsometricCameraOptions,
): { x: number; y: number } => {
  const world = screenToIsometricWorldPosition(screenX, screenY, options);
  return {
    x: Math.floor(world.x / options.cellSize),
    y: Math.floor(world.y / options.cellSize),
  };
};
