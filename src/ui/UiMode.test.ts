import { describe, expect, it } from 'vitest';
import { COMPACT_UI_MAX_WIDTH, isCompactUi } from './UiMode';

describe('isCompactUi', () => {
  it('is false at and above the breakpoint', () => {
    expect(isCompactUi(COMPACT_UI_MAX_WIDTH)).toBe(false);
    expect(isCompactUi(COMPACT_UI_MAX_WIDTH + 1)).toBe(false);
    expect(isCompactUi(1200)).toBe(false);
  });

  it('is true for phone-sized widths', () => {
    expect(isCompactUi(COMPACT_UI_MAX_WIDTH - 1)).toBe(true);
    expect(isCompactUi(375)).toBe(true);
    expect(isCompactUi(320)).toBe(true);
  });

  it('is false for non-positive widths', () => {
    expect(isCompactUi(0)).toBe(false);
    expect(isCompactUi(-100)).toBe(false);
  });
});
