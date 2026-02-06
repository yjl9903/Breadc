import { describe, it, expect } from 'vitest';

import { option } from '../src/breadc/index.ts';
import { resolveOption } from '../src/runtime/builder.ts';

describe('option', () => {
  it('should resolve boolean option', () => {
    const opt = option('--flag');
    resolveOption(opt);

    expect(opt).toMatchInlineSnapshot(`
      {
        "init": {
          "description": undefined,
        },
        "long": "flag",
        "spec": "--flag",
        "type": "boolean",
      }
    `);
  });

  it('should resolve short and required option', () => {
    const opt = option('-f, --flag <value>');
    resolveOption(opt);

    expect(opt).toMatchInlineSnapshot(`
      {
        "argument": "<value>",
        "init": {
          "description": undefined,
        },
        "long": "flag",
        "short": "f",
        "spec": "-f, --flag <value>",
        "type": "required",
      }
    `);
  });

  it('should resolve optional option', () => {
    const opt = option('-o, --output [value]');
    resolveOption(opt);

    expect(opt).toMatchInlineSnapshot(`
      {
        "argument": "[value]",
        "init": {
          "description": undefined,
        },
        "long": "output",
        "short": "o",
        "spec": "-o, --output [value]",
        "type": "optional",
      }
    `);
  });

  it('should resolve spread option', () => {
    const opt = option('--include [...value]');
    resolveOption(opt);

    expect(opt).toMatchInlineSnapshot(`
      {
        "argument": "[...value]",
        "init": {
          "description": undefined,
        },
        "long": "include",
        "spec": "--include [...value]",
        "type": "spread",
      }
    `);
  });

  it('should resolve --no-* boolean option', () => {
    const opt = option('--no-open');
    resolveOption(opt);

    expect(opt).toMatchInlineSnapshot(`
      {
        "init": {
          "description": undefined,
          "initial": true,
          "negated": true,
        },
        "long": "open",
        "spec": "--no-open",
        "type": "boolean",
      }
    `);
  });

  it('should reject --no-* with argument', () => {
    expect(() => {
      const opt = option('--no-open <value>');
      resolveOption(opt);
    }).toThrowErrorMatchingInlineSnapshot(`[Error: Resolving invalid option at the option "--no-open <value>"]`);
  });

  it('should reject invalid option spec', () => {
    expect(() => {
      const opt = option('invalid');
      resolveOption(opt);
    }).toThrowErrorMatchingInlineSnapshot(`[Error: Resolving invalid option at the option "invalid"]`);
  });
});
