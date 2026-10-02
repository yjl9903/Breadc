import { it, expectTypeOf } from 'vitest';
import { z } from 'zod';
import * as mini from 'zod/mini';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { breadc, option, argument, command, group, type Cast, type InferCastOutput } from '../src/index.ts';
import type { InferArgumentType, InferOptionType } from '../src/breadc/types/infer.ts';

it('accepts narrow schema inputs and extracts precise outputs', () => {
  const mode = z.enum(['dev', 'prod']);
  const object = z
    .string()
    .transform((name) => ({ name }))
    .brand<'Name'>();
  const files = z.array(z.string()).transform((items) => new Set(items));
  expectTypeOf<InferCastOutput<typeof mode>>().toEqualTypeOf<'dev' | 'prod'>();
  expectTypeOf<InferCastOutput<typeof object>>().toEqualTypeOf<z.output<typeof object>>();
  expectTypeOf<InferCastOutput<typeof files>>().toEqualTypeOf<Set<string>>();
  expectTypeOf<InferCastOutput<(value: string) => number>>().toEqualTypeOf<number>();
  expectTypeOf<InferCastOutput<StandardSchemaV1<unknown, 'schema'> & (() => 'function')>>().toEqualTypeOf<'schema'>();
  expectTypeOf<typeof mode>().toExtend<Cast<string>>();
  const app = breadc('cli')
    .option('--mode <value>', '', { cast: mode })
    .option('--default-mode <value>', '', { default: 'dev', cast: mode })
    .option('--object [value]', '', { default: 'name', cast: object })
    .option('--files <...value>', '', { cast: files })
    .option('--flag', '', { cast: mini.boolean() });
  const parsed = app.parse([]);

  expectTypeOf(parsed.options).toEqualTypeOf<{
    mode: 'dev' | 'prod' | undefined;
    defaultMode: 'dev' | 'prod';
    object: z.output<typeof object>;
    files: Set<string>;
    flag: boolean;
  }>();
  app
    .group('tool')
    .option('--group <value>', '', { default: 'dev', cast: mode })
    .command('run')
    .option('--command <value>', '', { cast: mode })
    .argument('<required>', { cast: object })
    .argument('[optional]', { cast: mode })
    .argument('[default]', { default: 'dev', cast: mode })
    .argument('[...files]', { cast: files })
    .action((required, optional, fallback, rest, options) => {
      expectTypeOf(required).toEqualTypeOf<z.output<typeof object>>();
      expectTypeOf(optional).toEqualTypeOf<'dev' | 'prod' | undefined>();
      expectTypeOf(fallback).toEqualTypeOf<'dev' | 'prod'>();
      expectTypeOf(rest).toEqualTypeOf<Set<string>>();
      expectTypeOf(options.group).toEqualTypeOf<'dev' | 'prod'>();
      expectTypeOf(options.command).toEqualTypeOf<'dev' | 'prod' | undefined>();
      expectTypeOf(options.flag).toEqualTypeOf<boolean>();
    });
});

it('preserves standalone declarations in every registration overload', () => {
  const cast = z.enum(['dev', 'prod']);
  const opt = option('--mode <value>', '', { default: 'dev', cast });
  const arg = argument('[name]', { default: 'dev', cast });
  const parsed = breadc('cli').option(opt).parse([]);
  expectTypeOf(parsed.options.mode).toEqualTypeOf<'dev' | 'prod'>();
  group('tool')
    .option(opt)
    .command('run')
    .argument(arg)
    .action((name, options) => {
      expectTypeOf(name).toEqualTypeOf<'dev' | 'prod'>();
      expectTypeOf(options.mode).toEqualTypeOf<'dev' | 'prod'>();
    });
  command('run')
    .option(opt)
    .argument(arg)
    .action((name, options) => {
      expectTypeOf(name).toEqualTypeOf<'dev' | 'prod'>();
      expectTypeOf(options.mode).toEqualTypeOf<'dev' | 'prod'>();
    });
});

it('combines output undefined/null with definite and possibly absent defaults', () => {
  const cast = z
    .string()
    .transform((value) => (value ? (1 as const) : null))
    .optional();
  type Output = 1 | null | undefined;
  type Init = { cast: typeof cast; default: string };
  expectTypeOf<InferOptionType<'--value <value>', Init>>().toEqualTypeOf<Output>();
  expectTypeOf<InferOptionType<'--value [value]', Init>>().toEqualTypeOf<Output>();
  expectTypeOf<InferArgumentType<'[value]', Init>>().toEqualTypeOf<Output>();
  const mode = z.enum(['dev', 'prod']);
  type Maybe = { cast: typeof mode; default: string | undefined };
  expectTypeOf<InferOptionType<'--value <value>', Maybe>>().toEqualTypeOf<'dev' | 'prod' | undefined>();
  expectTypeOf<InferArgumentType<'[value]', Maybe>>().toEqualTypeOf<'dev' | 'prod' | undefined>();
  const fallback: string | undefined = Math.random() > 0.5 ? 'dev' : undefined;
  const parsed = breadc('cli').option('--mode <value>', '', { default: fallback, cast: mode }).parse([]);
  expectTypeOf(parsed.options.mode).toEqualTypeOf<'dev' | 'prod' | undefined>();
  const defaults = z.string().default('schema default');
  const optional = breadc('cli').option('--mode [value]', '', { cast: defaults }).parse([]);
  expectTypeOf(optional.options.mode).toEqualTypeOf<string | undefined>();
  command('run')
    .argument('[name]', { cast: defaults })
    .action((name) => {
      expectTypeOf(name).toEqualTypeOf<string | undefined>();
    });
  const flag = breadc('cli').option('--flag', '', { cast: undefined }).parse([]);
  expectTypeOf(flag.options.flag).toEqualTypeOf<boolean>();
  command('run')
    .argument('[name]', { cast: undefined })
    .action((name) => {
      expectTypeOf(name).toEqualTypeOf<string | undefined>();
    });
});

it('keeps function contextual inputs stable beside the schema union', () => {
  const app = breadc('cli')
    .option('--flag', '', {
      cast: (value) => {
        expectTypeOf(value).toEqualTypeOf<boolean>();
        return 'flag' as const;
      }
    })
    .option('--required <value>', '', {
      cast: (value) => {
        expectTypeOf(value).toEqualTypeOf<string>();
        return value.length;
      }
    })
    .option('--optional [value]', '', {
      cast: (value) => {
        expectTypeOf(value).toEqualTypeOf<string | undefined>();
        return value?.length ?? 0;
      }
    })
    .option('--files <...value>', '', {
      cast: (value) => {
        expectTypeOf(value).toEqualTypeOf<string[]>();
        return new Set(value);
      }
    });
  app
    .group('tool')
    .option('--group', '', {
      cast: (value) => {
        expectTypeOf(value).toEqualTypeOf<boolean>();
        return value;
      }
    })
    .command('run')
    .option('--command <value>', '', {
      cast: (value) => {
        expectTypeOf(value).toEqualTypeOf<string>();
        return value;
      }
    })
    .argument('<required>', {
      cast: (value) => {
        expectTypeOf(value).toEqualTypeOf<string>();
        return value.length;
      }
    })
    .argument('[optional]', {
      cast: (value) => {
        expectTypeOf(value).toEqualTypeOf<string>();
        return value.length;
      }
    })
    .argument('[...files]', {
      cast: (value) => {
        expectTypeOf(value).toEqualTypeOf<string[]>();
        return new Set(value);
      }
    })
    .action((required, optional, files, options) => {
      expectTypeOf(required).toEqualTypeOf<number>();
      expectTypeOf(optional).toEqualTypeOf<number | undefined>();
      expectTypeOf(files).toEqualTypeOf<Set<string>>();
      expectTypeOf(options.flag).toEqualTypeOf<'flag'>();
      expectTypeOf(options.required).toEqualTypeOf<number | undefined>();
      expectTypeOf(options.optional).toEqualTypeOf<number | undefined>();
      expectTypeOf(options.files).toEqualTypeOf<Set<string>>();
    });
  option('--flag', '', {
    cast: (value) => {
      expectTypeOf(value).toEqualTypeOf<boolean>();
      return value;
    }
  });
  argument('[name]', {
    cast: (value) => {
      expectTypeOf(value).toEqualTypeOf<string>();
      return value;
    }
  });
});

it('does not loosen raw default or function input types for schemas', () => {
  // @ts-expect-error scalar defaults must be strings
  option('--port <value>', '', { default: 3000, cast: z.coerce.number() });
  // @ts-expect-error boolean defaults must be booleans
  option('--flag', '', { default: 'true', cast: z.coerce.boolean() });
  // @ts-expect-error array defaults must be string arrays
  option('--files <...value>', '', { default: 'file', cast: z.array(z.string()) });
  // @ts-expect-error required arguments cannot have defaults
  argument('<name>', { default: 'name', cast: z.string() });
  // @ts-expect-error optional arguments require string defaults
  argument('[name]', { default: 1, cast: z.coerce.number() });
  // @ts-expect-error spread arguments require string arrays
  argument('[...files]', { default: [1], cast: z.array(z.coerce.number()) });
  // @ts-expect-error functions must accept the CLI input
  option('--flag', '', { cast: (value: string) => value });
  // @ts-expect-error bare options may pass undefined
  option('--value [value]', '', { cast: (value: string) => value });
  // @ts-expect-error argument functions receive strings
  argument('[name]', { cast: (value: number) => value });
});
