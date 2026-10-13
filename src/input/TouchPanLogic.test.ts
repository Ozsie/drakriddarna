import { describe, expect, it } from 'vitest';
import {
  createTouchPanState,
  getTouchCentroid,
  handleTwoFingerTouchStart,
  handleTwoFingerTouchMove,
  handleTwoFingerTouchEnd,
} from './TouchPanLogic';

describe('TouchPanLogic', () => {
  describe('getTouchCentroid', () => {
    it('returns null if fewer than 2 touches', () => {
      expect(getTouchCentroid([])).toBeNull();
      expect(getTouchCentroid([{ clientX: 100, clientY: 200 }])).toBeNull();
    });

    it('calculates midpoint of two touches', () => {
      const centroid = getTouchCentroid([
        { clientX: 100, clientY: 200 },
        { clientX: 200, clientY: 400 },
      ]);
      expect(centroid).toEqual({ x: 150, y: 300 });
    });
  });

  describe('handleTwoFingerTouchStart', () => {
    it('initiates dragging on 2 touches', () => {
      const state = createTouchPanState();
      const currentPan = { x: 50, y: -20 };
      const touches = [
        { clientX: 100, clientY: 200 },
        { clientX: 300, clientY: 400 },
      ];

      const started = handleTwoFingerTouchStart(touches, currentPan, state);
      expect(started).toBe(true);
      expect(state.isDragging).toBe(true);
      expect(state.startX).toBe(200);
      expect(state.startY).toBe(300);
      expect(state.startPanX).toBe(50);
      expect(state.startPanY).toBe(-20);
      expect(state.hasMoved).toBe(false);
    });

    it('does not initiate dragging on single touch', () => {
      const state = createTouchPanState();
      const currentPan = { x: 0, y: 0 };
      const touches = [{ clientX: 100, clientY: 200 }];

      const started = handleTwoFingerTouchStart(touches, currentPan, state);
      expect(started).toBe(false);
      expect(state.isDragging).toBe(false);
    });

    it('resets dragging if touch count is not 2', () => {
      const state = createTouchPanState();
      state.isDragging = true;

      const started = handleTwoFingerTouchStart(
        [{ clientX: 100, clientY: 100 }],
        { x: 0, y: 0 },
        state,
      );
      expect(started).toBe(false);
      expect(state.isDragging).toBe(false);
    });
  });

  describe('handleTwoFingerTouchMove', () => {
    it('returns null if not dragging', () => {
      const state = createTouchPanState();
      const touches = [
        { clientX: 100, clientY: 200 },
        { clientX: 300, clientY: 400 },
      ];

      const result = handleTwoFingerTouchMove(touches, state);
      expect(result).toBeNull();
    });

    it('calculates new pan position accurately and updates moved flag on exceeding threshold', () => {
      const state = createTouchPanState();
      handleTwoFingerTouchStart(
        [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 200 },
        ],
        { x: 10, y: 20 },
        state,
      );

      // Midpoint started at (150, 150)
      // Small move (2px): should not set hasMoved yet
      let result = handleTwoFingerTouchMove(
        [
          { clientX: 102, clientY: 100 },
          { clientX: 202, clientY: 200 },
        ],
        state,
      );
      expect(result).toEqual({ panX: 12, panY: 20, moved: false });

      // Larger move (+50px X, -30px Y)
      result = handleTwoFingerTouchMove(
        [
          { clientX: 150, clientY: 70 },
          { clientX: 250, clientY: 170 },
        ],
        state,
      );
      // New midpoint: (200, 120), dx = 50, dy = -30
      expect(result).toEqual({ panX: 60, panY: -10, moved: true });
      expect(state.hasMoved).toBe(true);
    });

    it('returns null if touch count changes to non-2 during move', () => {
      const state = createTouchPanState();
      handleTwoFingerTouchStart(
        [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 200 },
        ],
        { x: 0, y: 0 },
        state,
      );

      const result = handleTwoFingerTouchMove(
        [{ clientX: 100, clientY: 100 }],
        state,
      );
      expect(result).toBeNull();
    });
  });

  describe('handleTwoFingerTouchEnd', () => {
    it('ends dragging when touches drops below 2', () => {
      const state = createTouchPanState();
      state.isDragging = true;

      const result = handleTwoFingerTouchEnd(
        [{ clientX: 100, clientY: 100 }],
        state,
        { x: 50, y: 50 },
      );

      expect(result.shouldEnd).toBe(true);
      expect(state.isDragging).toBe(false);
    });

    it('re-anchors when transitioning to 2 touches while not currently dragging', () => {
      const state = createTouchPanState();
      state.isDragging = false;

      const result = handleTwoFingerTouchEnd(
        [
          { clientX: 100, clientY: 100 },
          { clientX: 300, clientY: 300 },
        ],
        state,
        { x: 100, y: 150 },
      );

      expect(result.reanchored).toBe(true);
      expect(state.isDragging).toBe(true);
      expect(state.startX).toBe(200);
      expect(state.startY).toBe(200);
      expect(state.startPanX).toBe(100);
      expect(state.startPanY).toBe(150);
    });
  });
});
