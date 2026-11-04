// The public-surface completeness test: every module in src/ is re-exported
// from src/index.ts, so nothing can quietly fall outside the public
// surface — consuming the package through any other path is a bug.

import { readdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

// Anchored to this test file so the suite runs identically from the
// package folder and from the game repo's root.
const SRC_ROOT = fileURLToPath(new URL('.', import.meta.url));

const indexSource = (): string =>
  readFileSync(new URL('./index.ts', import.meta.url), 'utf8');

const indexReExports = (): string[] =>
  [...indexSource().matchAll(/export \* from '\.\/([^']+)';/g)].map(
    (m) => m[1],
  );

const sourceModules = (): string[] =>
  readdirSync(SRC_ROOT)
    .filter(
      (name) =>
        name.endsWith('.ts') &&
        !name.endsWith('.test.ts') &&
        name !== 'index.ts',
    )
    .map((name) => name.replace(/\.ts$/, ''));

describe('package public surface', () => {
  it('re-exports every source module from src/index.ts', () => {
    const surface = indexReExports();
    const missing = sourceModules().filter((m) => !surface.includes(m));
    expect(
      missing,
      `modules missing from src/index.ts: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('only re-exports modules that exist', () => {
    const files = readdirSync(SRC_ROOT).map((name) =>
      name.replace(/\.ts$/, ''),
    );
    const missing = indexReExports().filter((m) => !files.includes(m));
    expect(
      missing,
      `re-exports of missing modules: ${missing.join(', ')}`,
    ).toEqual([]);
  });
});
