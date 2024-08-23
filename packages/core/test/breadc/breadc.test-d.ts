import { describe, it, expectTypeOf } from 'vitest';

import { Breadc, Option } from '../../src';
import type { InferOption } from '../../src/breadc/infer';

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

describe('breadc app type infer', () => {
  it('should infer option type', () => {
    new Breadc('cli')
      .option('--flag')
      .command('')
      .action((option) => {
        expectTypeOf(option).toEqualTypeOf<{ flag: boolean; '--': string[] }>();
      });

    new Breadc('cli')
      .addOption(new Option('--flag'))
      .command('')
      .action((option) => {
        expectTypeOf(option).toEqualTypeOf<{ flag: boolean; '--': string[] }>();
      });
  });
});
