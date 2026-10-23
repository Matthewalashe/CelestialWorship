// Lint rules that back docs/PRINCIPLES.md: React hooks correctness, accessibility, no native dialogs.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'node_modules', 'supabase/functions', 'scripts', 'data-src', 'tests', 'public'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      ...jsxA11y.flatConfigs.recommended.rules,
      // Clickable verses are focusable buttons with keyboard handlers; labels wrap their inputs
      'jsx-a11y/no-autofocus': 'off',
      // Native alert/confirm/prompt are not accessible or translatable (PRINCIPLES §4)
      'no-restricted-globals': ['error',
        { name: 'alert', message: 'Use showToast or a dialog.' },
        { name: 'confirm', message: 'Use the ConfirmDialog.' },
        { name: 'prompt', message: 'Use the PromptDialog.' }],
      'no-restricted-properties': ['error',
        { object: 'window', property: 'alert', message: 'Use showToast or a dialog.' },
        { object: 'window', property: 'confirm', message: 'Use the ConfirmDialog.' },
        { object: 'window', property: 'prompt', message: 'Use the PromptDialog.' }],
      // Pragmatic: the data layer maps loosely-typed JSON
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
);
