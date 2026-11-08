// Wheel gesture classification in the extraction style of
// @hoard-engine/input's gesture modules: pure mechanics over plain
// values, browser-independent; the module can be extracted into
// @hoard-engine/input alongside the touch gesture state machines.
//
// A wheel stream must resolve to a single gesture per burst: panning and
// zooming at once makes a trackpad drag smear horizontally while zooming.
// The stream is classified once per burst and the classification sticks:
// a trackpad flick's later hard deltas stay a pan, and a fast mouse
// spin's tight notches stay a zoom.
//
// Signals, most reliable first:
// - ctrlKey: browsers deliver trackpad pinch gestures as wheel events
//   with ctrlKey set; ctrl+scroll also zooms by desktop convention.
// - deltaMode line/page: Firefox reports real mouse wheels in lines.
// - Fractional pixel deltas: WebKit trackpad streams are famously
//   non-integer; no mouse wheel produces them.
// - Magnitude: Chromium reports a mouse-wheel notch as ~100 pixels,
//   while trackpad scrolls arrive as small continuous deltas.
//
// Known limitation: a mouse wheel emitting small isolated integer pixel
// deltas (WebKit/Firefox on macOS) looks like a trackpad onset and pans;
// the zoom stays reachable there via ctrl+scroll and the +/- keys.

// A new burst starts after this much idle time.
export const WHEEL_BURST_RESET_MS = 120;

// Pixel deltas at or above this magnitude are discrete mouse-wheel
// notches rather than trackpad scroll.
export const WHEEL_DISCRETE_MIN_DELTA_PX = 50;

// WheelEvent deltaMode values without the browser global.
export const WHEEL_DELTA_MODE_PIXEL = 0;
export const WHEEL_DELTA_MODE_LINE = 1;

export type WheelGestureMode = 'zoom' | 'pan';

export interface WheelGestureEvent {
  deltaX: number;
  deltaY: number;
  deltaMode: number;
  ctrlKey: boolean;
}

export interface WheelGestureState {
  lastEventTime: number;
  lastCtrlKey: boolean;
  mode: WheelGestureMode | null;
}

export const createWheelGestureState = (): WheelGestureState => ({
  lastEventTime: 0,
  lastCtrlKey: false,
  mode: null,
});

// Whether an event looks like a discrete mouse-wheel notch rather than
// continuous trackpad scrolling.
export const isDiscreteWheelEvent = (
  event: WheelGestureEvent,
  discreteMinDeltaPx: number = WHEEL_DISCRETE_MIN_DELTA_PX,
): boolean => {
  if (event.deltaMode !== WHEEL_DELTA_MODE_PIXEL) return true;
  if (!Number.isInteger(event.deltaX) || !Number.isInteger(event.deltaY)) {
    return false;
  }
  return (
    Math.abs(event.deltaX) >= discreteMinDeltaPx ||
    Math.abs(event.deltaY) >= discreteMinDeltaPx
  );
};

// Classifies one wheel event into the gesture that owns its burst.
// `now` is a caller-owned clock (ms).
export const classifyWheelEvent = (
  state: WheelGestureState,
  event: WheelGestureEvent,
  now: number,
): WheelGestureMode => {
  if (event.ctrlKey) {
    state.lastEventTime = now;
    state.lastCtrlKey = true;
    state.mode = 'zoom';
    return 'zoom';
  }
  // A pinch release followed by continued trackpad motion hands the
  // stream to a fresh burst instead of extending the pinch's zoom.
  const startsBurst =
    state.mode === null ||
    state.lastCtrlKey ||
    now - state.lastEventTime > WHEEL_BURST_RESET_MS;
  state.lastEventTime = now;
  state.lastCtrlKey = false;
  if (startsBurst) {
    state.mode = isDiscreteWheelEvent(event) ? 'zoom' : 'pan';
  }
  return state.mode as WheelGestureMode;
};
