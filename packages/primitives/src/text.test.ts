import { describe, expect, it } from 'vitest';
import { defaultTheme } from './defaultTheme';
import {
  PER_CHAR_WIDTH_FALLBACK,
  composeFont,
  measureTextWidth,
  truncateText,
  wrapText,
  wrapTextMeasured,
} from './text';

const contextMeasuring = (perChar: number): CanvasRenderingContext2D => {
  const ctx = {
    font: '',
    save: () => undefined,
    restore: () => undefined,
    measureText: (text: string) => ({ width: text.length * perChar }),
  };
  return ctx as unknown as CanvasRenderingContext2D;
};

describe('composeFont', () => {
  it('composes weight, size and family from theme defaults', () => {
    expect(composeFont(defaultTheme, 11)).toBe(
      `${defaultTheme.typography.weights.regular}11px ${defaultTheme.typography.families.ui}`,
    );
  });

  it('takes explicit weight and family over the defaults', () => {
    expect(composeFont(defaultTheme, 12, 'bold ', 'Fira Sans')).toBe(
      'bold 12px Fira Sans',
    );
  });
});

describe('measureTextWidth', () => {
  it('returns 0 for empty text', () => {
    expect(measureTextWidth(contextMeasuring(2), '', '12px F', 1)).toBe(0);
    expect(measureTextWidth(null, '', '12px F', 1)).toBe(0);
  });

  it('measures through the context font', () => {
    expect(measureTextWidth(contextMeasuring(3), 'abcd', '12px F', 1)).toBe(12);
  });

  it('falls back to the per-character approximation without a context', () => {
    expect(measureTextWidth(null, 'abcd', '12px F', 6.5)).toBe(26);
  });
});

describe('truncateText', () => {
  it('keeps text that already fits', () => {
    expect(truncateText(null, 'abc', 100, '12px F', 1)).toBe('abc');
  });

  it('returns empty for empty text or no room', () => {
    expect(truncateText(null, '', 100, '12px F', 1)).toBe('');
    expect(truncateText(null, 'abc', 0, '12px F', 1)).toBe('');
  });

  it('binary-searches the longest prefix that fits with an ellipsis', () => {
    // No context, per-char 1: 'HelloWorld' is 10 wide, budget 8 keeps
    // 5 characters plus '...' (3 wide).
    expect(truncateText(null, 'HelloWorld', 8, '12px F', 1)).toBe('Hello...');
  });

  it('returns empty when even the ellipsis does not fit', () => {
    expect(truncateText(null, 'abcdef', 2, '12px F', 1)).toBe('');
  });
});

describe('wrapText', () => {
  it('returns the text as one line when it fits', () => {
    expect(wrapText(null, 'ab cd', 20, '12px F', 1)).toEqual(['ab cd']);
  });

  it('greedily wraps words onto lines within the width', () => {
    expect(wrapText(null, 'aa bb cc', 5, '12px F', 1)).toEqual(['aa bb', 'cc']);
  });

  it('returns the original text when nothing fits', () => {
    expect(wrapText(null, 'toolongword', 3, '12px F', 1)).toEqual([
      'toolongword',
    ]);
  });

  it('measures through a context when given', () => {
    expect(wrapText(contextMeasuring(1), 'aa bb cc', 5, '12px F', 1)).toEqual([
      'aa bb',
      'cc',
    ]);
  });
});

describe('wrapTextMeasured', () => {
  const measure = { width: (text: string) => text.length };

  it('wraps through the injected measure instead of a context', () => {
    expect(wrapTextMeasured(measure, 'aa bb cc', 5, '12px F')).toEqual([
      'aa bb',
      'cc',
    ]);
  });

  it('matches the context-driven wrap on the same widths', () => {
    const throughContext = wrapText(
      contextMeasuring(1),
      'aa bb cc',
      5,
      '12px F',
      1,
    );
    const throughMeasure = wrapTextMeasured(measure, 'aa bb cc', 5, '12px F');
    expect(throughMeasure).toEqual(throughContext);
  });
});

describe('PER_CHAR_WIDTH_FALLBACK', () => {
  it('is the documented per-character approximation', () => {
    expect(PER_CHAR_WIDTH_FALLBACK).toBe(6.5);
  });
});
