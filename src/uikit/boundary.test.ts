// Walks the import graph of src/uikit: nothing under the kit may import
// game code, Svelte, $lib/$app aliases or any package — the kit is plain
// self-contained TypeScript. Lint enforces the same rule; this test is the
// second line of defense that also catches dynamically built or re-exported
// paths lint misses (see docs/ui-kit-spec/05-boundary-and-verification.md).

import { readdirSync, readFileSync } from 'fs';
import { join, relative } from 'path';
import { describe, expect, it } from 'vitest';

const KIT_ROOT = 'src/uikit';
const importPattern =
  /(?:import|export)\s[^;]*?from\s['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

const isInsideKit = (importPath: string, fromFile: string): boolean => {
  if (!importPath.startsWith('.')) return false;
  const resolved = relative(
    KIT_ROOT,
    join(fromFile, '..', importPath),
  ).replaceAll('\\', '/');
  return !resolved.startsWith('..');
};

const collectViolations = (dir: string): string[] => {
  const violations: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      violations.push(...collectViolations(path));
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      for (const match of readFileSync(path, 'utf8').matchAll(importPattern)) {
        const importPath = match[1] ?? match[2];
        if (importPath && !isInsideKit(importPath, path)) {
          violations.push(`${path}: imports '${importPath}'`);
        }
      }
    }
  }
  return violations;
};

describe('uikit boundary', () => {
  it('imports nothing from outside src/uikit', () => {
    expect(collectViolations(KIT_ROOT)).toEqual([]);
  });
});
