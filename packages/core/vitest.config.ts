import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    includeSource: ['src/**/*.{js,ts}'],
    exclude: [
      '**\/node_modules/**',
      '**\/dist/**',
      '**\/cypress/**',
      '**\/.{idea,git,cache,output,temp}/**',
      '**\/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
      '**\/legacy/**'
    ],
    typecheck: {
      exclude: [
        '**\/node_modules/**',
        '**\/dist/**',
        '**\/cypress/**',
        '**\/.{idea,git,cache,output,temp}/**',
        '**\/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
        '**\/legacy/**'
      ]
    },
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: ['text', 'html', 'json', 'lcov'],
      exclude: [
        '**/mod.ts',
        'coverage/**',
        'dist/**',
        'legacy/**',
        '**/[.]**',
        'packages/*/test?(s)/**',
        '**/*.d.ts',
        '**/virtual:*',
        '**/__x00__*',
        '**/\x00*',
        'cypress/**',
        'test?(s)/**',
        'test?(-*).?(c|m)[jt]s?(x)',
        '**/*{.,-}{test,spec}.?(c|m)[jt]s?(x)',
        '**/__tests__/**',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
        '**/vitest.{workspace,projects}.[jt]s?(on)',
        '**/.{eslint,mocha,prettier}rc.{?(c|m)js,yml}'
      ]
    }
  }
});
