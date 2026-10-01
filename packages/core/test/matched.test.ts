import { describe, it, expect, vi } from 'vitest';

import { ErrorCode } from '../src/error.ts';
import { breadc } from '../src/breadc/app.ts';
import { option } from '../src/breadc/option.ts';
import { argument } from '../src/breadc/command.ts';
import { resolveOption } from '../src/runtime/builder.ts';
import { context as makeContext } from '../src/runtime/context.ts';
import { MatchedArgument, MatchedOption } from '../src/runtime/matched.ts';

describe('runtime/matched: argument', () => {
  it('invalidates a finalized spread conversion without converting on assignment', () => {
    const ctx = makeContext(breadc('cli'), []);
    const cast = vi.fn((items: string[]) => items.join(','));
    const matched = new MatchedArgument(argument('[...items]', { cast }));
    expect(matched.accept(ctx, 'a').finalize()).toEqual({ value: 'a' });
    matched.accept(ctx, 'b');
    expect(cast).toHaveBeenCalledTimes(1);
    expect(matched.value()).toEqual(['a', 'b']);
    expect(matched.finalize()).toEqual({ value: 'a,b' });
    expect(cast).toHaveBeenCalledTimes(2);
  });

  it('records input and caches conversion only after finalization', () => {
    const ctx = makeContext(breadc('cli'), []);
    const cast = vi.fn(Number);
    const arg = argument('[count]', { default: '1', cast });
    const matched = new MatchedArgument(arg);
    expect(matched.dirty).toBe(false);
    expect(matched.value()).toBe('1');
    expect(matched.value()).toBe('1');
    expect(cast).not.toHaveBeenCalled();

    matched.accept(ctx, '2');
    expect(matched.dirty).toBe(true);
    expect(matched.value()).toBe('2');
    expect(cast).not.toHaveBeenCalled();
    matched.finalize();
    expect(matched.value()).toBe(2);
    matched.finalize();
    expect(matched.value()).toBe(2);
    expect(cast).toHaveBeenCalledExactlyOnceWith('2');

    const withEmpty = new MatchedArgument(arg).accept(ctx, '');
    withEmpty.finalize();
    expect(withEmpty.value()).toBe(0);
    expect(cast).toHaveBeenLastCalledWith('');
  });

  it('finalizes default input and skips absent optional input', () => {
    const cast = vi.fn(Number);
    const fallback = new MatchedArgument(argument('[count]', { default: '3', cast }));
    expect(fallback.finalize()).toEqual({ value: 3 });
    expect(cast).toHaveBeenCalledExactlyOnceWith('3');
    const missing = new MatchedArgument(argument('[count]', { cast }));
    expect(missing.finalize()).toEqual({ value: undefined });
    expect(cast).toHaveBeenCalledTimes(1);
  });

  it('collects a complete spread array before converting once', () => {
    const ctx = makeContext(breadc('cli'), []);
    const cast = vi.fn((items: string[]) => items.join(','));
    const arg = argument('[...items]', { default: ['fallback'], cast });
    const matched = new MatchedArgument(arg);
    expect(matched.value()).toEqual(['fallback']);
    matched.accept(ctx, 'a').accept(ctx, '').accept(ctx, 'b');
    expect(matched.value()).toEqual(['a', '', 'b']);
    expect(cast).not.toHaveBeenCalled();
    expect(matched.finalize()).toEqual({ value: 'a,,b' });
    expect(matched.finalize()).toEqual({ value: 'a,,b' });
    expect(cast).toHaveBeenCalledExactlyOnceWith(['a', '', 'b']);
  });

  it('throws when required/optional argument is accepted twice', () => {
    const app = breadc('cli');
    const ctx = makeContext(app, []);

    const required = new MatchedArgument(argument('<name>'));
    required.accept(ctx, 'alice');
    expect(() => required.accept(ctx, 'bob')).toThrow(
      expect.objectContaining({
        name: 'InternalError',
        code: ErrorCode.ARGUMENT_ALREADY_BOUND,
        details: { argument: required.argument, value: 'bob' },
        context: ctx
      })
    );

    const optional = new MatchedArgument(argument('[name]'));
    optional.accept(ctx, 'first');
    expect(() => optional.accept(ctx, 'second')).toThrow(
      expect.objectContaining({
        name: 'InternalError',
        code: ErrorCode.ARGUMENT_ALREADY_BOUND,
        details: { argument: optional.argument, value: 'second' },
        context: ctx
      })
    );
  });
});

describe('runtime/matched: option', () => {
  it('invalidates boolean conversion only for successful assignment', () => {
    const ctx = makeContext(breadc('cli'), []);
    const cast = vi.fn((value: boolean) => (value ? 'on' : 'off'));
    const opt = option('--all', '', { cast });
    resolveOption(opt);
    const matched = new MatchedOption(opt);
    expect(matched.finalize()).toEqual({ value: 'off' });
    matched.accept(ctx, 'all', undefined);
    expect(cast).toHaveBeenCalledTimes(1);
    expect(matched.value()).toBe(true);
    matched.accept(ctx, 'all', 'false');
    expect(ctx.issues.at(-1)?.code).toBe(ErrorCode.DUPLICATE_OPTION);
    expect(matched.finalize()).toEqual({ value: 'on' });
    expect(cast).toHaveBeenCalledTimes(2);

    const invalid = new MatchedOption(opt);
    invalid.finalize();
    invalid.accept(ctx, 'all', 'invalid');
    expect(ctx.issues.at(-1)?.code).toBe(ErrorCode.INVALID_BOOLEAN_OPTION_VALUE);
    expect(invalid.value()).toBe('off');
    expect(cast).toHaveBeenCalledTimes(3);
  });

  it('reconverts spread options after successful appends but not rejected values', () => {
    const ctx = makeContext(breadc('cli'), []);
    const cast = vi.fn((items: string[]) => items.join(','));
    const opt = option('--include [...value]', '', { cast });
    resolveOption(opt);
    const matched = new MatchedOption(opt).accept(ctx, 'include', 'a');
    matched.finalize();
    matched.accept(ctx, 'include', 'b');
    expect(matched.finalize()).toEqual({ value: 'a,b' });
    matched.accept(ctx, 'include', undefined);
    expect(ctx.issues.at(-1)?.code).toBe(ErrorCode.MISSING_OPTION_VALUE);
    expect(matched.finalize()).toEqual({ value: 'a,b' });
    expect(cast).toHaveBeenCalledTimes(2);
  });

  it.each([false, true])('records invalid boolean values without assigning them (inverted=%s)', (inverted) => {
    const opt = option('--all', '', { default: true });
    resolveOption(opt);
    const name = inverted ? 'no-all' : 'all';

    for (const value of ['abc', '', ' ', ' true', 'false ', '2', '-1']) {
      const ctx = makeContext(breadc('cli'), []);
      const matched = new MatchedOption(opt);
      expect(matched.accept(ctx, name, value, inverted)).toBe(matched);
      expect(ctx.issues).toEqual([
        expect.objectContaining({ code: ErrorCode.INVALID_BOOLEAN_OPTION_VALUE, option: opt, name, value })
      ]);
      expect(matched.dirty).toBe(false);
      expect(matched.raw).toBe(true);

      matched.accept(ctx, name, '0', inverted);
      expect(ctx.issues.map((issue) => issue.code)).toEqual([
        ErrorCode.INVALID_BOOLEAN_OPTION_VALUE,
        ErrorCode.DUPLICATE_OPTION
      ]);
      expect(matched.dirty).toBe(false);
      expect(matched.raw).toBe(true);
    }
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
    matched.accept(ctx, 'n', undefined);
    expect(ctx.issues).toEqual([
      expect.objectContaining({ code: ErrorCode.MISSING_OPTION_VALUE, option: opt, name: 'n' })
    ]);
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

    matched.accept(ctx, 'output', undefined);
    expect(ctx.issues).toEqual([expect.objectContaining({ code: ErrorCode.MISSING_OPTION_VALUE })]);
    expect(ctx.tokens.peek()?.toRaw()).toBe(value);
    expect(matched.dirty).toBe(false);
  });

  it('does not use default to fill a missing required value', () => {
    const app = breadc('cli');
    const opt = option('-n, --number <value>', '', { default: 'seed' });
    resolveOption(opt);

    const ctx = makeContext(app, []);
    const matched = new MatchedOption(opt);
    matched.accept(ctx, 'n', undefined);
    expect(ctx.issues).toEqual([expect.objectContaining({ code: ErrorCode.MISSING_OPTION_VALUE })]);
    expect(matched.raw).toBe('seed');
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

  it('records a diagnostic when required option is accepted twice', () => {
    const app = breadc('cli');
    const opt = option('-n, --number <value>');
    resolveOption(opt);

    const ctx = makeContext(app, []);
    const matched = new MatchedOption(opt).accept(ctx, 'n', '1');
    matched.accept(ctx, '-n', '2');
    expect(ctx.issues).toEqual([expect.objectContaining({ code: ErrorCode.DUPLICATE_OPTION, value: '2' })]);
    expect(matched.raw).toBe('1');
  });

  it('records a diagnostic when boolean option is accepted twice', () => {
    const app = breadc('cli');
    const opt = option('--open');
    resolveOption(opt);

    const ctx = makeContext(app, []);
    const matched = new MatchedOption(opt).accept(ctx, 'open', undefined);
    matched.accept(ctx, 'open', undefined);
    expect(ctx.issues).toEqual([expect.objectContaining({ code: ErrorCode.DUPLICATE_OPTION })]);
    expect(matched.raw).toBe(true);
  });

  it('records a diagnostic when optional option is accepted twice', () => {
    const app = breadc('cli');
    const opt = option('-o, --output [value]');
    resolveOption(opt);

    const ctx = makeContext(app, []);
    const matched = new MatchedOption(opt).accept(ctx, 'o', 'first');
    matched.accept(ctx, 'o', 'second');
    expect(ctx.issues).toEqual([expect.objectContaining({ code: ErrorCode.DUPLICATE_OPTION, value: 'second' })]);
    expect(matched.raw).toBe('first');
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
        const count = ctx.issues.length;
        matched.accept(ctx, 's', undefined);
        expect(ctx.issues).toHaveLength(count + 1);
        expect(ctx.issues.at(-1)).toEqual(
          expect.objectContaining({ code: ErrorCode.MISSING_OPTION_VALUE, option: opt, name: 's' })
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
