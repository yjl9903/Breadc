import { describe, it, expectTypeOf } from 'vitest';
import { z } from 'zod';
import {
  breadc,
  option,
  argument,
  type Breadc,
  type BreadcInit,
  type BreadcOutput,
  type BreadcDescription,
  type HelpExample,
  type UnknownCommandHandler,
  type UnknownOptionHandler
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
    const examples: readonly HelpExample[] = [{ command: 'cli --help', comment: 'Usage' }];
    const description: BreadcDescription = {
      text: 'Tools',
      examples
    };
    const init: BreadcInit = { description, locale: 'zh', builtin: { help: { spec: '-H, --usage' }, version: false } };
    expectTypeOf(breadc('cli', init)).toEqualTypeOf<Breadc>();
  });

  it('preserves converter, schema and middleware inference', () => {
    const onUnknownCommand: UnknownCommandHandler<{ count: number }> = (context) => {
      expectTypeOf(context.data.count).toEqualTypeOf<number>();
    };
    const onUnknownOption: UnknownOptionHandler<{ count: number }> = (context, name, value) => {
      expectTypeOf(context.data.count).toEqualTypeOf<number>();
      expectTypeOf(value).toEqualTypeOf<string | undefined>();
      return { name, value };
    };
    breadc('cli')
      .option(option('--port <value>', 'Port', { default: '1', cast: Number }))
      .use(async (_context, next) => next({ data: { count: 1 } }))
      .onUnknownCommand(onUnknownCommand)
      .allowUnknownOption(onUnknownOption)
      .group('tools', 'Tools')
      .allowUnknownOption(onUnknownOption)
      .command('run <name>', 'Run')
      .allowUnknownOption(onUnknownOption)
      .argument(argument('[mode]', 'Mode', { default: 'dev', cast: z.enum(['dev', 'prod']) }))
      .action((name, mode, options, context) => {
        expectTypeOf(name).toEqualTypeOf<string>();
        expectTypeOf(mode).toEqualTypeOf<'dev' | 'prod'>();
        expectTypeOf(options.port).toEqualTypeOf<number>();
        expectTypeOf(context.data.count).toEqualTypeOf<number>();
      });
  });
});
