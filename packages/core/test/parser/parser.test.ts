import { describe, it, expect } from 'vitest';

import { Breadc } from '../../src/index.ts';

describe('parser', () => {
  it('should parse default command', () => {
    const cli = new Breadc('cli');
    cli.command('').action(() => true);

    const context = cli.parse([]);
    expect(context.command).toMatchInlineSnapshot(`
      Command {
        "actionFn": [Function],
        "aliasPieces": [],
        "aliasPos": [],
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

  it('should parse default command with boolean option', async () => {
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
        "aliasPos": [],
        "aliases": [],
        "arguments": [],
        "config": {},
        "format": "",
        "isDefault": true,
        "onUnknownOptions": undefined,
        "optionals": [],
        "options": [
          Option {
            "argument": undefined,
            "config": {},
            "format": "--flag",
            "long": "--flag",
            "name": "flag",
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
            "argument": undefined,
            "config": {},
            "format": "--flag",
            "long": "--flag",
            "name": "flag",
            "resolve": [Function],
            "short": undefined,
            "type": "boolean",
          },
          "raw": true,
        },
      }
    `);

    expect(await cli.run([])).toMatchInlineSnapshot(`false`);
    expect(await cli.run(['--flag'])).toMatchInlineSnapshot(`true`);
  });

  it('should parse single command', () => {
    const cli = new Breadc('cli');
    cli.command('dev').action(() => true);

    const context = cli.parse(['dev']);
    expect(context.command).toMatchInlineSnapshot(`
      Command {
        "actionFn": [Function],
        "aliasPieces": [],
        "aliasPos": [],
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
    expect(context.command).toMatchInlineSnapshot(`undefined`);
    expect(context.arguments).toMatchInlineSnapshot(`[]`);
    expect(context.options).toMatchInlineSnapshot(`Map {}`);
  });

  it('should parse single command with negated boolean option', async () => {
    const cli = new Breadc('cli');
    cli.command('dev').action(() => true);
    cli
      .command('dev')
      .option('--no-flag')
      .action((options) => options.flag);

    expect(await cli.run(['dev'])).toMatchInlineSnapshot(`true`);
    expect(await cli.run(['dev', '--flag'])).toMatchInlineSnapshot(`true`);
    expect(await cli.run(['dev', '--flag=true'])).toMatchInlineSnapshot(`true`);
    expect(await cli.run(['dev', '--flag=false'])).toMatchInlineSnapshot(
      `false`
    );
    expect(await cli.run(['dev', '--flag=f'])).toMatchInlineSnapshot(`false`);
    expect(await cli.run(['dev', '--flag=no'])).toMatchInlineSnapshot(`false`);
    expect(await cli.run(['dev', '--flag=n'])).toMatchInlineSnapshot(`false`);
    expect(await cli.run(['dev', '--flag=off'])).toMatchInlineSnapshot(`false`);
    expect(await cli.run(['dev', '--flag=123'])).toMatchInlineSnapshot(`true`);
    expect(await cli.run(['dev', '--no-flag'])).toMatchInlineSnapshot(`false`);
    expect(await cli.run(['dev', '--no-flag=true'])).toMatchInlineSnapshot(
      `false`
    );
    expect(await cli.run(['dev', '--no-flag=false'])).toMatchInlineSnapshot(
      `true`
    );
    expect(await cli.run(['dev', '--no-flag=f'])).toMatchInlineSnapshot(`true`);
    expect(await cli.run(['dev', '--no-flag=no'])).toMatchInlineSnapshot(
      `true`
    );
    expect(await cli.run(['dev', '--no-flag=n'])).toMatchInlineSnapshot(`true`);
    expect(await cli.run(['dev', '--no-flag=off'])).toMatchInlineSnapshot(
      `true`
    );
    expect(await cli.run(['dev', '--no-flag=123'])).toMatchInlineSnapshot(
      `false`
    );
  });

  it('should parse command with alias', () => {
    const cli = new Breadc('cli');
    cli
      .command('push')
      .alias('p')
      .action(() => true);

    expect(cli.parse(['push']).command).toMatchInlineSnapshot(`
      Command {
        "actionFn": [Function],
        "aliasPieces": [
          [
            "p",
          ],
        ],
        "aliasPos": [
          1,
        ],
        "aliases": [
          "p",
        ],
        "arguments": [],
        "config": {},
        "format": "push",
        "isDefault": false,
        "onUnknownOptions": undefined,
        "optionals": [],
        "options": [],
        "pieces": [
          "push",
        ],
        "requireds": [],
        "resolve": [Function],
        "resolveAliasSubCommand": [Function],
        "resolveSubCommand": [Function],
        "spread": undefined,
      }
    `);
    expect(cli.parse(['p']).command).toMatchInlineSnapshot(`
      Command {
        "actionFn": [Function],
        "aliasPieces": [
          [
            "p",
          ],
        ],
        "aliasPos": [
          1,
        ],
        "aliases": [
          "p",
        ],
        "arguments": [],
        "config": {},
        "format": "push",
        "isDefault": false,
        "onUnknownOptions": undefined,
        "optionals": [],
        "options": [],
        "pieces": [
          "push",
        ],
        "requireds": [],
        "resolve": [Function],
        "resolveAliasSubCommand": [Function],
        "resolveSubCommand": [Function],
        "spread": undefined,
      }
    `);
  });

  it('should parse command when there is default command', async () => {
    const cli = new Breadc('cli');
    cli.command('<XLor>').action(() => false);
    cli
      .command('XLor')
      .option('-V, --version')
      .action(() => true);

    expect(await cli.run(['XLor', '-V'])).toMatchInlineSnapshot(`true`);
    expect(await cli.run(['other'])).toMatchInlineSnapshot(`false`);
  });

  it('should parse single command with required arguments', async () => {
    const cli = new Breadc('cli');
    cli.command('dev --name <name>').action((name) => name);

    expect(await cli.run(['dev', '--name', 'XLor'])).toMatchInlineSnapshot(
      `"XLor"`
    );
  });

  it('should parse single command with optional arguments', async () => {
    const cli = new Breadc('cli');
    cli.command('dev --name [name]').action((name) => name);

    expect(await cli.run(['dev', '--name'])).toMatchInlineSnapshot(`undefined`);
    expect(await cli.run(['dev', '--name', 'XLor'])).toMatchInlineSnapshot(
      `"XLor"`
    );
  });

  it('should parse single command with spread arguments', async () => {
    const cli = new Breadc('cli');
    cli.command('dev --name [...name]').action((name) => name);

    expect(await cli.run(['dev', '--name'])).toMatchInlineSnapshot(`[]`);
    expect(await cli.run(['dev', '--name', 'XLor'])).toMatchInlineSnapshot(`
      [
        "XLor",
      ]
    `);
    expect(
      await cli.run(['dev', '--name', 'XLor', 'OneKuma'])
    ).toMatchInlineSnapshot(
      `
      [
        "XLor",
        "OneKuma",
      ]
    `
    );
  });
});
