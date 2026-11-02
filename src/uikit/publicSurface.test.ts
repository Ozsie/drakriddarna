// The public-surface completeness test: every kit module the game side
// deep-imports must be re-exported from src/uikit/index.ts, so switching
// consumers to the package entry is a one-line change and nothing can
// quietly fall outside the public surface. The testing helpers are
// deliberately exempt (they are this repo's harness, not the surface).

import { readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const KIT_ROOT = resolve(ROOT, 'src/uikit');
const GAME_ROOTS = [resolve(ROOT, 'src/ui'), resolve(ROOT, 'src/components')];

const resolveModule = (fromDir: string, specifier: string): string | null => {
  if (!specifier.includes('uikit')) return null;
  if (specifier.includes('/testing/')) return null; // harness, not surface
  const base = resolve(fromDir, specifier);
  for (const suffix of ['.ts', '/index.ts']) {
    const file = base + suffix;
    try {
      readFileSync(file);
      // The package entry itself is the public surface, not a deep
      // import: `from '…/uikit'` is the sanctioned consumption pattern
      // and never needs re-exporting.
      if (file === join(KIT_ROOT, 'index.ts')) return null;
      return file;
    } catch {
      // try the next suffix
    }
  }
  return null;
};

const collectDeepKitImports = (dir: string): string[] => {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...collectDeepKitImports(path));
    } else if (entry.name.endsWith('.ts')) {
      const source = readFileSync(path, 'utf8');
      for (const match of source.matchAll(/from '([^']+)'/g)) {
        const resolved = resolveModule(dir, match[1]);
        if (resolved) found.push(resolved);
      }
    }
  }
  return found;
};

const indexReExports = (): string[] => {
  const source = readFileSync(join(KIT_ROOT, 'index.ts'), 'utf8');
  return [...source.matchAll(/export \* from '([^']+)';/g)].map((m) =>
    resolve(KIT_ROOT, m[1]),
  );
};

describe('uikit public surface', () => {
  it('re-exports every kit module the game side deep-imports', () => {
    const deep = [...new Set(GAME_ROOTS.flatMap(collectDeepKitImports))];
    expect(deep.length).toBeGreaterThan(0);
    const surface = indexReExports().map(resolveModuleToExisting);
    const missing = deep.filter((m) => !surface.includes(m));
    expect(
      missing,
      `kit modules consumed but not exported from src/uikit/index.ts: ${missing.join(
        ', ',
      )}`,
    ).toEqual([]);
  });

  it('only re-exports modules that exist', () => {
    for (const module of indexReExports()) {
      expect(resolveModuleToExisting(module)).toBeTruthy();
    }
  });
});

const resolveModuleToExisting = (base: string): string | null => {
  for (const suffix of ['.ts', '/index.ts']) {
    const file = base + suffix;
    try {
      readFileSync(file);
      return file;
    } catch {
      // try the next suffix
    }
  }
  return null;
};
