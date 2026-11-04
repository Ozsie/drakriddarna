import { describe, expect, it } from 'vitest';
import { createSentinelTheme } from './sentinelTheme';
import { defaultTheme } from '@hoard-engine/primitives';

describe('createSentinelTheme', () => {
  it('marks every string token with its path', () => {
    const sentinel = createSentinelTheme(defaultTheme);
    expect(sentinel.palette.text.bright).toBe('⟦palette.text.bright⟧');
    expect(sentinel.palette.overlay.scrim).toBe('⟦palette.overlay.scrim⟧');
    expect(sentinel.typography.families.ui).toBe('⟦typography.families.ui⟧');
  });

  it('keeps non-string tokens untouched', () => {
    const sentinel = createSentinelTheme(defaultTheme);
    expect(sentinel.typography.sizes.sm).toBe(defaultTheme.typography.sizes.sm);
    expect(sentinel.shape.strokeWidth.thin).toBe(
      defaultTheme.shape.strokeWidth.thin,
    );
  });
});
