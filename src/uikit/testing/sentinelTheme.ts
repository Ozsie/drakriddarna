// A sentinel theme for the parameterization test: every string token is
// replaced by a unique marker naming it. When a renderer is given the
// sentinel theme, every color and font it writes must be (or contain) a
// marker — a leaked style literal fails the test.

import type { UiTheme } from '@hoard-engine/primitives';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const sentinel = (path: string[]): string => `⟦${path.join('.')}⟧`;

export const createSentinelTheme = (theme: UiTheme): UiTheme => {
  const walk = (node: unknown, path: string[]): unknown => {
    if (typeof node === 'string') return sentinel(path);
    if (isPlainObject(node)) {
      const marked: Record<string, unknown> = {};
      for (const key of Object.keys(node)) {
        marked[key] = walk(node[key], [...path, key]);
      }
      return marked;
    }
    return node;
  };
  return walk(theme, []) as UiTheme;
};
