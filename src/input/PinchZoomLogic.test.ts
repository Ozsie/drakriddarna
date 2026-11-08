import { describe, expect, it } from 'vitest';
import type { TouchPoint } from '@hoard-engine/input';
import {
  createPinchZoomState,
  getTouchDistance,
  handlePinchZoomEnd,
  handlePinchZoomMove,
  handlePinchZoomStart,
} from './PinchZoomLogic';

const touches = (dx: number, dy: number): [TouchPoint, TouchPoint] => [
  { clientX: 100, clientY: 100 },
  { clientX: 100 + dx, clientY: 100 + dy },
];

describe('getTouchDistance', () => {
  it('returns the distance between the two touches', () => {
    expect(getTouchDistance(touches(30, 40))).toBe(50);
    expect(getTouchDistance(touches(0, 0))).toBe(0);
  });

  it('returns null for fewer than two touches', () => {
    expect(getTouchDistance([])).toBeNull();
    expect(getTouchDistance([{ clientX: 0, clientY: 0 }])).toBeNull();
  });
});

describe('handlePinchZoomStart', () => {
  it('anchors the gesture at the current distance and zoom', () => {
    const state = createPinchZoomState();
    expect(handlePinchZoomStart(touches(0, 200), 1.2, state)).toBe(true);
    expect(state).toEqual({
      isPinching: true,
      startDistance: 200,
      startZoom: 1.2,
    });
  });

  it('refuses to anchor without two touches', () => {
    const state = createPinchZoomState();
    expect(handlePinchZoomStart([], 1, state)).toBe(false);
    expect(state.isPinching).toBe(false);
  });

  it('refuses to anchor on coincident touches', () => {
    const state = createPinchZoomState();
    expect(handlePinchZoomStart(touches(0, 0), 1, state)).toBe(false);
    expect(state.isPinching).toBe(false);
  });
});

describe('handlePinchZoomMove', () => {
  it('scales the start zoom by the distance ratio', () => {
    const state = createPinchZoomState();
    handlePinchZoomStart(touches(0, 100), 1, state);
    expect(handlePinchZoomMove(touches(0, 150), state)).toEqual({ zoom: 1.5 });
    expect(handlePinchZoomMove(touches(0, 50), state)).toEqual({ zoom: 0.5 });
  });

  it('is relative to the anchored start, not the previous move', () => {
    const state = createPinchZoomState();
    handlePinchZoomStart(touches(0, 100), 1, state);
    handlePinchZoomMove(touches(0, 150), state);
    expect(handlePinchZoomMove(touches(0, 120), state)).toEqual({ zoom: 1.2 });
  });

  it('returns null while inactive or with the wrong touch count', () => {
    const state = createPinchZoomState();
    expect(handlePinchZoomMove(touches(0, 100), state)).toBeNull();
    state.isPinching = true;
    state.startDistance = 100;
    state.startZoom = 1;
    expect(handlePinchZoomMove([{ clientX: 0, clientY: 0 }], state)).toBeNull();
  });
});

describe('handlePinchZoomEnd', () => {
  it('ends the gesture when fewer than two touches remain', () => {
    const state = createPinchZoomState();
    handlePinchZoomStart(touches(0, 100), 1, state);
    expect(handlePinchZoomEnd([{ clientX: 0, clientY: 0 }], state)).toBe(true);
    expect(state.isPinching).toBe(false);
  });

  it('keeps the gesture while two touches remain', () => {
    const state = createPinchZoomState();
    handlePinchZoomStart(touches(0, 100), 1, state);
    expect(handlePinchZoomEnd(touches(0, 100), state)).toBe(false);
    expect(state.isPinching).toBe(true);
  });
});
