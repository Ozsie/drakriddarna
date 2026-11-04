import { describe, expect, it } from 'vitest';
import { createRecordingContext } from '../testing/recordingContext';
import { defaultTheme } from '@hoard-engine/primitives';
import { drawListRow, listRowStyles, rowState } from './listRow';

const bounds = { x: 0, y: 0, width: 200, height: 48 };

describe('listRow', () => {
  it('maps states to the row theme tokens', () => {
    expect(listRowStyles(defaultTheme, 'rest').fill).toBe(
      'rgba(255, 255, 255, 0.04)',
    );
    expect(listRowStyles(defaultTheme, 'rest').border).toBe('#334155');
    expect(listRowStyles(defaultTheme, 'rest').lineWidth).toBe(1);
    expect(listRowStyles(defaultTheme, 'hover').fill).toBe('#334155');
    expect(listRowStyles(defaultTheme, 'hover').border).toBe('#94a3b8');
    expect(listRowStyles(defaultTheme, 'selected').fill).toBe(
      'rgba(212, 175, 55, 0.16)',
    );
    expect(listRowStyles(defaultTheme, 'selected').border).toBe('#eab308');
    expect(listRowStyles(defaultTheme, 'selected').lineWidth).toBe(1.5);
  });

  it('derives the state from selected/hover flags', () => {
    expect(rowState(false, false)).toBe('rest');
    expect(rowState(false, true)).toBe('hover');
    expect(rowState(true, false)).toBe('selected');
    expect(rowState(true, true)).toBe('selected');
  });

  it('draws the shell with the given styles and radius', () => {
    const { ctx, log } = createRecordingContext();
    drawListRow(
      ctx,
      bounds,
      { fill: '#123456', border: '#abcdef', lineWidth: 2 },
      4,
    );
    expect(log[0]).toBe('fillStyle="#123456"');
    expect(log[log.indexOf('fill()') - 1]).toBe('closePath()');
    expect(log).toContain('strokeStyle="#abcdef"');
    expect(log).toContain('lineWidth=2');
    expect(
      log.filter((entry) => entry.startsWith('quadraticCurveTo')).length,
    ).toBe(8);
  });
});
