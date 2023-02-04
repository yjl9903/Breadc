import { describe, it, expectTypeOf } from 'vitest';

import breadc from '../src';

describe('Type Infer', () => {
  it('should have boolean option', async () => {
    const cli = breadc('cli').option('--root');
    cli.command('').action((option) => {
      expectTypeOf(option).toMatchTypeOf<{ root: boolean }>();
    });
    await cli.run([]);
  });

  it('should have string option', async () => {
    const cli = breadc('cli').option('--host <addr>');
    cli.command('').action((option) => {
      expectTypeOf(option).toMatchTypeOf<{ host: string }>();
    });
    await cli.run([]);
  });

  it('should have cast option', async () => {
    const cli = breadc('cli').option('--page <page>', { cast: (t) => +t });
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