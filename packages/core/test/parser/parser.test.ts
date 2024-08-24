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
        "isDefault": true,
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

  it('should parse simple sub-command', () => {
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
        "isDefault": false,
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

  it('should parse simple default command options', () => {
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
              "config": {},
              "format": "--flag",
              "long": "flag",
              "name": undefined,
              "resolve": [Function],
              "short": undefined,
              "type": "boolean",
            },
          ],
        },
        "isDefault": true,
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
    expect(context.options).toMatchInlineSnapshot(`
      Map {
        "flag" => MatchedOption {
          "dirty": false,
          "option": {
            "config": {},
            "format": "--flag",
            "long": "flag",
            "name": undefined,
            "resolve": [Function],
            "short": undefined,
            "type": "boolean",
          },
          "raw": true,
        },
      }
    `);
  });

  it('Test Cover: duplicated default command',()=>{
    const context = new Context(
      { globalOptions: [], commands: [makeCommand(new Command('')),makeCommand(new Command(''))] },
      []
    );
    expect(() => parse(context)).toThrow('Find duplicated default command');
  })

  it('Test cover: multi pieces in matching',()=>{
    const cli = new Breadc('cli');
    cli.command('dev').action(() => true);
    cli.command('dev').option('--flag').action(() => true);
    const context = cli.parse(['dev1']);
    console.log(context.matching)
    expect(context.matching).toMatchInlineSnapshot(`
      {
        "arguments": [],
        "commands": Map {
          "dev" => [
            [
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
                "isDefault": false,
                "optionals": undefined,
                "pieces": [
                  "dev",
                ],
                "requireds": undefined,
                "resolve": [Function],
                "resolveAliasSubCommand": [Function],
                "resolveSubCommand": [Function],
                "spread": undefined,
              },
              undefined,
            ],
            [
              {
                "aliases": [],
                "command": Command {
                  "actionFn": [Function],
                  "aliases": [],
                  "arguments": [],
                  "config": {},
                  "format": "dev",
                  "onUnknownOptions": undefined,
                  "options": [
                    {
                      "config": {},
                      "format": "--flag",
                      "long": undefined,
                      "name": undefined,
                      "resolve": [Function],
                      "short": undefined,
                      "type": undefined,
                    },
                  ],
                },
                "isDefault": false,
                "optionals": undefined,
                "pieces": [
                  "dev",
                ],
                "requireds": undefined,
                "resolve": [Function],
                "resolveAliasSubCommand": [Function],
                "resolveSubCommand": [Function],
                "spread": undefined,
              },
              undefined,
            ],
          ],
        },
        "options": Map {},
        "unknownOptions": [],
      }
    `);
  })
});

