// Zoom mechanics for the centered/panned camera of @hoard-engine/camera:
// clamped zoom levels, zoom-aware screen/world transforms and
// anchor-preserving zoom steps. Dependency-free data functions in the
// engine-package style, so the module can be extracted into
// @hoard-engine/camera; the two-finger pinch gesture state lives in
// src/input/PinchZoomLogic.ts for @hoard-engine/input.

export const ZOOM_DEFAULT = 1;
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 1.5;

// One keyboard '+' / '-' press steps the zoom by this amount.
export const ZOOM_STEP = 0.1;

// Wheel and trackpad pinch zoom is exponential in the scroll distance:
// this is the exponent per deltaY unit (a standard mouse-wheel notch is a
// deltaY of 100, i.e. about 10%).
export const ZOOM_WHEEL_SENSITIVITY = 0.001;

export const clampZoom = (zoom: number): number =>
  Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));

export interface ZoomPoint {
  x: number;
  y: number;
}

// The same viewport shape as @hoard-engine/camera's CameraView, restated
// so the module stays package-independent; the camera view satisfies it
// structurally.
export interface ZoomView {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  panX: number;
  panY: number;
}

export const worldToScreenZoomed = (
  point: ZoomPoint,
  view: ZoomView,
  zoom: number,
): ZoomPoint => ({
  x: (point.x - view.centerX) * zoom + view.width / 2 + view.panX,
  y: (point.y - view.centerY) * zoom + view.height / 2 + view.panY,
});

export const screenToWorldZoomed = (
  point: ZoomPoint,
  view: ZoomView,
  zoom: number,
): ZoomPoint => ({
  x: (point.x - view.width / 2 - view.panX) / zoom + view.centerX,
  y: (point.y - view.height / 2 - view.panY) / zoom + view.centerY,
});

export interface ZoomResult {
  zoom: number;
  panX: number;
  panY: number;
}

// Applies a zoom change at a screen-space anchor: the world point under
// the anchor stays under it, via the pan offset. An unchanged (clamped)
// zoom keeps the pan.
export const zoomAtAnchor = (
  view: ZoomView,
  currentZoom: number,
  nextZoomRaw: number,
  anchor: ZoomPoint,
): ZoomResult => {
  const zoom = clampZoom(nextZoomRaw);
  if (zoom === currentZoom) {
    return { zoom, panX: view.panX, panY: view.panY };
  }
  const world = screenToWorldZoomed(anchor, view, currentZoom);
  const anchored = worldToScreenZoomed(
    world,
    { ...view, panX: 0, panY: 0 },
    zoom,
  );
  return {
    zoom,
    panX: anchor.x - anchored.x,
    panY: anchor.y - anchored.y,
  };
};

// One keyboard zoom step per press: `steps` may be +/- 1 (or larger for
// repeated steps in one go).
export const zoomByStep = (zoom: number, steps: number): number =>
  clampZoom(zoom + steps * ZOOM_STEP);

// Wheel scroll zoom: exponential in deltaY, negative direction zooms in
// (scroll up). Trackpad pinch gestures arrive as ctrl+wheel with small
// deltas and work through the same path.
export const zoomFromWheelDelta = (
  zoom: number,
  deltaY: number,
  sensitivity: number = ZOOM_WHEEL_SENSITIVITY,
): number => clampZoom(zoom * Math.exp(-deltaY * sensitivity));
