import { describe, it, expectTypeOf } from 'vitest';

import type { InferArgumentsType, InferOption } from '../../src/breadc/infer';

import { Argument, Breadc, Option } from '../../src';

describe('option type infer', () => {
  it('should infer option type', () => {
    expectTypeOf<{ flag: boolean }>().toEqualTypeOf<
      InferOption<'--flag', {}>
    >();
    expectTypeOf<{ flag: undefined | string }>().toEqualTypeOf<
      InferOption<'--flag <name>', {}>
    >();
    expectTypeOf<{ flag: boolean | string }>().toEqualTypeOf<
      InferOption<'--flag [name]', {}>
    >();
    expectTypeOf<{ flag: string[] }>().toEqualTypeOf<
      InferOption<'--flag [...name]', {}>
    >();
  });

  it('should infer option type with config', () => {
    expectTypeOf<{ flag: undefined | string }>().toEqualTypeOf<
      InferOption<'--flag <number>', { initial: string }>
    >();
    expectTypeOf<{ flag: number }>().toEqualTypeOf<
      InferOption<'--flag <number>', { cast: () => number }>
    >();
    expectTypeOf<{ flag: number }>().toEqualTypeOf<
      InferOption<'--flag <number>', { cast: () => number; default: number }>
    >();
    expectTypeOf<{ flag: string | number }>().toEqualTypeOf<
      InferOption<'--flag <number>', { default: number }>
    >();
  });
});

describe('argument type infer', () => {
  it('should infer argument types', () => {
    expectTypeOf<[]>().toEqualTypeOf<InferArgumentsType<''>>();
    expectTypeOf<[]>().toEqualTypeOf<InferArgumentsType<'cmd'>>();
    expectTypeOf<[string]>().toEqualTypeOf<InferArgumentsType<'<cmd>'>>();
    expectTypeOf<[string, string]>().toEqualTypeOf<
      InferArgumentsType<'cmd <cmd1> <cmd2>'>
    >();
    expectTypeOf<[string, string, string]>().toEqualTypeOf<
      InferArgumentsType<'cmd <cmd1> <cmd2> <cmd3>'>
    >();
    expectTypeOf<[string, string, undefined | string]>().toEqualTypeOf<
      InferArgumentsType<'cmd <cmd1> <cmd2> [cmd3]'>
    >();
    expectTypeOf<
      [string, string, undefined | string, string[]]
    >().toEqualTypeOf<
      InferArgumentsType<'cmd <cmd1> <cmd2> [cmd3] [...cmd4]'>
    >();
  });

  it('should reject invalid format', () => {
    expectTypeOf<never>().toEqualTypeOf<InferArgumentsType<'<cmd1> cmd'>>();
    expectTypeOf<never>().toEqualTypeOf<InferArgumentsType<'[cmd1] cmd'>>();
    expectTypeOf<never>().toEqualTypeOf<InferArgumentsType<'[...cmd1] cmd'>>();
    expectTypeOf<never>().toEqualTypeOf<InferArgumentsType<'[cmd1] <cmd>'>>();
    expectTypeOf<never>().toEqualTypeOf<
      InferArgumentsType<'[...cmd1] <cmd>'>
    >();
    expectTypeOf<never>().toEqualTypeOf<
      InferArgumentsType<'[...cmd1] [cmd]'>
    >();
  });
});

describe('breadc app type infer', () => {
  it('should infer option type', () => {
    new Breadc('cli')
      .option('--flag')
      .option('--name <name>')
      .option('--plugin [...name]')
      .command('')
      .action((option) => {
        expectTypeOf(option).toEqualTypeOf<{
          flag: boolean;
          name: undefined | string;
          plugin: string[];
          '--': string[];
        }>();
      });

    new Breadc('cli')
      .addOption(new Option('--flag'))
      .addOption(new Option('--name <name>'))
      .addOption(new Option('--plugin [...name]'))
      .command('')
      .action((option) => {
        expectTypeOf(option).toEqualTypeOf<{
          flag: boolean;
          name: undefined | string;
          plugin: string[];
          '--': string[];
        }>();
      });
  });

  it('should infer argument type', () => {
    new Breadc('cli')
      .option('--flag')
      .command('<name>')
      .action((name, option) => {
        expectTypeOf(name).toEqualTypeOf<string>();
        expectTypeOf(option).toEqualTypeOf<{ flag: boolean; '--': string[] }>();
      });

    new Breadc('cli')
      .option('--flag')
      .command('[name]')
      .action((name, option) => {
        expectTypeOf(name).toEqualTypeOf<string | undefined>();
        expectTypeOf(option).toEqualTypeOf<{ flag: boolean; '--': string[] }>();
      });

    new Breadc('cli')
      .option('--flag')
      .command('[...name]')
      .action((name, option) => {
        expectTypeOf(name).toEqualTypeOf<string[]>();
        expectTypeOf(option).toEqualTypeOf<{ flag: boolean; '--': string[] }>();
      });

    new Breadc('cli')
      .option('--flag')
      .command('cmd1 <cmd2> [cmd3] [...cmd4]')
      .action((cmd2, cmd3, cmd4, option) => {
        expectTypeOf(cmd2).toEqualTypeOf<string>();
        expectTypeOf(cmd3).toEqualTypeOf<string | undefined>();
        expectTypeOf(cmd4).toEqualTypeOf<string[]>();
        expectTypeOf(option).toEqualTypeOf<{ flag: boolean; '--': string[] }>();
      });

    new Breadc('cli')
      .option('--flag')
      .command('cmd1 <cmd2>')
      .argument('[cmd3]')
      .argument('[...cmd4]')
      .action((cmd2, cmd3, cmd4, option) => {
        expectTypeOf(cmd2).toEqualTypeOf<string>();
        expectTypeOf(cmd3).toEqualTypeOf<string | undefined>();
        expectTypeOf(cmd4).toEqualTypeOf<string[]>();
        expectTypeOf(option).toEqualTypeOf<{ flag: boolean; '--': string[] }>();
      });

    new Breadc('cli')
      .option('--flag')
      .command('cmd1 <cmd2>')
      .addArgument(new Argument('[cmd3]'))
      .addArgument(new Argument('[...cmd4]'))
      .action((cmd2, cmd3, cmd4, option) => {
        expectTypeOf(cmd2).toEqualTypeOf<string>();
        expectTypeOf(cmd3).toEqualTypeOf<string | undefined>();
        expectTypeOf(cmd4).toEqualTypeOf<string[]>();
        expectTypeOf(option).toEqualTypeOf<{ flag: boolean; '--': string[] }>();
      });
  });
});
