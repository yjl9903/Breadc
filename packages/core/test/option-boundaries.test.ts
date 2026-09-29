import { describe, it, expect } from 'vitest';

import { breadc } from '../src/breadc/app.ts';
import { RuntimeError, ResolveOptionError } from '../src/error.ts';
import { Token } from '../src/runtime/lexer.ts';
import { isHelp } from '../src/runtime/parser.ts';

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

describe('runtime/lexer: complete decimal syntax', () => {
  it.each(['2', '+2', '0', '02', '.5', '2.', '2E+3', ...negativeNumbers])('recognizes %s', (value) => {
    const token = new Token(value);
    expect(token.isNumber).toBe(true);
    expect(token.isNegativeNumber).toBe(value.startsWith('-'));
  });

  it.each(['', ' ', ' 2', '2 ', '-2\n', '-2\r', '-2\t', '2foo', '0x10', 'Infinity', 'NaN', ...optionLikeValues])(
    'does not recognize %j as a complete number',
    (value) => {
      const token = new Token(value);
      expect(token.isNumber).toBe(false);
      expect(token.isNegativeNumber).toBe(false);
    }
  );
});
