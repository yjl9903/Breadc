import { describe, expect, it } from 'vitest';

import Breadc from '../src';
import { createDefaultLogger } from '../src/logger';

describe('Parse', () => {
  it('should parse', () => {
    expect(Breadc('cli').parse(['hello', 'world'])).toMatchInlineSnapshot(`
      {
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
    expect(Breadc('cli').parse(['--root'])).toMatchInlineSnapshot(`
      {
        "arguments": [],
        "command": undefined,
        "options": {
          "root": true,
        },
      }
    `);

    expect(Breadc('cli').parse(['--root', 'folder'])).toMatchInlineSnapshot(`
      {
        "arguments": [],
        "command": undefined,
        "options": {
          "root": "folder",
        },
      }
    `);

    expect(Breadc('cli').parse(['--root', 'folder', 'text'])).toMatchInlineSnapshot(`
      {
        "arguments": [
          "text",
        ],
        "command": undefined,
        "options": {
          "root": "folder",
        },
      }
    `);

    expect(Breadc('cli').option('--root').parse(['--root', 'folder', 'text']))
      .toMatchInlineSnapshot(`
      {
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
        "arguments": [],
        "command": undefined,
        "options": {
          "root": false,
        },
      }
    `);

    expect(parser.parse(['--root'])).toMatchInlineSnapshot(`
      {
        "arguments": [],
        "command": undefined,
        "options": {
          "root": true,
        },
      }
    `);

    expect(parser.parse(['-r'])).toMatchInlineSnapshot(`
      {
        "arguments": [],
        "command": undefined,
        "options": {
          "root": true,
        },
      }
    `);

    expect(parser.parse(['-r', 'root'])).toMatchInlineSnapshot(`
      {
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
    const logger = createDefaultLogger('cli');
    logger.warn = (message: string) => {
      output.push(message);
    };
    Breadc('cli', { logger }).option('invalid');

    expect(output[0]).toMatchInlineSnapshot('"Can not parse option format from \\"invalid\\""');
  });
});

describe('Common commands', () => {
  it('should print version', async () => {
    const output: string[] = [];
    const logger = createDefaultLogger('cli');
    const cli = Breadc('cli', { version: '1.0.0', logger });
    logger.println = (text: string) => output.push(text);

    await cli.run(['-v']);
    await cli.run(['--version']);

    expect(output[0]).toMatchInlineSnapshot('"cli/1.0.0"');
    expect(output[1]).toMatchInlineSnapshot('"cli/1.0.0"');
  });

  it('should print help', async () => {
    const output: string[] = [];
    const logger = createDefaultLogger('cli');
    logger.println = (text: string) => output.push(text);

    const cli = Breadc('cli', { version: '1.0.0', description: 'This is a cli app.', logger });
    cli.command('[root]', 'Start dev server');
    cli.command('build [root]', 'Build static site');

    await cli.run(['-h']);
    expect(output.join('\n')).toMatchInlineSnapshot(`
      "cli/1.0.0

      This is a cli app.

      Usage:
        $ cli [root]

      Commands:
        $ cli [root]        Start dev server
        $ cli build [root]  Build static site

      Options:
        -h, --help     Display this message
        -v, --version  Display version number
      "
    `);
    output.splice(0);

    await cli.run(['--help']);
    expect(output.join('\n')).toMatchInlineSnapshot(`
      "cli/1.0.0

      This is a cli app.

      Usage:
        $ cli [root]

      Commands:
        $ cli [root]        Start dev server
        $ cli build [root]  Build static site

      Options:
        -h, --help     Display this message
        -v, --version  Display version number
      "
    `);
  });
});

describe('Infer type', () => {
  it('should run dev', async () => {
    const cliWithOption = Breadc('cli').option('--root');
    const cmd = cliWithOption.command('dev');

    cmd.action((option) => {
      expect(option).toMatchInlineSnapshot(`
        {
          "root": true,
        }
      `);
    });

    await cliWithOption.run(['dev', '--root']);
  });

  it('should have no type', async () => {
    const cliWithOption = Breadc('cli').option('--root');
    const cmd = cliWithOption.command('dev');

    cmd.action((option) => {
      expect(option).toMatchInlineSnapshot(`
        {
          "root": true,
        }
      `);
    });

    await cliWithOption.run(['dev', '--root']);
  });

  it('should have one type (string | undefined)', async () => {
    const cliWithOption = Breadc('cli').option('--root');
    const cmd = cliWithOption.command('dev [root]');

    cmd.action((root, option) => {
      expect(root).toMatchInlineSnapshot('undefined');
      expect(option).toMatchInlineSnapshot(`
        {
          "root": true,
        }
      `);
    });

    await cliWithOption.run(['dev', '--root']);
  });

  it('should have one type (string)', async () => {
    const cliWithOption = Breadc('cli').option('--root');
    const cmd = cliWithOption.command('dev <root>');

    cmd.action((root, option) => {
      expect(root).toMatchInlineSnapshot('"."');
      expect(option).toMatchInlineSnapshot(`
        {
          "root": true,
        }
      `);
    });

    await cliWithOption.run(['dev', '.', '--root']);
  });
});
