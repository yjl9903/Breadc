import { describe, it, expect, vi } from 'vitest';

import type { InternalBreadc } from '../src/breadc/index.ts';

import { breadc } from '../src/breadc/app.ts';
import { argument } from '../src/breadc/command.ts';
import { parse, finalizeInput, isHelp, resolveArgs, resolveOptions } from '../src/runtime/parser.ts';
import { DefinitionError, InputError, ErrorCode } from '../src/error.ts';

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
        "description": "Print help",
        "form": "positive",
        "init": {},
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
        "description": "Print version",
        "form": "positive",
        "init": {},
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
        "description": "Print help",
        "form": "positive",
        "init": {},
        "long": "help",
        "spec": "--help",
        "type": "boolean",
      }
    `);
    expect((app as unknown as InternalBreadc)._version).toMatchInlineSnapshot(`
      {
        "description": "Print version",
        "form": "positive",
        "init": {},
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
    expect(() => app.parse(['subject', 'revision', '114514'])).toThrow('Detect unexpected redundant arguments');
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

    expect(() => app.parse(['build'])).toThrow('Detect unexpected redundant arguments');
  });
});

describe('runtime/parser: arguments', () => {
  it('checks required arguments before any conversion and accepts explicit empty strings', () => {
    const app = breadc('cli');
    const cast = vi.fn((value: string) => value.length);
    const optionCast = vi.fn(Boolean);
    app.option('--flag', '', { cast: optionCast });
    app.command('run').argument('<file>', { default: undefined, cast });
    expect(() => app.parse(['run'])).toThrow('Missing required argument');
    expect(cast).not.toHaveBeenCalled();
    expect(optionCast).not.toHaveBeenCalled();
    expect(app.parse(['run', '']).args).toEqual([0]);
    expect(cast).toHaveBeenCalledExactlyOnceWith('');
  });

  it('keeps position allocation and passthrough independent of defaults', () => {
    const app = breadc('cli');
    app
      .command('run')
      .argument('[name]', { default: 'alice' })
      .argument('[mode]', { default: 'auto' })
      .argument('[...files]', { default: ['fallback'] });
    const result = app.parse(['run', 'bob', '--', 'manual', 'file']);
    expect(result.args).toEqual(['bob', 'auto', ['fallback']]);
    expect(result['--']).toEqual(['manual', 'file']);
  });

  it.each([undefined, null, false, '', 0])('preserves cast result %j without fallback', (result) => {
    const app = breadc('cli');
    app
      .command('run')
      .argument('<file>', { cast: () => result })
      .argument('[port]', { default: '3000', cast: () => result })
      .argument('[...files]', { default: ['file'], cast: () => result });
    expect(app.parse(['run', 'file']).args).toEqual([result, result, result]);
    expect(app.parse(['run', '', '', '']).args).toEqual([result, result, result]);
  });

  it.each(['[port]', '[...files]'] as const)('propagates conversion failures for %s without fallback', (spec) => {
    const app = breadc('cli');
    const failure = new Error('invalid input');
    const cast = vi.fn(() => {
      throw failure;
    });
    app.command('run').argument(spec, { default: spec === '[port]' ? 'bad' : ['bad'], cast });
    expect(() => app.parse(['run'])).toThrow(failure);
    expect(() => app.parse(['run', 'input'])).toThrow(failure);
    expect(cast).toHaveBeenCalledTimes(2);
  });

  it.each([undefined, [], ['default']])('converts complete spread input with default %j', (fallback) => {
    const app = breadc('cli');
    const cast = vi.fn((values: string[]) => ({ values: [...values], count: values.length }));
    app.command('run').argument(argument('[...files]', { default: fallback, cast }));
    expect(app.parse(['run']).args).toEqual([{ values: fallback ?? [], count: fallback?.length ?? 0 }]);
    expect(cast).toHaveBeenCalledExactlyOnceWith(fallback ?? []);
    expect(app.parse(['run', '', 'a', 'b']).args).toEqual([{ values: ['', 'a', 'b'], count: 3 }]);
    expect(cast).toHaveBeenCalledTimes(2);
    expect(cast).toHaveBeenLastCalledWith(['', 'a', 'b']);
  });

  it('isolates spread defaults, converter mutations, and results across parses', () => {
    const fallback = ['default'];
    const app = breadc('cli');
    const cast = vi.fn((values: string[]) => {
      values.push('cast');
      return values;
    });
    app.command('run').argument('[...files]', { default: fallback, cast });
    const first = app.parse(['run']);
    first.args[0].push('later');
    expect(app.parse(['run', 'user']).args).toEqual([['user', 'cast']]);
    expect(app.parse(['run']).args).toEqual([['default', 'cast']]);
    expect(fallback).toEqual(['default']);
    expect(cast).toHaveBeenCalledTimes(3);

    const raw = breadc('raw');
    raw.command('run').argument('[...files]', { default: fallback });
    raw.parse(['run']).args[0].push('later');
    expect(raw.parse(['run']).args).toEqual([['default']]);
    expect(fallback).toEqual(['default']);
  });

  it('does not evaluate overwritten defaults', () => {
    const app = breadc('cli');
    const cast = vi.fn((value: string) => {
      if (value === 'invalid') throw new Error('invalid default');
      return Number(value);
    });
    app.command('run').argument('[port]', { default: 'invalid', cast });
    expect(app.parse(['run', '8080']).args).toEqual([8080]);
    expect(cast).toHaveBeenCalledExactlyOnceWith('8080');
  });

  it.each(['root', 'group'])('converts once after %s default-command fallback', (scope) => {
    const app = breadc('cli');
    const cast = vi.fn(Number);
    if (scope === 'root') {
      app.command('').argument('[port]', { default: '3000', cast });
      app.command('other');
    } else {
      const group = app.group('server');
      group.command('').argument('[port]', { default: '3000', cast });
      group.command('other');
    }
    const result = app.parse(scope === 'root' ? ['8080'] : ['server', '8080']);
    expect(resolveArgs(result.context)).toEqual([8080]);
    expect(resolveArgs(result.context)).toEqual([8080]);
    result.context.arguments[0].finalize();
    expect(result.context.arguments[0].value()).toBe(8080);
    expect(cast).toHaveBeenCalledExactlyOnceWith('8080');
  });

  it('converts options before arguments in declaration order and reuses results in middleware/action', async () => {
    const order: string[] = [];
    const app = breadc('cli');
    app.option('--flag', '', {
      cast: (value) => {
        order.push('option');
        return value;
      }
    });
    const cmd = app
      .command('run')
      .argument('<file>', {
        cast: (value) => {
          order.push('file');
          return value.length;
        }
      })
      .argument('[port]', {
        default: '3000',
        cast: (value) => {
          order.push('port');
          return Number(value);
        }
      });
    cmd
      .use(async (context, next) => {
        expect(resolveArgs(context)).toEqual([1, 3000]);
        expect(resolveArgs(context)).toEqual([1, 3000]);
        const result = await next();
        expect(resolveArgs(context)).toEqual([1, 3000]);
        return result;
      })
      .action((file, port) => [file, port]);
    expect(await app.run(['run', 'a'])).toEqual([1, 3000]);
    expect(order).toEqual(['option', 'file', 'port']);
  });

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

  it.each([
    ['run', 'a', 'extra'],
    ['run', 'a', '--unknown'],
    ['run', 'a', '--flag']
  ])('validates syntax before conversion: %j', (...argv) => {
    const app = breadc('cli');
    const cast = vi.fn(Number);
    app.command('run').argument('<value>', { cast }).option('--flag <value>');
    expect(() => app.parse(argv)).toThrow();
    expect(cast).not.toHaveBeenCalled();
  });

  it.each(['fallback', ''])('uses default %j for an omitted optional argument', (fallback) => {
    const app = breadc('cli');
    app.command('echo').argument('[file]', { default: fallback });

    const result = app.parse(['echo']);
    expect(result.args).toEqual([fallback]);
    expect(result.context.arguments[0].dirty).toBe(false);
    expect(app.parse(['echo', 'readme.md']).args).toEqual(['readme.md']);
    expect(app.parse(['echo', '']).args).toEqual(['']);
  });

  it('casts the default string for an omitted optional argument', () => {
    const app = breadc('cli');
    const cast = vi.fn((value: string) => value.toUpperCase());
    app.command('echo').argument('[file]', { default: 'fallback', cast });

    expect(app.parse(['echo']).args).toEqual(['FALLBACK']);
    expect(cast).toHaveBeenCalledExactlyOnceWith('fallback');
    expect(app.parse(['echo', 'readme.md']).args).toEqual(['README.MD']);
    expect(cast).toHaveBeenLastCalledWith('readme.md');
    expect(app.parse(['echo', '']).args).toEqual(['']);
    expect(cast).toHaveBeenLastCalledWith('');
  });

  it('skips cast for an omitted optional argument without a default', () => {
    const app = breadc('cli');
    const cast = vi.fn((value: string) => value.toUpperCase());
    app.command('echo').argument('[file]', { default: undefined, cast });

    expect(app.parse(['echo']).args).toEqual([undefined]);
    expect(cast).not.toHaveBeenCalled();
  });

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

  it.each([undefined, 'fallback'])('matches omitted optional arguments with default %j', (fallback) => {
    const app = breadc('cli');
    app.command('echo <first>').argument('[second]', { default: fallback });

    const result1 = app.parse(['echo', 'a']);
    expect(result1.args).toEqual(['a', fallback]);
    expect(result1.context.arguments.map((arg) => arg.dirty)).toEqual([true, false]);
    expect(result1['--']).toMatchInlineSnapshot(`[]`);

    const result2 = app.parse(['echo', 'a', 'b']);
    expect(result2.args).toMatchInlineSnapshot(`
      [
        "a",
        "b",
      ]
    `);
    expect(result2.context.arguments.map((arg) => arg.dirty)).toEqual([true, true]);
    expect(result2['--']).toMatchInlineSnapshot(`[]`);

    const result3 = app.parse(['echo', 'a', '']);
    expect(result3.args).toEqual(['a', '']);
    expect(result3.context.arguments.map((arg) => arg.dirty)).toEqual([true, true]);
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

  it.each([
    { init: { default: undefined }, expected: undefined },
    { init: { default: 'fallback' }, expected: 'fallback' }
  ])('respects optional argument $init and spread default when omitted', ({ init, expected }) => {
    const app = breadc('cli');
    app
      .command('echo')
      .argument('[name]', { default: init.default })
      .argument('[...rest]', { default: ['fallback'] });

    const result1 = app.parse(['echo']);
    expect(result1.args).toEqual([expected, ['fallback']]);
    expect(result1.context.arguments.map((arg) => arg.dirty)).toEqual([false, false]);

    const result2 = app.parse(['echo', 'alice']);
    expect(result2.context.arguments.map((arg) => arg.dirty)).toEqual([true, false]);
    expect(result2.args).toMatchInlineSnapshot(`
      [
        "alice",
        [
          "fallback",
        ],
      ]
    `);

    const result3 = app.parse(['echo', 'alice', 'x', 'y']);
    expect(result3.context.arguments.map((arg) => arg.dirty)).toEqual([true, true]);
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
  it.each(['true', 't', 'yes', 'y', 'on', '1', 'TrUe'])('parses explicit true value %s', (value) => {
    const app = breadc('cli').option('-a, --[no-]all');
    for (const text of [value, value.toUpperCase()]) {
      expect(app.parse([`--all=${text}`]).options).toMatchInlineSnapshot(`
        {
          "all": true,
        }
      `);
      expect(app.parse([`-a=${text}`]).options).toMatchInlineSnapshot(`
        {
          "all": true,
        }
      `);
      expect(app.parse([`--no-all=${text}`]).options).toMatchInlineSnapshot(`
        {
          "all": false,
        }
      `);
    }
  });

  it.each(['false', 'f', 'no', 'n', 'off', '0', 'FaLsE'])('parses explicit false value %s', (value) => {
    const app = breadc('cli').option('-a, --[no-]all');
    for (const text of [value, value.toUpperCase()]) {
      expect(app.parse([`--all=${text}`]).options).toMatchInlineSnapshot(`
        {
          "all": false,
        }
      `);
      expect(app.parse([`-a=${text}`]).options).toMatchInlineSnapshot(`
        {
          "all": false,
        }
      `);
      expect(app.parse([`--no-all=${text}`]).options).toMatchInlineSnapshot(`
        {
          "all": true,
        }
      `);
    }
  });

  it.each(['--all', '-a', '--no-all'])('rejects invalid explicit boolean values for %s', (flag) => {
    const app = breadc('cli').option('-a, --[no-]all');
    for (const value of ['abc', '', ' ', ' true', 'false ', '2', '-1']) {
      expect(() => app.parse([`${flag}=${value}`])).toThrowErrorMatchingInlineSnapshot(
        `[InputError: Invalid boolean option value: --all]`
      );
    }
  });

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
    expect(() => app.parse(['-o'])).toThrow(`Missing required option value: --output`);
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
      expect(() => app.parse(argv)).toThrow(`Missing required option value: --output`);
    }
  );

  it.each([['--output='], ['--output', ''], ['-o='], ['-o', ''], ['-ao=']])(
    'accepts explicit empty required option values in %j',
    (...argv) => {
      const app = breadc('cli').option('-a, --all').option('-o, --output <value>');
      expect(app.parse(argv).options.output).toBe('');
    }
  );

  it.each(['seed', ''])('uses required option default only when absent %j', (fallback) => {
    const app = breadc('cli').option('-o, --output <value>', '', { default: fallback });
    expect(app.parse([]).options.output).toBe(fallback);
    expect(() => app.parse(['--output'])).toThrow('Missing required option value');
    expect(() => app.parse(['-o', '--', 'file'])).toThrow('Missing required option value');
    expect(app.parse(['--output=file']).options.output).toBe('file');
  });

  it('does not use default or cast to conceal a missing required option value', () => {
    const app = breadc('cli').option('--output <value>', '', {
      default: 'default.txt',
      cast: (value) => value ?? 'cast.txt'
    });
    expect(app.parse([]).options.output).toBe('default.txt');
    expect(() => app.parse(['--output'])).toThrow('Missing required option value');
  });

  it.each([false, true])('rejects missing values on a default command (group: %s)', (grouped) => {
    const app = breadc('cli');
    const parent = grouped ? app.group('tool') : app;
    parent.command('[message]').option('--output <value>');
    parent.command('other');
    expect(() => app.parse([...(grouped ? ['tool'] : []), '--output'])).toThrow(
      `Missing required option value: --output`
    );
  });

  it('parses optional option values', () => {
    const app = breadc('cli');
    app.option('-o, --output [value]');

    expect(app.parse<unknown[], { output: string | undefined }>(['-o']).options).toMatchInlineSnapshot(`
      {
        "output": undefined,
      }
    `);
    expect(app.parse<unknown[], { output: string | undefined }>(['-o', 'file']).options).toMatchInlineSnapshot(`
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

  it('applies option default/cast semantics', () => {
    const app = breadc('cli')
      .option('-f, --[no-]flag', '', {
        default: true,
        cast: (t) => (t ? 'on' : 'off')
      })
      .option('-o, --output [value]', '', {
        default: 'seed',
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
        "flag": "on",
        "output": "undefined",
      }
    `);
    expect(app.parse(['--output']).options).toMatchInlineSnapshot(`
      {
        "flag": "on",
        "output": "undefined",
      }
    `);
    expect(app.parse(['--output=dirty']).options).toMatchInlineSnapshot(`
      {
        "flag": "on",
        "output": "dirty",
      }
    `);
    expect(app.parse(['--output', 'dirty']).options).toMatchInlineSnapshot(`
      {
        "flag": "on",
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
        "mode": undefined,
      }
    `);

    const result2 = app.parse(['echo', '--flag=NO']);
    expect(result2.options).toMatchInlineSnapshot(`
      {
        "flag": false,
        "mode": undefined,
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
    expect(() => app.parse([option])).toThrow(`Unknown option: ${name}`);
  });

  it('rejects unknown options before matching positional arguments', () => {
    const app = breadc('cli');
    app.command('echo <message>');

    for (const argv of [
      ['echo', '--typo', 'x'],
      ['echo', '--typo']
    ]) {
      expect(() => app.parse(argv)).toThrow(`Unknown option: --typo`);
    }
  });

  it('includes the option and matched command in the runtime error', () => {
    const app = breadc('cli');
    const command = app.group('tool').command('echo');

    expect(() => app.parse(['tool', 'echo', '--typo=x'])).toThrow(
      expect.objectContaining({
        issues: [expect.objectContaining({ code: ErrorCode.UNKNOWN_OPTION, name: '--typo', value: 'x' })],
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
    expect(() => app.parse([...prefix, '--typo', 'x'])).toThrow(`Unknown option: --typo`);
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
    expect(() => app.parse([...prefix, '--output=file', '--typo=x'])).toThrow(
      expect.objectContaining({
        message: `Unknown option: --typo\nMissing required argument`,
        issues: [
          expect.objectContaining({ code: ErrorCode.UNKNOWN_OPTION, name: '--typo', value: 'x' }),
          expect.objectContaining({ code: ErrorCode.MISSING_ARGUMENT })
        ],
        context: expect.objectContaining({ command, arguments: [expect.anything()] })
      })
    );
    expect(() => app.parse([...prefix, '--output=file'])).toThrow('Missing required argument');
  });

  it('rejects unknown options when no group command matches', () => {
    const app = breadc('cli');
    app.group('tool').command('run');
    expect(() => app.parse(['tool', '--typo'])).toThrow(`Unknown option: --typo`);
  });

  it('preserves escaped options, negative numbers and stdio arguments', () => {
    const app = breadc('cli');
    app.command('echo [...args]');
    const result = app.parse(['echo', '-1', '-', '--', '--typo', 'x']);
    expect(result.args).toEqual([['-1', '-']]);
    expect(result['--']).toEqual(['--typo', 'x']);
  });

  it.each(['--help', '--version'])('rejects unknown options alongside %s', (builtin) => {
    expect(() => breadc('cli').parse(['--typo', builtin])).toThrow(`Unknown option: --typo`);
  });

  it('allows unknown options', () => {
    const app = breadc('cli').allowUnknownOption();

    const result1 = app.parse(['--flag']);
    expect(result1.options).toMatchInlineSnapshot(`
      {
        "flag": undefined,
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
    expect(() => app.parse(['-x', 'foo'])).toThrow(`Unknown option: -x`);
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

    expect(() => app.parse(argv)).toThrow('Detect unexpected redundant arguments');
  });

  it('rejects excess positional arguments after falling back to a default command', () => {
    const app = breadc('cli');
    app.command('<file>');
    app.command('dev');

    expect(() => app.parse(['a', 'b'])).toThrow('Detect unexpected redundant arguments');
  });

  it('rejects excess positional arguments for group commands and group defaults', () => {
    const app = breadc('cli');
    const group = app.group('tool');
    group.command('<file>');
    group.command('echo <file>');

    expect(() => app.parse(['tool', 'a', 'b'])).toThrow('Detect unexpected redundant arguments');
    expect(() => app.parse(['tool', 'echo', 'a', 'b'])).toThrow('Detect unexpected redundant arguments');
  });

  it('throws on missing required arguments', () => {
    const app = breadc('cli');
    app.command('echo <name>');

    expect(() => app.parse(['echo'])).toThrow(InputError);
    expect(() => app.parse(['echo'])).toThrow(
      expect.objectContaining({
        code: ErrorCode.INVALID_INPUT,
        issues: [
          expect.objectContaining({
            code: ErrorCode.MISSING_ARGUMENT,
            argument: expect.objectContaining({ name: 'name' })
          })
        ]
      })
    );
  });

  it('throws on duplicated default command', () => {
    const app = breadc('cli');
    app.command('<one>');
    app.command('<two>');

    expect(() => app.parse(['value'])).toThrow(DefinitionError);
    expect(() => app.parse(['value'])).toThrow(
      expect.objectContaining({
        name: 'DefinitionError',
        code: ErrorCode.DUPLICATE_DEFAULT_COMMAND,
        details: expect.objectContaining({ commands: expect.any(Array) })
      })
    );
  });

  it('throws on duplicated group pieces', () => {
    const app = breadc('cli');
    app.group('store').command('ls');
    app.group('store').command('rm');

    expect(() => app.parse(['store', 'ls'])).toThrow(expect.objectContaining({ code: ErrorCode.DUPLICATE_GROUP }));
  });

  it('throws on duplicated command pieces', () => {
    const app = breadc('cli');
    app.command('dev');
    app.command('dev');

    expect(() => app.parse(['dev'])).toThrow(expect.objectContaining({ code: ErrorCode.DUPLICATE_COMMAND }));
  });

  it('throws on duplicated candidate commands with shared literal prefix', () => {
    const app = breadc('cli');
    app.command('subject <one>');
    app.command('subject <two>');

    expect(() => app.parse(['subject', 'value'])).toThrow(
      expect.objectContaining({ code: ErrorCode.DUPLICATE_COMMAND })
    );
  });

  it('throws on duplicated default commands inside a matched group', () => {
    const app = breadc('cli');
    const store = app.group('store');
    store.command('<one>');
    store.command('<two>');

    expect(() => app.parse(['store', 'value'])).toThrow(
      expect.objectContaining({ code: ErrorCode.DUPLICATE_DEFAULT_GROUP_COMMAND })
    );
  });

  it('throws when unknown arguments appear before matched group default command', () => {
    const app = breadc('cli');
    const store = app.group('store');
    store.command('<name>');
    store.command('ls');

    expect(() => app.parse(['unknown', 'store', 'readme.md'])).toThrow('Detect unexpected redundant arguments');
  });
});

describe('runtime/parser: boolean option forms', () => {
  it.each([
    { spec: '--all', absent: false, positive: ['--all'], negative: [], unknown: ['--no-all'] },
    { spec: '--no-all', absent: true, positive: [], negative: ['--no-all'], unknown: ['--all'] },
    { spec: '--[no-]all', absent: false, positive: ['--all'], negative: ['--no-all'], unknown: [] },
    { spec: '-a, --[no-]all', absent: false, positive: ['--all', '-a'], negative: ['--no-all'], unknown: [] },
    { spec: '-a, --no-all', absent: true, positive: [], negative: ['--no-all', '-a'], unknown: ['--all'] }
  ])('accepts only the declared forms of $spec', ({ spec, absent, positive, negative, unknown }) => {
    const app = breadc('cli').option(spec);
    expect(app.parse([]).options).toEqual({ all: absent });
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
      expect(() => app.parse([name])).toThrow(`Unknown option: ${name}`);
    }
    expect(() => app.parse(['--[no-]all'])).toThrow('Unknown option');
  });

  it.each(['--no-all', '--[no-]all', '-a, --no-all', '-a, --[no-]all'])(
    'rejects value arguments on %s on every parse',
    (spec) => {
      for (const suffix of ['<value>', '[value]', '[...value]']) {
        const app = breadc('cli').option(`${spec} ${suffix}`);
        for (let i = 0; i < 2; i++) {
          expect(() => app.parse([])).toThrow(expect.objectContaining({ code: ErrorCode.INVALID_OPTION_SPEC }));
        }
      }
    }
  );

  it.each(['--[no-]', '--[no]all', '--[no-]all[no-]', '-ab, --[no-]all'])('rejects malformed spec %s', (spec) => {
    expect(() => breadc('cli').option(spec).parse([])).toThrow(
      expect.objectContaining({ code: ErrorCode.INVALID_OPTION_SPEC })
    );
  });

  it('uses explicit default values independently of the form', () => {
    const app = breadc('cli')
      .option('--no-all', '', { default: false })
      .option('--[no-]open', '', { default: true })
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
    const withDefault = breadc('cli').option('--no-all', '', { cast, default: false });
    expect(withDefault.parse([]).options.all).toBe('off');
    expect(cast).toHaveBeenCalledExactlyOnceWith(false);
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
      expect(() => breadc('cli').option('-a, --[no-]all').parse(argv)).toThrow(
        'Boolean option can only be assigned once'
      );
    }
  );

  it('reports the actual spelling of a repeated negative short alias', () => {
    expect(() => breadc('cli').option('-a, --no-all').parse(['--no-all', '-a'])).toThrow(
      expect.objectContaining({ issues: [expect.objectContaining({ name: 'a' })] })
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
        expect(() => app.parse(['run', name])).toThrow(`Unknown option: ${name}`);
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
      expect(() => breadc('cli').parse([name])).toThrow(`Unknown option: ${name}`);
    }
  });

  it('honors forms in custom built-in specs', () => {
    const app = breadc('cli', { builtin: { help: { spec: '-h, --[no-]help' }, version: { spec: '--no-version' } } });
    expect(app.parse(['--no-help']).options).toEqual({ help: false });
    expect(app.parse(['-h']).options).toEqual({ help: true });
    expect(app.parse(['--no-version']).options).toEqual({ version: false });
    expect(() => app.parse(['--version'])).toThrow('Unknown option');
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

  it.each(['-ab=false', '-ab=NO', '-ab=0'])('applies explicit false values to the last flag in %s', (arg) => {
    expect(createApp().parse([arg]).options).toMatchInlineSnapshot(`
      {
        "all": true,
        "brief": false,
        "output": undefined,
      }
    `);
  });

  it.each(['-ab=YES', '-ab=1'])('applies explicit true values to the last flag in %s', (arg) => {
    expect(createApp().parse([arg]).options).toMatchInlineSnapshot(`
      {
        "all": true,
        "brief": true,
        "output": undefined,
      }
    `);
  });

  it.each(['-ab=', '-ab=abc', '-ab=2'])('rejects invalid boolean values in %s', (arg) => {
    expect(() => createApp().parse([arg])).toThrowErrorMatchingInlineSnapshot(
      `[InputError: Invalid boolean option value: --brief]`
    );
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

  it('preserves following-token rules for optional options', () => {
    const app = breadc('cli').option('-a, --all').option('-b, --brief').option('-o, --output [value]');
    expect(app.parse(['-ao']).options.output).toBe(undefined);
    expect(app.parse(['-ao', '--brief']).options).toEqual({ all: true, brief: true, output: undefined });
    expect(app.parse(['-ao', '-1']).options.output).toBe('-1');

    const escaped = app.parse(['-ao', '--', '-ab']);
    expect(escaped.options).toEqual({ all: true, brief: false, output: undefined });
    expect(escaped['--']).toEqual(['-ab']);
  });

  it('rejects a following option as a required value but accepts a negative number', () => {
    const app = createApp();
    expect(() => app.parse(['-ao', '--brief'])).toThrow('Missing required option value');
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

  it.each(['--include', '-s', '-as'])('requires a value for every spread occurrence of %s', (flag) => {
    const app = breadc('cli').option('-a, --all').option('-s, --include [...value]');
    for (const tail of [[], ['--all'], ['--help'], ['--unknown'], ['--', 'file']]) {
      for (const prefix of [[], ['--include', 'first']]) {
        expect(() => app.parse([...prefix, flag, ...tail])).toThrow(`Missing required option value: --include`);
      }
    }
  });

  it('preserves explicit empty spread values and normal accumulation', () => {
    const app = breadc('cli').option('-a, --all').option('-s, --include [...value]');
    expect(app.parse([]).options.include).toEqual([]);
    expect(app.parse(['--include', 'a', '--include', 'b']).options.include).toEqual(['a', 'b']);
    for (const argv of [['--include='], ['--include', ''], ['-s='], ['-s', ''], ['-as='], ['-as', '']]) {
      expect(app.parse([...argv, '--include', 'b']).options.include).toEqual(['', 'b']);
    }
  });

  it('requires spread values even when default values are configured', () => {
    for (const init of [{ default: ['seed'] }, { default: [] }]) {
      const app = breadc('cli').option('--include [...value]', '', init);
      expect(app.parse([]).options.include).toEqual(init.default);
      expect(() => app.parse(['--include'])).toThrow(`Missing required option value: --include`);
    }
  });

  it.each([
    ['-a, --all', ['-aa'], 'Boolean option can only be assigned once'],
    ['-a, --all', ['-a', '-a=false'], 'Boolean option can only be assigned once'],
    ['-o, --output <value>', ['-ofile', '--output=again'], 'Required option can only be assigned once'],
    ['-o, --output [value]', ['-ofile', '-oagain'], 'Optional option can only be assigned once']
  ])('preserves duplicate assignment errors for %s', (spec, argv, error) => {
    expect(() => breadc('cli').option(spec).parse(argv)).toThrow(error);
  });

  it('applies default and cast behavior', () => {
    const app = breadc('cli')
      .option('-a, --all', '', { default: true })
      .option('-o, --output [value]', '', { default: 'seed', cast: (value) => String(value).toUpperCase() });
    expect(app.parse(['-ao']).options).toEqual({ all: true, output: 'UNDEFINED' });
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
    expect(() => breadc('cli').option('-ab, --all').parse(['-ab'])).toThrow(
      expect.objectContaining({ code: ErrorCode.INVALID_OPTION_SPEC })
    );
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
    expect(() => app.parse(['-axyz', 'value'])).toThrow(`Unknown option: -xyz`);
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
      expect(() => app.parse([output, value]), value).toThrow(`Missing required option value: --output`);
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

  it('leaves following flags and unknown options for optional options', () => {
    const app = breadc('cli').option('-a, --all').option('-o, --output [value]');
    expect(app.parse(['--output', '--all']).options).toEqual({ all: true, output: undefined });
    expect(isHelp(app.parse(['--output', '--help']).context)).toBe(true);
    for (const value of ['--unknown', '-2foo', '-2e']) {
      expect(() => app.parse(['--output', value])).toThrow(`Unknown option: ${value}`);
    }
    const escaped = app.parse(['--output', '--', '-2foo']);
    expect(escaped.options.output).toBe(undefined);
    expect(escaped['--']).toEqual(['-2foo']);
  });

  it('rejects a missing value before a following option even with a default', () => {
    const app = breadc('cli').option('--output <value>', '', { default: 'seed' }).option('--all');
    expect(() => app.parse(['--output', '--all'])).toThrow('Missing required option value');
    expect(() => app.parse(['--output', '--unknown'])).toThrow('Missing required option value');
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
    expect(() => app.parse([...prefix, '--output', '--all'])).toThrow('Missing required option value');
  });

  it('applies the same boundary to options accepted by middleware', () => {
    const app = breadc('cli')
      .option('--all')
      .allowUnknownOption((_ctx, name, value) => ({ name, value, type: 'required' }));
    expect(app.parse(['--custom', '-2e-3']).options).toMatchObject({ custom: '-2e-3' });
    expect(() => app.parse(['--custom', '--all'])).toThrow('Missing required option value');
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
    expect(() => app.parse([value])).toThrow(`Unknown option: ${value}`);
    expect(app.parse(['--', value])['--']).toEqual([value]);
  });

  it('keeps numeric short option declarations invalid', () => {
    expect(() => breadc('cli').option('-2, --two').parse([])).toThrow(DefinitionError);
    const app = breadc('cli').option('--2');
    const result = app.parse(['--2', '-2']);
    expect(result.options).toEqual({ 2: true });
    expect(result.args).toEqual(['-2']);
  });
});

describe('runtime/parser: aggregated input diagnostics', () => {
  it('leaves internal parsing raw and finalizes input once in the existing order', () => {
    const order: string[] = [];
    const optionCast = vi.fn((value: string) => {
      order.push('option');
      return Number(value);
    });
    const argumentCast = vi.fn((value: string) => {
      order.push('argument');
      return Number(value);
    });
    const app = breadc('cli');
    app.option('--count <value>', '', { default: '2', cast: optionCast });
    app.command('run').argument('[number]', { default: '3', cast: argumentCast });
    const context = parse(app, ['run']);
    expect(resolveOptions(context)).toEqual({ count: '2' });
    expect(resolveArgs(context)).toEqual(['3']);
    expect(order).toEqual([]);
    finalizeInput(context);
    finalizeInput(context);
    expect(resolveOptions(context)).toEqual({ count: 2 });
    expect(resolveArgs(context)).toEqual([3]);
    expect(order).toEqual(['option', 'argument']);
    expect(optionCast).toHaveBeenCalledExactlyOnceWith('2');
    expect(argumentCast).toHaveBeenCalledExactlyOnceWith('3');
  });

  function inputError(parse: () => unknown): InputError {
    try {
      parse();
    } catch (error) {
      expect(error).toBeInstanceOf(InputError);
      return error as InputError;
    }
    throw new Error('Expected an InputError');
  }

  it('collects all option errors in scan order, then all missing arguments', () => {
    const cast = vi.fn(Number);
    const app = breadc('cli').option('--default <value>', '', { default: '1', cast });
    app.command('run <first> <second>').option('-n, --number <value>').option('-a, --all');

    const error = inputError(() =>
      app.parse(['run', '--unknown=x', '-n', '--all=invalid', '-a', '--other', '-n', '2'])
    );
    expect(error.issues.map((issue) => issue.code)).toEqual([
      ErrorCode.UNKNOWN_OPTION,
      ErrorCode.MISSING_OPTION_VALUE,
      ErrorCode.INVALID_BOOLEAN_OPTION_VALUE,
      ErrorCode.DUPLICATE_OPTION,
      ErrorCode.UNKNOWN_OPTION,
      ErrorCode.DUPLICATE_OPTION,
      ErrorCode.MISSING_ARGUMENT,
      ErrorCode.MISSING_ARGUMENT
    ]);
    expect(error.issues.filter((issue) => 'name' in issue).map((issue) => issue.name)).toEqual([
      '--unknown',
      'n',
      'all',
      'a',
      '--other',
      'n'
    ]);
    expect(error.context?.issues).toEqual(error.issues);
    expect(error.context?.arguments).toHaveLength(2);
    expect(cast).not.toHaveBeenCalled();
  });

  it('keeps unknown option followers as arguments and reports excess arguments after scanning', () => {
    const app = breadc('cli');
    app.command('run <first>');
    const error = inputError(() => app.parse(['before', 'run', '--unknown', 'value', '--other=x', 'extra']));
    expect(error.issues).toMatchObject([
      { code: ErrorCode.UNKNOWN_OPTION, name: '--unknown', value: undefined },
      { code: ErrorCode.UNKNOWN_OPTION, name: '--other', value: 'x' },
      { code: ErrorCode.UNEXPECTED_ARGUMENTS, values: ['before'] },
      { code: ErrorCode.UNEXPECTED_ARGUMENTS, values: ['extra'] }
    ]);
    expect(resolveArgs(error.context!)).toEqual(['value']);
  });

  it.each(['<value>', '[value]'])('consumes duplicate %s option values and continues through short bundles', (spec) => {
    const app = breadc('cli');
    app.command('run <file>').option(`-o, --output ${spec}`).option('-a, --all').option('-b, --brief');
    const error = inputError(() =>
      app.parse(['run', '-o', 'first', '-aao', 'second', '-oattached', '-b=bad', '-bb', 'file'])
    );
    expect(error.issues.map((issue) => issue.code)).toEqual([
      ErrorCode.DUPLICATE_OPTION,
      ErrorCode.DUPLICATE_OPTION,
      ErrorCode.DUPLICATE_OPTION,
      ErrorCode.INVALID_BOOLEAN_OPTION_VALUE,
      ErrorCode.DUPLICATE_OPTION,
      ErrorCode.DUPLICATE_OPTION
    ]);
    expect(error.context?.options.get('output')?.value()).toBe('first');
    expect(resolveArgs(error.context!)).toEqual(['file']);
  });

  it('reports duplicate and malformed values together without losing later options or escapes', () => {
    const app = breadc('cli').option('-n, --number <value>').option('-a, --all').option('-s, --spread [...value]');
    const error = inputError(() => app.parse(['-n', '-n', '-a', '-a=bad', '-s', '-sok', '--', '--escaped']));
    expect(error.issues.map((issue) => issue.code)).toEqual([
      ErrorCode.MISSING_OPTION_VALUE,
      ErrorCode.DUPLICATE_OPTION,
      ErrorCode.MISSING_OPTION_VALUE,
      ErrorCode.DUPLICATE_OPTION,
      ErrorCode.INVALID_BOOLEAN_OPTION_VALUE,
      ErrorCode.MISSING_OPTION_VALUE
    ]);
    expect(error.context?.options.get('all')?.value()).toBe(true);
    expect(error.context?.options.get('spread')?.value()).toEqual(['ok']);
    expect(error.context?.remaining).toEqual(['--escaped']);
  });

  it.each([false, true])('discards every first-pass diagnostic during fallback (grouped=%s)', (grouped) => {
    const app = breadc('cli').option('--value');
    const parent = grouped ? app.group('tool') : app;
    const prefix = grouped ? ['tool'] : [];
    parent.command('[file]').option('--value <text>').option('--local');
    parent.command('other');
    const result = app.parse([...prefix, '--value=invalid', '--local']);
    expect(result.options).toEqual({ value: 'invalid', local: true });
    expect(result.context.issues).toEqual([]);

    const error = inputError(() => app.parse([...prefix, '--value=invalid', '--local', '--typo', '--typo2']));
    expect(error.issues).toMatchObject([
      { code: ErrorCode.UNKNOWN_OPTION, name: '--typo' },
      { code: ErrorCode.UNKNOWN_OPTION, name: '--typo2' }
    ]);
  });

  it.each(['--help', '--version'])('still aggregates scanning errors for %s, skipping argument binding', (flag) => {
    const cast = vi.fn(Number);
    const app = breadc('cli').option('--count <value>', '', { default: '1', cast });
    app.command('run <file>').option('--all');
    const error = inputError(() => app.parse(['before', 'run', '--all=bad', '--unknown', flag]));
    expect(error.issues.map((issue) => issue.code)).toEqual([
      ErrorCode.INVALID_BOOLEAN_OPTION_VALUE,
      ErrorCode.UNKNOWN_OPTION
    ]);
    expect(error.context?.arguments).toEqual([]);
    expect(cast).not.toHaveBeenCalled();
  });

  it('immediately propagates unknown-option middleware failures after a collected diagnostic', () => {
    const failure = { user: 'middleware error' };
    const app = breadc('cli').allowUnknownOption((_context, name) => {
      if (name === 'fail') throw failure;
    });
    expect(() => app.parse(['--unknown', '--fail'])).toThrow(expect.objectContaining(failure));
    try {
      app.parse(['--unknown', '--fail']);
    } catch (error) {
      expect(error).toBe(failure);
    }
  });

  it('immediately reports invalid declarations even after a collected input diagnostic', () => {
    const app = breadc('cli');
    app.command('run [optional] <required>');
    expect(() => app.parse(['--unknown', 'run'])).toThrow(
      expect.objectContaining({ name: 'DefinitionError', code: ErrorCode.REQUIRED_AFTER_OPTIONAL })
    );
  });
});
