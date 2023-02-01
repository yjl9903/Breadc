import { describe, expect, it } from 'vitest';

import Breadc from '../src';

describe('Parse', () => {
  const logger = () => {};

  it('should parse', () => {
    expect(Breadc('cli', { logger }).parse(['hello', 'world']))
      .toMatchInlineSnapshot(`
      {
        "--": [],
        "arguments": [
          "hello",
          "world",
        ],
        "command": undefined,
        "options": {},
      }
    `);
  });

  it('should parse boolean option', () => {
    expect(Breadc('cli', { logger }).parse(['--root'])).toMatchInlineSnapshot(`
      {
        "--": [],
        "arguments": [],
        "command": undefined,
        "options": {},
      }
    `);

    expect(Breadc('cli', { logger }).parse(['--root', 'folder']))
      .toMatchInlineSnapshot(`
      {
        "--": [],
        "arguments": [],
        "command": undefined,
        "options": {},
      }
    `);

    expect(Breadc('cli', { logger }).parse(['--root', 'folder', 'text']))
      .toMatchInlineSnapshot(`
      {
        "--": [],
        "arguments": [
          "text",
        ],
        "command": undefined,
        "options": {},
      }
    `);

    expect(Breadc('cli').option('--root').parse(['--root', 'folder', 'text']))
      .toMatchInlineSnapshot(`
      {
        "--": [],
        "arguments": [
          "folder",
          "text",
        ],
        "command": undefined,
        "options": {
          "root": true,
        },
      }
    `);

    expect(Breadc('cli').option('--root').parse(['folder', '--root', 'text']))
      .toMatchInlineSnapshot(`
      {
        "--": [],
        "arguments": [
          "folder",
          "text",
        ],
        "command": undefined,
        "options": {
          "root": true,
        },
      }
    `);

    expect(Breadc('cli').option('--root').parse(['folder', 'text', '--root']))
      .toMatchInlineSnapshot(`
      {
        "--": [],
        "arguments": [
          "folder",
          "text",
        ],
        "command": undefined,
        "options": {
          "root": true,
        },
      }
    `);
  });

  it('should parse boolean option with shortcut', () => {
    const parser = Breadc('cli').option('-r, --root');

    expect(parser.parse([])).toMatchInlineSnapshot(`
      {
        "--": [],
        "arguments": [],
        "command": undefined,
        "options": {
          "root": false,
        },
      }
    `);

    expect(parser.parse(['--root'])).toMatchInlineSnapshot(`
      {
        "--": [],
        "arguments": [],
        "command": undefined,
        "options": {
          "root": true,
        },
      }
    `);

    expect(parser.parse(['-r'])).toMatchInlineSnapshot(`
      {
        "--": [],
        "arguments": [],
        "command": undefined,
        "options": {
          "root": true,
        },
      }
    `);

    expect(parser.parse(['-r', 'root'])).toMatchInlineSnapshot(`
      {
        "--": [],
        "arguments": [
          "root",
        ],
        "command": undefined,
        "options": {
          "root": true,
        },
      }
    `);

    expect(parser.parse(['root', '-r'])).toMatchInlineSnapshot(`
      {
        "--": [],
        "arguments": [
          "root",
        ],
        "command": undefined,
        "options": {
          "root": true,
        },
      }
    `);
  });

  it('should not parse wrong option', () => {
    const output: string[] = [];
    Breadc('cli', {
      logger: {
        println(message: string) {
          output.push(message);
        },
        warn(message: string) {
          output.push(message);
        }
      }
    }).option('invalid');

    expect(output[0]).toMatchInlineSnapshot(
      '"Can not parse option format from \\"invalid\\""'
    );
  });

  it('should receive rest arguments', async () => {
    const cli = Breadc('cli');

    cli.command('').action((option) => option['--']);
    cli.command('echo [msg]').action((msg, option) => [msg, option['--']]);

    expect(await cli.run(['a', 'b', 'c'])).toMatchInlineSnapshot(`
      [
        "a",
        "b",
        "c",
      ]
    `);

    expect(await cli.run(['echo', 'hello', 'world'])).toMatchInlineSnapshot(`
      [
        "hello",
        [
          "world",
        ],
      ]
    `);

    expect(await cli.run(['echo', '--', 'hello', 'world']))
      .toMatchInlineSnapshot(`
      [
        undefined,
        [
          "hello",
          "world",
        ],
      ]
    `);

    expect(await cli.run(['--', 'echo', 'hello', 'world']))
      .toMatchInlineSnapshot(`
      [
        "echo",
        "hello",
        "world",
      ]
    `);
  });
});

describe('Infer type', () => {
  it('should run dev', async () => {
    const cliWithOption = Breadc('cli').option('--root');
    const cmd = cliWithOption.command('dev');

    cmd.action((option) => option);

    expect(await cliWithOption.run(['dev', '--root'])).toMatchInlineSnapshot(`
      {
        "--": [],
        "root": true,
      }
    `);
  });

  it('should have no type', async () => {
    const cliWithOption = Breadc('cli').option('--root');
    const cmd = cliWithOption.command('dev');

    cmd.action((option) => option);

    expect(await cliWithOption.run(['dev', '--root'])).toMatchInlineSnapshot(`
      {
        "--": [],
        "root": true,
      }
    `);
  });

  it('should have one type (string | undefined)', async () => {
    const cliWithOption = Breadc('cli').option('--root');
    const cmd = cliWithOption.command('dev [root]');

    cmd.action((root, option) => [root, option]);

    expect(await cliWithOption.run(['dev', '--root'])).toMatchInlineSnapshot(`
      [
        undefined,
        {
          "--": [],
          "root": true,
        },
      ]
    `);
  });

  it('should have one type (string)', async () => {
    const cliWithOption = Breadc('cli').option('--root');
    const cmd = cliWithOption.command('dev <root>');

    cmd.action((root, option) => [root, option]);

    expect(await cliWithOption.run(['dev', '.', '--root']))
      .toMatchInlineSnapshot(`
      [
        ".",
        {
          "--": [],
          "root": true,
        },
      ]
    `);
  });
});
