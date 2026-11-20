import { zoomAnchorPan } from '@hoard-engine/camera';
import {
  createIsoProjection,
  createIsoView,
  isoPlaneToWorld,
  screenToWorld,
  worldToScreen,
  type SceneIsoView,
} from '@hoard-engine/scene';
import { clampZoom } from './ZoomLogic';

// Composition only: the isometric projection transforms live in `scene`,
// the projection-independent anchoring mechanic in `camera`, and the zoom
// limits in `ZoomLogic`. This module binds the game's camera state (screen
// pan, zoom, follow center, cell size) to those pieces.
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
  const view = createIsometricCameraView(options);
  const unpannedView = createIsometricCameraView({
    ...options,
    panX: 0,
    panY: 0,
    zoom,
  });
  const pan = zoomAnchorPan(
    {
      screenToWorld: ({ x, y }) => screenToWorld(view, x, y),
      worldToScreenUnpanned: ({ x, y }) => worldToScreen(unpannedView, x, y),
    },
    anchor,
  );
  return { zoom, panX: pan.x, panY: pan.y };
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
