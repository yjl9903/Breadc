import { describe, it, expect } from 'vitest';

import { Option, makeOption } from '../../src/breadc/option.ts';

describe('option', () => {
  it('should resolve short and long option', () => {
    const opt = makeOption(new Option('-v, --version'));
    opt.resolve();
    expect(opt).toMatchInlineSnapshot(`
      Option {
        "argument": undefined,
        "config": {},
        "format": "-v, --version",
        "long": "--version",
        "name": "version",
        "resolve": [Function],
        "short": "-v",
        "type": "boolean",
      }
    `);
  });

  it('should resolve long option', () => {
    const opt = makeOption(new Option('--version'));
    opt.resolve();
    expect(opt).toMatchInlineSnapshot(`
      Option {
        "argument": undefined,
        "config": {},
        "format": "--version",
        "long": "--version",
        "name": "version",
        "resolve": [Function],
        "short": undefined,
        "type": "boolean",
      }
    `);
  });

  it('should not resolve short option', () => {
    const opt = makeOption(new Option('-v'));
    expect(async () =>
      opt.resolve()
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid option at the option "-v"]`
    );
  });

  it('should resolve required option', () => {
    const opt = makeOption(new Option('--root <root>'));
    opt.resolve();
    expect(opt).toMatchInlineSnapshot(`
      Option {
        "argument": "<root>",
        "config": {},
        "format": "--root <root>",
        "long": "--root",
        "name": "root",
        "resolve": [Function],
        "short": undefined,
        "type": "required",
      }
    `);
  });

  it('should resolve optional option', () => {
    const opt = makeOption(new Option('--root [root]'));
    opt.resolve();
    expect(opt).toMatchInlineSnapshot(`
      Option {
        "argument": "[root]",
        "config": {},
        "format": "--root [root]",
        "long": "--root",
        "name": "root",
        "resolve": [Function],
        "short": undefined,
        "type": "optional",
      }
    `);
  });

  it('should resolve array option', () => {
    const opt = makeOption(new Option('--plugin [...plugins]'));
    opt.resolve();
    expect(opt).toMatchInlineSnapshot(`
      Option {
        "argument": "[...plugins]",
        "config": {},
        "format": "--plugin [...plugins]",
        "long": "--plugin",
        "name": "plugin",
        "resolve": [Function],
        "short": undefined,
        "type": "array",
      }
    `);
  });
});
