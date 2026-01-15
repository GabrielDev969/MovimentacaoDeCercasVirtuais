export default [
    {
      languageOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        globals: {
          console: 'readonly',
          process: 'readonly',
          Buffer: 'readonly',
          __dirname: 'readonly',
          __filename: 'readonly',
        },
      },
      rules: {
        'no-console': 'off',
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        'prefer-const': 'warn',
        'no-undef': 'error',
      },
    },
  ];