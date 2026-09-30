import { defineConfig } from 'vitest/config';
import path from 'path';

// Unit tests only. The Playwright specs under tests/ run with `npx playwright test`.
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    include: ['tests/security/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname) },
  },
});
