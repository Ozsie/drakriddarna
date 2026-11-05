// The consumer-side kit surface test (re-scoped after the lift of the UI
// kit into the @hoard-engine/uikit engine package): the game consumes
// the kit only through the package's public entry points — '@hoard-engine/
// uikit' and the harness subpath '@hoard-engine/uikit/testing'. Deep
// subpath imports and residual relative 'uikit' imports fail, since the
// that-repo-side completeness guarantee is now the package's own
// public-surface test.

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const GAME_ROOT = join(ROOT, 'src');

const ENTRY_POINTS = new Set([
  '@hoard-engine/uikit',
  '@hoard-engine/uikit/testing',
]);

const collectImportSpecifiers = (dir: string): string[] => {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...collectImportSpecifiers(path));
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.svelte')) {
      const source = readFileSync(path, 'utf8');
      for (const match of source.matchAll(/from '([^']+)'/g)) {
        found.push(match[1]);
      }
    }
  }
  return found;
};

describe('uikit public surface', () => {
  it('imports the kit only through the package entry points', () => {
    const kitImports = [...new Set(collectImportSpecifiers(GAME_ROOT))].filter(
      (specifier) => specifier.includes('uikit'),
    );
    expect(
      kitImports.length,
      'expected the game to consume the kit',
    ).toBeGreaterThan(0);
    const violations = kitImports.filter((s) => !ENTRY_POINTS.has(s));
    expect(
      violations,
      `kit imports outside the package entry points: ${violations.join(', ')}`,
    ).toEqual([]);
  });
});
