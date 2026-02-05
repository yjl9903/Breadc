import { describe, it, expect } from 'vitest';

import type { InternalArgument, InternalOption } from '../src/breadc/index.ts';

import { breadc } from '../src/breadc/index.ts';
import { option } from '../src/breadc/option.ts';
import { argument } from '../src/breadc/command.ts';
import { context as makeContext } from '../src/runtime/context.ts';
import { MatchedArgument, MatchedOption } from '../src/runtime/matched.ts';

describe('matched argument', () => {
  it('uses default when not dirty and applies cast when dirty', () => {
    const arg = argument('[count]', { default: '1', cast: (t) => Number(t) }) as unknown as InternalArgument;
    const matched = new MatchedArgument(arg);
    expect(matched.value()).toMatchInlineSnapshot(`"1"`);

    matched.accept({} as any, '2');
    expect(matched.value()).toMatchInlineSnapshot(`2`);
  });

  it('uses initial value when provided', () => {
    const arg = argument('[name]', { initial: 'seed' }) as unknown as InternalArgument;
    const matched = new MatchedArgument(arg);
    expect(matched.value()).toMatchInlineSnapshot(`"seed"`);
  });
});

describe('matched option', () => {
  it('reads optional value from next token', () => {
    const app = breadc('cli');
    const opt = option('-o, --output [value]') as unknown as InternalOption;
    opt._resolve();

    const ctx = makeContext(app as any, ['next']);
    const matched = new MatchedOption(opt);
    matched.accept(ctx, '-o', undefined);
    expect(matched.value()).toMatchInlineSnapshot(`"next"`);
  });

  it('throws when required option is missing a value', () => {
    const app = breadc('cli');
    const opt = option('-n, --number <value>') as unknown as InternalOption;
    opt._resolve();

    const ctx = makeContext(app as any, ['--']);
    const matched = new MatchedOption(opt);
    expect(() => matched.accept(ctx, '-n', undefined)).toThrowError();
  });

  it('throws when required option is accepted (current behavior)', () => {
    const app = breadc('cli');
    const opt = option('-n, --number <value>') as unknown as InternalOption;
    opt._resolve();

    const ctx = makeContext(app as any, []);
    const matched = new MatchedOption(opt);
    expect(() => matched.accept(ctx, '-n', '1')).toThrowError();
  });

  it('accumulates spread option values', () => {
    const app = breadc('cli');
    const opt = option('-s, --include [...value]') as unknown as InternalOption;
    opt._resolve();

    const ctx = makeContext(app as any, []);
    const matched = new MatchedOption(opt);
    matched.accept(ctx, '-s', 'a');
    matched.accept(ctx, '-s', 'b');
    expect(matched.value()).toEqual(['a', 'b']);
  });

  it('reads spread value from next token when omitted', () => {
    const app = breadc('cli');
    const opt = option('-s, --include [...value]') as unknown as InternalOption;
    opt._resolve();

    const ctx = makeContext(app as any, ['next']);
    const matched = new MatchedOption(opt);
    matched.accept(ctx, '-s', undefined);
    expect(matched.value()).toEqual(['next']);
  });
});
