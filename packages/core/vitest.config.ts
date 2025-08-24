/// <reference types="vitest" />

import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    includeSource: ['src/**/*.{js,ts}']
  }
});
