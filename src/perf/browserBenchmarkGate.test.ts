import { describe, expect, it } from 'vitest';
import { isBrowserPerfHarnessEnabled } from './browserBenchmarkGate';

describe('isBrowserPerfHarnessEnabled', () => {
  it('only enables the harness for the exact opt-in value', () => {
    expect(isBrowserPerfHarnessEnabled('1')).toBe(true);
    expect(isBrowserPerfHarnessEnabled(null)).toBe(false);
    expect(isBrowserPerfHarnessEnabled('0')).toBe(false);
    expect(isBrowserPerfHarnessEnabled('true')).toBe(false);
  });
});
