import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      '.server-dist/**',
      'node_modules/**',
      '.tools/**',
      '.physical/**',
      '.builds/**',
      '.simulations/**',
      'hardware/**',
      'public/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}', 'server/**/*.ts', 'shared/**/*.ts', 'tests/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: { 'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'warn' },
  },
  {
    // Слои: lib и hooks не знают о компонентах; shared не знает ни о клиенте, ни о сервере.
    files: ['src/lib/**/*.{ts,tsx}', 'src/hooks/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/components/**'],
              message: 'lib и hooks не импортируют components: вынесите общие типы в src/lib.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['shared/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/src/**', '**/server/**'],
              message: 'shared не зависит от клиента и сервера.',
            },
          ],
        },
      ],
    },
  },
  {
    // Все запросы к серверу идут через src/lib/api.ts: он ждёт установления гостевой сессии.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/api.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='fetch']",
          message: 'Используйте request/requestVoid/requestRaw/download из lib/api.',
        },
      ],
    },
  },
  {
    // Хранилище браузера открыто только через src/lib/storage.ts: там собраны ключи и версии.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/storage.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'localStorage',
          message: 'Используйте localStore и STORAGE_KEYS из lib/storage.',
        },
        {
          name: 'sessionStorage',
          message: 'Используйте sessionStore и STORAGE_KEYS из lib/storage.',
        },
      ],
    },
  },
  {
    files: ['**/*.mjs'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        URL: 'readonly',
        performance: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        structuredClone: 'readonly',
        AbortSignal: 'readonly',
      },
    },
  },
);
