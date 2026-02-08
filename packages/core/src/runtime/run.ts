import type { Breadc } from '../breadc/types/app.ts';
import type { ActionMiddleware, ActionMiddlewareNextFn } from '../breadc/types/middleware.ts';

import { printHelp } from '../breadc/builtin/help.ts';
import { printVersion } from '../breadc/builtin/version.ts';

import { BreadcAppError } from '../error.ts';

import { parse, isHelp, isVersion, resolveArgs, resolveOptions } from './parser.ts';

export async function run(app: Breadc, argv: string[]) {
  // 1. Parse arguments
  const context = parse(app, argv);

  // 2. Check whether there is a matched command
  if (!context.command) {
    const { breadc } = context;

    if (isVersion(context)) {
      return printVersion(context);
    }

    if (isHelp(context)) {
      return printHelp(context);
    }

    if (breadc._unknownCommandMiddlewares.length > 0) {
      let res: any;
      for (const middleware of breadc._unknownCommandMiddlewares) {
        res = await middleware(context);
      }
      return res;
    } else {
      return printHelp(context);
    }
  }

  // 3. Collect middlewares
  const actionMiddlewares: ActionMiddleware[] = [
    ...context.breadc._actionMiddlewares,
    ...(context.group?._actionMiddlewares ?? []),
    ...(context.command?._actionMiddlewares ?? [])
  ];

  // 4. Run
  const args = resolveArgs(context);
  const options = resolveOptions(context);
  options['--'] = context.remaining;

  if (context.command._actionFn) {
    const actionFn = context.command._actionFn;
    if (actionMiddlewares.length === 0) {
      const output = await actionFn(...args, options);
      return output;
    } else {
      const invoked: boolean[] = [];
      const makeNextFn = (index: number): ActionMiddlewareNextFn => {
        return (async (nextContext) => {
          if (nextContext?.data) {
            context.data = { ...context.data, ...nextContext?.data };
          }
          invoked[index] = true;
          if (index === actionMiddlewares.length) {
            context.output = await actionFn(...args, options);
          } else {
            const next = makeNextFn(index + 1);
            await actionMiddlewares[index](context, next);
            if (!invoked[index + 1]) {
              await next();
            }
          }
          return context;
        }) as ActionMiddlewareNextFn;
      };
      await makeNextFn(0)(undefined);
      return context.output;
    }
  } else {
    throw new BreadcAppError(BreadcAppError.NO_ACTION_BOUND, {
      context
    });
  }
}
