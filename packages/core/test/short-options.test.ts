import { describe, it, expect, vi } from 'vitest';

import { breadc } from '../src/breadc/app.ts';
import { ResolveOptionError, RuntimeError } from '../src/error.ts';

describe('runtime/parser: short option combinations', () => {
  const createApp = () => breadc('cli').option('-a, --all').option('-b, --brief').option('-o, --output <file>');

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
    ['-o, --output <value>', undefined, '--brief', false],
    ['-o, --output [value]', true, true, true],
    ['-o, --output [...value]', [''], ['--brief'], false]
  ])('preserves following-token rules for %s', (spec, missing, beforeOption, brief) => {
    const app = breadc('cli').option('-a, --all').option('-b, --brief').option(spec);
    expect(app.parse(['-ao']).options.output).toEqual(missing);
    expect(app.parse(['-ao', '--brief']).options).toEqual({ all: true, brief, output: beforeOption });
    expect(app.parse(['-ao', '-1']).options.output).toEqual(spec.includes('...') ? ['-1'] : '-1');

    const escaped = app.parse(['-ao', '--', '-ab']);
    expect(escaped.options).toEqual({ all: true, brief: false, output: missing });
    expect(escaped['--']).toEqual(['-ab']);
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
