import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [{ find: '@breadc/core', replacement: fileURLToPath(new URL('../core/src/index.ts', import.meta.url)) }]
  },
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reportsDirectory: 'coverage',
      reporter: ['text', 'html', 'json', 'lcov'],
      exclude: ['**/test/**', '**/dist/**']
    }
  }
});
