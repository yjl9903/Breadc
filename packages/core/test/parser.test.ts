import { describe, it, expect } from 'vitest';

import type { InternalOption } from '../src/breadc/index.ts';

import { breadc, option } from '../src/breadc/index.ts';
import { MatchedOption } from '../src/runtime/matched.ts';
import { context as makeContext } from '../src/runtime/context.ts';
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

  it.todo('matches default command aliases alongside sub-commands');
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
        "c",
      ]
    `);
    expect(result['--']).toMatchInlineSnapshot(`[]`);
  });
  it.todo('respects manual argument default/initial values when omitted');
});

describe('options behavior', () => {
  it('parses short boolean options', () => {
    const app = breadc('cli');
    app.option('-f, --flag');

    const result = app.parse<unknown[], { flag: boolean }>(['-f']);
    expect(result.options.flag).toMatchInlineSnapshot(`true`);
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

  it.todo('parses required option values');

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
    const app = breadc('cli');
    const opt = option('--open') as unknown as InternalOption;
    opt._resolve();

    const ctx = makeContext(app as any, []);
    const matched = new MatchedOption(opt);
    matched.accept(ctx, '--open', undefined);
    expect(matched.value()).toMatchInlineSnapshot(`true`);

    matched.accept(ctx, '--no-open', undefined);
    expect(matched.value()).toMatchInlineSnapshot(`false`);

    matched.accept(ctx, '--no-open', 'false');
    expect(matched.value()).toMatchInlineSnapshot(`true`);
  });

  it('applies option default/initial/cast semantics', () => {
    const app = breadc('cli');
    const opt = option('-f, --flag', '', {
      default: true,
      cast: (t) => (t ? 'on' : 'off')
    }) as unknown as InternalOption;
    opt._resolve();

    const ctx = makeContext(app as any, []);
    const matched = new MatchedOption(opt);
    expect(matched.value()).toMatchInlineSnapshot(`true`);
    matched.accept(ctx, '-f', undefined);
    expect(matched.value()).toMatchInlineSnapshot(`"on"`);

    const opt2 = option('-o, --output [value]', '', {
      initial: 'seed',
      cast: (t) => String(t)
    }) as unknown as InternalOption;
    opt2._resolve();
    const matched2 = new MatchedOption(opt2);
    expect(matched2.value()).toMatchInlineSnapshot(`"seed"`);
  });

  it.todo('parses long options (--flag/--flag=value/--flag value)');
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
  it.todo('maps option keys to camelCase');
});

describe('unknown options', () => {
  it('allows unknown options at app level', () => {
    const app = breadc('cli').allowUnknownOption(true);

    const result = app.parse(['-x', 'foo']);
    expect(result.context.options.get('-x')?.value()).toMatchInlineSnapshot(`"foo"`);
  });

  it('allows unknown options at app level with custom middleware', () => {
    const app = breadc('cli').allowUnknownOption((_ctx, key, value) => ({
      name: key,
      value
    }));

    const result = app.parse(['-x', 'foo']);
    expect(result.context.options.get('-x')?.value()).toMatchInlineSnapshot(`"foo"`);
  });

  it('allows unknown options at group level', () => {
    const app = breadc('cli');
    const group = app.group('tool').allowUnknownOptions((_ctx, key, value) => ({
      name: key,
      value
    }));
    group.command('run');

    const result = app.parse(['tool', 'run', '-x', 'foo']);
    expect(result.context.options.get('-x')?.value()).toMatchInlineSnapshot(`"foo"`);
  });

  it('allows unknown options at group level with boolean', () => {
    const app = breadc('cli');
    const group = app.group('tool').allowUnknownOptions(true);
    group.command('run');

    const result = app.parse(['tool', 'run', '-x', 'foo']);
    expect(result.context.options.get('-x')?.value()).toMatchInlineSnapshot(`"foo"`);
  });

  it('allows unknown options at command level', () => {
    const app = breadc('cli');
    app.command('echo').allowUnknownOptions((_ctx, key, value) => ({
      name: key,
      value
    }));

    const result = app.parse(['echo', '-x', 'foo']);
    expect(result.context.options.get('-x')?.value()).toMatchInlineSnapshot(`"foo"`);
  });

  it('allows unknown options at command level with boolean', () => {
    const app = breadc('cli');
    app.command('echo').allowUnknownOptions(true);

    const result = app.parse(['echo', '-x', 'foo']);
    expect(result.context.options.get('-x')?.value()).toMatchInlineSnapshot(`"foo"`);
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
        "flag": "app",
      }
    `);
  });

  it.todo('supports options["--"] alongside layered options');
});

describe('other parsing rules', () => {
  it('treats negative numbers as arguments, not short options', () => {
    const app = breadc('cli');
    app.option('-n, --number <value>');
    app.command('calc <value>');

    const result = app.parse(['calc', '-1']);
    expect(result.args).toMatchInlineSnapshot(`
      [
        "-1",
      ]
    `);
    expect(result.options).toMatchInlineSnapshot(`{}`);
  });

  it('resolves app options for default command', () => {
    const app = breadc('cli');
    app.option('-f, --flag');
    app.command('<name>');

    const result = app.parse<unknown[], { flag: boolean }>(['hello', '-f']);
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
  it.todo('throws on unknown sub-commands');
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

    expect(() => app.parse(['store', 'ls'])).toThrowError(RuntimeError);
  });
  it('throws on duplicated command pieces', () => {
    const app = breadc('cli');
    app.command('dev');
    app.command('dev');

    expect(() => app.parse(['dev'])).toThrowError(RuntimeError);
  });
  it.todo('throws on other parse-time error paths');
});
