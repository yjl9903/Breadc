import { describe, it, expect } from 'vitest';

import { parse } from '../../src/parser/parser.ts';
import { Context } from '../../src/parser/context.ts';
import { Command, makeCommand } from '../../src/breadc/command.ts';
import { Breadc } from '../../src/index.ts';

describe('parser', () => {
  it('should parse default cli and empty args', () => {
    const context = new Context(
      { globalOptions: [], commands: [makeCommand(new Command(''))] },
      []
    );
    parse(context);

    expect(context.command).toMatchInlineSnapshot(`
      {
        "aliases": [],
        "command": Command {
          "actionFn": undefined,
          "aliases": [],
          "arguments": [],
          "config": {},
          "format": "",
          "onUnknownOptions": undefined,
          "options": [],
        },
        "isDefault": [Function],
        "optionals": undefined,
        "pieces": [],
        "requireds": undefined,
        "resolve": [Function],
        "resolveAliasSubCommand": [Function],
        "resolveSubCommand": [Function],
        "spread": undefined,
      }
    `);
    expect(context.arguments).toMatchInlineSnapshot(`[]`);
    expect(context.options).toMatchInlineSnapshot(`Map {}`);
  });

  it('shoud parse simple sub-command', () => {
    const cli = new Breadc('cli');
    cli.command('dev').action(() => true);
    const context = cli.parse(['dev']);
    expect(context.command).toMatchInlineSnapshot(`
      {
        "aliases": [],
        "command": Command {
          "actionFn": [Function],
          "aliases": [],
          "arguments": [],
          "config": {},
          "format": "dev",
          "onUnknownOptions": undefined,
          "options": [],
        },
        "isDefault": [Function],
        "optionals": undefined,
        "pieces": [
          "dev",
        ],
        "requireds": undefined,
        "resolve": [Function],
        "resolveAliasSubCommand": [Function],
        "resolveSubCommand": [Function],
        "spread": undefined,
      }
    `);
    expect(context.arguments).toMatchInlineSnapshot(`[]`);
    expect(context.options).toMatchInlineSnapshot(`Map {}`);
  });

  it('shoud parse simple default command options', () => {
    const cli = new Breadc('cli');
    cli.command('').option('--flag').action(() => true);
    const context = cli.parse(['--flag']);
    expect(context.command).toMatchInlineSnapshot(`
      {
        "aliases": [],
        "command": Command {
          "actionFn": [Function],
          "aliases": [],
          "arguments": [],
          "config": {},
          "format": "",
          "onUnknownOptions": undefined,
          "options": [
            {
              "long": undefined,
              "name": undefined,
              "option": Option {
                "config": {},
                "format": "--flag",
              },
              "resolve": [Function],
              "short": undefined,
              "type": undefined,
            },
          ],
        },
        "isDefault": [Function],
        "optionals": undefined,
        "pieces": [],
        "requireds": undefined,
        "resolve": [Function],
        "resolveAliasSubCommand": [Function],
        "resolveSubCommand": [Function],
        "spread": undefined,
      }
    `);
    expect(context.arguments).toMatchInlineSnapshot(`[]`);
    expect(context.options).toMatchInlineSnapshot(`Map {}`);
  });
});
