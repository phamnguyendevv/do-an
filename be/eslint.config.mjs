// @ts-check
import eslint from '@eslint/js'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import globals from 'globals'
import tseslint from 'typescript-eslint'

import { flatConfigs } from 'eslint-plugin-import'

export default tseslint.config(
  {
    ignores: [
      'node_modules',
      'dist',
      'coverage',
      '.serverless',
      'eslint.config.*',
      'eslint.config.mjs',
    ],
  },
  eslint.configs.recommended,
  flatConfigs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      ecmaVersion: 5,
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },

    rules: {
      'no-console': 2,
      'import/no-unresolved': [
        'error',
        {
          ignore: ['^@', '^./', '^../', '^test'],
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: ['../../*'],
        },
      ],
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'error',

      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: ['variable', 'parameter', 'method'],
          format: ['camelCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'enum',
          format: ['PascalCase'],
          suffix: ['Enum'],
        },
        {
          selector: 'enumMember',
          format: ['PascalCase'],
        },
        {
          selector: 'variable',
          modifiers: ['const'],
          format: ['UPPER_CASE', 'camelCase'],
        },
        {
          selector: ['class'],
          format: ['PascalCase'],
        },
        {
          selector: ['interface'],
          format: ['PascalCase'],
          prefix: ['I'],
        },
        {
          selector: ['typeAlias'],
          format: ['PascalCase'],
          prefix: ['T'],
        },
        {
          selector: 'memberLike',
          modifiers: ['private'],
          format: ['camelCase'],
          leadingUnderscore: 'forbid',
        },
      ],

      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['**/*.decorator.ts'],
    rules: {
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'variable',
          modifiers: ['const'],
          format: ['UPPER_CASE', 'PascalCase', 'camelCase'],
        },
      ],
    },
  },
  {
    files: ['test/**/*.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
)
