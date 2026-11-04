import { describe, expect, it } from 'vitest';
import { createRecordingContext } from '../testing/recordingContext';
import { defaultTheme } from '@hoard-engine/primitives';
import { drawDialogScrim, drawModalFrame, drawModalHeader } from './modalFrame';

const bounds = { x: 100, y: 50, width: 400, height: 300 };

describe('modalFrame', () => {
  it('draws the scrim over the whole view', () => {
    const { ctx, log } = createRecordingContext();
    drawDialogScrim(ctx, 1280, 800, defaultTheme);
    expect([...log]).toEqual([
      'fillStyle="rgba(10, 12, 16, 0.85)"',
      'fillRect(0, 0, 1280, 800)',
    ]);
  });

  it('draws the panel fill and accent border', () => {
    const { ctx, log } = createRecordingContext();
    drawModalFrame(ctx, bounds, defaultTheme);
    expect([...log]).toEqual([
      'fillStyle="#181b22"',
      'beginPath()',
      'moveTo(110, 50)',
      'lineTo(490, 50)',
      'quadraticCurveTo(500, 50, 500, 60)',
      'lineTo(500, 340)',
      'quadraticCurveTo(500, 350, 490, 350)',
      'lineTo(110, 350)',
      'quadraticCurveTo(100, 350, 100, 340)',
      'lineTo(100, 60)',
      'quadraticCurveTo(100, 50, 110, 50)',
      'closePath()',
      'fill()',
      'strokeStyle="#d4af37"',
      'lineWidth=2',
      'beginPath()',
      'moveTo(110, 50)',
      'lineTo(490, 50)',
      'quadraticCurveTo(500, 50, 500, 60)',
      'lineTo(500, 340)',
      'quadraticCurveTo(500, 350, 490, 350)',
      'lineTo(110, 350)',
      'quadraticCurveTo(100, 350, 100, 340)',
      'lineTo(100, 60)',
      'quadraticCurveTo(100, 50, 110, 50)',
      'closePath()',
      'stroke()',
    ]);
  });

  it('draws the header with the theme title font', () => {
    const { ctx, log } = createRecordingContext();
    drawModalHeader(ctx, bounds, 'Treasure of the Ice Dragon', defaultTheme);
    expect([...log]).toEqual([
      'fillStyle="#fce28a"',
      'font="bold 18px Arial, Helvetica, sans-serif"',
      'textAlign="left"',
      'textBaseline="top"',
      'fillText("Treasure of the Ice Dragon", 118, 64)',
    ]);
  });
});
