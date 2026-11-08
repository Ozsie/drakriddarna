import { describe, expect, it } from 'vitest';
import {
  clampZoom,
  screenToWorldZoomed,
  worldToScreenZoomed,
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

describe('zoomed transforms', () => {
  it('round-trips screen and world coordinates', () => {
    const point = { x: 123, y: 45 };
    const world = screenToWorldZoomed(point, view, 1.25);
    expect(worldToScreenZoomed(world, view, 1.25)).toEqual(point);
  });

  it('matches the zoomless transform at zoom 1', () => {
    // At zoom 1 the result equals @hoard-engine/camera's unzoomed pair.
    expect(screenToWorldZoomed({ x: 300, y: 200 }, view, 1)).toEqual({
      x: 300 - 400 + view.centerX,
      y: 200 - 300 + view.centerY,
    });
    expect(worldToScreenZoomed({ x: 0, y: 0 }, view, 1)).toEqual({
      x: -view.centerX + 400,
      y: -view.centerY + 300,
    });
  });

  it('respects the pan offset', () => {
    const panned = { ...view, panX: 40, panY: -20 };
    const world = screenToWorldZoomed({ x: 100, y: 100 }, panned, 2);
    expect(world).toEqual({
      x: (100 - 400 - 40) / 2 + view.centerX,
      y: (100 - 300 + 20) / 2 + view.centerY,
    });
  });
});

describe('zoomAtAnchor', () => {
  it('keeps the world point under the anchor fixed', () => {
    const anchor = { x: 610, y: 190 };
    const before = screenToWorldZoomed(anchor, view, 1);
    const next = zoomAtAnchor(view, 1, 1.3, anchor);
    const panned = { ...view, panX: next.panX, panY: next.panY };
    const after = screenToWorldZoomed(anchor, panned, next.zoom);
    expect(after).toEqual(before);
  });

  it('keeps the pan when the zoom is already clamped at a limit', () => {
    const result = zoomAtAnchor(
      { ...view, panX: 15, panY: 25 },
      ZOOM_MAX,
      ZOOM_MAX + 0.4,
      { x: 300, y: 200 },
    );
    expect(result).toEqual({ zoom: ZOOM_MAX, panX: 15, panY: 25 });
  });

  it('leaves the world under a non-anchored point scaled', () => {
    const anchor = { x: 400, y: 300 };
    const other = { x: 100, y: 100 };
    const world = screenToWorldZoomed(other, view, 1);
    const next = zoomAtAnchor(view, 1, 1.5, anchor);
    const panned = { ...view, panX: next.panX, panY: next.panY };
    const screen = worldToScreenZoomed(world, panned, next.zoom);
    // Zooming 1.5x scales the screen distance from the anchor by 1.5.
    expect(screen.x - anchor.x).toBe((other.x - anchor.x) * 1.5);
    expect(screen.y - anchor.y).toBe((other.y - anchor.y) * 1.5);
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

  it('steps about 10% per standard wheel notch', () => {
    expect(zoomFromWheelDelta(1, -100)).toBeCloseTo(
      Math.exp(100 * ZOOM_WHEEL_SENSITIVITY),
      12,
    );
    expect(zoomFromWheelDelta(1, 100)).toBeCloseTo(1 / Math.exp(0.1), 3);
  });

  it('is stable across many small deltas (trackpad pinch)', () => {
    let zoom = 1;
    for (let i = 0; i < 100; i++) {
      zoom = zoomFromWheelDelta(zoom, -1);
    }
    expect(zoom).toBeCloseTo(Math.exp(100 * ZOOM_WHEEL_SENSITIVITY), 10);
  });

  it('clamps at the limits', () => {
    expect(zoomFromWheelDelta(ZOOM_MAX, -1000)).toBe(ZOOM_MAX);
    expect(zoomFromWheelDelta(ZOOM_MIN, 1000)).toBe(ZOOM_MIN);
  });
});
