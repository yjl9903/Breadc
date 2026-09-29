import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts'
  },
  format: ['esm'],
  dts: { tsconfig: '../../tsconfig.json' },
  clean: true,
  outDir: 'dist'
});
