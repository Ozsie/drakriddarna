import { defaultTheme } from './defaultTheme';
import type { DeepPartial, UiTheme } from './theme';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const deepFreeze = <T>(value: T): T => {
  if (isPlainObject(value)) {
    for (const key of Object.keys(value)) {
      deepFreeze(value[key]);
    }
    Object.freeze(value);
  }
  return value;
};

const deepMerge = (
  base: Record<string, unknown>,
  overrides: Record<string, unknown>,
): Record<string, unknown> => {
  const merged: Record<string, unknown> = { ...base };
  for (const key of Object.keys(overrides)) {
    const override = overrides[key];
    if (isPlainObject(override) && isPlainObject(merged[key])) {
      merged[key] = deepMerge(merged[key] as Record<string, unknown>, override);
    } else if (override !== undefined) {
      merged[key] = override;
    }
  }
  return merged;
};

/**
 * Builds a theme from `defaultTheme` by deep-merging `overrides` over it.
 * The result is deeply frozen, so its identity is stable and it is safe in
 * cache keys and render signatures.
 */
export const resolveTheme = (overrides: DeepPartial<UiTheme> = {}): UiTheme =>
  deepFreeze(
    deepMerge(
      defaultTheme as unknown as Record<string, unknown>,
      overrides as Record<string, unknown>,
    ),
  ) as unknown as UiTheme;
