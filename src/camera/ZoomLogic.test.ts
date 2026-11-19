import { describe, expect, it } from 'vitest';
import {
  clampZoom,
  zoomAtAnchor,
  zoomByStep,
  zoomFromWheelDelta,
  ZOOM_DEFAULT,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
  ZOOM_WHEEL_SENSITIVITY,
} from './ZoomLogic';

const view = {
  width: 800,
  height: 600,
  centerX: 5 * 48,
  centerY: 4 * 48,
  panX: 0,
  panY: 0,
};

describe('clampZoom', () => {
  it('keeps values inside the bounds', () => {
    expect(clampZoom(ZOOM_DEFAULT)).toBe(1);
    expect(clampZoom(1.2)).toBe(1.2);
  });

  it('clamps zooming in at the maximum', () => {
    expect(clampZoom(ZOOM_MAX)).toBe(ZOOM_MAX);
    expect(clampZoom(2)).toBe(ZOOM_MAX);
  });

  it('clamps zooming out at the minimum', () => {
    expect(clampZoom(ZOOM_MIN)).toBe(ZOOM_MIN);
    expect(clampZoom(0.1)).toBe(ZOOM_MIN);
  });
});

describe('zoomAtAnchor', () => {
  it('clamps the target zoom and preserves pan at a limit', () => {
    const result = zoomAtAnchor(
      { ...view, panX: 15, panY: 25 },
      ZOOM_MAX,
      ZOOM_MAX + 0.4,
      { x: 300, y: 200 },
    );
    expect(result).toEqual({ zoom: ZOOM_MAX, panX: 15, panY: 25 });
  });
});

describe('zoomByStep', () => {
  it('steps the zoom in and out', () => {
    expect(zoomByStep(1, 1)).toBe(1 + ZOOM_STEP);
    expect(zoomByStep(1 + ZOOM_STEP, -1)).toBe(1);
  });

  it('clamps at the limits', () => {
    expect(zoomByStep(ZOOM_MAX, 1)).toBe(ZOOM_MAX);
    expect(zoomByStep(ZOOM_MIN, -1)).toBe(ZOOM_MIN);
  });
});

describe('zoomFromWheelDelta', () => {
  it('zooms in scrolling up and out scrolling down', () => {
    expect(zoomFromWheelDelta(1, -100)).toBeGreaterThan(1);
    expect(zoomFromWheelDelta(1, 100)).toBeLessThan(1);
  });

  it('uses the game sensitivity for a standard wheel notch', () => {
    expect(zoomFromWheelDelta(1, -100)).toBeCloseTo(
      Math.exp(100 * ZOOM_WHEEL_SENSITIVITY),
      12,
    );
    expect(zoomFromWheelDelta(1, 100)).toBeCloseTo(1 / Math.exp(0.1), 3);
  });

  it('clamps at the limits', () => {
    expect(zoomFromWheelDelta(ZOOM_MAX, -1000)).toBe(ZOOM_MAX);
    expect(zoomFromWheelDelta(ZOOM_MIN, 1000)).toBe(ZOOM_MIN);
  });
});
