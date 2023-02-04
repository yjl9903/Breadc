import { describe, expect, it } from 'vitest';

import breadc from '../src';

describe('Breadc', () => {
  it('should run sub commands', async () => {
    const cli = breadc('cli');
    cli.command('pages build');
    cli.command('pages dev [...files]').action((files) => files);

    expect(await cli.run(['pages', 'dev', 'a', 'b', 'c', 'd', 'e']))
      .toMatchInlineSnapshot(`
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
      expect(await cli.run(['--fst', '1', '--snd', '2'])).toStrictEqual([
        '1',
        '2'
      ]);
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
    expect(await cli.run(['--host', 'ip', '--port', '3001']))
      .toMatchInlineSnapshot(`
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
      .option('--open <value>', { default: true })
      .command('')
      .action((option) => option.flag);
    expect(await cli.run([])).toBe('true');
    expect(await cli.run(['--flag', 'text'])).toBe('text');
    expect(
      async () => await cli.run(['--flag'])
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      '"You should provide arguments for --flag <value>"'
    );
    expect(
      async () => await cli.run(['--no-flag'])
    ).rejects.toThrowErrorMatchingInlineSnapshot('"Unknown option --no-flag"');
  });
});

describe('Breadc Error', () => {
  it('has wrong command format', () => {
    const cli = breadc('cli');
    expect(() => cli.command('[abc] abc')).toThrowErrorMatchingInlineSnapshot(
      '"Sub-command should be placed at the beginning"'
    );
    expect(() =>
      cli.command('[...abc] abc')
    ).toThrowErrorMatchingInlineSnapshot(
      '"Sub-command should be placed at the beginning"'
    );
    expect(() => cli.command('<abc> abc')).toThrowErrorMatchingInlineSnapshot(
      '"Sub-command should be placed at the beginning"'
    );
    expect(() =>
      cli.command('abc <abc> abc')
    ).toThrowErrorMatchingInlineSnapshot(
      '"Sub-command should be placed at the beginning"'
    );
    expect(() =>
      cli.command('def [abc] abc')
    ).toThrowErrorMatchingInlineSnapshot(
      '"Sub-command should be placed at the beginning"'
    );
    expect(() =>
      cli.command('ghi [...abc] abc')
    ).toThrowErrorMatchingInlineSnapshot(
      '"Sub-command should be placed at the beginning"'
    );
    expect(() =>
      cli.command('[ghi] <abc> abc')
    ).toThrowErrorMatchingInlineSnapshot(
      '"Required arguments should be placed before optional or rest arguments"'
    );
    expect(() => cli.command('[abc] [ghi]')).toThrowErrorMatchingInlineSnapshot(
      '"There is at most one optional or rest arguments"'
    );
  });

  it('has wrong option format', () => {
    const cli = breadc('cli');
    expect(() => cli.option('abc')).toThrowErrorMatchingInlineSnapshot(
      '"Can not parse option format (abc)"'
    );
    expect(() => cli.option('-r')).toThrowErrorMatchingInlineSnapshot(
      '"Can not parse option format (-r)"'
    );
    expect(() =>
      cli.option('--root [...files]')
    ).toThrowErrorMatchingInlineSnapshot(
      '"Can not parse option format (--root [...files])"'
    );
    expect(() =>
      cli.option('--root [files]')
    ).toThrowErrorMatchingInlineSnapshot(
      '"Can not parse option format (--root [files])"'
    );
    expect(() =>
      cli.option('--root <...files>')
    ).toThrowErrorMatchingInlineSnapshot(
      '"Can not parse option format (--root <...files>)"'
    );
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
