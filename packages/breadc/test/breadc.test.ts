import { describe, expect, it } from 'vitest';

import { breadc } from '../src';

describe('Breadc', () => {
  it('should run sub commands', async () => {
    const cli = breadc('cli');
    cli.command('pages build');
    cli.command('pages dev [...files]').action((files) => files);

    expect(await cli.run(['pages', 'dev', 'a', 'b', 'c', 'd', 'e'])).toMatchInlineSnapshot(`
      [
        "a",
        "b",
        "c",
        "d",
        "e",
      ]
    `);
  });

  it('should parse rest arguments', async () => {
    const cli = breadc('cli');
    cli.command('[...]').action((files) => files);
    expect(await cli.run(['a', 'b', 'c', 'd', 'e'])).toMatchInlineSnapshot(`
      [
        "a",
        "b",
        "c",
        "d",
        "e",
      ]
    `);
  });

  it('should parse one argument and rest arguments', async () => {
    const cli = breadc('cli');
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
    await cli.run(['a', 'b', 'c', 'd', 'e']);
  });

  it('should run number argument', () => {
    const cli = breadc('add');
    cli.command('<a> <b>').action((a, b) => {
      expect(typeof a).toBe('string');
      expect(typeof b).toBe('string');
    });
    cli.run(['1', '2']);
  });

  it('should run hex number argument', () => {
    const cli = breadc('add');
    cli.command('<a> <b>').action((a, b) => {
      expect(typeof a).toBe('string');
      expect(typeof b).toBe('string');
      expect(+a + +b).toBe(35);
    });
    cli.run(['0x11', '0x12']);
  });

  it('should run with boolean option', async () => {
    const cli = breadc('cal');
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
    await cli.run(['--minus', '1', '2']);
    await cli.run(['minus', '1', '2']);
    await cli.run(['minus', '1', '2', '--no-minus']);
  });

  it('should run with required option', async () => {
    {
      const cli = breadc('cal');
      cli
        .command('')
        .option('--fst <fst>')
        .option('--snd <snd>')
        .action((option) => {
          return [option.fst, option.snd];
        });
      expect(await cli.run(['--fst', '1', '--snd', '2'])).toStrictEqual(['1', '2']);
    }
  });

  it('should cast option type', async () => {
    const cli = breadc('echo', { version: '1.0.0' })
      .option('--host <host>', { default: 'localhost' })
      .option('--port <port>', {
        default: '3000',
        cast: (port) => +port
      });

    cli.command('[message]').action((_message, option) => {
      return option;
    });

    expect(await cli.run([])).toMatchInlineSnapshot(`
        {
          "--": [],
          "host": "localhost",
          "port": 3000,
        }
      `);
    expect(await cli.run(['--port', '3000'])).toMatchInlineSnapshot(`
        {
          "--": [],
          "host": "localhost",
          "port": 3000,
        }
      `);
    expect(await cli.run(['--host', 'ip', '--port', '3001'])).toMatchInlineSnapshot(`
        {
          "--": [],
          "host": "ip",
          "port": 3001,
        }
      `);
  });

  it('has different options', async () => {
    const cli = breadc('cli');
    cli
      .command('a')
      .option('--host')
      .action((option) => option);
    cli
      .command('b')
      .option('--port')
      .action((option) => option);

    expect(await cli.run(['a', '--host'])).toMatchInlineSnapshot(`
      {
        "--": [],
        "host": true,
      }
    `);
    expect(await cli.run(['b', '--port'])).toMatchInlineSnapshot(`
      {
        "--": [],
        "port": true,
      }
    `);
  });

  it('should run with default true boolean option value', async () => {
    const cli = breadc('cli');
    cli
      .option('--flag', { default: true })
      .command('')
      .action((option) => option.flag);
    expect(await cli.run([])).toBe(true);
    expect(await cli.run(['--flag'])).toBe(true);
    expect(await cli.run(['--no-flag'])).toBe(false);
  });

  it('should run with default false boolean option value', async () => {
    const cli = breadc('cli');
    cli
      .option('--flag', { default: false })
      .command('')
      .action((option) => option.flag);
    expect(await cli.run([])).toBe(false);
    expect(await cli.run(['--flag'])).toBe(true);
    expect(await cli.run(['--no-flag'])).toBe(false);
  });

  it('should run with default string required value', async () => {
    const cli = breadc('cli');
    cli
      .option('--flag <value>', { default: 'true' })
      .option('--open', { default: true })
      .command('')
      .action((option) => option.flag);
    expect(await cli.run([])).toBe('true');
    expect(await cli.run(['--flag', 'text'])).toBe('text');
    expect(async () => await cli.run(['--flag'])).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: You should provide arguments for --flag <value>]`
    );
    expect(async () => await cli.run(['--no-flag'])).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Unknown option --no-flag]`
    );
  });
});

describe('Breadc Error', () => {
  it('should match a command', async () => {
    const cli = breadc('cli');
    expect(await cli.run([])).toBeUndefined();
  });

  it('has wrong command format', () => {
    const cli = breadc('cli');
    expect(() => cli.command('[abc] abc')).toThrowErrorMatchingInlineSnapshot(
      `[Error: Sub-command should be placed at the beginning]`
    );
    expect(() => cli.command('[...abc] abc')).toThrowErrorMatchingInlineSnapshot(
      `[Error: Sub-command should be placed at the beginning]`
    );
    expect(() => cli.command('<abc> abc')).toThrowErrorMatchingInlineSnapshot(
      `[Error: Sub-command should be placed at the beginning]`
    );
    expect(() => cli.command('abc <abc> abc')).toThrowErrorMatchingInlineSnapshot(
      `[Error: Sub-command should be placed at the beginning]`
    );
    expect(() => cli.command('def [abc] abc')).toThrowErrorMatchingInlineSnapshot(
      `[Error: Sub-command should be placed at the beginning]`
    );
    expect(() => cli.command('ghi [...abc] abc')).toThrowErrorMatchingInlineSnapshot(
      `[Error: Sub-command should be placed at the beginning]`
    );
    expect(() => cli.command('[ghi] <abc> abc')).toThrowErrorMatchingInlineSnapshot(
      `[Error: Required arguments should be placed before optional or rest arguments]`
    );
    expect(() => cli.command('[abc] [ghi]')).toThrowErrorMatchingInlineSnapshot(
      `[Error: There is at most one optional or rest arguments]`
    );
  });

  it('has wrong option format', () => {
    const cli = breadc('cli');
    expect(() => cli.option('abc')).toThrowErrorMatchingInlineSnapshot(`[Error: Can not parse option format (abc)]`);
    expect(() => cli.option('-r')).toThrowErrorMatchingInlineSnapshot(`[Error: Can not parse option format (-r)]`);
    expect(() => cli.option('--root [...files]')).toThrowErrorMatchingInlineSnapshot(
      `[Error: Can not parse option format (--root [...files])]`
    );
    expect(() => cli.option('--root [files]')).toThrowErrorMatchingInlineSnapshot(
      `[Error: Can not parse option format (--root [files])]`
    );
    expect(() => cli.option('--root <...files>')).toThrowErrorMatchingInlineSnapshot(
      `[Error: Can not parse option format (--root <...files>)]`
    );
    expect(() => cli.option('--no-root <root>')).toThrowErrorMatchingInlineSnapshot(
      `[Error: Can not parse option format (--no-root <root>)]`
    );
  });
});

describe('Parse Error', () => {
  it('should provide required arguments', async () => {
    const cli = breadc('cli');
    cli.command('run <dir>').action((dir) => dir);
    expect(async () => await cli.run(['run'])).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: You must provide require argument dir]`
    );
  });

  it('should not match inner sub-commands', async () => {
    const cli = breadc('cli');
    cli.command('page get <page>').action((p) => p);
    expect(async () => cli.run(['page'])).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: Unknown sub-command]`);
    expect(async () => cli.run(['page', 'post'])).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Unknown sub-command (post)]`
    );
  });
});

describe('Plugin', () => {
  it('should pre run', async () => {
    const output: number[] = [];
    const cli = breadc('cli', {
      plugins: [
        {
          onPreRun() {
            output.push(1);
          }
        }
      ]
    });
    cli.command('').action(() => 0);
    await cli.run([]);
    expect(output[0]).toBe(1);
  });

  it('should post run', async () => {
    const output: number[] = [];
    const cli = breadc('cli', {
      plugins: [
        {
          onPostRun() {
            output.push(2);
          }
        }
      ]
    });
    cli.command('').action(() => 0);
    await cli.run([]);
    expect(output[0]).toBe(2);
  });

  it('should pre and post run', async () => {
    const output: number[] = [];
    const cli = breadc('cli', {
      plugins: [
        {
          onPreRun() {
            output.push(1);
          },
          onPostRun() {
            output.push(2);
          }
        }
      ]
    });
    cli.command('').action(() => 0);
    await cli.run([]);
    expect(output[0]).toBe(1);
    expect(output[1]).toBe(2);
    expect(output[2]).toBeUndefined();
  });

  it('should match all command', async () => {
    const output: number[] = [];
    const cli = breadc('cli', {
      plugins: [
        {
          onPreCommand() {
            output.push(1);
          },
          onPostCommand() {
            output.push(2);
          }
        }
      ]
    });
    cli.command('abc').action(() => 0);
    cli.command('def').action(() => 1);
    await cli.run(['abc']);
    await cli.run(['def']);
    expect(output[0]).toBe(1);
    expect(output[1]).toBe(2);
    expect(output[2]).toBe(1);
    expect(output[3]).toBe(2);
    expect(output[4]).toBeUndefined();
  });

  it('should match receive command parse result', async () => {
    const output: any[] = [];
    const cli = breadc('cli', {
      plugins: [
        {
          onPreCommand(result) {
            output.push(result);
          }
        }
      ]
    });
    cli.command('abc').action(() => 0);
    cli.command('def').action(() => 1);
    await cli.run(['abc']);
    await cli.run(['def']);
    expect(output[0]).toMatchInlineSnapshot(`
      {
        "--": [],
        "arguments": [],
        "callback": [Function],
        "matched": {
          "command": {
            "_arguments": [
              {
                "name": "abc",
                "type": "const",
              },
            ],
            "_default": false,
            "_options": [],
            "action": [Function],
            "alias": [Function],
            "callback": [Function],
            "description": "",
            "format": "abc",
            "option": [Function],
          },
          "node": {
            "children": Map {},
            "command": {
              "_arguments": [
                {
                  "name": "abc",
                  "type": "const",
                },
              ],
              "_default": false,
              "_options": [],
              "action": [Function],
              "alias": [Function],
              "callback": [Function],
              "description": "",
              "format": "abc",
              "option": [Function],
            },
            "finish": [Function],
            "init": [Function],
            "next": [Function],
          },
          "option": undefined,
        },
        "meta": {},
        "options": {},
      }
    `);
    expect(output[1]).toMatchInlineSnapshot(`
      {
        "--": [],
        "arguments": [],
        "callback": [Function],
        "matched": {
          "command": {
            "_arguments": [
              {
                "name": "def",
                "type": "const",
              },
            ],
            "_default": false,
            "_options": [],
            "action": [Function],
            "alias": [Function],
            "callback": [Function],
            "description": "",
            "format": "def",
            "option": [Function],
          },
          "node": {
            "children": Map {},
            "command": {
              "_arguments": [
                {
                  "name": "def",
                  "type": "const",
                },
              ],
              "_default": false,
              "_options": [],
              "action": [Function],
              "alias": [Function],
              "callback": [Function],
              "description": "",
              "format": "def",
              "option": [Function],
            },
            "finish": [Function],
            "init": [Function],
            "next": [Function],
          },
          "option": undefined,
        },
        "meta": {},
        "options": {},
      }
    `);
    expect(output[2]).toBeUndefined();
  });

  it('should match command', async () => {
    const output: number[] = [];
    const cli = breadc('cli', {
      plugins: [
        {
          onPreCommand: {
            '*': () => {
              output.push(1);
            }
          },
          onPostCommand: {
            '*': () => {
              output.push(2);
            }
          }
        }
      ]
    });
    cli.command('').action(() => 0);
    await cli.run([]);
    expect(output[0]).toBe(1);
    expect(output[1]).toBe(2);
    expect(output[2]).toBeUndefined();
  });

  it('should match sub command', async () => {
    const output: number[] = [];
    const cli = breadc('cli', {
      plugins: [
        {
          onPreCommand: {
            send: () => {
              output.push(1);
            }
          },
          onPostCommand: {
            sendMessage: () => {
              output.push(2);
            }
          }
        }
      ]
    });
    cli.command('echo').action(() => 0);
    cli.command('send message').action(() => 0);
    await cli.run(['echo']);
    await cli.run(['send', 'message']);
    expect(output[0]).toBe(1);
    expect(output[1]).toBe(2);
    expect(output[2]).toBeUndefined();
  });

  it('should run on init', async () => {
    const output: number[] = [];
    const cli = breadc('cli', {
      plugins: [
        {
          onInit() {
            output.push(1);
          }
        }
      ]
    });
    expect(output[0]).toBe(1);
    expect(output[1]).toBeUndefined();
  });
});

// describe('Warnings', () => {
//   it('should find option conflict', async () => {
//     const output: string[] = [];
//     const cli = Breadc('cli', {
//       logger: {
//         warn(message: string) {
//           output.push(message);
//         }
//       }
//     }).option('--host [string]');
//     cli.command('').option('--host');

//     await cli.run([]);

//     expect(output[0]).toMatchInlineSnapshot(
//       '"Option \\"host\\" encounters conflict"'
//     );
//   });

//   it('should not find option conflict', async () => {
//     const output: string[] = [];
//     const cli = Breadc('cli', {
//       logger: {
//         warn(message: string) {
//           output.push(message);
//         }
//       }
//     }).option('--host');
//     cli.command('').option('--host');

//     await cli.run([]);

//     expect(output[0]).toMatchInlineSnapshot(
//       '"You may miss action function in <default command>"'
//     );
//   });
// });
