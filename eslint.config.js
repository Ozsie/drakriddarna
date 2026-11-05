import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import svelteParser from 'svelte-eslint-parser';
import globals from 'globals';

// Flat-config replacement for the old .eslintrc.cjs (ESLint 10,
// typescript-eslint 8). Behavior is carried over rule for rule:
// type-aware linting over .ts files with prettier enforced, plus the
// engine-package and reverse-boundary import restrictions (the UI kit
// now ships its own kit-side rules inside @hoard-engine/uikit).
export default tseslint.config(
  {
    ignores: [
      'scripts/export-editor-catalog.ts',
      'packages/*/dist',
      // Flat config does not ignore dot-directories by default.
      '.svelte-kit/**',
      'build/**',
    ],
  },
  {
    files: ['**/*.ts'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      prettierRecommended,
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.svelte'],
      },
    },
    rules: {
      '@typescript-eslint/no-var-requires': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-inferrable-types': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-empty-interface': 'off',
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
      quotes: [2, 'single', { avoidEscape: true }],
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
    },
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tseslint.parser,
        // Explicit so the in-repo engine-package tsconfig under
        // packages/ cannot become a second TSConfigRootDir candidate.
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // Canvas-mock test objects are `as unknown as CanvasRenderingContext2D`,
  // so method references like `expect(ctx.arc).toHaveBeenCalled()` carry the
  // DOM method type and trip unbound-method even though the underlying
  // values are bound vi.fn() mocks. The rule has no value in tests.
  {
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  // HOARD engine packages (docs/engine-packages.md): package sources
  // are leaves with no dependencies — only relative imports are
  // allowed; test files may additionally import 'vitest'. The
  // per-package boundary tests walk the import graph as a second line
  // of defense.
  {
    files: ['packages/*/src/**/*.ts'],
    ignores: ['packages/*/src/**/*.test.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'ImportDeclaration[source.value=/^[^.]/], ImportExpression[source.value=/^[^.]/], ExportAllDeclaration[source.value=/^[^.]/], ExportNamedDeclaration[source.value=/^[^.]/]',
          message:
            'Engine packages import nothing: use relative imports within the package.',
        },
      ],
    },
  },
  // Reverse boundary: game-logic modules may not import the UI kit
  // (@hoard-engine/uikit), so headless benchmarks never pull in canvas
  // code (any hit of these patterns means logic reached into the kit).
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
          patterns: ['@hoard-engine/uikit', '@hoard-engine/uikit/**'],
        },
      ],
    },
  },
);
