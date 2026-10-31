// Counts style literals (color and font strings) in canvas-rendering
// source code. The theme migration moves these into tokens; the budget test
// stores today's total and fails in both directions, so the number can only
// be lowered deliberately, alongside a drop in the stored budget.

export interface StyleLiteralCount {
  colors: number;
  fonts: number;
}

// CSS named colors used anywhere in the game's rendering code, so bare
// color names assigned to a style are counted without matching unrelated
// prose.
const namedColors = new Set([
  'white',
  'black',
  'red',
  'green',
  'blue',
  'grey',
  'gray',
  'orange',
  'yellow',
  'purple',
  'brown',
  'wheat',
  'burlywood',
  'gold',
  'silver',
  'navy',
  'teal',
  'olive',
  'maroon',
  'aqua',
  'cyan',
  'fuchsia',
  'lime',
  'magenta',
  'transparent',
]);

const isColorLiteral = (value: string): boolean =>
  /^#[0-9a-fA-F]{3,8}$/.test(value) ||
  /^(rgba?|hsla?)\([^)]*\)$/.test(value) ||
  namedColors.has(value.toLowerCase());

const isFontLiteral = (value: string): boolean =>
  /\d(\.\d+)?(px|pt)(\s|$)/.test(value) ||
  /\b(sans-serif|serif|monospace|cursive|fantasy)\b/.test(value);

// Matches plain string literals in either quote style. Template literals
// are out of scope: a size built from an interpolated value is not a
// literal that can move into a theme token unchanged.
const stringLiteral = /(['"])((?:\\.|(?!\1).)*)\1/g;

export const countStyleLiterals = (source: string): StyleLiteralCount => {
  const count: StyleLiteralCount = { colors: 0, fonts: 0 };
  for (const match of source.matchAll(stringLiteral)) {
    const value = match[2];
    if (isColorLiteral(value)) count.colors += 1;
    else if (isFontLiteral(value)) count.fonts += 1;
  }
  return count;
};
