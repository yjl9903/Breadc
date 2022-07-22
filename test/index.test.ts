import { describe, expect, it } from 'vitest';

import Breadc from '../src';

describe('Parse', () => {
  const logger = () => {};

  it('should parse', () => {
    expect(Breadc('cli', { logger }).parse(['hello', 'world']))
      .toMatchInlineSnapshot(`
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
    expect(Breadc('cli', { logger }).parse(['--root'])).toMatchInlineSnapshot(`
      {
        "arguments": [],
        "command": undefined,
        "options": {},
      }
    `);

    expect(Breadc('cli', { logger }).parse(['--root', 'folder']))
      .toMatchInlineSnapshot(`
      {
        "arguments": [],
        "command": undefined,
        "options": {},
      }
    `);

    expect(Breadc('cli', { logger }).parse(['--root', 'folder', 'text']))
      .toMatchInlineSnapshot(`
      {
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
});

describe('Run', () => {
  it('should run sub commands', () => {
    const cli = Breadc('cli');
    cli.command('pages build');
    cli.command('pages dev [...files]').action((files) => {
      expect(files).toMatchInlineSnapshot(`
        [
          "a",
          "b",
          "c",
          "d",
          "e",
        ]
      `);
    });
    cli.run(['pages', 'dev', 'a', 'b', 'c', 'd', 'e']);
  });

  it('should parse rest arguments', () => {
    const cli = Breadc('cli');
    cli.command('[...]').action((files) => {
      expect(files).toMatchInlineSnapshot(`
        [
          "a",
          "b",
          "c",
          "d",
          "e",
        ]
      `);
    });
    cli.run(['a', 'b', 'c', 'd', 'e']);
  });

  it('should parse one argument and rest arguments', () => {
    const cli = Breadc('cli');
    cli.command('<root> [...]').action((root, files) => {
      expect(root).toMatchInlineSnapshot('"a"');
      expect(files).toMatchInlineSnapshot(`
        [
          "b",
          "c",
          "d",
          "e",
        ]
      `);
    });
    cli.run(['a', 'b', 'c', 'd', 'e']);
  });

  it('should run number argument', () => {
    const cli = Breadc('add');
    cli.command('<a> <b>').action((a, b) => {
      expect(typeof a).toBe('string');
      expect(typeof b).toBe('string');
    });
    cli.run(['1', '2']);
  });

  it('should run hex number argument', () => {
    const cli = Breadc('add');
    cli.command('<a> <b>').action((a, b) => {
      expect(typeof a).toBe('string');
      expect(typeof b).toBe('string');
      expect(+a + +b).toBe(35);
    });
    cli.run(['0x11', '0x12']);
  });

  it('should run with boolean option', () => {
    const cli = Breadc('cal');
    cli
      .command('minus <a> <b>')
      .option('--minus')
      .action((a, b, option) => {
        expect(typeof a).toBe('string');
        expect(typeof b).toBe('string');
        expect(option.minus).toBeFalsy();
      });
    cli
      .command('<a> <b>')
      .option('--minus')
      .action((a, b, option) => {
        expect(typeof a).toBe('string');
        expect(typeof b).toBe('string');
        expect(option.minus).toBeTruthy();
      });
    cli.run(['--minus', '1', '2']);
    cli.run(['minus', '1', '2']);
    cli.run(['minus', '1', '2', '--no-minus']);
  });

  it('should run with required option', () => {
    {
      const cli = Breadc('cal');
      cli
        .command('')
        .option('--fst <fst>')
        .option('--snd <snd>')
        .action((option) => {
          expect(option.fst).toBe('1');
          expect(option.snd).toBe('2');
        });
      cli.run(['--fst', '1', '--snd', '2']);
    }
    {
      const cli = Breadc('cal');
      cli
        .command('')
        .option('--fst <fst>')
        .option('--snd <snd>')
        .action((option) => {
          expect(option.fst).toBeTruthy();
          expect(option.snd).toBeTruthy();
        });
      cli.run(['--fst', '--snd']);
    }
    {
      const cli = Breadc('cal');
      cli
        .command('')
        .option('--fst <fst>')
        .option('--snd <snd>')
        .action((option) => {
          expect(option.fst).toBeTruthy();
          expect(option.snd).toBeFalsy();
        });
      cli.run(['--fst']);
    }
    {
      const cli = Breadc('cal');
      cli
        .command('')
        .option('--fst <fst>')
        .option('--snd <snd>')
        .action((option) => {
          expect(option.fst).toBeFalsy();
          expect(option.snd).toBeFalsy();
        });
      cli.run(['--no-fst']);
    }
  });

  it('should run with non-required option', () => {
    {
      const cli = Breadc('cal');
      cli
        .command('')
        .option('--fst [fst]')
        .option('--snd [snd]')
        .action((option) => {
          expect(option.fst).toBe('1');
          expect(option.snd).toBe('2');
        });
      cli.run(['--fst', '1', '--snd', '2']);
    }
    {
      const cli = Breadc('cal');
      cli
        .command('')
        .option('--fst [fst]')
        .option('--snd [snd]')
        .action((option) => {
          expect(option.fst).toBe('');
          expect(option.snd).toBe('');
        });
      cli.run(['--fst', '--snd']);
    }
    {
      const cli = Breadc('cal');
      cli
        .command('')
        .option('--fst [fst]')
        .option('--snd [snd]')
        .action((option) => {
          expect(option.fst).toBe('');
          expect(option.snd).toBeUndefined();
        });
      cli.run(['--fst']);
    }
    {
      const cli = Breadc('cal');
      cli
        .command('')
        .option('--fst [fst]')
        .option('--snd [snd]')
        .action((option) => {
          expect(option.fst).toBeUndefined();
          expect(option.snd).toBeUndefined();
        });
      cli.run(['--no-fst']);
    }
  });

  it('should run with construct option', () => {
    {
      const cli = Breadc('echo', { version: '1.0.0' })
        .option('--host <host>', { default: 'localhost' })
        .option('--port <port>', {
          construct: (port) => (port ? +port : 3000)
        });

      cli.command('[message]').action((_message, option) => {
        expect(option.host).toBe('localhost');
        expect(option.port).toBe(3000);
      });

      cli.run([]);
      cli.run(['--port', '3000']);
    }
    {
      const cli = Breadc('echo', { version: '1.0.0' })
        .option('--host <host>', { default: 'localhost' })
        .option('--port <port>', {
          construct: (port) => (port ? +port : 3000)
        });

      cli.command('[message]').action((_message, option) => {
        expect(option.host).toBe('ip');
        expect(option.port).toBe(3001);
      });

      cli.run(['--host', 'ip', '--port', '3001']);
    }
  });

  it('has different options', () => {
    const cli = Breadc('cli');
    cli
      .command('a')
      .option('--host')
      .action((option) => {
        expect(option).toMatchInlineSnapshot(`
          {
            "host": true,
          }
        `);
      });
    cli
      .command('b')
      .option('--port')
      .action((option) => {
        expect(option).toMatchInlineSnapshot(`
          {
            "port": true,
          }
        `);
      });
    cli.run(['a', '--host']);
    cli.run(['b', '--port']);
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
