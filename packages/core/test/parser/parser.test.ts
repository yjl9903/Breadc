import { describe, it, expect } from 'vitest';

import { Breadc } from '../../src/index.ts';

describe('parser', () => {
  it('should parse default command', async () => {
    const cli = new Breadc('cli');
    cli.command('').action(() => true);

    expect(await cli.run([])).toMatchInlineSnapshot(`true`);
  });

  it('should parse alias default command', async () => {
    const cli = new Breadc('cli');
    cli
      .command('dev')
      .alias('')
      .action(() => true);

    expect(await cli.run([])).toMatchInlineSnapshot(`true`);
  });

  it('should parse default command with arguments', async () => {
    // TODO
  });

  it('should parse alias default command with arguments', async () => {
    // TODO
  });

  it('should parse default command with boolean option', async () => {
    const cli = new Breadc('cli');
    cli
      .command('')
      .option('--flag')
      .action((option) => option.flag);

    expect(await cli.run([])).toMatchInlineSnapshot(`false`);
    expect(await cli.run(['--flag'])).toMatchInlineSnapshot(`true`);
  });

  it('should parse single command', async () => {
    const cli = new Breadc('cli');
    cli.command('dev').action(() => true);

    expect(await cli.run(['dev'])).toMatchInlineSnapshot(`true`);
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

  it('should parse command with alias', async () => {
    const cli = new Breadc('cli');
    cli
      .command('push')
      .alias('p')
      .action(() => true);

    expect(await cli.run(['push'])).toMatchInlineSnapshot(`true`);
    expect(await cli.run(['p'])).toMatchInlineSnapshot(`true`);
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

  it('should parse single command with sub command', async () => {
    const cli = new Breadc('cli');
    cli
      .option('--flag')
      .command('cmd1 <cmd2> [cmd3] [...cmd4]')
      .action((cmd2, cmd3, cmd4, option) => {
        return { cmd2, cmd3, cmd4, option };
      });
    expect(await cli.run(['cmd1', 'XLor'])).toMatchInlineSnapshot(`
      {
        "cmd2": "XLor",
        "cmd3": undefined,
        "cmd4": [],
        "option": {
          "--": [],
          "flag": false,
        },
      }
    `);
    expect(await cli.run(['cmd1', '--flag', 'XLor', 'gdx']))
      .toMatchInlineSnapshot(`
      {
        "cmd2": "XLor",
        "cmd3": "gdx",
        "cmd4": [],
        "option": {
          "--": [],
          "flag": true,
        },
      }
    `);
    expect(await cli.run(['cmd1', 'XLor', 'gdx', 'xnf', '414', '--flag=false']))
      .toMatchInlineSnapshot(`
      {
        "cmd2": "XLor",
        "cmd3": "gdx",
        "cmd4": [
          "xnf",
          "414",
        ],
        "option": {
          "--": [],
          "flag": false,
        },
      }
    `);
  });

  it('should parse command with unknown argument', async () => {
    const cli = new Breadc('cli');
    cli.command('dev').action((options) => options['--']);
    expect(await cli.run(['dev', 'XLor', 'gdx'])).toMatchInlineSnapshot(`
      [
        "XLor",
        "gdx",
      ]
    `);
  });

  it('should parse with unknown options', async () => {
    const cli = new Breadc('cli').allowUnknownOptions();
    cli.command('').action((options) => options);

    expect(await cli.run(['--flag'])).toMatchInlineSnapshot(`
      {
        "--": [],
        "flag": true,
      }
    `);
    expect(await cli.run(['--flag', '123', '--name=value']))
      .toMatchInlineSnapshot(`
        {
          "--": [
            "123",
          ],
          "flag": true,
          "name": "value",
        }
      `);
  });

  it('should parse and skip all unknown options', async () => {
    const cli = new Breadc('cli').allowUnknownOptions(() => {});
    cli.command('').action((options) => options);

    expect(await cli.run(['--flag'])).toMatchInlineSnapshot(`
      {
        "--": [],
      }
    `);
    expect(await cli.run(['--flag', '123', '--name=value']))
      .toMatchInlineSnapshot(`
        {
          "--": [
            "123",
          ],
        }
      `);
  });

  // --- Errors ---
  it('should not parse duplicated commands', async () => {
    const cli = new Breadc('cli');
    cli.command('dev --name [...name]').action((name) => name);
    cli.command('dev --name <id>').action((name) => name);

    expect(() =>
      cli.runSync(['dev', '--name', '123'])
    ).toThrowErrorMatchingInlineSnapshot(`[Error: Find duplicated commands]`);
  });

  it('should not parse commands (Missing required argument.)', async () => {
    const cli = new Breadc('cli');
    cli.command('dev --name <name>').action((name) => name);
    expect(() =>
      cli.runSync(['dev', '--name'])
    ).toThrowErrorMatchingInlineSnapshot(`[Error]`);
  });

  it('should not parse unknown options', () => {
    // TODO: record errors
    // const cli = new Breadc('cli');
    // cli.command('').action((options) => options);
    // expect(async () => await cli.run(['--flag'])).rejects.toMatchInlineSnapshot(
    //   `[Error: on unknown options]`
    // );
    // expect(
    //   async () => await cli.run(['--flag', '123', '--name=value'])
    // ).rejects.toMatchInlineSnapshot(`[Error: on unknown options]`);
  });
});
