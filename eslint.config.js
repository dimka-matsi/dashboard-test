import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const WEB_FILES = ['apps/web/**/*.{ts,tsx}'];
const NODE_FILES = [
  'apps/server/**/*.ts',
  'packages/**/*.ts',
  'scripts/**/*.{js,mjs,ts}',
  '*.{js,mjs,ts}',
  'apps/*/vite.config.ts',
  'apps/*/vitest.config.ts',
];

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', '**/*.tsbuildinfo'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  {
    rules: {
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      '@typescript-eslint/consistent-type-definitions': 'off',
    },
  },
  {
    files: NODE_FILES,
    languageOptions: { globals: { ...globals.node } },
    rules: { 'no-console': 'off' },
  },
  {
    files: WEB_FILES,
    ...react.configs.flat.recommended,
    settings: { react: { version: 'detect' } },
  },
  {
    files: WEB_FILES,
    ...react.configs.flat['jsx-runtime'],
  },
  {
    files: WEB_FILES,
    ...reactHooks.configs.flat.recommended,
  },
  {
    files: WEB_FILES,
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      'react/prop-types': 'off',
      // Требование задания: никакого inline-CSS. Стили — только через styled-components.
      'react/forbid-dom-props': [
        'error',
        {
          forbid: [
            { propName: 'style', message: 'Inline-CSS запрещён: используйте styled-components' },
          ],
        },
      ],
      'react/forbid-component-props': [
        'error',
        {
          forbid: [
            { propName: 'style', message: 'Inline-CSS запрещён: используйте styled-components' },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'apps/web/src/test/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
