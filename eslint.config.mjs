import js from '@eslint/js'
import ts from 'typescript-eslint'
import globals from 'globals'
import promise from 'eslint-plugin-promise'
import prettier from 'eslint-config-prettier'

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'es/**',
      'lib/**',
      'test/coverage/**',
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  promise.configs['flat/recommended'],
  prettier,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-await-in-loop': 'error',
      'no-bitwise': 'error',
      'no-constant-condition': ['error', { checkLoops: 'all' }],
      'no-restricted-syntax': [
        'error',
        'ForInStatement',
        'ForOfStatement',
        'WithStatement',
        'LabeledStatement',
      ],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-expressions': [
        'error',
        { allowShortCircuit: true, allowTernary: true },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { args: 'after-used', ignoreRestSiblings: true, caughtErrors: 'none' },
      ],
      'promise/always-return': 'off',
      'promise/catch-or-return': 'off',
    },
  },
  {
    files: ['*.cjs', 'scripts/**'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-console': 'off',
      'no-restricted-syntax': [
        'error',
        'ForInStatement',
        'WithStatement',
        'LabeledStatement',
      ],
    },
  },
  {
    files: ['scripts/benchmark-capture.mjs'],
    rules: { 'no-await-in-loop': 'off' },
    linterOptions: { reportUnusedDisableDirectives: 'off' },
  },
]
