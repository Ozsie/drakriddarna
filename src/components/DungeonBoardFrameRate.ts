// Frame-rate governor for the board's dynamic render loop (see
// DungeonBoardController): the loop locks itself to one of two rates,
// 60 fps by default or 30 fps on a machine that cannot hold 60. Each
// painted dynamic frame feeds its wall-clock cost into the governor;
// once the average cost no longer fits the 60 fps budget the target
// drops to 30, and once it fits again with room to spare the target
// climbs back. Switches are held for a cool-down so a borderline
// machine cannot flap between the two rates. Pure state and decision
// logic only, unit-tested next to this file; the controller owns the
// clock and the scheduling.

/** The two rates the dynamic render loop may lock itself to. */
export type DynamicFrameRate = 30 | 60;

export interface FrameRateGovernor {
  /** The rate the dynamic loop is currently locked to. */
  targetFps: DynamicFrameRate;
  /**
   * Exponential moving average of the painted frames' wall-clock cost
   * in milliseconds. The average has memory, so the upgrade decision
   * below reads it directly while the downgrade also insists on
   * consecutive slow samples.
   */
  frameCostEmaMs: number;
  /**
   * Number of consecutive painted frames whose own cost exceeded the
   * downgrade threshold. Reaching two locks the target to 30: a single
   * slow frame (cold caches, a resize) must not flip the lock, while a
   * machine that paints every frame over budget tells the truth within
   * two frames.
   */
  slowFramesInARow: number;
  /** Caller-clock reading (ms) of the latest target switch. */
  lastSwitchTs: number;
}

// The 60 fps budget is ~16.7 ms for everything the browser does in a
// frame, so a dynamic paint averaging above the downgrade threshold no
// longer fits it; averaging below the upgrade threshold fits it with
// room to spare. The gap between the two keeps borderline costs stable.
export const DOWNGRADE_FRAME_COST_MS = 12;
export const UPGRADE_FRAME_COST_MS = 7;

// A freshly locked target is held at least this long before the
// governor may switch again, so the loop cannot oscillate between the
// two rates on a machine sitting right at the edge of the 60 fps
// budget.
export const FRAME_RATE_SWITCH_HOLD_MS = 4000;

const SEED_FRAME_COST_MS = 4;
const FRAME_COST_EMA_WEIGHT = 0.15;
const SLOW_FRAMES_TO_DOWNGRADE = 2;

// The seeded hold start lets the first switch happen as soon as the
// cost picture is clear, instead of locking 60 fps for a fixed grace
// period after page load.
export const createFrameRateGovernor = (): FrameRateGovernor => ({
  targetFps: 60,
  frameCostEmaMs: SEED_FRAME_COST_MS,
  slowFramesInARow: 0,
  lastSwitchTs: -FRAME_RATE_SWITCH_HOLD_MS,
});

/**
 * Feeds one painted dynamic frame's cost into the governor and returns
 * the rate the loop is (possibly newly) locked to. `now` is the
 * caller's clock in milliseconds (performance.now at the call site).
 */
export const trackFrameCost = (
  governor: FrameRateGovernor,
  frameCostMs: number,
  now: number,
): DynamicFrameRate => {
  governor.frameCostEmaMs +=
    (frameCostMs - governor.frameCostEmaMs) * FRAME_COST_EMA_WEIGHT;
  governor.slowFramesInARow =
    frameCostMs > DOWNGRADE_FRAME_COST_MS ? governor.slowFramesInARow + 1 : 0;
  if (now - governor.lastSwitchTs < FRAME_RATE_SWITCH_HOLD_MS)
    return governor.targetFps;
  if (
    governor.targetFps === 60 &&
    governor.slowFramesInARow >= SLOW_FRAMES_TO_DOWNGRADE
  ) {
    governor.targetFps = 30;
    governor.lastSwitchTs = now;
  } else if (
    governor.targetFps === 30 &&
    governor.frameCostEmaMs < UPGRADE_FRAME_COST_MS
  ) {
    governor.targetFps = 60;
    governor.lastSwitchTs = now;
  }
  return governor.targetFps;
};
