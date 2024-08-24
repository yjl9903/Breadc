import { describe, it, expect } from 'vitest';

import { Breadc } from '../../src/index.ts';

describe('parser', () => {
  it('should parse default command', () => {
    const cli = new Breadc('cli');
    cli.command('').action(() => true);

    const context = cli.parse([]);
    expect(context).toMatchInlineSnapshot(`
      Context {
        "arguments": [],
        "command": Command {
          "actionFn": [Function],
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
        },
        "container": {
          "commands": [
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
              "options": [],
              "pieces": [],
              "requireds": [],
              "resolve": [Function],
              "resolveAliasSubCommand": [Function],
              "resolveSubCommand": [Function],
              "spread": undefined,
            },
          ],
          "globalOptions": [],
        },
        "matching": {
          "arguments": [],
          "commands": Map {},
          "options": Map {},
          "unknownOptions": [],
        },
        "metadata": {},
        "options": Map {},
        "remaining": [],
        "tokens": Lexer {
          "args": [],
          "cursor": 0,
          "tokens": [],
        },
      }
    `);
    expect(context.arguments).toMatchInlineSnapshot(`[]`);
    expect(context.options).toMatchInlineSnapshot(`Map {}`);
  });

  it('should parse default command with boolean option', () => {
    const cli = new Breadc('cli');
    cli
      .command('')
      .option('--flag')
      .action((option) => option.flag);

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
          Option {
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
          "option": Option {
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

    // TODO: should fix this
    // expect(cli.run([])).toMatchInlineSnapshot(`false`);
    expect(cli.run(['--flag'])).toMatchInlineSnapshot(`true`);
  });

  it('should parse single command', () => {
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

  it('should parse single command with boolean option', () => {
    const cli = new Breadc('cli');
    cli.command('dev').action(() => true);
    cli
      .command('dev')
      .option('--flag')
      .action(() => true);

    const context = cli.parse(['dev1']);
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
                  Option {
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

  it('should parse command with alias', () => {
    const cli = new Breadc('cli');
    cli
      .command('--version')
      .alias('-V')
      .action(() => true);

    expect(cli.parse(['--version']).command).toMatchInlineSnapshot(`
      Command {
        "actionFn": [Function],
        "aliasPieces": [],
        "aliases": [
          "-V",
        ],
        "arguments": [],
        "config": {},
        "format": "--version",
        "isDefault": false,
        "onUnknownOptions": undefined,
        "optionals": [],
        "options": [],
        "pieces": [
          "--version",
        ],
        "requireds": [],
        "resolve": [Function],
        "resolveAliasSubCommand": [Function],
        "resolveSubCommand": [Function],
        "spread": undefined,
      }
    `);
    // TODO: should fix this
    // expect(cli.parse(['-V']).command).toMatchInlineSnapshot(`undefined`);
  });

  it('should parse command when there is default command', () => {
    const cli = new Breadc('cli');
    cli.command('<XLor>').action(() => false);
    cli
      .command('XLor')
      .option('-V, --version')
      .action(() => true);

    expect(cli.run(['XLor', '-V'])).toMatchInlineSnapshot(`true`);
    expect(cli.run(['other'])).toMatchInlineSnapshot(`false`);
  });

  it('should parse single command with required arguments', () => {
    const cli = new Breadc('cli');
    cli.command('dev --name <name>').action((name) => name);

    expect(cli.run(['dev', '--name', 'XLor'])).toMatchInlineSnapshot(`"XLor"`);
  });

  it('should parse single command with optional arguments', () => {
    const cli = new Breadc('cli');
    cli.command('dev --name [name]').action((name) => name);

    expect(cli.run(['dev', '--name'])).toMatchInlineSnapshot(`undefined`);
    expect(cli.run(['dev', '--name', 'XLor'])).toMatchInlineSnapshot(`"XLor"`);
  });

  it('should parse single command with spread arguments', () => {
    const cli = new Breadc('cli');
    cli.command('dev --name [...name]').action((name) => name);

    expect(cli.run(['dev', '--name'])).toMatchInlineSnapshot(`[]`);
    expect(cli.run(['dev', '--name', 'XLor'])).toMatchInlineSnapshot(`
      [
        "XLor",
      ]
    `);
    expect(cli.run(['dev', '--name', 'XLor', 'OneKuma'])).toMatchInlineSnapshot(
      `
      [
        "XLor",
        "OneKuma",
      ]
    `
    );
  });
});
