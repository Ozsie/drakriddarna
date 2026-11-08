import { describe, expect, it } from 'vitest';
import {
  classifyWheelEvent,
  createWheelGestureState,
  isDiscreteWheelEvent,
  WHEEL_BURST_RESET_MS,
  WHEEL_DISCRETE_MIN_DELTA_PX,
  WHEEL_DELTA_MODE_LINE,
  WHEEL_DELTA_MODE_PIXEL,
} from './WheelGestureLogic';

const zx = (
  deltaY: number,
  over: Partial<Parameters<typeof classifyWheelEvent>[1]> = {},
) => ({
  deltaX: 0,
  deltaY,
  deltaMode: WHEEL_DELTA_MODE_PIXEL,
  ctrlKey: false,
  ...over,
});

describe('isDiscreteWheelEvent', () => {
  it('treats line-mode deltas as mouse-wheel notches', () => {
    expect(
      isDiscreteWheelEvent(zx(3, { deltaMode: WHEEL_DELTA_MODE_LINE })),
    ).toBe(true);
  });

  it('treats large integer pixel deltas as mouse-wheel notches', () => {
    expect(isDiscreteWheelEvent(zx(100))).toBe(true);
    expect(isDiscreteWheelEvent(zx(-120))).toBe(true);
    expect(isDiscreteWheelEvent(zx(0, { deltaX: 100 }))).toBe(true);
  });

  it('treats small integer pixel deltas as trackpad scroll', () => {
    expect(isDiscreteWheelEvent(zx(8))).toBe(false);
    expect(isDiscreteWheelEvent(zx(0, { deltaX: -12 }))).toBe(false);
  });

  it('treats fractional pixel deltas as trackpad scroll', () => {
    expect(isDiscreteWheelEvent(zx(40.5))).toBe(false);
    expect(isDiscreteWheelEvent(zx(0, { deltaX: 60.25 }))).toBe(false);
  });

  it('uses the threshold as the discrete/continuous boundary', () => {
    expect(isDiscreteWheelEvent(zx(WHEEL_DISCRETE_MIN_DELTA_PX))).toBe(true);
    expect(isDiscreteWheelEvent(zx(WHEEL_DISCRETE_MIN_DELTA_PX - 1))).toBe(
      false,
    );
  });
});

describe('classifyWheelEvent', () => {
  it('classifies a first mouse-wheel burst as zoom', () => {
    const state = createWheelGestureState();
    expect(classifyWheelEvent(state, zx(100), 1000)).toBe('zoom');
  });

  it('classifies a first trackpad burst as pan', () => {
    const state = createWheelGestureState();
    expect(classifyWheelEvent(state, zx(6), 1000)).toBe('pan');
  });

  it('always zooms while ctrl is held', () => {
    const state = createWheelGestureState();
    classifyWheelEvent(state, zx(6), 1000);
    expect(classifyWheelEvent(state, zx(6, { ctrlKey: true }), 1010)).toBe(
      'zoom',
    );
  });

  it('keeps the burst classification on later deltas of the other kind', () => {
    const state = createWheelGestureState();
    classifyWheelEvent(state, zx(4), 1000);
    // A trackpad flick's later hard deltas stay a pan.
    expect(classifyWheelEvent(state, zx(80), 1016)).toBe('pan');
  });

  it('reclassifies after the burst reset window', () => {
    const state = createWheelGestureState();
    classifyWheelEvent(state, zx(6), 1000);
    expect(
      classifyWheelEvent(state, zx(100), 1000 + WHEEL_BURST_RESET_MS + 1),
    ).toBe('zoom');
  });

  it('keeps zooming a fast mouse spin within the burst window', () => {
    const state = createWheelGestureState();
    classifyWheelEvent(state, zx(100), 1000);
    expect(classifyWheelEvent(state, zx(-100), 1010)).toBe('zoom');
  });

  it('hands the stream to a fresh burst when a pinch (ctrl) ends', () => {
    const state = createWheelGestureState();
    classifyWheelEvent(state, zx(-40, { ctrlKey: true }), 1000);
    // Continued trackpad motion right after the pinch must pan, not keep
    // zooming the pinch's burst.
    expect(classifyWheelEvent(state, zx(6), 1010)).toBe('pan');
    expect(classifyWheelEvent(state, zx(9), 1018)).toBe('pan');
  });
});
