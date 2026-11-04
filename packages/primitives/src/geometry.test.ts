import { describe, expect, it } from 'vitest';
import { isPointInRect } from './geometry';

describe('isPointInRect', () => {
  const bounds = { x: 10, y: 20, width: 30, height: 40 };

  it('accepts points inside the rect', () => {
    expect(isPointInRect(10, 20, bounds)).toBe(true);
    expect(isPointInRect(25, 40, bounds)).toBe(true);
    expect(isPointInRect(40, 60, bounds)).toBe(true);
  });

  it('rejects points outside the rect', () => {
    expect(isPointInRect(9, 20, bounds)).toBe(false);
    expect(isPointInRect(41, 20, bounds)).toBe(false);
    expect(isPointInRect(10, 19, bounds)).toBe(false);
    expect(isPointInRect(10, 61, bounds)).toBe(false);
  });
});
