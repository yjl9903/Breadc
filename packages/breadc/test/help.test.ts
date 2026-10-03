import { stripVTControlCharacters } from 'node:util';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { breadc, parse, printHelp, type Breadc } from '../src/index.ts';

beforeEach(() => vi.spyOn(console, 'log').mockImplementation(() => {}));
afterEach(() => vi.restoreAllMocks());

async function help(app: Pick<Breadc, 'run'>, argv: string[] = ['--help']) {
  return stripVTControlCharacters(await app.run<string>(argv));
}

function createFilesApp() {
  const app = breadc('cli', {
    version: '1.0',
    description: {
      description: 'Manage files\nApplication details.',
      examples: [{ command: 'cli store --help' }]
    }
  });
  const store = app.group('store', {
    summary: 'View and maintain files',
    details: 'Group details.',
    examples: [{ command: 'cli store ls', comment: 'List files' }]
  });
  store.command('ls', 'List files');
  store
    .command('rm', {
      summary: 'Delete files',
      details: 'Check the path.\n\n  Keep indentation.',
      examples: [
        {
          comment: 'Delete archived files\nAfter checking the path',
          command: 'cli store rm report.zip --region archive'
        },
        { command: 'cli store rm report.zip --force' }
      ]
    })
    .alias('remove')
    .argument('<file>', 'File to delete\nA relative or absolute path.')
    .option('--force', 'Skip confirmation\nFor automation.\nCheck the file path and storage region first.')
    .option('--region <name>', 'Storage region', { default: 'local' });
  app.command('deploy <target>', 'Deploy application');
  return app;
}

describe('help: output and navigation', () => {
  it('prints help for both default spellings', async () => {
    const app = breadc('cli');
    for (const flag of ['-h', '--help']) {
      vi.mocked(console.log).mockClear();
      const output = await app.run<string>([flag]);
      expect(stripVTControlCharacters(output)).toMatchInlineSnapshot(`
        "cli/unknown

        Usage: cli [options]

        Options:
          -h, --help     Show help
          -v, --version  Show version
        "
      `);
      expect(console.log).toHaveBeenCalledExactlyOnceWith(output);
    }
  });

  it('shows only top-level commands and groups at the root', async () => {
    expect(await help(createFilesApp())).toMatchInlineSnapshot(`
      "cli/1.0

      Manage files
      Application details.

      Usage: cli <command> [options]

      Commands:
        store <command>  View and maintain files
        deploy <target>  Deploy application

      Options:
        -h, --help     Show help
        -v, --version  Show version

      Examples:
        cli store --help
      "
    `);
  });

  it('shows the group description and its children', async () => {
    expect(await help(createFilesApp(), ['store', '--help'])).toMatchInlineSnapshot(`
      "cli/1.0

      View and maintain files

      Group details.

      Usage: cli store <command> [options]

      Commands:
        store ls         List files
        store rm <file>  Delete files

      Options:
        -h, --help     Show help
        -v, --version  Show version

      Examples:
        # List files
        cli store ls
      "
    `);
  });

  it('shows the leaf description, arguments, options, examples and aliases', async () => {
    expect(await help(createFilesApp(), ['store', 'rm', '--help'])).toMatchInlineSnapshot(`
      "cli/1.0

      Delete files

      Check the path.

        Keep indentation.

      Usage: cli store rm <file> [options]

      Aliases:
        store remove

      Arguments:
        <file>  File to delete
                A relative or absolute path.

      Options:
            --force          Skip confirmation
                             For automation.
                             Check the file path and storage region first.

            --region <name>  Storage region
        -h, --help           Show help
        -v, --version        Show version

      Examples:
        # Delete archived files
        # After checking the path
        cli store rm report.zip --region archive

        cli store rm report.zip --force
      "
    `);
  });

  it('shows default command options alongside default and subcommand usage', async () => {
    const app = breadc('cli');
    app.command('[path]', 'Upload files').option('--dry-run', 'Preview upload');
    const store = app.group('store', 'Storage');
    store.command('[path]', 'Browse directory').option('-a, --all', 'Show all files');
    store.command('rm <file>', 'Delete');
    expect(await help(app)).toMatchInlineSnapshot(`
      "cli/unknown

      Usage:
        cli [path] [options]
        cli <command> [options]

      Commands:
        store [command]  Storage

      Options:
            --dry-run  Preview upload
        -h, --help     Show help
        -v, --version  Show version
      "
    `);
    expect(await help(app, ['store', '--help'])).toMatchInlineSnapshot(`
      "cli/unknown

      Storage

      Usage:
        cli store [path] [options]
        cli store <command> [options]

      Commands:
        store rm <file>  Delete

      Options:
        -a, --all      Show all files
        -h, --help     Show help
        -v, --version  Show version
      "
    `);
  });

  it('keeps undocumented default arguments in usage only', async () => {
    const app = breadc('cli');
    app.command('<file> [mode] [...rest]', 'Run').option('--local', 'Local');
    expect(await help(app)).toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli <file> [mode] [...rest] [options]

      Options:
            --local    Local
        -h, --help     Show help
        -v, --version  Show version
      "
    `);
  });

  it('shows manually added argument descriptions alongside undocumented arguments', async () => {
    const app = breadc('cli');
    app
      .command('', 'Run')
      .argument('<file>', 'Input file')
      .argument('[mode]', 'Processing mode\nChoose how to process the file.')
      .argument('[...rest]');
    expect(await help(app)).toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli <file> [mode] [...rest] [options]

      Arguments:
        <file>     Input file
        [mode]     Processing mode
                   Choose how to process the file.

        [...rest]

      Options:
        -h, --help     Show help
        -v, --version  Show version
      "
    `);
  });

  it('keeps multi-part commands and overlapping paths navigable', async () => {
    const app = breadc('cli');
    app.command('remote', 'Remote action').option('--parent', 'Parent only');
    app.command('remote add <name> <url>', 'Add remote').alias('r add');
    app.command('remote remove <name>', 'Remove remote');
    app.group('remote tools', 'Tools').command('list', 'List tools');
    expect(await help(app)).toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli <command> [options]

      Commands:
        remote                   Remote action
        remote add <name> <url>  Add remote
        remote remove <name>     Remove remote
        remote tools <command>   Tools

      Options:
        -h, --help     Show help
        -v, --version  Show version
      "
    `);
    expect(await help(app, ['remote', '--help'])).toMatchInlineSnapshot(`
      "cli/unknown

      Remote action

      Usage:
        cli remote [options]
        cli remote <command> [options]

      Commands:
        remote add <name> <url>  Add remote
        remote remove <name>     Remove remote
        remote tools <command>   Tools

      Options:
            --parent   Parent only
        -h, --help     Show help
        -v, --version  Show version
      "
    `);
    expect(await help(app, ['r', '--help'])).toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli r <command> [options]

      Commands:
        r add <name> <url>  Add remote

      Options:
        -h, --help     Show help
        -v, --version  Show version
      "
    `);
    expect(await help(app, ['r', 'add', '--help'])).toMatchInlineSnapshot(`
      "cli/unknown

      Add remote

      Usage: cli remote add <name> <url> [options]

      Aliases:
        r add

      Options:
        -h, --help     Show help
        -v, --version  Show version
      "
    `);
  });
  it.each([
    ['root', 'build [file]'],
    ['root', '[file]'],
    ['group', 'build [file]'],
    ['group', '[file]']
  ])('shows default and subcommand usage for named defaults in %s: %s', async (kind, spec) => {
    const app = breadc('cli');
    const scope = kind === 'group' ? app.group('tools') : app;
    scope.command(spec, 'Build files').alias(spec.startsWith('build') ? '' : 'build');
    const prefix = kind === 'group' ? ['tools'] : [];
    const path = ['cli', ...prefix].join(' ');
    const output = await help(app, [...prefix, '--help']);

    expect(output).toContain(`Usage:\n  ${path} [file] [options]\n  ${path} <command> [options]`);
    expect(output).toContain(`${[...prefix, 'build'].join(' ')} [file]  Build files`);

    if (spec.startsWith('build')) {
      expect(await help(app, [...prefix, 'build', '--help'])).toContain(`Usage: ${path} build [file] [options]`);
    }
  });

  it('distinguishes optional, required and absent group subcommands', async () => {
    const app = breadc('cli');
    const config = app.group('config', 'Read and edit settings');
    config.command('', 'Read settings');
    config.command('set <key> <value>', 'Edit settings');
    app.group('cache', 'Inspect cache').command('show', 'Show cache').alias('');
    app.group('tools', 'Run tools').command('run', 'Run a tool');
    app.group('status', 'Show status').command('', 'Show status');
    expect(await help(app)).toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli <command> [options]

      Commands:
        config [command]  Read and edit settings
        cache [command]   Inspect cache
        tools <command>   Run tools
        status            Show status

      Options:
        -h, --help     Show help
        -v, --version  Show version
      "
    `);
    expect(await help(app, ['cache', '--help'])).toMatchInlineSnapshot(`
      "cli/unknown

      Inspect cache

      Usage: cli cache [command] [options]

      Commands:
        cache show  Show cache

      Options:
        -h, --help     Show help
        -v, --version  Show version
      "
    `);
  });

  it('combines root usage when the default command has no positional arguments', async () => {
    const app = breadc('cli');
    app.command('', 'Show status');
    app.command('refresh', 'Refresh status');
    expect(await help(app)).toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli [command] [options]

      Commands:
        refresh  Refresh status

      Options:
        -h, --help     Show help
        -v, --version  Show version
      "
    `);
  });

  it('shows empty groups and named default commands in the command list', async () => {
    const app = breadc('cli');
    app.group('empty', { summary: 'Empty group', examples: [{ command: 'cli empty --help' }] });
    app.command('serve [path]', 'Serve files').alias('').alias('start');
    expect(await help(app)).toMatchInlineSnapshot(`
      "cli/unknown

      Usage:
        cli [path] [options]
        cli <command> [options]

      Commands:
        empty         Empty group
        serve [path]  Serve files

      Options:
        -h, --help     Show help
        -v, --version  Show version
      "
    `);
    expect(await help(app, ['empty', '--help'])).toMatchInlineSnapshot(`
      "cli/unknown

      Empty group

      Usage: cli empty [options]

      Options:
        -h, --help     Show help
        -v, --version  Show version

      Examples:
        cli empty --help
      "
    `);
  });
});

describe('help: descriptions and layout', () => {
  it('uses the first nonempty structured summary line in lists and separates details on each page', async () => {
    const app = breadc('cli', { builtin: { version: false } });
    app
      .group('tools', { summary: '\nTools\nManage tools', details: 'Group details.' })
      .command('run', { summary: '\nRun\nRun a tool', details: 'Command details.' });

    expect(await help(app)).toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli <command> [options]

      Commands:
        tools <command>  Tools

      Options:
        -h, --help  Show help
      "
    `);
    expect(await help(app, ['tools', '--help'])).toMatchInlineSnapshot(`
      "cli/unknown


      Tools
      Manage tools

      Group details.

      Usage: cli tools <command> [options]

      Commands:
        tools run  Run

      Options:
        -h, --help  Show help
      "
    `);
    expect(await help(app, ['tools', 'run', '--help'])).toMatchInlineSnapshot(`
      "cli/unknown


      Run
      Run a tool

      Command details.

      Usage: cli tools run [options]

      Options:
        -h, --help  Show help
      "
    `);
  });

  it('uses a string summary in the parent list and its full text on its own page', async () => {
    const app = breadc('cli', { description: 'App summary\n\n  App details' });
    app.command('run', '\nRun summary\n\n  Run details');
    expect(await help(app)).toMatchInlineSnapshot(`
      "cli/unknown

      App summary

        App details

      Usage: cli <command> [options]

      Commands:
        run  Run summary

      Options:
        -h, --help     Show help
        -v, --version  Show version
      "
    `);
    expect(await help(app, ['run', '--help'])).toMatchInlineSnapshot(`
      "cli/unknown


      Run summary

        Run details

      Usage: cli run [options]

      Options:
        -h, --help     Show help
        -v, --version  Show version
      "
    `);
  });

  it('stacks the entire option list when long labels leave too little description space', async () => {
    const app = breadc('cli', { builtin: { version: false } })
      .option('--destination-directory-for-generated-application-artifacts <path>', '选择输出目录\n保留显式换行。')
      .option('--force', 'Overwrite files');
    expect(await help(app)).toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli [options]

      Options:
        --destination-directory-for-generated-application-artifacts <path>
          选择输出目录
          保留显式换行。

        --force
          Overwrite files

        -h, --help
          Show help
      "
    `);
  });

  it('displays effective scoped declarations and boolean option forms', async () => {
    const app = breadc('cli').option('-r, --region <name>', 'Root region');
    const store = app.group('store').option('-r, --region <name>', 'Group region');
    store
      .command('rm <file>', 'Delete')
      .option('--region <name>', 'Command region')
      .option('-a, --[no-]all', 'Include everything')
      .option('--no-open', 'Keep closed')
      .option('--include <...value>', 'Include files');
    store.command('ls', 'List').option('--list-only', 'Sibling option');
    app.command('store export', 'Export').option('--export-only', 'Export option');
    expect(await help(app, ['store', '--help'])).toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli store <command> [options]

      Commands:
        store rm <file>  Delete
        store ls         List
        store export     Export

      Options:
        -r, --region <name>  Group region
        -h, --help           Show help
        -v, --version        Show version
      "
    `);
    expect(await help(app, ['store', 'rm', '--help'])).toMatchInlineSnapshot(`
      "cli/unknown

      Delete

      Usage: cli store rm <file> [options]

      Options:
            --region <name>       Command region
        -a, --all, --no-all       Include everything
            --no-open             Keep closed
            --include <...value>  Include files
        -h, --help                Show help
        -v, --version             Show version
      "
    `);
    expect(await help(app, ['store', 'export', '--help'])).toMatchInlineSnapshot(`
      "cli/unknown

      Export

      Usage: cli store export [options]

      Options:
        -r, --region <name>  Group region
            --export-only    Export option
        -h, --help           Show help
        -v, --version        Show version
      "
    `);
  });

  it('displays only effective short aliases after overrides', async () => {
    const app = breadc('cli').option('-x, --first', 'First').option('-x, --second', 'Second');
    app.command('run').option('--second', 'Local second');
    expect(await help(app, ['run', '--help'])).toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli run [options]

      Options:
            --first    First
            --second   Local second
        -h, --help     Show help
        -v, --version  Show version
      "
    `);
  });

  it('applies default command option overrides before resolving the command', async () => {
    const app = breadc('cli').option('-r, --region <name>', 'Root region');
    const store = app.group('store').option('-r, --region <name>', 'Group region').option('-a, --archive', 'Archive');
    store
      .command('[path]')
      .option('-r, --region <name>', 'Default region')
      .option('--region <name>', 'Upload region')
      .option('-a, --all', 'Include all files');
    store.command('status', 'Show upload status');
    expect(await help(app, ['store', '--help'])).toMatchInlineSnapshot(`
      "cli/unknown

      Usage:
        cli store [path] [options]
        cli store <command> [options]

      Commands:
        store status  Show upload status

      Options:
            --archive        Archive
            --region <name>  Upload region
        -a, --all            Include all files
        -h, --help           Show help
        -v, --version        Show version
      "
    `);
  });
  it('wraps long page prose and usage at the fixed output width', async () => {
    const app = breadc('application-with-a-long-name', { builtin: { version: false } });
    const command = app.command('generate-detailed-application-report <source-directory> <destination-directory>', {
      summary: 'Generate a detailed report from the source directory and write it to the destination directory.',
      details:
        '  Preserve this indentation when a long description continues onto the following line.\n\nSecond paragraph.'
    });
    command.alias('report').alias('generate-report-from-source-directory');
    expect(await help(app, ['report', '--help'])).toMatchInlineSnapshot(`
      "application-with-a-long-name/unknown

      Generate a detailed report from the source directory and write it to the
      destination directory.

        Preserve this indentation when a long description continues onto the following
        line.

      Second paragraph.

      Usage:
        application-with-a-long-name generate-detailed-application-report
        <source-directory> <destination-directory> [options]

      Aliases:
        report, generate-report-from-source-directory

      Options:
        -h, --help  Show help
      "
    `);
  });

  it('renders details-only descriptions and hides entirely blank argument descriptions', async () => {
    const app = breadc('cli', { description: { description: 'Application details.' } });
    app
      .command('run', { summary: '', details: 'Command details.' })
      .argument('<file>', 'Input details.')
      .option('--silent', '')
      .option('--output <file>', 'Output details.');
    app.command('blank').argument('[file]', ' \n  ').argument('[rest]', '');
    expect(await help(app)).toMatchInlineSnapshot(`
      "cli/unknown

      Application details.

      Usage: cli <command> [options]

      Commands:
        run <file>
        blank [file] [rest]

      Options:
        -h, --help     Show help
        -v, --version  Show version
      "
    `);
    expect(await help(app, ['run', '--help'])).toMatchInlineSnapshot(`
      "cli/unknown

      Command details.

      Usage: cli run <file> [options]

      Arguments:
        <file>  Input details.

      Options:
            --silent
            --output <file>  Output details.
        -h, --help           Show help
        -v, --version        Show version
      "
    `);
    expect(await help(app, ['blank', '--help'])).toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli blank [file] [rest] [options]

      Options:
        -h, --help     Show help
        -v, --version  Show version
      "
    `);
  });
});

describe('help: configuration and locale', () => {
  it('supports custom short and long spellings', async () => {
    const app = breadc('cli', {
      builtin: { help: { spec: '-H, --usage' }, version: { spec: '-V, --release' } }
    }).option('--force', 'Force');
    for (const flag of ['-H', '--usage']) {
      expect(await help(app, [flag])).toMatchInlineSnapshot(`
        "cli/unknown

        Usage: cli [options]

        Options:
              --force    Force
          -H, --usage    Show help
          -V, --release  Show version
        "
      `);
    }
  });

  it('supports a long-only spelling', async () => {
    const app = breadc('cli', { builtin: { help: { spec: '--usage' } } });
    expect(await help(app, ['--usage'])).toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli [options]

      Options:
            --usage    Show help
        -v, --version  Show version
      "
    `);
  });

  it('keeps locale specific to each app across root, group and command help', async () => {
    const chinese = breadc('cli', { i18n: 'zh' });
    chinese.group('store', 'Storage').command('ls', 'List');
    for (const prefix of [[], ['store'], ['store', 'ls']]) {
      const output = await help(chinese, [...prefix, '--help']);
      expect(output).toContain(`用法: ${['cli', ...prefix].join(' ')}`);
      expect(output).toContain('显示帮助');
      expect(output).toContain('显示版本');
    }
    expect(await help(breadc('cli'))).toContain('Show help');
  });

  it('accepts an explicit locale through printHelp', () => {
    const context = parse(breadc('cli'), []);
    expect(stripVTControlCharacters(printHelp(context, { i18n: 'zh' }))).toContain('用法: cli [选项]');
  });

  it('localizes every leaf section while wrapping example comments and preserving long commands', async () => {
    const app = breadc('cli', { i18n: 'zh', builtin: { version: false } });
    app
      .command('upload', {
        summary: '上传文件',
        examples: [
          {
            comment: '上传前请检查文件路径和目标区域，确认选择了正确的存储位置，然后再执行下面的命令。',
            command: 'cli upload report.zip --destination-directory=archive/annual-reports/verified-final-copies'
          }
        ]
      })
      .alias('push')
      .argument('<...files>', '要上传的文件\n可以指定多个文件。');
    expect(await help(app, ['push', '--help'])).toMatchInlineSnapshot(`
      "cli/unknown

      上传文件

      用法: cli upload <...files> [选项]

      别名:
        push

      参数:
        <...files>  要上传的文件
                    可以指定多个文件。

      选项:
        -h, --help  显示帮助

      示例:
        # 上传前请检查文件路径和目标区域，确认选择了正确的存储位置，然后再执行下面的命
        # 令。
        cli upload report.zip --destination-directory=archive/annual-reports/verified-final-copies
      "
    `);
  });
});

describe('help: execution', () => {
  it.each(['root', 'alias', 'group'])('accepts default command options with help in %s', async (scope) => {
    const app = breadc('cli');
    const owner = scope === 'group' ? app.group('tool') : app;
    const action = vi.fn();
    if (scope === 'alias') {
      owner.command('build').alias('').option('--dry-run').action(action);
    } else {
      owner.command('').option('--dry-run').action(action);
      owner.command('build').option('--dry-run').action(action);
    }
    const prefix = scope === 'group' ? ['tool'] : [];
    const output = await help(app, [...prefix, '--help']);
    expect(output).toContain('--dry-run');
    expect(await help(app, [...prefix, '--dry-run', '--help'])).toBe(output);
    expect(await help(app, [...prefix, '--help', '--dry-run'])).toBe(output);
    expect(await help(app, [...prefix, 'build', '--dry-run', '--help'])).toContain('--dry-run');
    expect(action).not.toHaveBeenCalled();
    await app.run([...prefix, '--dry-run']);
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('shows automatic help for empty input, unknown commands and groups', async () => {
    const app = breadc('cli');
    app.group('tools', 'Tools').command('run', 'Run');
    for (const argv of [[], ['unknown']]) {
      expect(await help(app, argv)).toMatchInlineSnapshot(`
        "cli/unknown

        Usage: cli <command> [options]

        Commands:
          tools <command>  Tools

        Options:
          -h, --help     Show help
          -v, --version  Show version
        "
      `);
    }
    expect(await help(app, ['tools'])).toMatchInlineSnapshot(`
      "cli/unknown

      Tools

      Usage: cli tools <command> [options]

      Commands:
        tools run  Run

      Options:
        -h, --help     Show help
        -v, --version  Show version
      "
    `);
  });

  it('keeps automatic help available with builtin flags disabled', async () => {
    expect(await help(breadc('cli', { builtin: { help: false, version: false } }), [])).toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli [options]
      "
    `);
  });

  it('skips conversion and middleware when showing automatic help', async () => {
    const cast = vi.fn(Number);
    const middleware = vi.fn((_context, next) => next());
    const app = breadc('cli').option('--count <number>', 'Count', { default: '2', cast }).use(middleware);
    expect(await help(app, [])).toContain('Usage: cli [options]');
    expect(cast).not.toHaveBeenCalled();
    expect(middleware).not.toHaveBeenCalled();
  });

  it('keeps later declarations and command execution usable after printing help', async () => {
    const app = breadc('cli');
    const cmd = app.group('tools').command('run <first>').alias('r');
    const initial = await help(app);
    cmd.argument('<second>').action((first, second) => [first, second]);
    expect(await help(app, ['tools', 'r', '--help'])).toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli tools run <first> <second> [options]

      Aliases:
        tools r

      Options:
        -h, --help     Show help
        -v, --version  Show version
      "
    `);
    await expect(app.run(['tools', 'r', 'one', 'two'])).resolves.toMatchInlineSnapshot(`
      [
        "one",
        "two",
      ]
    `);
    expect(await help(app)).toBe(initial);
  });
});
