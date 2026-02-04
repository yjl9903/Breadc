import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    includeSource: ['src/**/*.{js,ts}'],
    exclude: [
      '**\/node_modules/**',
      '**\/dist/**',
      '**\/cypress/**',
      '**\/.{idea,git,cache,output,temp}/**',
      '**\/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*'
    ],
    typecheck: {
      exclude: [
        '**\/node_modules/**',
        '**\/dist/**',
        '**\/cypress/**',
        '**\/.{idea,git,cache,output,temp}/**',
        '**\/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*'
      ]
    },
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: ['text', 'html', 'json', 'lcov'],
      include: ['src/**/*.ts']
    }
  }
});
