import { describe, it, expect, vi } from 'vitest';

import { breadc } from '../src/breadc/app.ts';
import { option } from '../src/breadc/option.ts';
import { argument } from '../src/breadc/command.ts';
import { RuntimeError } from '../src/error.ts';
import { resolveOption } from '../src/runtime/builder.ts';
import { context as makeContext } from '../src/runtime/context.ts';
import { MatchedArgument, MatchedOption } from '../src/runtime/matched.ts';

describe('runtime/matched: argument', () => {
  it.each([undefined, '3'])('uses default before input and casts accepted input with initial %j', (initial) => {
    const app = breadc('cli');
    const ctx = makeContext(app, []);

    const cast = vi.fn((t: string | undefined) => Number(t));
    const arg = argument('[count]', { initial, default: '1', cast });
    const matched = new MatchedArgument(arg);
    expect(matched.dirty).toBe(false);
    expect(matched.value()).toMatchInlineSnapshot(`"1"`);
    expect(cast).not.toHaveBeenCalled();

    matched.accept(ctx, '2');
    expect(matched.dirty).toBe(true);
    expect(matched.value()).toMatchInlineSnapshot(`2`);
    expect(cast).toHaveBeenCalledExactlyOnceWith('2');

    const withEmpty = new MatchedArgument(arg).accept(ctx, '');
    expect(withEmpty.dirty).toBe(true);
    expect(withEmpty.value()).toBe(0);
    expect(cast).toHaveBeenLastCalledWith('');
  });

  it('uses initial value when provided', () => {
    const arg = argument('[name]', { initial: 'seed' });
    const matched = new MatchedArgument(arg);
    expect(matched.value()).toMatchInlineSnapshot(`"seed"`);
  });

  it('supports required argument values and fallback behavior', () => {
    const app = breadc('cli');
    const ctx = makeContext(app, []);

    const withValue = new MatchedArgument(argument('<name>'));
    withValue.accept(ctx, 'alice');
    expect(withValue.value()).toMatchInlineSnapshot(`"alice"`);

    const withFallback = new MatchedArgument(argument('<name>'));
    withFallback.accept(ctx, undefined);
    expect(withFallback.value()).toMatchInlineSnapshot(`""`);
  });

  it('supports optional argument values and preserves initial value', () => {
    const app = breadc('cli');
    const ctx = makeContext(app, []);

    const withUndefined = new MatchedArgument(argument('[name]'));
    withUndefined.accept(ctx, undefined);
    expect(withUndefined.value()).toMatchInlineSnapshot(`undefined`);

    const withInitial = new MatchedArgument(argument('[name]', { initial: 'seed' }));
    withInitial.accept(ctx, undefined);
    expect(withInitial.value()).toMatchInlineSnapshot(`"seed"`);

    const withValue = new MatchedArgument(argument('[name]', { initial: 'seed' }));
    withValue.accept(ctx, 'next');
    expect(withValue.value()).toMatchInlineSnapshot(`"next"`);
  });

  it('supports spread argument accumulation and empty fallback', () => {
    const app = breadc('cli');
    const ctx = makeContext(app, []);

    const arg = argument('[...items]');
    const matched = new MatchedArgument(arg);

    expect(matched.value()).toMatchInlineSnapshot(`[]`);

    matched.accept(ctx, 'a');
    matched.accept(ctx, undefined);
    matched.accept(ctx, 'b');
    expect(matched.value()).toMatchInlineSnapshot(`
      [
        "a",
        "",
        "b",
      ]
    `);
  });

  it('throws when required/optional argument is accepted twice', () => {
    const app = breadc('cli');
    const ctx = makeContext(app, []);

    const required = new MatchedArgument(argument('<name>'));
    required.accept(ctx, 'alice');
    expect(() => required.accept(ctx, 'bob')).toThrow();

    const optional = new MatchedArgument(argument('[name]'));
    optional.accept(ctx, 'first');
    expect(() => optional.accept(ctx, 'second')).toThrow();
  });
});

describe('runtime/matched: option', () => {
  it.each([false, true])('rejects invalid boolean values without changing state (inverted=%s)', (inverted) => {
    const opt = option('--all', '', { default: true });
    resolveOption(opt);
    const ctx = makeContext(breadc('cli'), []);
    const matched = new MatchedOption(opt);
    const name = inverted ? 'no-all' : 'all';

    for (const value of ['abc', '', ' ', ' true', 'false ', '2', '-1']) {
      expect(() => matched.accept(ctx, name, value, inverted)).toThrow(
        expect.objectContaining({
          message: `${RuntimeError.INVALID_BOOLEAN_OPTION_VALUE}: --all`,
          cause: { option: opt, name, value },
          context: ctx
        })
      );
      expect({ dirty: matched.dirty, raw: matched.raw }).toMatchInlineSnapshot(`
        {
          "dirty": false,
          "raw": true,
        }
      `);
    }

    matched.accept(ctx, name, '0', inverted);
    expect(matched.value()).toBe(inverted);
    expect(matched.dirty).toMatchInlineSnapshot(`true`);
  });

  it('reads optional value from next token', () => {
    const app = breadc('cli');
    const opt = option('-o, --output [value]');
    resolveOption(opt);

    const ctx = makeContext(app, ['-o', 'next']);
    ctx.tokens.next();

    const matched = new MatchedOption(opt).accept(ctx, 'o', undefined);
    expect(matched.value()).toMatchInlineSnapshot(`"next"`);
  });

  it('rejects a required option with missing value without marking it assigned', () => {
    const app = breadc('cli');
    const opt = option('-n, --number <value>');
    resolveOption(opt);

    const ctx = makeContext(app, []);
    const matched = new MatchedOption(opt);
    expect(() => matched.accept(ctx, 'n', undefined)).toThrow(
      expect.objectContaining({
        message: `${RuntimeError.REQUIRED_OPTION_VALUE_MISSING}: --number`,
        cause: { option: opt, name: 'n', value: undefined },
        context: ctx
      })
    );
    expect(matched.dirty).toBe(false);
  });

  it('accepts required option value when provided', () => {
    const app = breadc('cli');
    const opt = option('-n, --number <value>');
    resolveOption(opt);

    const ctx = makeContext(app, []);
    const matched = new MatchedOption(opt).accept(ctx, 'n', '1');
    expect(matched.value()).toMatchInlineSnapshot(`"1"`);
  });

  it.each(['--all', '--help', '-2foo', '--'])('does not consume %s when a required value is missing', (value) => {
    const opt = option('--output <value>');
    resolveOption(opt);
    const ctx = makeContext(breadc('cli'), [value]);
    const matched = new MatchedOption(opt);

    expect(() => matched.accept(ctx, 'output', undefined)).toThrow(RuntimeError.REQUIRED_OPTION_VALUE_MISSING);
    expect(ctx.tokens.peek()?.toRaw()).toBe(value);
    expect(matched.dirty).toBe(false);
  });

  it('does not use default to fill a missing required value', () => {
    const app = breadc('cli');
    const opt = option('-n, --number <value>', '', { default: 'seed' });
    resolveOption(opt);

    const ctx = makeContext(app, []);
    const matched = new MatchedOption(opt);
    expect(() => matched.accept(ctx, 'n', undefined)).toThrow(RuntimeError.REQUIRED_OPTION_VALUE_MISSING);
  });

  it('interprets negated boolean option with explicit false text', () => {
    const app = breadc('cli');
    const opt = option('--open');
    resolveOption(opt);

    const ctx = makeContext(app, []);
    const matched = new MatchedOption(opt).accept(ctx, 'no-open', 'false', true);
    expect(matched.value()).toMatchInlineSnapshot(`true`);
  });

  it('interprets negated boolean option with explicit true text', () => {
    const app = breadc('cli');
    const opt = option('--open');
    resolveOption(opt);

    const ctx = makeContext(app, []);
    const matched = new MatchedOption(opt).accept(ctx, 'no-open', 'true', true);
    expect(matched.value()).toMatchInlineSnapshot(`false`);
  });

  it('throws when required option is accepted twice', () => {
    const app = breadc('cli');
    const opt = option('-n, --number <value>');
    resolveOption(opt);

    const ctx = makeContext(app, []);
    const matched = new MatchedOption(opt).accept(ctx, 'n', '1');
    expect(() => matched.accept(ctx, '-n', '2')).toThrow(RuntimeError.REQUIRED_OPTION_ACCEPT_ONCE);
  });

  it('throws when boolean option is accepted twice', () => {
    const app = breadc('cli');
    const opt = option('--open');
    resolveOption(opt);

    const ctx = makeContext(app, []);
    const matched = new MatchedOption(opt).accept(ctx, 'open', undefined);
    expect(() => matched.accept(ctx, 'open', undefined)).toThrow(RuntimeError.BOOLEAN_OPTION_ACCEPT_ONCE);
  });

  it('throws when optional option is accepted twice', () => {
    const app = breadc('cli');
    const opt = option('-o, --output [value]');
    resolveOption(opt);

    const ctx = makeContext(app, []);
    const matched = new MatchedOption(opt).accept(ctx, 'o', 'first');
    expect(() => matched.accept(ctx, 'o', 'second')).toThrow(RuntimeError.OPTIONAL_OPTION_ACCEPT_ONCE);
  });

  it('accumulates spread option values', () => {
    const app = breadc('cli');
    const opt = option('-s, --include [...value]');
    resolveOption(opt);

    const ctx = makeContext(app, []);
    const matched = new MatchedOption(opt).accept(ctx, 's', 'a').accept(ctx, 's', 'b');
    expect(matched.value()).toMatchInlineSnapshot(`
      [
        "a",
        "b",
      ]
    `);
  });

  it('reads spread value from next token when omitted', () => {
    const app = breadc('cli');
    const opt = option('-s, --include [...value]');
    resolveOption(opt);

    const ctx = makeContext(app, ['-s', 'next']);
    ctx.tokens.next();

    const matched = new MatchedOption(opt);
    matched.accept(ctx, 's', undefined);
    expect(matched.value()).toMatchInlineSnapshot(`
      [
        "next",
      ]
    `);
  });

  it.each([undefined, '--all', '--help', '--unknown', '-2foo', '--'])(
    'rejects missing spread values before %s without consuming tokens or changing state',
    (next) => {
      const opt = option('-s, --include [...value]');
      resolveOption(opt);
      const ctx = makeContext(breadc('cli'), next === undefined ? [] : [next]);
      const matched = new MatchedOption(opt);

      const rejectMissing = () => {
        expect(() => matched.accept(ctx, 's', undefined)).toThrow(
          expect.objectContaining({
            message: `${RuntimeError.REQUIRED_OPTION_VALUE_MISSING}: --include`,
            cause: { option: opt, name: 's', value: undefined },
            context: ctx
          })
        );
        expect(ctx.tokens.peek()?.toRaw()).toBe(next);
      };

      rejectMissing();
      expect(matched.raw).toEqual([]);
      expect(matched.dirty).toBe(false);

      matched.accept(ctx, 's', 'a');
      rejectMissing();
      expect(matched.raw).toEqual(['a']);
      expect(matched.dirty).toBe(true);
    }
  );

  it('reads optional value from next token when it is negative', () => {
    const app = breadc('cli');
    const opt = option('-o, --offset [value]');
    resolveOption(opt);

    const ctx = makeContext(app, ['-o', '-1']);
    ctx.tokens.next();

    const matched = new MatchedOption(opt).accept(ctx, 'o', undefined);
    expect(matched.value()).toMatchInlineSnapshot(`"-1"`);
  });

  it('uses optional value when provided directly', () => {
    const app = breadc('cli');
    const opt = option('-o, --offset [value]');
    resolveOption(opt);

    const ctx = makeContext(app, []);
    const matched = new MatchedOption(opt).accept(ctx, 'o', 'manual');
    expect(matched.value()).toMatchInlineSnapshot(`"manual"`);
  });
});
