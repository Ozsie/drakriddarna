module.exports = {
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
  ],
};
