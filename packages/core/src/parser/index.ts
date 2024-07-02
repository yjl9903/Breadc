import { RuntimeError } from '../error.ts';

import { Context } from './context.ts';

export function parse(context: Context): Context {
  // TODO: parse args
  return context;
}

export function run(context: Context): Promise<any> {
  if (context.command && context.command.actionFn) {
    const args = context.arguments.map((ma) => ma.value);
    const options = Object.fromEntries(
      [...context.options.entries()].map(
        ([key, mo]) => [key, mo.value] as const
      )
    );
    return context.command.actionFn(...args, options);
  }
  throw new RuntimeError('There is no matched command');
}
