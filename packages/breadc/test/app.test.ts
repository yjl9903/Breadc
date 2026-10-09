import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { breadc, command, group, argument, option, parse, run } from '../src/index.ts';

beforeEach(() => {
  vi.spyOn(process, 'stdout', 'get').mockReturnValue({
    columns: 80,
    write: vi.fn(() => true)
  } as unknown as typeof process.stdout);
});
afterEach(() => vi.restoreAllMocks());

describe('app: parsing', () => {
  it('parses builtin defaults and combined flags without printing', () => {
    const app = breadc('cli').option('-a, --all');
    expect([[], ['-ah'], ['-av']].map((argv) => app.parse(argv).options)).toEqual([
      { all: false, help: false, version: false },
      { all: true, help: true, version: false },
      { all: true, help: false, version: true }
    ]);
    expect(process.stdout.write).not.toHaveBeenCalled();
  });

  it('returns converted arguments, options and escaped input without running actions', () => {
    const action = vi.fn();
    const app = breadc('cli').option('--port <number>', 'Port', { default: '3000', cast: Number });
    app.command('serve').argument('<file>', 'File').action(action);
    const { args, options, '--': remaining } = app.parse(['serve', 'index.html', '--port=8080', '--', '--raw']);
    expect({ args, options, remaining }).toMatchInlineSnapshot(`
      {
        "args": [
          "index.html",
        ],
        "options": {
          "help": false,
          "port": 8080,
          "version": false,
        },
        "remaining": [
          "--raw",
        ],
      }
    `);
    expect(action).not.toHaveBeenCalled();
    expect(process.stdout.write).not.toHaveBeenCalled();
  });

  it('composes standalone declarations through the package entry point', async () => {
    const app = breadc('cli', { builtin: { help: false, version: false } });
    const tools = group('tools', 'Tools');
    const echo = command('echo', 'Echo');
    app
      .group(tools)
      .command(echo)
      .option(option('--count <number>', 'Count', { default: '2', cast: Number }))
      .argument(argument('<text>', 'Text'))
      .action((text, options) => ({ text, count: options.count }));
    await expect(app.run(['tools', 'echo', 'hello'])).resolves.toMatchInlineSnapshot(`
      {
        "count": 2,
        "text": "hello",
      }
    `);
  });
});

describe('app: execution', () => {
  it('runs middleware and returns the command result through parse and run', async () => {
    const cast = vi.fn(Number);
    const app = breadc('cli')
      .option('--count <number>', 'Count', { default: '2', cast })
      .use(async (_context, next) => next({ data: { source: 'middleware' } }));
    app.command('count').action((options, context) => ({ count: options.count, source: context.data.source }));
    const context = parse(app, ['count']);
    expect(cast).not.toHaveBeenCalled();
    await expect(run(context)).resolves.toMatchInlineSnapshot(`
      {
        "count": 2,
        "source": "middleware",
      }
    `);
    expect(cast).toHaveBeenCalledExactlyOnceWith('2');
  });

  it.each(['help', 'version'])('allows global and command declarations to replace builtin %s', async (name) => {
    const app = breadc('cli').option(option(`--${name}`).action(() => 'global action'));
    app
      .command('run')
      .option(`--${name}`)
      .action((options) => options[name]);
    await expect(app.run([`--${name}`])).resolves.toBe('global action');
    await expect(app.run(['run', `--${name}`])).resolves.toBe(true);
    expect(process.stdout.write).not.toHaveBeenCalled();
  });

  it('lets a user option action override builtin priorities', async () => {
    const app = breadc('cli').option(option('--inspect').action(() => 'inspected', { priority: 30 }));
    await expect(app.run(['--help', '--version', '--inspect'])).resolves.toMatchInlineSnapshot(`"inspected"`);
    expect(process.stdout.write).not.toHaveBeenCalled();
  });

  it.each(['help', 'version'])('runs %s before business validation and handlers', async (name) => {
    const cast = vi.fn(Number);
    const validate = vi.fn((value: unknown) => ({ value }));
    const middleware = vi.fn((_context, next) => next());
    const action = vi.fn();
    const unknown = vi.fn();
    const app = breadc('cli')
      .option('--count <number>', 'Count', { default: '2', cast })
      .use(middleware)
      .onUnknownCommand(unknown);
    app
      .command('upload')
      .argument('<...files>', 'Files', {
        cast: { '~standard': { version: 1, vendor: 'test', validate } }
      })
      .action(action);

    const output = await app.run(['upload', `--${name}`]);
    expect(process.stdout.write).toHaveBeenCalledExactlyOnceWith(`${output}\n`);
    for (const fn of [cast, validate, middleware, action, unknown]) expect(fn).not.toHaveBeenCalled();
  });

  it('uses an unknown-command handler instead of automatic help', async () => {
    const cast = vi.fn(Number);
    const handler = vi.fn(() => 'handled');
    const app = breadc('cli').option('--count <number>', '', { default: '2', cast }).onUnknownCommand(handler);
    await expect(app.run(['missing'])).resolves.toMatchInlineSnapshot(`"handled"`);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(cast).toHaveBeenCalledExactlyOnceWith('2');
    expect(process.stdout.write).not.toHaveBeenCalled();
  });
});

describe('app: errors', () => {
  it.each([[], ['--help'], ['--version']].map((flags) => ({ flags })))(
    'reports input errors before execution with flags $flags',
    async ({ flags }) => {
      const cast = vi.fn(Number);
      const action = vi.fn();
      const app = breadc('cli').option('--count <number>', '', { default: '2', cast }).option('--output <file>');
      app.command('run').action(action);
      await expect(app.run(['run', '--unknown', ...flags])).rejects.toThrowErrorMatchingInlineSnapshot(
        `[InputError: Unknown option: --unknown]`
      );
      await expect(app.run(['run', '--output', ...flags])).rejects.toThrowErrorMatchingInlineSnapshot(
        `[InputError: Missing required option value: --output]`
      );
      expect(cast).not.toHaveBeenCalled();
      expect(action).not.toHaveBeenCalled();
      expect(process.stdout.write).not.toHaveBeenCalled();
    }
  );

  it.each(['help', 'version'] as const)('disables the %s option', async (name) => {
    const app = breadc('cli', { builtin: { [name]: false } });
    await expect(app.run([`--${name}`])).rejects.toThrow(`Unknown option: --${name}`);
  });
});
