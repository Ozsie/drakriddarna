import { describe, expect, it } from 'vitest';
import { createRecordingContext } from '../testing/recordingContext';
import { defaultTheme } from '@hoard-engine/primitives';
import { applyTextInputKey, clampTextInput, drawTextInput } from './textInput';

const bounds = { x: 40, y: 60, width: 200, height: 30 };

describe('textInput', () => {
  it('draws the box, value and caret when focused', () => {
    const { ctx, log } = createRecordingContext();
    drawTextInput(ctx, bounds, 'Sir Sten', defaultTheme);
    expect(log[0]).toBe('fillStyle="#0f1217"');
    expect(log).toContain('strokeStyle="#fbbf24"');
    expect(log).toContain('lineWidth=1.5');
    const textIndex = log.findIndex((entry) =>
      entry.startsWith('fillText("Sir Sten"'),
    );
    expect(log[textIndex - 4]).toBe('font="14px Arial, Helvetica, sans-serif"');
    expect(log[textIndex - 3]).toBe('fillStyle="#f8fafc"');
    expect(log[textIndex - 2]).toBe('textAlign="left"');
    expect(log[textIndex - 1]).toBe('textBaseline="middle"');
    // The caret measurement follows the text.
    expect(log[textIndex + 1]).toBe('measureText("Sir Sten")');
  });

  it('drops the caret and thins the border when unfocused', () => {
    const { ctx, log } = createRecordingContext();
    drawTextInput(ctx, bounds, 'x', defaultTheme, { focused: false });
    expect(log).toContain('strokeStyle="#475569"');
    expect(log).toContain('lineWidth=1');
    expect(log.some((entry) => entry.startsWith('fillRect('))).toBe(false);
  });

  it('honors a custom text color', () => {
    const { ctx, log } = createRecordingContext();
    drawTextInput(ctx, bounds, 'x', defaultTheme, {
      textColor: '#64748b',
    });
    expect(log).toContain('fillStyle="#64748b"');
  });

  it('edits values: backspace, printable keys, no-ops, clamping', () => {
    expect(applyTextInputKey('Ari', 'Backspace', 20)).toBe('Ar');
    expect(applyTextInputKey('Ar', 'i', 20)).toBe('Ari');
    expect(applyTextInputKey('Ari', 'Enter', 20)).toBe('Ari');
    expect(applyTextInputKey('Ari', 'a', 3)).toBe('Ari');
    expect(clampTextInput('Arianna', 3)).toBe('Ari');
    expect(clampTextInput('', 3)).toBe('');
  });
});
