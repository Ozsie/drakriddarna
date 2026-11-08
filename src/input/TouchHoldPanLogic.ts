// One-finger-touch-hold pan gesture state in the extraction style of
// @hoard-engine/input's gesture module: pure mechanics over touch
// points, browser-independent; the module can be extracted into
// @hoard-engine/input alongside the pinch zoom state. The hold timer
// itself is consumer-owned — state transitions are driven by the
// caller's clock.

import type { TouchPoint } from '@hoard-engine/input';

// How long a single finger must stay down before dragging pans. Kept
// short of typical swipe durations so a slow swipe never starts a pan.
export const TOUCH_HOLD_PAN_DELAY_MS = 250;

// Movement beyond this radius before the hold elapses cancels the
// candidate — the gesture falls back to a tap or swipe instead.
export const TOUCH_HOLD_PAN_MOVE_SLOP_PX = 10;

export interface TouchHoldPanState {
  // A single touch is down, awaiting either the hold delay (pan) or a
  // lift/movement (tap/swipe).
  isCandidate: boolean;
  // The hold elapsed while the finger was still down: dragging pans.
  isPanning: boolean;
  // The finger actually moved while panning — the gesture owned the
  // screen and the release must not fall through to tap or swipe.
  hasPanned: boolean;
  startX: number;
  startY: number;
  startPanX: number;
  startPanY: number;
}

export const createTouchHoldPanState = (): TouchHoldPanState => ({
  isCandidate: false,
  isPanning: false,
  hasPanned: false,
  startX: 0,
  startY: 0,
  startPanX: 0,
  startPanY: 0,
});

// Anchors a single-touch candidate at the current pan offset. Any
// previous gesture state is discarded; callers invoke it only for a
// one-touch touchstart.
export const beginTouchHoldPan = (
  touch: TouchPoint,
  currentPan: { x: number; y: number },
  state: TouchHoldPanState,
): boolean => {
  state.isCandidate = true;
  state.isPanning = false;
  state.hasPanned = false;
  state.startX = touch.clientX;
  state.startY = touch.clientY;
  state.startPanX = currentPan.x;
  state.startPanY = currentPan.y;
  return true;
};

// The hold delay elapsed: a still-down candidate becomes a pan. No-op
// when the gesture was already cancelled (movement) or resolved.
export const activateTouchHoldPan = (state: TouchHoldPanState): boolean => {
  if (!state.isCandidate) return false;
  state.isCandidate = false;
  state.isPanning = true;
  return true;
};

// Cancels and forgets the gesture entirely — a second finger landing
// (pinch takes over) or a touchcancel.
export const cancelTouchHoldPan = (state: TouchHoldPanState): void => {
  state.isCandidate = false;
  state.isPanning = false;
  state.hasPanned = false;
  state.startX = 0;
  state.startY = 0;
  state.startPanX = 0;
  state.startPanY = 0;
};

// Pans while panning; before that, movement beyond the slop cancels the
// candidate so the gesture falls back to tap/swipe.
export const handleTouchHoldPanMove = (
  touches: ArrayLike<TouchPoint>,
  state: TouchHoldPanState,
  moveSlopPx: number = TOUCH_HOLD_PAN_MOVE_SLOP_PX,
): { panX: number; panY: number } | null => {
  if (touches.length !== 1) return null;
  const touch = touches[0];
  if (state.isPanning) {
    state.hasPanned = true;
    return {
      panX: state.startPanX + (touch.clientX - state.startX),
      panY: state.startPanY + (touch.clientY - state.startY),
    };
  }
  if (state.isCandidate) {
    const dx = touch.clientX - state.startX;
    const dy = touch.clientY - state.startY;
    if (Math.abs(dx) > moveSlopPx || Math.abs(dy) > moveSlopPx) {
      state.isCandidate = false;
    }
  }
  return null;
};

// Ends the gesture on the last finger lifting: whether a pan was active
// and whether it actually moved (suppressing the release's tap/swipe).
export const endTouchHoldPan = (
  state: TouchHoldPanState,
): { wasPanning: boolean; moved: boolean } => {
  const wasPanning = state.isPanning;
  const moved = state.hasPanned;
  state.isCandidate = false;
  state.isPanning = false;
  state.hasPanned = false;
  state.startX = 0;
  state.startY = 0;
  state.startPanX = 0;
  state.startPanY = 0;
  return { wasPanning, moved };
};
