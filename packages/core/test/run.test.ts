import { vi, describe, it, expect, beforeAll } from 'vitest';

import { options as colorOptions } from '@breadc/color';

import { breadc } from '../src/breadc/index.ts';
import { ErrorCode } from '../src/error.ts';

beforeAll(() => {
  colorOptions.enabled = false;
});

describe('runtime/run', () => {
  it('expands paired boolean forms in help output', async () => {
    const app = breadc('cli')
      .option('-a, --[no-]all', 'Include everything')
      .option('--[no-]cache', 'Use cache')
      .option('--no-open', 'Do not open');
    const output = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await app.run(['--help']);
      const text = output.mock.calls.map((args) => args.join(' ')).join('\n');
      expect(text).toContain('-a, --all, --no-all');
      expect(text).toContain('--cache, --no-cache');
      expect(text).toContain('--no-open');
      expect(text).not.toContain('[no-]');
    } finally {
      output.mockRestore();
    }
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

  it('rejects disabled builtin options', async () => {
    const app = breadc('cli', { builtin: { version: false, help: false } });

    await expect(app.run(['-v'])).rejects.toThrow(`Unknown option: -v`);
    await expect(app.run(['-h'])).rejects.toThrow(`Unknown option: -h`);
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

  it.each([[], ['--all'], ['--help'], ['-2foo']])(
    'rejects missing required option values before %j without invoking the action',
    async (...tail) => {
      const app = breadc('cli');
      const action = vi.fn();
      app.command('echo').option('--output <value>').option('--all').action(action);

      await expect(app.run(['echo', '--output', ...tail])).rejects.toThrow(`Missing required option value: --output`);
      expect(action).not.toHaveBeenCalled();
    }
  );

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

  it('prioritizes builtin help/version over matched command action', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const app = breadc('cli');
    const action = vi.fn(() => 'pong');
    app.command('ping').action(action);

    await expect(app.run(['ping', '--help'])).resolves.toContain('Usage: cli ping [OPTIONS]');
    await expect(app.run(['ping', '--version'])).resolves.toMatchInlineSnapshot(`"cli/unknown"`);
    expect(action).not.toHaveBeenCalled();
  });

  it('prints builtin help before resolving required command args', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const app = breadc('cli');
    app.command('sub-command <param>');

    await expect(app.run(['sub-command', '-h'])).resolves.toContain('Usage: cli sub-command <param> [OPTIONS]');
  });

  it('does not treat command-scoped help/version options as builtin flags', async () => {
    const app = breadc('cli');
    const action = vi.fn((options: { help: boolean; version: boolean }) =>
      options.help ? 'command-help' : 'command-version'
    );

    app.command('ping').option('--help').option('--version').action(action);

    await expect(app.run(['ping', '--help'])).resolves.toMatchInlineSnapshot(`"command-help"`);
    await expect(app.run(['ping', '--version'])).resolves.toMatchInlineSnapshot(`"command-version"`);
    expect(action).toHaveBeenCalledTimes(2);
  });
});

describe('runtime/run: conversion boundaries', () => {
  it.each(['argument', 'option'])(
    'propagates %s conversion failures directly from middleware assignment',
    async (kind) => {
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
      expect(afterAccept).not.toHaveBeenCalled();
      expect(action).not.toHaveBeenCalled();
    }
  );

  it('converts input supplied by action middleware after initial finalization', async () => {
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
        expect(port.value()).toBe(8080);
        return context;
      })
      .action((count, options) => [count, options.port]);

    await expect(app.run(['run'])).resolves.toEqual([2, 8080]);
    expect(argumentCast).toHaveBeenCalledExactlyOnceWith('2');
    expect(optionCast).toHaveBeenCalledExactlyOnceWith('8080');
  });

  it.each(['--help', '--version'])('skips all casts and execution for explicit %s in parse and run', async (flag) => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const cast = vi.fn(() => {
        throw new Error('must not convert');
      });
      const action = vi.fn();
      const middleware = vi.fn();
      const unknown = vi.fn();
      const app = breadc('cli')
        .option('--count <value>', '', { default: '1', cast })
        .use(middleware)
        .onUnknownCommand(unknown);
      app.command('run').argument('<file>', { cast }).action(action);
      expect(app.parse(['run', flag]).args).toEqual([]);
      await app.run(['run', 'file', 'extra', flag]);
      await app.run([flag]);
      expect(cast).not.toHaveBeenCalled();
      expect(action).not.toHaveBeenCalled();
      expect(middleware).not.toHaveBeenCalled();
      expect(unknown).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });

  it('only run skips conversion for automatic help, while ordinary parse still converts', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const cast = vi.fn(Number);
      const app = breadc('cli').option('--count <value>', '', { default: '2', cast });
      app.group('tool').command('run');
      for (const argv of [[], ['unknown'], ['tool'], ['--count=3']]) {
        await expect(app.run(argv)).resolves.toContain('Usage: cli');
      }
      expect(cast).not.toHaveBeenCalled();
      expect(app.parse([]).options.count).toBe(2);
      expect(cast).toHaveBeenCalledExactlyOnceWith('2');
    } finally {
      log.mockRestore();
    }
  });

  it.each([[], ['--help'], ['--version'], ['run']])(
    'reports syntax errors before casts, help or any execution: %j',
    async (...prefix) => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        const cast = vi.fn(Number);
        const action = vi.fn();
        const middleware = vi.fn();
        const unknown = vi.fn();
        const app = breadc('cli').option('--count <value>', '', { default: '2', cast }).use(middleware);
        app.command('run').action(action);
        const argv = [...prefix, '--typo', '--other'];
        await expect(app.run(argv)).rejects.toMatchObject({
          issues: [
            { code: ErrorCode.UNKNOWN_OPTION, name: '--typo' },
            { code: ErrorCode.UNKNOWN_OPTION, name: '--other' }
          ]
        });
        app.onUnknownCommand(unknown);
        await expect(app.run(argv)).rejects.toMatchObject({ code: ErrorCode.INVALID_INPUT });
        expect(cast).not.toHaveBeenCalled();
        expect(action).not.toHaveBeenCalled();
        expect(middleware).not.toHaveBeenCalled();
        expect(unknown).not.toHaveBeenCalled();
        expect(log).not.toHaveBeenCalled();
      } finally {
        log.mockRestore();
      }
    }
  );

  it('converts once before unknown-command handlers and reuses the results', async () => {
    const cast = vi.fn(Number);
    const app = breadc('cli').option('--count <value>', '', { default: '2', cast });
    const seen: number[] = [];
    app.onUnknownCommand((context) => {
      seen.push(context.options.get('count')!.value());
      expect(context.arguments[0].value()).toBe('unknown');
    });
    app.onUnknownCommand((context) => {
      context.options.get('count')!.finalize();
      seen.push(context.options.get('count')!.value());
      return 'handled';
    });
    await expect(app.run(['unknown'])).resolves.toBe('handled');
    expect(seen).toEqual([2, 2]);
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

  it('propagates conversion failure before unknown handlers, action middleware or actions', async () => {
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
    expect(unknown).not.toHaveBeenCalled();
    expect(middleware).not.toHaveBeenCalled();
    expect(action).not.toHaveBeenCalled();
  });
});
