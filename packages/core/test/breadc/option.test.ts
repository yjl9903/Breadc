import { describe, it, expect } from 'vitest';

import { Option, makeOption } from '../../src/breadc/option.ts';

describe('option', () => {
  it('should resolve short and long option', () => {
    const opt = makeOption(new Option('-v, --version'));
    opt.resolve();
    expect(opt).toMatchInlineSnapshot(`
      {
        "long": "version",
        "name": undefined,
        "option": Option {
          "config": {},
          "format": "-v, --version",
        },
        "resolve": [Function],
        "short": "v",
        "type": "boolean",
      }
    `);
  });

  it('should resolve long option', () => {
    const opt = makeOption(new Option('--version'));
    opt.resolve();
    expect(opt).toMatchInlineSnapshot(`
      {
        "long": "version",
        "name": undefined,
        "option": Option {
          "config": {},
          "format": "--version",
        },
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
      {
        "long": "root",
        "name": "<root>",
        "option": Option {
          "config": {},
          "format": "--root <root>",
        },
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
      {
        "long": "root",
        "name": "[root]",
        "option": Option {
          "config": {},
          "format": "--root [root]",
        },
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
      {
        "long": "plugin",
        "name": "[...plugins]",
        "option": Option {
          "config": {},
          "format": "--plugin [...plugins]",
        },
        "resolve": [Function],
        "short": undefined,
        "type": "array",
      }
    `);
  });
});
