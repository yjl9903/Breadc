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
      Command {
        "actionFn": undefined,
        "aliasPieces": [],
        "aliases": [],
        "arguments": [],
        "config": {},
        "format": "",
        "isDefault": true,
        "onUnknownOptions": undefined,
        "optionals": [],
        "options": [],
        "pieces": [],
        "requireds": [],
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
      Command {
        "actionFn": [Function],
        "aliasPieces": [],
        "aliases": [],
        "arguments": [],
        "config": {},
        "format": "dev",
        "isDefault": false,
        "onUnknownOptions": undefined,
        "optionals": [],
        "options": [],
        "pieces": [
          "dev",
        ],
        "requireds": [],
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
    cli
      .command('')
      .option('--flag')
      .action(() => true);
    const context = cli.parse(['--flag']);
    expect(context.command).toMatchInlineSnapshot(`
      Command {
        "actionFn": [Function],
        "aliasPieces": [],
        "aliases": [],
        "arguments": [],
        "config": {},
        "format": "",
        "isDefault": true,
        "onUnknownOptions": undefined,
        "optionals": [],
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
        "pieces": [],
        "requireds": [],
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

  it('Test Cover: duplicated default command', () => {
    const context = new Context(
      {
        globalOptions: [],
        commands: [makeCommand(new Command('')), makeCommand(new Command(''))]
      },
      []
    );
    expect(() => parse(context)).toThrow('Find duplicated default command');
  });

  it('Test Cover: multi pieces in matching', () => {
    const cli = new Breadc('cli');
    cli.command('dev').action(() => true);
    cli
      .command('dev')
      .option('--flag')
      .action(() => true);
    const context = cli.parse(['dev1']);
    console.log(context.matching);
    expect(context.matching).toMatchInlineSnapshot(`
      {
        "arguments": [],
        "commands": Map {
          "dev" => [
            [
              Command {
                "actionFn": [Function],
                "aliasPieces": [],
                "aliases": [],
                "arguments": [],
                "config": {},
                "format": "dev",
                "isDefault": false,
                "onUnknownOptions": undefined,
                "optionals": [],
                "options": [],
                "pieces": [
                  "dev",
                ],
                "requireds": [],
                "resolve": [Function],
                "resolveAliasSubCommand": [Function],
                "resolveSubCommand": [Function],
                "spread": undefined,
              },
              undefined,
            ],
            [
              Command {
                "actionFn": [Function],
                "aliasPieces": [],
                "aliases": [],
                "arguments": [],
                "config": {},
                "format": "dev",
                "isDefault": false,
                "onUnknownOptions": undefined,
                "optionals": [],
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
                "pieces": [
                  "dev",
                ],
                "requireds": [],
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
  });

  it('Test Cover: alias in matching', () => {
    const cli = new Breadc('cli');
    cli.command('git').action(() => true);
    cli
      .command('git')
      .option('-V')
      .alias('--version')
      .action(() => true);
    const context = cli.parse(['git -V']);
    expect(context.matching).toMatchInlineSnapshot(`
      {
        "arguments": [],
        "commands": Map {
          "git" => [
            [
              Command {
                "actionFn": [Function],
                "aliasPieces": [],
                "aliases": [],
                "arguments": [],
                "config": {},
                "format": "git",
                "isDefault": false,
                "onUnknownOptions": undefined,
                "optionals": [],
                "options": [],
                "pieces": [
                  "git",
                ],
                "requireds": [],
                "resolve": [Function],
                "resolveAliasSubCommand": [Function],
                "resolveSubCommand": [Function],
                "spread": undefined,
              },
              undefined,
            ],
            [
              Command {
                "actionFn": [Function],
                "aliasPieces": [],
                "aliases": [
                  "--version",
                ],
                "arguments": [],
                "config": {},
                "format": "git",
                "isDefault": false,
                "onUnknownOptions": undefined,
                "optionals": [],
                "options": [
                  {
                    "config": {},
                    "format": "-V",
                    "long": undefined,
                    "name": undefined,
                    "resolve": [Function],
                    "short": undefined,
                    "type": undefined,
                  },
                ],
                "pieces": [
                  "git",
                ],
                "requireds": [],
                "resolve": [Function],
                "resolveAliasSubCommand": [Function],
                "resolveSubCommand": [Function],
                "spread": undefined,
              },
              undefined,
            ],
          ],
          "-" => [
            [
              Command {
                "actionFn": [Function],
                "aliasPieces": [],
                "aliases": [
                  "--version",
                ],
                "arguments": [],
                "config": {},
                "format": "git",
                "isDefault": false,
                "onUnknownOptions": undefined,
                "optionals": [],
                "options": [
                  {
                    "config": {},
                    "format": "-V",
                    "long": undefined,
                    "name": undefined,
                    "resolve": [Function],
                    "short": undefined,
                    "type": undefined,
                  },
                ],
                "pieces": [
                  "git",
                ],
                "requireds": [],
                "resolve": [Function],
                "resolveAliasSubCommand": [Function],
                "resolveSubCommand": [Function],
                "spread": undefined,
              },
              0,
            ],
          ],
        },
        "options": Map {},
        "unknownOptions": [],
      }
    `);
  });

  it('Test Cover: not only defaultCommand', () => {
    const cli = new Breadc('cli');
    cli.command('<XLor>').action(() => true);
    cli
      .command('XLor')
      .option('-V')
      .action(() => true);
    const context = cli.parse(['XLor -V']);
    expect(context.command).toMatchInlineSnapshot(`
      Command {
        "actionFn": [Function],
        "aliasPieces": [],
        "aliases": [],
        "arguments": [],
        "config": {},
        "format": "<XLor>",
        "isDefault": true,
        "onUnknownOptions": undefined,
        "optionals": [],
        "options": [],
        "pieces": [],
        "requireds": [
          {
            "config": {},
            "format": "<XLor>",
            "name": "XLor",
            "type": "required",
          },
        ],
        "resolve": [Function],
        "resolveAliasSubCommand": [Function],
        "resolveSubCommand": [Function],
        "spread": undefined,
      }
    `);
  });

  it('Test Cover: require args', () => {
    const cli = new Breadc('cli');
    cli.command('dev --name <name>').action(() => true);
    const context = cli.parse(['dev', '--name', 'XLor']);
    expect(context.command).toMatchInlineSnapshot(`
      Command {
        "actionFn": [Function],
        "aliasPieces": [],
        "aliases": [],
        "arguments": [],
        "config": {},
        "format": "dev --name <name>",
        "isDefault": false,
        "onUnknownOptions": undefined,
        "optionals": [],
        "options": [],
        "pieces": [
          "dev",
          "--name",
        ],
        "requireds": [
          {
            "config": {},
            "format": "<name>",
            "name": "name",
            "type": "required",
          },
        ],
        "resolve": [Function],
        "resolveAliasSubCommand": [Function],
        "resolveSubCommand": [Function],
        "spread": undefined,
      }
    `);
  });
});
