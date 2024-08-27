import { camelCase } from '../utils/index.ts';
import { BreadcAppError, RuntimeError } from '../error.ts';

import { Context } from './context.ts';

export { parse } from './parser.ts';

export function run<T>(context: Context): T {
  if (context.command) {
    const { command } = context;

    const args = context.arguments.map((ma) => ma.value);

    const options = Object.fromEntries(
      [...context.options.entries()].map(
        ([key, mo]) => [camelCase(key), mo.value] as const
      )
    );

    // Handle unknown options
    if (command.onUnknownOptions) {
      const onUnknownOptions = command.onUnknownOptions;
      if (onUnknownOptions === true) {
        for (const [key, value] of context.matching.unknownOptions) {
          // TODO: handle more cases
          options[camelCase(key)] = value;
        }
      } else {
        onUnknownOptions(options, context.matching.unknownOptions);
      }
    } else if (context.matching.unknownOptions.length > 0) {
      // TODO: throw error here
      throw new Error('');
    }

    // Add rest arguments
    options['--'] = context.remaining.map((t) => t.toRaw());

    if (command.hooks?.['pre:action']) {
      for (const fn of command.hooks['pre:action']) {
        const ret = fn.call(command as any, context);
        if (ret) {
          return ret as T;
        }
      }
    }

    if (!command.actionFn) {
      throw new BreadcAppError(BreadcAppError.NO_ACTION_BOUND, {
        command
      });
    }

    let ret = command.actionFn(...args, options);

    if (command.hooks?.['post:action']) {
      for (const fn of command.hooks['post:action']) {
        ret = fn.call(command as any, context, ret);
      }
    }

    return ret;
  }

  throw new RuntimeError('There is no matched command');
}
