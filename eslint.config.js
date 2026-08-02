const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      '.claude/**',
      'legacy/**',
      'apps/backend/src/generated/**',
      'apps/frontend/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      // ignoreRestSiblings: intentional destructure-to-omit, e.g.
      // `const { passwordHash, ...publicUser } = user` in auth.service.js.
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', ignoreRestSiblings: true }],
    },
  },
];
