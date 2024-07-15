import { describe, it, expect } from 'vitest';

import { Option } from '../../src/breadc/option.ts';

describe('option', () => {
  it('should resolve short and long option', () => {
    const opt = new Option('-v, --version');
    opt.resolve();
    expect(opt).toMatchInlineSnapshot(`
      Option {
        "format": "-v, --version",
        "long": "version",
        "name": undefined,
        "resolved": true,
        "short": "v",
        "type": "boolean",
      }
    `);
  });

  it('should resolve long option', () => {
    const opt = new Option('--version');
    opt.resolve();
    expect(opt).toMatchInlineSnapshot(`
      Option {
        "format": "--version",
        "long": "version",
        "name": undefined,
        "resolved": true,
        "short": undefined,
        "type": "boolean",
      }
    `);
  });

  it('should not resolve short option', () => {
    const opt = new Option('-v');
    expect(async () =>
      opt.resolve()
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid option at the option "-v"]`
    );
  });

  it('should resolve required option', () => {
    const opt = new Option('--root <root>');
    opt.resolve();
    expect(opt).toMatchInlineSnapshot(`
      Option {
        "format": "--root <root>",
        "long": "root",
        "name": "<root>",
        "resolved": true,
        "short": undefined,
        "type": "required",
      }
    `);
  });

  it('should resolve optional option', () => {
    const opt = new Option('--root [root]');
    opt.resolve();
    expect(opt).toMatchInlineSnapshot(`
      Option {
        "format": "--root [root]",
        "long": "root",
        "name": "[root]",
        "resolved": true,
        "short": undefined,
        "type": "optional",
      }
    `);
  });

  it('should resolve array option', () => {
    const opt = new Option('--plugin [...plugins]');
    opt.resolve();
    expect(opt).toMatchInlineSnapshot(`
      Option {
        "format": "--plugin [...plugins]",
        "long": "plugin",
        "name": "[...plugins]",
        "resolved": true,
        "short": undefined,
        "type": "array",
      }
    `);
  });
});
