import { describe, it, expect, beforeAll } from 'vitest';

import { options } from '@breadc/color';

import { Breadc, Command } from '../../src/index.ts';

beforeAll(() => {
  options.enabled = false;
});

describe('breadc builtin version comamnd', () => {
  it('should print unknown version', () => {
    const app = new Breadc('cli');
    expect(app.runSync(['-v'])).toMatchInlineSnapshot(`"cli/unknown"`);
    expect(app.runSync(['--version'])).toMatchInlineSnapshot(`"cli/unknown"`);
  });

  it('should print passed version', () => {
    const app = new Breadc('cli', { version: '1.0.0' });
    expect(app.runSync(['-v'])).toMatchInlineSnapshot(`"cli/1.0.0"`);
    expect(app.runSync(['--version'])).toMatchInlineSnapshot(`"cli/1.0.0"`);
  });

  it('should be overwritten by single format', () => {
    const app = new Breadc('cli', {
      version: '2.0.0',
      builtin: {
        version: {
          format: '-V'
        }
      }
    });
    expect(app.runSync(['-V'])).toMatchInlineSnapshot(`"cli/2.0.0"`);
    expect(() => app.runSync(['-v'])).toThrowErrorMatchingInlineSnapshot(
      `[Error: There is no matched command]`
    );
    expect(() => app.runSync(['--version'])).toThrowErrorMatchingInlineSnapshot(
      `[Error: There is no matched command]`
    );
  });

  it('should be overwritten by format array', () => {
    const app = new Breadc('cli', {
      version: '2.0.0',
      builtin: {
        version: {
          format: ['-V', '--version']
        }
      }
    });
    expect(() => app.runSync(['-v'])).toThrowErrorMatchingInlineSnapshot(
      `[Error: There is no matched command]`
    );
    expect(app.runSync(['-V'])).toMatchInlineSnapshot(`"cli/2.0.0"`);
    expect(app.runSync(['--version'])).toMatchInlineSnapshot(`"cli/2.0.0"`);
  });
});

describe('breadc builtin help comamnd', () => {
  it('should print default help', () => {
    const app = new Breadc('cli');
    expect(app.runSync(['-h'])).toMatchInlineSnapshot(`
      [
        "cli/unknown",
        "",
        "Usage: cli [OPTIONS]",
        "",
        "Options:",
        [
          [
            "  -h, --help",
            "Print help",
          ],
          [
            "  -v, --version",
            "Print version",
          ],
        ],
      ]
    `);
    expect(app.runSync(['--help'])).toMatchInlineSnapshot(`
      [
        "cli/unknown",
        "",
        "Usage: cli [OPTIONS]",
        "",
        "Options:",
        [
          [
            "  -h, --help",
            "Print help",
          ],
          [
            "  -v, --version",
            "Print version",
          ],
        ],
      ]
    `);
  });

  it('should be overwritten by single format', () => {
    // TODO: optimized output
    const app = new Breadc('cli', {
      version: '2.0.0',
      builtin: {
        help: {
          format: 'help'
        }
      }
    });
    expect(app.runSync(['help'])).toMatchInlineSnapshot(`
      [
        "cli/2.0.0",
        "",
        "Usage: cli [OPTIONS]",
        "",
        "Options:",
        [
          [
            "  help",
            "Print help",
          ],
          [
            "  -v, --version",
            "Print version",
          ],
        ],
      ]
    `);
    expect(() => app.runSync(['-h'])).toThrowErrorMatchingInlineSnapshot(
      `[Error: There is no matched command]`
    );
    expect(() => app.runSync(['--help'])).toThrowErrorMatchingInlineSnapshot(
      `[Error: There is no matched command]`
    );
  });

  it('should be overwritten by format array', () => {
    // TODO: optimized output
    const app = new Breadc('cli', {
      version: '2.0.0',
      builtin: {
        help: {
          format: ['help', '--help']
        }
      }
    });
    expect(() => app.runSync(['-h'])).toThrowErrorMatchingInlineSnapshot(
      `[Error: There is no matched command]`
    );
    expect(app.runSync(['help'])).toMatchInlineSnapshot(`
      [
        "cli/2.0.0",
        "",
        "Usage: cli [OPTIONS]",
        "",
        "Options:",
        [
          [
            "  help, --help",
            "Print help",
          ],
          [
            "  -v, --version",
            "Print version",
          ],
        ],
      ]
    `);
    expect(app.runSync(['--help'])).toMatchInlineSnapshot(`
      [
        "cli/2.0.0",
        "",
        "Usage: cli [OPTIONS]",
        "",
        "Options:",
        [
          [
            "  help, --help",
            "Print help",
          ],
          [
            "  -v, --version",
            "Print version",
          ],
        ],
      ]
    `);
  });

  it('should output single default command help', () => {
    {
      const app = new Breadc('cli');
      app.addCommand(new Command(''));

      expect(app.runSync(['-h'])).toMatchInlineSnapshot(`
        [
          "cli/unknown",
          "",
          "Usage: cli [OPTIONS]",
          "",
          "Options:",
          [
            [
              "  -h, --help",
              "Print help",
            ],
            [
              "  -v, --version",
              "Print version",
            ],
          ],
        ]
      `);
    }
    {
      const app = new Breadc('cli');
      app.addCommand(new Command('<arg>'));

      expect(app.runSync(['-h'])).toMatchInlineSnapshot(`
        [
          "cli/unknown",
          "",
          "Usage: cli <arg> [OPTIONS]",
          "",
          "Options:",
          [
            [
              "  -h, --help",
              "Print help",
            ],
            [
              "  -v, --version",
              "Print version",
            ],
          ],
        ]
      `);
    }
    {
      const app = new Breadc('cli');
      app.addCommand(new Command('<arg1> [arg2] [...arg3]'));

      expect(app.runSync(['-h'])).toMatchInlineSnapshot(`
        [
          "cli/unknown",
          "",
          "Usage: cli <arg1> [arg2] [...arg3] [OPTIONS]",
          "",
          "Options:",
          [
            [
              "  -h, --help",
              "Print help",
            ],
            [
              "  -v, --version",
              "Print version",
            ],
          ],
        ]
      `);
    }
  });

  it('should output single alias default command help', () => {
    {
      const app = new Breadc('cli');
      app.addCommand(new Command('dev').alias(''));

      expect(app.runSync(['-h'])).toMatchInlineSnapshot(`
        [
          "cli/unknown",
          "",
          "Usage: cli dev [OPTIONS]",
          "",
          "Options:",
          [
            [
              "  -h, --help",
              "Print help",
            ],
            [
              "  -v, --version",
              "Print version",
            ],
          ],
        ]
      `);
    }
    {
      const app = new Breadc('cli');
      app.addCommand(new Command('dev <arg>').alias(''));

      expect(app.runSync(['-h'])).toMatchInlineSnapshot(`
        [
          "cli/unknown",
          "",
          "Usage: cli dev <arg> [OPTIONS]",
          "",
          "Options:",
          [
            [
              "  -h, --help",
              "Print help",
            ],
            [
              "  -v, --version",
              "Print version",
            ],
          ],
        ]
      `);
    }
    {
      const app = new Breadc('cli');
      app.addCommand(new Command('dev <arg1> [arg2] [...arg3]').alias(''));

      expect(app.runSync(['-h'])).toMatchInlineSnapshot(`
        [
          "cli/unknown",
          "",
          "Usage: cli dev <arg1> [arg2] [...arg3] [OPTIONS]",
          "",
          "Options:",
          [
            [
              "  -h, --help",
              "Print help",
            ],
            [
              "  -v, --version",
              "Print version",
            ],
          ],
        ]
      `);
    }
  });

  it('should output multiple commands', () => {
    const b = new Breadc('cli');
    b.command('[op]');
    b.command('dev');
    b.command('build <root>');
    b.command('preview');
    b.command('test [case]');
    b.command('run [...args]');

    expect(b.runSync(['--help'])).toMatchInlineSnapshot(`
      [
        "cli/unknown",
        "",
        "Usage: cli [COMMAND] [OPTIONS]",
        "",
        "Commands:",
        [
          [
            "  cli [op]",
            "",
          ],
          [
            "  cli dev",
            "",
          ],
          [
            "  cli build <root>",
            "",
          ],
          [
            "  cli preview",
            "",
          ],
          [
            "  cli test [case]",
            "",
          ],
          [
            "  cli run [...args]",
            "",
          ],
        ],
        "",
        "Options:",
        [
          [
            "  -h, --help",
            "Print help",
          ],
          [
            "  -v, --version",
            "Print version",
          ],
        ],
      ]
    `);
  });

  it('should output matched commands help', () => {
    const b = new Breadc('cli');
    b.command('[op]', 'This is the default command');
    b.command('dev', 'Start dev server');
    b.command('build <root>', 'Build project');
    b.command('preview', 'Preview project');
    b.command('test [case]', `Test project`);
    b.command('run [...args]', `Run project`);

    expect(b.runSync(['dev', '--help'])).toMatchInlineSnapshot(`
      [
        "cli/unknown",
        "",
        "Usage: cli dev [OPTIONS]",
        "",
        "Options:",
        [
          [
            "  -h, --help",
            "Print help",
          ],
          [
            "  -v, --version",
            "Print version",
          ],
        ],
      ]
    `);
    expect(b.runSync(['build', '--help'])).toMatchInlineSnapshot(`
      [
        "cli/unknown",
        "",
        "Usage: cli build <root> [OPTIONS]",
        "",
        "Options:",
        [
          [
            "  -h, --help",
            "Print help",
          ],
          [
            "  -v, --version",
            "Print version",
          ],
        ],
      ]
    `);
    expect(b.runSync(['preview', '--help'])).toMatchInlineSnapshot(`
      [
        "cli/unknown",
        "",
        "Usage: cli preview [OPTIONS]",
        "",
        "Options:",
        [
          [
            "  -h, --help",
            "Print help",
          ],
          [
            "  -v, --version",
            "Print version",
          ],
        ],
      ]
    `);
    expect(b.runSync(['test', '--help'])).toMatchInlineSnapshot(`
      [
        "cli/unknown",
        "",
        "Usage: cli test [case] [OPTIONS]",
        "",
        "Options:",
        [
          [
            "  -h, --help",
            "Print help",
          ],
          [
            "  -v, --version",
            "Print version",
          ],
        ],
      ]
    `);
    expect(b.runSync(['run', '--help'])).toMatchInlineSnapshot(`
      [
        "cli/unknown",
        "",
        "Usage: cli run [...args] [OPTIONS]",
        "",
        "Options:",
        [
          [
            "  -h, --help",
            "Print help",
          ],
          [
            "  -v, --version",
            "Print version",
          ],
        ],
      ]
    `);
  });

  it('should output matched sub-commands group help', () => {
    const b = new Breadc('cli');
    b.command('[op]', 'This is the default command');
    b.command('dev', 'Start dev server');
    b.command('build <root>', 'Build project');
    b.command('preview', 'Preview project');
    b.command('group test [case]', `Test project`)
      .option('--flag')
      .alias('test');
    b.command('group run [...args]', `Run project`)
      .option('--name <name>')
      .alias('run');

    expect(b.runSync(['group', '--help'])).toMatchInlineSnapshot(`
      [
        "cli/unknown",
        "",
        "Usage: cli <OPTIONS> [OPTIONS]",
        "",
        "Commands:",
        [
          [
            "  cli group test [case]",
            "Test project",
          ],
          [
            "  cli group run [...args]",
            "Run project",
          ],
        ],
        "",
        "Options:",
        [
          [
            "      --flag",
            "",
          ],
          [
            "      --name <name>",
            "",
          ],
          [
            "  -h, --help",
            "Print help",
          ],
          [
            "  -v, --version",
            "Print version",
          ],
        ],
      ]
    `);
  });

  it('should output global options help', () => {
    const b = new Breadc('cli')
      .option('--flag', 'Flag')
      .option('--host <addr>', 'Host')
      .option('--local', 'Local')
      .option('--root <root>', 'Root');
    b.command('[op]');
    b.command('dev');
    b.command('build <root>');
    b.command('preview');
    b.command('test [case]');
    b.command('run [...args]');

    expect(b.runSync(['-h'])).toMatchInlineSnapshot(`
      [
        "cli/unknown",
        "",
        "Usage: cli [COMMAND] [OPTIONS]",
        "",
        "Commands:",
        [
          [
            "  cli [op]",
            "",
          ],
          [
            "  cli dev",
            "",
          ],
          [
            "  cli build <root>",
            "",
          ],
          [
            "  cli preview",
            "",
          ],
          [
            "  cli test [case]",
            "",
          ],
          [
            "  cli run [...args]",
            "",
          ],
        ],
        "",
        "Options:",
        [
          [
            "      --flag",
            "Flag",
          ],
          [
            "      --host <addr>",
            "Host",
          ],
          [
            "      --local",
            "Local",
          ],
          [
            "      --root <root>",
            "Root",
          ],
          [
            "  -h, --help",
            "Print help",
          ],
          [
            "  -v, --version",
            "Print version",
          ],
        ],
      ]
    `);
  });

  it('should output chinese help', () => {
    const b = new Breadc('cli', { i18n: 'zh' })
      .option('--flag', 'Flag')
      .option('--host <addr>', 'Host')
      .option('--local', 'Local')
      .option('--root <root>', 'Root');
    b.command('[op]');
    b.command('dev');
    b.command('build <root>');
    b.command('preview');
    b.command('test [case]');
    b.command('run [...args]');

    expect(b.runSync(['--help'])).toMatchInlineSnapshot(`
      [
        "cli/unknown",
        "",
        "用法: cli [命令] [选项]",
        "",
        "命令:",
        [
          [
            "  cli [op]",
            "",
          ],
          [
            "  cli dev",
            "",
          ],
          [
            "  cli build <root>",
            "",
          ],
          [
            "  cli preview",
            "",
          ],
          [
            "  cli test [case]",
            "",
          ],
          [
            "  cli run [...args]",
            "",
          ],
        ],
        "",
        "选项:",
        [
          [
            "      --flag",
            "Flag",
          ],
          [
            "      --host <addr>",
            "Host",
          ],
          [
            "      --local",
            "Local",
          ],
          [
            "      --root <root>",
            "Root",
          ],
          [
            "  -h, --help",
            "输出帮助",
          ],
          [
            "  -v, --version",
            "输出版本号",
          ],
        ],
      ]
    `);
  });
});
