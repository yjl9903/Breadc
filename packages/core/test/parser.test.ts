import { describe, it, expect } from 'vitest';

import { breadc, option } from '../src/breadc/index.ts';
import type { InternalOption } from '../src/breadc/index.ts';
import { context as makeContext } from '../src/runtime/context.ts';
import { MatchedOption } from '../src/runtime/matched.ts';

const argValues = (ctx: { arguments: Array<{ value: () => unknown }> }) =>
  ctx.arguments.map((arg) => arg.value());

describe('parse behavior', () => {
  it('matches a single default command', () => {
    const app = breadc('cli');
    app.command('<name>');

    const ctx = app.parse(['hello']);
    expect(ctx.command?.spec).toBe('<name>');
    expect(ctx.pieces).toEqual([]);
    expect(argValues(ctx)).toEqual(['hello']);
  });

  it('matches a single sub-command', () => {
    const app = breadc('cli');
    app.command('dev');

    const ctx = app.parse(['dev']);
    expect(ctx.command?.spec).toBe('dev');
    expect(ctx.pieces).toEqual(['dev']);
  });

  it('matches multiple sub-commands', () => {
    const app = breadc('cli');
    app.command('dev');
    app.command('build');

    expect(app.parse(['build']).command?.spec).toBe('build');
    expect(app.parse(['dev']).command?.spec).toBe('dev');
  });

  it('falls back to default command when no sub-command matches', () => {
    const app = breadc('cli');
    app.command('<file>');
    app.command('dev');

    const ctx1 = app.parse(['dev']);
    const ctx2 = app.parse(['readme.md']);

    expect(ctx1.command?.spec).toBe('dev');
    expect(ctx2.command?.spec).toBe('<file>');
    expect(argValues(ctx2)).toEqual(['readme.md']);
  });

  it('matches group commands alongside default command', () => {
    const app = breadc('cli');
    app.command('[file]');
    const store = app.group('store');
    store.command('ls');

    const ctx = app.parse(['store', 'ls']);
    expect(ctx.group?.spec).toBe('store');
    expect(ctx.command?.spec).toBe('ls');
    expect(ctx.pieces).toEqual(['store', 'ls']);
  });

  it('matches sub-commands with aliases', () => {
    const app = breadc('cli');
    app.command('dev').alias('d').alias('develop');
    app.command('build').alias('b');

    expect(app.parse(['d']).command?.spec).toBe('dev');
    expect(app.parse(['develop']).command?.spec).toBe('dev');
    expect(app.parse(['b']).command?.spec).toBe('build');
  });

  it.todo('matches default command aliases alongside sub-commands');
});

describe('argument matching', () => {
  it('matches required/optional arguments and leaves remaining args', () => {
    const app = breadc('cli');
    app.command('echo <first> [second]');

    const ctx = app.parse(['echo', 'a', 'b', 'c', 'd']);
    expect(argValues(ctx)).toEqual(['a', 'b']);
    expect(ctx.remaining).toEqual(['c', 'd']);
  });

  it('matches optional arguments when omitted', () => {
    const app = breadc('cli');
    app.command('echo <first> [second]');

    const ctx = app.parse(['echo', 'a']);
    expect(argValues(ctx)).toEqual(['a', undefined]);
    expect(ctx.remaining).toEqual([]);
  });

  it('matches manual arguments mixed with spec arguments', () => {
    const app = breadc('cli');
    app.command('echo <first>').argument('[second]');

    const ctx = app.parse(['echo', 'a', 'b']);
    expect(argValues(ctx)).toEqual(['a', 'b']);
  });

  it('applies manual argument cast when provided', () => {
    const app = breadc('cli');
    app.command('echo <first>').argument('<count>', {
      cast: (t) => Number(t)
    });

    const ctx = app.parse(['echo', 'hello', '2']);
    expect(argValues(ctx)).toEqual(['hello', 2]);
  });

  it.todo('matches spread arguments and consumes remaining args');
  it.todo('respects manual argument default/initial values when omitted');
});

describe('options behavior', () => {
  it('parses short boolean options', () => {
    const app = breadc('cli');
    app.option('-f, --flag');

    const ctx = app.parse(['-f']);
    expect(ctx.options.get('flag')?.value()).toBe(true);
  });

  it('parses short boolean options with value', () => {
    const app = breadc('cli');
    app.option('-f, --flag');

    const read = (arg: string) => app.parse([arg]).options.get('flag')?.value();

    expect(read('-f=YES')).toBe(true);
    expect(read('-f=T')).toBe(true);
    expect(read('-f=No')).toBe(false);
    expect(read('-f=f')).toBe(false);
  });

  it.todo('parses required option values');

  it('parses optional option values', () => {
    const app = breadc('cli');
    app.option('-o, --output [value]');

    expect(app.parse(['-o']).options.get('output')?.value()).toBe(true);
    expect(app.parse(['-o', 'file']).options.get('output')?.value()).toBe(
      'file'
    );
  });

  it('parses spread option values', () => {
    const app = breadc('cli');
    app.option('-s, --include [...value]');

    const ctx = app.parse(['-s=a', '-s=b']);
    expect(ctx.options.get('include')?.value()).toEqual(['a', 'b']);
  });

  it('supports --no-* negation semantics for boolean options', () => {
    const app = breadc('cli');
    const opt = option('--open') as unknown as InternalOption;
    opt._resolve();

    const ctx = makeContext(app as any, []);
    const matched = new MatchedOption(opt);
    matched.accept(ctx, '--open', undefined);
    expect(matched.value()).toBe(true);

    matched.accept(ctx, '--no-open', undefined);
    expect(matched.value()).toBe(false);

    matched.accept(ctx, '--no-open', 'false');
    expect(matched.value()).toBe(true);
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
    expect(matched.value()).toBe(true);
    matched.accept(ctx, '-f', undefined);
    expect(matched.value()).toBe('on');

    const opt2 = option('-o, --output [value]', '', {
      initial: 'seed',
      cast: (t) => String(t)
    }) as unknown as InternalOption;
    opt2._resolve();
    const matched2 = new MatchedOption(opt2);
    expect(matched2.value()).toBe('seed');
  });

  it.todo('parses long options (--flag/--flag=value/--flag value)');
  it.todo('supports -- escape and options["--"]');
  it.todo('maps option keys to camelCase');
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

    const ctx = app.parse(['store', 'ls', '-f']);
    expect(ctx.options.get('flag')?.value()).toBe('command');
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

    const ctx = app.parse(['-f', 'store', 'ls']);
    expect(ctx.options.get('flag')?.value()).toBe('app');
  });

  it.todo('supports options["--"] alongside layered options');
});

describe('other parsing rules', () => {
  it('treats negative numbers as arguments, not short options', () => {
    const app = breadc('cli');
    app.option('-n, --number <value>');
    app.command('calc <value>');

    const ctx = app.parse(['calc', '-1']);
    expect(argValues(ctx)).toEqual(['-1']);
    expect(ctx.options.size).toBe(0);
  });

  it.todo('supports allowUnknownOptions');
});

describe('parse errors', () => {
  it.todo('throws on missing required arguments');
  it.todo('throws on unknown sub-commands');
  it.todo('throws on duplicated default command');
  it.todo('throws on other parse-time error paths');
});
