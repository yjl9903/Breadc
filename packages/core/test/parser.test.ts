import { describe, it, expect, vi } from 'vitest';

import type { InternalBreadc } from '../src/breadc/index.ts';

import { breadc } from '../src/breadc/app.ts';
import { isHelp } from '../src/runtime/parser.ts';
import { BreadcAppError, ResolveOptionError, RuntimeError } from '../src/error.ts';

describe('runtime/parser: command matching', () => {
  it('matches a single default command', () => {
    const app = breadc('cli');
    app.command('<name>');

    const result = app.parse(['hello']);
    expect(result.context.command?.spec).toMatchInlineSnapshot(`"<name>"`);
    expect(result.context.pieces).toMatchInlineSnapshot(`[]`);
    expect(result.args).toMatchInlineSnapshot(`
      [
        "hello",
      ]
    `);
    expect(result.options).toMatchInlineSnapshot(`{}`);
    expect(result['--']).toMatchInlineSnapshot(`[]`);
  });

  it('matches a single sub-command', () => {
    const app = breadc('cli');
    app.command('dev');

    const result = app.parse(['dev']);
    expect(result.context.command?.spec).toMatchInlineSnapshot(`"dev"`);
    expect(result.context.pieces).toMatchInlineSnapshot(`
      [
        "dev",
      ]
    `);
    expect(result.args).toMatchInlineSnapshot(`[]`);
    expect(result.options).toMatchInlineSnapshot(`{}`);
    expect(result['--']).toMatchInlineSnapshot(`[]`);
  });

  it('matches multiple sub-commands', () => {
    const app = breadc('cli');
    app.command('dev');
    app.command('build');

    expect(app.parse(['build']).context.command?.spec).toMatchInlineSnapshot(`"build"`);
    expect(app.parse(['dev']).context.command?.spec).toMatchInlineSnapshot(`"dev"`);
  });

  it('falls back to default command when no sub-command matches', () => {
    const app = breadc('cli');
    app.command('<file>');
    app.command('dev');

    const result1 = app.parse(['dev']);
    const result2 = app.parse(['readme.md']);

    expect(result1.context.command?.spec).toMatchInlineSnapshot(`"dev"`);
    expect(result2.context.command?.spec).toMatchInlineSnapshot(`"<file>"`);
    expect(result2.args).toMatchInlineSnapshot(`
      [
        "readme.md",
      ]
    `);
  });

  it('matches group commands alongside default command', () => {
    const app = breadc('cli');
    app.command('[file]');
    const store = app.group('store');
    store.command('ls');

    const result = app.parse(['store', 'ls']);
    expect(result.context.group?.spec).toMatchInlineSnapshot(`"store"`);
    expect(result.context.command?.spec).toMatchInlineSnapshot(`"ls"`);
    expect(result.context.pieces).toMatchInlineSnapshot(`
      [
        "store",
        "ls",
      ]
    `);
  });

  it('matches default command inside a matched group', () => {
    const app = breadc('cli');
    const store = app.group('store');
    store.command('<name>');
    store.command('ls');

    const result = app.parse(['store', 'readme.md']);
    expect(result.context.group?.spec).toMatchInlineSnapshot(`"store"`);
    expect(result.context.command?.spec).toMatchInlineSnapshot(`"<name>"`);
    expect(result.context.pieces).toMatchInlineSnapshot(`
      [
        "store",
      ]
    `);
    expect(result.args).toMatchInlineSnapshot(`
      [
        "readme.md",
      ]
    `);
  });

  it('keeps group unmatched when it has no default command', () => {
    const app = breadc('cli');
    const store = app.group('store');
    store.command('ls');

    const result = app.parse(['store', 'readme.md']);
    expect(result.context.group?.spec).toMatchInlineSnapshot(`"store"`);
    expect(result.context.command).toBeUndefined();
    expect(result.context.pieces).toMatchInlineSnapshot(`
      [
        "store",
      ]
    `);
    expect(result.args).toMatchInlineSnapshot(`
      [
        "readme.md",
      ]
    `);
  });

  it('registers builtin help option when custom spec is provided', () => {
    const app = breadc('cli', {
      builtin: {
        help: {
          spec: '-H, --help'
        }
      }
    });

    app.parse(['-H']);
    app.parse(['--help']);

    expect((app as unknown as InternalBreadc)._help).toMatchInlineSnapshot(`
      {
        "form": "positive",
        "init": {
          "description": "Print help",
        },
        "long": "help",
        "short": "H",
        "spec": "-H, --help",
        "type": "boolean",
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

    app.parse(['-V']);
    app.parse(['--version']);

    expect((app as unknown as InternalBreadc)._version).toMatchInlineSnapshot(`
      {
        "form": "positive",
        "init": {
          "description": "Print version",
        },
        "long": "version",
        "short": "V",
        "spec": "-V, --version",
        "type": "boolean",
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

    app.parse(['--help']);
    app.parse(['--version']);

    expect((app as unknown as InternalBreadc)._help).toMatchInlineSnapshot(`
      {
        "form": "positive",
        "init": {
          "description": "Print help",
        },
        "long": "help",
        "spec": "--help",
        "type": "boolean",
      }
    `);
    expect((app as unknown as InternalBreadc)._version).toMatchInlineSnapshot(`
      {
        "form": "positive",
        "init": {
          "description": "Print version",
        },
        "long": "version",
        "spec": "--version",
        "type": "boolean",
      }
    `);
  });

  it('matches sub-commands with aliases', () => {
    const app = breadc('cli');
    app.command('dev').alias('d').alias('develop');
    app.command('build').alias('b');

    expect(app.parse(['d']).context.command?.spec).toMatchInlineSnapshot(`"dev"`);
    expect(app.parse(['develop']).context.command?.spec).toMatchInlineSnapshot(`"dev"`);
    expect(app.parse(['b']).context.command?.spec).toMatchInlineSnapshot(`"build"`);
  });

  it('matches multi-level sub-commands', () => {
    const app = breadc('cli');
    app.command('dev run');

    const result = app.parse(['dev', 'run']);
    expect(result.context.command?.spec).toMatchInlineSnapshot(`"dev run"`);
    expect(result.context.pieces).toMatchInlineSnapshot(`
      [
        "dev",
        "run",
      ]
    `);
  });

  it('prefers longer literal sub-commands over earlier argument fallback', () => {
    const app = breadc('cli');
    app.command('subject <subject_id>');
    app.command('subject revision <subject_id>');
    app.command('subject revision list <subject_id>');
    app.command('subject revision disable <subject_id> <revision_id>');
    app.command('subject revision enable <subject_id> <revision_id>');

    const revision = app.parse(['subject', 'revision', '114514']);
    expect(revision.context.command?.spec).toMatchInlineSnapshot(`"subject revision <subject_id>"`);
    expect(revision.context.pieces).toMatchInlineSnapshot(`
      [
        "subject",
        "revision",
      ]
    `);
    expect(revision.args).toMatchInlineSnapshot(`
      [
        "114514",
      ]
    `);

    const list = app.parse(['subject', 'revision', 'list', '114514']);
    expect(list.context.command?.spec).toMatchInlineSnapshot(`"subject revision list <subject_id>"`);
    expect(list.context.pieces).toMatchInlineSnapshot(`
      [
        "subject",
        "revision",
        "list",
      ]
    `);
    expect(list.args).toMatchInlineSnapshot(`
      [
        "114514",
      ]
    `);

    const disable = app.parse(['subject', 'revision', 'disable', '114514', '1919810']);
    expect(disable.context.command?.spec).toMatchInlineSnapshot(
      `"subject revision disable <subject_id> <revision_id>"`
    );
    expect(disable.context.pieces).toMatchInlineSnapshot(`
      [
        "subject",
        "revision",
        "disable",
      ]
    `);
    expect(disable.args).toMatchInlineSnapshot(`
      [
        "114514",
        "1919810",
      ]
    `);
  });

  it('rolls back consumed literal pieces when falling back to a shorter argument command', () => {
    const app = breadc('cli');
    app.command('subject <subject_id>');
    app.command('subject revision list <subject_id>');

    const result = app.parse(['subject', 'revision']);
    expect(result.context.command?.spec).toMatchInlineSnapshot(`"subject <subject_id>"`);
    expect(result.context.pieces).toMatchInlineSnapshot(`
      [
        "subject",
      ]
    `);
    expect(result.args).toMatchInlineSnapshot(`
      [
        "revision",
      ]
    `);
    expect(result['--']).toEqual([]);
    expect(() => app.parse(['subject', 'revision', '114514'])).toThrowError(RuntimeError.UNEXPECTED_ARGUMENTS);
  });

  it('commits an exact longer literal match at end of input', () => {
    const app = breadc('cli');
    app.command('subject <subject_id>');
    app.command('subject revision');

    const result = app.parse(['subject', 'revision']);
    expect(result.context.command?.spec).toMatchInlineSnapshot(`"subject revision"`);
    expect(result.context.pieces).toMatchInlineSnapshot(`
      [
        "subject",
        "revision",
      ]
    `);
    expect(result.args).toMatchInlineSnapshot(`[]`);
  });

  it('allows duplicated aliases on the same command while selecting candidates', () => {
    const app = breadc('cli');
    app.command('subject revision').alias('subject revision');

    const result = app.parse(['subject', 'revision']);
    expect(result.context.command?.spec).toMatchInlineSnapshot(`"subject revision"`);
    expect(result.context.pieces).toMatchInlineSnapshot(`
      [
        "subject",
        "revision",
      ]
    `);
  });

  it('matches default command aliases alongside sub-commands', () => {
    const app = breadc('cli');
    app.command('build').alias('');
    app.command('dev');

    const result1 = app.parse(['dev']);
    expect(result1.context.command?.spec).toMatchInlineSnapshot(`"dev"`);
    expect(result1.context.pieces).toMatchInlineSnapshot(`
      [
        "dev",
      ]
    `);
    expect(result1.args).toMatchInlineSnapshot(`[]`);
    expect(result1['--']).toMatchInlineSnapshot(`[]`);

    const result2 = app.parse([]);
    expect(result2.context.command?.spec).toMatchInlineSnapshot(`"build"`);
    expect(result2.context.pieces).toMatchInlineSnapshot(`[]`);
    expect(result2.args).toMatchInlineSnapshot(`[]`);
    expect(result2['--']).toMatchInlineSnapshot(`[]`);

    expect(() => app.parse(['build'])).toThrowError(RuntimeError.UNEXPECTED_ARGUMENTS);
  });
});

describe('runtime/parser: arguments', () => {
  it('matches required/optional arguments and preserves explicit passthrough args', () => {
    const app = breadc('cli');
    app.command('echo <first> [second]');

    const result = app.parse(['echo', 'a', 'b', '--', 'c', 'd']);
    expect(result.args).toMatchInlineSnapshot(`
      [
        "a",
        "b",
      ]
    `);
    expect(result['--']).toMatchInlineSnapshot(`
      [
        "c",
        "d",
      ]
    `);
  });

  it('matches optional arguments when omitted', () => {
    const app = breadc('cli');
    app.command('echo <first> [second]');

    const result1 = app.parse(['echo', 'a']);
    expect(result1.args).toMatchInlineSnapshot(`
      [
        "a",
        undefined,
      ]
    `);
    expect(result1['--']).toMatchInlineSnapshot(`[]`);

    const result2 = app.parse(['echo', 'a', 'b']);
    expect(result2.args).toMatchInlineSnapshot(`
      [
        "a",
        "b",
      ]
    `);
    expect(result2['--']).toMatchInlineSnapshot(`[]`);
  });

  it('matches manual arguments mixed with spec arguments', () => {
    const app = breadc('cli');
    app.command('echo <first>').argument('[second]');

    const result = app.parse(['echo', 'a', 'b']);
    expect(result.args).toMatchInlineSnapshot(`
      [
        "a",
        "b",
      ]
    `);
  });

  it('applies manual argument cast when provided', () => {
    const app = breadc('cli');
    app.command('echo <first>').argument('<count>', {
      cast: (t) => Number(t)
    });

    const result = app.parse(['echo', 'hello', '2']);
    expect(result.args).toMatchInlineSnapshot(`
      [
        "hello",
        2,
      ]
    `);
  });

  it('matches spread arguments and consumes remaining args', () => {
    const app = breadc('cli');
    app.command('echo [...rest]');

    const result = app.parse(['echo', 'a', 'b', 'c']);
    expect(result.args).toMatchInlineSnapshot(`
      [
        [
          "a",
          "b",
          "c",
        ],
      ]
    `);
    expect(result['--']).toMatchInlineSnapshot(`[]`);
  });

  it('captures spread argument values in matched arguments', () => {
    const app = breadc('cli');
    app.command('echo [...rest]');

    const result = app.parse(['echo', 'a', 'b']);
    expect(result.context.arguments.map((arg) => arg.raw)).toMatchInlineSnapshot(`
      [
        [
          "a",
          "b",
        ],
      ]
    `);
  });

  it('marks spread arguments when parsing', () => {
    const app = breadc('cli');
    app.command('echo [...rest]');

    const result = app.parse(['echo', 'a']);
    expect(result.context.arguments.map((arg) => arg.argument.type)).toMatchInlineSnapshot(`
      [
        "spread",
      ]
    `);
  });

  it('fulfills required, optional and spread arguments for default command', () => {
    const app = breadc('cli');
    app.command('<first> [second] [...rest]');

    const result = app.parse(['a', 'b', 'c', 'd']);
    expect(result.args).toMatchInlineSnapshot(`
      [
        "a",
        "b",
        [
          "c",
          "d",
        ],
      ]
    `);
  });

  it('fulfills spread arguments for default command', () => {
    const app = breadc('cli');
    app.command('<first> [...rest]');

    const result = app.parse(['a', 'b', 'c']);
    expect(result.args).toMatchInlineSnapshot(`
      [
        "a",
        [
          "b",
          "c",
        ],
      ]
    `);
  });

  it('respects manual argument default/initial values when omitted', () => {
    const app = breadc('cli');
    app
      .command('echo')
      .argument('[name]', { initial: 'seed' })
      .argument('[...rest]', { default: ['fallback'] });

    const result1 = app.parse(['echo']);
    expect(result1.args).toMatchInlineSnapshot(`
      [
        "seed",
        [
          "fallback",
        ],
      ]
    `);

    const result2 = app.parse(['echo', 'alice']);
    expect(result2.args).toMatchInlineSnapshot(`
      [
        "alice",
        [
          "fallback",
        ],
      ]
    `);

    const result3 = app.parse(['echo', 'alice', 'x', 'y']);
    expect(result3.args).toMatchInlineSnapshot(`
      [
        "alice",
        [
          "x",
          "y",
        ],
      ]
    `);
  });
});

describe('runtime/parser: options', () => {
  it('parses short boolean options', () => {
    const app = breadc('cli');
    app.option('-f, --flag');

    const result = app.parse<unknown[], { flag: boolean }>(['-f']);
    expect(result.options).toMatchInlineSnapshot(`
      {
        "flag": true,
      }
    `);
  });

  it('parses short boolean options with value', () => {
    const app = breadc('cli');
    app.option('-f, --flag');

    const read = (arg: string) => app.parse<unknown[], { flag: boolean }>([arg]).options.flag;

    expect(read('-f=YES')).toMatchInlineSnapshot(`true`);
    expect(read('-f=T')).toMatchInlineSnapshot(`true`);
    expect(read('-f=No')).toMatchInlineSnapshot(`false`);
    expect(read('-f=f')).toMatchInlineSnapshot(`false`);
  });

  it('parses required option values', () => {
    const app = breadc('cli');
    app.option('-o, --output <value>');

    expect(app.parse([]).options).toMatchInlineSnapshot(`
      {
        "output": undefined,
      }
    `);
    expect(() => app.parse(['-o'])).toThrowError(`${RuntimeError.REQUIRED_OPTION_VALUE_MISSING}: --output`);
    expect(app.parse(['-o=file']).options).toMatchInlineSnapshot(`
      {
        "output": "file",
      }
    `);
    expect(app.parse(['-o', 'file']).options).toMatchInlineSnapshot(`
      {
        "output": "file",
      }
    `);
  });

  it.each([['--output'], ['-o'], ['-ao'], ['--output', '--'], ['-o', '--'], ['-ao', '--', 'file']])(
    'rejects missing required option values in %j',
    (...argv) => {
      const app = breadc('cli').option('-a, --all').option('-o, --output <value>');
      expect(() => app.parse(argv)).toThrowError(`${RuntimeError.REQUIRED_OPTION_VALUE_MISSING}: --output`);
    }
  );

  it.each([['--output='], ['--output', ''], ['-o='], ['-o', ''], ['-ao=']])(
    'accepts explicit empty required option values in %j',
    (...argv) => {
      const app = breadc('cli').option('-a, --all').option('-o, --output <value>');
      expect(app.parse(argv).options.output).toBe('');
    }
  );

  it.each(['seed', ''])('preserves required option initial fallback %j', (initial) => {
    const app = breadc('cli').option('-o, --output <value>', '', { initial });
    expect(app.parse([]).options.output).toBe(initial);
    expect(app.parse(['--output']).options.output).toBe(initial);
    expect(app.parse(['-o', '--', 'file'])['--']).toEqual(['file']);
    expect(app.parse(['--output=file']).options.output).toBe('file');
  });

  it('does not use default or cast to conceal a missing required option value', () => {
    const app = breadc('cli').option('--output <value>', '', {
      default: 'default.txt',
      cast: (value) => value ?? 'cast.txt'
    });
    expect(app.parse([]).options.output).toBe('default.txt');
    expect(() => app.parse(['--output'])).toThrowError(RuntimeError.REQUIRED_OPTION_VALUE_MISSING);
  });

  it.each([false, true])('rejects missing values on a default command (group: %s)', (grouped) => {
    const app = breadc('cli');
    const parent = grouped ? app.group('tool') : app;
    parent.command('[message]').option('--output <value>');
    parent.command('other');
    expect(() => app.parse([...(grouped ? ['tool'] : []), '--output'])).toThrowError(
      `${RuntimeError.REQUIRED_OPTION_VALUE_MISSING}: --output`
    );
  });

  it('parses optional option values', () => {
    const app = breadc('cli');
    app.option('-o, --output [value]');

    expect(app.parse<unknown[], { output: boolean | string }>(['-o']).options).toMatchInlineSnapshot(`
      {
        "output": true,
      }
    `);
    expect(app.parse<unknown[], { output: boolean | string }>(['-o', 'file']).options).toMatchInlineSnapshot(`
      {
        "output": "file",
      }
    `);
  });

  it('parses spread option values', () => {
    const app = breadc('cli');
    app.option('-s, --include [...value]');

    const result = app.parse<unknown[], { include: string[] }>(['-s=a', '-s=b']);
    expect(result.options.include).toMatchInlineSnapshot(`
      [
        "a",
        "b",
      ]
    `);
  });

  it('supports explicit positive and negative boolean forms', () => {
    const app = breadc('cli').option('--[no-]open');

    expect(app.parse(['--open']).options.open).toMatchInlineSnapshot(`true`);
    expect(app.parse(['--open=true']).options.open).toMatchInlineSnapshot(`true`);
    expect(app.parse(['--open', 'true']).options.open).toMatchInlineSnapshot(`true`);
    expect(app.parse(['--open=false']).options.open).toMatchInlineSnapshot(`false`);
    expect(app.parse(['--open', 'false']).options.open).toMatchInlineSnapshot(`true`);
    expect(app.parse(['--open=f']).options.open).toMatchInlineSnapshot(`false`);
    expect(app.parse(['--open', 'f']).options.open).toMatchInlineSnapshot(`true`);
    expect(app.parse(['--open=no']).options.open).toMatchInlineSnapshot(`false`);
    expect(app.parse(['--open', 'no']).options.open).toMatchInlineSnapshot(`true`);
    expect(app.parse(['--open=n']).options.open).toMatchInlineSnapshot(`false`);
    expect(app.parse(['--open', 'n']).options.open).toMatchInlineSnapshot(`true`);
    expect(app.parse(['--open=off']).options.open).toMatchInlineSnapshot(`false`);
    expect(app.parse(['--open', 'off']).options.open).toMatchInlineSnapshot(`true`);
    expect(app.parse(['--no-open']).options.open).toMatchInlineSnapshot(`false`);
    expect(app.parse(['--no-open=true']).options.open).toMatchInlineSnapshot(`false`);
    expect(app.parse(['--no-open', 'true']).options.open).toMatchInlineSnapshot(`false`);
    expect(app.parse(['--no-open=false']).options.open).toMatchInlineSnapshot(`true`);
    expect(app.parse(['--no-open', 'false']).options.open).toMatchInlineSnapshot(`false`);
    expect(app.parse(['--no-open=f']).options.open).toMatchInlineSnapshot(`true`);
    expect(app.parse(['--no-open', 'f']).options.open).toMatchInlineSnapshot(`false`);
    expect(app.parse(['--no-open=no']).options.open).toMatchInlineSnapshot(`true`);
    expect(app.parse(['--no-open', 'no']).options.open).toMatchInlineSnapshot(`false`);
    expect(app.parse(['--no-open=n']).options.open).toMatchInlineSnapshot(`true`);
    expect(app.parse(['--no-open', 'n']).options.open).toMatchInlineSnapshot(`false`);
    expect(app.parse(['--no-open=off']).options.open).toMatchInlineSnapshot(`true`);
    expect(app.parse(['--no-open', 'off']).options.open).toMatchInlineSnapshot(`false`);
  });

  it('applies option default/initial/cast semantics', () => {
    const app = breadc('cli')
      .option('-f, --[no-]flag', '', {
        default: true,
        cast: (t) => (t ? 'on' : 'off')
      })
      .option('-o, --output [value]', '', {
        initial: 'seed',
        cast: (t) => String(t)
      });

    expect(app.parse(['-f']).options).toMatchInlineSnapshot(`
      {
        "flag": "on",
        "output": "seed",
      }
    `);
    expect(app.parse(['--flag']).options).toMatchInlineSnapshot(`
      {
        "flag": "on",
        "output": "seed",
      }
    `);
    expect(app.parse(['--flag=true']).options).toMatchInlineSnapshot(`
      {
        "flag": "on",
        "output": "seed",
      }
    `);
    expect(app.parse(['--flag=false']).options).toMatchInlineSnapshot(`
      {
        "flag": "off",
        "output": "seed",
      }
    `);
    expect(app.parse(['--no-flag']).options).toMatchInlineSnapshot(`
      {
        "flag": "off",
        "output": "seed",
      }
    `);
    expect(app.parse(['--no-flag=true']).options).toMatchInlineSnapshot(`
      {
        "flag": "off",
        "output": "seed",
      }
    `);
    expect(app.parse(['--no-flag=false']).options).toMatchInlineSnapshot(`
      {
        "flag": "on",
        "output": "seed",
      }
    `);

    expect(app.parse(['-o']).options).toMatchInlineSnapshot(`
      {
        "flag": true,
        "output": "seed",
      }
    `);
    expect(app.parse(['--output']).options).toMatchInlineSnapshot(`
      {
        "flag": true,
        "output": "seed",
      }
    `);
    expect(app.parse(['--output=dirty']).options).toMatchInlineSnapshot(`
      {
        "flag": true,
        "output": "dirty",
      }
    `);
    expect(app.parse(['--output', 'dirty']).options).toMatchInlineSnapshot(`
      {
        "flag": true,
        "output": "dirty",
      }
    `);
  });

  it('parse long options', () => {
    const app = breadc('cli').option('--flag').option('--mode [value]');
    app.command('echo');

    const result1 = app.parse(['echo', '--flag']);
    expect(result1.options).toMatchInlineSnapshot(`
      {
        "flag": true,
        "mode": false,
      }
    `);

    const result2 = app.parse(['echo', '--flag=NO']);
    expect(result2.options).toMatchInlineSnapshot(`
      {
        "flag": false,
        "mode": false,
      }
    `);

    const result3 = app.parse(['echo', '--mode=fast']);
    expect(result3.options).toMatchInlineSnapshot(`
      {
        "flag": false,
        "mode": "fast",
      }
    `);

    const result4 = app.parse(['echo', '--mode', 'fast']);
    expect(result4.options).toMatchInlineSnapshot(`
      {
        "flag": false,
        "mode": "fast",
      }
    `);
  });

  it('supports -- escape and options["--"]', () => {
    const app = breadc('cli');
    app.command('echo [message]');

    const result = app.parse(['echo', '--', 'hello', 'world']);
    expect(result.args).toMatchInlineSnapshot(`
      [
        undefined,
      ]
    `);
    expect(result['--']).toMatchInlineSnapshot(`
      [
        "hello",
        "world",
      ]
    `);
  });

  it('maps option keys to camelCase', () => {
    const app = breadc('cli');
    app.option('--allow-page');
    app.command('echo');

    const result = app.parse<unknown[], { allowPage: boolean }>(['echo', '--allow-page']);
    expect(result.options).toMatchInlineSnapshot(`
      {
        "allowPage": true,
      }
    `);
  });
});

describe('runtime/parser: unknown options', () => {
  it.each(['--typo', '--typo=x', '-x', '-x=value', '--no-typo'])('rejects unknown option %s by default', (option) => {
    const app = breadc('cli');
    const name = option.split('=')[0];
    expect(() => app.parse([option])).toThrowError(`${RuntimeError.UNKNOWN_OPTION}: ${name}`);
  });

  it('rejects unknown options before matching positional arguments', () => {
    const app = breadc('cli');
    app.command('echo <message>');

    for (const argv of [
      ['echo', '--typo', 'x'],
      ['echo', '--typo']
    ]) {
      expect(() => app.parse(argv)).toThrowError(`${RuntimeError.UNKNOWN_OPTION}: --typo`);
    }
  });

  it('includes the option and matched command in the runtime error', () => {
    const app = breadc('cli');
    const command = app.group('tool').command('echo');

    expect(() => app.parse(['tool', 'echo', '--typo=x'])).toThrowError(
      expect.objectContaining({
        cause: { name: '--typo', value: 'x' },
        context: expect.objectContaining({ command })
      })
    );
  });

  it.each([false, true])('validates options after resolving a default command (group: %s)', (grouped) => {
    const app = breadc('cli');
    const parent = grouped ? app.group('tool') : app;
    const prefix = grouped ? ['tool'] : [];
    parent.command('[message]').option('--output <file>');
    parent.command('other');

    const result = app.parse([...prefix, '--output', 'file', 'hello']);
    expect(result.options).toEqual({ output: 'file' });
    expect(result.args).toEqual(['hello']);
    expect(() => app.parse([...prefix, '--typo', 'x'])).toThrowError(`${RuntimeError.UNKNOWN_OPTION}: --typo`);
  });

  it.each([false, true])('honors default command unknown-option middleware (group: %s)', (grouped) => {
    const app = breadc('cli');
    const parent = grouped ? app.group('tool') : app;
    parent.command('[message]').allowUnknownOption();
    parent.command('other');

    const result = app.parse([...(grouped ? ['tool'] : []), '--typo', 'x', 'hello']);
    expect(result.options).toEqual({ typo: 'x' });
    expect(result.args).toEqual(['hello']);
  });

  it.each([false, true])('validates only the final fallback result (group: %s)', (grouped) => {
    const app = breadc('cli');
    const parent = grouped ? app.group('tool') : app;
    const prefix = grouped ? ['tool'] : [];
    const command = parent.command('<message>').option('--output <file>');
    parent.command('other');

    // --output is unknown on the first pass, but declared by the fallback command.
    expect(() => app.parse([...prefix, '--output=file', '--typo=x'])).toThrowError(
      expect.objectContaining({
        message: `${RuntimeError.UNKNOWN_OPTION}: --typo`,
        cause: { name: '--typo', value: 'x' },
        context: expect.objectContaining({ command, arguments: [] })
      })
    );
    expect(() => app.parse([...prefix, '--output=file'])).toThrowError(RuntimeError.REQUIRED_ARGUMENT_MISSING);
  });

  it('rejects unknown options when no group command matches', () => {
    const app = breadc('cli');
    app.group('tool').command('run');
    expect(() => app.parse(['tool', '--typo'])).toThrowError(`${RuntimeError.UNKNOWN_OPTION}: --typo`);
  });

  it('preserves escaped options, negative numbers and stdio arguments', () => {
    const app = breadc('cli');
    app.command('echo [...args]');
    const result = app.parse(['echo', '-1', '-', '--', '--typo', 'x']);
    expect(result.args).toEqual([['-1', '-']]);
    expect(result['--']).toEqual(['--typo', 'x']);
  });

  it.each(['--help', '--version'])('rejects unknown options alongside %s', (builtin) => {
    expect(() => breadc('cli').parse(['--typo', builtin])).toThrowError(`${RuntimeError.UNKNOWN_OPTION}: --typo`);
  });

  it('allows unknown options', () => {
    const app = breadc('cli').allowUnknownOption();

    const result1 = app.parse(['--flag']);
    expect(result1.options).toMatchInlineSnapshot(`
      {
        "flag": true,
      }
    `);

    const result2 = app.parse(['--test', 'foo']);
    expect(result2.options).toMatchInlineSnapshot(`
      {
        "test": "foo",
      }
    `);

    const result3 = app.parse(['-x', 'foo']);
    expect(result3.options).toMatchInlineSnapshot(`
      {
        "x": "foo",
      }
    `);
  });

  it('allows unknown options at app level', () => {
    const app = breadc('cli').allowUnknownOption();

    const result = app.parse(['-x', 'foo']);
    expect(result.options).toMatchInlineSnapshot(`
      {
        "x": "foo",
      }
    `);
  });

  it('allows unknown options at app level with custom middleware', () => {
    const app = breadc('cli').allowUnknownOption((_ctx, key, value) => ({
      name: key,
      value
    }));

    const result = app.parse(['-x', 'foo']);
    expect(result.options).toMatchInlineSnapshot(`
      {
        "x": "foo",
      }
    `);
  });

  it('accepts unknown option values via middleware type', () => {
    const app = breadc('cli').allowUnknownOption((_ctx, key, value) => ({
      name: key,
      value,
      type: 'required'
    }));

    const result = app.parse(['-x', 'foo']);
    expect(result.options).toMatchInlineSnapshot(`
      {
        "x": "foo",
      }
    `);
  });

  it.each([null, undefined])('rejects unknown options when middleware returns %s', (result) => {
    const app = breadc('cli').allowUnknownOption(() => result);
    expect(() => app.parse(['-x', 'foo'])).toThrowError(`${RuntimeError.UNKNOWN_OPTION}: -x`);
  });

  it('continues through middleware until an unknown option is accepted', () => {
    const app = breadc('cli').allowUnknownOption(() => undefined);
    app
      .group('tool')
      .allowUnknownOption(() => null)
      .command('echo [message]')
      .allowUnknownOption();

    const result = app.parse(['tool', 'echo', '--typo', 'x', 'hello']);
    expect(result.options).toEqual({ typo: 'x' });
    expect(result.args).toEqual(['hello']);
  });

  it('allows unknown options at group level', () => {
    const app = breadc('cli');
    const group = app.group('tool').allowUnknownOption((_ctx, key, value) => ({
      name: key,
      value
    }));
    group.command('run');

    const result = app.parse(['tool', 'run', '-x', 'foo']);
    expect(result.options).toMatchInlineSnapshot(`
      {
        "x": "foo",
      }
    `);
  });

  it('allows unknown options at group level with boolean', () => {
    const app = breadc('cli');
    const group = app.group('tool').allowUnknownOption();
    group.command('run');

    const result = app.parse(['tool', 'run', '-x', 'foo']);
    expect(result.options).toMatchInlineSnapshot(`
      {
        "x": "foo",
      }
    `);
  });

  it('allows unknown options at command level', () => {
    const app = breadc('cli');
    app.command('echo').allowUnknownOption((_ctx, key, value) => ({
      name: key,
      value
    }));

    const result = app.parse(['echo', '-x', 'foo']);
    expect(result.options).toMatchInlineSnapshot(`
      {
        "x": "foo",
      }
    `);
  });

  it('allows unknown options at command level with boolean', () => {
    const app = breadc('cli');
    app.command('echo').allowUnknownOption();

    const result = app.parse(['echo', '-x', 'foo']);
    expect(result.options).toMatchInlineSnapshot(`
      {
        "x": "foo",
      }
    `);
  });
});

describe('runtime/parser: option layering', () => {
  it('prefers command options over group and app options', () => {
    const app = breadc('cli');
    app.option('-f, --flag', '', { cast: () => 'app' });
    const group = app.group('store').option('-f, --flag', '', {
      cast: () => 'group'
    });
    group.command('ls').option('-f, --flag', '', {
      cast: () => 'command'
    });

    const result = app.parse<unknown[], { flag: string }>(['store', 'ls', '-f']);
    expect(result.options).toMatchInlineSnapshot(`
      {
        "flag": "command",
      }
    `);
  });

  it('keeps app options when parsed before group resolution', () => {
    const app = breadc('cli');
    app.option('-f, --flag', '', { cast: () => 'app' });
    const group = app.group('store').option('-f, --flag', '', {
      cast: () => 'group'
    });
    group.command('ls').option('-f, --flag', '', {
      cast: () => 'command'
    });

    const result = app.parse<unknown[], { flag: string }>(['-f', 'store', 'ls']);
    expect(result.options).toMatchInlineSnapshot(`
      {
        "flag": "command",
      }
    `);
  });

  it('supports options["--"] alongside layered options', () => {
    const app = breadc('cli').option('--root');
    const group = app.group('tool');
    group.command('run').option('--flag');

    const result = app.parse<unknown[], { root: boolean; flag: boolean }>([
      'tool',
      'run',
      '--root',
      '--flag',
      '--',
      'a',
      'b'
    ]);
    expect(result.args).toMatchInlineSnapshot(`[]`);
    expect(result.options).toMatchInlineSnapshot(`
      {
        "flag": true,
        "root": true,
      }
    `);
    expect(result['--']).toMatchInlineSnapshot(`
      [
        "a",
        "b",
      ]
    `);
  });
});

describe('runtime/parser: other rules', () => {
  it('treats negative numbers as arguments, not short options', () => {
    const app = breadc('cli').option('-n, --number <value>');
    app.command('calc <value>');

    const result = app.parse(['calc', '-1']);
    expect(result.args).toMatchInlineSnapshot(`
      [
        "-1",
      ]
    `);
    expect(result.options).toMatchInlineSnapshot(`
      {
        "number": undefined,
      }
    `);
  });

  it('resolves app options for default command', () => {
    const app = breadc('cli').option('-f, --flag');
    app.command('<name>');

    const result = app.parse(['hello', '-f']);
    expect(result.args).toMatchInlineSnapshot(`
      [
        "hello",
      ]
    `);
    expect(result.options).toMatchInlineSnapshot(`
      {
        "flag": true,
      }
    `);
  });
});

describe('runtime/parser: errors', () => {
  it.each([
    ['echo', ['echo', 'a']],
    ['echo <file>', ['echo', 'a', 'b']],
    ['echo [file]', ['echo', 'a', 'b']],
    ['echo <first> [second]', ['echo', 'a', 'b', 'c']],
    ['echo <file>', ['echo', 'a', 'b', '--', 'c']],
    ['<file>', ['a', 'b']]
  ])('rejects excess positional arguments for %s with %j', (spec, argv) => {
    const app = breadc('cli');
    app.command(spec);

    expect(() => app.parse(argv)).toThrowError(RuntimeError.UNEXPECTED_ARGUMENTS);
  });

  it('rejects excess positional arguments after falling back to a default command', () => {
    const app = breadc('cli');
    app.command('<file>');
    app.command('dev');

    expect(() => app.parse(['a', 'b'])).toThrowError(RuntimeError.UNEXPECTED_ARGUMENTS);
  });

  it('rejects excess positional arguments for group commands and group defaults', () => {
    const app = breadc('cli');
    const group = app.group('tool');
    group.command('<file>');
    group.command('echo <file>');

    expect(() => app.parse(['tool', 'a', 'b'])).toThrowError(RuntimeError.UNEXPECTED_ARGUMENTS);
    expect(() => app.parse(['tool', 'echo', 'a', 'b'])).toThrowError(RuntimeError.UNEXPECTED_ARGUMENTS);
  });

  it('throws on missing required arguments', () => {
    const app = breadc('cli');
    app.command('echo <name>');

    expect(() => app.parse(['echo'])).toThrowError(RuntimeError);
  });

  it('throws on duplicated default command', () => {
    const app = breadc('cli');
    app.command('<one>');
    app.command('<two>');

    expect(() => app.parse(['value'])).toThrowError(BreadcAppError);
  });

  it('throws on duplicated group pieces', () => {
    const app = breadc('cli');
    app.group('store').command('ls');
    app.group('store').command('rm');

    expect(() => app.parse(['store', 'ls'])).toThrowError(BreadcAppError.DUPLICATED_GROUP);
  });

  it('throws on duplicated command pieces', () => {
    const app = breadc('cli');
    app.command('dev');
    app.command('dev');

    expect(() => app.parse(['dev'])).toThrowError(BreadcAppError.DUPLICATED_COMMAND);
  });

  it('throws on duplicated candidate commands with shared literal prefix', () => {
    const app = breadc('cli');
    app.command('subject <one>');
    app.command('subject <two>');

    expect(() => app.parse(['subject', 'value'])).toThrowError(BreadcAppError.DUPLICATED_COMMAND);
  });

  it('throws on duplicated default commands inside a matched group', () => {
    const app = breadc('cli');
    const store = app.group('store');
    store.command('<one>');
    store.command('<two>');

    expect(() => app.parse(['store', 'value'])).toThrowError(BreadcAppError.DUPLICATED_DEFAULT_GROUP_COMMAND);
  });

  it('throws when unknown arguments appear before matched group default command', () => {
    const app = breadc('cli');
    const store = app.group('store');
    store.command('<name>');
    store.command('ls');

    expect(() => app.parse(['unknown', 'store', 'readme.md'])).toThrowError(RuntimeError.UNEXPECTED_ARGUMENTS);
  });
});

describe('runtime/parser: boolean option forms', () => {
  it.each([
    { spec: '--all', initial: false, positive: ['--all'], negative: [], unknown: ['--no-all'] },
    { spec: '--no-all', initial: true, positive: [], negative: ['--no-all'], unknown: ['--all'] },
    { spec: '--[no-]all', initial: false, positive: ['--all'], negative: ['--no-all'], unknown: [] },
    { spec: '-a, --[no-]all', initial: false, positive: ['--all', '-a'], negative: ['--no-all'], unknown: [] },
    { spec: '-a, --no-all', initial: true, positive: [], negative: ['--no-all', '-a'], unknown: ['--all'] }
  ])('accepts only the declared forms of $spec', ({ spec, initial, positive, negative, unknown }) => {
    const app = breadc('cli').option(spec);
    expect(app.parse([]).options).toEqual({ all: initial });
    for (const name of positive) {
      expect(app.parse([name]).options).toEqual({ all: true });
      expect(app.parse([`${name}=false`]).options).toEqual({ all: false });
    }
    for (const name of negative) {
      expect(app.parse([name]).options).toEqual({ all: false });
      expect(app.parse([`${name}=false`]).options).toEqual({ all: true });
      expect(app.parse([`${name}=true`]).options).toEqual({ all: false });
    }
    for (const name of unknown) {
      expect(() => app.parse([name])).toThrowError(`${RuntimeError.UNKNOWN_OPTION}: ${name}`);
    }
    expect(() => app.parse(['--[no-]all'])).toThrowError(RuntimeError.UNKNOWN_OPTION);
  });

  it.each(['--no-all', '--[no-]all', '-a, --no-all', '-a, --[no-]all'])(
    'rejects value arguments on %s on every parse',
    (spec) => {
      for (const suffix of ['<value>', '[value]', '[...value]']) {
        const app = breadc('cli').option(`${spec} ${suffix}`);
        for (let i = 0; i < 2; i++) {
          expect(() => app.parse([])).toThrowError(ResolveOptionError.INVALID_OPTION);
        }
      }
    }
  );

  it.each(['--[no-]', '--[no]all', '--[no-]all[no-]', '-ab, --[no-]all'])('rejects malformed spec %s', (spec) => {
    expect(() => breadc('cli').option(spec).parse([])).toThrowError(ResolveOptionError.INVALID_OPTION);
  });

  it('uses explicit initial and default values independently of the form', () => {
    const app = breadc('cli')
      .option('--no-all', '', { initial: false })
      .option('--[no-]open', '', { initial: true })
      .option('--no-cache', '', { default: false });
    expect(app.parse([]).options).toEqual({ all: false, open: true, cache: false });
    expect(app.parse(['--no-all=false', '--no-open', '--no-cache=false']).options).toEqual({
      all: true,
      open: false,
      cache: true
    });
  });

  it('casts the resolved boolean and preserves default precedence', () => {
    const cast = vi.fn((value: boolean) => (value ? 'on' : 'off'));
    const app = breadc('cli').option('--no-all', '', { cast });
    expect(app.parse([]).options.all).toBe('on');
    expect(cast).toHaveBeenLastCalledWith(true);
    expect(app.parse(['--no-all']).options.all).toBe('off');
    expect(cast).toHaveBeenLastCalledWith(false);
    expect(app.parse(['--no-all=false']).options.all).toBe('on');

    cast.mockClear();
    const withDefault = breadc('cli').option('--no-all', '', { cast, default: 'default' });
    expect(withDefault.parse([]).options.all).toBe('default');
    expect(cast).not.toHaveBeenCalled();
    expect(withDefault.parse(['--no-all']).options.all).toBe('off');
  });

  it('uses positive and negative short aliases in combinations', () => {
    const app = breadc('cli').option('-a, --[no-]all').option('-b, --no-brief');
    expect(app.parse(['-ab']).options).toEqual({ all: true, brief: false });
    expect(app.parse(['-ab=false']).options).toEqual({ all: true, brief: true });
    const result = app.parse(['-ab', 'false']);
    expect(result.options).toEqual({ all: true, brief: false });
    expect(result.args).toEqual(['false']);
  });

  it.each([['--all', '--no-all'], ['--no-all', '--all'], ['-a', '--no-all'], ['-aa']])(
    'shares assignment state for %j',
    (...argv) => {
      expect(() => breadc('cli').option('-a, --[no-]all').parse(argv)).toThrowError(
        RuntimeError.BOOLEAN_OPTION_ACCEPT_ONCE
      );
    }
  );

  it('reports the actual spelling of a repeated negative short alias', () => {
    expect(() => breadc('cli').option('-a, --no-all').parse(['--no-all', '-a'])).toThrowError(
      expect.objectContaining({ cause: expect.objectContaining({ name: 'a' }) })
    );
  });

  it('uses forms at app, group and command scope', () => {
    const app = breadc('cli').option('--[no-]global');
    app.group('tool').option('--no-cache').command('run').option('-a, --[no-]all');
    expect(app.parse(['--no-global', 'tool', '--no-cache', 'run', '-a']).options).toEqual({
      global: false,
      cache: false,
      all: true
    });
  });

  it.each(['--all', '--no-all', '--all <value>'])(
    'removes previous spellings when a command overrides an option with %s',
    (spec) => {
      const app = breadc('cli').option('-a, --[no-]all');
      app.command('run').option(spec);
      const accepted = spec === '--all <value>' ? ['--all', 'value'] : [spec];
      expect(app.parse(['run', ...accepted]).options.all).toBe(spec === '--all <value>' ? 'value' : spec === '--all');
      const rejected = spec === '--no-all' ? '--all' : '--no-all';
      for (const name of [rejected, '-a']) {
        expect(() => app.parse(['run', name])).toThrowError(`${RuntimeError.UNKNOWN_OPTION}: ${name}`);
      }
    }
  );

  it('preserves a short name reassigned to a different option when overriding', () => {
    const app = breadc('cli').option('-a, --[no-]all').option('-a, --another');
    app.command('run').option('--all');
    expect(app.parse(['run', '-a']).options).toEqual({ all: false, another: true });
  });

  it('replays negative forms for app and group default commands', () => {
    const app = breadc('cli');
    app.command('[name]').option('--[no-]all');
    app.command('other');
    expect(app.parse(['--no-all', 'name']).options).toEqual({ all: false });

    const grouped = breadc('cli');
    const group = grouped.group('tool');
    group.command('[name]').option('--[no-]all');
    group.command('other');
    expect(grouped.parse(['tool', '--no-all', 'name']).options).toEqual({ all: false });
  });

  it('does not generate negative forms for default built-ins', () => {
    for (const name of ['--no-help', '--no-version']) {
      expect(() => breadc('cli').parse([name])).toThrowError(`${RuntimeError.UNKNOWN_OPTION}: ${name}`);
    }
  });

  it('honors forms in custom built-in specs', () => {
    const app = breadc('cli', { builtin: { help: { spec: '-h, --[no-]help' }, version: { spec: '--no-version' } } });
    expect(app.parse(['--no-help']).options).toEqual({ help: false });
    expect(app.parse(['-h']).options).toEqual({ help: true });
    expect(app.parse(['--no-version']).options).toEqual({ version: false });
    expect(() => app.parse(['--version'])).toThrowError(RuntimeError.UNKNOWN_OPTION);
  });

  it('does not infer negation from names accepted by unknown-option middleware', () => {
    const app = breadc('cli').allowUnknownOption((_context, name, value) => ({ name, value, type: 'boolean' }));
    expect(app.parse(['--no-all']).options).toEqual({ noAll: true });
    expect(app.parse(['--no-all=false']).options).toEqual({ noAll: false });
  });
});

describe('runtime/parser: short option combinations', () => {
  const createApp = () => breadc('cli').option('-a, --all').option('-b, --[no-]brief').option('-o, --output <file>');

  it.each([['-o', 'file'], ['-o=file'], ['-ofile'], ['-abo', 'file'], ['-abo=file'], ['-abofile']])(
    'parses short option values from %j',
    (...argv) => {
      const combined = argv[0].startsWith('-ab');
      expect(createApp().parse(argv).options).toEqual({ all: combined, brief: combined, output: 'file' });
    }
  );

  it('combines boolean options from left to right', () => {
    expect(createApp().parse(['-ab']).options).toEqual({ all: true, brief: true, output: undefined });
  });

  it('keeps declared option letters inside an attached value', () => {
    expect(createApp().parse(['-oab']).options).toEqual({ all: false, brief: false, output: 'ab' });
  });

  it.each([
    ['-a, --alpha', '-b, --beta', { alpha: true, beta: true, charlie: true }],
    ['-a, --alpha', '-b, --beta <value>', { alpha: true, beta: 'c', charlie: false }],
    ['-a, --alpha <value>', '-b, --beta', { alpha: 'bc', beta: false, charlie: false }]
  ])('resolves -abc using %s and %s', (alpha, beta, expected) => {
    const app = breadc('cli').option(alpha).option(beta).option('-c, --charlie');
    expect(app.parse(['-abc']).options).toEqual(expected);
  });

  it.each([
    ['-abo=', ''],
    ['-abo==file', '=file'],
    ['-abofile=name', 'file=name'],
    ['-abo-1', '-1'],
    ['-abo--', '--'],
    ['-abo--brief', '--brief']
  ])('preserves attached value boundaries in %s', (arg, output) => {
    const app = createApp();
    app.command('[rest]');
    const result = app.parse([arg, 'next']);
    expect(result.options).toEqual({ all: true, brief: true, output });
    expect(result.args).toEqual(['next']);
  });

  it.each([
    ['-ab=false', false],
    ['-ab=NO', false],
    ['-ab=YES', true],
    ['-ab=', true]
  ])('applies explicit boolean values to the last flag in %s', (arg, brief) => {
    expect(createApp().parse([arg]).options).toEqual({ all: true, brief, output: undefined });
  });

  it('does not consume a separate boolean value', () => {
    const app = createApp();
    app.command('[rest]');
    const result = app.parse(['-ab', 'false']);
    expect(result.options).toEqual({ all: true, brief: true, output: undefined });
    expect(result.args).toEqual(['false']);
  });

  it.each([
    ['-o, --output <value>', 'file'],
    ['-o, --output [value]', 'file'],
    ['-o, --output [...value]', ['file']]
  ])('supports all attached forms for %s', (spec, output) => {
    const app = breadc('cli').option('-a, --all').option(spec);
    for (const argv of [['-aofile'], ['-ao=file'], ['-ao', 'file']]) {
      expect(app.parse(argv).options).toEqual({ all: true, output });
    }
  });

  it.each([
    ['-o, --output [value]', true, true, true],
    ['-o, --output [...value]', [''], [''], true]
  ])('preserves following-token rules for %s', (spec, missing, beforeOption, brief) => {
    const app = breadc('cli').option('-a, --all').option('-b, --brief').option(spec);
    expect(app.parse(['-ao']).options.output).toEqual(missing);
    expect(app.parse(['-ao', '--brief']).options).toEqual({ all: true, brief, output: beforeOption });
    expect(app.parse(['-ao', '-1']).options.output).toEqual(spec.includes('...') ? ['-1'] : '-1');

    const escaped = app.parse(['-ao', '--', '-ab']);
    expect(escaped.options).toEqual({ all: true, brief: false, output: missing });
    expect(escaped['--']).toEqual(['-ab']);
  });

  it('rejects a following option as a required value but accepts a negative number', () => {
    const app = createApp();
    expect(() => app.parse(['-ao', '--brief'])).toThrowError(RuntimeError.REQUIRED_OPTION_VALUE_MISSING);
    expect(app.parse(['-ao', '-1']).options.output).toBe('-1');
  });

  it('ends an optional option combination at its attached value', () => {
    const app = breadc('cli').option('-a, --all').option('-o, --output [value]').option('-b, --brief');
    expect(app.parse(['-aob']).options).toEqual({ all: true, output: 'b', brief: false });
    expect(app.parse(['-ao=']).options.output).toBe('');
  });

  it('accumulates repeated spread options', () => {
    const app = breadc('cli').option('-a, --all').option('-s, --include [...value]');
    expect(app.parse(['-asfirst', '-s=second', '-s', 'third', '-s=']).options).toEqual({
      all: true,
      include: ['first', 'second', 'third', '']
    });
    expect(app.parse(['-ss']).options.include).toEqual(['s']);
  });

  it.each([
    ['-a, --all', ['-aa'], RuntimeError.BOOLEAN_OPTION_ACCEPT_ONCE],
    ['-a, --all', ['-a', '-a=false'], RuntimeError.BOOLEAN_OPTION_ACCEPT_ONCE],
    ['-o, --output <value>', ['-ofile', '--output=again'], RuntimeError.REQUIRED_OPTION_ACCEPT_ONCE],
    ['-o, --output [value]', ['-ofile', '-oagain'], RuntimeError.OPTIONAL_OPTION_ACCEPT_ONCE]
  ])('preserves duplicate assignment errors for %s', (spec, argv, error) => {
    expect(() => breadc('cli').option(spec).parse(argv)).toThrowError(error);
  });

  it('applies existing initial, default and cast behavior', () => {
    const app = breadc('cli')
      .option('-a, --all', '', { default: true })
      .option('-o, --output [value]', '', { initial: 'seed', cast: (value) => String(value).toUpperCase() });
    expect(app.parse(['-ao']).options).toEqual({ all: true, output: 'SEED' });
    expect(app.parse(['-aofile']).options).toEqual({ all: true, output: 'FILE' });
  });

  it('uses app, group and command declarations in a combination', () => {
    const app = breadc('cli').option('-a, --all');
    app.group('tool').option('-b, --brief').command('run').option('-o, --output <value>');
    expect(app.parse(['tool', 'run', '-abofile']).options).toEqual({ all: true, brief: true, output: 'file' });
  });

  it('uses the most specific option type', () => {
    const app = breadc('cli').option('-a, --all').option('-o, --output');
    app.command('run').option('-o, --output <value>');
    expect(app.parse(['run', '-aofile']).options).toEqual({ all: true, output: 'file' });
  });

  it('replays combinations when resolving a default command', () => {
    const app = breadc('cli');
    app.command('[name]').option('-a, --all').option('-o, --output <value>');
    app.command('other');
    const result = app.parse(['-aofile', 'name']);
    expect(result.options).toEqual({ all: true, output: 'file' });
    expect(result.args).toEqual(['name']);
  });

  it('supports built-in options in a combination', () => {
    expect(createApp().parse(['-ah']).options).toMatchObject({ all: true, help: true });
    expect(createApp().parse(['-av']).options).toMatchObject({ all: true, version: true });
  });

  it('preserves long options, negative arguments, stdio and escape tokens', () => {
    const app = createApp();
    app.command('[...rest]');
    const result = app.parse(['--all', '--no-brief', '--output=file=name', '-12', '-', '--', '-abofile']);
    expect(result.options).toEqual({ all: true, brief: false, output: 'file=name' });
    expect(result.args).toEqual([['-12', '-']]);
    expect(result['--']).toEqual(['-abofile']);
  });

  it('continues to reject multi-character short option declarations', () => {
    expect(() => breadc('cli').option('-ab, --all').parse(['-ab'])).toThrowError(ResolveOptionError.INVALID_OPTION);
  });
});

describe('runtime/parser: unknown options in short combinations', () => {
  it.each(['-xyz=value', '-axyz=value'])('passes an unknown suffix intact to middleware for %s', (arg) => {
    const middleware = vi.fn((_context, key, value) => ({ name: key, value }));
    const app = breadc('cli').option('-a, --all').option('-z, --last').allowUnknownOption(middleware);
    expect(app.parse([arg]).options).toEqual({ all: arg.startsWith('-a'), last: false, xyz: 'value' });
    expect(middleware).toHaveBeenCalledExactlyOnceWith(expect.anything(), 'xyz', 'value');
  });

  it('preserves unknown middleware following-token behavior', () => {
    const app = breadc('cli').option('-a, --all').allowUnknownOption();
    expect(app.parse(['-axyz', 'value']).options).toEqual({ all: true, xyz: 'value' });
  });

  it('uses middleware types for unknown suffixes', () => {
    const app = breadc('cli')
      .option('-a, --all')
      .allowUnknownOption((_context, key, value) => ({ name: key, value, type: 'boolean' }));
    app.command('[rest]');
    const result = app.parse(['-axyz', 'value']);
    expect(result.options).toEqual({ all: true, xyz: true });
    expect(result.args).toEqual(['value']);
  });

  it('rejects an unknown suffix when no middleware accepts it', () => {
    const app = breadc('cli').option('-a, --all').option('-z, --last');
    app.command('[rest]');
    expect(() => app.parse(['-axyz', 'value'])).toThrowError(`${RuntimeError.UNKNOWN_OPTION}: -xyz`);
  });
});

const negativeNumbers = ['-2', '-0', '-02', '-2.5', '-.5', '-2.', '-2e3', '-2E-3', '-.5e+2', '-2.e-3', '-1e999'];
const optionLikeValues = [
  '--all',
  '--help',
  '--unknown',
  '-a',
  '-ab',
  '-2foo',
  '-2e',
  '-2e+',
  '-0x10',
  '-1_000',
  '-1j',
  '-Infinity',
  '-NaN'
];

describe('runtime/parser: option value boundaries', () => {
  it.each(['--output', '-o', '-ao'])('rejects option-like values after %s', (output) => {
    const app = breadc('cli').option('-a, --all').option('-b, --brief').option('-o, --output <value>');
    for (const value of optionLikeValues) {
      expect(() => app.parse([output, value]), value).toThrowError(
        `${RuntimeError.REQUIRED_OPTION_VALUE_MISSING}: --output`
      );
    }
  });

  it.each(['<value>', '[value]', '[...value]'] as const)('preserves negative decimal strings for %s', (kind) => {
    const app = breadc('cli').option('-a, --all').option(`-o, --output ${kind}`);
    for (const value of [...negativeNumbers, '-', '', '2foo']) {
      for (const output of ['--output', '-o', '-ao']) {
        expect(app.parse([output, value]).options.output, `${output} ${value}`).toEqual(
          kind === '[...value]' ? [value] : value
        );
      }
    }
  });

  it.each(['<value>', '[value]', '[...value]'] as const)('accepts explicit option-like values for %s', (kind) => {
    const app = breadc('cli').option('-a, --all').option(`-o, --output ${kind}`);
    for (const value of [...optionLikeValues, '--']) {
      for (const arg of [`--output=${value}`, `-o${value}`, `-ao=${value}`]) {
        expect(app.parse([arg]).options.output, arg).toEqual(kind === '[...value]' ? [value] : value);
      }
    }
  });

  it.each(['[value]', '[...value]'] as const)('leaves following flags and unknown options for %s', (kind) => {
    const app = breadc('cli').option('-a, --all').option(`-o, --output ${kind}`);
    const missing = kind === '[...value]' ? [''] : true;
    expect(app.parse(['--output', '--all']).options).toEqual({ all: true, output: missing });
    expect(isHelp(app.parse(['--output', '--help']).context)).toBe(true);
    for (const value of ['--unknown', '-2foo', '-2e']) {
      expect(() => app.parse(['--output', value])).toThrowError(`${RuntimeError.UNKNOWN_OPTION}: ${value}`);
    }
    const escaped = app.parse(['--output', '--', '-2foo']);
    expect(escaped.options.output).toEqual(missing);
    expect(escaped['--']).toEqual(['-2foo']);
  });

  it('preserves initial-value fallback without consuming a following option', () => {
    const app = breadc('cli').option('--output <value>', '', { initial: 'seed' }).option('--all');
    expect(app.parse(['--output', '--all']).options).toEqual({ output: 'seed', all: true });
    expect(() => app.parse(['--output', '--unknown'])).toThrowError(`${RuntimeError.UNKNOWN_OPTION}: --unknown`);
  });

  it.each([false, true])('applies value boundaries in fallback commands (grouped: %s)', (grouped) => {
    const app = breadc('cli').option('--all');
    const parent = grouped ? app.group('tool') : app;
    parent.command('[value]').option('--output <value>');
    parent.command('other');
    const prefix = grouped ? ['tool'] : [];
    const result = app.parse([...prefix, '--output', '-2e-3', '-.5']);
    expect(result.options).toMatchObject({ output: '-2e-3' });
    expect(result.args).toEqual(['-.5']);
    expect(() => app.parse([...prefix, '--output', '--all'])).toThrowError(RuntimeError.REQUIRED_OPTION_VALUE_MISSING);
  });

  it('applies the same boundary to options accepted by middleware', () => {
    const app = breadc('cli')
      .option('--all')
      .allowUnknownOption((_ctx, name, value) => ({ name, value, type: 'required' }));
    expect(app.parse(['--custom', '-2e-3']).options).toMatchObject({ custom: '-2e-3' });
    expect(() => app.parse(['--custom', '--all'])).toThrowError(RuntimeError.REQUIRED_OPTION_VALUE_MISSING);
  });
});

describe('runtime/parser: negative positional arguments', () => {
  it.each(negativeNumbers)('preserves %s without casting', (value) => {
    expect(breadc('cli').parse([value]).args).toEqual([value]);
    const app = breadc('cli');
    app.command('calc <value>');
    expect(app.parse(['calc', value]).args).toEqual([value]);
  });

  it.each(['-2foo', '-2e', '-0x10', '-Infinity'])('treats %s as an option, including in default commands', (value) => {
    const app = breadc('cli');
    app.command('[value]');
    expect(() => app.parse([value])).toThrowError(`${RuntimeError.UNKNOWN_OPTION}: ${value}`);
    expect(app.parse(['--', value])['--']).toEqual([value]);
  });

  it('keeps numeric short option declarations invalid', () => {
    expect(() => breadc('cli').option('-2, --two').parse([])).toThrowError(ResolveOptionError);
    const app = breadc('cli').option('--2');
    const result = app.parse(['--2', '-2']);
    expect(result.options).toEqual({ 2: true });
    expect(result.args).toEqual(['-2']);
  });
});
