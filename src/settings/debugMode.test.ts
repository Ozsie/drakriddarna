import { describe, expect, it } from 'vitest';
import { isDebugModeAvailable } from './debugMode';

describe('isDebugModeAvailable', () => {
  it('is available in dev and test builds', () => {
    expect(isDebugModeAvailable()).toBe(true);
  });
});
