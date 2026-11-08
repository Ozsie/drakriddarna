import { describe, expect, it } from 'vitest';
import {
  activateTouchHoldPan,
  beginTouchHoldPan,
  cancelTouchHoldPan,
  createTouchHoldPanState,
  endTouchHoldPan,
  handleTouchHoldPanMove,
  TOUCH_HOLD_PAN_MOVE_SLOP_PX,
} from './TouchHoldPanLogic';

const finger = (x: number, y: number) => ({ clientX: x, clientY: y });

const beginAt = (x: number, y: number, panX = 0, panY = 0) => {
  const state = createTouchHoldPanState();
  beginTouchHoldPan(finger(x, y), { x: panX, y: panY }, state);
  return state;
};

describe('beginTouchHoldPan', () => {
  it('anchors the candidate at the touch and pan offset', () => {
    const state = beginAt(120, 80, 40, -20);
    expect(state).toEqual({
      isCandidate: true,
      isPanning: false,
      hasPanned: false,
      startX: 120,
      startY: 80,
      startPanX: 40,
      startPanY: -20,
    });
  });
});

describe('activateTouchHoldPan', () => {
  it('turns a held candidate into a pan', () => {
    const state = beginAt(100, 100);
    expect(activateTouchHoldPan(state)).toBe(true);
    expect(state.isPanning).toBe(true);
    expect(state.isCandidate).toBe(false);
  });

  it('ignores gestures cancelled by movement or a second finger', () => {
    const state = beginAt(100, 100);
    cancelTouchHoldPan(state);
    expect(activateTouchHoldPan(state)).toBe(false);
    expect(state.isPanning).toBe(false);
  });

  it('is a no-op once already panning', () => {
    const state = beginAt(100, 100);
    activateTouchHoldPan(state);
    expect(activateTouchHoldPan(state)).toBe(false);
    expect(state.isPanning).toBe(true);
  });
});

describe('handleTouchHoldPanMove', () => {
  it('pans relative to the anchored start once activated', () => {
    const state = beginAt(200, 300, 25, 25);
    activateTouchHoldPan(state);
    expect(handleTouchHoldPanMove([finger(230, 280)], state)).toEqual({
      panX: 55,
      panY: 5,
    });
    expect(state.hasPanned).toBe(true);
  });

  it('does not pan before the hold activates', () => {
    const state = beginAt(200, 300, 25, 25);
    expect(handleTouchHoldPanMove([finger(260, 300)], state)).toBeNull();
    expect(state.isPanning).toBe(false);
  });

  it('cancels the candidate on movement beyond the slop', () => {
    const state = beginAt(200, 300, 25, 25);
    handleTouchHoldPanMove(
      [finger(200 + TOUCH_HOLD_PAN_MOVE_SLOP_PX + 1, 300)],
      state,
    );
    expect(state.isCandidate).toBe(false);
    expect(activateTouchHoldPan(state)).toBe(false);
  });

  it('keeps the candidate on movement within the slop', () => {
    const state = beginAt(200, 300, 25, 25);
    handleTouchHoldPanMove(
      [
        finger(
          200 + TOUCH_HOLD_PAN_MOVE_SLOP_PX,
          300 - TOUCH_HOLD_PAN_MOVE_SLOP_PX,
        ),
      ],
      state,
    );
    expect(state.isCandidate).toBe(true);
    expect(activateTouchHoldPan(state)).toBe(true);
  });

  it('ignores single-finger moves while not tracking at all', () => {
    const state = createTouchHoldPanState();
    expect(handleTouchHoldPanMove([finger(10, 10)], state)).toBeNull();
  });

  it('ignores more than one touch', () => {
    const state = beginAt(200, 300, 25, 25);
    activateTouchHoldPan(state);
    expect(
      handleTouchHoldPanMove([finger(260, 300), finger(60, 100)], state),
    ).toBeNull();
    expect(state.hasPanned).toBe(false);
  });
});

describe('endTouchHoldPan', () => {
  it('reports a moved pan and resets the state', () => {
    const state = beginAt(100, 100, 10, 10);
    activateTouchHoldPan(state);
    handleTouchHoldPanMove([finger(150, 140)], state);
    expect(endTouchHoldPan(state)).toEqual({ wasPanning: true, moved: true });
    expect(state).toEqual(createTouchHoldPanState());
  });

  it('reports a pan that never moved (a hold, not a tap)', () => {
    const state = beginAt(100, 100);
    activateTouchHoldPan(state);
    expect(endTouchHoldPan(state)).toEqual({ wasPanning: true, moved: false });
  });

  it('reports a cancelled candidate as no pan', () => {
    const state = beginAt(100, 100);
    cancelTouchHoldPan(state);
    expect(endTouchHoldPan(state)).toEqual({ wasPanning: false, moved: false });
  });

  it('is idempotent across repeated ends', () => {
    const state = beginAt(100, 100);
    activateTouchHoldPan(state);
    handleTouchHoldPanMove([finger(150, 100)], state);
    endTouchHoldPan(state);
    expect(endTouchHoldPan(state)).toEqual({ wasPanning: false, moved: false });
  });
});
