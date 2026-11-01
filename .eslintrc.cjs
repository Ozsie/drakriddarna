module.exports = {
  ignorePatterns: ['scripts/export-editor-catalog.ts'],
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: 'tsconfig.json',
    extraFileExtensions: ['.svelte'],
  },
  plugins: ['@typescript-eslint', 'prettier'],
  rules: {
    '@typescript-eslint/no-var-requires': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/class-name-casing': 'off',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-inferrable-types': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/no-array-constructor': 'off',
    'prettier/prettier': 'error',
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-argument': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    'arrow-body-style': ['warn', 'as-needed'],
    'no-dupe-else-if': 'warn',
    '@typescript-eslint/no-base-to-string': [
      'warn',
      { ignoredTypeNames: ['literal'] },
    ],
    'no-console': 'error',
    "quotes": [2, "single", { "avoidEscape": true }],
    '@typescript-eslint/no-unsafe-enum-comparison': 'off',
  },
  overrides: [
    {
      "files": ["*.svelte"],
      "parser": "svelte-eslint-parser"
    },
    {
      files: ['**/*.cjs'],
      env: {
        node: true,
      },
    },
    // UI-kit boundary (docs/ui-kit-spec/05-boundary-and-verification.md):
    // nothing under src/uikit may import game code, Svelte, SvelteKit
    // aliases or i18n packages — the kit is plain, game-agnostic
    // TypeScript. The src/uikit/boundary.test.ts walks the import graph
    // as a second line of defense against paths lint misses.
    {
      files: ['src/uikit/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: 'svelte',
                message:
                  'The UI kit is plain TypeScript: no Svelte, SvelteKit aliases or i18n packages.',
              },
              {
                name: 'sveltekit-i18n',
                message:
                  'The UI kit is plain TypeScript: no Svelte, SvelteKit aliases or i18n packages.',
              },
            ],
            patterns: [
              'svelte/*',
              '$lib/*',
              '$app/*',
              '**/types',
              '**/types.ts',
              '**/core/**',
              '**/store/**',
              '**/campaigns/**',
              '**/game',
              '**/game.ts',
              '**/items/**',
              '**/saves/**',
              '**/monsters/**',
              '**/hero/**',
              '**/menu/**',
              '**/dungeon/**',
              '**/events/**',
              '**/secrets/**',
              '**/interactables/**',
              '**/combat/**',
              '**/notes/**',
              '**/gameMasters/**',
              '**/settings/**',
              // src/components and src/ui escapes are not listed here
              // because '**/components/**' also matches the kit's own
              // internal imports of './components/*'; the boundary test
              // (src/uikit/boundary.test.ts) walks the import graph and
              // catches those escapes.
            ],
          },
        ],
      },
    },
    // Converted kit modules hold no style literals: components read every
    // color and font from theme tokens. The theme definition (and the
    // tests that exercise literals) are the only exceptions.
    {
      files: ['src/uikit/**/*.ts'],
      excludedFiles: ['src/uikit/theme/**', 'src/uikit/**/*.test.ts'],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            selector:
              "Literal[value=/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/], Literal[value=/^(rgba?|hsla?)\\(/]",
            message:
              'Style literals live in the theme tokens (src/uikit/theme); components read them from the theme.',
          },
        ],
      },
    },
    // Reverse boundary: game-logic modules may not import the UI kit, so
    // headless benchmarks never pull in canvas code (any hit of these
    // patterns means logic reached into the kit).
    {
      files: [
        'src/game.ts',
        'src/core/**/*.ts',
        'src/monsters/**/*.ts',
        'src/hero/**/*.ts',
        'src/dungeon/**/*.ts',
        'src/items/**/*.ts',
        'src/events/**/*.ts',
        'src/campaigns/**/*.ts',
        'src/menu/**/*.ts',
        'src/saves/**/*.ts',
        'src/secrets/**/*.ts',
        'src/interactables/**/*.ts',
        'src/combat/**/*.ts',
        'src/notes/**/*.ts',
        'src/gameMasters/**/*.ts',
        'src/store/**/*.ts',
        'src/settings/**/*.ts',
      ],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              '**/uikit',
              '**/uikit/**',
              'uikit',
              'uikit/**',
            ],
          },
        ],
      },
    },
  ],
};
