import { describe, expect, it } from 'vitest';
import { createRecordingContext } from './recordingContext';

describe('createRecordingContext', () => {
  it('records method calls with their arguments in order', () => {
    const { ctx, log } = createRecordingContext();
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(10, 20);
    ctx.roundRect(0, 0, 100, 50, [4, 4, 0, 0]);
    ctx.fillText('Turn 3', 10, 20);
    ctx.restore();
    expect([...log]).toEqual([
      'save()',
      'beginPath()',
      'moveTo(10, 20)',
      'roundRect(0, 0, 100, 50, [4, 4, 0, 0])',
      'fillText("Turn 3", 10, 20)',
      'restore()',
    ]);
  });

  it('records style property writes and reads back the last value', () => {
    const { ctx, log } = createRecordingContext();
    ctx.fillStyle = '#111827';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 2;
    expect(ctx.fillStyle).toBe('#111827');
    expect(ctx.lineWidth).toBe(2);
    expect([...log]).toEqual([
      'fillStyle="#111827"',
      'strokeStyle="rgba(0, 0, 0, 0.4)"',
      'lineWidth=2',
    ]);
  });

  it('returns deterministic text widths and records the measurement', () => {
    const { ctx, log } = createRecordingContext();
    const width = ctx.measureText('A very long log event').width;
    expect(width).toBe(21 * 8);
    expect([...log]).toEqual(['measureText("A very long log event")']);
  });

  it('records gradient stops and logs gradients assigned to a style', () => {
    const { ctx, log } = createRecordingContext();
    const gradient = ctx.createRadialGradient(10, 10, 0, 10, 10, 40);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    expect([...log]).toEqual([
      'createRadialGradient(10, 10, 0, 10, 10, 40)',
      'addColorStop(0, "rgba(0, 0, 0, 0)")',
      'fillStyle=gradient',
    ]);
  });

  it('logs opaque image arguments as image handles', () => {
    const { ctx, log } = createRecordingContext();
    ctx.drawImage({} as unknown as CanvasImageSource, 0, 0);
    expect([...log]).toEqual(['drawImage(image, 0, 0)']);
  });
});
