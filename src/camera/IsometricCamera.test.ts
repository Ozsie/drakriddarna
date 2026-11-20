import { describe, expect, it } from 'vitest';
import { worldToScreen } from '@hoard-engine/scene';
import {
  createIsometricCameraView,
  screenToIsometricGridPosition,
  screenToIsometricWorldPosition,
  zoomIsometricCameraAtAnchor,
  type IsometricCameraOptions,
} from './IsometricCamera';

const options: IsometricCameraOptions = {
  width: 800,
  height: 600,
  center: { x: 480, y: 384 },
  cellSize: 48,
  panX: 40,
  panY: -20,
  zoom: 1.25,
};

describe('isometric camera mapping', () => {
  it('round-trips world and screen coordinates with pan and zoom', () => {
    const world = { x: 624, y: 288 };
    const screen = worldToScreen(
      createIsometricCameraView(options),
      world.x,
      world.y,
    );

    expect(screenToIsometricWorldPosition(screen.x, screen.y, options)).toEqual(
      world,
    );
  });

  it('maps projected cell centers back to their logical grid cells', () => {
    const view = createIsometricCameraView(options);
    const screen = worldToScreen(
      view,
      5.5 * options.cellSize,
      7.5 * options.cellSize,
    );

    expect(screenToIsometricGridPosition(screen.x, screen.y, options)).toEqual({
      x: 5,
      y: 7,
    });
  });

  it('keeps the world point under the pointer fixed while zooming', () => {
    const anchor = { x: 230, y: 175 };
    const world = screenToIsometricWorldPosition(anchor.x, anchor.y, options);
    const zoom = zoomIsometricCameraAtAnchor(options, 1.4, anchor);
    const zoomedOptions = { ...options, ...zoom };
    const projected = worldToScreen(
      createIsometricCameraView(zoomedOptions),
      world.x,
      world.y,
    );

    expect(projected.x).toBeCloseTo(anchor.x);
    expect(projected.y).toBeCloseTo(anchor.y);
  });

  it('keeps the zoom and pan when the requested zoom is clamped away', () => {
    const zoomed = { ...options, zoom: 1.5 };
    expect(zoomIsometricCameraAtAnchor(zoomed, 9, { x: 230, y: 175 })).toEqual({
      zoom: 1.5,
      panX: zoomed.panX,
      panY: zoomed.panY,
    });
  });
});
