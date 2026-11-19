import {
  screenToWorldZoomed as cameraScreenToWorldZoomed,
  worldToScreenZoomed as cameraWorldToScreenZoomed,
  zoomAtAnchor as cameraZoomAtAnchor,
  zoomByStep as cameraZoomByStep,
  zoomFromWheelDelta as cameraZoomFromWheelDelta,
} from '@hoard-engine/camera';
import type { CameraPoint, CameraView, ZoomResult } from '@hoard-engine/camera';

export const ZOOM_DEFAULT = 1;
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 1.5;

// One keyboard '+' / '-' press steps the zoom by this amount.
export const ZOOM_STEP = 0.1;

// A standard mouse-wheel notch is a deltaY of 100, i.e. about 10%.
export const ZOOM_WHEEL_SENSITIVITY = 0.001;

export type ZoomPoint = CameraPoint;
export type ZoomView = CameraView;
export type { ZoomResult };

export const clampZoom = (zoom: number): number =>
  Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));

export const worldToScreenZoomed = cameraWorldToScreenZoomed;
export const screenToWorldZoomed = cameraScreenToWorldZoomed;

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
  return cameraZoomAtAnchor(view, currentZoom, zoom, anchor);
};

export const zoomByStep = (zoom: number, steps: number): number =>
  clampZoom(cameraZoomByStep(zoom, steps, ZOOM_STEP));

export const zoomFromWheelDelta = (zoom: number, deltaY: number): number =>
  clampZoom(cameraZoomFromWheelDelta(zoom, deltaY, ZOOM_WHEEL_SENSITIVITY));
