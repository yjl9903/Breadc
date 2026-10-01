import { describe, it, expect, vi } from 'vitest';

import { breadc, option } from '../src/breadc/index.ts';
import { resolveOption } from '../src/runtime/builder.ts';
import { resolveOptions } from '../src/runtime/parser.ts';

describe('runtime/builder: option', () => {
  it('resolve boolean option', () => {
    const opt = option('--flag');
    resolveOption(opt);

    expect(opt).toMatchInlineSnapshot(`
      {
        "description": undefined,
        "form": "positive",
        "init": {},
        "long": "flag",
        "spec": "--flag",
        "type": "boolean",
      }
    `);
  });

  it('resolve short and required option', () => {
    const opt = option('-f, --flag <value>');
    resolveOption(opt);

    expect(opt).toMatchInlineSnapshot(`
      {
        "argument": "<value>",
        "description": undefined,
        "init": {},
        "long": "flag",
        "short": "f",
        "spec": "-f, --flag <value>",
        "type": "required",
      }
    `);
  });

  it('resolve optional option', () => {
    const opt = option('-o, --output [value]');
    resolveOption(opt);

    expect(opt).toMatchInlineSnapshot(`
      {
        "argument": "[value]",
        "description": undefined,
        "init": {},
        "long": "output",
        "short": "o",
        "spec": "-o, --output [value]",
        "type": "optional",
      }
    `);
  });

  it('resolve spread option', () => {
    const opt = option('--include <...value>');
    resolveOption(opt);

    expect(opt).toMatchInlineSnapshot(`
      {
        "argument": "<...value>",
        "description": undefined,
        "init": {},
        "long": "include",
        "spec": "--include <...value>",
        "type": "spread",
      }
    `);
  });

  it('resolve --no-* boolean option', () => {
    const opt = option('--no-open');
    resolveOption(opt);

    expect(opt).toMatchInlineSnapshot(`
      {
        "description": undefined,
        "form": "negative",
        "init": {},
        "long": "open",
        "spec": "--no-open",
        "type": "boolean",
      }
    `);
  });

  it('reject --no-* with argument', () => {
    expect(() => {
      const opt = option('--no-open <value>');
      resolveOption(opt);
    }).toThrowErrorMatchingInlineSnapshot(
      `[DefinitionError: Resolving invalid option at the option "--no-open <value>"]`
    );
  });

  it('reject invalid option spec', () => {
    expect(() => {
      const opt = option('invalid');
      resolveOption(opt);
    }).toThrowErrorMatchingInlineSnapshot(`[DefinitionError: Resolving invalid option at the option "invalid"]`);
  });

  it('resolves forms without modifying the initial configuration', () => {
    for (const [spec, form] of [
      ['--all', 'positive'],
      ['--no-all', 'negative'],
      ['-a, --[no-]all', 'both']
    ]) {
      const opt = option(spec);
      const init = { ...opt.init };
      expect(resolveOption(opt)).toMatchObject({ long: 'all', form, type: 'boolean' });
      expect(opt.init).toEqual(init);
    }
    expect(resolveOption(option('--output [value]')).form).toBeUndefined();
  });
});

describe('option input selection and conversion', () => {
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

  it.each(['true', 't', 'yes', 'y', 'on', '1', 'false', 'f', 'no', 'n', 'off', '0'])(
    'normalizes explicit boolean %s before cast without consuming another word',
    (text) => {
      const parsed = ['true', 't', 'yes', 'y', 'on', '1'].includes(text);
      for (const name of ['--cache', '--no-cache', '-c']) {
        const cast = vi.fn((value: boolean) => value);
        const app = breadc('cli').option('-c, --[no-]cache', '', { cast });
        const result = app.parse([`${name}=${text.toUpperCase()}`, 'word']);
        expect(result.options.cache).toBe(name === '--no-cache' ? !parsed : parsed);
        expect(cast).toHaveBeenCalledExactlyOnceWith(result.options.cache);
        expect(result.args).toEqual(['word']);
      }
    }
  );

  it.each(['', 'invalid', ' true', '2'])('rejects invalid boolean %j before any cast', (text) => {
    const cast = vi.fn();
    const app = breadc('cli').option('--other', '', { cast }).option('--cache', '', { cast });
    expect(() => app.parse([`--cache=${text}`])).toThrow('Invalid boolean option value');
    expect(cast).not.toHaveBeenCalled();
  });

  it.each(['<value>', '[value]'] as const)('selects raw input/default for scalar %s', (syntax) => {
    const cast = vi.fn((value: string | undefined) => (value === undefined ? 'bare' : `[${value}]`));
    const app = breadc('cli').option(`--value ${syntax}`, '', { cast });
    expect(app.parse([]).options.value).toBeUndefined();
    expect(cast).not.toHaveBeenCalled();
    for (const argv of [['--value='], ['--value', ''], ['--value=8080'], ['--value', '8080']]) {
      cast.mockClear();
      const raw = argv.length === 2 ? argv[1] : argv[0].slice('--value='.length);
      expect(app.parse(argv).options.value).toBe(`[${raw}]`);
      expect(cast).toHaveBeenCalledExactlyOnceWith(raw);
    }
    for (const fallback of ['', 'default']) {
      cast.mockClear();
      const withDefault = breadc('cli').option(`--value ${syntax}`, '', { default: fallback, cast });
      expect(withDefault.parse([]).options.value).toBe(`[${fallback}]`);
      expect(cast).toHaveBeenCalledExactlyOnceWith(fallback);
      cast.mockClear();
      expect(withDefault.parse(['--value=provided']).options.value).toBe('[provided]');
      expect(cast).toHaveBeenCalledExactlyOnceWith('provided');
    }
  });

  it.each([undefined, '', 'default'])('distinguishes absent and bare optional values with default %j', (fallback) => {
    const cast = vi.fn((value: string | undefined) => value);
    const app = breadc('cli').option('-c, --color [value]', '', { default: fallback, cast }).option('--other');
    const absent = app.parse([]);
    expect(absent.options.color).toBe(fallback);
    expect(absent.context.options.get('color')?.dirty).toBe(false);
    expect(cast).toHaveBeenCalledTimes(fallback === undefined ? 0 : 1);
    for (const argv of [['--color'], ['-c'], ['--color', '--other'], ['--color', '--', 'word']]) {
      cast.mockClear();
      const bare = app.parse(argv);
      expect(bare.options.color).toBeUndefined();
      expect(bare.context.options.get('color')?.dirty).toBe(true);
      expect(cast).toHaveBeenCalledExactlyOnceWith(undefined);
    }
    expect(app.parse(['--color', '--other']).options.other).toBe(true);
  });

  it('preserves raw undefined for both absent and bare options without a cast', () => {
    const app = breadc('cli').option('--color [value]', '', { default: 'auto' });
    expect(app.parse([]).options.color).toBe('auto');
    expect(app.parse(['--color']).options.color).toBeUndefined();
    const plain = breadc('cli').option('--color [value]');
    expect(plain.parse([]).options.color).toBeUndefined();
    expect(plain.parse(['--color']).options.color).toBeUndefined();
  });

  it.each(['<value>', '<...value>'] as const)('rejects missing %s before conversion despite default', (syntax) => {
    const cast = vi.fn();
    const config = { default: syntax === '<value>' ? 'seed' : ['seed'], cast };
    const app = breadc('cli').option(`--value ${syntax}`, '', config).option('--other', '', { cast });
    for (const argv of [['--value'], ['--value', '--other'], ['--value', '--']]) {
      expect(() => app.parse(argv)).toThrow('Missing required option value');
    }
    expect(cast).not.toHaveBeenCalled();
  });

  it.each([undefined, null, false, ''])('preserves cast result %j without falling back', (output) => {
    const cast = vi.fn(() => output);
    const app = breadc('cli').option('--value <value>', '', { default: 'seed', cast });
    for (const argv of [[], ['--value=provided']]) {
      cast.mockClear();
      const result = app.parse(argv);
      expect(result.options.value).toBe(output);
      result.context.options.get('value')?.finalize();
      expect(resolveOptions(result.context).value).toBe(output);
      expect(result.context.options.get('value')?.value()).toBe(output);
      expect(cast).toHaveBeenCalledTimes(1);
    }
  });

  it('propagates conversion errors and never converts an overridden default', () => {
    const error = new Error('invalid port');
    const cast = vi.fn((raw: string) => {
      if (raw === 'invalid') throw error;
      return Number(raw);
    });
    const app = breadc('cli').option('--port <value>', '', { default: 'invalid', cast });
    expect(app.parse(['--port=8080']).options.port).toBe(8080);
    expect(cast).toHaveBeenCalledExactlyOnceWith('8080');
    expect(() => app.parse([])).toThrow(error);
    const validDefault = breadc('cli').option('--port <value>', '', { default: '80', cast });
    expect(() => validDefault.parse(['--port=invalid'])).toThrow(error);
  });

  it.each([undefined, [], ['seed']])('casts one isolated array using default %j', (fallback) => {
    const cast = vi.fn((values: string[]) => {
      values.push('cast');
      return new Set(values);
    });
    const app = breadc('cli').option(option('-i, --include <...value>', '', { default: fallback, cast }));
    const saved = fallback?.slice();
    for (let i = 0; i < 2; i++) {
      cast.mockClear();
      const absent = app.parse([]);
      expect(absent.options.include).toEqual(new Set([...(saved ?? []), 'cast']));
      expect(cast).toHaveBeenCalledTimes(1);
      cast.mockClear();
      const provided = app.parse(['--include=lib', '-i', 'test', '--include=', 'positional']);
      expect(provided.options.include).toEqual(new Set(['lib', 'test', '', 'cast']));
      expect(provided.args).toEqual(['positional']);
      expect(cast).toHaveBeenCalledExactlyOnceWith(['lib', 'test', '', 'cast']);
      expect(fallback).toEqual(saved);
    }
  });

  it('isolates unconverted arrays across parses and from configuration', () => {
    const fallback = ['seed'];
    const app = breadc('cli').option('--include <...value>', '', { default: fallback });
    app.parse([]).options.include.push('mutated');
    app.parse(['--include=provided']).options.include.push('mutated');
    expect(app.parse([]).options.include).toEqual(['seed']);
    expect(fallback).toEqual(['seed']);
    const empty = breadc('cli').option('--include <...value>');
    empty.parse([]).options.include.push('mutated');
    expect(empty.parse([]).options.include).toEqual([]);
  });

  it.each([
    { spec: '-c, --[no-]cache', argv: ['--cache', '--no-cache'] },
    { spec: '-c, --[no-]cache', argv: ['--no-cache', '-c'] },
    { spec: '-c, --cache <value>', argv: ['--cache=a', '-c=b'] },
    { spec: '-c, --cache [value]', argv: ['--cache', '-c=b'] }
  ])('rejects duplicate assignments before cast for $spec', ({ spec, argv }) => {
    const cast = vi.fn();
    const app = breadc('cli').option(spec, '', { cast });
    expect(() => app.parse(argv)).toThrow();
    expect(cast).not.toHaveBeenCalled();
  });
});

describe('option conversion lifecycle', () => {
  it.each([false, true])('casts only the final default command scope (grouped: %s)', (grouped) => {
    const outer = vi.fn(() => 'outer');
    const inner = vi.fn((values: string[]) => values.join(','));
    const app = breadc('cli').option('--include <...value>', '', { default: ['outer'], cast: outer });
    const parent = grouped ? app.group('tool') : app;
    parent.command('[file]').option('--include <...value>', '', { default: ['inner'], cast: inner });
    parent.command('other');
    const prefix = grouped ? ['tool'] : [];
    for (const argv of [[], ['--include=a', '--include=b', 'file']]) {
      outer.mockClear();
      inner.mockClear();
      const result = app.parse([...prefix, ...argv]);
      expect(result.options.include).toBe(argv.length ? 'a,b' : 'inner');
      expect(outer).not.toHaveBeenCalled();
      expect(inner).toHaveBeenCalledExactlyOnceWith(argv.length ? ['a', 'b'] : ['inner']);
      resolveOptions(result.context);
      expect(inner).toHaveBeenCalledTimes(1);
    }
  });

  it('casts only active app, group and command declarations', () => {
    const appCast = vi.fn(() => 'app');
    const groupCast = vi.fn(() => 'group');
    const commandCast = vi.fn(() => 'command');
    const unrelated = vi.fn();
    const app = breadc('cli').option('--root', '', { cast: appCast });
    const group = app.group('tool').option('--group', '', { cast: groupCast });
    group.command('run').option('--command', '', { cast: commandCast });
    group.command('other').option('--other', '', { cast: unrelated });
    expect(app.parse(['tool', 'run']).options).toEqual({ root: 'app', group: 'group', command: 'command' });
    for (const cast of [appCast, groupCast, commandCast]) expect(cast).toHaveBeenCalledExactlyOnceWith(false);
    expect(unrelated).not.toHaveBeenCalled();
  });

  it.each(['--help', '--version'])('skips user casts for %s in parse and run', async (flag) => {
    const cast = vi.fn(() => {
      throw new Error('must not convert');
    });
    const action = vi.fn();
    const middleware = vi.fn();
    const app = breadc('cli', { version: '1.0.0' }).option('--value [value]', '', { default: 'seed', cast });
    app.command('<required>').action(action).use(middleware);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      app.parse(['--value', flag]);
      await app.run(['--value', flag]);
      expect(cast).not.toHaveBeenCalled();
      expect(action).not.toHaveBeenCalled();
      expect(middleware).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });

  it('validates all syntax before casting', () => {
    const cast = vi.fn();
    const app = breadc('cli').option('--value', '', { cast });
    app.command('run <required>');
    for (const argv of [['--unknown'], ['run'], ['run', 'a', 'b']]) {
      expect(() => app.parse(argv)).toThrow();
      expect(cast).not.toHaveBeenCalled();
    }
  });

  it('does not cast when unknown-option middleware reads a preliminary pass', () => {
    const cast = vi.fn((value: boolean) => (value ? 'on' : 'off'));
    const seen: unknown[] = [];
    const app = breadc('cli').option('--flag', '', { cast });
    app.allowUnknownOption((context) => {
      seen.push(context.options.get('flag')?.value());
      return { name: 'unknown', value: undefined };
    });
    app.command('').action(() => {});
    app.command('other');
    expect(app.parse(['--flag', '--unknown']).options.flag).toBe('on');
    expect(seen).toEqual([true, true]);
    expect(cast).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('shares one converted result between action and middleware after next', async () => {
    const cast = vi.fn((value: string | undefined) => ({ value }));
    const observed: unknown[] = [];
    const app = breadc('cli').option('--value [value]', '', { cast });
    app.use(async (context, next) => {
      observed.push(resolveOptions(context).value);
      const result = await next();
      observed.push(resolveOptions(context).value);
      return result;
    });
    app.command('').action((options, context) => {
      observed.push(options.value, context.options.get('value')?.value());
      return options.value;
    });
    const result = await app.run(['--value']);
    expect(result).toEqual({ value: undefined });
    expect(observed).toHaveLength(4);
    expect(observed[0]).toBeUndefined();
    for (const value of observed.slice(1)) expect(value).toBe(result);
    expect(cast).toHaveBeenCalledExactlyOnceWith(undefined);
  });

  it('finalizes unknown-command input after the handler returns', async () => {
    const cast = vi.fn((value: boolean) => Number(value));
    const app = breadc('cli').option('--flag', '', { cast });
    app.onUnknownCommand((context) => {
      expect(context.options.get('flag')!.raw).toBe(false);
      expect(cast).not.toHaveBeenCalled();
      return context;
    });
    const result = await app.run<import('../src/index.ts').Context>(['unknown']);
    expect(resolveOptions(result)).toEqual({ flag: 0 });
    expect(cast).toHaveBeenCalledExactlyOnceWith(false);
  });
});
