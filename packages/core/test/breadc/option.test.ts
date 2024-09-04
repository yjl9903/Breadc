import { describe, it, expect } from 'vitest';

import { Breadc } from '../../src/breadc/app.ts';
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

  it('should resolve negated option', () => {
    const opt = makeOption(new Option('--no-flag'));
    opt.resolve();
    expect(opt).toMatchInlineSnapshot(`
      Option {
        "argument": undefined,
        "config": {
          "initial": true,
          "negated": true,
        },
        "format": "--no-flag",
        "long": "--flag",
        "name": "flag",
        "resolve": [Function],
        "short": undefined,
        "type": "boolean",
      }
    `);
  });

  it('should not resolve negated option with argument', () => {
    const opt1 = makeOption(new Option('--no-flag <helo>'));

    expect(() => opt1.resolve()).toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid option at the option "--no-flag <helo>"]`
    );

    const opt2 = makeOption(new Option('--no-flag [helo]'));

    expect(() => opt2.resolve()).toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid option at the option "--no-flag [helo]"]`
    );

    const opt3 = makeOption(new Option('--no-flag [...helo]'));

    expect(() => opt3.resolve()).toThrowErrorMatchingInlineSnapshot(
      `[Error: Resolving invalid option at the option "--no-flag [...helo]"]`
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

  it('should cast boolean option value', async () => {
    {
      const app = new Breadc('cli');
      app.command('').option('--flag', { cast: v => v ? 1 : -1 }).action((option) => option);
      expect(await app.run(['--flag'])).toMatchInlineSnapshot(`
        {
          "--": [],
          "flag": 1,
        }
      `);
      expect(await app.run(['--no-flag'])).toMatchInlineSnapshot(`
        {
          "--": [],
          "flag": -1,
        }
      `);
      expect(await app.run([])).toMatchInlineSnapshot(`
        {
          "--": [],
          "flag": -1,
        }
      `);
    }
    {
      const app = new Breadc('cli');
      app.command('').option('--flag', { initial: true, cast: v => v ? 1 : -1 }).action((option) => option);
      expect(await app.run(['--flag'])).toMatchInlineSnapshot(`
        {
          "--": [],
          "flag": 1,
        }
      `);
      expect(await app.run(['--no-flag'])).toMatchInlineSnapshot(`
        {
          "--": [],
          "flag": 1,
        }
      `);
      expect(await app.run([])).toMatchInlineSnapshot(`
        {
          "--": [],
          "flag": 1,
        }
      `);
    }
  });

  it('should cast string option value', async () => {
    {
      const app = new Breadc('cli');
      app.command('').option('--age <age>', { initial: '0', cast: v => +v! }).action((option) => option);
      expect(await app.run(['--age=10'])).toMatchInlineSnapshot(`
        {
          "--": [],
          "age": 10,
        }
      `);
      expect(await app.run([])).toMatchInlineSnapshot(`
        {
          "--": [],
          "age": 0,
        }
      `);
    }
  });
});
