import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import * as mini from 'zod/mini';
import type { StandardSchemaV1 } from '@standard-schema/spec';

import {
  breadc,
  option,
  argument,
  DefinitionError,
  InputError,
  ErrorCode,
  MatchedOption,
  MatchedArgument
} from '../src/index.ts';
import { context as makeContext } from '../src/runtime/context.ts';
import { resolveOption } from '../src/runtime/builder.ts';
import { parse, finalizeInput } from '../src/runtime/parser.ts';

function schema(validate: StandardSchemaV1['~standard']['validate']): StandardSchemaV1 {
  return { '~standard': { version: 1, vendor: 'test', validate } };
}

function inputError(fn: () => unknown) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(InputError);
    return error as InputError;
  }
  throw new Error('Expected InputError');
}

describe('Standard Schema cast', () => {
  it('validates the complete array once and preserves failure paths without redistributing values', () => {
    const validate = vi.fn(z.array(z.string().min(1))['~standard'].validate);
    const app = breadc('cli').option('-i, --include <...value>', '', {
      default: ['fallback'],
      cast: schema(validate)
    });
    app.command('build [target]');
    const error = inputError(() => app.parse(['build', '-i', 'a', '', '--include', 'b', 'target']));
    expect(validate).toHaveBeenCalledTimes(1);
    expect(validate.mock.calls[0][0]).toEqual(['a', '', 'b', 'target']);
    expect(error.issues).toEqual([
      expect.objectContaining({
        code: ErrorCode.INVALID_OPTION_VALUE,
        path: [1],
        value: ['a', '', 'b', 'target']
      })
    ]);
    expect(error.context?.arguments[0].value()).toBeUndefined();
    expect(app.parse(['build', '--include', 'a', 'b', '-i=c']).options.include).toEqual(['a', 'b', 'c']);
    expect(validate).toHaveBeenCalledTimes(2);
  });

  it('supports Zod, Mini, enums, transforms and all option/argument entry points', async () => {
    const app = breadc('cli').option('--mode <value>', '', { default: 'dev', cast: z.enum(['dev', 'prod']) });
    app
      .group('tool')
      .option(option('--flag', '', { cast: mini.boolean() }))
      .option('--group <value>', '', { default: 'group', cast: z.string() })
      .command('run')
      .option(
        option('--port <value>', '', {
          default: '3000',
          cast: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(65535))
        })
      )
      .option('--files <...file>', '', { cast: z.array(z.string()).transform((items) => new Set(items)) })
      .argument(
        argument('<name>', {
          cast: z
            .string()
            .transform((name) => ({ name }))
            .brand<'Name'>()
        })
      )
      .argument('[...rest]', { cast: mini.array(mini.string()) })
      .action((name, rest, options) => ({ name, rest, options }));
    expect(await app.run(['tool', 'run', 'hello', 'world', '--files=a', '--files=a'])).toEqual({
      name: { name: 'hello' },
      rest: ['world'],
      options: { mode: 'dev', flag: false, group: 'group', port: 3000, files: new Set(['a']), '--': [] }
    });
  });

  it('distinguishes absence, raw defaults, bare options and empty strings', () => {
    const validate = vi.fn(z.enum(['auto', 'always', 'never']).default('always')['~standard'].validate);
    const cast = schema(validate);
    const app = breadc('cli').option('--color [value]', '', { default: 'auto', cast });
    expect(app.parse([]).options.color).toBe('auto');
    expect(app.parse(['--color']).options.color).toBe('always');
    expect(app.parse(['--color=never']).options.color).toBe('never');
    expect(() => app.parse(['--color='])).toThrow(InputError);
    expect(validate.mock.calls.map(([value]) => value)).toEqual(['auto', undefined, 'never', '']);
    validate.mockClear();
    const absent = breadc('cli').option('--color [value]', '', { default: undefined, cast });
    absent.command('').argument('[color]', { cast });
    expect(absent.parse([])).toMatchObject({ options: { color: undefined }, args: [undefined] });
    expect(validate).not.toHaveBeenCalled();
  });

  it.each([undefined, null, false, ''])('retains successful %s without falling back', (value) => {
    const validate = vi.fn(() => ({ value }));
    const cast = schema(validate);
    const app = breadc('cli').option('--value <value>', '', { default: 'fallback', cast });
    app.command('').argument('[value]', { default: 'fallback', cast });
    const result = app.parse([]);
    expect(result.options.value).toBe(value);
    expect(result.args).toEqual([value]);
    finalizeInput(result.context);
    expect(validate).toHaveBeenCalledTimes(2);
  });

  it('converts built-in boolean and array defaults and replaces explicit arrays per parse', () => {
    const defaults = ['fallback'];
    const cast = z.array(z.string()).transform((items) => {
      items.push('converted');
      return items;
    });
    const app = breadc('cli')
      .option('--flag', '', { cast: z.boolean().transform(String) })
      .option('--no-cache', '', { cast: z.boolean().transform(String) })
      .option('--empty <...value>', '', { cast })
      .option('--files <...value>', '', { default: defaults, cast });
    app.command('').argument('[...files]', { default: defaults, cast });
    expect(app.parse([])).toMatchObject({
      options: { flag: 'false', cache: 'true', empty: ['converted'], files: ['fallback', 'converted'] },
      args: [['fallback', 'converted']]
    });
    expect(app.parse(['a', '--files=b'])).toMatchObject({
      options: { files: ['b', 'converted'] },
      args: [['a', 'converted']]
    });
    expect(app.parse([]).args).toEqual([['fallback', 'converted']]);
    expect(defaults).toEqual(['fallback']);
  });

  it('aggregates failures in option then argument order with raw values and array paths', () => {
    const action = vi.fn();
    const app = breadc('cli').option('--mode <value>', '', { cast: z.enum(['dev', 'prod']) });
    app
      .command('run')
      .option('--flag', '', { cast: z.literal(true) })
      .argument('<name>', { cast: z.string().min(2) })
      .argument('[...files]', { cast: z.array(z.string().min(1)) })
      .action(action);
    const error = inputError(() => app.parse(['run', 'x', 'ok', '', '--mode=bad']));
    expect(error.issues.map((issue) => issue.code)).toEqual([
      'INVALID_OPTION_VALUE',
      'INVALID_OPTION_VALUE',
      'INVALID_ARGUMENT_VALUE',
      'INVALID_ARGUMENT_VALUE'
    ]);
    expect(error.issues[0]).toMatchObject({ option: { long: 'mode' }, value: 'bad', path: [] });
    expect(error.issues[1]).toMatchObject({ value: false });
    expect(error.issues[3]).toMatchObject({ argument: { name: 'files' }, value: ['ok', ''], path: [1] });
    expect(error.message).toContain('files[1]:');
    expect(action).not.toHaveBeenCalled();
  });

  it('reports invalid built-in empty arrays as input failures', () => {
    const app = breadc('cli').option('--files <...value>', '', { cast: z.array(z.string()).min(1) });
    app.command('').argument('[...files]', { cast: z.array(z.string()).min(1) });
    expect(inputError(() => app.parse([])).issues.map((issue) => issue.code)).toEqual([
      'INVALID_OPTION_VALUE',
      'INVALID_ARGUMENT_VALUE'
    ]);
  });

  it('retains protocol path segments and formats numeric, string and symbol keys', () => {
    const key = Symbol('key');
    const path = [{ key: 1 }, { key: 'name' }, 'a.b', key];
    const cast = schema(() => ({ issues: [{ message: 'bad', path }] }));
    const error = inputError(() => breadc('cli').option('--files <...value>', '', { cast }).parse(['--files=a']));
    expect(error.issues[0]).toMatchObject({ path, value: ['a'], message: '--files[1].name["a.b"][Symbol(key)]: bad' });
  });

  it('treats an empty issue list as failure even with a value present', () => {
    const cast = schema(() => ({ issues: [], value: 'ignored' }));
    const error = inputError(() => breadc('cli').option('--flag', '', { cast }).parse([]));
    expect(error.issues).toHaveLength(1);
    expect(error.message).toBe('--flag: Invalid value');
  });

  it.each(['option', 'argument'])('rejects an invalid explicit %s default and stops conversion', (kind) => {
    const later = vi.fn();
    const app = breadc('cli');
    const config = { default: 'bad', cast: z.enum(['good']) };
    if (kind === 'option') app.option('--value <value>', '', config);
    const command = app.command('');
    if (kind === 'argument') command.argument('[value]', config);
    command.argument('[...later]', { cast: later });
    expect(() => app.parse([])).toThrow(
      expect.objectContaining({
        code: ErrorCode.INVALID_DEFAULT_VALUE,
        details: expect.objectContaining({ value: 'bad' })
      })
    );
    expect(later).not.toHaveBeenCalled();
    expect(() => app.parse(kind === 'option' ? ['--value=good'] : ['good'])).not.toThrow();
  });

  it.each(['function', 'schema'])('propagates synchronous %s exceptions unchanged and stops immediately', (kind) => {
    const error = new InputError([
      { code: ErrorCode.UNKNOWN_OPTION, message: 'authored error', name: 'x', value: undefined }
    ]);
    const throwing = () => {
      throw error;
    };
    const later = vi.fn();
    const app = breadc('cli')
      .option('--flag', '', { cast: kind === 'function' ? throwing : schema(throwing) })
      .option('--later', '', { cast: later });
    expect(() => app.parse([])).toThrow(error);
    try {
      app.parse([]);
    } catch (caught) {
      expect(caught).toBe(error);
    }
    expect(later).not.toHaveBeenCalled();
  });

  it.each(['function', 'schema'])(
    'rejects Promise and thenable results from a %s and consumes rejections',
    async (kind) => {
      for (const makeResult of [
        () => Promise.resolve({ value: 'ok' }),
        () => Promise.reject(new Error('rejected')),
        () => ({
          then(_resolve: unknown, reject: (error: Error) => void) {
            reject(new Error('thenable'));
          }
        }),
        () =>
          Object.assign(() => {}, {
            then() {
              throw new Error('then throws');
            }
          })
      ]) {
        const convert = vi.fn(makeResult);
        const cast = kind === 'function' ? convert : schema(convert as StandardSchemaV1['~standard']['validate']);
        const app = breadc('cli').option('--flag', '', { cast });
        expect(() => app.parse([])).toThrow(
          expect.objectContaining({
            code: ErrorCode.ASYNC_CAST_UNSUPPORTED,
            message: 'The converter returned an asynchronous result'
          })
        );
        expect(convert).toHaveBeenCalledTimes(1);
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  );

  it('handles asynchronous Zod validators and Zod-converted rejected exceptions', async () => {
    for (const cast of [
      z.string().refine(async () => false),
      z.string().transform(() => {
        throw new Error('transform');
      })
    ]) {
      expect(() => breadc('cli').option('--value <value>', '', { cast }).parse(['--value=x'])).toThrow(
        expect.objectContaining({ code: ErrorCode.ASYNC_CAST_UNSUPPORTED })
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it('dispatches callable schemas through the protocol first', () => {
    const fn = vi.fn(() => 'function');
    const validate = vi.fn(() => ({ value: 'schema' }));
    const cast = Object.assign(fn, schema(validate));
    expect(breadc('cli').option('--flag', '', { cast }).parse([]).options.flag).toBe('schema');
    expect(fn).not.toHaveBeenCalled();
    expect(validate).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('uses ordinary functions when they do not implement the V1 protocol', () => {
    for (const protocol of [undefined, { version: 2, validate() {} }, { version: 1 }]) {
      const cast = Object.assign(() => 'function', { '~standard': protocol });
      expect(breadc('cli').option('--flag', '', { cast }).parse([]).options.flag).toBe('function');
    }
  });

  it('converts the final fallback command after middleware and before the action', async () => {
    const validate = vi.fn(z.string().transform(Number)['~standard'].validate);
    const app = breadc('cli').option('--port <value>', '', { default: '12', cast: schema(validate) });
    app.command('named').action(() => {});
    app
      .command('')
      .argument('[count]', { default: '3', cast: z.string().transform(Number) })
      .use(async (context, next) => {
        expect(context.options.get('port')!.raw).toBe('12');
        expect(context.arguments[0].raw).toBe('3');
        expect(validate).not.toHaveBeenCalled();
        const result = await next();
        expect(context.options.get('port')!.value()).toBe(12);
        expect(context.arguments[0].value()).toBe(3);
        return result;
      })
      .action((count, options) => ({ count, port: options.port }));
    expect(await app.run([])).toEqual({ count: 3, port: 12 });
    expect(validate).toHaveBeenCalledExactlyOnceWith('12');
  });

  it('caches validation failures without turning them into successful values', () => {
    const validate = vi.fn(() => ({ issues: [] }));
    const app = breadc('cli').option('--flag', '', { cast: schema(validate) });
    app.command('').argument('[...files]', { cast: schema(validate) });
    const context = parse(app, []);
    for (let i = 0; i < 2; i++) expect(inputError(() => finalizeInput(context)).issues).toHaveLength(2);
    expect(() => context.options.get('flag')!.value()).toThrow(InputError);
    expect(() => context.arguments[0].value()).toThrow(InputError);
    expect(validate).toHaveBeenCalledTimes(2);
  });

  it.each(['option', 'argument'])('refreshes cached %s failures and successes when input changes', (kind) => {
    const validate = vi.fn(z.array(z.string()).min(1).max(1)['~standard'].validate);
    const cast = schema(validate);
    const context = makeContext(breadc('cli'), []);
    const opt = option('--files <...value>', '', { cast });
    resolveOption(opt);
    const matched = kind === 'option' ? new MatchedOption(opt) : new MatchedArgument(argument('[...files]', { cast }));
    const accept = (value: string) =>
      matched instanceof MatchedOption ? matched.accept(context, 'files', value) : matched.accept(context, value);
    const failure = matched.finalize();
    expect(failure.issues).toHaveLength(1);
    expect(matched.finalize()).toBe(failure);
    expect(() => matched.value()).toThrow(InputError);
    accept('a');
    expect(matched.value()).toEqual(['a']);
    const success = matched.finalize();
    expect(success).toEqual({ value: ['a'] });
    expect(matched.finalize()).toBe(success);
    accept('b');
    expect(matched.value()).toEqual(['a', 'b']);
    expect(validate).toHaveBeenCalledTimes(2);
    const updatedFailure = matched.finalize();
    expect(() => matched.value()).toThrow(InputError);
    expect(updatedFailure.issues).toHaveLength(1);
    expect(updatedFailure).not.toBe(failure);
    expect(matched.finalize()).toBe(updatedFailure);
    expect(validate).toHaveBeenCalledTimes(3);
  });
});
