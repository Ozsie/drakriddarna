// Walks the import graph of src/: package sources are dependency-free
// leaves — only relative imports that stay inside the package are
// allowed. Test files are exempt (they may additionally import 'vitest');
// the root eslint config enforces the same rule (see the engine-package
// section there, and docs/engine-packages.md in the game repo).

import { readdirSync, readFileSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

// Anchored to this test file so the suite runs identically from the
// package folder and from the game repo's root.
const SRC_ROOT = fileURLToPath(new URL('.', import.meta.url));
const importPattern =
  /(?:import|export)\s[^;]*?from\s["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/g;

const isInsidePackage = (importPath: string, fromFile: string): boolean => {
  if (!importPath.startsWith('.')) return false;
  const resolved = relative(
    SRC_ROOT,
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
        if (importPath && !isInsidePackage(importPath, path)) {
          violations.push(`${path}: imports '${importPath}'`);
        }
      }
    }
  }
  return violations;
};

describe('package boundary', () => {
  it('imports nothing from outside the package', () => {
    expect(collectViolations(SRC_ROOT)).toEqual([]);
  });
});
