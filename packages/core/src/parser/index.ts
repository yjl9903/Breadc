import { RuntimeError } from '../error.ts';

import { Context } from './context.ts';

export { parse } from './parser.ts';

export function run(context: Context): Promise<any> {
  if (context.command && context.command.command.actionFn) {
    const args = context.arguments.map((ma) => ma.value);
    const options = Object.fromEntries(
      [...context.options.entries()].map(
        // TODO: handle dot path
        ([key, mo]) => [key, mo.value] as const
      )
    );

    // Handle unknown options
    if (context.command.command.onUnknownOptions) {
      const onUnknownOptions = context.command.command.onUnknownOptions;
      if (onUnknownOptions === true) {
        for (const [key, value] of context.unknownOptions) {
          // TODO: handle more cases
          options[key] = value;
        }
      } else {
        onUnknownOptions(options, context.unknownOptions);
      }
    } else if (context.unknownOptions.length > 0) {
      // TODO: throw error here
      throw new Error('');
    }

    // Add rest arguments
    options['--'] = context.remaining.map((t) => t.toRaw());

    return context.command.command.actionFn(...args, options);
  }
  throw new RuntimeError('There is no matched command');
}
