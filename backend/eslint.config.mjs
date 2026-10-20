import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },
  {
    files: ['src/**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    rules: {
      // Destructuring deliberately drops API/private fields; Express requires its fourth argument.
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_',
      }],
      // Input validators intentionally match ASCII controls to reject unsafe strings.
      'no-control-regex': 'off',
      'no-console': ['error', { allow: ['info', 'error'] }],
    },
  },
);
