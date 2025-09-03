import { describe, it, expectTypeOf } from 'vitest';

import { breadc, command, option } from '../src';

describe('command types', () => {
  it('should infer default command with no arguments', () => {
    const cmd = command('');
    expectTypeOf<(options: { '--': string[] }) => unknown>().toEqualTypeOf<
      Parameters<(typeof cmd)['action']>[0]
    >();
  });

  it('should infer default command with one required argument', () => {
    const cmd = command('<arg>');
    expectTypeOf<
      (arg: string, options: { '--': string[] }) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  });

  it('should infer default command with one optional argument', () => {
    const cmd = command('[arg]');
    expectTypeOf<
      (arg: string | undefined, options: { '--': string[] }) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  });

  it('should infer default command with one spread argument', () => {
    const cmd = command('[...arg]');
    expectTypeOf<
      (arg: string[], options: { '--': string[] }) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  });

  it('should infer default command with one required argument and one optional argument', () => {
    const cmd = command('<arg> [arg]');
    expectTypeOf<
      (
        arg1: string,
        arg2: string | undefined,
        options: { '--': string[] }
      ) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  });

  it('should infer default command with one required argument and one spread argument', () => {
    const cmd = command('<arg> [...arg]');
    expectTypeOf<
      (arg1: string, arg2: string[], options: { '--': string[] }) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  });

  it('should infer default command with one required argument and one required argument and one optional argument', () => {
    const cmd = command('<arg> [arg] [...arg]');
    expectTypeOf<
      (
        arg1: string,
        arg2: string | undefined,
        arg3: string[],
        options: { '--': string[] }
      ) => unknown
    >().toEqualTypeOf<Parameters<(typeof cmd)['action']>[0]>();
  });

  it('should infer return type', () => {
    const cmd1 = command('').action(() => 1);
    expectTypeOf<Promise<number>>().toEqualTypeOf<ReturnType<typeof cmd1>>();

    const cmd2 = command('').action(() => 'test');
    expectTypeOf<Promise<string>>().toEqualTypeOf<ReturnType<typeof cmd2>>();

    const cmd3 = command('').action(async () => ({}));
    expectTypeOf<Promise<{}>>().toEqualTypeOf<ReturnType<typeof cmd3>>();
  });
});

describe('breadc types', () => {
  it('should infer command', () => {});

  it('should infer options', () => {});

  it('should infer arguments', () => {});
});
