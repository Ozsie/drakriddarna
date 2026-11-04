import { describe, expect, it } from 'vitest';
import { createRecordingContext } from '../testing/recordingContext';
import { defaultTheme } from '@hoard-engine/primitives';
import { drawButton } from './button';

const bounds = { x: 20, y: 40, width: 120, height: 36 };

describe('button', () => {
  it('draws a primary button with the accent fill and bold label', () => {
    const { ctx, log } = createRecordingContext();
    drawButton(ctx, bounds, 'Begin', defaultTheme, { variant: 'primary' });
    expect([...log]).toEqual([
      'fillStyle="#92400e"',
      'beginPath()',
      'moveTo(26, 40)',
      'lineTo(134, 40)',
      'quadraticCurveTo(140, 40, 140, 46)',
      'lineTo(140, 70)',
      'quadraticCurveTo(140, 76, 134, 76)',
      'lineTo(26, 76)',
      'quadraticCurveTo(20, 76, 20, 70)',
      'lineTo(20, 46)',
      'quadraticCurveTo(20, 40, 26, 40)',
      'closePath()',
      'fill()',
      'strokeStyle="#fbbf24"',
      'lineWidth=1.5',
      'beginPath()',
      'moveTo(26, 40)',
      'lineTo(134, 40)',
      'quadraticCurveTo(140, 40, 140, 46)',
      'lineTo(140, 70)',
      'quadraticCurveTo(140, 76, 134, 76)',
      'lineTo(26, 76)',
      'quadraticCurveTo(20, 76, 20, 70)',
      'lineTo(20, 46)',
      'quadraticCurveTo(20, 40, 26, 40)',
      'closePath()',
      'stroke()',
      'fillStyle="#ffffff"',
      'font="bold 14px Arial, Helvetica, sans-serif"',
      'textAlign="center"',
      'textBaseline="middle"',
      'fillText("Begin", 80, 58)',
    ]);
  });

  it('draws a secondary button with hover fill and body label', () => {
    const { ctx, log } = createRecordingContext();
    drawButton(ctx, bounds, 'Cancel', defaultTheme, {
      variant: 'secondary',
      hovered: true,
    });
    // The box fill is the first style write; the border stroke precedes
    // the label fill.
    expect(log[0]).toBe('fillStyle="#475569"');
    expect(log).toContain('strokeStyle="#64748b"');
    expect(log).toContain('lineWidth=1');
    const labelFill = log.findIndex(
      (entry, index) => entry.startsWith('fillStyle=') && index > 0,
    );
    expect(log[labelFill]).toBe('fillStyle="#e2e8f0"');
    expect(log[labelFill + 1]).toBe(
      'font="bold 14px Arial, Helvetica, sans-serif"',
    );
  });
});
