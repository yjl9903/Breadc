import { z } from 'zod';
import { vi, describe, it, expect, afterEach } from 'vitest';

import { breadc, option, type InternalBreadc } from '../src/breadc/index.ts';
import { parse, run } from '../src/index.ts';
import { context as makeContext, reset } from '../src/runtime/context.ts';
import { ErrorCode } from '../src/error.ts';

describe('runtime/run', () => {
  it('keeps public parsing separate from execution without scanning twice', async () => {
    const cast = vi.fn(Number);
    const unknown = vi.fn((_context, name, value) => ({ name, value }));
    const action = vi.fn((_options, context) => context.options.get('port')?.value());
    const app = breadc('cli').option('--port <value>', '', { cast }).allowUnknownOption(unknown);
    app.command('run').action(action);
    const context = parse(app, ['run', '--port=42', '--extra']);
    expect(context.options.get('port')?.raw).toBe('42');
    expect(cast).not.toHaveBeenCalled();
    expect(action).not.toHaveBeenCalled();
    await expect(run(context)).resolves.toBe(42);
    expect(cast).toHaveBeenCalledExactlyOnceWith('42');
    expect(unknown).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('passes arguments to action and returns result', async () => {
    const app = breadc('cli');
    app.command('echo <first> [second]').action((first, second, options) => [first, second, options]);

    await expect(app.run(['echo', 'hello'])).resolves.toMatchInlineSnapshot(`
      [
        "hello",
        undefined,
        {
          "--": [],
        },
      ]
    `);
  });

  it('rejects unknown options without invoking the action', async () => {
    const app = breadc('cli');
    const action = vi.fn();
    app.command('echo <message>').action(action);

    await expect(app.run(['echo', '--typo', 'x'])).rejects.toThrow(`Unknown option: --typo`);
    expect(action).not.toHaveBeenCalled();
  });

  it.each(['--all=abc', '--all=', '--no-all=abc', '-a=abc'])('rejects %s without invoking the action', async (flag) => {
    const app = breadc('cli');
    const action = vi.fn();
    app.command('echo').option('-a, --[no-]all').action(action);

    await expect(app.run(['echo', flag])).rejects.toThrowErrorMatchingInlineSnapshot(
      `[InputError: Invalid boolean option value: --all]`
    );
    expect(action).not.toHaveBeenCalled();
  });

  it('rejects excess positional arguments without invoking the action', async () => {
    const app = breadc('cli');
    const action = vi.fn();
    app.command('echo <file>').action(action);

    await expect(app.run(['echo', 'a', 'b'])).rejects.toThrow('Detect unexpected redundant arguments');
    expect(action).not.toHaveBeenCalled();
  });

  it('invokes next when middleware does not call it', async () => {
    const app = breadc('cli');
    const calls: string[] = [];

    app.use(async (ctx, _next) => {
      calls.push('middleware');
      return ctx;
    });

    app.command('ping').action(() => {
      calls.push('action');
      return 'pong';
    });

    await expect(app.run(['ping'])).resolves.toMatchInlineSnapshot(`"pong"`);
    expect(calls).toMatchInlineSnapshot(`
      [
        "middleware",
        "action",
      ]
    `);
  });

  it('uses unknown command middleware', async () => {
    const app = breadc('cli');
    app.onUnknownCommand(() => 'handled');

    await expect(app.run(['unknown'])).resolves.toMatchInlineSnapshot(`"handled"`);
  });

  it('runs middlewares in app → group → command order', async () => {
    const app = breadc('cli');
    const order: string[] = [];

    app.use(async (_ctx, next) => {
      order.push('app:before');
      const result = await next();
      order.push('app:after');
      return result;
    });

    const grp = app.group('tool').use(async (_ctx, next) => {
      order.push('group:before');
      const result = await next();
      order.push('group:after');
      return result;
    });

    grp
      .command('run')
      .use(async (_ctx, next) => {
        order.push('command:before');
        const result = await next();
        order.push('command:after');
        return result;
      })
      .action(() => {
        order.push('action');
        return 'ok';
      });

    await app.run(['tool', 'run']);

    expect(order).toMatchInlineSnapshot(`
      [
        "app:before",
        "group:before",
        "command:before",
        "action",
        "command:after",
        "group:after",
        "app:after",
      ]
    `);
  });

  it('merges middleware data and allows override', async () => {
    const app = breadc('cli');
    const seen: Array<Record<string, unknown>> = [];

    app.use(async (ctx, next) => {
      const result = await next({ data: { count: 1 } });
      seen.push({ ...ctx.data });
      return result;
    });

    const grp = app.group('tool').use(async (ctx, next) => {
      const result = await next({ data: { count: 2, group: true } });
      seen.push({ ...ctx.data });
      return result;
    });

    grp
      .command('run')
      .use(async (ctx, next) => {
        const result = await next({ data: { count: 3, command: true } });
        seen.push({ ...ctx.data });
        return result;
      })
      .action(() => 'ok');

    await app.run(['tool', 'run']);

    expect(seen).toMatchInlineSnapshot(`
      [
        {
          "command": true,
          "count": 3,
          "group": true,
        },
        {
          "command": true,
          "count": 3,
          "group": true,
        },
        {
          "command": true,
          "count": 3,
          "group": true,
        },
      ]
    `);
  });

  it.each([new Error('user failure'), { custom: 'failure' }, 'failure'])(
    'propagates cast, middleware and action exceptions by identity: %j',
    async (failure) => {
      const fail = () => {
        throw failure;
      };
      const optionApp = breadc('cli')
        .option('--value <value>', '', { cast: fail })
        .onUnknownCommand(() => {});
      await expect(optionApp.run(['--value=x'])).rejects.toBe(failure);
      const argumentApp = breadc('cli');
      argumentApp
        .command('run')
        .argument('<file>', { cast: fail })
        .action(() => {});
      await expect(argumentApp.run(['run', 'x'])).rejects.toBe(failure);
      await expect(breadc('cli').allowUnknownOption(fail).run(['--typo'])).rejects.toBe(failure);
      await expect(breadc('cli').onUnknownCommand(fail).run(['unknown'])).rejects.toBe(failure);
      const middlewareApp = breadc('cli').use(fail);
      middlewareApp.command('run').action(() => {});
      await expect(middlewareApp.run(['run'])).rejects.toBe(failure);
      const actionApp = breadc('cli');
      actionApp.command('run').action(fail);
      await expect(actionApp.run(['run'])).rejects.toBe(failure);
      actionApp.use(async (_, next) => next());
      await expect(actionApp.run(['run'])).rejects.toBe(failure);
    }
  );

  it('throws when no action is bound', async () => {
    const app = breadc('cli');
    const command = app.command('noop');

    await expect(app.run(['noop'])).rejects.toThrow(
      expect.objectContaining({ code: ErrorCode.MISSING_COMMAND_ACTION })
    );
    await expect(app.run(['noop'])).rejects.toMatchObject({
      name: 'DefinitionError',
      code: ErrorCode.MISSING_COMMAND_ACTION,
      details: { command }
    });
  });

  it('forwards options["--"] to action', async () => {
    const app = breadc('cli');
    app.command('echo').action((options) => options['--']);

    await expect(app.run(['echo', '--', 'a', 'b'])).resolves.toMatchInlineSnapshot(
      `
      [
        "a",
        "b",
      ]
    `
    );
  });
});

describe('runtime/run: conversion boundaries', () => {
  describe.each([
    { name: 'port', value: undefined, argv: [], code: ErrorCode.MISSING_OPTION_VALUE },
    { name: 'all', value: 'invalid', argv: [], code: ErrorCode.INVALID_BOOLEAN_OPTION_VALUE },
    { name: 'port', value: '2', argv: ['--port=1'], code: ErrorCode.DUPLICATE_OPTION }
  ])('middleware input errors: $code', ({ name, value, argv, code }) => {
    it.each([false, true])(
      'reports middleware syntax errors before the action (explicit next=%s)',
      async (explicitNext) => {
        const afterAccept = vi.fn();
        const downstream = vi.fn(async (context) => context);
        const action = vi.fn();
        const app = breadc('cli').option('--port <port>').option('--all');
        app.use(async (context, next) => {
          context.options.get(name)!.accept(context, name, value);
          afterAccept();
          return explicitNext ? next() : context;
        });
        app.use(downstream);
        app.command('run').action(action);

        await expect(app.run(['run', ...argv])).rejects.toMatchObject({
          name: 'InputError',
          code: ErrorCode.INVALID_INPUT,
          issues: [expect.objectContaining({ code, name })],
          context: expect.objectContaining({ command: expect.anything() })
        });
        expect(afterAccept).toHaveBeenCalledTimes(1);
        expect(downstream).toHaveBeenCalledTimes(1);
        expect(action).not.toHaveBeenCalled();
      }
    );

    it('reports syntax errors after the unknown-command handler chain', async () => {
      const afterAccept = vi.fn();
      const downstream = vi.fn();
      const app = breadc('cli').option('--port <port>').option('--all');
      app.onUnknownCommand((context) => {
        context.options.get(name)!.accept(context, name, value);
        afterAccept();
      });
      app.onUnknownCommand(downstream);

      await expect(app.run(['unknown', ...argv])).rejects.toMatchObject({
        name: 'InputError',
        issues: [expect.objectContaining({ code, name })]
      });
      expect(afterAccept).toHaveBeenCalledTimes(1);
      expect(downstream).toHaveBeenCalledTimes(1);
    });
  });

  it.each(['argument', 'option'])('propagates %s conversion failures at the action boundary', async (kind) => {
    const failure = new Error('invalid input');
    const cast = vi.fn(() => {
      throw failure;
    });
    const action = vi.fn();
    const afterAccept = vi.fn();
    const app = breadc('cli');
    app
      .command('run')
      .argument('[count]', { cast })
      .option('--port <port>', '', { cast })
      .use(async (context) => {
        if (kind === 'argument') {
          context.arguments[0].accept(context, 'invalid');
        } else {
          context.options.get('port')!.accept(context, 'port', 'invalid');
        }
        afterAccept();
        return context;
      })
      .action(action);

    await expect(app.run(['run'])).rejects.toBe(failure);
    expect(cast).toHaveBeenCalledExactlyOnceWith('invalid');
    expect(afterAccept).toHaveBeenCalledTimes(1);
    expect(action).not.toHaveBeenCalled();
  });

  it('converts input supplied by action middleware at the action boundary', async () => {
    const optionCast = vi.fn(Number);
    const argumentCast = vi.fn(Number);
    const app = breadc('cli');
    app
      .command('run')
      .argument('[count]', { cast: argumentCast })
      .option('--port <port>', '', { cast: optionCast })
      .use(async (context) => {
        context.arguments[0].accept(context, '2');
        const port = context.options.get('port')!;
        port.accept(context, 'port', '8080');
        expect(port.raw).toBe('8080');
        expect(optionCast).not.toHaveBeenCalled();
        expect(argumentCast).not.toHaveBeenCalled();
        return context;
      })
      .action((count, options) => [count, options.port]);

    await expect(app.run(['run'])).resolves.toEqual([2, 8080]);
    expect(argumentCast).toHaveBeenCalledExactlyOnceWith('2');
    expect(optionCast).toHaveBeenCalledExactlyOnceWith('8080');
  });

  it('converts once after all unknown-command handlers', async () => {
    const cast = vi.fn(Number);
    const app = breadc('cli').option('--count <value>', '', { default: '2', cast });
    const seen: unknown[] = [];
    app.onUnknownCommand((context) => {
      seen.push(context.options.get('count')!.raw);
      expect(cast).not.toHaveBeenCalled();
      expect(context.arguments[0].value()).toBe('unknown');
    });
    app.onUnknownCommand((context) => {
      seen.push(context.options.get('count')!.raw);
      expect(cast).not.toHaveBeenCalled();
      return 'handled';
    });
    await expect(app.run(['unknown'])).resolves.toBe('handled');
    expect(seen).toEqual(['2', '2']);
    expect(cast).toHaveBeenCalledExactlyOnceWith('2');
  });

  it('checks action presence before any conversion or execution', async () => {
    const cast = vi.fn(() => {
      throw new Error('must not convert');
    });
    const middleware = vi.fn();
    const unknown = vi.fn();
    const app = breadc('cli')
      .option('--count <value>', '', { default: '2', cast })
      .use(middleware)
      .onUnknownCommand(unknown);
    app.command('run').argument('<file>', { cast });
    await expect(app.run(['run', 'file'])).rejects.toMatchObject({
      name: 'DefinitionError',
      code: ErrorCode.MISSING_COMMAND_ACTION
    });
    expect(cast).not.toHaveBeenCalled();
    expect(middleware).not.toHaveBeenCalled();
    expect(unknown).not.toHaveBeenCalled();
  });

  it('propagates conversion failure after middleware and skips the action', async () => {
    const failure = { cast: 'failed' };
    const cast = vi.fn(() => {
      throw failure;
    });
    const unknown = vi.fn();
    const middleware = vi.fn();
    const action = vi.fn();
    const app = breadc('cli')
      .option('--count <value>', '', { default: '2', cast })
      .onUnknownCommand(unknown)
      .use(middleware);
    app.command('run').action(action);
    await expect(app.run(['unknown'])).rejects.toBe(failure);
    await expect(app.run(['run'])).rejects.toBe(failure);
    expect(unknown).toHaveBeenCalledTimes(1);
    expect(middleware).toHaveBeenCalledTimes(1);
    expect(action).not.toHaveBeenCalled();
  });
});

describe('deferred middleware validation', () => {
  it.each([false, true])('validates only the final spread arrays (explicit next=%s)', async (explicitNext) => {
    const cast = z
      .array(z.string())
      .length(2)
      .transform((items) => items.join(','));
    const validate = vi.spyOn(cast['~standard'], 'validate');
    const app = breadc('cli').option('--items <...item>', '', { default: ['invalid default'], cast });
    app
      .command('run')
      .argument('[...items]', { default: ['invalid default'], cast })
      .use(async (context, next) => {
        context.options.get('items')!.accept(context, 'items', 'a');
        context.arguments[0].accept(context, 'a');
        expect(validate).not.toHaveBeenCalled();
        return explicitNext ? next() : context;
      })
      .use(async (context, next) => {
        context.options.get('items')!.accept(context, 'items', 'b');
        context.arguments[0].accept(context, 'b');
        expect(validate).not.toHaveBeenCalled();
        return explicitNext ? next() : context;
      })
      .action((items, options) => [items, options.items]);
    await expect(app.run(['run'])).resolves.toEqual(['a,b', 'a,b']);
    expect(validate).toHaveBeenCalledTimes(2);
    expect(validate.mock.calls.map(([items]) => items)).toEqual([
      ['a', 'b'],
      ['a', 'b']
    ]);
  });

  it.each([false, true])(
    'aggregates final schema issues before the action (explicit next=%s)',
    async (explicitNext) => {
      const cast = z.coerce.number();
      const action = vi.fn();
      const downstream = vi.fn(async (context) => context);
      const app = breadc('cli').option('--port <value>', '', { cast });
      app
        .command('run')
        .argument('[count]', { cast })
        .use(async (context, next) => {
          context.options.get('port')!.accept(context, 'port', 'invalid');
          context.arguments[0].accept(context, 'invalid');
          return explicitNext ? next() : context;
        })
        .use(downstream)
        .action(action);
      await expect(app.run(['run'])).rejects.toMatchObject({
        name: 'InputError',
        context: expect.anything(),
        issues: [
          { code: ErrorCode.INVALID_OPTION_VALUE, value: 'invalid' },
          { code: ErrorCode.INVALID_ARGUMENT_VALUE, value: 'invalid' }
        ]
      });
      expect(downstream).toHaveBeenCalledTimes(1);
      expect(action).not.toHaveBeenCalled();
    }
  );

  it('rejects schema failures after the unknown-command chain instead of returning success', async () => {
    const cast = z.array(z.string()).length(3);
    const validate = vi.spyOn(cast['~standard'], 'validate');
    const app = breadc('cli').option('--items <...item>', '', { cast });
    const seen: string[] = [];
    for (const value of ['a', 'b']) {
      app.onUnknownCommand((context) => {
        context.options.get('items')!.accept(context, 'items', value);
        expect(validate).not.toHaveBeenCalled();
        seen.push(value);
        return 'success';
      });
    }
    await expect(app.run(['unknown'])).rejects.toMatchObject({
      name: 'InputError',
      issues: [{ code: ErrorCode.INVALID_OPTION_VALUE, value: ['a', 'b'] }]
    });
    expect(seen).toEqual(['a', 'b']);
    expect(validate).toHaveBeenCalledExactlyOnceWith(['a', 'b']);
  });

  it('checks middleware syntax diagnostics before running any converters', async () => {
    const cast = vi.fn(Number);
    const app = breadc('cli').option('--port <value>', '', { default: '1', cast });
    app
      .command('run')
      .use(async (context) => {
        context.options.get('port')!.accept(context, 'port', undefined);
        return context;
      })
      .action(() => {});
    await expect(app.run(['run'])).rejects.toMatchObject({
      issues: [{ code: ErrorCode.MISSING_OPTION_VALUE }]
    });
    expect(cast).not.toHaveBeenCalled();
  });
});

describe('runtime/run: array options', () => {
  it('exposes raw arrays to middleware and converts once before the action', async () => {
    const cast = vi.fn((values: string[]) => values.join(','));
    const app = breadc('cli').option('-i, --include <...value>', '', { cast });
    const seen: unknown[] = [];
    app.use((context, next) => {
      seen.push(context.options.get('include')?.value());
      expect(cast).not.toHaveBeenCalled();
      return next();
    });
    app.command('build <target>').action((target, options) => [target, options]);
    await expect(app.run(['build', 'target', '-i', 'a', 'b', '--include=c', '--', 'x', '--foo'])).resolves.toEqual([
      'target',
      { include: 'a,b,c', '--': ['x', '--foo'] }
    ]);
    expect(seen).toEqual([['a', 'b', 'c']]);
    expect(cast).toHaveBeenCalledExactlyOnceWith(['a', 'b', 'c']);
  });
});

describe('runtime/run: required spread arguments', () => {
  it('passes a converted array to the action', async () => {
    const app = breadc('cli');
    const cast = vi.fn((files: string[]) => new Set(files));
    app
      .command('upload')
      .argument('<...files>', { cast })
      .action((files, options) => [files, options['--']]);
    await expect(app.run(['upload', 'a', 'b', '--', 'c'])).resolves.toEqual([new Set(['a', 'b']), ['c']]);
    expect(cast).toHaveBeenCalledExactlyOnceWith(['a', 'b']);
  });
});

describe('runtime/run: option actions', () => {
  // Business casts must never be reached by an unrelated option action.
  function businessCast() {
    return vi.fn(() => {
      throw new Error('unrelated business cast');
    });
  }

  afterEach(() => vi.restoreAllMocks());

  it('converts only the selected value, awaits the handler, and preserves command context', async () => {
    const unrelated = businessCast();
    const selectedCast = vi.fn((value: string) => Number(value));
    const handler = vi.fn(async (value, context) => {
      expect(context.command?.spec).toBe('upload');
      expect(context.pieces).toEqual(['tool', 'upload']);
      expect(context.group?.spec).toBe('tool');
      expect(context.arguments).toEqual([]);
      expect(context.remaining).toEqual(['--inspect=9']);
      expect(context.data).toEqual({});
      return value + 1;
    });
    const inspect = option('-i, --inspect <value>', '', { cast: selectedCast }).action(handler);
    const app = breadc('cli').option(inspect).option('--business', '', { cast: unrelated });
    const middleware = vi.fn(async (_context, next) => next({ data: { injected: true } }));
    const action = vi.fn();
    const unknown = vi.fn();
    app.use(middleware).onUnknownCommand(unknown);
    app
      .group('tool')
      .use(middleware)
      .command('upload')
      .argument('<...files>', { cast: unrelated })
      .use(middleware)
      .action(action);

    await expect(app.run(['tool', 'upload', '--business', '--inspect=4', '--', '--inspect=9'])).resolves.toBe(5);
    expect(selectedCast).toHaveBeenCalledExactlyOnceWith('4');
    expect(handler).toHaveBeenCalledTimes(1);
    for (const fn of [unrelated, middleware, action, unknown]) expect(fn).not.toHaveBeenCalled();
  });

  it.each([[], ['--inspect=false'], ['--', '--inspect']].map((argv) => ({ argv })))(
    'does not trigger on absent, false or escaped input: $argv',
    async ({ argv }) => {
      const handler = vi.fn();
      const command = vi.fn(() => 'command');
      const app = breadc('cli').option(option('--inspect', '', { default: true }).action(handler));
      app.command('').action(command);
      await expect(app.run(argv)).resolves.toBe('command');
      expect(handler).not.toHaveBeenCalled();
    }
  );

  it('does not trigger a defaulted value action', async () => {
    const handler = vi.fn();
    const app = breadc('cli').option(option('--inspect <value>', '', { default: 'seed' }).action(handler));
    app.command('').action(() => 'command');
    await expect(app.run([])).resolves.toBe('command');
    expect(handler).not.toHaveBeenCalled();
  });

  it.each([
    { spec: '--inspect [value]', argv: ['--inspect'], expected: undefined },
    { spec: '--inspect <value>', argv: ['--inspect='], expected: '' },
    { spec: '--inspect <value>', argv: ['--inspect=0'], expected: '0' }
  ])('uses explicit presence for value options: $spec $argv', async ({ spec, argv, expected }) => {
    const handler = vi.fn((value) => value);
    const app = breadc('cli').option(option(spec).action(handler));
    app.command('<required>');
    await expect(app.run(argv)).resolves.toBe(expected);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['--inspect', true],
    ['--no-inspect', false],
    ['--no-inspect=false', true],
    ['-i=false', false]
  ] as const)('uses raw positive boolean value for %s', async (flag, triggered) => {
    const cast = vi.fn((value: boolean) => !value);
    const handler = vi.fn((value) => value);
    const app = breadc('cli').option(option('-i, --[no-]inspect', '', { cast }).action(handler));
    app.command('').action(() => 'command');
    await expect(app.run([flag])).resolves.toBe(triggered ? false : 'command');
    expect(handler).toHaveBeenCalledTimes(triggered ? 1 : 0);
  });

  it('does not trigger the implicit true of a negative-only declaration', async () => {
    const handler = vi.fn(() => 'option');
    const app = breadc('cli').option(option('-i, --no-inspect').action(handler));
    app.command('').action(() => 'command');
    await expect(app.run([])).resolves.toBe('command');
    await expect(app.run(['-i'])).resolves.toBe('command');
    await expect(app.run(['-i=false'])).resolves.toBe('option');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('chooses highest priority, then registration order independently of argv order', async () => {
    const first = vi.fn(() => 'first');
    const second = vi.fn(() => 'second');
    const last = vi.fn(() => 'last');
    const app = breadc('cli')
      .option(option('-a, --first').action(first))
      .option(option('-b, --second').action(second))
      .option(option('-c, --last').action(last, { priority: 5 }));
    await expect(app.run(['-ba'])).resolves.toBe('first');
    await expect(app.run(['-abc'])).resolves.toBe('last');
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
    expect(last).toHaveBeenCalledTimes(1);
  });

  it('uses final scoped instances and their registration positions', async () => {
    const root = vi.fn();
    const group = vi.fn();
    const child = vi.fn(() => 'child');
    const earlier = vi.fn(() => 'earlier');
    const app = breadc('cli').option(option('-r, --inspect').action(root, { priority: 100 }));
    const tool = app.group('tool').option(option('-g, --inspect').action(group, { priority: 50 }));
    tool
      .command('run')
      .option(option('-e, --earlier').action(earlier))
      .option(option('-c, --inspect').action(child))
      .action(() => 'command');
    await expect(app.run(['-r', 'tool', '-g', 'run'])).resolves.toBe('command');
    await expect(app.run(['tool', 'run', '-c'])).resolves.toBe('child');
    await expect(app.run(['tool', 'run', '-ce'])).resolves.toBe('earlier');
    await expect(app.run(['tool', 'run', '-g'])).rejects.toThrow('Unknown option: -g');
    expect(root).not.toHaveBeenCalled();
    expect(group).not.toHaveBeenCalled();
  });

  it('retains explicit input when the identical option instance is reused in nested scopes', async () => {
    const handler = vi.fn(() => 'shared');
    const shared = option('--inspect').action(handler);
    const app = breadc('cli').option(shared);
    app.group('tool').option(shared).command('run <required>').option(shared);
    await expect(app.run(['--inspect', 'tool', 'run'])).resolves.toBe('shared');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('skips converters on losing actions, including invalid defaults', async () => {
    const cast = businessCast();
    const handler = vi.fn();
    const app = breadc('cli')
      .option(option('--loser <value>', '', { cast }).action(handler))
      .option(option('--default <value>', '', { default: 'invalid', cast }).action(handler))
      .option(option('--winner').action(() => 'winner', { priority: 1 }));
    await expect(app.run(['--loser=value', '--winner'])).resolves.toBe('winner');
    expect(cast).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });

  it('passes falsy converter outputs through to the action', async () => {
    for (const converted of [false, 0, '', null, undefined]) {
      const handler = vi.fn((value) => value);
      const app = breadc('cli').option(option('--inspect <value>', '', { cast: () => converted }).action(handler));
      await expect(app.run(['--inspect=value'])).resolves.toBe(converted);
      expect(handler).toHaveBeenCalledTimes(1);
    }
  });

  it('allows an ordinary scoped option to shadow an action', async () => {
    const handler = vi.fn();
    const app = breadc('cli').option(option('--inspect').action(handler));
    app
      .command('run')
      .option('--inspect')
      .action((options) => options.inspect);
    await expect(app.run(['run', '--inspect'])).resolves.toBe(true);
    expect(handler).not.toHaveBeenCalled();
  });

  it.each(['root', 'group'])(
    'reselects after %s default-command fallback and discards provisional diagnostics',
    async (scope) => {
      const handler = vi.fn((_value, _context) => 'selected');
      const app = breadc('cli').option('--inspect');
      const owner = scope === 'group' ? app.group('tool') : app;
      owner.command('other').action(() => {});
      const command = owner.command('<required>').option(option('--inspect <value>').action(handler));
      const prefix = scope === 'group' ? ['tool'] : [];
      await expect(app.run([...prefix, '--inspect=value'])).resolves.toBe('selected');
      expect(handler.mock.calls[0]?.[1].command).toBe(command);
      await expect(app.run([...prefix, '--inspect=value', '--typo'])).rejects.toMatchObject({
        issues: [expect.objectContaining({ code: ErrorCode.UNKNOWN_OPTION })]
      });
      expect(handler).toHaveBeenCalledTimes(1);
    }
  );

  it('selects before default-command fallback if a root action already matches', async () => {
    const handler = vi.fn((_value, context) => context.command);
    const app = breadc('cli').option(option('--inspect').action(handler));
    app.command('other');
    app.command('<required>').option('--inspect <value>');
    await expect(app.run(['--inspect'])).resolves.toBeUndefined();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('aggregates the whole scan before conversion or execution, skipping positional requirements', async () => {
    const cast = vi.fn((value: boolean) => value);
    const handler = vi.fn();
    const output = vi.spyOn(console, 'log').mockImplementation(() => {});
    const app = breadc('cli')
      .option(option('--inspect', '', { cast }).action(handler))
      .option('--include <...value>')
      .option('--flag');
    app.command('run <required>');
    await expect(
      app.run(['--inspect', 'run', '--unknown', '--include', '--flag=bad', '--flag', '--inspect'])
    ).rejects.toMatchObject({
      issues: [
        expect.objectContaining({ code: ErrorCode.UNKNOWN_OPTION }),
        expect.objectContaining({ code: ErrorCode.MISSING_OPTION_VALUE }),
        expect.objectContaining({ code: ErrorCode.INVALID_BOOLEAN_OPTION_VALUE }),
        expect.objectContaining({ code: ErrorCode.DUPLICATE_OPTION }),
        expect.objectContaining({ code: ErrorCode.DUPLICATE_OPTION })
      ]
    });
    for (const fn of [cast, handler, output]) expect(fn).not.toHaveBeenCalled();
  });

  it('retains schema conversion diagnostics for only the selected option', async () => {
    const handler = vi.fn();
    const unrelated = businessCast();
    const app = breadc('cli')
      .option('--business', '', { cast: unrelated })
      .option(option('--inspect <value>', '', { cast: z.coerce.number().int().positive() }).action(handler));
    await expect(app.run(['--inspect=bad'])).rejects.toMatchObject({
      context: expect.objectContaining({ actionOption: expect.anything() }),
      issues: [expect.objectContaining({ code: ErrorCode.INVALID_OPTION_VALUE, value: 'bad' })]
    });
    expect(handler).not.toHaveBeenCalled();
    expect(unrelated).not.toHaveBeenCalled();
  });

  it('propagates function conversion and async handler failures without executing commands', async () => {
    const failure = new Error('conversion failed');
    const handler = vi.fn();
    const app = breadc('cli').option(
      option('--inspect', '', {
        cast: () => {
          throw failure;
        }
      }).action(handler)
    );
    await expect(app.run(['--inspect'])).rejects.toBe(failure);
    expect(handler).not.toHaveBeenCalled();
    const failing = breadc('cli').option(
      option('--inspect').action(async () => {
        throw failure;
      })
    );
    await expect(failing.run(['--inspect'])).rejects.toBe(failure);
  });

  it('does not leak selected actions or converted arrays across repeated runs', async () => {
    const defaults = ['seed'];
    const cast = vi.fn((values: string[]) => {
      values.push('converted');
      return values;
    });
    const handler = vi.fn((values) => values);
    const app = breadc('cli').option(
      option('-i, --inspect <...value>', '', { default: defaults, cast }).action(handler)
    );
    app.command('').action(() => 'command');
    await expect(app.run(['-i', 'one', 'two', '-i=three'])).resolves.toEqual(['one', 'two', 'three', 'converted']);
    await expect(app.run([])).resolves.toBe('command');
    await expect(app.run(['-i=four'])).resolves.toEqual(['four', 'converted']);
    expect(defaults).toEqual(['seed']);
    expect(cast).toHaveBeenCalledTimes(3);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('keeps raw parsing separate from app.parse conversion without executing handlers', () => {
    const cast = vi.fn(Number);
    const handler = vi.fn();
    const output = vi.spyOn(console, 'log').mockImplementation(() => {});
    const app = breadc('cli')
      .option('--business <value>', '', { default: '12', cast })
      .option(option('--inspect <value>', '', { cast }).action(handler));
    app.command('run <required>');
    const context = parse(app, ['run', '--inspect=4']);
    expect(context.actionOption?.raw).toBe('4');
    expect(cast).not.toHaveBeenCalled();
    const result = app.parse(['run', '--inspect=4']);
    expect(result.options).toEqual({ business: 12, inspect: 4 });
    expect(result.args).toEqual([]);
    expect(cast.mock.calls).toEqual([['12'], ['4']]);
    for (const fn of [handler, output]) expect(fn).not.toHaveBeenCalled();
    expect(reset(context).actionOption).toBeUndefined();
    expect(makeContext(app, []).actionOption).toBeUndefined();
  });

  it('has no runtime output policy when assembly provides no fallback', async () => {
    const app = breadc('cli') as InternalBreadc;
    const output = vi.spyOn(console, 'log').mockImplementation(() => {});
    await expect(app.run([])).resolves.toBeUndefined();
    expect(output).not.toHaveBeenCalled();
  });

  it('restores the declared option identity after an unknown short spelling uses its key', async () => {
    const action = vi.fn(() => 'declared');
    const inspect = option('--inspect').action(action);
    const app = breadc('cli').option(inspect).allowUnknownOption();
    await expect(app.run(['-inspect', '--inspect'])).resolves.toBe('declared');
    expect(action).toHaveBeenCalledTimes(1);
    expect(action.mock.calls[0]?.length).toBe(2);
  });
});
