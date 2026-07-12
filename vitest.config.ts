import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  test: {
    /*
     * `packages/*` are workspace libraries (search-core, the web-file-reader
     * set). Their tests never ran until this was added — the pure logic they
     * hold is exactly what unit tests are for.
     */
    include: ['src/**/*.test.ts', 'packages/*/src/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**', 'e2e/**'],
  },
});
