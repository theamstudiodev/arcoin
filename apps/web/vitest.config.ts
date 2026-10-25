import path from 'node:path';
import {defineConfig} from 'vitest/config';

// Unit tests for the pure modules. The browser tests in e2e/ run under Playwright instead.
export default defineConfig({
  resolve: {alias: {'@': path.resolve(__dirname, 'src')}},
  test: {include: ['src/**/*.test.ts']},
});
