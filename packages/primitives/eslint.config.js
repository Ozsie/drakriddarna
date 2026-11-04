import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

// Standalone lint config for the package: strict TypeScript with prettier
// enforced, plus the engine-package leaf rule — package sources are
// dependency-free, only relative imports are allowed (test files may
// additionally import 'vitest').
export default tseslint.config(
  {
    ignores: ['dist', 'node_modules'],
  },
  {
    files: ['**/*.ts'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      prettierRecommended,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'no-console': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      'prettier/prettier': 'error',
    },
  },
  // Canvas-mock test objects are `as unknown as CanvasRenderingContext2D`,
  // so mock method references trip unbound-method even though the values
  // are plain recorders. The rule has no value in tests.
  {
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  {
    files: ['src/**/*.ts'],
    ignores: ['src/**/*.test.ts'],
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
);
