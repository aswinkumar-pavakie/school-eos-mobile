// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*', 'coverage/*'],
  },
  {
    rules: {
      // Features must go through the one API client, not raw fetch/axios - see docs/architecture/services-vs-features.md.
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: 'axios', message: 'Use src/services/api (apiRequest) instead of a raw HTTP client.' }],
        },
      ],
    },
  },
]);
