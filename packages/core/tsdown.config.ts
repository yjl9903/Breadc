import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts'
  },
  clean: true,
  dts: true,
  sourcemap: false,
  treeshake: true,
  target: 'es2022',
  format: ['esm'],
  define: {
    'import.meta.vitest': 'false'
  }
});
