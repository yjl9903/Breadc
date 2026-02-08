import { describe, it, expect } from 'vitest';

import type { InternalBreadc } from '../src/breadc/index.ts';

import { breadc } from '../src/breadc/app.ts';
import { BreadcAppError, RuntimeError } from '../src/error.ts';

describe('parse behavior', () => {
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

    const result3 = app.parse(['build']);
    expect(result3.context.command?.spec).toMatchInlineSnapshot(`"build"`);
    expect(result3.context.pieces).toMatchInlineSnapshot(`[]`);
    expect(result3.args).toMatchInlineSnapshot(`[]`);
    expect(result3['--']).toMatchInlineSnapshot(`
      [
        "build",
      ]
    `);
  });
});

describe('argument matching', () => {
  it('matches required/optional arguments and leaves remaining args', () => {
    const app = breadc('cli');
    app.command('echo <first> [second]');

    const result = app.parse(['echo', 'a', 'b', 'c', 'd']);
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

describe('options behavior', () => {
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
        "output": "",
      }
    `);
    expect(app.parse(['-o']).options).toMatchInlineSnapshot(`
      {
        "output": "",
      }
    `);
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

  it('supports --no-* negation semantics for boolean options', () => {
    const app = breadc('cli').option('--open');

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
      .option('-f, --flag', '', {
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

  it('should parse long options', () => {
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

describe('unknown options', () => {
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

  it('ignores unknown options when middleware returns nothing', () => {
    const app = breadc('cli').allowUnknownOption(() => undefined);

    const result = app.parse(['-x', 'foo']);
    expect(result.options).toMatchInlineSnapshot(`{}`);
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

describe('option layering', () => {
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

describe('other parsing rules', () => {
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
        "number": "",
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

describe('parse errors', () => {
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
});
