import { describe, it, expectTypeOf } from 'vitest';
import { z } from 'zod';
import {
  breadc,
  option,
  argument,
  type Breadc,
  type BreadcInit,
  type BreadcOutput,
  type AppDescription
} from '../src/index.ts';

describe('app: public types', () => {
  it('accepts streams and custom writers as output', () => {
    expectTypeOf(process.stderr).toExtend<BreadcOutput>();
    expectTypeOf(breadc('cli', { output: process.stderr })).toEqualTypeOf<Breadc>();
    const output: BreadcOutput = {
      get columns() {
        return 40;
      },
      write: (_text: string) => {}
    };
    expectTypeOf(breadc('cli', { output })).toEqualTypeOf<Breadc>();
  });

  it('accepts descriptions and builtin configuration through the public entry point', () => {
    const description: AppDescription = {
      description: 'Tools',
      examples: [{ command: 'cli --help', comment: 'Usage' }]
    };
    const init: BreadcInit = { description, i18n: 'zh', builtin: { help: { spec: '-H, --usage' }, version: false } };
    expectTypeOf(breadc('cli', init)).toEqualTypeOf<Breadc>();
  });

  it('preserves converter, schema and middleware inference', () => {
    breadc('cli')
      .option(option('--port <value>', 'Port', { default: '1', cast: Number }))
      .use(async (_context, next) => next({ data: { count: 1 } }))
      .group('tools', 'Tools')
      .command('run <name>', 'Run')
      .argument(argument('[mode]', 'Mode', { default: 'dev', cast: z.enum(['dev', 'prod']) }))
      .action((name, mode, options, context) => {
        expectTypeOf(name).toEqualTypeOf<string>();
        expectTypeOf(mode).toEqualTypeOf<'dev' | 'prod'>();
        expectTypeOf(options.port).toEqualTypeOf<number>();
        expectTypeOf(context.data.count).toEqualTypeOf<number>();
      });
  });
});
