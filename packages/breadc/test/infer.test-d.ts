import { describe, it, expectTypeOf } from 'vitest';

import { breadc } from '../src';

describe('Type Infer', () => {
  it('should have boolean option', async () => {
    const cli = breadc('cli').option('--root');
    cli.command('').action((option) => {
      expectTypeOf(option).toMatchTypeOf<{ root: boolean }>();
    });
    await cli.run([]);
  });

  it('should have negative boolean option', async () => {
    const cli = breadc('cli').option('--no-open');
    cli.command('').action((option) => {
      expectTypeOf(option).toMatchTypeOf<{ open: boolean }>();
    });
    await cli.run([]);
  });

  it('should have string option', async () => {
    const cli = breadc('cli').option('--host <addr>');
    cli.command('').action((option) => {
      expectTypeOf(option).toMatchTypeOf<{ host: string | undefined }>();
    });
    await cli.run([]);
  });

  it('should have string option with default', async () => {
    const cli = breadc('cli').option('--host <addr>', '', {
      default: '1.1.1.1'
    });
    cli.command('').action((option) => {
      expectTypeOf(option).toMatchTypeOf<{ host: string }>();
    });
    await cli.run([]);
  });

  it('should have cast option', async () => {
    const cli = breadc('cli').option('--page <page>', {
      default: '0',
      cast: (t) => +t
    });
    cli.command('').action((option) => {
      expectTypeOf(option).toMatchTypeOf<{ page: number }>();
    });
    await cli.run([]);
  });

  it('should have optional arg type', async () => {
    const cli = breadc('cli');
    cli
      .command('test build dev <host> <root> [args]')
      .action((host, root, args) => {
        expectTypeOf(host).toBeString();
        expectTypeOf(root).toBeString();
        expectTypeOf(args).toEqualTypeOf<string | undefined>();
      });
    await cli.run(['test', 'build', 'dev', '123', '456', '789']);
  });

  it('should have rest arg type', async () => {
    const cli = breadc('cli');
    cli
      .command('test build dev <host> <root> [...args]')
      .action((host, root, args) => {
        expectTypeOf(host).toBeString();
        expectTypeOf(root).toBeString();
        expectTypeOf(args).toEqualTypeOf<string[]>();
      });
    await cli.run(['test', 'build', 'dev', '123', '456', '7', '8', '9']);
  });
});
