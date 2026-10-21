import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

// Expo SDK 57's preset includes a React plugin whose peer range stops at ESLint 9.
// Use supported ESLint/TypeScript/Hooks rules directly, without legacy peer overrides.
export default tseslint.config(
  { ignores: ['backend/**', 'node_modules/**', '.expo/**', 'dist/**', 'ios/**', 'android/**', 'output/**'] },
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_',
      }],
      // Validation deliberately rejects ASCII control characters.
      'no-control-regex': 'off',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    // Existing runtime validators use structural records; unknown-based refactoring is separate.
    files: ['lib/analyticsApi.ts', 'lib/chefApi.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  {
    // Metro requires static require calls for bundled images/fonts.
    files: ['app/_layout.tsx', 'lib/designAssets.ts'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
);
