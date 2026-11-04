import { describe, expect, it } from 'vitest';
import { defaultTheme } from './defaultTheme';
import { resolveTheme } from './resolveTheme';
import type { DeepPartial, UiTheme } from './theme';

describe('resolveTheme', () => {
  it('returns the frozen default theme without overrides', () => {
    const theme = resolveTheme();
    expect(Object.isFrozen(theme)).toBe(true);
    expect(theme).toEqual(defaultTheme);
  });

  it('deep-merges overrides and keeps the rest at the defaults', () => {
    const theme = resolveTheme({
      palette: { text: { body: '#123456' } },
      typography: { sizes: { sm: 20 } },
    });
    expect(theme.palette.text.body).toBe('#123456');
    expect(theme.typography.sizes.sm).toBe(20);
    expect(theme.palette.text.bright).toBe(defaultTheme.palette.text.bright);
    expect(theme.typography.sizes.md).toBe(defaultTheme.typography.sizes.md);
  });

  it('deeply freezes the result', () => {
    const theme = resolveTheme({ palette: { text: { body: '#123456' } } });
    expect(Object.isFrozen(theme)).toBe(true);
    expect(Object.isFrozen(theme.palette)).toBe(true);
    expect(Object.isFrozen(theme.palette.text)).toBe(true);
  });

  it('ignores undefined override values', () => {
    const overrides: DeepPartial<UiTheme> = {
      palette: { text: { body: undefined } },
    };
    const theme = resolveTheme(overrides);
    expect(theme.palette.text.body).toBe(defaultTheme.palette.text.body);
  });
});

describe('defaultTheme', () => {
  it('satisfies the token contract', () => {
    const theme: UiTheme = defaultTheme;
    expect(theme.palette.text.bright).toBeTruthy();
    expect(theme.typography.weights.bold).toBeTruthy();
    expect(theme.typography.families.ui).toBeTruthy();
  });
});
