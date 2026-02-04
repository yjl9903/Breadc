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
  argument
} from '../src';

describe('command types', () => {
  it('should infer default command with no arguments', () => {
    const cmd = command('');
    expectTypeOf<(options: { '--': string[] }) => unknown>().toEqualTypeOf<
      Parameters<(typeof cmd)['action']>[0]
    >();
  });

  it('should infer default command with one required argument', () => {
    const cmd = command('<arg>');
    expectTypeOf<
      (arg: string, options: { '--': string[] }) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  });

  it('should infer default command with one optional argument', () => {
    const cmd = command('[arg]');
    expectTypeOf<
      (arg: string | undefined, options: { '--': string[] }) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  });

  it('should infer default command with one spread argument', () => {
    const cmd = command('[...arg]');
    expectTypeOf<
      (arg: string[], options: { '--': string[] }) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  });

  it('should infer default command with one required argument and one optional argument', () => {
    const cmd = command('<arg> [arg]');
    expectTypeOf<
      (
        arg1: string,
        arg2: string | undefined,
        options: { '--': string[] }
      ) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  });

  it('should infer default command with one required argument and spread argument', () => {
    const cmd = command('<arg> [...arg]');
    expectTypeOf<
      (arg1: string, arg2: string[], options: { '--': string[] }) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  });

  it('should infer default command with one required argument and one optional argument and spread argument', () => {
    const cmd = command('<arg> [arg] [...arg]');
    expectTypeOf<
      (
        arg1: string,
        arg2: string | undefined,
        arg3: string[],
        options: { '--': string[] }
      ) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  });

  it('should infer sub-command with arguments', () => {
    const cmd1 = command('dev').action(() => {});
    expectTypeOf<(options: { '--': string[] }) => unknown>().toEqualTypeOf<
      Parameters<(typeof cmd1)['action']>[0]
    >();

    const cmd2 = command('dev <arg> [arg] [...arg]');
    expectTypeOf<
      (
        arg1: string,
        arg2: string | undefined,
        arg3: string[],
        options: { '--': string[] }
      ) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd2)['action']>[0]>();
  });

  it('should infer sub-sub-command with arguments', () => {
    const cmd1 = command('dev run').action(() => {});
    expectTypeOf<(options: { '--': string[] }) => unknown>().toEqualTypeOf<
      Parameters<(typeof cmd1)['action']>[0]
    >();

    const cmd2 = command('dev run <arg> [arg] [...arg]');
    expectTypeOf<
      (
        arg1: string,
        arg2: string | undefined,
        arg3: string[],
        options: { '--': string[] }
      ) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd2)['action']>[0]>();
  });

  it('should infer manual arguments', () => {
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
        options: { '--': string[] }
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
        options: { '--': string[] }
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
        options: { '--': string[] }
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
        options: { '--': string[] }
      ) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd4)['action']>[0]>();
  });

  it('should infer return type', () => {
    const cmd1 = command('').action(() => 1);
    expectTypeOf<Promise<number>>().toEqualTypeOf<ReturnType<typeof cmd1>>();

    const cmd2 = command('').action(() => 'test');
    expectTypeOf<Promise<string>>().toEqualTypeOf<ReturnType<typeof cmd2>>();

    const cmd3 = command('').action(async () => ({}));
    expectTypeOf<Promise<{}>>().toEqualTypeOf<ReturnType<typeof cmd3>>();
  });
});

describe('option types', () => {
  it('should infer boolean option type from command', () => {
    const cmd = command('').option('--flag');
    expectTypeOf<
      (options: { flag: boolean; '--': string[] }) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  });

  it('should infer string option type from command', () => {
    const cmd = command('').option('--flag <arg>');
    expectTypeOf<
      (options: { flag: string | undefined; '--': string[] }) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  });

  it('should infer string boolean option type from command', () => {
    const cmd = command('').option('--flag [arg]');
    expectTypeOf<
      (options: { flag: string | boolean; '--': string[] }) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  });

  it('should infer spread option type from command', () => {
    const cmd = command('').option('--flag [...arg]');
    expectTypeOf<
      (options: { flag: string[]; '--': string[] }) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  });

  it('should infer string option type with transform from command', () => {
    const cmd = command('')
      .option('--flag1 <arg>', '')
      .option('--flag2 <arg>', '', { default: 'default' })
      .option('--flag3 <arg>', '', {
        cast: (t) => (t ? +t : 0)
      })
      .option('--flag4 <arg>', '', {
        default: 0,
        cast: (t) => (t ? +t : 0)
      })
      .option('--flag5 <arg>', '', {
        initial: '0',
        cast: (t) => +t
      })
      .action((options) => options);
    expectTypeOf<
      (options: {
        flag1: string | undefined;
        flag2: string;
        flag3: number;
        flag4: number;
        flag5: number;
        '--': string[];
      }) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  });

  it('should infer boolean option type with transform from command', () => {
    const cmd = command('')
      .option('--flag1 [arg]', '')
      .option('--flag2 [arg]', '', { default: 'test' })
      .option('--flag3 [arg]', '', {
        cast: (t) => +t
      })
      .option('--flag4 [arg]', '', {
        default: 0,
        cast: (t) => +t
      })
      .option('--flag5 [arg]', '', {
        initial: '0',
        cast: (t) => +t
      })
      .action((options) => options);
    expectTypeOf<
      (options: {
        flag1: boolean | string;
        flag2: string;
        flag3: number;
        flag4: number;
        flag5: number;
        '--': string[];
      }) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  });

  it('should infer spread option type with transform from command', () => {
    const cmd = command('')
      .option('--flag1 [...arg]', '')
      .option('--flag2 [...arg]', '', { default: ['default'] })
      .option('--flag3 [...arg]', '', {
        cast: (t) => t.join(',')
      })
      .option('--flag4 [...arg]', '', {
        default: '',
        cast: (t) => t.join(',')
      })
      .option('--flag5 [...arg]', '', {
        initial: ['default'],
        cast: (t) => t.join(',')
      });
    expectTypeOf<
      (options: {
        flag1: string[];
        flag2: string[];
        flag3: string;
        flag4: string;
        flag5: string;
        '--': string[];
      }) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  });

  // it('should infer boolean option type from group', () => {
  //   const grp = group('group').option('--flag');
  //   const cmd = grp.command('');
  //   expectTypeOf<
  //     (options: { flag: boolean; '--': string[] }) => unknown
  //   >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  // });

  // it('should infer string option type from group', () => {
  //   const grp = group('group').option('--flag <arg>');
  //   const cmd = grp.command('');
  //   expectTypeOf<
  //     (options: { flag: string | undefined; '--': string[] }) => unknown
  //   >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  // });

  // it('should infer string option type with default from group', () => {
  //   // const grp = group('group').option('--flag <arg>', { default: 'default' });
  //   // const cmd = grp.command('');
  //   // expectTypeOf<
  //   //   (options: { flag: string; '--': string[] }) => unknown
  //   // >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  // });

  // it('should infer boolean option type from breadc', () => {
  //   const grp = group('group').option('--flag');
  //   const cmd = grp.command('');
  //   expectTypeOf<
  //     (options: { flag: boolean; '--': string[] }) => unknown
  //   >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  // });

  // it('should infer string option type from breadc', () => {
  //   const grp = group('group').option('--flag <arg>');
  //   const cmd = grp.command('');
  //   expectTypeOf<
  //     (options: { flag: string | undefined; '--': string[] }) => unknown
  //   >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  // });

  // it('should infer string option type with default from breadc', () => {
  //   // const grp = group('group').option('--flag <arg>', { default: 'default' });
  //   // const cmd = grp.command('');
  //   // expectTypeOf<
  //   //   (options: { flag: string; '--': string[] }) => unknown
  //   // >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  // });

  // it('should infer options inherited from breadc and group and command', () => {});

  it('should infer camel case option type', () => {
    const cmd = breadc('cli')
      .option('--flag-breadc-top')
      .group('group')
      .option('--flag-group-medium')
      .command('')
      .option('--flag-command-bottom');
    expectTypeOf<
      (options: {
        flagBreadcTop: boolean;
        flagGroupMedium: boolean;
        flagCommandBottom: boolean;
        '--': string[];
      }) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  });
});

describe('middleware types', () => {
  it('should infer middleware chain', () => {
    const app = breadc('cli').use((_ctx, next) => next({ data: { count: 1 } }));
    const grp = app
      .group('group')
      .use((context, next) =>
        next({ data: { ...context.data, group: 'world' } })
      );
    const cmd = grp.command('').use(async (context, next) => {
      const result = await next({
        data: { ...context.data, command: 'command' }
      });
      return result;
    });

    expectTypeOf<Breadc<{ count: number }, {}>>().toEqualTypeOf<typeof app>();
    expectTypeOf<
      Group<'group', GroupInit<'group'>, { count: number; group: string }, {}>
    >().toEqualTypeOf<typeof grp>();
    expectTypeOf<
      Command<
        '',
        CommandInit<''>,
        { count: number; group: string; command: string },
        {},
        [],
        unknown
      >
    >().toEqualTypeOf<typeof cmd>();
  });
});
