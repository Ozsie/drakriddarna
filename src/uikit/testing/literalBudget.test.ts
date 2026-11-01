import { describe, expect, it } from 'vitest';
import { countStyleLiterals } from './literalBudget';

describe('countStyleLiterals', () => {
  it('counts hex, functional and named color literals', () => {
    const source = [
      "ctx.fillStyle = '#111827';",
      "ctx.strokeStyle = '#38bdf8';",
      "ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';",
      "ctx.fillStyle = 'white';",
      "gradient.addColorStop(1, 'rgba(0, 0, 0, 0.35)');",
    ].join('\n');
    expect(countStyleLiterals(source)).toEqual({ colors: 5, fonts: 0 });
  });

  it('counts font shorthand literals in both quote styles', () => {
    const source = [
      "const TITLE_FONT = 'bold 11px Arial, Helvetica, sans-serif';",
      'ctx.font = "10px sans-serif";',
    ].join('\n');
    expect(countStyleLiterals(source)).toEqual({ colors: 0, fonts: 2 });
  });

  it('does not count keys, prose or emoji text', () => {
    const source = [
      "i18n('logs.gameSaved')",
      "const ellipsis = '...';",
      "'🔄 3'",
      "const label = 'Score 450';",
    ].join('\n');
    expect(countStyleLiterals(source)).toEqual({ colors: 0, fonts: 0 });
  });
});
