import { describe, expect, it } from 'vitest';
import {
  BoardFrameHandles,
  createFpsTracker,
  dynamicFrameDue,
  msUntilNextSecond,
  resolveOverlayRepaint,
  trackFps,
  type FrameHost,
} from './DungeonBoardScheduler';

class FakeFrameHost implements FrameHost<number> {
  private nextId = 0;
  frames = new Map<number, (timestamp: number) => void>();
  timers = new Map<number, () => void>();
  cancelledFrames: number[] = [];
  cancelledTimers: number[] = [];
  timerDelays = new Map<number, number>();

  requestAnimationFrame(callback: (timestamp: number) => void): number {
    const id = this.nextId++;
    this.frames.set(id, callback);
    return id;
  }

  cancelAnimationFrame(id: number): void {
    this.cancelledFrames.push(id);
    this.frames.delete(id);
  }

  setTimeout(callback: () => void, delay: number): number {
    const id = this.nextId++;
    this.timers.set(id, callback);
    this.timerDelays.set(id, delay);
    return id;
  }

  clearTimeout(id: number): void {
    this.cancelledTimers.push(id);
    this.timers.delete(id);
  }

  fireFrame(id: number, timestamp = 0): void {
    const callback = this.frames.get(id);
    this.frames.delete(id);
    callback?.(timestamp);
  }

  fireTimer(id: number): void {
    const callback = this.timers.get(id);
    this.timers.delete(id);
    callback?.();
  }
}

describe('DungeonBoardScheduler', () => {
  it('tracks frames in the trailing second and snapshots at most once a second', () => {
    const tracker = createFpsTracker();

    trackFps(tracker, 0);
    trackFps(tracker, 1000);
    expect(tracker.fps).toBe(2);
    expect(tracker.frames).toEqual([0, 1000]);

    trackFps(tracker, 1001);
    expect(tracker.frames).toEqual([1000, 1001]);
    expect(tracker.fps).toBe(2);
  });

  it('applies the actor target rate and ambient minimum interval', () => {
    expect(dynamicFrameDue(16, 0, true, 60)).toBe(false);
    expect(dynamicFrameDue(17, 0, true, 60)).toBe(true);
    expect(dynamicFrameDue(33, 0, false, 60)).toBe(false);
    expect(dynamicFrameDue(34, 0, false, 60)).toBe(true);
  });

  it('selects animation, second-boundary or idle overlay repainting', () => {
    expect(resolveOverlayRepaint(true, false)).toBe('animationFrame');
    expect(resolveOverlayRepaint(false, true)).toBe('nextSecond');
    expect(resolveOverlayRepaint(false, false)).toBe('idle');
    expect(msUntilNextSecond(0)).toBe(1001);
    expect(msUntilNextSecond(1250)).toBe(751);
  });

  it('replaces and cancels handles, including an animation-frame id of zero', () => {
    const host = new FakeFrameHost();
    const handles = new BoardFrameHandles(host);
    const firstId = handles.request('dynamic', () => {});

    expect(firstId).toBe(0);
    expect(handles.has('dynamic')).toBe(true);

    const replacementId = handles.request('dynamic', () => {});
    expect(host.cancelledFrames).toEqual([0]);
    expect(host.frames.has(replacementId)).toBe(true);

    handles.cancel('dynamic');
    expect(handles.has('dynamic')).toBe(false);
    expect(host.cancelledFrames).toEqual([0, replacementId]);
  });

  it('releases fired handles and cancels all remaining frame and timer slots', () => {
    const host = new FakeFrameHost();
    const handles = new BoardFrameHandles(host);
    const firedId = handles.request('overlay', () => {});
    host.fireFrame(firedId, 42);
    expect(handles.has('overlay')).toBe(false);

    const dynamicId = handles.request('dynamic', () => {});
    const timerId = handles.setTimeout('uiTimer', () => {}, 30);
    expect(host.timerDelays.get(timerId)).toBe(30);
    handles.cancelAll();

    expect(handles.has('dynamic')).toBe(false);
    expect(handles.has('uiTimer')).toBe(false);
    expect(host.cancelledFrames).toContain(dynamicId);
    expect(host.cancelledTimers).toEqual([timerId]);
  });
});
