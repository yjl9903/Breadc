import { camelCase } from '../utils/index.ts';
import { RuntimeError } from '../error.ts';

import { Context } from './context.ts';

export { parse } from './parser.ts';

export function run<T>(context: Context): T {
  if (context.command && context.command.actionFn) {
    const args = context.arguments.map((ma) => ma.value);

    const options = Object.fromEntries(
      [...context.options.entries()].map(
        ([key, mo]) => [camelCase(key), mo.value] as const
      )
    );

    // Handle unknown options
    if (context.command.onUnknownOptions) {
      const onUnknownOptions = context.command.onUnknownOptions;
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

    return context.command.actionFn.call(context, ...args, options);
  }

  throw new RuntimeError('There is no matched command');
}
