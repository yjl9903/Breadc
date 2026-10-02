import { it, expectTypeOf } from 'vitest';
import * as core from '@breadc/core';
import { breadc, option, type Breadc, type BreadcInit } from '../src/index.ts';

it('preserves core inference through the wrapper', () => {
  const init: BreadcInit = { i18n: 'zh', builtin: { version: { spec: '-V, --release' } } };
  expectTypeOf(breadc('cli', init)).toEqualTypeOf<Breadc>();
  breadc('cli')
    .option(option('--port <value>', '', { default: '1', cast: Number }))
    .use(async (_ctx, next) => next({ data: { count: 1 } }))
    .command('run <name>')
    .action((name, options, context) => {
      expectTypeOf(name).toEqualTypeOf<string>();
      expectTypeOf(options.port).toEqualTypeOf<number>();
      expectTypeOf(context.data.count).toEqualTypeOf<number>();
    });
});

it('removes builtin configuration and exports from core', () => {
  // @ts-expect-error builtin configuration is owned by breadc
  core.breadc('cli', { builtin: { help: false } });
  // @ts-expect-error locale belongs to presentation
  core.breadc('cli', { i18n: 'zh' });
  // @ts-expect-error core no longer exports help rendering
  core.printHelp;
  // @ts-expect-error core no longer exports version rendering
  core.printVersion;
});
