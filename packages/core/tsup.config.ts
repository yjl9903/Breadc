import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  clean: true,
  dts: true,
  splitting: true,
  sourcemap: false,
  treeshake: true,
  target: 'es2022',
  format: ['esm'],
  define: {
    'import.meta.vitest': 'false'
  }
});
