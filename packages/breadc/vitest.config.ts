import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'c8',
      reportsDirectory: 'coverage',
      reporter: ['text', 'html', 'json', 'lcov']
    }
  }
});
