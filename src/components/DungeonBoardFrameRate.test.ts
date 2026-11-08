import { describe, expect, it } from 'vitest';
import {
  createFrameRateGovernor,
  DOWNGRADE_FRAME_COST_MS,
  FRAME_RATE_SWITCH_HOLD_MS,
  trackFrameCost,
} from './DungeonBoardFrameRate';

const heavyCost = DOWNGRADE_FRAME_COST_MS * 2.5;
const cheapCost = 1;

const runFrames = (
  governor: ReturnType<typeof createFrameRateGovernor>,
  costMs: number,
  frames: number,
  startClockMs: number,
): number => {
  let clock = startClockMs;
  for (let frame = 0; frame < frames; frame++) {
    trackFrameCost(governor, costMs, clock);
    clock += costMs;
  }
  return clock;
};

describe('frame rate governor', () => {
  it('locks the dynamic loop to 60 fps by default', () => {
    expect(createFrameRateGovernor().targetFps).toBe(60);
  });

  it('drops to 30 fps once painted frames stop fitting the 60 fps budget', () => {
    const governor = createFrameRateGovernor();
    runFrames(governor, heavyCost, 10, 0);
    expect(governor.targetFps).toBe(30);
  });

  it('ignores a single expensive frame (cold caches, one-off spikes)', () => {
    const governor = createFrameRateGovernor();
    trackFrameCost(governor, heavyCost * 3, 0);
    trackFrameCost(governor, cheapCost, 60);
    expect(governor.targetFps).toBe(60);
  });

  it('climbs back to 60 fps once cheap frames have drained the average', () => {
    const governor = createFrameRateGovernor();
    const clock = runFrames(governor, heavyCost, 10, 0);
    expect(governor.targetFps).toBe(30);
    // Well past the switch hold; sustained cheap frames must restore 60.
    runFrames(governor, cheapCost, 200, clock + FRAME_RATE_SWITCH_HOLD_MS);
    expect(governor.targetFps).toBe(60);
  });

  it('holds a freshly locked target even when the cost flips the other way', () => {
    const governor = createFrameRateGovernor();
    const clock = runFrames(governor, heavyCost, 10, 0);
    expect(governor.targetFps).toBe(30);
    // Inside the hold window the target must not bounce back.
    runFrames(governor, cheapCost, 20, clock);
    expect(governor.targetFps).toBe(30);
    // After the hold the same cheap cost may switch again.
    runFrames(governor, cheapCost, 200, clock + FRAME_RATE_SWITCH_HOLD_MS);
    expect(governor.targetFps).toBe(60);
  });

  it('stays at 30 fps while the machine is merely borderline', () => {
    const governor = createFrameRateGovernor();
    // A cost in the hysteresis band: too heavy for the 60 fps budget,
    // comfortable at 30 fps.
    const clock = runFrames(governor, heavyCost, 10, 0);
    expect(governor.targetFps).toBe(30);
    runFrames(
      governor,
      DOWNGRADE_FRAME_COST_MS,
      200,
      clock + FRAME_RATE_SWITCH_HOLD_MS,
    );
    expect(governor.targetFps).toBe(30);
  });

  it('keeps cheap load locked at 60 fps', () => {
    const governor = createFrameRateGovernor();
    runFrames(governor, cheapCost, 100, 0);
    expect(governor.targetFps).toBe(60);
  });
});
