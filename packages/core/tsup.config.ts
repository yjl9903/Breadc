import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  dts: true,
  splitting: true,
  sourcemap: false,
  clean: true,
  target: 'es2022',
  format: ['esm', 'cjs']
});
