import { beforeEach, afterEach, vi, describe, it, expect } from 'vitest';

import { options as colorOptions } from '@breadc/color';

import { breadc, printHelp, printVersion } from '../src/index.ts';

beforeEach(() => {
  colorOptions.enabled = false;

  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('breadc/builtin: version', () => {
  it('print unknown version', async () => {
    const log = vi.mocked(console.log);

    const app = breadc('cli');
    const output = await app.run<string>(['-v']);

    expect(output).toMatchInlineSnapshot(`"cli/unknown"`);
    expect(log).toHaveBeenCalledWith('cli/unknown');
  });

  it('print passed version', async () => {
    const log = vi.mocked(console.log);

    const app = breadc('cli', { version: '1.0.0' });
    const output = await app.run<string>(['--version']);

    expect(output).toMatchInlineSnapshot(`"cli/1.0.0"`);
    expect(log).toHaveBeenCalledWith('cli/1.0.0');
  });
});

describe('breadc/builtin: help', () => {
  it('reads unvisited group declarations without building them or running user code', async () => {
    const cast = vi.fn(Number);
    const action = vi.fn((first, second, options) => [first, second, options.count]);
    const middleware = vi.fn((_context, next) => next());
    const app = breadc('cli').use(middleware);
    const group = app.group('tool');
    const command = group.command('run <first>', 'Run a tool').alias('r').option('--count <value>', '', { cast });
    group.command('upload').argument('<...files>');
    group.command('list').argument('[...paths]');

    const firstHelp = await app.run<string>(['--help']);
    expect(firstHelp).toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli <COMMAND> [OPTIONS]

      Commands:
        cli tool run <first>        Run a tool
        cli tool upload <...files>  
        cli tool list [...paths]    

      Options:
        -h, --help     Print help
        -v, --version  Print version
      "
    `);

    command.argument('<second>').action(action);
    const help = await app.run<string>(['--help']);
    expect(help).toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli <COMMAND> [OPTIONS]

      Commands:
        cli tool run <first> <second>  Run a tool
        cli tool upload <...files>     
        cli tool list [...paths]       

      Options:
        -h, --help     Print help
        -v, --version  Print version
      "
    `);
    for (const fn of [cast, action, middleware]) expect(fn).not.toHaveBeenCalled();

    await expect(app.run(['tool', 'r', 'one', 'two', '--count=2'])).resolves.toMatchInlineSnapshot(`
      [
        "one",
        "two",
        2,
      ]
    `);
    expect(cast).toHaveBeenCalledExactlyOnceWith('2');
    expect(action).toHaveBeenCalledTimes(1);
    expect(await app.run(['--help'])).toBe(help);
  });

  it('print default help', async () => {
    const log = vi.mocked(console.log);

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

  it('print help when no commands matched', async () => {
    const log = vi.mocked(console.log);

    const app = breadc('cli');
    app.command('ping').action(() => 'pong');

    const output = await app.run<string>(['-h']);

    expect(output).toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli ping [OPTIONS]

      Commands:
        cli ping  

      Options:
        -h, --help     Print help
        -v, --version  Print version
      "
    `);
    expect(log).toHaveBeenCalledWith(output);
  });

  it('generate rich help message output', async () => {
    const app = breadc('cli', {
      version: '1.0.0',
      description: 'This is a cli app.'
    });

    app.command('dev [root]', 'Start dev server');
    app.command('build [root]', 'Build static site');

    await expect(app.run(['--help'])).resolves.toMatchInlineSnapshot(`
      "cli/1.0.0

      This is a cli app.

      Usage: cli <COMMAND> [OPTIONS]

      Commands:
        cli dev [root]    Start dev server
        cli build [root]  Build static site

      Options:
        -h, --help     Print help
        -v, --version  Print version
      "
    `);
  });

  it('support custom builtin spec/description', async () => {
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
        -H, --HELP           Show usage information
            --build-version  Show build version
      "
    `);
  });

  it('collects root/group/command options for group help', async () => {
    const app = breadc('cli').option('--host <addr>', 'Host address');
    const store = app.group('store').option('--region <id>', 'Region');
    store.command('ls', 'List files').option('--long', 'Long list');
    store.command('rm', 'Remove files').option('--force', 'Force remove');

    const output = await app.run<string>(['store', '-h']);

    expect(output).toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli <COMMAND> [OPTIONS]

      Commands:
        cli store ls  List files
        cli store rm  Remove files

      Options:
        -h, --help         Print help
        -v, --version      Print version
            --host <addr>  Host address
            --region <id>  Region
      "
    `);
  });

  it('prints usage as [COMMAND] when default command exists', async () => {
    const app = breadc('cli');
    app.command('[file]');
    app.command('build');

    const output = await app.run<string>(['--help']);
    expect(output).toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli [COMMAND] [OPTIONS]

      Commands:
        cli [file]  
        cli build   

      Options:
        -h, --help     Print help
        -v, --version  Print version
      "
    `);
  });

  it('formats default command args in help output', async () => {
    const app = breadc('cli');
    app.command('[...files]');

    const output = await app.run<string>(['--help']);

    expect(output).toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli [...files] [OPTIONS]

      Commands:
        cli [...files]  

      Options:
        -h, --help     Print help
        -v, --version  Print version
      "
    `);
  });

  it('keeps usage as [COMMAND] when spread default command coexists with sub-commands', async () => {
    const app = breadc('cli');
    app.command('[...files]');
    app.command('github [...files]');

    const output = await app.run<string>(['--help']);

    expect(output).toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli [COMMAND] [OPTIONS]

      Commands:
        cli [...files]         
        cli github [...files]  

      Options:
        -h, --help     Print help
        -v, --version  Print version
      "
    `);
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

      Usage: cli <COMMAND> [OPTIONS]

      Commands:
        cli build run   Build and run
        cli build test  Build and test

      Options:
        -h, --help         Print help
        -v, --version      Print version
            --host <addr>  Host address
      "
    `);
  });

  it('formats required/spread command args in help output', async () => {
    const app = breadc('cli').option('-c, --config <path>', 'Config path');
    app.command('deploy <env> [...files]');

    const output = await app.run<string>(['--help']);

    expect(output).toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli deploy <env> [...files] [OPTIONS]

      Commands:
        cli deploy <env> [...files]  

      Options:
        -h, --help           Print help
        -v, --version        Print version
        -c, --config <path>  Config path
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

      Usage: cli <COMMAND> [OPTIONS]

      Commands:
        cli store ls detail  Show detail

      Options:
        -h, --help     Print help
        -v, --version  Print version
      "
    `);
  });

  it('collects default command options when printing root help', async () => {
    const app = breadc('cli').option('--host <addr>', 'Host address');
    app.command('[entry]', 'Run app').option('--watch', 'Watch mode');
    app.command('build test', 'Build test').option('--coverage', 'Coverage report');

    const output = await app.run<string>(['-h']);
    expect(output).toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli [COMMAND] [OPTIONS]

      Commands:
        cli [entry]     Run app
        cli build test  Build test

      Options:
        -h, --help         Print help
        -v, --version      Print version
            --host <addr>  Host address
            --watch        Watch mode
      "
    `);
  });

  it('collects matched group command options when printing group help', async () => {
    const app = breadc('cli').option('--host <addr>', 'Host address');
    const store = app.group('store').option('--region <id>', 'Region');
    store.command('[path]', 'List files').option('--long', 'Long list');
    store.command('rm', 'Remove files').option('--force', 'Force remove');

    const output = await app.run<string>(['store', '-h']);
    expect(output).toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli <COMMAND> [OPTIONS]

      Commands:
        cli store [path]  List files
        cli store rm      Remove files

      Options:
        -h, --help         Print help
        -v, --version      Print version
            --host <addr>  Host address
            --region <id>  Region
            --long         Long list
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

      Usage: cli <COMMAND> [OPTIONS]

      Commands:
        cli build run  Build app

      Options:
        -h, --help         Print help
        -v, --version      Print version
            --host <addr>  Host address
      "
    `);
  });

  it('expands paired boolean forms in help output', async () => {
    const app = breadc('cli')
      .option('-a, --[no-]all', 'Include everything')
      .option('--[no-]cache', 'Use cache')
      .option('--no-open', 'Do not open');
    const output = vi.mocked(console.log);
    await app.run(['--help']);
    const text = output.mock.calls.map((args) => args.join(' ')).join('\n');
    expect(text).toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli [OPTIONS]

      Options:
        -h, --help               Print help
        -v, --version            Print version
        -a, --all, --no-all      Include everything
            --cache, --no-cache  Use cache
            --no-open            Do not open
      "
    `);
  });

  it('prints builtin help before resolving required command args', async () => {
    const app = breadc('cli');
    app.command('sub-command <param>');

    await expect(app.run(['sub-command', '-h'])).resolves.toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli sub-command <param> [OPTIONS]

      Commands:
        cli sub-command <param>  

      Options:
        -h, --help     Print help
        -v, --version  Print version
      "
    `);
  });

  it('shows array option values in help', async () => {
    const app = breadc('cli').option('-i, --include <...value>', 'Include files');
    const help = await app.run(['--help']);
    expect(help).toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli [OPTIONS]

      Options:
        -h, --help                Print help
        -v, --version             Print version
        -i, --include <...value>  Include files
      "
    `);
  });

  it('honors builtin display configuration and scoped overrides in help', async () => {
    const app = breadc('cli', {
      builtin: { help: { description: 'Show usage' }, version: { description: 'Show release' } }
    });
    const text = await app.run<string>(['--help']);
    expect(text).toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli [OPTIONS]

      Options:
        -h, --help     Show usage
        -v, --version  Show release
      "
    `);
    app.command('run').option('--version', 'Local version');
    const scoped = await app.run<string>(['run', '--help']);
    expect(scoped).toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli run [OPTIONS]

      Commands:
        cli run  

      Options:
        -h, --help     Show usage
            --version  Local version
      "
    `);
  });
});

describe('breadc/builtin: i18n', () => {
  it('print chinese help', async () => {
    const log = vi.mocked(console.log);

    const app = breadc('cli', { i18n: 'zh' });
    const output = await app.run<string>(['-h']);

    expect(output).toMatchInlineSnapshot(`
      "cli/unknown

      用法: cli [选项]

      选项:
        -h, --help     显示帮助信息
        -v, --version  显示版本信息
      "
    `);
    expect(log).toHaveBeenCalledWith(output);
  });

  it('fallback for unknown translation keys', async () => {
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

      用法: cli <子命令> [选项]

      命令:
        cli dev    Start dev server
        cli build  Build static site

      选项:
        -h, --help     显示帮助信息
        -v, --version  显示版本信息
      "
    `);
  });

  it('renders direct helpers with an explicit locale', () => {
    const app = breadc('cli', { i18n: 'zh', version: '3' });
    const { context } = app.parse(['--help']);
    expect(printHelp(context, { i18n: 'zh' })).toMatchInlineSnapshot(`
      "cli/3

      用法: cli [选项]

      选项:
        -h, --help     显示帮助信息
        -v, --version  显示版本信息
      "
    `);
    expect(printHelp(context)).toMatchInlineSnapshot(`
      "cli/3

      Usage: cli [OPTIONS]

      Options:
        -h, --help     Print help
        -v, --version  Print version
      "
    `);
    expect(printVersion(context)).toMatchInlineSnapshot(`"cli/3"`);
  });

  it('keeps locale and disabled builtins isolated between instances and runs', async () => {
    const chinese = breadc('zh', { i18n: 'zh' });
    const english = breadc('en');
    const disabled = breadc('bare', { builtin: { help: false, version: false } });
    await expect(chinese.run(['--help'])).resolves.toMatchInlineSnapshot(`
      "zh/unknown

      用法: zh [选项]

      选项:
        -h, --help     显示帮助信息
        -v, --version  显示版本信息
      "
    `);
    await expect(english.run(['--help'])).resolves.toMatchInlineSnapshot(`
      "en/unknown

      Usage: en [OPTIONS]

      Options:
        -h, --help     Print help
        -v, --version  Print version
      "
    `);
    await expect(chinese.run([])).resolves.toMatchInlineSnapshot(`
      "zh/unknown

      用法: zh [选项]

      选项:
        -h, --help     显示帮助信息
        -v, --version  显示版本信息
      "
    `);
    await expect(english.run([])).resolves.toMatchInlineSnapshot(`
      "en/unknown

      Usage: en [OPTIONS]

      Options:
        -h, --help     Print help
        -v, --version  Print version
      "
    `);
    await expect(disabled.run(['--help'])).rejects.toThrow('Unknown option');
    await expect(disabled.run([])).resolves.toMatchInlineSnapshot(`
      "bare/unknown

      Usage: bare [OPTIONS]
      "
    `);
  });
});
