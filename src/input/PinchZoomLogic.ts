// Two-finger pinch gesture state in the extraction style of
// @hoard-engine/input's gesture module: pure mechanics over touch
// points, browser-independent; the module can be extracted into
// @hoard-engine/input alongside the one-finger hold pan in
// TouchHoldPanLogic.ts. Zoom clamping and anchoring live in
// src/camera/ZoomLogic.ts.

import type { TouchPoint } from '@hoard-engine/input';

export interface PinchZoomState {
  isPinching: boolean;
  startDistance: number;
  startZoom: number;
}

export const createPinchZoomState = (): PinchZoomState => ({
  isPinching: false,
  startDistance: 0,
  startZoom: 1,
});

export const getTouchDistance = (
  touches: ArrayLike<TouchPoint>,
): number | null => {
  if (touches.length < 2) return null;
  return Math.hypot(
    touches[1].clientX - touches[0].clientX,
    touches[1].clientY - touches[0].clientY,
  );
};

// Anchors the gesture at the current two-finger distance and zoom, so
// later moves scale relative to this starting point. Called when two
// touches are placed, and again when a lifted third finger leaves two
// behind.
export const handlePinchZoomStart = (
  touches: ArrayLike<TouchPoint>,
  currentZoom: number,
  state: PinchZoomState,
): boolean => {
  if (touches.length !== 2) return false;
  const distance = getTouchDistance(touches);
  if (distance === null || distance <= 0) return false;
  state.isPinching = true;
  state.startDistance = distance;
  state.startZoom = currentZoom;
  return true;
};

// The target zoom for the current two-finger distance, scaled from the
// anchored start. Null while the gesture is inactive or not two touches.
export const handlePinchZoomMove = (
  touches: ArrayLike<TouchPoint>,
  state: PinchZoomState,
): { zoom: number } | null => {
  if (!state.isPinching || touches.length !== 2) return null;
  const distance = getTouchDistance(touches);
  if (distance === null || state.startDistance <= 0) return null;
  return { zoom: state.startZoom * (distance / state.startDistance) };
};

// Ends the gesture once fewer than two touches remain; returns whether it
// was active.
export const handlePinchZoomEnd = (
  touches: ArrayLike<TouchPoint>,
  state: PinchZoomState,
): boolean => {
  if (touches.length >= 2) return false;
  const wasPinching = state.isPinching;
  state.isPinching = false;
  return wasPinching;
};
