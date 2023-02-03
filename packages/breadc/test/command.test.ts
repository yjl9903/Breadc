import { describe, expect, it } from 'vitest';

import breadc from '../src';

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

// describe('Alias command', () => {
//   it('share alias', async () => {
//     const cli = Breadc('cli');
//     let cnt = 0;
//     cli
//       .command('echo')
//       .alias('say')
//       .action(() => {
//         cnt++;
//       });
//     await cli.run(['echo']);
//     await cli.run(['say']);
//     expect(cnt).toBe(2);
//   });

//   it('share alias with default command', async () => {
//     const cli = Breadc('cli');
//     let cnt = 0;
//     cli
//       .command('')
//       .alias('echo')
//       .action(() => {
//         cnt++;
//       });
//     await cli.run(['']);
//     await cli.run(['echo']);
//     expect(cnt).toBe(2);
//   });

//   it('share alias with default command and arguments', async () => {
//     const cli = Breadc('cli');
//     let text = '';
//     cli
//       .command('[message]')
//       .alias('echo')
//       .action((message) => {
//         text += message;
//       });
//     await cli.run(['hello']);
//     await cli.run(['echo', ' world']);
//     expect(text).toBe('hello world');
//   });
// });

// describe('Help command', () => {
//   it('should print simple help', async () => {
//     const output: string[] = [];

//     const cli = Breadc('cli', {
//       version: '1.0.0',
//       description: 'This is a cli app.',
//       logger: (message: string) => {
//         output.push(message);
//       }
//     });
//     cli.command('[root]', 'Start dev server');
//     cli.command('build [root]', 'Build static site');

//     await cli.run(['-h']);
//     expect(output.join('\n')).toMatchInlineSnapshot(`
//       "cli/1.0.0

//       This is a cli app.

//       Usage:
//         $ cli [root]

//       Commands:
//         $ cli [root]        Start dev server
//         $ cli build [root]  Build static site

//       Options:
//         -h, --help     Display this message
//         -v, --version  Display version number
//       "
//     `);
//     output.splice(0);

//     await cli.run(['--help']);
//     expect(output.join('\n')).toMatchInlineSnapshot(`
//       "cli/1.0.0

//       This is a cli app.

//       Usage:
//         $ cli [root]

//       Commands:
//         $ cli [root]        Start dev server
//         $ cli build [root]  Build static site

//       Options:
//         -h, --help     Display this message
//         -v, --version  Display version number
//       "
//     `);
//   });

//   it('should print command help', async () => {
//     const output: string[] = [];

//     const cli = Breadc('cli', {
//       version: '1.0.0',
//       description: 'This is a cli app.',
//       logger: (message: string) => {
//         output.push(message);
//       }
//     });
//     cli.command('[root]', 'Start dev server');
//     cli.command('build [root]', 'Build static site');

//     await cli.run(['build', '--help']);
//     expect(output.join('\n')).toMatchInlineSnapshot(`
//       "cli/1.0.0

//       Build static site

//       Usage:
//         $ cli build [root]

//       Options:
//         -h, --help     Display this message
//         -v, --version  Display version number
//       "
//     `);
//   });

//   it('should print subcommands help', async () => {
//     const output: string[] = [];

//     const cli = Breadc('cli', {
//       version: '1.0.0',
//       description: 'This is a cli app.',
//       logger: (message: string) => {
//         output.push(message);
//       }
//     });
//     cli.command('file info [path]', 'Get file info');
//     cli.command('store ls [path]', 'List path');
//     cli.command('store rm [path]', 'Remove path');
//     cli.command('store put [path]', 'Put path');

//     await cli.run(['store', '-h']);
//     expect(output.join('\n')).toMatchInlineSnapshot(`
//       "cli/1.0.0

//       Commands:
//         $ cli store ls [path]   List path
//         $ cli store rm [path]   Remove path
//         $ cli store put [path]  Put path

//       Options:
//         -h, --help     Display this message
//         -v, --version  Display version number
//       "
//     `);

//     output.splice(0);
//     await cli.run(['--help', 'store', 'ls']);
//     expect(output.join('\n')).toMatchInlineSnapshot(`
//       "cli/1.0.0

//       List path

//       Usage:
//         $ cli store ls [path]

//       Options:
//         -h, --help     Display this message
//         -v, --version  Display version number
//       "
//     `);
//   });
// });
