import { describe, it, expect } from 'vitest';

import { options } from '@breadc/color';

import breadc from '../src';

options.enabled = false;

describe('Version Command', () => {
  it('should print unknown version', async () => {
    const cli = breadc('cli');
    expect(await cli.run(['-v'])).toMatchInlineSnapshot('"cli/unknown"');
    expect(await cli.run(['--version'])).toMatchInlineSnapshot('"cli/unknown"');
  });

  it('should print version', async () => {
    const cli = breadc('cli', {
      version: '1.0.0'
    });

    expect(await cli.run(['-v'])).toMatchInlineSnapshot('"cli/1.0.0"');
    expect(await cli.run(['--version'])).toMatchInlineSnapshot('"cli/1.0.0"');
  });
});

describe('Help command', () => {
  it('should print help', async () => {
    const cli = breadc('cli', {
      version: '1.0.0',
      description: 'This is a cli app.'
    });
    cli.command('[root]', 'Start dev server');
    cli.command('build [root]', 'Build static site');

    expect(await cli.run(['-h'])).toMatchInlineSnapshot(`
      "cli/1.0.0

      This is a cli app.

      Commands:
        cli [root]        Start dev server
        cli build [root]  Build static site

      Options:
        -h, --help     Print help
        -v, --version  Print version
      "
    `);

    expect(await cli.run(['--help'])).toMatchInlineSnapshot(`
      "cli/1.0.0

      This is a cli app.

      Commands:
        cli [root]        Start dev server
        cli build [root]  Build static site

      Options:
        -h, --help     Print help
        -v, --version  Print version
      "
    `);
  });

  it('should print command help', async () => {
    const cli = breadc('cli', {
      version: '1.0.0',
      description: 'This is a cli app.'
    });
    cli.command('[root]', 'Start dev server');
    cli.command('build [root]', 'Build static site');

    expect(await cli.run(['build', '--help'])).toMatchInlineSnapshot(`
      "cli/1.0.0

      This is a cli app.

      Commands:
        cli build [root]  Build static site

      Options:
        -h, --help     Print help
        -v, --version  Print version
      "
    `);
  });

  it('should print sub-commands help', async () => {
    const cli = breadc('cli', {
      version: '1.0.0',
      description: 'This is a cli app.'
    });
    cli.command('file info [path]', 'Get file info');
    cli.command('store ls [path]', 'List path');
    cli.command('store rm [path]', 'Remove path');
    cli.command('store put [path]', 'Put path');

    expect(await cli.run(['store', '-h'])).toMatchInlineSnapshot(`
      "cli/1.0.0

      This is a cli app.

      Commands:
        cli store ls [path]   List path
        cli store rm [path]   Remove path
        cli store put [path]  Put path

      Options:
        -h, --help     Print help
        -v, --version  Print version
      "
    `);

    expect(await cli.run(['--help', 'store', 'ls'])).toMatchInlineSnapshot(`
      "cli/1.0.0

      This is a cli app.

      Commands:
        cli file info [path]  Get file info
        cli store ls [path]   List path
        cli store rm [path]   Remove path
        cli store put [path]  Put path

      Options:
        -h, --help     Print help
        -v, --version  Print version
      "
    `);

    expect(await cli.run(['store', 'ls', '-h'])).toMatchInlineSnapshot(`
      "cli/1.0.0

      This is a cli app.

      Commands:
        cli store ls [path]  List path

      Options:
        -h, --help     Print help
        -v, --version  Print version
      "
    `);
  });

  it('should print options help', async () => {
    const cli = breadc('cli');
    cli.option('-h, --host <addr>', { description: 'Host address' });
    cli.option('--remote', { description: 'Enable remote' });

    expect(await cli.run(['-h'])).toMatchInlineSnapshot(`
      "cli/unknown

      Options:
        -h, --host <addr>  Host address
            --remote       Enable remote
        -h, --help         Print help
        -v, --version      Print version
      "
    `);
  });

  it('should print sub-commands options help', async () => {
    const cli = breadc('cli');
    cli.option('-h, --host <addr>', 'Host address');
    cli.option('--remote', { description: 'Enable remote' });
    cli
      .command('build', 'Build static site')
      .option('-f, --force', { description: 'Enable force mode' });

    expect(await cli.run(['-h'])).toMatchInlineSnapshot(`
      "cli/unknown

      Commands:
        cli build  Build static site

      Options:
        -h, --host <addr>  Host address
            --remote       Enable remote
        -h, --help         Print help
        -v, --version      Print version
      "
    `);

    expect(await cli.run(['build', '-h'])).toMatchInlineSnapshot(`
      "cli/unknown

      Commands:
        cli build  Build static site

      Options:
        -h, --host <addr>  Host address
            --remote       Enable remote
        -f, --force        Enable force mode
        -h, --help         Print help
        -v, --version      Print version
      "
    `);
  });
});
