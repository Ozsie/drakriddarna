import type {
  TouchHoldPanConfig,
  WheelGestureConfig,
} from '@hoard-engine/input';

export const TOUCH_HOLD_PAN_DELAY_MS = 250;

export const TOUCH_HOLD_PAN_CONFIG: TouchHoldPanConfig = {
  moveSlopPx: 10,
};

export const WHEEL_GESTURE_CONFIG: WheelGestureConfig = {
  burstResetMs: 120,
  discreteMinDeltaPx: 50,
};
