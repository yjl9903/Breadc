import { beforeEach, afterEach, vi, describe, it, expect } from 'vitest';

import { breadc } from '../src/breadc/index.ts';

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('builtin version command', () => {
  it('should print unknown version', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    const app = breadc('cli');
    const output = await app.run<string>(['-v']);

    expect(output).toMatchInlineSnapshot(`"cli/unknown"`);
    expect(log).toHaveBeenCalledWith('cli/unknown');
  });

  it('should print passed version', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    const app = breadc('cli', { version: '1.0.0' });
    const output = await app.run<string>(['--version']);

    expect(output).toMatchInlineSnapshot(`"cli/1.0.0"`);
    expect(log).toHaveBeenCalledWith('cli/1.0.0');
  });
});

describe('builtin help command', () => {
  it('should print default help', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    const app = breadc('cli');
    const output = await app.run<string>(['-h']);

    expect(output).toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli [OPTIONS]

      Options:
        -h, --help     Print help
        -v, --version  Print version
      "
    `);
    expect(log).toHaveBeenCalledWith(output);
  });

  it('should print help when no commands matched', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    const app = breadc('cli');
    app.command('ping').action(() => 'pong');

    const output = await app.run<string>(['-h']);

    expect(output).toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli [OPTIONS] ping

      Commands:
        cli ping  

      Options:
        -h, --help     Print help
        -v, --version  Print version
      "
    `);
    expect(log).toHaveBeenCalledWith(output);
  });

  it('should generate rich help message output', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const app = breadc('cli', {
      version: '1.0.0',
      description: 'This is a cli app.'
    });

    app.command('dev [root]', 'Start dev server');
    app.command('build [root]', 'Build static site');

    await expect(app.run(['--help'])).resolves.toMatchInlineSnapshot(`
      "cli/1.0.0

      This is a cli app.

      Usage: cli [OPTIONS] <COMMAND>

      Commands:
        cli dev [root]    Start dev server
        cli build [root]  Build static site

      Options:
        -h, --help     Print help
        -v, --version  Print version
      "
    `);
  });

  it('should support custom builtin spec/description', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const app = breadc('cli', {
      builtin: {
        help: {
          spec: '-H, --HELP',
          description: 'Show usage information'
        },
        version: {
          spec: '--build-version',
          description: 'Show build version'
        }
      }
    });

    await expect(app.run(['-H'])).resolves.toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli [OPTIONS]

      Options:
        -H, --HELP           Print help
            --build-version  Print version
      "
    `);
  });

  it('collects root/group/command options for group help', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const app = breadc('cli').option('--host <addr>', 'Host address');
    const store = app.group('store').option('--region <id>', 'Region');
    store.command('ls', 'List files').option('--long', 'Long list');
    store.command('rm', 'Remove files').option('--force', 'Force remove');

    const output = await app.run<string>(['store', '-h']);

    expect(output).toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli [OPTIONS] <COMMAND>

      Commands:
        cli store ls  
        cli store rm  

      Options:
            --host <addr>  Host address
            --region <id>  Region
            --long         Long list
            --force        Force remove
        -h, --help         Print help
        -v, --version      Print version
      "
    `);
  });

  it('prints usage as [COMMAND] when default command exists', async () => {
    const app = breadc('cli');
    app.command('[file]');
    app.command('build');

    const output = await app.run<string>(['--help']);
    expect(output).toContain('Usage: cli [OPTIONS] [COMMAND]');
  });

  it('omits options section when no options are available', async () => {
    const app = breadc('cli', {
      builtin: {
        help: false,
        version: false
      }
    });

    const output = await app.run<string>([]);
    expect(output).toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli [OPTIONS]
      "
    `);
    expect(output.includes('Options:')).toBe(false);
  });

  it('supports custom help spec for both short and long forms', async () => {
    const app = breadc('cli', {
      builtin: {
        help: {
          spec: '-H, --HELP'
        }
      }
    });

    await expect(app.run(['-H'])).resolves.toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli [OPTIONS]

      Options:
        -H, --HELP     Print help
        -v, --version  Print version
      "
    `);
    await expect(app.run(['--HELP'])).resolves.toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli [OPTIONS]

      Options:
        -H, --HELP     Print help
        -v, --version  Print version
      "
    `);
  });

  it('filters commands by matched pieces and includes non-group command options', async () => {
    const app = breadc('cli').option('--host <addr>', 'Host address');
    app.command('build run', 'Build and run').option('--watch', 'Watch mode');
    app.command('build test', 'Build and test').option('--coverage', 'Enable coverage');
    app.command('dev').option('--open', 'Open browser');

    const output = await app.run<string>(['build', '-h']);

    expect(output).toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli [OPTIONS] <COMMAND>

      Commands:
        cli build run   Build and run
        cli build test  Build and test

      Options:
            --host <addr>  Host address
            --watch        Watch mode
            --coverage     Enable coverage
        -h, --help         Print help
        -v, --version      Print version
      "
    `);
    expect(output.includes('--open')).toBe(false);
  });

  it('formats required/spread command args in help output', async () => {
    const app = breadc('cli').option('-c, --config <path>', 'Config path');
    app.command('deploy <env> [...files]');

    const output = await app.run<string>(['--help']);

    expect(output).toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli [OPTIONS] deploy <env> [...files]

      Commands:
        cli deploy <env> [...files]  

      Options:
        -c, --config <path>  Config path
        -h, --help           Print help
        -v, --version        Print version
      "
    `);
  });

  it('handles longer prefixes when filtering commands', async () => {
    const app = breadc('cli');
    app.command('dev');
    app.command('store ls detail', 'Show detail');

    const output = await app.run<string>(['store', 'ls', '-h']);

    expect(output).toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli [OPTIONS] <COMMAND>

      Commands:
        cli store ls detail  Show detail

      Options:
        -h, --help     Print help
        -v, --version  Print version
      "
    `);
  });

  it('ignores unmatched group options/commands when showing non-group help', async () => {
    const app = breadc('cli').option('--host <addr>', 'Host address');
    const store = app.group('store').option('--region <id>', 'Region');
    store.command('ls').option('--long', 'Long list');
    app.command('build run', 'Build app').option('--watch', 'Watch mode');

    const output = await app.run<string>(['build', '-h']);

    expect(output).toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli [OPTIONS] <COMMAND>

      Commands:
        cli build run  Build app

      Options:
            --host <addr>  Host address
            --watch        Watch mode
        -h, --help         Print help
        -v, --version      Print version
      "
    `);
    expect(output.includes('--region')).toBe(false);
    expect(output.includes('--long')).toBe(false);
  });
});

describe('builtin i18n', () => {
  it('should print chinese help', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    const app = breadc('cli', { i18n: 'zh' });
    const output = await app.run<string>(['-h']);

    expect(output).toMatchInlineSnapshot(`
      "cli/unknown

      使用: cli [OPTIONS]

      选项:
        -h, --help     显示帮助信息
        -v, --version  显示版本信息
      "
    `);
    expect(log).toHaveBeenCalledWith(output);
  });

  it('should fallback for unknown translation keys', async () => {
    const app = breadc('cli', {
      i18n: 'zh',
      version: '1.0.0',
      description: 'This is a cli app.'
    });
    app.command('dev', 'Start dev server');
    app.command('build', 'Build static site');

    await expect(app.run(['--help'])).resolves.toMatchInlineSnapshot(`
      "cli/1.0.0

      This is a cli app.

      使用: cli [OPTIONS] <COMMAND>

      命令:
        cli dev    Start dev server
        cli build  Build static site

      选项:
        -h, --help     显示帮助信息
        -v, --version  显示版本信息
      "
    `);
  });
});
