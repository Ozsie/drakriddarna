import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  countStyleLiterals,
  type StyleLiteralCount,
} from '../uikit/testing/literalBudget';

// The style-literal budget: every color and font literal under src/ui (the
// renderer layer) counts against it. The kit migration moves these into
// theme tokens one module at a time, and this ratchet makes sure the total
// only ever goes down — lowering it requires lowering the stored budget in
// the same change. A rise or a drop both fail: the budget must track the
// code exactly.
//
// When a module's literals are moved into the theme, update these two
// numbers to the new totals (see docs/ui-kit-spec/05-boundary-and-verification.md).
// M2 complete: every renderer takes its colors and fonts from the theme.
const COLOR_BUDGET = 0;
const FONT_BUDGET = 0;

const collect = (dir: string): { file: string; count: StyleLiteralCount }[] => {
  const entries: { file: string; count: StyleLiteralCount }[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      entries.push(...collect(path));
    } else if (
      entry.name.endsWith('.ts') &&
      !entry.name.endsWith('.test.ts') &&
      // src/ui/theme.ts is the game-side theme definition — the one place
      // under src/ui where style literals belong.
      path !== 'src/ui/theme.ts'
    ) {
      entries.push({
        file: path,
        count: countStyleLiterals(readFileSync(path, 'utf8')),
      });
    }
  }
  return entries;
};

describe('style-literal budget', () => {
  it('keeps the count of color and font literals in src/ui at the budget', () => {
    const files = collect('src/ui');
    const colors = files.reduce((sum, f) => sum + f.count.colors, 0);
    const fonts = files.reduce((sum, f) => sum + f.count.fonts, 0);
    const perFile = files
      .filter((f) => f.count.colors > 0 || f.count.fonts > 0)
      .map((f) => `${f.file}: ${f.count.colors} colors, ${f.count.fonts} fonts`)
      .join('\n');
    expect(
      colors,
      `color literals ${colors} != budget ${COLOR_BUDGET} (may only go down; update COLOR_BUDGET together with the change)\n${perFile}`,
    ).toBe(COLOR_BUDGET);
    expect(
      fonts,
      `font literals ${fonts} != budget ${FONT_BUDGET} (may only go down; update FONT_BUDGET together with the change)\n${perFile}`,
    ).toBe(FONT_BUDGET);
  });
});
