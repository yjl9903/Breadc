import { describe, it, expect } from 'vitest';

import { type InternalOption, option } from '../src/breadc/index.ts';

describe('option', () => {
  it('should resolve boolean option', () => {
    const opt = option('--flag') as unknown as InternalOption;
    opt._resolve();

    expect({
      type: opt.type,
      long: opt.long,
      short: opt.short,
      argument: opt.argument,
      init: opt.init
    }).toMatchInlineSnapshot(`
      {
        "argument": undefined,
        "init": {
          "description": undefined,
        },
        "long": "flag",
        "short": undefined,
        "type": "boolean",
      }
    `);
  });

  it('should resolve short and required option', () => {
    const opt = option('-f, --flag <value>') as unknown as InternalOption;
    opt._resolve();

    expect({
      type: opt.type,
      long: opt.long,
      short: opt.short,
      argument: opt.argument,
      init: opt.init
    }).toMatchInlineSnapshot(`
      {
        "argument": "<value>",
        "init": {
          "description": undefined,
        },
        "long": "flag",
        "short": "-f",
        "type": "required",
      }
    `);
  });

  it('should resolve optional option', () => {
    const opt = option('-o, --output [value]') as unknown as InternalOption;
    opt._resolve();

    expect({
      type: opt.type,
      long: opt.long,
      short: opt.short,
      argument: opt.argument
    }).toMatchInlineSnapshot(`
      {
        "argument": "[value]",
        "long": "output",
        "short": "-o",
        "type": "optional",
      }
    `);
  });

  it('should resolve spread option', () => {
    const opt = option('--include [...value]') as unknown as InternalOption;
    opt._resolve();

    expect({
      type: opt.type,
      long: opt.long,
      short: opt.short,
      argument: opt.argument
    }).toMatchInlineSnapshot(`
      {
        "argument": "[...value]",
        "long": "include",
        "short": undefined,
        "type": "spread",
      }
    `);
  });

  it('should resolve --no-* boolean option', () => {
    const opt = option('--no-open') as unknown as InternalOption;
    opt._resolve();

    expect({
      type: opt.type,
      long: opt.long,
      short: opt.short,
      init: opt.init
    }).toMatchInlineSnapshot(`
      {
        "init": {
          "description": undefined,
          "initial": true,
          "negated": true,
        },
        "long": "open",
        "short": undefined,
        "type": "boolean",
      }
    `);
  });

  it('should reject --no-* with argument', () => {
    expect(() => {
      const opt = option('--no-open <value>') as unknown as InternalOption;
      opt._resolve();
    }).toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid option at the option "--no-open <value>"]`
    );
  });

  it('should reject invalid option spec', () => {
    expect(() => {
      const opt = option('invalid') as unknown as InternalOption;
      opt._resolve();
    }).toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid option at the option "invalid"]`
    );
  });
});
