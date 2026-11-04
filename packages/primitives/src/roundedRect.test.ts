import { describe, expect, it, vi } from 'vitest';
import { drawRoundedRect, roundRectPath } from './roundedRect';

type Call = [name: string, ...args: unknown[]];

const recordingContext = (
  supportsRoundRect: boolean,
): { ctx: CanvasRenderingContext2D; calls: Call[] } => {
  const calls: Call[] = [];
  const record =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push([name, ...args]);
    };
  const ctx = {
    beginPath: record('beginPath'),
    closePath: record('closePath'),
    moveTo: record('moveTo'),
    lineTo: record('lineTo'),
    quadraticCurveTo: record('quadraticCurveTo'),
    rect: record('rect'),
  } as unknown as Record<string, (...args: unknown[]) => void>;
  if (supportsRoundRect) {
    ctx.roundRect = vi.fn(record('roundRect'));
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
};

describe('drawRoundedRect', () => {
  it('traces the path as the current path without filling', () => {
    const { ctx, calls } = recordingContext(false);
    drawRoundedRect(ctx, 0, 0, 100, 50, 10);
    expect(calls[0]).toEqual(['beginPath']);
    expect(calls[calls.length - 1]).toEqual(['closePath']);
    expect(ctx.fill).toBeUndefined();
  });

  it('clamps the radius so a tiny box cannot overflow', () => {
    const { ctx, calls } = recordingContext(false);
    drawRoundedRect(ctx, 0, 0, 4, 4, 10);
    // r = min(10, 2, 2) = 2, so the first move lands at x + 2.
    expect(calls[1]).toEqual(['moveTo', 2, 0]);
  });
});

describe('roundRectPath', () => {
  it('uses the native roundRect when available', () => {
    const { ctx, calls } = recordingContext(true);
    roundRectPath(ctx, 1, 2, 30, 40, 5);
    expect(calls).toEqual([['beginPath'], ['roundRect', 1, 2, 30, 40, 5]]);
  });

  it('falls back to a plain rect', () => {
    const { ctx, calls } = recordingContext(false);
    roundRectPath(ctx, 1, 2, 30, 40, 5);
    expect(calls).toEqual([['beginPath'], ['rect', 1, 2, 30, 40]]);
  });
});
