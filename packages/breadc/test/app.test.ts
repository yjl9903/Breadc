import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { options as colorOptions } from '@breadc/color';
import { breadc as core } from '@breadc/core';
import { breadc, parse, option, InputError, ErrorCode } from '../src/index.ts';

beforeEach(() => {
  colorOptions.enabled = false;
  vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

const createApp = () => breadc('cli').option('-a, --all').option('-b, --[no-]brief').option('-o, --output <file>');

function inputError(fn: () => unknown): InputError {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(InputError);
    return error as InputError;
  }
  throw new Error('Expected InputError');
}
function businessCast() {
  return vi.fn(() => {
    throw new Error('unrelated business cast');
  });
}
function schema(validate: StandardSchemaV1['~standard']['validate']): StandardSchemaV1 {
  return { '~standard': { version: 1, vendor: 'test', validate } };
}

describe('breadc/app: construction', () => {
  it('registers builtins as ordinary options with their ordinary defaults', () => {
    const app = breadc('cli');
    expect(app.parse([]).options).toMatchInlineSnapshot(`
      {
        "help": false,
        "version": false,
      }
    `);
    const explicit = app.parse(['--help']);
    expect(explicit.context.actionOption?.option).toBe(explicit.context.options.get('help')?.option);
  });

  it('returns the original chainable core app with user option actions', async () => {
    const app = breadc('cli').option(option('--inspect <value>', '', { cast: Number }).action((value) => value + 1));
    app.command('run <required>');
    await expect(app.run(['run', '--inspect=41'])).resolves.toMatchInlineSnapshot(`42`);
    expect(app.parse(['run', '--inspect=41']).options.inspect).toMatchInlineSnapshot(`41`);
  });

  it('wraps the core constructor and registers builtins only on the wrapped instance', async () => {
    const output = vi.mocked(console.log);
    expect(breadc).not.toBe(core);
    await expect(breadc('cli', { version: '2' }).run(['--version'])).resolves.toMatchInlineSnapshot(`"cli/2"`);
    expect(output).toHaveBeenCalledExactlyOnceWith('cli/2');
    await expect(core('cli').run(['--help'])).rejects.toThrowErrorMatchingInlineSnapshot(
      `[InputError: Unknown option: --help]`
    );
  });

  it('registers builtin help option when custom spec is provided', () => {
    const app = breadc('cli', {
      builtin: {
        help: {
          spec: '-H, --help'
        }
      }
    });

    expect(app.parse(['-H']).options).toMatchInlineSnapshot(`
      {
        "help": true,
        "version": false,
      }
    `);
    expect(app.parse(['--help']).options).toMatchInlineSnapshot(`
      {
        "help": true,
        "version": false,
      }
    `);
  });

  it('registers builtin version option when custom spec is provided', () => {
    const app = breadc('cli', {
      builtin: {
        version: {
          spec: '-V, --version'
        }
      }
    });

    expect(app.parse(['-V']).options).toMatchInlineSnapshot(`
      {
        "help": false,
        "version": true,
      }
    `);
    expect(app.parse(['--version']).options).toMatchInlineSnapshot(`
      {
        "help": false,
        "version": true,
      }
    `);
  });

  it('supports builtin help/version without short aliases', () => {
    const app = breadc('cli', {
      builtin: {
        help: {
          spec: '--help'
        },
        version: {
          spec: '--version'
        }
      }
    });

    expect(app.parse(['--help']).options).toMatchInlineSnapshot(`
      {
        "help": true,
        "version": false,
      }
    `);
    expect(app.parse(['--version']).options).toMatchInlineSnapshot(`
      {
        "help": false,
        "version": true,
      }
    `);
  });

  it('honors forms in custom built-in specs', () => {
    const app = breadc('cli', { builtin: { help: { spec: '-h, --[no-]help' }, version: { spec: '--no-version' } } });
    expect(app.parse(['--no-help']).options).toMatchInlineSnapshot(`
      {
        "help": false,
        "version": true,
      }
    `);
    expect(app.parse(['-h']).options).toMatchInlineSnapshot(`
      {
        "help": true,
        "version": true,
      }
    `);
    expect(app.parse(['--no-version']).options).toMatchInlineSnapshot(`
      {
        "help": false,
        "version": false,
      }
    `);
    expect(() => app.parse(['--version'])).toThrowErrorMatchingInlineSnapshot(
      `[InputError: Unknown option: --version]`
    );
  });

  it('rejects disabled builtin options', async () => {
    const app = breadc('cli', { builtin: { version: false, help: false } });

    await expect(app.run(['-v'])).rejects.toThrowErrorMatchingInlineSnapshot(`[InputError: Unknown option: -v]`);
    await expect(app.run(['-h'])).rejects.toThrowErrorMatchingInlineSnapshot(`[InputError: Unknown option: -h]`);
  });

  it('allows user declarations to override builtin spellings at root scope', async () => {
    const app = breadc('cli').option(option('--help').action(() => 'custom'));
    await expect(app.run(['--help'])).resolves.toMatchInlineSnapshot(`"custom"`);
    await expect(app.run(['-h'])).rejects.toThrowErrorMatchingInlineSnapshot(`[InputError: Unknown option: -h]`);
  });

  it('supports built-in options in a combination', () => {
    expect(createApp().parse(['-ah']).options).toMatchInlineSnapshot(`
      {
        "all": true,
        "brief": false,
        "help": true,
        "output": undefined,
        "version": false,
      }
    `);
    expect(createApp().parse(['-av']).options).toMatchInlineSnapshot(`
      {
        "all": true,
        "brief": false,
        "help": false,
        "output": undefined,
        "version": true,
      }
    `);
  });

  it('does not generate negative forms for default built-ins', () => {
    for (const name of ['--no-help', '--no-version']) {
      expect(() => breadc('cli').parse([name])).toThrow(`Unknown option: ${name}`);
    }
  });
});

describe('breadc/app: parsing', () => {
  it.each(['--help', '--version'])('skips business argument casts on %s', (flag) => {
    const app = breadc('cli', { version: '1.0.0' });
    const cast = vi.fn(() => {
      throw new Error('must not run');
    });
    app.command('run').argument('<file>', { cast }).argument('[port]', { default: '3000', cast });
    expect(() => app.parse(['run', flag])).not.toThrow();
    expect(() => app.parse(['run', 'file', flag])).not.toThrow();
    expect(cast).not.toHaveBeenCalled();
  });

  it.each(['--help', '--version'])('rejects unknown options alongside %s', (builtin) => {
    expect(() => breadc('cli').parse(['--typo', builtin])).toThrow(`Unknown option: --typo`);
  });

  it.each(['--include', '-s', '-as'])('requires a value for every spread occurrence of %s', (flag) => {
    const app = breadc('cli').option('-a, --all').option('-s, --include <...value>');
    for (const tail of [[], ['--all'], ['--help'], ['--unknown'], ['--', 'file']]) {
      for (const prefix of [[], ['--include', 'first']]) {
        expect(() => app.parse([...prefix, flag, ...tail])).toThrow(`Missing required option value: --include`);
      }
    }
  });

  it('leaves following flags and unknown options for optional options', () => {
    const app = breadc('cli').option('-a, --all').option('-o, --output [value]');
    expect(app.parse(['--output', '--all']).options).toMatchInlineSnapshot(`
      {
        "all": true,
        "help": false,
        "output": undefined,
        "version": false,
      }
    `);
    expect(app.parse(['--output', '--help']).context.actionOption?.option.long).toMatchInlineSnapshot(`"help"`);
    for (const value of ['--unknown', '-2foo', '-2e']) {
      expect(() => app.parse(['--output', value])).toThrow(`Unknown option: ${value}`);
    }
    const escaped = app.parse(['--output', '--', '-2foo']);
    expect(escaped.options.output).toBeUndefined();
    expect(escaped['--']).toMatchInlineSnapshot(`
      [
        "-2foo",
      ]
    `);
  });

  it.each(['--help', '--version'])('still aggregates scanning errors for %s, skipping argument binding', (flag) => {
    const cast = vi.fn(Number);
    const app = breadc('cli').option('--count <value>', '', { default: '1', cast });
    app.command('run <file>').option('--all');
    const error = inputError(() => app.parse(['before', 'run', '--all=bad', '--unknown', flag]));
    expect(error.issues.map((issue) => issue.code)).toMatchInlineSnapshot(`
      [
        "INVALID_BOOLEAN_OPTION_VALUE",
        "UNKNOWN_OPTION",
      ]
    `);
    expect(error.context?.arguments).toMatchInlineSnapshot(`[]`);
    expect(cast).not.toHaveBeenCalled();
  });

  it.each([
    { spec: '--verbose', raw: false },
    { spec: '--no-verbose', raw: true },
    { spec: '--[no-]verbose', raw: false }
  ] as const)('casts builtin and explicit defaults for $spec', ({ spec, raw }) => {
    const cast = vi.fn((value: boolean) => Number(value));
    const app = breadc('cli').option(spec, '', { cast });
    expect(app.parse([]).options.verbose).toBe(Number(raw));
    expect(cast).toHaveBeenCalledExactlyOnceWith(raw);

    for (const fallback of [false, true]) {
      cast.mockClear();
      const withDefault = breadc('cli').option(spec, '', { default: fallback, cast });
      expect(withDefault.parse([]).options.verbose).toBe(Number(fallback));
      expect(cast).toHaveBeenCalledExactlyOnceWith(fallback);
    }
  });

  it('returns builtin values without printing in app.parse', () => {
    const output = vi.mocked(console.log);
    expect(['--help', '--version'].map((flag) => breadc('cli').parse([flag]).options)).toMatchInlineSnapshot(`
      [
        {
          "help": true,
          "version": false,
        },
        {
          "help": false,
          "version": true,
        },
      ]
    `);
    expect(output).not.toHaveBeenCalled();
  });
});

describe('breadc/app: execution', () => {
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

  it('prioritizes builtin help/version over matched command action', async () => {
    const app = breadc('cli');
    const action = vi.fn(() => 'pong');
    app.command('ping').action(action);

    await expect(app.run(['ping', '--help'])).resolves.toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli ping [OPTIONS]

      Commands:
        cli ping  

      Options:
        -h, --help     Print help
        -v, --version  Print version
      "
    `);
    await expect(app.run(['ping', '--version'])).resolves.toMatchInlineSnapshot(`"cli/unknown"`);
    expect(action).not.toHaveBeenCalled();
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

  it.each(['--help', '--version'])(
    'skips all casts and execution for explicit %s in raw parse and run',
    async (flag) => {
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
      expect(parse(app, ['run', flag]).arguments).toMatchInlineSnapshot(`[]`);
      await app.run(['run', 'file', 'extra', flag]);
      await app.run([flag]);
      expect(cast).not.toHaveBeenCalled();
      expect(action).not.toHaveBeenCalled();
      expect(middleware).not.toHaveBeenCalled();
      expect(unknown).not.toHaveBeenCalled();
    }
  );

  it.each([[], ['--help'], ['--version'], ['run']])(
    'reports syntax errors before casts, help or any execution: %j',
    async (...prefix) => {
      const log = vi.mocked(console.log);
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
    }
  );

  it.each(['--help', '--version'])('skips array casts for %s but still diagnoses empty occurrences', async (flag) => {
    const cast = vi.fn((values: string[]) => values);
    const action = vi.fn();
    const middleware = vi.fn((context, next) => next());
    const app = breadc('cli').option('--include <...value>', '', { cast }).use(middleware);
    app.command('build <target>').action(action);
    parse(app, ['build', '--include', 'a', 'b', flag]);
    await app.run(['build', '--include', 'a', 'b', flag]);
    await expect(app.run(['build', '--include', flag])).rejects.toThrow('Missing required option value');
    expect(cast).not.toHaveBeenCalled();
    expect(action).not.toHaveBeenCalled();
    expect(middleware).not.toHaveBeenCalled();
  });

  it.each(['--help', '--version'])('allows %s before required-array validation and conversion', async (flag) => {
    const app = breadc('cli');
    const cast = vi.fn((files: string[]) => files);
    const action = vi.fn();
    app.command('upload').argument('<...files>', { cast }).action(action);
    const text = await app.run(['upload', flag]);
    if (flag === '--help')
      expect(text).toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli upload <...files> [OPTIONS]

      Commands:
        cli upload <...files>  

      Options:
        -h, --help     Print help
        -v, --version  Print version
      "
    `);
    expect(cast).not.toHaveBeenCalled();
    expect(action).not.toHaveBeenCalled();
  });

  it.each(['--help', '--version'])('skips user casts for %s in raw parse and run', async (flag) => {
    const cast = vi.fn(() => {
      throw new Error('must not convert');
    });
    const action = vi.fn();
    const middleware = vi.fn();
    const app = breadc('cli', { version: '1.0.0' }).option('--value [value]', '', { default: 'seed', cast });
    app.command('<required>').action(action).use(middleware);
    parse(app, ['--value', flag]);
    await app.run(['--value', flag]);
    expect(cast).not.toHaveBeenCalled();
    expect(action).not.toHaveBeenCalled();
    expect(middleware).not.toHaveBeenCalled();
  });

  it('skips converters for syntax errors, help/version and run paths without execution', async () => {
    const validate = vi.fn(() => ({ issues: [] }));
    const app = breadc('cli', { version: '1' }).option('--value <value>', '', { default: 'x', cast: schema(validate) });
    app
      .command('run')
      .argument('<name>', { cast: schema(validate) })
      .action(vi.fn());
    for (const argv of [['run', '--value'], ['run'], ['--unknown']]) expect(() => app.parse(argv)).toThrow(InputError);
    for (const argv of [['--help'], ['--version'], ['run', '--help']]) {
      parse(app, argv);
      await app.run(argv);
    }
    await app.run([]);
    expect(validate).not.toHaveBeenCalled();
  });

  it.each([['--help', '--version'], ['--version', '--help'], ['-hv']].map((argv) => ({ argv })))(
    'prioritizes version for $argv',
    async ({ argv }) => {
      const output = vi.mocked(console.log);
      await expect(breadc('cli', { version: '1.2.3' }).run(argv)).resolves.toMatchInlineSnapshot(`"cli/1.2.3"`);
      expect(output).toHaveBeenCalledExactlyOnceWith('cli/1.2.3');
    }
  );

  it('lets a higher priority user action outrank builtins', async () => {
    const output = vi.mocked(console.log);
    const app = breadc('cli').option(option('--inspect').action(() => 'inspect', { priority: 30 }));
    await expect(app.run(['--help', '--inspect', '--version'])).resolves.toMatchInlineSnapshot(`"inspect"`);
    expect(output).not.toHaveBeenCalled();
  });
});

describe('breadc/app: automatic help', () => {
  it('only run skips conversion for automatic help, while ordinary parse still converts', async () => {
    const cast = vi.fn(Number);
    const app = breadc('cli').option('--count <value>', '', { default: '2', cast });
    app.group('tool').command('run');
    for (const argv of [[], ['unknown'], ['tool'], ['--count=3']]) {
      await expect(app.run(argv)).resolves.toMatchInlineSnapshot(`
        "cli/unknown

        Usage: cli tool run [OPTIONS]

        Commands:
          cli tool run  

        Options:
          -h, --help           Print help
          -v, --version        Print version
              --count <value>  
        "
      `);
    }
    expect(cast).not.toHaveBeenCalled();
    expect(app.parse([]).options.count).toMatchInlineSnapshot(`2`);
    expect(cast).toHaveBeenCalledExactlyOnceWith('2');
  });

  it('skips unknown-command handlers and leaves automatic fallback outside their chain', async () => {
    const cast = businessCast();
    const unknown = vi.fn();
    const handler = vi.fn(() => 'option');
    const app = breadc('cli').option('--business', '', { cast }).option(option('--inspect').action(handler));
    app.onUnknownCommand(unknown);
    await expect(app.run(['unknown', '--inspect'])).resolves.toMatchInlineSnapshot(`"option"`);
    expect(unknown).not.toHaveBeenCalled();
    expect(cast).not.toHaveBeenCalled();

    const output = vi.mocked(console.log);
    const fallback = breadc('cli').option('--business', '', { cast });
    await fallback.run(['unknown']);
    expect(output).toHaveBeenCalledTimes(1);
    expect(cast).not.toHaveBeenCalled();
    expect(() => fallback.parse(['unknown'])).toThrowErrorMatchingInlineSnapshot(`[Error: unrelated business cast]`);
  });

  it('keeps automatic help outside the unknown-handler chain and scans only once', async () => {
    const cast = vi.fn(Number);
    const scan = vi.fn((_context, name, value) => ({ name, value }));
    const app = breadc('cli').option('--port <value>', '', { default: '42', cast }).allowUnknownOption(scan);
    await expect(app.run(['unknown', '--extra'])).resolves.toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli [OPTIONS]

      Options:
        -h, --help          Print help
        -v, --version       Print version
            --port <value>  
      "
    `);
    expect(scan).toHaveBeenCalledTimes(1);
    expect(cast).not.toHaveBeenCalled();

    const handler = vi.fn(() => 'handled');
    app.onUnknownCommand(handler);
    await expect(app.run(['unknown', '--extra'])).resolves.toMatchInlineSnapshot(`"handled"`);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(scan).toHaveBeenCalledTimes(2);
    expect(cast).toHaveBeenCalledExactlyOnceWith('42');
  });
});
