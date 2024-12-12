'use strict';

module.exports = {
  extends: [
    'eslint-config-egg',
    'eslint-config-egg/typescript'
  ],
  parserOptions: {
    project: './tsconfig.json',
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  ignorePatterns: ['dist/**/*']
};
