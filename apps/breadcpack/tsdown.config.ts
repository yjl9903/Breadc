import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    cli: 'src/cli.ts',
    index: 'src/index.ts'
  },
  format: ['esm'],
  dts: { tsconfig: '../../tsconfig.json' },
  clean: true,
  outDir: 'dist'
});
