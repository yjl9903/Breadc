import { describe, it, expectTypeOf } from 'vitest';

import {
  type Breadc,
  type Group,
  type GroupInit,
  type Command,
  type CommandInit,
  breadc,
  group,
  option,
  command,
  argument,
  Context
} from '../src';

import type {
  InferOptionRawName,
  InferOptionRawType,
  InferOptionDefaultType,
  OptionInit
} from '../src/breadc/types/index.ts';

describe('types/command', () => {
  it('infer default command with no arguments', () => {
    const cmd = command('');
    expectTypeOf<(options: { '--': string[] }, context: Context<{}>) => unknown>().toEqualTypeOf<
      Parameters<(typeof cmd)['action']>[0]
    >();
  });

  it('infer default command with one required argument', () => {
    const cmd = command('<arg>');
    expectTypeOf<(arg: string, options: { '--': string[] }, context: Context<{}>) => unknown>().toEqualTypeOf<
      Parameters<(typeof cmd)['action']>[0]
    >();
  });

  it('infer default command with one optional argument', () => {
    const cmd = command('[arg]');
    expectTypeOf<
      (arg: string | undefined, options: { '--': string[] }, context: Context<{}>) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  });

  it('infer default command with one spread argument', () => {
    const cmd = command('[...arg]');
    expectTypeOf<(arg: string[], options: { '--': string[] }, context: Context<{}>) => unknown>().toEqualTypeOf<
      Parameters<(typeof cmd)['action']>[0]
    >();
  });

  it('infer default command with one required argument and one optional argument', () => {
    const cmd = command('<arg> [arg]');
    expectTypeOf<
      (arg1: string, arg2: string | undefined, options: { '--': string[] }, context: Context<{}>) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  });

  it('infer default command with one required argument and spread argument', () => {
    const cmd = command('<arg> [...arg]');
    expectTypeOf<
      (arg1: string, arg2: string[], options: { '--': string[] }, context: Context<{}>) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  });

  it('infer default command with one required argument and one optional argument and spread argument', () => {
    const cmd = command('<arg> [arg] [...arg]');
    expectTypeOf<
      (
        arg1: string,
        arg2: string | undefined,
        arg3: string[],
        options: { '--': string[] },
        context: Context<{}>
      ) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  });

  it('infer sub-command with arguments', () => {
    const cmd1 = command('dev').action(() => {});
    expectTypeOf<(options: { '--': string[] }, context: Context<{}>) => unknown>().toEqualTypeOf<
      Parameters<(typeof cmd1)['action']>[0]
    >();

    const cmd2 = command('dev <arg> [arg] [...arg]');
    expectTypeOf<
      (
        arg1: string,
        arg2: string | undefined,
        arg3: string[],
        options: { '--': string[] },
        context: Context<{}>
      ) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd2)['action']>[0]>();
  });

  it('infer sub-sub-command with arguments', () => {
    const cmd1 = command('dev run').action(() => {});
    expectTypeOf<(options: { '--': string[] }, context: Context<{}>) => unknown>().toEqualTypeOf<
      Parameters<(typeof cmd1)['action']>[0]
    >();

    const cmd2 = command('dev run <arg> [arg] [...arg]');
    expectTypeOf<
      (
        arg1: string,
        arg2: string | undefined,
        arg3: string[],
        options: { '--': string[] },
        context: Context<{}>
      ) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd2)['action']>[0]>();
  });

  it('infer manual arguments', () => {
    const cmd1 = command('dev <arg0>')
      .argument('<arg1>')
      .argument('[arg2]')
      .argument('[...arg3]')
      .action(() => 1);
    expectTypeOf<
      (
        arg0: string,
        arg1: string,
        arg2: string | undefined,
        arg3: string[],
        options: { '--': string[] },
        context: Context<{}>
      ) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd1)['action']>[0]>();

    const cmd2 = command('dev <arg0>')
      .argument(argument('<arg1>'))
      .argument(argument('[arg2]'))
      .argument(argument('[...arg3]'))
      .action(() => 1);
    expectTypeOf<
      (
        arg0: string,
        arg1: string,
        arg2: string | undefined,
        arg3: string[],
        options: { '--': string[] },
        context: Context<{}>
      ) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd2)['action']>[0]>();

    const cmd3 = command('dev <arg0>')
      .argument(argument('<arg1>'))
      .argument('<arg2>', { cast: (t) => +t })
      .argument('[arg3]', { default: 'default' })
      .argument('[arg4]', { default: 0, cast: (t) => (t ? +t : 0) })
      .argument('[arg5]', { initial: 'default' })
      .argument('[arg6]', { initial: '0', cast: (t) => +t })
      .argument('[...arg7]')
      .action(() => 1);
    expectTypeOf<
      (
        arg0: string,
        arg1: string,
        arg2: number,
        arg3: string,
        arg4: number,
        arg5: string,
        arg6: number,
        arg7: string[],
        options: { '--': string[] },
        context: Context<{}>
      ) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd3)['action']>[0]>();

    const cmd4 = command('dev <arg0>')
      .argument(argument('<arg1>'))
      .argument(argument('<arg2>', { cast: (t) => +t }))
      .argument(argument('[arg3]', { default: 'default' }))
      .argument(argument('[arg4]', { default: 0, cast: (t) => (t ? +t : 0) }))
      .argument(argument('[arg5]', { initial: 'default' }))
      .argument(argument('[arg6]', { initial: '0', cast: (t) => +t }))
      .argument(argument('[...arg7]'))
      .action(() => 1);
    expectTypeOf<
      (
        arg0: string,
        arg1: string,
        arg2: number,
        arg3: string,
        arg4: number,
        arg5: string,
        arg6: number,
        arg7: string[],
        options: { '--': string[] },
        context: Context<{}>
      ) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd4)['action']>[0]>();
  });

  it('infer return type', () => {
    const cmd1 = command('').action(() => 1);
    expectTypeOf<Promise<number>>().toEqualTypeOf<ReturnType<typeof cmd1>>();

    const cmd2 = command('').action(() => 'test');
    expectTypeOf<Promise<string>>().toEqualTypeOf<ReturnType<typeof cmd2>>();

    const cmd3 = command('').action(async () => ({}));
    expectTypeOf<Promise<{}>>().toEqualTypeOf<ReturnType<typeof cmd3>>();
  });
});

describe('types/option', () => {
  it('infers canonical names and boolean values for every form', () => {
    type Specs = '--all' | '--no-all' | '--[no-]all' | '-a, --no-all' | '-a, --[no-]all';
    expectTypeOf<InferOptionRawName<Specs>>().toEqualTypeOf<'all'>();
    expectTypeOf<InferOptionRawType<Specs>>().toEqualTypeOf<boolean>();
    expectTypeOf<InferOptionDefaultType<Specs>>().toEqualTypeOf<boolean>();
  });

  it('infers action options from strings and option instances', () => {
    command('run')
      .option('--[no-]all')
      .option('-c, --no-cache')
      .option(option('-p, --[no-]allow-page'))
      .action((options) => {
        expectTypeOf(options).toEqualTypeOf<{
          all: boolean;
          cache: boolean;
          allowPage: boolean;
          '--': string[];
        }>();
      });
  });

  it('infers forms and casts across app, group and command options', () => {
    breadc('cli')
      .option('--[no-]global')
      .group('tool')
      .option('--no-cache')
      .command('run')
      .option('-a, --[no-]all', '', { default: true })
      .option('--no-open', '', {
        cast: (value) => {
          expectTypeOf(value).toEqualTypeOf<boolean>();
          return Number(value);
        }
      })
      .action((options) => {
        expectTypeOf(options.global).toEqualTypeOf<boolean>();
        expectTypeOf(options.cache).toEqualTypeOf<boolean>();
        expectTypeOf(options.all).toEqualTypeOf<boolean>();
        expectTypeOf(options.open).toEqualTypeOf<number>();
      });
  });

  it('does not infer value arguments for negative or paired forms', () => {
    type Invalid = `${'' | '-a, '}--${'no-' | '[no-]'}all ${'<value>' | '[value]' | '[...value]'}`;
    expectTypeOf<InferOptionRawName<Invalid>>().toEqualTypeOf<never>();
    expectTypeOf<InferOptionRawType<Invalid>>().toEqualTypeOf<never>();
    expectTypeOf<InferOptionDefaultType<Invalid>>().toEqualTypeOf<never>();
  });

  it('infer boolean option type from command', () => {
    const cmd = command('').option('--flag');
    expectTypeOf<(options: { flag: boolean; '--': string[] }, context: Context<{}>) => unknown>().toEqualTypeOf<
      Parameters<(typeof cmd)['action']>[0]
    >();
  });

  it('infer string option type from command', () => {
    const cmd = command('').option('--flag <arg>');
    expectTypeOf<
      (options: { flag: string | undefined; '--': string[] }, context: Context<{}>) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  });

  it('infer optional string option type from command', () => {
    const cmd = command('').option('--flag [arg]');
    expectTypeOf<
      (options: { flag: string | undefined; '--': string[] }, context: Context<{}>) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  });

  it('infer spread option type from command', () => {
    const cmd = command('').option('--flag [...arg]');
    expectTypeOf<(options: { flag: string[]; '--': string[] }, context: Context<{}>) => unknown>().toEqualTypeOf<
      Parameters<(typeof cmd)['action']>[0]
    >();
  });

  it('infer string option type with transform from command', () => {
    const cmd = command('')
      .option('--flag1 <arg>', '')
      .option('--flag2 <arg>', '', { default: 'default' })
      .option('--flag3 <arg>', '', {
        cast: (t) => (t ? +t : 0)
      })
      .option('--flag4 <arg>', '', {
        default: '0',
        cast: (t) => (t ? +t : 0)
      })
      .option('--flag5 <arg>', '', {
        default: '0',
        cast: (t) => Number(t)
      })
      .action((options) => options);
    expectTypeOf<
      (
        options: {
          flag1: string | undefined;
          flag2: string;
          flag3: number | undefined;
          flag4: number;
          flag5: number;
          '--': string[];
        },
        context: Context<{}>
      ) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  });

  it('infer optional option type with transform from command', () => {
    const cmd = command('')
      .option('--flag1 [arg]', '')
      .option('--flag2 [arg]', '', { default: 'test' })
      .option('--flag3 [arg]', '', {
        cast: (t) => Number(t)
      })
      .option('--flag4 [arg]', '', {
        default: '0',
        cast: (t) => Number(t)
      })
      .option('--flag5 [arg]', '', {
        default: '0',
        cast: (t) => Number(t)
      })
      .action((options) => options);
    expectTypeOf<
      (
        options: {
          flag1: string | undefined;
          flag2: string | undefined;
          flag3: number | undefined;
          flag4: number;
          flag5: number;
          '--': string[];
        },
        context: Context<{}>
      ) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  });

  it('infer spread option type with transform from command', () => {
    const cmd = command('')
      .option('--flag1 [...arg]', '')
      .option('--flag2 [...arg]', '', { default: ['default'] })
      .option('--flag3 [...arg]', '', {
        cast: (t) => t.join(',')
      })
      .option('--flag4 [...arg]', '', {
        default: [],
        cast: (t) => t.join(',')
      })
      .option('--flag5 [...arg]', '', {
        default: ['default'],
        cast: (t) => t.join(',')
      });
    expectTypeOf<
      (
        options: {
          flag1: string[];
          flag2: string[];
          flag3: string;
          flag4: string;
          flag5: string;
          '--': string[];
        },
        context: Context<{}>
      ) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  });

  // it('infer boolean option type from group', () => {
  //   const grp = group('group').option('--flag');
  //   const cmd = grp.command('');
  //   expectTypeOf<
  //     (options: { flag: boolean; '--': string[] }) => unknown
  //   >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  // });

  // it('infer string option type from group', () => {
  //   const grp = group('group').option('--flag <arg>');
  //   const cmd = grp.command('');
  //   expectTypeOf<
  //     (options: { flag: string | undefined; '--': string[] }) => unknown
  //   >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  // });

  // it('infer string option type with default from group', () => {
  //   // const grp = group('group').option('--flag <arg>', { default: 'default' });
  //   // const cmd = grp.command('');
  //   // expectTypeOf<
  //   //   (options: { flag: string; '--': string[] }) => unknown
  //   // >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  // });

  // it('infer boolean option type from breadc', () => {
  //   const grp = group('group').option('--flag');
  //   const cmd = grp.command('');
  //   expectTypeOf<
  //     (options: { flag: boolean; '--': string[] }) => unknown
  //   >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  // });

  // it('infer string option type from breadc', () => {
  //   const grp = group('group').option('--flag <arg>');
  //   const cmd = grp.command('');
  //   expectTypeOf<
  //     (options: { flag: string | undefined; '--': string[] }) => unknown
  //   >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  // });

  // it('infer string option type with default from breadc', () => {
  //   // const grp = group('group').option('--flag <arg>', { default: 'default' });
  //   // const cmd = grp.command('');
  //   // expectTypeOf<
  //   //   (options: { flag: string; '--': string[] }) => unknown
  //   // >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  // });

  // it('infer options inherited from breadc and group and command', () => {});

  it('infer camel case option type', () => {
    const cmd = breadc('cli')
      .option('--flag-breadc-top')
      .group('group')
      .option('--flag-group-medium')
      .command('')
      .option('--flag-command-bottom');
    expectTypeOf<
      (
        options: {
          flagBreadcTop: boolean;
          flagGroupMedium: boolean;
          flagCommandBottom: boolean;
          '--': string[];
        },
        context: Context<{}>
      ) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  });

  it('infers the complete output matrix', () => {
    command('')
      .option('--bool')
      .option('--bool-default', '', { default: false })
      .option('--bool-cast', '', {
        cast: (value) => {
          expectTypeOf(value).toEqualTypeOf<boolean>();
          return Number(value);
        }
      })
      .option('--bool-both', '', { default: true, cast: Number })
      .option('--required <value>')
      .option('--required-default <value>', '', { default: '' })
      .option('--required-cast <value>', '', {
        cast: (value) => {
          expectTypeOf(value).toEqualTypeOf<string>();
          return Number(value);
        }
      })
      .option('--required-both <value>', '', {
        default: '1',
        cast: (value) => {
          expectTypeOf(value).toEqualTypeOf<string>();
          return Number(value);
        }
      })
      .option('--optional [value]')
      .option('--optional-default [value]', '', { default: '' })
      .option('--optional-cast [value]', '', {
        cast: (value) => {
          expectTypeOf(value).toEqualTypeOf<string | undefined>();
          return Number(value);
        }
      })
      .option('--optional-both [value]', '', {
        default: '1',
        cast: (value) => {
          expectTypeOf(value).toEqualTypeOf<string | undefined>();
          return Number(value);
        }
      })
      .option('--array [...value]')
      .option('--array-default [...value]', '', { default: [] })
      .option('--array-cast [...value]', '', {
        cast: (value) => {
          expectTypeOf(value).toEqualTypeOf<string[]>();
          return new Set(value);
        }
      })
      .option('--array-both [...value]', '', {
        default: ['a'],
        cast: (value) => {
          expectTypeOf(value).toEqualTypeOf<string[]>();
          return value.length;
        }
      })
      .action((options) => {
        expectTypeOf(options).toEqualTypeOf<{
          bool: boolean;
          boolDefault: boolean;
          boolCast: number;
          boolBoth: number;
          required: string | undefined;
          requiredDefault: string;
          requiredCast: number | undefined;
          requiredBoth: number;
          optional: string | undefined;
          optionalDefault: string | undefined;
          optionalCast: number | undefined;
          optionalBoth: number;
          array: string[];
          arrayDefault: string[];
          arrayCast: Set<string>;
          arrayBoth: number;
          '--': string[];
        }>();
      });
  });

  it('uses the same rules for app, group, command and factory options', () => {
    breadc('cli')
      .option('--app <value>', '', { default: '', cast: Number })
      .option(option('--factory <value>', '', { default: '', cast: Number }))
      .group('tool')
      .option('--group [value]', '', { default: '', cast: Number })
      .option(
        option('-f, --factory-group [value]', '', {
          default: '',
          cast: (raw) => {
            expectTypeOf(raw).toEqualTypeOf<string | undefined>();
            return Number(raw);
          }
        })
      )
      .command('run')
      .option('--command [...value]', '', { default: [], cast: (raw) => raw.length })
      .option(option('--factory-command <value>', '', { cast: Number }))
      .option(option('--factory-optional [value]'))
      .option(option('--factory-boolean', '', { cast: Number }))
      .action((options) => {
        expectTypeOf(options.app).toEqualTypeOf<number>();
        expectTypeOf(options.factory).toEqualTypeOf<number>();
        expectTypeOf(options.group).toEqualTypeOf<number>();
        expectTypeOf(options.factoryGroup).toEqualTypeOf<number>();
        expectTypeOf(options.command).toEqualTypeOf<number>();
        expectTypeOf(options.factoryCommand).toEqualTypeOf<number | undefined>();
        expectTypeOf(options.factoryOptional).toEqualTypeOf<string | undefined>();
        expectTypeOf(options.factoryBoolean).toEqualTypeOf<number>();
      });
  });

  it('retains undefined, null and false returned by converters', () => {
    const cast = (): number | undefined | null | false => 1;
    command('')
      .option('--boolean', '', { default: false, cast })
      .option('--required <value>', '', { default: '', cast })
      .option('--optional [value]', '', { default: '', cast })
      .option('--array [...value]', '', { default: [], cast })
      .option('--only-undefined', '', { cast: () => undefined })
      .option('--only-null <value>', '', { default: '', cast: () => null })
      .action((options) => {
        expectTypeOf(options.boolean).toEqualTypeOf<number | undefined | null | false>();
        expectTypeOf(options.required).toEqualTypeOf<number | undefined | null | false>();
        expectTypeOf(options.optional).toEqualTypeOf<number | undefined | null | false>();
        expectTypeOf(options.array).toEqualTypeOf<number | undefined | null | false>();
        expectTypeOf(options.onlyUndefined).toEqualTypeOf<undefined>();
        expectTypeOf(options.onlyNull).toEqualTypeOf<null>();
      });
  });

  it('treats undefined and possibly undefined defaults as absent', () => {
    const maybeDefault = '' as string | undefined;
    command('')
      .option('--required <value>', '', { default: undefined, cast: Number })
      .option('--optional [value]', '', { default: undefined, cast: Number })
      .option('--plain <value>', '', { default: undefined })
      .option('--maybe <value>', '', { default: maybeDefault, cast: Number })
      .option('--boolean', '', { default: undefined, cast: Number })
      .option('--array [...value]', '', { default: undefined, cast: (value) => value.length })
      .action((options) => {
        expectTypeOf(options.required).toEqualTypeOf<number | undefined>();
        expectTypeOf(options.optional).toEqualTypeOf<number | undefined>();
        expectTypeOf(options.plain).toEqualTypeOf<string | undefined>();
        expectTypeOf(options.maybe).toEqualTypeOf<number | undefined>();
        expectTypeOf(options.boolean).toEqualTypeOf<number>();
        expectTypeOf(options.array).toEqualTypeOf<number>();
      });
  });

  it('constrains defaults to syntax even for broad converters', () => {
    const cast = (value: unknown) => value;
    // @ts-expect-error Boolean defaults must be boolean.
    breadc('cli').option('--flag', '', { default: 'false', cast });
    // @ts-expect-error Required option defaults must be raw strings.
    group('tool').option('--port <value>', '', { default: 80, cast });
    // @ts-expect-error Optional value defaults cannot be boolean.
    command('').option('--color [value]', '', { default: false, cast });
    // @ts-expect-error Array defaults must be string arrays.
    option('--include [...value]', '', { default: 'a', cast });
    // @ts-expect-error Defaults cannot be null.
    option('--color [value]', '', { default: null, cast });
    // @ts-expect-error Array elements must be strings.
    option('--include [...value]', '', { default: [1], cast });
    // @ts-expect-error Optional converters must handle bare input, even with a default.
    option('-c, --color [value]', '', { default: '', cast: (raw: string) => raw.length });
  });

  it('requires description outside init and keeps init in the third position', () => {
    expectTypeOf<Extract<'description', keyof OptionInit<'--flag'>>>().toEqualTypeOf<never>();
    const init = { default: '80', cast: Number };
    const configured = option('--port <value>', 'Server port', init);
    expectTypeOf(configured.description).toEqualTypeOf<string | undefined>();
    breadc('cli')
      .option(configured)
      .command('')
      .action((options) => {
        expectTypeOf(options.port).toEqualTypeOf<number>();
      });
    // @ts-expect-error Description belongs in the second argument.
    breadc('cli').option('--port <value>', '', { ...init, description: 'Port' });
    // @ts-expect-error Description belongs in the second argument.
    group('tool').option('--port <value>', '', { ...init, description: 'Port' });
    // @ts-expect-error Description belongs in the second argument.
    command('').option('--port <value>', '', { ...init, description: 'Port' });
    // @ts-expect-error Description belongs in the second argument.
    option('--port <value>', '', { ...init, description: 'Port' });
    // @ts-expect-error Init belongs in the third argument.
    breadc('cli').option('--port <value>', init);
    // @ts-expect-error Init belongs in the third argument.
    group('tool').option('--port <value>', init);
    // @ts-expect-error Init belongs in the third argument.
    command('').option('--port <value>', init);
    // @ts-expect-error Init belongs in the third argument.
    option('--port <value>', init);
  });
});

describe('types/middleware', () => {
  it('infer middleware chain', () => {
    const app = breadc('cli').use((_ctx, next) => next({ data: { count: 1 } }));
    const grp = app.group('group').use((context, next) => next({ data: { ...context.data, group: 'world' } }));
    const cmd = grp.command('').use(async (context, next) => {
      const result = await next({
        data: { ...context.data, command: 'command' }
      });
      return result;
    });

    expectTypeOf<Breadc<{ count: number }, {}>>().toEqualTypeOf<typeof app>();
    expectTypeOf<Group<'group', GroupInit<'group'>, { count: number; group: string }, {}>>().toEqualTypeOf<
      typeof grp
    >();
    expectTypeOf<
      Command<'', CommandInit<''>, { count: number; group: string; command: string }, {}, [], unknown>
    >().toEqualTypeOf<typeof cmd>();
  });
});
