export interface FpsTracker {
  frames: number[];
  fps: number;
  lastSnapshot: number;
}

export const UI_TIMER_REPAINT_MS = 30;
export const AMBIENT_FRAME_MIN_MS = 1000 / 30;

export const createFpsTracker = (): FpsTracker => ({
  frames: [],
  fps: 0,
  lastSnapshot: 0,
});

export const trackFps = (tracker: FpsTracker, now: number): void => {
  tracker.frames.push(now);
  const cutoff = now - 1000;
  while (tracker.frames.length > 0 && tracker.frames[0] < cutoff) {
    tracker.frames.shift();
  }
  if (now - tracker.lastSnapshot >= 1000) {
    tracker.fps = tracker.frames.length;
    tracker.lastSnapshot = now;
  }
};

export const dynamicFrameDue = (
  now: number,
  lastFrame: number,
  fullRate: boolean,
  targetFps: number,
): boolean =>
  now - lastFrame >= (fullRate ? 1000 / targetFps : AMBIENT_FRAME_MIN_MS);

export type OverlayRepaint = 'animationFrame' | 'nextSecond' | 'idle';

export const resolveOverlayRepaint = (
  hasActiveEffects: boolean,
  debugTimerRunning: boolean,
): OverlayRepaint =>
  hasActiveEffects
    ? 'animationFrame'
    : debugTimerRunning
      ? 'nextSecond'
      : 'idle';

export const msUntilNextSecond = (nowMs: number): number =>
  1001 - (nowMs % 1000);

export type BoardFrameSlot =
  'dynamic' | 'overlay' | 'overlayTimer' | 'uiTimer' | 'shake' | 'panRender';

export interface FrameHost<TTimeout = ReturnType<typeof setTimeout>> {
  requestAnimationFrame: (callback: (timestamp: number) => void) => number;
  cancelAnimationFrame: (id: number) => void;
  setTimeout: (callback: () => void, delay: number) => TTimeout;
  clearTimeout: (id: TTimeout) => void;
}

export const browserFrameHost: FrameHost = {
  requestAnimationFrame: (callback) => requestAnimationFrame(callback),
  cancelAnimationFrame: (id) => cancelAnimationFrame(id),
  setTimeout: (callback, delay) => setTimeout(callback, delay),
  clearTimeout: (id) => clearTimeout(id),
};

type ScheduledHandle<TTimeout> =
  | { kind: 'animationFrame'; id: number; token: symbol }
  | { kind: 'timeout'; id: TTimeout; token: symbol };

export class BoardFrameHandles<TTimeout = ReturnType<typeof setTimeout>> {
  private readonly handles = new Map<
    BoardFrameSlot,
    ScheduledHandle<TTimeout>
  >();

  constructor(private readonly host: FrameHost<TTimeout>) {}

  request(slot: BoardFrameSlot, callback: (timestamp: number) => void): number {
    this.cancel(slot);
    const token = Symbol();
    const id = this.host.requestAnimationFrame((timestamp) => {
      try {
        callback(timestamp);
      } finally {
        if (this.handles.get(slot)?.token === token) {
          this.handles.delete(slot);
        }
      }
    });
    this.handles.set(slot, { kind: 'animationFrame', id, token });
    return id;
  }

  setTimeout(
    slot: BoardFrameSlot,
    callback: () => void,
    delay: number,
  ): TTimeout {
    this.cancel(slot);
    const token = Symbol();
    const id = this.host.setTimeout(() => {
      try {
        callback();
      } finally {
        if (this.handles.get(slot)?.token === token) {
          this.handles.delete(slot);
        }
      }
    }, delay);
    this.handles.set(slot, { kind: 'timeout', id, token });
    return id;
  }

  cancel(slot: BoardFrameSlot): void {
    const handle = this.handles.get(slot);
    if (!handle) return;
    this.handles.delete(slot);
    if (handle.kind === 'animationFrame') {
      this.host.cancelAnimationFrame(handle.id);
    } else {
      this.host.clearTimeout(handle.id);
    }
  }

  has(slot: BoardFrameSlot): boolean {
    return this.handles.has(slot);
  }

  cancelAll(): void {
    for (const slot of this.handles.keys()) {
      this.cancel(slot);
    }
  }
}
