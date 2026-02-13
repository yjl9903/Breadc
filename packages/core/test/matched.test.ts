import { describe, it, expect } from 'vitest';

import { breadc } from '../src/breadc/app.ts';
import { option } from '../src/breadc/option.ts';
import { argument } from '../src/breadc/command.ts';
import { RuntimeError } from '../src/error.ts';
import { resolveOption } from '../src/runtime/builder.ts';
import { context as makeContext } from '../src/runtime/context.ts';
import { MatchedArgument, MatchedOption } from '../src/runtime/matched.ts';

describe('runtime/matched: argument', () => {
  it('uses default when not dirty and applies cast when dirty', () => {
    const app = breadc('cli');
    const ctx = makeContext(app, []);

    const arg = argument('[count]', { default: '1', cast: (t) => Number(t) });
    const matched = new MatchedArgument(arg);
    expect(matched.value()).toMatchInlineSnapshot(`"1"`);

    matched.accept(ctx, '2');
    expect(matched.value()).toMatchInlineSnapshot(`2`);
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
    expect(() => required.accept(ctx, 'bob')).toThrowError();

    const optional = new MatchedArgument(argument('[name]'));
    optional.accept(ctx, 'first');
    expect(() => optional.accept(ctx, 'second')).toThrowError();
  });
});

describe('runtime/matched: option', () => {
  it('reads optional value from next token', () => {
    const app = breadc('cli');
    const opt = option('-o, --output [value]');
    resolveOption(opt);

    const ctx = makeContext(app, ['-o', 'next']);
    ctx.tokens.next();

    const matched = new MatchedOption(opt).accept(ctx, 'o', undefined);
    expect(matched.value()).toMatchInlineSnapshot(`"next"`);
  });

  it('falls back required option with missing value to empty string', () => {
    const app = breadc('cli');
    const opt = option('-n, --number <value>');
    resolveOption(opt);

    const ctx = makeContext(app, []);
    const matched = new MatchedOption(opt);
    matched.accept(ctx, 'n', undefined);
    expect(matched.value()).toMatchInlineSnapshot(`undefined`);
  });

  it('accepts required option value when provided', () => {
    const app = breadc('cli');
    const opt = option('-n, --number <value>');
    resolveOption(opt);

    const ctx = makeContext(app, []);
    const matched = new MatchedOption(opt).accept(ctx, 'n', '1');
    expect(matched.value()).toMatchInlineSnapshot(`"1"`);
  });

  it('falls back to initial for required option when next token raw value is undefined', () => {
    const app = breadc('cli');
    const opt = option('-n, --number <value>', '', { initial: 'seed' });
    resolveOption(opt);

    const ctx = makeContext(app, []);
    const matched = new MatchedOption(opt).accept(ctx, 'n', undefined);
    expect(matched.value()).toMatchInlineSnapshot(`"seed"`);
  });

  it('interprets negated boolean option with explicit false text', () => {
    const app = breadc('cli');
    const opt = option('--open');
    resolveOption(opt);

    const ctx = makeContext(app, []);
    const matched = new MatchedOption(opt).accept(ctx, 'no-open', 'false');
    expect(matched.value()).toMatchInlineSnapshot(`true`);
  });

  it('interprets negated boolean option with explicit true text', () => {
    const app = breadc('cli');
    const opt = option('--open');
    resolveOption(opt);

    const ctx = makeContext(app, []);
    const matched = new MatchedOption(opt).accept(ctx, 'no-open', 'true');
    expect(matched.value()).toMatchInlineSnapshot(`false`);
  });

  it('throws when required option is accepted twice', () => {
    const app = breadc('cli');
    const opt = option('-n, --number <value>');
    resolveOption(opt);

    const ctx = makeContext(app, []);
    const matched = new MatchedOption(opt).accept(ctx, 'n', '1');
    expect(() => matched.accept(ctx, '-n', '2')).toThrowError(RuntimeError.REQUIRED_OPTION_ACCEPT_ONCE);
  });

  it('throws when boolean option is accepted twice', () => {
    const app = breadc('cli');
    const opt = option('--open');
    resolveOption(opt);

    const ctx = makeContext(app, []);
    const matched = new MatchedOption(opt).accept(ctx, 'open', undefined);
    expect(() => matched.accept(ctx, 'open', undefined)).toThrowError(RuntimeError.BOOLEAN_OPTION_ACCEPT_ONCE);
  });

  it('throws when optional option is accepted twice', () => {
    const app = breadc('cli');
    const opt = option('-o, --output [value]');
    resolveOption(opt);

    const ctx = makeContext(app, []);
    const matched = new MatchedOption(opt).accept(ctx, 'o', 'first');
    expect(() => matched.accept(ctx, 'o', 'second')).toThrowError(RuntimeError.OPTIONAL_OPTION_ACCEPT_ONCE);
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

  it('pushes empty string for spread option when next token raw value is undefined', () => {
    const app = breadc('cli');
    const opt = option('-s, --include [...value]');
    resolveOption(opt);

    const ctx = makeContext(app, []);
    const matched = new MatchedOption(opt).accept(ctx, 's', undefined);
    expect(matched.value()).toMatchInlineSnapshot(`
      [
        "",
      ]
    `);
  });

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
