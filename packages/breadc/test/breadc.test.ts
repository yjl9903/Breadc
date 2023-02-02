import { describe, expect, it } from 'vitest';

import Breadc from '../src';

describe('Breadc', () => {
  it('should run sub commands', async () => {
    const cli = Breadc('cli');
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
    const cli = Breadc('cli');
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
    await cli.run(['a', 'b', 'c', 'd', 'e']);
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

  it('should run with boolean option', async () => {
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
    await cli.run(['--minus', '1', '2']);
    await cli.run(['minus', '1', '2']);
    // await cli.run(['minus', '1', '2', '--no-minus']);
  });

  it('should run with required option', async () => {
    {
      const cli = Breadc('cal');
      cli
        .command('')
        .option('--fst <fst>')
        .option('--snd <snd>')
        .action((option) => {
          // expect(option.fst).toBe('1');
          // expect(option.snd).toBe('2');
          return [option.fst, option.snd];
        });
      expect(await cli.run(['--fst', '1', '--snd', '2'])).toStrictEqual([
        '1',
        '2'
      ]);
    }
    // {
    //   // error
    //   const cli = Breadc('cal');
    //   cli
    //     .command('')
    //     .option('--fst <fst>')
    //     .option('--snd <snd>')
    //     .action((option) => {
    //       expect(option.fst).toBeTruthy();
    //       expect(option.snd).toBeTruthy();
    //     });
    //   await cli.run(['--fst', '--snd']);
    // }
    // {
    //   const cli = Breadc('cal');
    //   cli
    //     .command('')
    //     .option('--fst <fst>')
    //     .option('--snd <snd>')
    //     .action((option) => {
    //       expect(option.fst).toBeTruthy();
    //       expect(option.snd).toBeFalsy();
    //     });
    //   await cli.run(['--fst']);
    // }
    // {
    //   const cli = Breadc('cal');
    //   cli
    //     .command('')
    //     .option('--fst <fst>')
    //     .option('--snd <snd>')
    //     .action((option) => {
    //       expect(option.fst).toBeFalsy();
    //       expect(option.snd).toBeFalsy();
    //     });
    //   await cli.run(['--no-fst']);
    // }
  });

  // it('should run with non-required option', async () => {
  //   {
  //     const cli = Breadc('cal');
  //     cli
  //       .command('')
  //       .option('--fst [fst]')
  //       .option('--snd [snd]')
  //       .action((option) => {
  //         expect(option.fst).toBe('1');
  //         expect(option.snd).toBe('2');
  //       });
  //     await cli.run(['--fst', '1', '--snd', '2']);
  //   }
  //   {
  //     const cli = Breadc('cal');
  //     cli
  //       .command('')
  //       .option('--fst [fst]')
  //       .option('--snd [snd]')
  //       .action((option) => {
  //         expect(option.fst).toBe('');
  //         expect(option.snd).toBe('');
  //       });
  //     await cli.run(['--fst', '--snd']);
  //   }
  //   {
  //     const cli = Breadc('cal');
  //     cli
  //       .command('')
  //       .option('--fst [fst]')
  //       .option('--snd [snd]')
  //       .action((option) => {
  //         expect(option.fst).toBe('');
  //         expect(option.snd).toBeUndefined();
  //       });
  //     await cli.run(['--fst']);
  //   }
  //   {
  //     const cli = Breadc('cal');
  //     cli
  //       .command('')
  //       .option('--fst [fst]')
  //       .option('--snd [snd]')
  //       .action((option) => {
  //         expect(option.fst).toBeUndefined();
  //         expect(option.snd).toBeUndefined();
  //       });
  //     await cli.run(['--no-fst']);
  //   }
  // });

  // it('should run with construct option', async () => {
  //   {
  //     const cli = Breadc('echo', { version: '1.0.0' })
  //       .option('--host <host>', { default: 'localhost' })
  //       .option('--port <port>', {
  //         construct: (port) => (port ? +port : 3000)
  //       });

  //     cli.command('[message]').action((_message, option) => {
  //       expect(option.host).toBe('localhost');
  //       expect(option.port).toBe(3000);
  //     });

  //     await cli.run([]);
  //     await cli.run(['--port', '3000']);
  //   }
  //   {
  //     const cli = Breadc('echo', { version: '1.0.0' })
  //       .option('--host <host>', { default: 'localhost' })
  //       .option('--port <port>', {
  //         construct: (port) => (port ? +port : 3000)
  //       });

  //     cli.command('[message]').action((_message, option) => {
  //       expect(option.host).toBe('ip');
  //       expect(option.port).toBe(3001);
  //     });

  //     await cli.run(['--host', 'ip', '--port', '3001']);
  //   }
  // });

  it('has different options', async () => {
    const cli = Breadc('cli');
    cli
      .command('a')
      .option('--host')
      .action((option) => {
        expect(option).toMatchInlineSnapshot(`
          {
            "--": [],
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
            "--": [],
            "port": true,
          }
        `);
      });

    await cli.run(['a', '--host']);
    await cli.run(['b', '--port']);
  });

  // it('should run with default true boolean option value', async () => {
  //   const cli = Breadc('cli');
  //   cli
  //     .option('--flag', { default: true })
  //     .command('')
  //     .action((option) => option.flag);
  //   expect(await cli.run([])).toBe(true);
  //   expect(await cli.run(['--flag'])).toBe(true);
  //   expect(await cli.run(['--no-flag'])).toBe(false);
  // });

  // it('should run with default false boolean option value', async () => {
  //   const cli = Breadc('cli');
  //   cli
  //     .option('--flag', { default: false })
  //     .command('')
  //     .action((option) => option.flag);
  //   expect(await cli.run([])).toBe(false);
  //   expect(await cli.run(['--flag'])).toBe(true);
  //   expect(await cli.run(['--no-flag'])).toBe(false);
  // });

  // it('should run with default string option value', async () => {
  //   const cli = Breadc('cli');
  //   cli
  //     .option('--flag [value]', { default: 'true' })
  //     .command('')
  //     .action((option) => option.flag);
  //   expect(await cli.run([])).toBe('true');
  //   expect(await cli.run(['--flag'])).toBe('true');
  //   // TODO: fix this behaivor
  //   expect(await cli.run(['--no-flag'])).toBe('true');
  // });

  // it('should run with default string required value', async () => {
  //   const cli = Breadc('cli');
  //   cli
  //     .option('--flag <value>', { default: 'true' })
  //     .option('--open <value>', { default: true })
  //     .command('')
  //     .action((option) => option.flag);
  //   expect(await cli.run([])).toBe('true');
  //   expect(await cli.run(['--flag'])).toBe(true);
  //   expect(await cli.run(['--flag', 'text'])).toBe('text');
  //   // TODO: fix this behaivor
  //   expect(await cli.run(['--no-flag'])).toBe('true');
  // });
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
